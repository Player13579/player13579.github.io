// DVA gallery-only: zero-durability shield failure, single elastic non-enclosing near membrane collapse without debris.
export const VERSION_ID='dot-barrier-durability-break-r2';
export const DURATION_MS=480,SFX_OFFSET_MS=0,SFX_DURATION_MS=450,UNIFORM_FLOATS=12;
export const EDITION=2,EDITION_LIMIT=5;
const finite=Number.isFinite,cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<184?'preload':ageMs<396?'failure':'clear';
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
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\n\n\n\n@fragment fn fs(f:Out)->@location(0) vec4f {\n let p=f.pos.xy/u.view.z;\n let bits=u32(u.actor.w);\n let t=u.view.w;\n let on=u.state.z>.5;\n let gentle=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let q=(p-u.actor.xy)*64./u.actor.z;\n let aa=clamp(.76*64./u.actor.z,.28,2.20);\n let burgundy=vec3f(.365,.115,.283);\n let violet=vec3f(.426,.217,.646);\n let blush=vec3f(.902,.457,.613);\n let pearl=vec3f(1.,.865,.812);\n let mint=vec3f(.516,.937,.868);\n let load=smoothstep(.021,.179,t);\n let collapse=smoothstep(.151,.253,t);\n let pulse=smoothstep(-.026,.005,t-.184)*(1.-smoothstep(.024,.106,t-.184));\n let quiet=1.-smoothstep(.238,.389,t);\n var col=vec4f(0.);\n if(on&&t<.402&&q.x>-7.&&q.x<45.&&q.y>-41.&&q.y<41.){\n   // One non-enclosing membrane, folded back on itself, positioned beside\n   // the protected body. The second material face is the other side of it.\n   let sv=select(collapse,smoothstep(.165,.208,t)*.74,gentle);\n   let pp=vec2f(q.x+4.2,(q.y+1.7)*.94);\n   let theta=atan2(pp.y,pp.x+.00003);\n   let radius=length(pp);\n   let h=theta+.17-.16*sv;\n   let maxAngle=1.32-.99*sv;\n   let endFade=1.-smoothstep(maxAngle-.14,maxAngle+.032,abs(h));\n   let local=clamp(h/maxAngle,-1.,1.);\n   let pinch=exp(-4.4*local*local);\n   let elasticity=select(load,load*.55,gentle);\n   let center=36.4+2.7*local-3.8*elasticity*pinch-8.9*sv+sin(local*2.55)*1.3;\n   let ridgeDist=radius-center;\n   let taper=pow(sat(1.-local*local),.57);\n   let openGate=smoothstep(-.009,.039,t);\n   let thickness=max(.22,taper*(5.4-3.7*sv)*(.96+.42*elasticity));\n   let faceA=fill(abs(ridgeDist+thickness*.29)-thickness*.65,aa)*endFade;\n   let faceB=fill(abs(ridgeDist-thickness*.54)-thickness*.56,aa)*endFade;\n   let notchWidth=.042+.11*pulse;\n   let fault=1.-smoothstep(notchWidth,notchWidth+.071,abs(h-(.24-.11*load)));\n   let crease=1.-smoothstep(.28,1.33,abs(ridgeDist-thickness*.03));\n   let fresnel=pow(sat(.49+.36*local+.22*elasticity),1.7);\n   let retained=openGate*quiet*(1.-fault*collapse*.76);\n   col=over(ink(mix(burgundy,violet,.35+.39*local),faceB*retained*.69),col);\n   col=over(ink(mix(blush,mint,fresnel*.58),faceA*retained*(.35+.43*fresnel)),col);\n   let woven=(.37+.52*fresnel+.24*elasticity)*retained;\n   col=over(ink(mix(blush,pearl,.44+.52*pulse),crease*endFade*min(1.,woven)),col);\n   let contact=1.-smoothstep(.045,.28,abs(h-(.24-.11*load)));\n   let vein=line(ridgeDist+thickness*.37,.26,.90*aa)*endFade*contact;\n   col=over(ink(pearl,vein*pulse*.91*quiet),col);\n   if(obs){\n    // Hinge emission at its only high-energy moment; optional image spread\n    // has no causal role and lies in the immediate vicinity of that hinge.\n    let bloom=exp(-.084*ridgeDist*ridgeDist-14.*pow(abs(h-.14),2.));\n    col=over(ink(mix(pearl,blush,.46),bloom*pulse*quiet*.26),col);\n   }\n }\n let uvActor=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uvActor>=vec2f(0.))&&all(uvActor<=vec2f(1.))){\n  let c=textureSampleLevel(tex,samp,uvActor,0.);\n  var rgb=decode(c.rgb);\n  if(on){\n   let lit=smoothstep(.60,.96,uvActor.x)*(1.-smoothstep(.12,.43,abs(uvActor.y-.57)));\n   rgb=min(vec3f(1.),rgb+mix(blush,pearl,.57)*lit*pulse*.20);\n  }\n  col=over(ink(rgb,c.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";

export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),tau=2*Math.PI;
 const l=1-Math.exp(-tau*510/sampleRate),m=1-Math.exp(-tau*1410/sampleRate),h=1-Math.exp(-tau*3670/sampleRate);
 const dc=Math.exp(-tau*53/sampleRate);
 let rng=0x549ecfa1,lo=0,mid=0,hi=0,prevX=0,prevY=0;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;
  rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
  const n=(rng>>>0)/2147483648-1;
  lo+=(n-lo)*l;mid+=(n-mid)*m;hi+=(n-hi)*h;
  const grain=(mid-lo)*2.47,air=(hi-mid)*1.72;
  const u=t-.184;
  const pressure=cap((t-.047)/.094)*(1.-cap((t-.167)/.015));
  let raw=(.064*grain+.053*air)*pressure;
  if(u>=0){
   const close=1.-Math.exp(-u*1630);
   const glint=close*Math.exp(-u*204),ring=close*Math.exp(-u*59);
   const hush=(1.-Math.exp(-u*41))*Math.exp(-u*30);
   raw+=glint*(.39*grain+.61*air)+hush*(.111*grain+.087*air);
   raw+=ring*(.36*Math.sin(tau*(408*u-336*u*u))+.18*Math.sin(tau*(651*u-504*u*u)));
  }
  const x=.83*Math.tanh(raw*1.31),y=dc*(prevY+x-prevX);prevY=y;prevX=x;
  const fade=cap((out.length-1-i)/(sampleRate*.056));out[i]=y*fade*fade*(3-2*fade);
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
