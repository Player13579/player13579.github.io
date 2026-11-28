// DVA gallery-only: zero-durability shield failure, one connected protective hood subsides in height.
export const VERSION_ID='dot-barrier-durability-break-r5';
export const DURATION_MS=480,SFX_OFFSET_MS=0,SFX_DURATION_MS=450,UNIFORM_FLOATS=12;
export const EDITION=5,EDITION_LIMIT=5;
const finite=Number.isFinite,cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<120?'preload':ageMs<382?'failure':'clear';
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
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\n\n\n\n\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let bits=u32(u.actor.w);\n let t=u.view.w;\n let on=u.state.z>.5;\n let reduce=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let q=(p-u.actor.xy)*64./u.actor.z;\n let aa=clamp(.76*64./u.actor.z,.28,2.20);\n let inkSea=vec3f(.027,.090,.132);\n let midSea=vec3f(.137,.440,.555);\n let tint=vec3f(.151,.618,.740);\n let rim=vec3f(.518,.914,.967);\n let ice=vec3f(.792,1.000,.965);\n var col=vec4f(0.);\n var reflected=0.;\n if(on&&t<.438&&abs(q.x)<52.&&q.y>-48.&&q.y<40.){\n   // One continuous roof behind the neutral actor. The ground contact\n   // is fixed. It loses height without folding, splitting, or throwing pieces.\n   let floor=31.;\n   let rise=smoothstep(.006,.047,t);\n   let loss=smoothstep(.103,.324,t);\n   let release=1.-smoothstep(.262,.411,t);\n   let span=select(mix(43.8,39.8,loss),43.8,reduce);\n   let overallHeight=select(mix(70.5,6.8,loss),62.5,reduce);\n   let v=q.x/span;\n   let bow=clamp(abs(v),0.,1.06);\n   let crown=floor-overallHeight+overallHeight*.255*pow(bow,3.8);\n   let bottom=floor-.084*overallHeight*pow(bow,1.8);\n   let side=abs(q.x)-span+.11*max(0.,q.y-(floor-.35*overallHeight));\n   let shape=max(max(side,crown-q.y),q.y-bottom);\n   let pane=fill(shape,aa);\n   let rel=clamp((q.y-crown)/max(4.,overallHeight),0.,1.);\n   let breakFlow=smoothstep(.092,.141,t)*(1.-smoothstep(.180,.338,t));\n   let flanks=smoothstep(.28,.92,bow);\n   let whole=rise*release;\n   // Full-screen light is not a proxy for the indivisible surface.\n   // Pigment and increased luminance are integrated in the roof itself.\n   let top=exp(-rel*4.65);\n   let fall=1.-.78*smoothstep(.47,1.,rel);\n   let mid=mix(inkSea,midSea,.44+.32*flanks+.22*top);\n   let bulk=mix(mid,tint,breakFlow*(.20+.36*top)*fall);\n   let darkEdge=(1.-smoothstep(.25,2.50,abs(shape+.39)))*whole;\n   col=over(ink(inkSea,darkEdge*.78),col);\n   col=over(ink(bulk,pane*whole*(.25+.28*flanks+.14*top+.09*breakFlow)),col);\n   let spine=exp(-abs(q.y-crown-.052*overallHeight)/2.28)*pane;\n   let litBody=spine*(.22+.51*breakFlow)*whole;\n   col=over(ink(mix(rim,ice,.49*breakFlow),litBody*(.65+.35*flanks)),col);\n   let sideRef=line(side+.43,.51,aa)*pane*whole*(.29+.34*fall);\n   col=over(ink(rim,sideRef),col);\n   // Only the nearby floor return and body-side contact respond to the roof.\n   let footShade=exp(-.21*(q.y-bottom)*(q.y-bottom))*(1.-smoothstep(.53,1.01,bow));\n   reflected=whole*breakFlow*.21;\n   col=over(ink(tint,footShade*whole*(.08+.12*breakFlow)),col);\n   if(obs){\n     let near=exp(-.091*(q.y-crown)*(q.y-crown))*(1.-smoothstep(.80,1.04,bow));\n     col=over(ink(rim,near*breakFlow*whole*.19),col);\n   }\n }\n let uvActor=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uvActor>=vec2f(0.))&&all(uvActor<=vec2f(1.))){\n  let c=textureSampleLevel(tex,samp,uvActor,0.);\n  var rgb=decode(c.rgb);\n  let low=smoothstep(.57,.76,uvActor.y);\n  let side=smoothstep(.19,.40,abs(uvActor.x-.50));\n  rgb=min(vec3f(1.),rgb+vec3f(.25,.66,.79)*reflected*low*side);\n\n  col=over(ink(rgb,c.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";

export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),tau=2*Math.PI;
 const lp=1-Math.exp(-tau*380/sampleRate),hp=1-Math.exp(-tau*1590/sampleRate),dc=Math.exp(-tau*40/sampleRate);
 let rng=0x83c2ab31,low=0,high=0,prev=0,last=0;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
  const x=(rng>>>0)/2147483648-1;low+=(x-low)*lp;high+=(x-high)*hp;
  const rise=cap((t-.031)/.018)*(1.-cap((t-.091)/.030));
  let signal=.064*rise*Math.sin(tau*(383*t-123*t*t));
  const u=t-.121;
  if(u>=0){
   const inw=1.-Math.exp(-u*236);
   const airy=(high-low)*3.2*.123*inw*Math.exp(-u*23.4);
   const weight=1.-Math.exp(-u*810);
   const tone=.33*Math.sin(tau*(279*u-624*u*u))*inw*Math.exp(-u*18.7);
   const split=.069*Math.sin(tau*(568*u-539*u*u))*weight*Math.exp(-u*58);
   signal+=tone+split+airy;
  }
  const clip=.61*Math.tanh(signal*1.18),smooth=dc*(last+clip-prev);last=smooth;prev=clip;
  const f=cap((out.length-1-i)/(sampleRate*.060));out[i]=smooth*f*f*(3.-2.*f);
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
