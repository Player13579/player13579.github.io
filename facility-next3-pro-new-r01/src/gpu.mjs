/** 既存GPUDevice・既存render passを利用する。独自canvas/texture/renderer fallbackは作らない。 */
export class NativeWebGPUMeshRenderer {
  #device;#pipelines;#uniform;#group;#vertex=null;#capacity=0;#disposed=false;
  static async create({device,format,sampleCount=1,depthStencil,shaderCode}={}) {
    if(!device || typeof device.createRenderPipelineAsync!=='function' || typeof format!=='string') throw new TypeError('WebGPU device/format required');
    const adapterInfo=device.adapterInfo;
    if(adapterInfo?.isFallbackAdapter===true || /swiftshader|llvmpipe|software/i.test(adapterInfo?.description??'')) throw new Error('software_or_fallback_adapter_forbidden');
    if(!shaderCode) {
      const response=await fetch(new URL('./shaders/mesh.wgsl',import.meta.url));
      if(!response.ok) throw new Error(`WGSL load failed: ${response.status}`);
      shaderCode=await response.text();
    }
    const module=device.createShaderModule({label:'facility-use-e/mesh-v1',code:shaderCode});
    const info=await module.getCompilationInfo();
    const errors=info.messages.filter(m=>m.type==='error');
    if(errors.length) throw new Error(errors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
    const uniform=device.createBuffer({label:'facility-use-e/scene',size:336,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    try {
      const layout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform',minBindingSize:336}}]});
      const pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});
      const vertex={module,entryPoint:'vs_main',buffers:[{arrayStride:44,stepMode:'vertex',attributes:[
        {shaderLocation:0,offset:0,format:'float32x3'},
        {shaderLocation:1,offset:12,format:'float32x4'},
        {shaderLocation:2,offset:28,format:'float32x2'},
        {shaderLocation:3,offset:36,format:'float32'},
        {shaderLocation:4,offset:40,format:'float32'}]}]};
      const make=blend=>({label:'facility-use-e/mesh',layout:pipelineLayout,vertex,
        fragment:{module,entryPoint:'fs_main',targets:[{format,blend,writeMask:GPUColorWrite.ALL}]},
        primitive:{topology:'triangle-list',cullMode:'none'},multisample:{count:sampleCount},
        ...(depthStencil?{depthStencil:{...depthStencil,depthWriteEnabled:false}}:{})});
      const alpha=await device.createRenderPipelineAsync(make({color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}));
      const light=await device.createRenderPipelineAsync(make({color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}}));
      const group=device.createBindGroup({layout,entries:[{binding:0,resource:{buffer:uniform}}]});
      return new NativeWebGPUMeshRenderer(device,{alpha,light},uniform,group,info.messages);
    } catch(error) {uniform.destroy();throw error;}
  }
  constructor(device,pipelines,uniform,group,diagnostics=[]) {
    this.#device=device;this.#pipelines=pipelines;this.#uniform=uniform;this.#group=group;this.diagnostics=diagnostics;
  }
  /** 同じpass内では本メソッドを1回。ホストは以降の描画stateを再設定する。 */
  draw(pass,mesh,frame) {
    if(this.#disposed) throw new Error('renderer_disposed');
    const alpha=mesh.alpha,light=mesh.light,total=alpha.length+light.length;
    if(!total) return {vertices:0,drawCalls:0};
    const floats=new Float32Array(total);floats.set(alpha);floats.set(light,alpha.length);
    const bytes=floats.byteLength;
    if(bytes>this.#device.limits.maxBufferSize) throw new RangeError('visible_geometry_exceeds_GPU_buffer_limit');
    if(bytes>this.#capacity) {
      const capacity=Math.min(this.#device.limits.maxBufferSize,Math.max(4096,2**Math.ceil(Math.log2(bytes))));
      const next=this.#device.createBuffer({label:'facility-use-e/dynamic-vertices',size:capacity,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
      this.#vertex?.destroy();this.#vertex=next;this.#capacity=capacity;
    }
    const uniforms=new Float32Array(84);uniforms.set(frame.worldToClip);
    (frame.protectedRects??[]).forEach((r,i)=>uniforms.set(r,16+i*4));uniforms[80]=(frame.protectedRects??[]).length;
    this.#device.queue.writeBuffer(this.#uniform,0,uniforms);
    this.#device.queue.writeBuffer(this.#vertex,0,floats);
    const v=frame.viewport;
    pass.setViewport(v.x,v.y,v.width,v.height,0,1);
    pass.setBindGroup(0,this.#group);pass.setVertexBuffer(0,this.#vertex,0,bytes);
    let drawCalls=0;
    if(alpha.length){pass.setPipeline(this.#pipelines.alpha);pass.draw(alpha.length/11,1,0,0);drawCalls++;}
    if(light.length){pass.setPipeline(this.#pipelines.light);pass.draw(light.length/11,1,alpha.length/11,0);drawCalls++;}
    return {vertices:total/11,drawCalls};
  }
  dispose(){if(this.#disposed)return;this.#disposed=true;this.#vertex?.destroy();this.#uniform.destroy();}
}
