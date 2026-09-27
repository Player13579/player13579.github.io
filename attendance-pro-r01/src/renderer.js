import { sampleTimeline } from './timeline.js';
import { MAX_ACTIVE } from './contract.js';
import { projectEvent } from './projection.js';
import { GEOMETRY_WGSL, COMPOSITE_WGSL } from './shader-source.js';

export function srgbViewFormat(base) {
  if (base === 'bgra8unorm') return 'bgra8unorm-srgb';
  if (base === 'rgba8unorm') return 'rgba8unorm-srgb';
  if (base === 'rgba16float' || base.endsWith('-srgb')) return base;
  throw new RangeError(`非対応の出力format: ${base}`);
}

export async function requestWebGPU() {
  if (!globalThis.isSecureContext) throw new Error('WebGPUには信頼されたコンテキストが必要です。HTTPS / localhost または対応ブラウザのローカルHTMLを使用してください。');
  if (!navigator.gpu) throw new Error('WebGPUがありません。Canvas 2D / WebGL への代替は行いません。');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
  if (!adapter) throw new Error('WebGPU adapterを取得できません。');
  const device = await adapter.requestDevice({ label: 'Attendance E' });
  const info = adapter.info;
  return { adapter, device, info: {
    vendor: info?.vendor || '', architecture: info?.architecture || '',
    device: info?.device || '', description: info?.description || '',
    isFallbackAdapter: info?.isFallbackAdapter ?? null,
  } };
}

/** 独立WGSLをgetCompilationInfoで検査。文字列を作っただけで合格としない。 */
async function checkedShader(device, code, label) {
  const shader = device.createShaderModule({ code, label });
  const info = await shader.getCompilationInfo();
  const messages = [...info.messages].map(m => ({ type:m.type, message:m.message, lineNum:m.lineNum, linePos:m.linePos }));
  const errors = messages.filter(m=>m.type==='error');
  if (errors.length) throw new Error(`${label}\n${errors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n')}`);
  return { shader, messages };
}

/**
 * 全描画はWebGPU。1 instance=1 marker、部分形状は同じfragment内の層。
 * game API: encode()はGPU render targetへ直接記録する。CPU画像化/2D転送は行わない。
 * targetViewは sRGB attachment または rgba16float線形。unormへ二重gamma適用しない。
 */
export class AttendanceRenderer {
  static async create({ device, outputFormat = 'bgra8unorm-srgb', maxEvents = MAX_ACTIVE }) {
    if (!device) throw new TypeError('GPUDevice が必要です');
    if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > MAX_ACTIVE) throw new RangeError('maxEvents');
    if (!['bgra8unorm-srgb','rgba8unorm-srgb','rgba16float'].includes(outputFormat)) throw new RangeError('出力はsRGB viewまたは線形rgba16floatを使用してください');
    const instance = new AttendanceRenderer(device, outputFormat, maxEvents);
    try {
      await instance.initialize();
      return instance;
    } catch (error) {
      instance.dispose();
      throw error;
    }
  }
  constructor(device, outputFormat, maxEvents) {
    this.device = device; this.outputFormat = outputFormat; this.maxEvents = maxEvents;
    this.width = 0; this.height = 0; this.disposed = false; this.inFlight = false;
    this.lastStats = null;
    this.compilation = [];
    this.frameArray = new Float32Array(12);
    this.eventArray = new Float32Array(maxEvents * 16);
  }
  async initialize() {
    const d = this.device;
    const geometry = await checkedShader(d,GEOMETRY_WGSL,'attendance.wgsl');
    const composite = await checkedShader(d,COMPOSITE_WGSL,'composite.wgsl');
    this.compilation = [
      { shader:'attendance.wgsl',messages:geometry.messages },
      { shader:'composite.wgsl',messages:composite.messages },
    ];
    this.frameBuffer = d.createBuffer({ label:'Frame uniforms',size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST });
    this.eventBuffer = d.createBuffer({ label:'Event snapshots',size:this.eventArray.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST });
    this.sampler = d.createSampler({ minFilter:'linear',magFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge' });
    const premultiplied = { color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}, alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'} };
    this.geometry = await d.createRenderPipelineAsync({
      label:'PH1 geometry / separate radiance and coverage', layout:'auto',
      vertex:{module:geometry.shader,entryPoint:'vertexMain'},
      fragment:{module:geometry.shader,entryPoint:'fragmentMain',targets:[
        {format:'rgba16float',blend:premultiplied},{format:'rgba16float',blend:premultiplied},
      ]}, primitive:{topology:'triangle-list'},
    });
    this.composite = await d.createRenderPipelineAsync({
      label:'OBS conditional composite / linear premultiplied',layout:'auto',
      vertex:{module:composite.shader,entryPoint:'vertexMain'},
      fragment:{module:composite.shader,entryPoint:'fragmentMain',targets:[{format:this.outputFormat,blend:premultiplied}]},
      primitive:{topology:'triangle-list'},
    });
    this.geometryGroup = d.createBindGroup({ layout:this.geometry.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:this.frameBuffer}},{binding:1,resource:{buffer:this.eventBuffer}},
    ]});
  }
  resize(width,height) {
    if (!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1) throw new RangeError('正の整数解像度が必要です');
    if (Math.max(width,height)>this.device.limits.maxTextureDimension2D) throw new RangeError('GPU最大寸法超過');
    if (this.width===width && this.height===height) return;
    this.scene?.destroy(); this.emission?.destroy();
    this.width=width; this.height=height;
    const descriptor = { size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING };
    this.scene = this.device.createTexture({...descriptor,label:'linear scene'});
    this.emission = this.device.createTexture({...descriptor,label:'source-bound emission'});
    this.sceneView=this.scene.createView(); this.emissionView=this.emission.createView();
    this.compositeGroup=this.device.createBindGroup({ layout:this.composite.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:this.frameBuffer}},
      {binding:1,resource:this.sceneView},{binding:2,resource:this.emissionView},{binding:3,resource:this.sampler},
    ]});
  }
  /**
   * 呼出しごとに別encoderへ記録後submitすること。同一rendererを別ビューへ再利用すると
   * queue.writeBufferの値が上書きされるため、ビューごとにrendererを作る。
   * camera: {x,y,pixelsPerWorldUnit}、+Y上。H64デモでは半径28px。
   */
  encode({ encoder, targetView, width, height, events = [],
    camera = {x:0,y:0,pixelsPerWorldUnit:1}, background = 'transparent',
    postEffects = true, reducedMotion = false, loadOp = 'clear',
  }) {
    if(this.disposed) throw new Error('rendererは破棄済みです');
    if(!encoder||!targetView) throw new TypeError('encoder / targetView が必要です');
    if(events.length>this.maxEvents) throw new RangeError('描画数上限超過');
    for(const key of ['x','y','pixelsPerWorldUnit']) if(!Number.isFinite(camera[key])) throw new TypeError(`camera.${key}`);
    if(camera.pixelsPerWorldUnit<=0) throw new RangeError('pixelsPerWorldUnit');
    if(!['dark','light','transparent'].includes(background)) throw new RangeError('background');
    if(!['load','clear'].includes(loadOp)) throw new RangeError('loadOp');
    this.resize(width,height);
    this.frameArray.set([width,height,0,0,0,0,camera.pixelsPerWorldUnit,0,postEffects?1:0,background==='dark'?1:background==='light'?2:0,0,0]);
    let count=0, bloomEnabled=0;
    for(const event of events) {
      const s = sampleTimeline(event.ageMs,reducedMotion);
      if(!s.alive) continue;
      const projected = projectEvent(event,camera,width,height);
      const {radiusPx,dx,dy}=projected;
      // 有限のevent半径で画面外を落とす。追尾や別actor位置取得はしない。
      if(!projected.visible) continue;
      const bloom=postEffects && radiusPx>=48;
      if(bloom) bloomEnabled++;
      this.eventArray.set([
        dx,dy,event.radius,s.opacity,
        s.open,s.insert,s.release,s.motionScale,
        s.luminance,s.contactLobe,s.detail,s.sheet,
        s.t,radiusPx,bloom?1:0,0,
      ],count*16);
      count++;
    }
    // H64/無表示では拡散のテクスチャ参照自体も止める。
    this.frameArray[8]=bloomEnabled>0?1:0;
    this.device.queue.writeBuffer(this.frameBuffer,0,this.frameArray);
    if(count) this.device.queue.writeBuffer(this.eventBuffer,0,this.eventArray,0,count*16);
    const pass = encoder.beginRenderPass({ label:'world marker layers',colorAttachments:[
      {view:this.sceneView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},
      {view:this.emissionView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},
    ]});
    if(count) {pass.setPipeline(this.geometry);pass.setBindGroup(0,this.geometryGroup);pass.draw(6,count);}
    pass.end();
    const output=encoder.beginRenderPass({label:'observation composite',colorAttachments:[{
      view:targetView,loadOp,storeOp:'store',clearValue:{r:0,g:0,b:0,a:0},
    }]});
    output.setPipeline(this.composite); output.setBindGroup(0,this.compositeGroup); output.draw(3); output.end();
    this.lastStats={markerCount:count,bloomEnabled,drawCalls:(count?1:0)+1,renderPasses:2,width,height};
    return this.lastStats;
  }
  dispose() {
    if(this.disposed) return;
    this.disposed=true;
    this.scene?.destroy();this.emission?.destroy();this.frameBuffer?.destroy();this.eventBuffer?.destroy();
  }
}
