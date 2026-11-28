const geo=`
struct Scene { view: vec4<f32>, tint: vec4<f32>, theme: vec4<f32> }
@group(0) @binding(0) var<uniform> scene: Scene;
struct VertexOut { @builtin(position) pos: vec4<f32>, @location(0) color: vec4<f32>, @location(1) coupling: f32, @location(2) wpos: vec2f, @location(3) field: f32 }
@vertex fn vertex(@location(0) p: vec2<f32>, @location(1) c: vec4<f32>, @location(2) k: f32, @location(3) field: f32) -> VertexOut {
  var o: VertexOut;
  let pixel = (p*scene.view.z + scene.tint.xy)*scene.view.w;
  o.pos = vec4f(pixel.x/scene.view.x*2.-1., 1.-pixel.y/scene.view.y*2., 0., 1.);
  o.color = c; o.coupling = k; o.wpos=p; o.field=field; return o;
}
struct Targets { @location(0) sceneLight: vec4f, @location(1) highLight: vec4f }
// The existing preview ground receives a single time field, not a travelling
// object. Coordinates and clocks are shared across continuous transverse rows.
fn floorMaterial(v: VertexOut)->Targets {
  let p=v.wpos;
  let slow=exp(-pow(abs(p.y-.341)/.130,2.));
  let phase=mix(scene.tint.z,scene.tint.w,slow);
  let tiles=(p.x-phase+.142*(p.y-.34))/.47;
  let joints=abs(fract(tiles+.5)-.5)*.47;
  let edge=1.-smoothstep(.018,.049,joints);
  let brightEdge=1.-smoothstep(.008,.029,abs(joints-.008));
  let rowPitch=.177;
  let rowLine=1.-smoothstep(.007,.026,abs(fract((p.y-.108)/rowPitch+.5)-.5)*rowPitch);
  let panel=select(.50,.84,fract(floor(tiles+.5)*.5)>.01);
  let grade=.57+.43*slow;
  let feather=(1.-smoothstep(1.29,1.84,abs(p.x)))*smoothstep(.055,.148,p.y)*(1.-smoothstep(.535,.704,p.y));
  let ink=vec3f(.045,.109,.174);
  let color=ink*(.69+.31*panel)+vec3f(.07,.20,.29)*rowLine*.34+(vec3f(.065,.236,.340)*edge+vec3f(.073,.26,.31)*brightEdge)*grade;
  let cover=v.color.a*feather*(.43+.13*edge+.055*rowLine);
  let light=v.color.a*feather*(brightEdge*.095+rowLine*.004);
  var out:Targets;
  out.sceneLight=vec4f(color*cover,cover);
  out.highLight=vec4f(vec3f(.15,.50,.70)*light,light);
  return out;
}

@fragment fn world(v: VertexOut) -> Targets {
  var out: Targets;
  if(v.field>.5){return floorMaterial(v);}
  out.sceneLight = vec4f(v.color.rgb*v.color.a,v.color.a);
  let luminance=dot(v.color.rgb,vec3f(.2126,.7152,.0722));
  let soft=smoothstep(.63,2.8,luminance)*v.coupling*v.color.a;
  out.highLight = vec4f(v.color.rgb * soft,v.color.a);
  return out;
}
@vertex fn plate(@builtin(vertex_index) i:u32) -> @builtin(position) vec4f {
  let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.)); return vec4f(q[i],0.,1.);
}
@fragment fn backdrop(@builtin(position) p: vec4f) -> Targets {
  let m=(p.xy/scene.view.w-scene.tint.xy)/scene.view.z;
  let uv=p.xy/scene.view.xy;
  let field=exp(-dot(uv-vec2f(.46,.47),uv-vec2f(.46,.47))*3.);
  let over=vec3f(.012,.020,.030)+vec3f(.014,.016,.019)*field;
  let day=vec3f(.44,.49,.49)+vec3f(.15,.15,.134)*field;
  let bg=mix(over,day,scene.theme.x);
  let deck=smoothstep(-.38,.14,m.y);
  let far=1.-smoothstep(.05,1.63,max(0.,m.y));
  let cell=m/1.15;
  let dist=abs(fract(cell+.5)-.5)*1.15;
  let grid=1.-min(1.,min(dist.x,dist.y)/(1.35/scene.view.z));
  let rail=1.-min(1.,abs(m.y-.062)/(1.4/scene.view.z));
  let deckTone=mix(vec3f(.038,.052,.073),vec3f(.19,.17,.13),scene.theme.x);
  let rgb=mix(bg,bg*.73+deckTone*.20,deck)+deckTone*(grid*.21+rail*.32)*deck*far;
  var o: Targets; o.sceneLight=vec4f(rgb,1.);o.highLight=vec4f(0.); return o;
}`;
const optics=`
struct Scene { view: vec4<f32>, tint: vec4<f32>, theme: vec4<f32> }
@group(0) @binding(0) var smp:sampler;
@group(0) @binding(1) var input:texture_2d<f32>;
@group(0) @binding(2) var blooms:texture_2d<f32>;
@group(0) @binding(3) var<uniform> scene:Scene;
struct Out { @builtin(position) pos:vec4f, @location(0) uv:vec2f }
@vertex fn screen(@builtin(vertex_index) i:u32)->Out {
  let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:Out; o.pos=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;
}
fn sampleHdr(uv:vec2f)->vec3f {return textureSampleLevel(input,smp,uv,0.).rgb;}
fn spread(uv:vec2f,axis:vec2f)->vec3f {
  // Samples occupy adjacent half-res pixel cells, independent of artistic zoom.
  // Each compact Gaussian's world scale changes weights, never the sample spacing.
  let pxM=scene.view.z*scene.view.w;
  let narrow=max(1.35,.027*pxM);let wide=max(1.65,.056*pxM);
  let tapCount=i32(clamp(ceil(1.48*wide),3.,15.));
  let step=axis/scene.view.xy*2.;
  var first=sampleHdr(uv);
  var second=first;
  var wsum1=1.;
  var wsum2=1.;
  for(var i:i32=1;i<=tapCount;i+=1){
    let sample2=sampleHdr(uv+f32(i)*step)+sampleHdr(uv-f32(i)*step);
    let a=2.*f32(i)/narrow;let b=2.*f32(i)/wide;
    let wa=exp(-.5*a*a);let wb=exp(-.5*b*b);
    first+=sample2*wa;second+=sample2*wb;
    wsum1+=2.*wa;wsum2+=2.*wb;
  }
  return first/wsum1*.78+second/wsum2*.22;
}
@fragment fn blurX(i:Out)->@location(0) vec4f {
  return vec4f(spread(i.uv,vec2f(1.,0.)),1.);
}
@fragment fn blurY(i:Out)->@location(0) vec4f {
  return vec4f(spread(i.uv,vec2f(0.,1.)),1.);
}
fn encode(v:vec3f)->vec3f {
  let m=max(v,vec3f(0.));
  return select(m*12.92,1.055*pow(m,vec3f(1./2.4))-.055,m>vec3f(.0031308));
}
@fragment fn compose(i:Out)->@location(0) vec4f {
  let glow=textureSampleLevel(blooms,smp,i.uv,0.).rgb*scene.theme.y*.48;
  let world=sampleHdr(i.uv)+glow;
  // Linear HDR with a soft shoulder above the scene range. No per-background remapping.
  let c=select(world, .73+.27*(1.-exp(-(world-.73)*3.70)),world>vec3f(.73));
  return vec4f(encode(c),1.);
}`;
export async function initGpu(canvas,{onPhase,onFailure}){
  if(!navigator.gpu)throw Error('WebGPU はこのブラウザで利用できません');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('WebGPU アダプターが取得できません');
  onPhase('adapter-resolved');
  const device=await adapter.requestDevice();onPhase('device-resolved');
  let alive=true;
  const onError=(e)=>onFailure(e.error?.message||'WebGPU validation error');device.addEventListener('uncapturederror',onError);
  device.lost.then((info)=>{if(alive)onFailure(info.message||'WebGPU device lost')});
  const context=canvas.getContext('webgpu');if(!context){device.destroy();throw Error('WebGPU canvas context unavailable')}
  const format=navigator.gpu.getPreferredCanvasFormat();
  context.configure({device,format,alphaMode:'opaque'});onPhase('canvas-configured');
  const gm=device.createShaderModule({label:'decelerate floor material and fixture',code:geo});
  const om=device.createShaderModule({label:'decelerate radiance and observation',code:optics});
  const comp=await Promise.all([gm.getCompilationInfo(),om.getCompilationInfo()]);
  const errors=comp.flatMap(o=>o.messages.filter(m=>m.type==='error'));if(errors.length){alive=false;context.unconfigure();device.destroy();throw Error(errors.map(e=>e.lineNum+':'+e.message).join(' | '))}
  const shaderInfo=await Promise.all([['geometry',geo],['optics',optics]].map(async ([name,code],i)=>{
    const bytes=new TextEncoder().encode(code), sum=await crypto.subtle.digest('SHA-256',bytes);
    return {name,bytes:bytes.length,sha256:Array.from(new Uint8Array(sum),b=>b.toString(16).padStart(2,'0')).join(''),
      messages:comp[i].messages.map(m=>({message:m.message,type:m.type,line:m.lineNum,column:m.linePos}))};
  }));
  const uniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const vs={module:gm,entryPoint:'vertex',buffers:[{arrayStride:32,attributes:[{shaderLocation:0,format:'float32x2',offset:0},{shaderLocation:1,format:'float32x4',offset:8},{shaderLocation:2,format:'float32',offset:24},{shaderLocation:3,format:'float32',offset:28}]}]};
  const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
  const geoLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});
  const oneLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});
  const twoLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});
  const pipe=async(layout,vertex,module,entryPoint,targets)=>device.createRenderPipelineAsync({
    layout:device.createPipelineLayout({bindGroupLayouts:[layout]}),vertex,fragment:{module,entryPoint,targets},primitive:{topology:'triangle-list'}
  });
  const hdr=[{format:'rgba16float'},{format:'rgba16float'}], screen={module:om,entryPoint:'screen'};
  let bg,world,bx,by,out;
  try{[bg,world,bx,by,out]=await Promise.all([
    pipe(geoLayout,{module:gm,entryPoint:'plate'},gm,'backdrop',hdr),pipe(geoLayout,vs,gm,'world',hdr.map(x=>({...x,blend}))),
    pipe(oneLayout,screen,om,'blurX',[hdr[0]]),pipe(oneLayout,screen,om,'blurY',[hdr[0]]),
    pipe(twoLayout,screen,om,'compose',[{format}])
  ])}catch(e){alive=false;context.unconfigure();device.destroy();throw e}
  onPhase('pipeline-ready');
  const fixed=device.createBindGroup({layout:geoLayout,entries:[{binding:0,resource:{buffer:uniform}}]});
  const smp=device.createSampler({magFilter:'linear',minFilter:'linear'});
  let size=0,vb=null,target=null;
  function alloc(w,h){
    if(target?.w===w&&target?.h===h)return;
    const previous=target;if(previous)device.queue.onSubmittedWorkDone().then(()=>previous.textures.forEach(t=>t.destroy())).catch(()=>{});
    const tex=(width,height,which)=>device.createTexture({label:which,size:{width,height},format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
    const a=tex(w,h,'world HDR'), b=tex(w,h,'world source radiance'), c=tex(Math.max(1,w>>1),Math.max(1,h>>1),'horizontal observer response'), d=tex(Math.max(1,w>>1),Math.max(1,h>>1),'observer integration');
    const views=[a,b,c,d].map(x=>x.createView());
    const bind=(layout,v,glow)=>device.createBindGroup({layout,entries:[{binding:0,resource:smp},{binding:1,resource:v},...(glow?[{binding:2,resource:glow}]:[]),{binding:3,resource:{buffer:uniform}}]});
    target={w,h,textures:[a,b,c,d],views,gx:bind(oneLayout,views[1]),gy:bind(oneLayout,views[2]),fx:bind(twoLayout,views[0],views[3])};
  }
  function draw(mesh,{w,h,ox,oy,scale,dpr,bright,observer,outerPhase=0,localPhase=0}){
    if(!alive)return Promise.reject(Error('GPU disposed'));
    alloc(w,h);
    if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
    if(mesh.length*4>size){
      const previous=vb;if(previous)device.queue.onSubmittedWorkDone().then(()=>previous.destroy()).catch(()=>{});
      size=Math.max(32768,2**Math.ceil(Math.log2(mesh.length*4)));
      vb=device.createBuffer({label:'decelerate dynamic vertices',size,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
    }
    device.queue.writeBuffer(uniform,0,new Float32Array([w,h,scale,dpr,ox,oy,outerPhase,localPhase,Number(bright),Number(observer),0,0]));
    if(mesh.length)device.queue.writeBuffer(vb,0,mesh.data.subarray(0,mesh.length));
    const encoder=device.createCommandEncoder({label:'DVA decelerate frame'});
    const make=(views)=>encoder.beginRenderPass({colorAttachments:views.map(view=>({view,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}))});
    let p=make(target.views.slice(0,2));p.setPipeline(bg);p.setBindGroup(0,fixed);p.draw(3);
    if(mesh.length){p.setPipeline(world);p.setBindGroup(0,fixed);p.setVertexBuffer(0,vb);p.draw(mesh.length/8)}p.end();
    if(observer){
      p=make([target.views[2]]);p.setPipeline(bx);p.setBindGroup(0,target.gx);p.draw(3);p.end();
      p=make([target.views[3]]);p.setPipeline(by);p.setBindGroup(0,target.gy);p.draw(3);p.end();
    }else{p=make([target.views[3]]);p.end();}
    p=make([context.getCurrentTexture().createView()]);p.setPipeline(out);p.setBindGroup(0,target.fx);p.draw(3);p.end();
    device.queue.submit([encoder.finish()]);
    return device.queue.onSubmittedWorkDone();
  }
  return {draw,adapter:{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description,isFallbackAdapter:adapter.info.isFallbackAdapter},shaderInfo,destroy(){
    if(!alive)return;alive=false;device.removeEventListener('uncapturederror',onError);vb?.destroy();target?.textures.forEach(t=>t.destroy());context.unconfigure();device.destroy();
  }};
}

