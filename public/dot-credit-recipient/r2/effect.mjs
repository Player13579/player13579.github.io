// DVA gallery-only, dot: situated credits settlement / ground die impression. No gameplay or amount inference.
export const VERSION_ID='dot-credit-recipient-r2';
export const DURATION_MS=1800,SFX_OFFSET_MS=0,SFX_DURATION_MS=660,UNIFORM_FLOATS=12;
export const EDITION=2,EDITION_LIMIT=5;
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
export const WGSL="struct Params { view:vec4f, actor:vec4f, receipt:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.3,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn tick(t:f32,on:f32,decay:f32)->f32{\n let x=t-on;\n return smoothstep(-.008,.018,x)*(1.-smoothstep(.031,decay,x));\n}\n// An oblique die impression, cut inside its own silhouette. It is neither\n// a vessel nor a ring; these slopes form one joined, embossed face.\nfn die(q:vec2f,k:f32)->f32 {\n let r=vec2f(q.x+q.y*.83,q.y);\n let horizontal=max(-14.8-r.x,r.x-14.);\n let vertical=max(-5.1+max(0.,r.x*.137)-r.y,r.y-5.9+max(0.,-r.x*.19));\n let corners=abs(r.x)*.29+abs(r.y)*1.06-7.2;\n return max(max(horizontal,vertical),corners*.72)+k;\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let flags=u32(u.actor.w);\n let t=u.view.w;\n let act=u.receipt.z>.5;\n let aa=clamp(64./u.actor.z*.70,.31,2.13);\n let contact=u.actor.xy+u.actor.z*vec2f(.18,.657);\n let q=(p-contact)*(64./u.actor.z);\n var col=vec4f(0.);\n if(act&&abs(q.x)<59.&&abs(q.y)<27.){\n  let a=(flags&8u)!=0u;\n  let safeMotion=(flags&4u)!=0u;\n  let reveal=(a&&!safeMotion);\n  let v=select(vec2f(0.),u.receipt.xy,reveal);\n  // A revealed origin only informs the orientation of the 38px maximum\n  // local approach. It is not the donor's location or a physical route.\n  let face=select(-1.,1.,v.x>=0.);\n  let along=(v.x*36.);\n  let py=v.y*8.;\n  let w=vec2f(along,py);\n  let hasSpan=dot(w,w)>9.;\n  let norm=w/max(1.,length(w));\n  let axis=select(vec2f(1.,0.),norm,hasSpan);\n  let side=vec2f(-axis.y,axis.x);\n  let lengthQ=select(14.,clamp(length(w),13.,38.),hasSpan);\n  let k=sat(t/.360);\n  let motion=pow(k,1.72);\n  let led=1.-motion;\n  let len=(.263-.038*smoothstep(.29,.360,t));\n  let outEdge=min(1.02,led+len);\n  let x=dot(q,axis)/lengthQ;\n  let y=dot(q,side);\n  let arc=x*(1.-x)*(4.6*face+py*.29);\n  let cv=y-arc;\n  let span=clamp((x-led)/max(.06,len),0.,1.);\n  let width=1.0+3.0*sin(span*3.14159265)+1.25*(1.-span);\n  let inband=smoothstep(led-.021,led+.038,x)*(1.-smoothstep(outEdge-.044,outEdge+.019,x));\n  let entry=smoothstep(-.018,.096,t)*(1.-smoothstep(.340,.418,t));\n  let lightTravel=entry*inband;\n  let runner=fill(abs(cv)-width,aa);\n  let rim=line(cv+width*.57,.38,aa*.64)*runner;\n  let nose=1.-smoothstep(.11,.61,span);\n  let c1=vec3f(.30,.095,.02);\n  let c2=vec3f(.92,.389,.080);\n  let c3=vec3f(.99,.79,.29);\n  let c4=vec3f(.28,.97,.77);\n  let flash=vec3f(1.,.96,.76);\n  let baseInk=mix(c1,c2,smoothstep(-width,width,cv));\n  let rail=mix(baseInk,c3,.27+.48*nose);\n  let byReceiver=fill(abs(cv)-width-3.0,aa)*.12*nose;\n  // With no directional facts, the impression assembles by its own\n  // short left/right shoulders. Neither hidden direction nor any path leaks.\n  if(reveal){\n   col=over(ink(c2,lightTravel*byReceiver),col);\n   col=over(ink(rail,runner*lightTravel),col);\n   col=over(ink(mix(c3,flash,.44),rim*lightTravel*(.83+.17*nose)),col);\n  }else{\n   let contour=die(q*vec2f(1.75,1.1),.89);\n   let face=fill(contour,aa);\n   let read=smoothstep(-.05,.241,t)*(1.-smoothstep(.333,.418,t));\n   let left=smoothstep(-9.,5.,q.x+(1.-read)*16.);\n   col=over(ink(mix(c1,c3,left*.86),face*read*.70),col);\n  }\n  // Bronze folds compression into one receiver-side plane. No enclosing\n  // size marker, count, head-up badge, new item, or world physics.\n  let impact=tick(t,.349,.176);let settle=tick(t,.463,.202);let confirm=tick(t,.555,.210);\n  let seat=smoothstep(.333,.421,t);\n  let clear=1.-smoothstep(1.04,1.76,t);\n  let press=smoothstep(.351,.479,t);\n  let p2=vec2f(q.x/(.54+.46*seat),q.y/(.62+.38*seat)-.34*impact);\n  let d=die(p2,0.);\n  let foot=fill(d,aa);\n  let goldEdge=line(d-.09,.59,aa*.68);\n  let mid=abs(p2.y+.72*sin(p2.x*.14));\n  let angle=smoothstep(-4.2,3.7,p2.y+p2.x*.19);\n  let relief=fill(mid-(.52+.22*angle),aa*.8)*foot*(1.-smoothstep(9.1,14.0,abs(p2.x)));\n  let facet=mix(c1,mix(c2,c3,.43),.37+.48*angle);\n  let hue=mix(facet,vec3f(.095,.30,.228),smoothstep(.486,.872,t)*.67);\n  let mass=.79+.18*press;\n  let field=(1.-smoothstep(41.,265.,dot(q*vec2f(.73,1.43),q*vec2f(.73,1.43))))*seat*clear;\n  col=over(ink(mix(c2,c4,press),field*(.11+.12*impact+.07*settle)),col);\n  col=over(ink(hue,foot*seat*clear*mass),col);\n  col=over(ink(mix(c3,c4,press),goldEdge*seat*clear*(.55+.26*impact+.18*settle)),col);\n  let thread=.39+.42*settle+.24*confirm;\n  col=over(ink(mix(flash,c4,press*.89),relief*seat*clear*thread),col);\n  if((flags&2u)!=0u){\n   let pp=q*vec2f(.67,1.54);\n   let veil=1.-smoothstep(24.,170.,dot(pp,pp));\n   col=over(ink(mix(c3,c4,press),veil*seat*clear*(.14*impact+.15*settle+.14*confirm)),col);\n  }\n }\n // Real fixture silhouette owns front-most layer. No E appears over it.\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((flags&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let a=textureSampleLevel(tex,samp,uv,0.);\n  col=over(ink(decode(a.rgb),a.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const len=Math.ceil(sampleRate*SFX_DURATION_MS*.001),out=new Float32Array(len),tau=2*Math.PI;
 const pole=(h)=>1.-Math.exp(-tau*h/sampleRate);
 const gains=[113,365,1011,2820].map(pole),flt=[0,0,0,0];
 const hp=Math.exp(-tau*46/sampleRate);
 // Smooth pressure glide -> weighted die -> short confirmation resonance.
 // Attack clocks match the pressed surface, not three independent payments.
 const beats=[.349,.463,.555],eng=[1.,.77,.50];
 const colors=[
  [[162,.41,35],[388,.25,62],[566,.12,87],[978,.078,96]],
  [[269,.24,47],[486,.23,67],[781,.085,103],[1694,.054,154]],
  [[528,.16,65],[924,.15,79],[1481,.075,121],[2431,.033,174]]
 ];
 let seed=0x769a2fd5,xp=0,yp=0;
 for(let i=0;i<len;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const exc=(seed>>>0)/2147483648-1;
  for(let k=0;k<flt.length;k++)flt[k]+=(exc-flt[k])*gains[k];
  const hum=(flt[1]-flt[0])*1.65,body=(flt[2]-flt[1])*1.52,top=(flt[3]-flt[2])*1.43;
  const rub=cap((t-.041)/.058)*(1-cap((t-.285)/.062));
  const wheel=.52+.48*Math.abs(Math.sin(tau*(41*t+32*t*t)));
  let y=rub*(.113*hum+(.22*body+.075*top)*wheel);
  for(let j=0;j<beats.length;j++){
   const d=t-beats[j];if(d<0)continue;
   const press=(1-Math.exp(-d*(1220-100*j)))*Math.exp(-d*(76+22*j));
   const crack=(1-Math.exp(-d*1990))*Math.exp(-d*(167+20*j));
   let notes=0;
   const ll=colors[j];
   for(let k=0;k<ll.length;k++){
    const [f,g,damp]=ll[k];
    notes+=g*Math.sin(tau*f*d+.047*k)*Math.exp(-d*damp);
   }
   y+=eng[j]*(press*(.40*hum+.27*body)+crack*(.31*body+.41*top)+(1-Math.exp(-d*438))*notes*.79);
  }
  const x=.79*Math.tanh(y*1.11);const z=hp*(yp+x-xp);yp=z;xp=x;
  const tail=cap((len-1-i)/(sampleRate*.037));out[i]=z*tail*tail*(3-2*tail);
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
