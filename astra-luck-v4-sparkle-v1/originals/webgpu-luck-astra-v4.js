/* Independent Astra v4 study: uncertain beneficiary states become one coherent state. */
(function(root){
  'use strict';
  const EDITION='luck-astra-clean-v4';
  const bound=x=>Math.max(0,Math.min(1,x));
  function fade(a,b,x){const q=bound((x-a)/(b-a));return q*q*(3-2*q);}
  function state(ms,duration=1500){if(!Number.isFinite(ms)||!Number.isFinite(duration)||duration<=0)return {p:-1,active:false,stage:'invalid'};const p=ms/duration;return {p,active:p>0&&p<1,stage:p<0?'inactive':p<.22?'uncertainty':p<.48?'possibilities':p<.67?'coherence':p<.85?'alignment':p<1?'confirmation':'ended'};}
  function synth(sampleRate=48000,duration=1500){
    if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000||!Number.isFinite(duration)||duration<100||duration>10000)throw RangeError('Invalid sound bounds');
    const pcm=new Float32Array(Math.ceil(sampleRate*duration/1000));let rng=173,low=0,phaseA=0,phaseB=0;
    for(let i=0;i<pcm.length;i++){
      const p=i/(pcm.length-1),time=i/sampleRate;rng=(Math.imul(rng,1664525)+1013904223)>>>0;low=low*.96+(rng/2147483648-1)*.04;
      const uncertainty=fade(.03,.17,p)*(1-fade(.41,.62,p));
      phaseA+=2*Math.PI*(480+110*Math.cos(p*9))/sampleRate;phaseB+=2*Math.PI*(733-91*Math.sin(p*7))/sampleRate;
      const contact=fade(.64,.68,p)*(1-fade(.72,.94,p));
      const tone=(Math.sin(2*Math.PI*523.25*time)+.36*Math.sin(2*Math.PI*1308.125*time)+.15*Math.sin(2*Math.PI*1831.375*time))*.048*contact;
      const shimmer=(Math.sin(phaseA)*.014+Math.sin(phaseB)*.009+low*.075)*uncertainty;
      pcm[i]=(tone+shimmer)*fade(0,.015,p)*(1-fade(.96,1,p));
    }pcm[0]=0;pcm[pcm.length-1]=0;return pcm;
  }
  const shader=`
struct U { size:vec2f, p:f32, height:f32, reduced:f32, glow:f32, pad:vec2f };
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) pos:vec4f, @location(0) local:vec2f, @location(1) @interpolate(flat) id:u32 };
fn emergence()->f32{return smoothstep(.015,.21,u.p)*(1.-smoothstep(.73,.85,u.p));}
fn offset(id:u32)->vec3f{
  let spread=emergence()*mix(1.,.32,u.reduced);
  if(id==0u){return vec3f(-26.,3.,-12.)*spread;}
  if(id==1u){return vec3f(21.,-3.,15.)*spread*(1.-smoothstep(.55,.81,u.p));}
  if(id==2u){return vec3f(9.,7.,-21.)*spread;}
  return vec3f(0.);
}
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) id:u32)->V{
  let q=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));
  let local=q[vi]*vec2f(26.,38.);let off=offset(id);let px=(local+off.xy)*(u.height/64.);
  var o:V;o.pos=vec4f(px.x*2./u.size.x,px.y*2./u.size.y,0.,1.);o.local=local;o.id=id;return o;
}
fn capsule(q:vec3f,a:vec3f,b:vec3f,r:f32)->f32{let v=q-a;let w=b-a;return length(v-w*clamp(dot(v,w)/dot(w,w),0.,1.))-r;}
fn anatomy(v:vec3f,id:u32)->f32{
  var q=v;
  let unclear=select(1.-smoothstep(.40,.61,u.p),1.,id!=1u);
  let block=floor((q.y+33.)/10.);
  if(id<3u){q.x+=sin(block*2.2+f32(id)*2.5)*unclear*3.3*emergence();}
  let pose=select(0.,sin(f32(id)*2.1+1.)*emergence(),id<3u);
  var d=length(q-vec3f(0.,25.,0.))-7.;
  d=min(d,capsule(q,vec3f(0.,12.,0.),vec3f(0.,-4.,0.),8.));
  d=min(d,capsule(q,vec3f(-4.5,-7.,0.),vec3f(-7.5,-29.,2.),3.));
  d=min(d,capsule(q,vec3f(4.5,-7.,0.),vec3f(8.,-29.,-1.),3.));
  d=min(d,capsule(q,vec3f(-6.,11.,0.),vec3f(-16.-pose*3.,-6.+pose*5.,1.),2.7));
  d=min(d,capsule(q,vec3f(6.,11.,0.),vec3f(16.+pose*2.,-6.-pose*4.,2.),2.7));return d;
}
@fragment fn fs(v:V)->@location(0) vec4f{
  let id=v.id;let actual=id==3u;let chosen=id==1u;
  if(!actual&&(u.p<=0.||u.p>=1.)){discard;}
  var life=smoothstep(.015,.16,u.p)*(1.-smoothstep(.77,.85,u.p));
  if(!actual&&!chosen){life*=1.-smoothstep(.44,.65,u.p);}
  if(!actual&&life<.001){discard;}
  var ray=vec3f(v.local,42.);var closest=100.;var hit=false;var d=0.;
  for(var i=0;i<44;i++){
    d=anatomy(ray,id);closest=min(closest,d);
    if(d<.07){hit=true;break;}
    ray.z-=max(.1,d*.86);if(ray.z< -30.){break;}
  }
  let gold=smoothstep(.40,.59,u.p)*select(0.,1.,chosen);
  let color=mix(vec3f(.16,.42,.68),vec3f(1.,.62,.18),gold);
  if(!hit){
    if(actual){discard;}
    let halo=exp(-closest*.78)*life*.15*u.glow;
    return vec4f(color*halo,halo*.12);
  }
  let e=.13;
  let normal=normalize(vec3f(anatomy(ray+vec3f(e,0.,0.),id)-anatomy(ray-vec3f(e,0.,0.),id),anatomy(ray+vec3f(0.,e,0.),id)-anatomy(ray-vec3f(0.,e,0.),id),anatomy(ray+vec3f(0.,0.,e),id)-anatomy(ray-vec3f(0.,0.,e),id)));
  let facing=max(normal.z,0.);let edge=pow(1.-facing,2.1);
  if(actual){
    let arrive=smoothstep(.65,.79,u.p)*(1.-smoothstep(.87,.99,u.p));
    let wave=exp(-pow((ray.y-mix(13.,-14.,smoothstep(.65,.90,u.p)))/14.,2.));
    let response=arrive*wave;
    let shade=.21+.10*max(dot(normal,normalize(vec3f(-.5,.9,1.))),0.);
    return vec4f(vec3f(shade*.92,shade,shade*1.08)+vec3f(1.,.62,.18)*response*(.42+edge*.40),1.);
  }
  let band=.52+.48*smoothstep(-.35,.7,sin(ray.y*.30+f32(id)*2.3));
  let settled=mix(band,1.,gold);
  let shell=(.20+.80*edge)*settled;
  let radiance=color*(.66+edge*.85)+vec3f(1.,.93,.70)*gold*pow(facing,5.)*.65;
  let opacity=life*shell*mix(.58,.83,gold);
  return vec4f(radiance*opacity,opacity*.73);
}`;
  async function create(canvas,{height=100,duration=1500,reduced=false,onError=()=>{}}={}){
    if(!root.navigator?.gpu)throw Error('WebGPU required');const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('No GPU adapter');const device=await adapter.requestDevice();
    const context=canvas.getContext('webgpu');if(!context){device.destroy();throw Error('No WebGPU context');}const format=navigator.gpu.getPreferredCanvasFormat();
    const mod=device.createShaderModule({code:shader}),messages=await mod.getCompilationInfo();if(messages.messages.some(m=>m.type==='error')){device.destroy();throw Error(messages.messages.map(m=>m.message).join('\n'));}
    const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:mod,entryPoint:'vs'},fragment:{module:mod,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]}});
    const buffer=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
    const silent=new URLSearchParams(root.location?.search||'').has('verify');let audio=null,disposed=false,raf,configured=false,frames=0,lastCycle=-1;const sounds=new Set(),origin=performance.now();
    device.addEventListener('uncapturederror',e=>onError(e.error.message));device.lost.then(e=>{if(!disposed)onError(e.message);});
    function render(ms,glow=1){
      if(disposed)return false;const bounds=canvas.getBoundingClientRect(),ratio=Math.min(root.devicePixelRatio||1,2),w=Math.max(1,Math.round(bounds.width*ratio)),h=Math.max(1,Math.round(bounds.height*ratio));
      if(!configured||w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;context.configure({device,format,alphaMode:'opaque'});configured=true;}
      const phase=state(ms,duration);device.queue.writeBuffer(buffer,0,new Float32Array([w,h,phase.p,height*ratio,reduced?1:0,glow,0,0]));
      const cmd=device.createCommandEncoder(),pass=cmd.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:.052,g:.070,b:.086,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);
      // All unresolved states stay behind the real beneficiary; the beneficiary never moves.
      pass.draw(6,4);pass.end();device.queue.submit([cmd.finish()]);frames++;canvas.dataset.phase=String(phase.p);canvas.dataset.stage=phase.stage;return phase;
    }
    async function unlock(){if(silent||disposed)return;const A=root.AudioContext||root.webkitAudioContext;if(A){audio ||=new A();await audio.resume();}}
    function sound(cycle,elapsed){if(silent||!audio||audio.state!=='running'||cycle===lastCycle||elapsed>75)return;lastCycle=cycle;const pcm=synth(audio.sampleRate,duration),buf=audio.createBuffer(1,pcm.length,audio.sampleRate);buf.copyToChannel(pcm,0);const source=audio.createBufferSource();source.buffer=buf;source.connect(audio.destination);sounds.add(source);source.onended=()=>{sounds.delete(source);source.disconnect();};source.start();}
    function tick(now){if(disposed)return;const total=duration+1700,elapsed=now-origin,ms=elapsed%total;render(ms);sound(Math.floor(elapsed/total),ms);raf=requestAnimationFrame(tick);}
    root.addEventListener('pointerdown',unlock,{passive:true});root.addEventListener('keydown',unlock);if(!silent)void unlock().catch(()=>{});raf=requestAnimationFrame(tick);
    return {edition:EDITION,silent,adapter:{vendor:adapter.info?.vendor,architecture:adapter.info?.architecture},messages:messages.messages.map(x=>({type:x.type,message:x.message})),get audioCreated(){return audio!==null;},get frames(){return frames;},render,
      async capture(ms,glow=1){cancelAnimationFrame(raf);const value=render(ms,glow);await device.queue.onSubmittedWorkDone();return value;},
      destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);root.removeEventListener('pointerdown',unlock);root.removeEventListener('keydown',unlock);for(const s of sounds){try{s.stop();}catch{}}sounds.clear();if(audio)void audio.close();context.unconfigure();buffer.destroy();device.destroy();}
    };
  }
  const api={EDITION,state,synth,create};root.LuckAstraV4=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
