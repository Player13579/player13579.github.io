/* Sunbeam clean v3. Original code/design: Codex gpt-6-astra, 2026-09-26.
 * No prior Sunbeam/E implementation used. See outputs/.../design.md.
 * Isolated candidate; no game registration or adoption implied. */
(function (root) {
  'use strict';
  const VERSION = 'sunbeam-astra-clean-v3';
  const DURATION = 2.15;
  const WGSL = `
struct Beam { endpoints:vec4f,state:vec4f,spare:vec4f }
struct Uniforms {view:vec4f,beams:array<Beam,4>}
@group(0) @binding(0) var<uniform> u:Uniforms;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
fn g(x:f32)->f32{return exp(-x*x);}
fn rise(t:f32,a:f32,b:f32)->f32{return smoothstep(a,b,t);}
fn emission(t:f32,j:u32)->f32 {let q=t-f32(j)*.045;return rise(q,.09,.16)*(1.-rise(q,.35,.46))+rise(q,.63,.72)*(1.-rise(q,1.25,1.38));}
fn capsule(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32 {let ab=b-a;let d=length(p-a-ab*clamp(dot(p-a,ab)/dot(ab,ab),0.,1.))-r;return 1.-smoothstep(-.8,.8,d);}
fn figure(p:vec2f,b:Beam)->f32{
 if(b.spare.y<.5){return 0.;}let d=p-b.endpoints.xy;let axis=normalize(b.endpoints.zw-b.endpoints.xy);let q=vec2f(dot(d,axis),dot(d,vec2f(-axis.y,axis.x)));
 var a=1.-smoothstep(6.2,7.2,length(q-vec2f(-43.,-25.)));
 a=max(a,capsule(q,vec2f(-43.,-13.),vec2f(-42.,11.),7.));
 a=max(a,capsule(q,vec2f(-45.,10.),vec2f(-50.,31.),3.));a=max(a,capsule(q,vec2f(-38.,10.),vec2f(-32.,31.),3.));
 a=max(a,capsule(q,vec2f(-39.,-10.),vec2f(-23.,-2.),3.4));a=max(a,capsule(q,vec2f(-23.,-2.),vec2f(-9.,0.),3.));
 a=max(a,capsule(q,vec2f(-7.,-5.),vec2f(-7.,6.),3.));
 a=max(a,capsule(q,vec2f(-6.,-4.),vec2f(-3.,-10.),1.5));
 a=max(a,capsule(q,vec2f(-4.,-2.),vec2f(-1.,-7.),1.4));
 a=max(a,capsule(q,vec2f(-4.,1.),vec2f(0.,-3.),1.4));
 return a;
}
fn field(p:vec2f,b:Beam)->vec4f {
 let t=b.state.x;let delta=b.endpoints.zw-b.endpoints.xy;let len=length(delta);
 if(b.state.w<.5||len<1.||t<0.||t>=2.15){return vec4f(0.);}
 let axis=delta/len;let d=p-b.endpoints.xy;let scale=b.state.y;
 let x=dot(d,axis)/scale;let y=dot(d,vec2f(-axis.y,axis.x))/scale;let L=len/scale;let s=x/L;
 if(x< -38.||x>L+25.||abs(y)>180.){return vec4f(0.);}
 var rgb=vec3f(0.);var density=0.;
 let starts=array<f32,3>(.10,.20,.29);let stops=array<f32,3>(1.57,1.28,1.44);
 let offsets=array<f32,3>(0.,-42.,35.);let widths=array<f32,3>(22.,12.,10.);
 let colors=array<vec3f,3>(vec3f(1.,.90,.49),vec3f(1.,.61,.18),vec3f(1.,.98,.77));
 for(var j=0u;j<3u;j++){
  let birth=starts[j];let stop=stops[j];let front=rise(t,birth,birth+.19);let rear=rise(t,stop,stop+.58);
  let domain=rise(s,-.018,.0)*(1.-rise(s,.988,1.01));
  let transit=(1.-rise(s,front-.022,front+.022))*rise(s,rear-.018,rear+.025);
  let spread=pow(clamp(s,0.,1.),.72);let retarded=t-s*.19;let opening=.66+.44*rise(retarded,.28,.82)-.28*rise(retarded,1.12,1.57);let center=offsets[j]*spread*opening;
  let width=mix(2.3,widths[j],rise(s,0.,.22));let cross=(y-center)/width;
  let chord=exp(-pow(abs(cross),3.));
  // Two finite, broad radiation intervals travel without changing the light-path radius.
  let sampleTime=t-.58*clamp(s,0.,1.)-.015*cross;
  let pulse=emission(sampleTime,j);
  let supply=.12+.88*pulse;
  let lamina=chord*domain*transit*supply*rise(t,birth,birth+.045);
  let inner=g(cross/0.72)*domain*transit*supply;
  let rangeLight=1.0-.18*clamp(s,0.,1.);
  rgb+=colors[j]*(lamina*.98+inner*.32)*rangeLight;
  density+=lamina*.11;
  // Wide, faint volume outside each sheet; unequal angular domains stay readable.
  let skirt=g((y-center)/(width*2.+7.))*domain*transit*supply;
  rgb+=vec3f(1.,.45,.09)*skirt*(.07+.025*f32(j));
  let nose=g((x-front*L)/10.)*g((y-center)/(width*1.20))*rise(t,birth,birth+.025)*(1.-rise(t,birth+.16,birth+.22));
  rgb+=colors[j]*nose*1.2;
  if(b.spare.x>.5){
   let hit=t-(birth+.19);let hitEnd=stop+.58;let feeding=rise(t,birth+.18,birth+.22)*(1.-rise(t,hitEnd,hitEnd+.11))*(.12+.88*emission(t-.58,j));
   let arrival1=t-(.67+f32(j)*.045);let arrival2=t-(1.21+f32(j)*.045);let onset=rise(hit,0.,.025)*exp(-max(hit,0.)*9.)*.3+rise(arrival1,0.,.05)*exp(-max(arrival1,0.)*6.)+rise(arrival2,0.,.05)*exp(-max(arrival2,0.)*6.);
   let outward=12.+65.*rise(hit,0.,.22);
   let surface=(1.-rise(abs(y),88.,97.))*rise(x-L,-5.,0.)*(1.-rise(x-L,22.,27.))*(g((y-offsets[j]*opening)/(width*1.2+8.))*.26*feeding+g((y-offsets[j]*opening)/outward)*.72*onset);
   let edgeLight=g((x-L)/2.1)*g((y-offsets[j]*opening)/(width*1.3+5.))*feeding;
   let wing=(1.-rise(x-L,-2.,3.))*rise(x-L,-85.,-35.)*g((abs(y-offsets[j]*opening)-abs(x-L)*.72)/(9.+abs(x-L)*.25))*exp(min(0.,x-L)/72.)*onset;
   rgb+=vec3f(1.,.84,.41)*surface+vec3f(1.,.98,.86)*edgeLight*.80+vec3f(1.,.57,.15)*wing*.95;
   density+=surface*.12;
  }
 }
 let sourceOn=rise(t,0.,.11)*(1.-rise(t,1.36,1.60))*(.18+.82*emission(t,0u));
 let source=g(x/4.5)*g(y/13.)*sourceOn;
 let forward=rise(x,-3.,3.)*(1.-rise(x,16.,64.))*g(y/(8.+max(x,0.)*.30))*sourceOn;
 rgb+=vec3f(1.,.98,.82)*source*4.+vec3f(1.,.73,.22)*forward*.40;
 // The surrounding light has a bounded forward fan, not a blurred cylinder.
 let ambient=rise(x,-4.,4.)*(1.-rise(x,90.,240.))*g(y/(11.+max(x,0.)*.30))*sourceOn;
 rgb+=vec3f(1.,.55,.12)*ambient*.10;density+=source*.3;
 let expiry=1.-rise(t,2.02,2.15);return vec4f(rgb*expiry,(1.-exp(-density))*expiry);
}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f {
 let p=pos.xy/u.view.z;var rgb=vec3f(0.);var alpha=0.;
 for(var i=0u;i<4u;i++){let f=figure(p,u.beams[i]);let v=field(p,u.beams[i]);let near=exp(-distance(p,u.beams[i].endpoints.xy)/23.);let t=u.beams[i].state.x;let lit=rise(t,0.,.11)*(1.-rise(t,1.36,1.60))*(.18+.82*emission(t,0u));rgb+=(vec3f(.10,.14,.20)+vec3f(.55,.34,.07)*near*lit)*f+v.rgb;alpha=max(alpha,f);alpha=1.-(1.-alpha)*(1.-v.a);}
 return vec4f(rgb,alpha);
}
`;
  const POST = `
@group(0) @binding(0) var hdr:texture_2d<f32>;
@group(0) @binding(1) var linearSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let size=vec2f(textureDimensions(hdr));let uv=p.xy/size;
 let center=textureSampleLevel(hdr,linearSampler,uv,0.);
 var halo=vec3f(0.);
 // OBS1 uses only actual PH radiance; it cannot invent a source silhouette.
 for(var j=0u;j<8u;j++){
  let theta=f32(j)*0.78539816;
  let direction=vec2f(cos(theta),sin(theta));
  let a=textureSampleLevel(hdr,linearSampler,uv+direction*4./size,0.).rgb;
  let b=textureSampleLevel(hdr,linearSampler,uv+direction*10./size,0.).rgb;
  halo+=(a*0.055+b*0.032);
 }
 let energy=center.rgb+halo*0.33;
 let rgb=vec3f(1.)-exp(-energy*1.32);
 let alpha=max(center.a,max(rgb.r,max(rgb.g,rgb.b)));
 return vec4f(rgb,alpha);
}
`;

  function checkedBeam(beam) {
    const a=beam?.start,b=beam?.end;
    if (!a || !b || ![a.x,a.y,b.x,b.y,beam.age].every(Number.isFinite)) throw new TypeError('Finite explicit start/end/age required');
    return {start:{x:a.x,y:a.y},end:{x:b.x,y:b.y},age:beam.age,scale:Number.isFinite(beam.scale)&&beam.scale>0?beam.scale:1,reducedMotion:!!beam.reducedMotion,impactConfirmed:beam.impactConfirmed===true,previewFigure:beam.previewFigure===true};
  }

  async function createRenderer(canvas) {
    if(!navigator.gpu)throw new Error('WebGPU required');
    const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('GPU adapter unavailable');
    const device=await adapter.requestDevice(),errors=[];
    device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
    const context=canvas.getContext('webgpu');if(!context){device.destroy();throw new Error('WebGPU canvas unavailable');}
    const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'premultiplied'});
    const module=device.createShaderModule({code:WGSL}),postModule=device.createShaderModule({code:POST});
    for(const shader of [module,postModule]){const info=await shader.getCompilationInfo();const bad=info.messages.filter(m=>m.type==='error');if(bad.length){device.destroy();throw new Error(bad.map(m=>m.message).join('\n'));}}
    const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
    const postPipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:postModule,entryPoint:'vs'},fragment:{module:postModule,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
    const buffer=device.createBuffer({size:208,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
    const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
    const data=new Float32Array(52);let texture=null,postBind=null,disposed=false,submitted=0;
    return {
      version:VERSION,adapterInfo:{vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,device:adapter.info?.device,description:adapter.info?.description},errors,
      render(beams=[],{width=canvas.clientWidth,height=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2)}={}) {
        if(disposed)throw new Error('Renderer disposed');if(beams.length>4)throw new RangeError('At most four simultaneous Sunbeams');
        if(![width,height,dpr].every(n=>Number.isFinite(n)&&n>0))throw new TypeError('Positive viewport required');
        const pw=Math.max(1,Math.round(width*dpr)),ph=Math.max(1,Math.round(height*dpr));
        if(canvas.width!==pw||canvas.height!==ph||!texture){
          texture?.destroy();canvas.width=pw;canvas.height=ph;
          texture=device.createTexture({size:[pw,ph],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
          postBind=device.createBindGroup({layout:postPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView()},{binding:1,resource:sampler}]});
        }
        data.fill(0);data.set([width,height,dpr,beams.length]);beams.forEach((raw,i)=>{const b=checkedBeam(raw);data.set([b.start.x,b.start.y,b.end.x,b.end.y,b.age,b.scale,b.reducedMotion?1:0,1,b.impactConfirmed?1:0,b.previewFigure?1:0,0,0],4+i*12);});
        device.queue.writeBuffer(buffer,0,data);const encoder=device.createCommandEncoder();
        const pass=encoder.beginRenderPass({colorAttachments:[{view:texture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
        pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
        const postPass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
        postPass.setPipeline(postPipeline);postPass.setBindGroup(0,postBind);postPass.draw(3);postPass.end();device.queue.submit([encoder.finish()]);submitted++;
        return{submitted,ages:beams.map(b=>b.age)};
      },flush:()=>device.queue.onSubmittedWorkDone(),
      dispose(){if(disposed)return;disposed=true;texture?.destroy();buffer.destroy();context.unconfigure();device.destroy();}
    };
  }

  // Original deterministic PCM: inhaled spectral onset, pressure, solar harmonics.
  function synthesize(sampleRate=48000, impactConfirmed=false) {
    if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000) throw new RangeError('Unsupported sample rate');
    const pcm=new Float32Array(Math.ceil(DURATION*sampleRate));
    const starts=[.09,.135,.18,.63,.675,.72];
    let seed=61373,low=0,air=0,phase=0;
    for(let i=0;i<pcm.length;i++){
      const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;
      low+=.022*(noise-low);air+=.20*(noise-air);phase+=2*Math.PI*(460-150*Math.min(t/1.6,1))/sampleRate;
      const gate=Math.min(1,t/.035)**2*Math.max(0,Math.min(1,(DURATION-t)/.16))**2;
      const source=Math.min(1,t/.12)*Math.exp(-Math.max(0,t-1.36)*9);
      let layers=0,contacts=0;
      const layerSignal=t>=starts[0] ? low*.55+Math.sin(2*Math.PI*92*t)*.11 : 0;
      const contactSignal=impactConfirmed&&t-starts[0]-.58>=0 ? low*.7+Math.sin(2*Math.PI*135*t)*.085 : 0;
      for(let j=0;j<starts.length;j++){
        const start=starts[j],a=t-start;
        if(a>=0)layers+=(1-Math.exp(-a*70))*Math.exp(-a*16)*layerSignal;
        const h=t-start-.58;
        if(impactConfirmed&&h>=0)contacts+=(1-Math.exp(-h*90))*Math.exp(-h*12)*contactSignal;
      }
      const sheen=(Math.sin(phase)*.055+Math.sin(phase*1.505)*.030+Math.sin(phase*2.01)*.022)*source;
      const breath=(air-low)*.21*source;const inhale=(noise-air)*.06*Math.exp(-Math.pow((t-.06)/.06,2));
      pcm[i]=Math.tanh((sheen+breath+inhale+layers+contacts)*gate)*.70;
    }
    pcm[0]=0;pcm[pcm.length-1]=0;return pcm;
  }
  function createSound({verify=new URLSearchParams(root.location?.search||'').has('verify'),muted=false}={}){
    // URL verification cannot be overridden through options.
    const locked=verify||new URLSearchParams(root.location?.search||'').has('verify');
    let context=null,buffer=null,impactBuffer=null,disposed=false;
    const seen=new Set(),active=new Map();
    async function unlock(){
      if(locked||muted||disposed)return false;
      if(!context){context=new (root.AudioContext||root.webkitAudioContext)();buffer=context.createBuffer(1,Math.ceil(DURATION*context.sampleRate),context.sampleRate);buffer.copyToChannel(synthesize(context.sampleRate),0);impactBuffer=context.createBuffer(1,Math.ceil(DURATION*context.sampleRate),context.sampleRate);impactBuffer.copyToChannel(synthesize(context.sampleRate,true),0);}
      await context.resume();return context.state==='running';
    }
    function play(id,{impactConfirmed=false}={}){
      if(typeof id!=='string'||!id||seen.has(id)||disposed||locked||muted||context?.state!=='running')return false;
      seen.add(id);if(seen.size>256)seen.delete(seen.values().next().value);
      if(active.size>=4)return false;
      const source=context.createBufferSource(),gain=context.createGain();source.buffer=impactConfirmed?impactBuffer:buffer;gain.gain.value=0.65/Math.sqrt(active.size+1);
      source.connect(gain);gain.connect(context.destination);source.onended=()=>{source.disconnect();gain.disconnect();active.delete(id);};active.set(id,{source,gain});source.start();return true;
    }
    function cancel(id){const entry=active.get(id);if(entry){const now=context.currentTime;entry.gain.gain.cancelScheduledValues(now);entry.gain.gain.setTargetAtTime(0,now,0.008);entry.source.stop(now+0.04);active.delete(id);}}
    return {unlock,play,cancel,get locked(){return locked;},get activeCount(){return active.size;},async dispose(){if(disposed)return;disposed=true;for(const id of active.keys())cancel(id);if(context)await context.close();active.clear();}};
  }
  const api={VERSION,DURATION,WGSL,checkedBeam,createRenderer,synthesize,createSound};
  root.SunbeamAstraCleanV3=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
