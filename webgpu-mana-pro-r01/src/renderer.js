import {buildManaGeometry} from './geometry.js';
export async function requestManaDevice(){
  if(!globalThis.navigator?.gpu)throw new Error('WebGPU unavailable. Use a WebGPU-enabled browser on localhost or HTTPS.');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter)throw new Error('No WebGPU adapter. Check browser/GPU support; no silent Canvas/WebGL substitute is used.');
  const device=await adapter.requestDevice();
  return {device,adapter,format:navigator.gpu.getPreferredCanvasFormat()};
}
/** A renderer owns geometry buffers only. The host owns device, render targets, camera and draw order. */
export class ManaRenderer {
  static async create({device,format,shaderURL=new URL('../shaders/mana.wgsl',import.meta.url),depthStencil}={}){
    if(!device||!format)throw new TypeError('WebGPU device and target format required');
    const response=await fetch(shaderURL);if(!response.ok)throw new Error(`WGSL load failed: ${response.status}`);
    const module=device.createShaderModule({label:'Mana Acquire r0.1',code:await response.text()});
    const info=await module.getCompilationInfo();const errors=info.messages.filter(m=>m.type==='error');
    if(errors.length)throw new Error(errors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
    const desc={label:'Mana premultiplied ribbon',layout:'auto',vertex:{module,entryPoint:'vs',buffers:[{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x2'},{shaderLocation:2,offset:16,format:'float32x4'}]}]},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}};
    if(depthStencil)desc.depthStencil=depthStencil;
    const pipeline=await device.createRenderPipelineAsync(desc);
    return new ManaRenderer(device,pipeline);
  }
  constructor(device,pipeline){this.device=device;this.pipeline=pipeline;this.buffers={};this.counts={back:0,front:0};this.capacities={back:0,front:0};this.disposed=false;}
  prepare(effects,view){
    if(this.disposed)throw new Error('Renderer disposed');
    if(!view||![view.width,view.height,view.scale??1].every(n=>Number.isFinite(n)&&n>0))throw new TypeError('Positive view width/height/scale required');
    const geometry=buildManaGeometry(effects,view);
    for(const layer of ['back','front']){
      const data=geometry[layer];this.counts[layer]=data.length/8;
      if(!data.byteLength)continue;
      if(data.byteLength>this.capacities[layer]){
        this.buffers[layer]?.destroy();this.capacities[layer]=Math.max(4096,2**Math.ceil(Math.log2(data.byteLength)));
        this.buffers[layer]=this.device.createBuffer({label:`Mana ${layer} vertices`,size:this.capacities[layer],usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
      }
      this.device.queue.writeBuffer(this.buffers[layer],0,data);
    }
    return {...this.counts};
  }
  draw(pass,layer){if(this.disposed||!['back','front'].includes(layer))throw new Error('Invalid renderer/layer');const n=this.counts[layer];if(!n)return;pass.setPipeline(this.pipeline);pass.setVertexBuffer(0,this.buffers[layer]);pass.draw(n);}
  drawBack(pass){this.draw(pass,'back');}
  drawFront(pass){this.draw(pass,'front');}
  dispose(){for(const b of Object.values(this.buffers))b.destroy();this.disposed=true;}
}
