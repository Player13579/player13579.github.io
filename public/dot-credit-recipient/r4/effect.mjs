// DVA gallery-only, dot: situated credits settlement / laminated acknowledgement. No gameplay or amount inference.
export const VERSION_ID='dot-credit-recipient-r4';
export const DURATION_MS=1800,SFX_OFFSET_MS=0,SFX_DURATION_MS=660,UNIFORM_FLOATS=12;
export const EDITION=4,EDITION_LIMIT=5;
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
export const WGSL="struct Params { view:vec4f, actor:vec4f, receipt:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn hair(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn pulse(t:f32,center:f32,tail:f32)->f32{\n let h=t-center;return smoothstep(-.012,.016,h)*(1.-smoothstep(.018,tail,h));\n}\nstruct Cut { face:f32, hem:f32, glow:f32, stria:f32 }\nfn stratum(p:vec2f,depth:f32,flare:f32,aa:f32)->Cut {\n let s=vec2f(p.x+depth*.76,p.y-depth*3.6);\n // The cut is open on the outside: a teardrop-like tip spreads into a\n // concave projection sheet, not the silhouette of a box or banknote.\n let x=s.x+.43*s.y;\n let u=sat((x+11.2)/24.4);\n let arc=4.0*u*u-2.6*u-.91;\n let half=1.06+2.17*sin(3.14159265*u)*(.87+.13*depth);\n let y=s.y-arc;\n let d=max(max(-11.6-x,x-11.8+depth*.95),abs(y)-half);\n let mask=fill(d,aa);\n let hem=hair(y-half*.82,.40,.72*aa)*mask;\n let strip=hair(y+half*.28,.25,.69*aa)*mask;\n let wave=(1.-smoothstep(3.0,10.5,abs(x-flare)))*mask;\n return Cut(mask,hem,wave,strip);\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let px=f.pos.xy/u.view.z;\n let flags=u32(u.actor.w);\n let t=u.view.w;\n var col=vec4f(0.);\n if(u.receipt.z>.5){\n  let canUseOrigin=(flags&8u)!=0u&&(flags&4u)==0u;\n  let v=select(vec2f(0.),u.receipt.xy,canUseOrigin);\n  let side=select(1.,-1.,v.x<0.);\n  let dock=u.actor.xy+u.actor.z*vec2f(side*(ACTOR_ASPECT*.5+.227),.112);\n  let q=(px-dock)*64./u.actor.z*vec2f(side,1.);\n  let aa=clamp(.72*64./u.actor.z,.33,2.2);\n  // No draw inside actor's screen rectangle, even with fractional scaling.\n  if(q.x>=-13.9&&q.x<68.&&abs(q.y)<33.){\n   let z=smoothstep(.048,.351,t);\n   let showLeaf=smoothstep(-.021,.123,t)*(1.-smoothstep(.352,.472,t));\n   let baseIn=.99+.185*sin(z*3.14159265);\n   let inkIn=select(vec2f(2.5,-1.15),vec2f(2.5+(1.-z)*(25.+10.*abs(v.x)),(1.-z)*v.y*16.-2.4*sin(z*3.14159265)),canUseOrigin);\n   let q0=q-inkIn;\n   let signedAngle=select(-.24,-.32+v.y*.51,canUseOrigin)*(1.-.65*z);\n   let k=vec2f(cos(signedAngle),sin(signedAngle));\n   let spin=vec2f(dot(q0,k),dot(q0,vec2f(-k.y,k.x)));\n   let x=spin.x/baseIn;\n   let l=1.-smoothstep(.295,.459,t)*.47;\n   let breadth=4.32*sqrt(max(0.,1.-abs(x)/(9.4*l)))*(1.-.33*sin(z*3.14159265));\n   let v0=spin.y-(x*.18+x*x*.037);\n   let bounds=max(abs(x)-9.4*l,abs(v0)-breadth);\n   let petal=fill(bounds,aa);\n   let metalEdge=hair(v0-breadth*.89,.32,.69*aa)*petal;\n   let grad=smoothstep(-6.,7.5,-x-v0*.52);\n   let spine=hair(v0+x*.25-.74,.48,.66*aa)*petal;\n   let redGold=vec3f(.54,.25,.058);\n   let gold=vec3f(.99,.66,.19);\n   let shine=vec3f(1.,.94,.64);\n   let aqua=vec3f(.15,.89,.86);\n   let lilac=vec3f(.25,.46,.86);\n   let deep=vec3f(.07,.21,.22);\n   let lumen=vec3f(.75,.999,.86);\n   let bind0=pulse(t,.349,.158);let bind1=pulse(t,.470,.197);let bind2=pulse(t,.558,.208);\n   let lift=smoothstep(.219,.408,t);\n   let alpha=(1.-smoothstep(.78,1.61,t));\n   let emergence=lift*alpha;\n   let scanPing=pulse(t,.465,.331);\n   let sweepX=10.-19.8*smoothstep(.353,.685,t);\n   let snap=smoothstep(.339,.462,t);\n   let slope=(1.-snap);\n   let sampleY=q.y+3.5-2.1*slope;\n   let back=stratum(vec2f(q.x-1.,sampleY-1.5*slope),2.,sweepX+2.2,aa);\n   let middle=stratum(vec2f(q.x+.9,sampleY+.8*slope),1.,sweepX+.1,aa);\n   let front=stratum(vec2f(q.x+.5,sampleY+1.9*slope),0.,sweepX-2.2,aa);\n   let light=(.62*bind0+.83*bind1+.55*bind2);\n   let plateTone=mix(deep,aqua,.48+.34*sat(light));\n   let underTone=mix(deep,lilac,.48+.28*sat(scanPing));\n   // A receiver plane dark before touch lights once inward, from the\n   // measured encounter point inside this illustrative fixture.\n   col=over(ink(underTone,back.face*emergence*.49),col);\n   col=over(ink(lilac,back.hem*emergence*(.41+.41*bind2)),col);\n   col=over(ink(plateTone,middle.face*emergence*.57),col);\n   col=over(ink(mix(lilac,aqua,.46),middle.hem*emergence*(.54+.38*bind1)),col);\n   col=over(ink(plateTone,front.face*emergence*.63),col);\n   col=over(ink(aqua,front.hem*emergence*(.62+.34*bind0)),col);\n   let planeLight=front.glow*.57+middle.glow*.36+back.glow*.21;\n   col=over(ink(mix(gold,lumen,snap),planeLight*emergence*(.69*bind0+.65*scanPing+.24*bind2)),col);\n   col=over(ink(aqua,(back.stria*.23+middle.stria*.36+front.stria*.49)*emergence*(.54+.46*scanPing)),col);\n   // The warm, deforming leaf remains a single sprite-free original\n   // shape, never unit count. A source-relative narrow tail belongs to it.\n   if(canUseOrigin){\n    let trail=vec2f(max(0.,x-3.6),v0*.97);\n    let glow=(1.-smoothstep(5.,57.,dot(trail*vec2f(.63,1.21),trail*vec2f(.63,1.21))));\n    col=over(ink(gold,showLeaf*(1.-snap)*glow*.15),col);\n   }\n   col=over(ink(mix(redGold,shine,.26+.66*grad),showLeaf*petal*.95),col);\n   col=over(ink(mix(gold,shine,.31+.44*bind0),(metalEdge*.91+spine*.54)*showLeaf),col);\n   if((flags&2u)!=0u){\n    let d=vec2f((q.x-sweepX)*.81,(q.y-1.2)*1.38);\n    let veil=1.-smoothstep(8.,100.,dot(d,d));\n    col=over(ink(mix(shine,lumen,snap),veil*emergence*(.10*bind0+.145*bind1+.09*bind2)),col);\n   }\n  }\n }\n let uv=(px-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((flags&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let n=textureSampleLevel(tex,samp,uv,0.);\n  col=over(ink(decode(n.rgb),n.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const len=Math.ceil(sampleRate*SFX_DURATION_MS*.001),out=new Float32Array(len),tau=2*Math.PI;
 const a1=1-Math.exp(-tau*320/sampleRate),a2=1-Math.exp(-tau*1250/sampleRate),a3=1-Math.exp(-tau*2950/sampleRate),a4=1-Math.exp(-tau*4270/sampleRate);
 const hp=Math.exp(-tau*79/sampleRate);
 const clocks=[.349,.470,.558],weights=[1.,.79,.56];
 const grain=[
  [[711,.26,86],[1341,.22,103],[2164,.11,139],[3177,.061,188]],
  [[463,.23,60],[764,.19,81],[1228,.144,128],[2127,.073,166]],
  [[319,.14,72],[568,.14,100],[893,.09,147],[1611,.043,160]]
 ];
 let z=0x8e5a0337,lo=0,mid=0,hi=0,air=0,raw=0,old=0;
 for(let n=0;n<len;n++){
  const t=n/sampleRate;z^=z<<13;z^=z>>>17;z^=z<<5;
  const exc=(z>>>0)/2147483648-1;
  lo+=(exc-lo)*a1;mid+=(exc-mid)*a2;hi+=(exc-hi)*a3;air+=(exc-air)*a4;
  const brush=(mid-lo)*1.46,metal=(hi-mid)*1.56,grainAir=(air-hi)*1.71;
  const draw=cap((t-.034)/.082)*(1.-cap((t-.294)/.052));
  const roll=.57+.43*Math.sin(tau*(21*t+29*t*t))**2;
  let x=draw*(.103*brush+.186*metal*roll+.17*grainAir);
  for(let q=0;q<clocks.length;q++){
   const dt=t-clocks[q];if(dt<0)continue;
   const atk=1.-Math.exp(-dt*1490);
   const touch=atk*Math.exp(-dt*(141.+13.*q));
   let ring=0.;
   for(const [f,g,decay] of grain[q]){
    ring+=Math.sin(tau*f*dt)*g*Math.exp(-dt*decay);
   }
   const spread=dt>.011?1.-Math.exp(-(dt-.011)*65):0;
   x+=weights[q]*(touch*(.31*brush+.63*metal+.48*grainAir)+atk*ring*(.72+.18*spread));
  }
  const y=.78*Math.tanh(x*1.17);const m=hp*(old+y-raw);old=m;raw=y;
  const tail=cap((len-1-n)/(sampleRate*.046));out[n]=m*tail*tail*(3-2*tail);
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
