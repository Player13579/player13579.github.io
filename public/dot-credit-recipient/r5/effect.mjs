// DVA gallery-only, dot: situated credits settlement / one outline confirmation. No gameplay or amount inference.
export const VERSION_ID='dot-credit-recipient-r5';
export const DURATION_MS=1800,SFX_OFFSET_MS=0,SFX_DURATION_MS=660,UNIFORM_FLOATS=12;
export const EDITION=5,EDITION_LIMIT=5;
const finite=Number.isFinite, cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<345?'arrival':ageMs<538?'seating':ageMs<1120?'settlement':'resolve';
}
export function planSource(event,serverNow){
 const off=reason=>({valid:false,active:false,phase:'off',reason,causalId:null,ageMs:0,originKnown:false,direction:[0,0]});
 if(!event||event.type!=='transfer-in'||event.variant!=='credits'||event.acquisitionKind!=='credits')return off('not-credit-recipient');
 if(typeof event.id!=='string'||!/^magic_.{1,174}$/.test(event.id)||typeof event.playerId!=='string'||!event.playerId)return off('missing-cause-owner');
 if(![event.x,event.y,event.at,serverNow].every(finite)||event.at<946684800000||serverNow<946684800000||event.durationMs!==DURATION_MS)return off('invalid-event-clock');
 if(event.at-serverNow>125)return off('future-receipt');
 const {targetX, targetY, acquisitionOriginX, acquisitionOriginY}=event;
 const revealed=[targetX,targetY,acquisitionOriginX,acquisitionOriginY].every(finite)&&targetX===acquisitionOriginX&&targetY===acquisitionOriginY;
 const dx=revealed?targetX-event.x:0,dy=revealed?targetY-event.y:0;
 const d=Math.hypot(dx,dy),originKnown=revealed&&finite(d)&&d>=.25;
 const ageMs=serverNow-event.at,phase=phaseAt(ageMs);
 return {valid:true,active:phase!=='off',phase,reason:null,causalId:'credit-recipient:'+event.id,ageMs,originKnown,direction:originKnown?[dx/d,dy/d]:[0,0],startedAt:event.at,endsAt:event.at+DURATION_MS};
}
export function frameState({width,height,dpr=1,event,serverNow,actorCenterCss,actorHeightCss=64,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}={}){
 if(![width,height,dpr,actorHeightCss].every(finite)||width<1||width>32768||height<1||height>32768||dpr<=0||dpr>8||actorHeightCss<8||actorHeightCss>2048||!Array.isArray(actorCenterCss)||actorCenterCss.length!==2||!actorCenterCss.every(finite))throw RangeError('viewport and actor fixture');
 const source=planSource(event,serverNow), active=source.active&&sourceOn!==false&&mainOn!==false;
 const flags=(showActor!==false?1:0)+(observerOn!==false?2:0)+(reducedMotion?4:0)+(source.originKnown?8:0);
 const uniforms=new Float32Array([width,height,dpr,Math.max(0,Math.min(1.8,source.ageMs*.001)),...actorCenterCss,actorHeightCss,flags,...source.direction,+active,0]);
 if(![...uniforms].every(finite))throw RangeError('uniform overflow');
 return {uniforms,source,active,phase:active?source.phase:'off'};
}
export const WGSL="struct Params { view:vec4f, actor:vec4f, receipt:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn fringe(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn contactFlash(t:f32)->f32{\n let d=t-.318;\n return smoothstep(-.007,.017,d)*(1.-smoothstep(.035,.130,d));\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let px=f.pos.xy/u.view.z;\n let flags=u32(u.actor.w);\n let t=u.view.w;\n var col=vec4f(0.);\n if(u.receipt.z>.5){\n  let reduceMotion=(flags&4u)!=0u;\n  let showOrigin=(flags&8u)!=0u&&!reduceMotion;\n  let raw=select(vec2f(0.),u.receipt.xy,showOrigin);\n  let turn=select(1.,-1.,raw.x<0.);\n  let anchor=u.actor.xy+u.actor.z*vec2f(turn*(ACTOR_ASPECT*.5+.178),.181);\n  let q=(px-anchor)*64./u.actor.z*vec2f(turn,1.);\n  let aa=clamp(.68*64./u.actor.z,.31,2.15);\n  // All world ink is outside the actor rectangle. Lifetime of the event\n  // is 1.8 s, with its physical-looking response deliberately much shorter.\n  if(q.x>=-10.8&&q.x<66.&&q.y>=-40.&&q.y<=24.&&t<1.065){\n   let obs=(flags&2u)!=0u;\n   let press=contactFlash(t);\n   let warm=vec3f(.96,.48,.12);\n   let amber=vec3f(1.,.744,.30);\n   let hot=vec3f(1.,.917,.65);\n   let cold=vec3f(.082,.64,.625);\n   let teal=vec3f(.22,.92,.78);\n   let pale=vec3f(.74,.988,.91);\n   let z=smoothstep(.023,.319,t);\n   // One incoming short beamlet. Center approaches a receiver-local\n   // waist point, not the actual origin, packet distance or an item flight.\n   let l=(1.-z)*(24.+17.*abs(raw.x));\n   let arc=sin(z*3.14159265);\n   let center=select(vec2f(0.,0.),vec2f(l,(1.-z)*raw.y*15.+arc*4.2),showOrigin);\n   let d=q-center;\n   let slope=select(.12,.36*raw.y+.31*arc,showOrigin);\n   let direction=normalize(vec2f(1.,slope));\n   let right=vec2f(-direction.y,direction.x);\n   let k=vec2f(dot(d,direction),dot(d,right));\n   let n=select(4.2,(4.1+7.8*(1.-z)),showOrigin);\n   let axial=sat((k.x+2.8)/max(2.,n+2.8));\n   let width=(1.43-axial*.98)*(1.-.24*z);\n   let curve=k.y+.23*k.x*k.x/max(n*n,4.);\n   let mask=fill(max(max(-3.9-k.x,k.x-n),abs(curve)-width),aa);\n   let lineGlow=fringe(curve,.44,aa*.62)*(1.-sat(axial*.92))*mask;\n   let gate=smoothstep(-.012,.091,t)*(1.-smoothstep(.318,.391,t));\n   let wire=mix(warm,amber,.57+.36*(1.-axial));\n   let glow=fill(abs(curve)-(width+2.1),aa*1.39)*fill(max(-3.1-k.x,k.x-n),aa);\n   col=over(ink(warm,glow*gate*.14),col);\n   col=over(ink(wire,mask*gate*(.96-.40*axial)),col);\n   col=over(ink(hot,lineGlow*gate),col);\n\n   // A paired event, not a second transfer. At contact a cool sliver\n   // follows the recipient-side outline from waist to shoulder just once.\n   // The interior contour stays clean; this is attached light, not a device.\n   let height=27.5;\n   let v=sat(-q.y/height);\n   let onset=select(.318,.335,reduceMotion);\n   let rise=smoothstep(onset,.705,t);\n   let head=select(rise,.69,reduceMotion);\n   let hold=smoothstep(onset,.388,t)*(1.-smoothstep(.684,1.065,t));\n   let after=smoothstep(.353,.558,t);\n   let curveX=-.6-6.0*sin(v*2.46)+4.4*v*v;\n   let cross=q.x-curveX;\n   let start=(1.-smoothstep(.713,.94,t))*smoothstep(-.08,.13,v);\n   let headWidth=.078+.045*press;\n   let radiance=1.-smoothstep(headWidth,.194,abs(v-head));\n   let bodyWidth=.37+2.29*sin(v*3.14159265)*(.63+.37*radiance);\n   let foot=smoothstep(.070,.27,head)+(1.-smoothstep(.02,.125,head))*.6;\n   let painted=(1.-smoothstep(head+.035,head+.14,v))*foot;\n   let ends=smoothstep(-1.8,.9,-q.y)*(1.-smoothstep(24.4,28.7,-q.y));\n   let skin=fill(abs(cross)-bodyWidth,aa)*ends*painted;\n   let heart=fringe(cross-.27*bodyWidth,.36,aa*.67)*ends*painted;\n   let skinTone=mix(cold,mix(teal,pale,.38*after),.51+.43*radiance);\n   let tint=hold*start;\n   let edgeWash=fill(abs(cross)-(bodyWidth+2.5),aa*1.6)*ends*painted;\n   col=over(ink(cold,edgeWash*tint*(.125+.186*radiance)),col);\n   col=over(ink(skinTone,skin*tint*(.58+.41*radiance)),col);\n   col=over(ink(mix(teal,pale,.74*radiance),heart*tint*(.55+.41*radiance)),col);\n   let pore=1.-smoothstep(6.,39.,dot(q*vec2f(.99,1.56),q*vec2f(.99,1.56)));\n   col=over(ink(mix(hot,pale,after),pore*press*.79),col);\n   if(obs){\n    let plume=1.-smoothstep(12.,86.,dot(q*vec2f(.87,1.22),q*vec2f(.87,1.22)));\n    col=over(ink(mix(amber,teal,after),plume*press*.17),col);\n   }\n  }\n }\n let uv=(px-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((flags&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let x=textureSampleLevel(tex,samp,uv,0.);\n  col=over(ink(decode(x.rgb),x.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const len=Math.ceil(sampleRate*SFX_DURATION_MS*.001),out=new Float32Array(len),TAU=2*Math.PI;
 const lowCut=1.-Math.exp(-TAU*470/sampleRate),bodyCut=1.-Math.exp(-TAU*1380/sampleRate),highCut=1.-Math.exp(-TAU*2960/sampleRate);
 const dc=Math.exp(-TAU*65/sampleRate);
 // One confirmation only: a light sliding whisper meets a damped bronze
 // leaf. The different nearby modes belong to one concurrent resonator.
 const tones=[[511,.43,30.7],[788,.25,47.3],[1214,.11,67.8],[1771,.065,90.4],[2656,.031,113.]];
 let rng=0xf4623971,low=0,mid=0,hi=0,prevIn=0,prevOut=0;
 for(let i=0;i<len;i++){
  const t=i/sampleRate;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
  const n=(rng>>>0)/2147483648-1;low+=(n-low)*lowCut;mid+=(n-mid)*bodyCut;hi+=(n-hi)*highCut;
  const air=(hi-mid)*1.22,brush=(mid-low)*1.32;
  const lead=cap((t-.033)/.092)*(1.-cap((t-.246)/.072));
  let s=lead*(.077*brush+.054*air)*(.66+.34*Math.sin(Math.PI*t/.318));
  const u=t-.318;
  if(u>=0.){
   const begin=1.-Math.exp(-u*1280);
   const knock=begin*Math.exp(-u*166.0);
   let resonance=0.;
   for(const [f,g,lose] of tones)resonance+=Math.sin(TAU*f*u)*g*Math.exp(-u*lose);
   s+=knock*(.39*brush+.55*air)+resonance*begin*.83;
  }
  const gain=.76*Math.tanh(s*1.16);
  const k=dc*(prevOut+gain-prevIn);prevIn=gain;prevOut=k;
  const fall=cap((len-1-i)/(sampleRate*.072));out[i]=k*fall*fall*(3-2*fall);
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
