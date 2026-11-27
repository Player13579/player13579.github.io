// DVA gallery-only, dot: receiver-local credits settlement. No gameplay or amount inference.
export const VERSION_ID='dot-credit-recipient-r1';
export const DURATION_MS=1800,SFX_OFFSET_MS=0,SFX_DURATION_MS=660,UNIFORM_FLOATS=12;
export const EDITION=1,EDITION_LIMIT=5;
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
export const WGSL="struct Params { view:vec4f, actor:vec4f, receipt:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn area(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.3,aa,d);}\nfn border(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn edge(p:vec2f,a:vec2f,b:vec2f,w:f32,aa:f32)->f32{\n let v=b-a;let k=sat(dot(p-a,v)/dot(v,v));\n return 1.-smoothstep(w,w+aa,length(p-a-k*v));\n}\nfn slot(p:vec2f,half:vec2f,r:f32)->f32 {\n let b=abs(p)-(half-vec2f(r));return length(max(b,vec2f(0.)))+min(max(b.x,b.y),0.)-r;\n}\nfn chamfer(p:vec2f,half:vec2f,r:f32)->f32 {\n let b=abs(p);let s=b-half;\n return max(max(s.x,s.y),(s.x+s.y+r)*.707107);\n}\nfn sheet(q:vec2f,scale:vec2f)->f32 {\n let taper=q.y*.15;\n return chamfer(vec2f(q.x-taper,q.y),scale,2.0);\n}\nfn tick(t:f32,on:f32,down:f32)->f32 {\n let x=t-on;return smoothstep(-.011,.020,x)*(1.-smoothstep(.022,down,x));\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;let flags=u32(u.actor.w);\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n let body=(flags&1u)!=0u;\n let aa=clamp(64./u.actor.z*.67,.32,2.2);\n let t=u.view.w;\n let lightEnabled=u.receipt.z>.5;\n let hand=u.actor.xy+vec2f(.425,.135)*u.actor.z;\n let q=(p-hand)*64./u.actor.z;\n var col=vec4f(0.);\n if(body&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let ol=textureSampleLevel(tex,samp,uv,0.);\n  let ph=lightEnabled&&dot(q,q)<323.;\n  let al=select(0.,tick(t,.363,.182)*.21+tick(t,.489,.175)*.16,ph);\n  let near=1.-smoothstep(24.,303.,dot(q,q));\n  col=ink(decode(ol.rgb)+vec3f(.52,.78,.62)*al*near*ol.a,ol.a);\n }\n if(lightEnabled&&abs(q.x)<90.&&abs(q.y)<82.){\n  let show=smoothstep(-.037,.126,t)*(1.-smoothstep(1.11,1.67,t));\n  let together=smoothstep(.32,.493,t);\n  let reduce=(flags&4u)!=0u;\n  let known=(flags&8u)!=0u;\n  // Visible origin supplies only a direction cue in receiver's immediate\n  // space. Withheld coordinates produce the same frame for any omitted source.\n  let v=select(vec2f(0.),u.receipt.xy,known);\n  let launch=select(vec2f(0.,-18.),vec2f(v.x*31.,v.y*22.-7.),known);\n  let stage=smoothstep(.038,.395,t);\n  let n=vec2f(-v.y,v.x);\n  let arc=n*sin(stage*3.14159265)*4.8;\n  let stampW=1.-smoothstep(.387,.526,t);\n  let xPos=select(launch*(1.-stage)+arc,vec2f(0.,-2.),reduce);\n  let turn=select(.25+(v.y*.38-.27)*stage,0.,reduce)*(1.-together);\n  let cs=cos(turn);let ss=sin(turn);\n  let card=q-xPos;\n  let r=vec2f(dot(card,vec2f(cs,ss)),dot(card,vec2f(-ss,cs)));\n  let receive=tick(t,.354,.159);\n  let align=tick(t,.447,.197);\n  let seal=tick(t,.507,.219);\n  let iris=smoothstep(.41,.57,t);\n  // Two solid seat rails appear as the pocket opens. Reversely retracting\n  // arms clamp one planar unnumbered token. There is no ring or floating HUD.\n  let hinge=(1.-smoothstep(.15,.423,t))*2.7;\n  let top=slot(q-vec2f(0.,-3.2-hinge),vec2f(16.4,4.8),3.0);\n  let bot=slot(q-vec2f(0.,4.2+hinge),vec2f(17.2,5.2),2.5);\n  let port=chamfer(q-vec2f(0.,.6),vec2f(15.0,6.4),2.);\n  let hull=area(min(top,bot),aa);\n  let frame=.78*border(bot,.47,aa)+.60*border(top,.47,aa);\n  let frameLamp=clamp(align+seal*.77+receive*.42,0.,1.);\n  let dark=vec3f(.021,.066,.079);\n  let petrol=vec3f(.032,.211,.206);\n  let brass=vec3f(.51,.261,.081);\n  let aqua=vec3f(.27,.96,.72);\n  let amber=vec3f(.92,.54,.18);\n  let hot=vec3f(1.,.81,.44);\n  let lid=mix(petrol,mix(petrol,aqua,.59),frameLamp);\n  let base=mix(dark,petrol,(1.-smoothstep(-5.,7.,-q.y)));\n  col=over(ink(base,hull*show*.96),col);\n  col=over(ink(mix(petrol,dark,.63),area(port,aa)*hull*show*.58),col);\n  col=over(ink(lid,clamp(frame,0.,1.)*show),col);\n  // A single transferred ledger proof. Foil is transparent at one angled\n  // edge, and its gap and short bearing rail are geometry, not a number or icon count.\n  let form=smoothstep(-.009,.094,t);\n  let sweep=smoothstep(.045,.321,t);\n  let cardY=3.+3.75*(1.-together);\n  let paper=sheet(r,vec2f(11.9-3.85*together,cardY));\n  let sideBevel=border(paper,.40,aa*.90);\n  let stroke=area(paper,aa);\n  let aperture=chamfer(r+vec2f(5.8,.2),vec2f(2.4,1.31),.78);\n  let micro=(1.-smoothstep(.38,1.2,abs(r.y+.72)))*smoothstep(-2.2,-.3,r.x)*(1.-smoothstep(4.4,9.1,r.x));\n  let hotFace=smoothstep(-10.,11.,r.x*.68-r.y*.90+6.*sweep);\n  let pap=mix(mix(brass,amber,hotFace),hot,.37+.29*receive);\n  let crease=r.x+r.y*.92+4.-13.5*sweep;\n  let stripe=(1.-smoothstep(.58,2.04,abs(crease)))*stroke;\n  let chip=stroke*(1.-area(aperture,aa*.68));\n  col=over(ink(pap,form*stampW*chip*.94),col);\n  col=over(ink(hot,form*stampW*(sideBevel*.68+stripe*.31)),col);\n  col=over(ink(vec3f(.98,.91,.64),form*stampW*micro*.78*stroke),col);\n  // The proof docks at the throat and the amber light quenches. A continuous\n  // mint seam belongs to the same receiving plane; pin emitters share its contact.\n  let crossbar=edge(q,vec2f(-10.,1.2),vec2f(10.,1.2),.61,aa);\n  let a1=edge(q,vec2f(-11.1,3.35),vec2f(-7.2,3.35),.43,aa);\n  let a2=edge(q,vec2f(7.2,3.35),vec2f(11.1,3.35),.43,aa);\n  let bias=1.-smoothstep(.68,1.23,t);\n  let lamp=(.55*receive+.71*align+.53*seal)*show;\n  col=over(ink(mix(hot,aqua,iris),crossbar*lamp),col);\n  col=over(ink(aqua,(a1+a2)*iris*show*(.41+.40*seal)*bias),col);\n  if((flags&2u)!=0u){\n   let k=vec2f(q.x*.55,(q.y-1.11)*1.46);\n   let glow=1.-smoothstep(14.,88.,dot(k,k));\n   col=over(ink(mix(hot,aqua,iris),glow*lamp*.24),col);\n  }\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const len=Math.ceil(sampleRate*.660),out=new Float32Array(len),tau=Math.PI*2;
 const pole=f=>1.-Math.exp(-tau*f/sampleRate);
 const l0=pole(185),l1=pole(810),l2=pole(2850);
 const contacts=[.354,.447,.507],weights=[.64,1.,.60];
 const hp=Math.exp(-tau*68/sampleRate);let seed=0x92d1a73c,m=0,h=0,x=0,py=0,px=0;
 for(let i=0;i<len;i++){
  const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;
  m+=(noise-m)*l0;h+=(noise-h)*l1;x+=(noise-x)*l2;
  const grit=(x-h)*1.56, pad=(h-m)*1.38;
  const travel=cap((t-.088)/.092)*(1-cap((t-.285)/.069));
  let y=travel*(grit*.088+pad*.14)*(1+.38*Math.sin(t*383));
  for(let k=0;k<contacts.length;k++){
   const d=t-contacts[k];if(d<0)continue;
   const att=1-Math.exp(-d*1300),s1=Math.exp(-d*(124+22*k)),s2=Math.exp(-d*(65+12*k));
   const f=423+139*k;
   const clap=.55*pad*s1+.42*grit*s1;
   const wood=(Math.sin(tau*f*d)+.20*Math.sin(tau*(f*2.077)*d))*s2*.32;
   y+=weights[k]*(clap+wood)*att;
  }
  const value=.76*Math.tanh(y*1.20);const ff=hp*(py+value-px);py=ff;px=value;
  const a=cap((len-1-i)/(sampleRate*.043));out[i]=ff*a*a*(3-2*a);
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
