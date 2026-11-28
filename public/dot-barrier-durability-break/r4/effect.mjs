// DVA gallery-only: zero-durability shield failure, single planar protection face quenches from one boundary without debris.
export const VERSION_ID='dot-barrier-durability-break-r4';
export const DURATION_MS=480,SFX_OFFSET_MS=0,SFX_DURATION_MS=450,UNIFORM_FLOATS=12;
export const EDITION=4,EDITION_LIMIT=5;
const finite=Number.isFinite,cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<114?'preload':ageMs<381?'failure':'clear';
}

export function planSource(event,serverNow,actorId,viewerId){
 const fail=reason=>({valid:false,active:false,phase:'off',reason,causalId:null,ageMs:0});
 if(!event||event.type!=='preparation-barrier-hit'||event.variant!=='durability-broken')return fail('not-durability-break');
 if(typeof event.id!=='string'||!/^magic_.{1,174}$/.test(event.id)||typeof event.playerId!=='string'||!event.playerId)return fail('missing-authority');
 if(typeof actorId!=='string'||actorId!==event.playerId)return fail('not-affected-actor');
 if(viewerId!==event.playerId)return fail('not-self-view');
 if(![event.x,event.y,event.at,serverNow].every(finite)||event.at<946684800000||serverNow<946684800000||event.durationMs!==480||event.radius!==110)return fail('invalid-break-shape');
 if(event.at-serverNow>125)return fail('future-event');
 const ageMs=serverNow-event.at,phase=phaseAt(ageMs);
 return {valid:true,active:phase!=='off',phase,reason:null,causalId:'barrier-durability-break:'+event.id,ageMs,startedAt:event.at,endsAt:event.at+DURATION_MS};
}
export function frameState({width,height,dpr=1,event,serverNow,actorId,viewerId,actorCenterCss,actorHeightCss=64,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}={}){
 if(![width,height,dpr,actorHeightCss].every(finite)||width<1||width>32768||height<1||height>32768||dpr<=0||dpr>8||actorHeightCss<8||actorHeightCss>2048||!Array.isArray(actorCenterCss)||actorCenterCss.length!==2||!actorCenterCss.every(finite))throw RangeError('viewport and actor fixture');
 const source=planSource(event,serverNow,actorId,viewerId),active=source.active&&sourceOn!==false&&mainOn!==false;
 const flags=(showActor!==false?1:0)+(observerOn!==false?2:0)+(reducedMotion?4:0);
 const uniforms=new Float32Array([width,height,dpr,Math.max(0,Math.min(.48,source.ageMs*.001)),...actorCenterCss,actorHeightCss,flags,0,0,+active,0]);
 if(![...uniforms].every(finite))throw RangeError('uniform overflow');
 return {uniforms,source,active,phase:active?source.phase:'off'};
}
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\n\n\n\n\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let bits=u32(u.actor.w);\n let t=u.view.w;\n let on=u.state.z>.5;\n let reduce=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let q=(p-u.actor.xy)*64./u.actor.z;\n let aa=clamp(.76*64./u.actor.z,.28,2.20);\n let slate=vec3f(.029,.082,.089);\n let teal=vec3f(.127,.415,.399);\n let edgeColor=vec3f(.395,.686,.628);\n let gold=vec3f(.99,.704,.274);\n let soap=vec3f(.991,.928,.723);\n var col=vec4f(0.);\n if(on&&t<.426&&abs(q.x)<53.&&abs(q.y)<42.){\n   // The panel is stationary. A diagonal profile erases from the outer boundary,\n   // with no hole, bend, thrown fragments, directional stencil or actor contact.\n   let z=q-vec2f(4.1,-2.4);\n   let p0=vec2f(dot(z,vec2f(.978,.209)),dot(z,vec2f(-.209,.978)));\n   let x=p0.x+.039*p0.y*p0.y/max(1.,abs(p0.y));\n   let y=p0.y;\n   let shape=max(max(abs(x)-38.5,abs(y)-25.5),(abs(x)+abs(y)-52.6)*.707);\n   let panel=fill(shape,aa);\n   let lineCoord=x+.52*y+.69*sin(y*.196)+.27*sin(y*.58);\n   let travel=smoothstep(.066,.337,t);\n   let front=select(mix(-58.,57.,travel),-7.7,reduce);\n   let erase=select(1.,smoothstep(.081,.177,t),reduce);\n   let boundary=lineCoord-front;\n   let live=mix(1.,fill(-boundary,aa),erase);\n   let envelope=smoothstep(.004,.040,t)*(1.-smoothstep(.237,.419,t));\n   let tint=mix(slate,teal,.42+.27*smoothstep(-21.,16.,-y)+.17*smoothstep(2.,35.,x));\n   let nearStroke=(1.-smoothstep(.1,2.55,abs(shape+.18)))*live;\n   let sideSpec=.33+.67*smoothstep(3.,34.,abs(x));\n   col=over(ink(tint,panel*live*envelope*(.40+.13*sideSpec)),col);\n   col=over(ink(slate,nearStroke*envelope*.72),col);\n   col=over(ink(edgeColor,line(shape+.45,.54,aa)*envelope*live*sideSpec*.72),col);\n   // A tight side-lit ridge only inside the part that is still present.\n   let peak=smoothstep(.081,.147,t)*(1.-smoothstep(.238,.341,t));\n   let ridge=line(boundary-1.06,.50,aa)*panel*peak;\n   let shadow=line(boundary-3.56,.94,aa)*panel*peak;\n   let dither=.65+.35*cos(y*.17+1.7);\n   col=over(ink(slate,shadow*.62),col);\n   col=over(ink(mix(gold,soap,dither*.78),ridge*(.64+.31*dither)),col);\n   if(obs){\n     let halo=exp(-.32*boundary*boundary)*panel;\n     col=over(ink(gold,halo*peak*.18),col);\n   }\n }\n let uvActor=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uvActor>=vec2f(0.))&&all(uvActor<=vec2f(1.))){\n  let c=textureSampleLevel(tex,samp,uvActor,0.);\n  var rgb=decode(c.rgb);\n\n  col=over(ink(rgb,c.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";

export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),tau=2*Math.PI;
 const a=1-Math.exp(-tau*440/sampleRate),b=1-Math.exp(-tau*1850/sampleRate),dc=Math.exp(-tau*40/sampleRate);
 let rng=0x1bba34f5,lo=0,hi=0,prevX=0,prevY=0;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
  const x=(rng>>>0)/2147483648-1;lo+=(x-lo)*a;hi+=(x-hi)*b;
  const u=t-.116;
  const on=cap((t-.026)/.017)*(1.-cap((t-.078)/.038));
  let raw=.068*on*Math.sin(tau*(306*t+180*t*t));
  if(u>=0){
   const grit=(hi-lo)*3.8;
   const contact=(1.-Math.exp(-u*1200))*Math.exp(-u*95);
   const loss=(1.-Math.exp(-u*92))*Math.exp(-u*20);
   const hiss=(1.-Math.exp(-u*52))*Math.exp(-u*16);
   raw+=contact*(.38*grit+.095*Math.sin(tau*840*u));
   raw+=hiss*.24*grit+loss*.214*Math.sin(tau*(242*u-233*u*u));
  }
  const y=.57*Math.tanh(raw*1.28),z=dc*(prevY+y-prevX);prevY=z;prevX=y;
  const fade=cap((out.length-1-i)/(sampleRate*.058));out[i]=z*fade*fade*(3-2*fade);
 }
 return out;
}
export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture||!finite(actorAspect)||actorAspect<=0)throw TypeError('device/texture/aspect');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))throw RangeError('format');
 const diagnostics={status:'PENDING',messages:[],error:null};
 const shader=device.createShaderModule({code:WGSL,label:VERSION_ID});
 const diagnosticsReady=shader.getCompilationInfo().then(info=>{diagnostics.messages=info.messages.map(m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos}));diagnostics.status=diagnostics.messages.some(m=>m.type==='error')?'ERROR':'COMPLETE';return diagnostics;},e=>{diagnostics.status='ERROR';diagnostics.error=String(e);return diagnostics});
 const buffer=device.createBuffer({size:UNIFORM_FLOATS*4,usage:72,label:VERSION_ID+' uniforms'});
 let pipeline,bind;
 try {
  pipeline=device.createRenderPipeline({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',constants:{ENCODE_TARGET:!format.endsWith('-srgb')&&format!=='rgba16float',ACTOR_ASPECT:actorAspect},targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
  bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},{binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 }catch(e){buffer.destroy();throw e}
 let closed=false,disposal;
 function render(input){
  if(closed)throw Error('disposed');
  if(!input.encoder||!input.view)throw TypeError('encoder/view');
  const s=frameState(input);
  device.queue.writeBuffer(buffer,0,s.uniforms);
  const pass=input.encoder.beginRenderPass({colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});
  pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
  return {passes:1,active:s.active,phase:s.phase,source:s.source,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'};
 }
 function dispose(){if(disposal)return disposal;closed=true;disposal=(async()=>{try{await device.queue.onSubmittedWorkDone()}catch(e){await device.lost}buffer.destroy()})();return disposal}
 return {render,diagnostics,diagnosticsReady,dispose,destroy:dispose};
}
