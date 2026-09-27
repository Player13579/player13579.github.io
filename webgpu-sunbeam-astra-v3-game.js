/* Sunbeam v3 game adapter. Reuses the accepted v3 WGSL and POST shader verbatim.
 * This module owns no canvas/context/device; it records into the shared DVA frame. */
(function (root) {
 'use strict';
 const VERSION='sunbeam-astra-v3-game';
 const DURATION=2.15;
 const WGSL=`
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
 const POST=`
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
 function finiteVec(point){return point&&Number.isFinite(point.x)&&Number.isFinite(point.y);}
 function create({renderer,source=null,audio=null}={}){
  if(!renderer?.device||renderer.state!=='ready'||typeof renderer.format!=='string'||!renderer.format)
   throw new TypeError('Sunbeam v3 requires the shared WebGPU renderer');
  const device=renderer.device;
  const module=source||root.SunbeamAstraCleanV3||(typeof require==='function'?require('./webgpu-sunbeam-astra-clean-v3.js'):null);
  if(!module?.WGSL||typeof module.createSound!=='function')throw new TypeError('Accepted Sunbeam v3 source is unavailable');
  if(module.WGSL!==WGSL)throw new Error('Adapter shader does not match accepted Sunbeam v3 source');
  let destroyed=false,generation=0,nextToken=0,lastVisibleToken=0,texture=null,bindPost=null,width=0,height=0;
  const entries=new Map(),cancelled=new Set(),retired=new Set(),errors=[];
  const shader=device.createShaderModule({label:'Sunbeam Astra v3 field',code:WGSL});
  const postShader=device.createShaderModule({label:'Sunbeam Astra v3 OBS1 post',code:POST});
  const fieldPipeline=device.createRenderPipeline({label:'Sunbeam Astra v3 field',layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  const postPipeline=device.createRenderPipeline({label:'Sunbeam Astra v3 OBS1',layout:'auto',vertex:{module:postShader,entryPoint:'vs'},fragment:{module:postShader,entryPoint:'fs',targets:[{format:renderer.format,blend:{color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
  const verifyLocked=new URLSearchParams(root.location?.search||'').has('verify');
  let sound=audio||module.createSound({verify:verifyLocked});
  let currentAudio=null,audioBuffers=null;
  const activeAudio=new Map(),seenAudio=new Set();
  function gatesAllow(meta){
   if(verifyLocked)return false;
   if(!currentAudio)return true;
   try{return ['owner','room','verify','unlock'].every(name=>currentAudio.gates[name](meta)===true);}catch(_){return false;}
  }
  function stopExternal(id=null){
   for(const [key,item] of activeAudio){if(id!==null&&key!==id&&item.effectId!==id)continue;
    try{const now=currentAudio?.context?.currentTime||0;item.gain.gain.cancelScheduledValues(now);item.gain.gain.setTargetAtTime(0,now,.008);item.source.stop(now+.04);}catch(_){}
    try{item.source.disconnect();item.gain.disconnect();}catch(_){}activeAudio.delete(key);
   }
  }
  function acceptExternal(cause){
   if(!currentAudio||!audioBuffers||verifyLocked)return sound?.play?.(cause.eventId,{impactConfirmed:false})||false;
   const {eventId,ownerId,roomId}=cause,consumed=currentAudio.consumedIds;
   if(!eventId||consumed.has(eventId)||seenAudio.has(eventId))return false;
   const meta=Object.freeze({eventId,ownerId,roomId});
   if(!gatesAllow(meta)){consumed.add(eventId);return false;}
   if(activeAudio.size>=4){consumed.add(eventId);return false;}
   seenAudio.add(eventId);consumed.add(eventId);
   const context=currentAudio.context,source=context.createBufferSource(),gain=context.createGain();
   source.buffer=audioBuffers.main;gain.gain.value=currentAudio.volume/Math.sqrt(activeAudio.size+1);
   source.connect(gain);gain.connect(currentAudio.destination);
   source.onended=()=>{try{source.disconnect();gain.disconnect();}catch(_){}activeAudio.delete(eventId);};
   activeAudio.set(eventId,{source,gain,meta,effectId:cause.effectId});source.start();return true;
  }
  function ensureSurface(w,h){
   if(texture&&width===w&&height===h)return;
   texture?.destroy();width=w;height=h;
   texture=device.createTexture({label:'Sunbeam Astra v3 HDR scratch',size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
   bindPost=device.createBindGroup({layout:postPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView()},{binding:1,resource:sampler}]});
  }
  function inputFor(event,viewport,roomId){
   const effect=event?.effect;
   const ownerId=event?.ownerId??event?.playerId;
   if(effect?.type!=='flora-sunbeam'||!effect.sunbeamCausalId||!String(effect.playerId??'')||
      !String(ownerId??'')||String(ownerId)!==String(effect.playerId)||
      !Array.isArray(event.hands)||!event.hands.length||event.hands.length>2||
      !finiteVec(event.camera)||!(event.zoom>0)||!Number.isFinite(event.elapsed)||event.elapsed<0||!roomId)
    throw new TypeError('Sunbeam v3 needs one owned cause, submitted hands and finite game time');
   if(!Number.isInteger(viewport?.pixelWidth)||!Number.isInteger(viewport?.pixelHeight)||
      !(viewport.width>0)||!(viewport.height>0))throw new TypeError('Sunbeam v3 needs the shared logical and backing viewport');
   if(event.cancelled||event.alive===false||event.visible===false||cancelled.has(String(effect.sunbeamCausalId))||cancelled.has(String(effect.id)))return null;
   const age=event.elapsed/1000;
   if(age>=DURATION)return null;
   const dpr=viewport.pixelWidth/viewport.width;
   if(Math.abs(viewport.pixelHeight/viewport.height-dpr)>.02)throw new TypeError('Sunbeam v3 viewport scale is inconsistent');
   const end={x:(effect.targetX-event.camera.x)*event.zoom,y:(effect.targetY-event.camera.y)*event.zoom};
   if(!finiteVec(end))throw new TypeError('Sunbeam v3 effect endpoint is invalid');
   const beams=event.hands.map(hand=>{
    if(!finiteVec(hand))throw new TypeError('Sunbeam v3 submitted hand is invalid');
    return {start:{x:(hand.x-event.camera.x)*event.zoom,y:(hand.y-event.camera.y)*event.zoom},end,age,
      scale:event.zoom,reducedMotion:!!event.reducedMotion,impactConfirmed:false,previewFigure:false};
   });
   return {eventId:String(effect.sunbeamCausalId),effectId:String(effect.id),ownerId:String(ownerId),roomId:String(roomId),beams};
  }
  function record({frame,target,viewport,events=[],roomId,side='front'}={}){
   if(destroyed||typeof frame?.addEncoder!=='function'||!target||!Array.isArray(events)||!['back','front'].includes(side))
    throw new TypeError('Sunbeam v3 needs the active shared frame, complete events and a back/front slot');
   const causes=events.map(event=>inputFor(event,viewport,roomId)).filter(Boolean);
   const ids=causes.map(cause=>cause.eventId);
   if(new Set(ids).size!==ids.length)throw new Error('Sunbeam v3 duplicate cause in one submitted frame');
   const beams=causes.flatMap(cause=>cause.beams);
   if(beams.length>4)throw new RangeError('Sunbeam v3 supports at most four concurrent hands');
   const token=++nextToken,entry={token,generation,side,eventIds:ids,causes,state:'queued',visible:false,gate:null,settle:null};
   entry.completion=new Promise(resolve=>entry.settle=resolve);entries.set(token,entry);
   frame.addEncoder({label:`sunbeam-astra-v3-${side}`,reads:[],writes:[target],
    encode(encoder,info){
     if(destroyed||entry.generation!==generation)return;
     const size=info.size(target);
     if(size.width!==viewport.pixelWidth||size.height!==viewport.pixelHeight)throw new Error('Sunbeam v3 shared target changed before encode');
     const activeCauses=causes.filter(cause=>!cancelled.has(cause.eventId)&&!cancelled.has(cause.effectId));
     const activeBeams=activeCauses.flatMap(cause=>cause.beams);
     if(!activeBeams.length){entry.state='recorded';return;}
     ensureSurface(size.width,size.height);
     const data=new Float32Array(52);data.set([viewport.width,viewport.height,size.width/viewport.width,activeBeams.length]);
     activeBeams.forEach((beam,i)=>data.set([beam.start.x,beam.start.y,beam.end.x,beam.end.y,beam.age,beam.scale,beam.reducedMotion?1:0,1,0,0,0,0],4+i*12));
     const buffer=device.createBuffer({label:`Sunbeam v3 frame ${token}`,size:208,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
     entry.buffer=buffer;device.queue.writeBuffer(buffer,0,data);
     const bind=device.createBindGroup({layout:fieldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
     let pass=encoder.beginRenderPass({colorAttachments:[{view:texture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
     pass.setPipeline(fieldPipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
     pass=encoder.beginRenderPass({colorAttachments:[{view:info.view(target),loadOp:'load',storeOp:'store'}]});
     pass.setPipeline(postPipeline);pass.setBindGroup(0,bindPost);pass.draw(3);pass.end();entry.state='recorded';
    },
    onSubmitted(proof){entry.state='submitted';void Promise.all([proof?.validation,proof?.done]).then(()=>{
      entry.buffer?.destroy();entry.buffer=null;entry.state='activated';entry.settle();acceptIfVisible(entry);
     },error=>{entry.buffer?.destroy();entry.buffer=null;entry.state='failed';entries.delete(token);entry.settle();sound?.stopAll?.();errors.push(error);});},
    onProofError({error}){entry.state='failed';entry.settle();entries.delete(token);entry.buffer?.destroy();entry.buffer=null;sound?.stopAll?.();errors.push(error);},
    onAbandon(){entry.state='abandoned';entry.settle();entries.delete(token);entry.buffer?.destroy();entry.buffer=null;}
   });
   return Object.freeze({token,eventIds:Object.freeze(ids),generation,side});
  }
  function acceptIfVisible(entry){
   if(!entry.visible||entry.state!=='activated')return;
   entries.delete(entry.token);let allowed=false;try{allowed=entry.gate?.()===true;}catch(_){}
   if(destroyed||entry.generation!==generation||entry.token<lastVisibleToken||!allowed){for(const cause of entry.causes){sound?.cancel?.(cause.eventId);stopExternal(cause.eventId);currentAudio?.consumedIds?.add(cause.eventId);}return;}
   for(const cause of entry.causes)acceptExternal(cause);
  }
  function commitVisibleFrame(token,gate){
   if(!Number.isSafeInteger(token)||token<=0||typeof gate!=='function'||!entries.has(token)||token<lastVisibleToken)return false;
   lastVisibleToken=token;const entry=entries.get(token);entry.visible=true;let allowed=false;try{allowed=gate()===true;}catch(_){}
   entry.gate=allowed?gate:()=>false;if(!allowed)for(const cause of entry.causes){sound?.cancel?.(cause.eventId);stopExternal(cause.eventId);currentAudio?.consumedIds?.add(cause.eventId);}
   acceptIfVisible(entry);for(const [oldToken,old] of entries)if(oldToken<token&&old.state==='activated')entries.delete(oldToken);return true;
  }
  function cancel(effectId){const id=String(effectId??'');if(!id)return false;cancelled.add(id);if(cancelled.size>512)cancelled.delete(cancelled.values().next().value);sound?.cancel?.(id);stopExternal(id);for(const entry of entries.values())if(entry.causes.some(cause=>cause.eventId===id||cause.effectId===id)){entry.gate=()=>false;for(const cause of entry.causes)if(cause.eventId===id||cause.effectId===id){sound?.cancel?.(cause.eventId);stopExternal(cause.eventId);}}return true;}
  async function configureAudio(nextAudio){
   if(destroyed)throw new Error('Sunbeam v3 adapter destroyed');
   if(verifyLocked)return false;
   const {context,destination=context?.destination,consumedIds,gates,volume=.8}=nextAudio||{};
   if(!context||!destination||!(consumedIds instanceof Set)||!Number.isFinite(volume)||volume<0||volume>1||
      !['owner','room','verify','unlock'].every(name=>typeof gates?.[name]==='function'))
    throw new TypeError('Sunbeam v3 audio requires shared context, destination, consumed IDs and four gates');
   const main=context.createBuffer(1,Math.ceil(DURATION*context.sampleRate),context.sampleRate);
   main.copyToChannel(module.synthesize(context.sampleRate,false),0);
   const impact=context.createBuffer(1,Math.ceil(DURATION*context.sampleRate),context.sampleRate);
   impact.copyToChannel(module.synthesize(context.sampleRate,true),0);
   stopExternal();sound?.stopAll?.();await sound?.dispose?.();sound=null;
   currentAudio={context,destination,consumedIds,gates,volume};audioBuffers={main,impact};return true;
  }
  function refreshAudioGates(){for(const [id,item] of activeAudio)if(!gatesAllow(item.meta))stopExternal(id);}
  function stopAudio(){sound?.stopAll?.();stopExternal();}
  function setGeneration(value){if(!Number.isSafeInteger(value)||value<=generation)throw new RangeError('Sunbeam v3 generation must increase');generation=value;stopAudio();return generation;}
  async function destroy(){if(destroyed)return;destroyed=true;generation++;stopAudio();for(const entry of entries.values()){entry.gate=()=>false;entry.buffer?.destroy();entry.settle();}entries.clear();texture?.destroy();texture=null;await sound?.dispose?.();}
  return Object.freeze({device,version:VERSION,record,commitVisibleFrame,cancel,setGeneration,
   configureAudio,refreshAudioGates,unlockAudio:()=>currentAudio?Promise.resolve(currentAudio.context.state==='running'):sound?.unlock?.()??Promise.resolve(false),stopAudio,
   get soundLocked(){return verifyLocked||(!currentAudio&&sound?.locked===true);},get errors(){return errors.slice();},destroy});
 }
 const api=Object.freeze({create,VERSION,DURATION,WGSL,POST});
 root.DvaSunbeamAstraV3GameAdapter=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
