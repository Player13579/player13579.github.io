// Gallery-only DVA action-smartphone / emergency. Grip-anchored paired pressure fronts, never convening.
export const VERSION_ID='dot-emergency-request-r3';
export const DURATION_MS=4000,SFX_OFFSET_MS=0,SFX_DURATION_MS=680,UNIFORM_FLOATS=12;
export const EDITION=3,EDITION_LIMIT=5;
const finite=Number.isFinite,cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<230?'actuate':ageMs<760?'uplink':ageMs<3460?'pending':'release';
}
export function planSource(event,serverNow){
 const off=(reason)=>({valid:false,active:false,phase:'off',reason,causalId:null,ageMs:0});
 if(!event||event.type!=='action-smartphone'||event.variant!=='emergency')return off('not-emergency-request');
 if(typeof event.id!=='string'||!/^magic_.{1,174}$/.test(event.id)||typeof event.playerId!=='string'||!event.playerId)return off('missing-cause-owner');
 if(![event.x,event.y,event.at,serverNow].every(finite)||event.at<946684800000||serverNow<946684800000||event.durationMs!==0||event.radius!==85)return off('invalid-receipt-fields');
 if(event.at-serverNow>125)return off('future-receipt');
 const ageMs=serverNow-event.at,phase=phaseAt(ageMs);
 return {valid:true,active:phase!=='off',phase,reason:null,causalId:'emergency-request:'+event.id,ageMs,startedAt:event.at,endsAt:event.at+DURATION_MS};
}
export function frameState({width,height,dpr=1,event,serverNow,actorCenterCss,actorHeightCss=64,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}={}){
 if(![width,height,dpr,actorHeightCss].every(finite)||width<1||width>32768||height<1||height>32768||dpr<=0||dpr>8||actorHeightCss<8||actorHeightCss>2048||!Array.isArray(actorCenterCss)||actorCenterCss.length!==2||!actorCenterCss.every(finite))throw RangeError('viewport and actor fixture');
 const source=planSource(event,serverNow),active=source.active&&sourceOn!==false&&mainOn!==false;
 const flags=(showActor!==false?1:0)+(observerOn!==false?2:0)+(reducedMotion?4:0);
 const uniforms=new Float32Array([width,height,dpr,Math.max(0,Math.min(4,source.ageMs*.001)),...actorCenterCss,actorHeightCss,flags,0,0,+active,0]);
 if(![...uniforms].every(finite))throw RangeError('uniform overflow');
 return {uniforms,source,active,phase:active?source.phase:'off'};
}
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn rr(p:vec2f,h:vec2f,r:f32)->f32{\n let d=abs(p)-(h-vec2f(r));return length(max(d,vec2f(0.)))+min(max(d.x,d.y),0.)-r;\n}\nfn kick(t:f32,at:f32)->f32{let d=t-at;return smoothstep(-.014,.018,d)*(1.-smoothstep(.028,.172,d));}\nstruct Front { membrane:f32, lip:f32, seam:f32, halo:f32 }\nfn pressureFace(q:vec2f,t:f32,on:f32,rate:f32,reduced:bool,aa:f32)->Front{\n let s=sat((t-on)*rate);\n let e=select(s,.23,reduced);\n let life=smoothstep(-.008,.046,t-on)*(1.-smoothstep(.27,.94,s));\n // A transverse pressure surface expands along a balanced camera plane.\n // No closed contour, detached solid sheet, or receiving endpoint.\n let axis=vec2f(.84,-.5425864);let tangent=vec2f(.5425864,.84);\n let o=q-vec2f(10.4,-8.2);\n let a=dot(o,axis);\n let b=dot(o,tangent);\n let edge=8.0+10.8*e;\n let k=b/edge;\n let x=a-(1.7+21.5*(1.-(1.-e)*(1.-e)));\n let bowed=k*k*(4.9+2.0*e)-.82*abs(k);\n let stroke=x+bowed+.33*b;\n let taper=(1.-smoothstep(.62,1.00,abs(k)))*(.71+.29*(1.-abs(k)));\n let base=fill(abs(stroke)-(2.25*(1.-.50*e)),aa)*taper;\n let lip=line(stroke-.65,.47,aa*.77)*taper;\n let mid=line(stroke+1.16,.34,aa*.73)*taper;\n let haze=(1.-smoothstep(1.7,6.9,abs(stroke)))*taper;\n return Front(base*life,lip*life,mid*life,haze*life);\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;let t=u.view.w;\n let bits=u32(u.actor.w);\n let reduced=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let aa=clamp(.71*64./u.actor.z,.33,2.21);\n let grip=u.actor.xy+u.actor.z*vec2f(.215*ACTOR_ASPECT,.108);\n let q=(p-grip)*64./u.actor.z;\n var col=vec4f(0.);\n if(u.state.z>.5&&q.x>=-10.&&q.x<56.&&q.y>-42.&&q.y<24.){\n  let wake=smoothstep(-.009,.179,t);\n  let fade=1.-smoothstep(3.460,3.984,t);\n  let quiet=smoothstep(.632,1.151,t);\n  let press=kick(t,.222);\n  let charge=smoothstep(.151,.268,t)*(1.-smoothstep(.314,.492,t));\n  let g=wake*fade;\n  let lean=select(-.179+.054*wake+.064*press,-.125,reduced);\n  let a=vec2f(cos(lean),sin(lean));\n  let q0=vec2f(dot(q,a),dot(q,vec2f(-a.y,a.x)));\n  let r=q0-vec2f(5.01,-5.18);\n  let chassis=rr(r,vec2f(6.54,10.84),2.10);\n  let lens=rr(r-vec2f(.18,.17),vec2f(5.22,8.95),1.62);\n  let frame=fill(chassis,aa);\n  let screen=fill(lens,aa)*frame;\n  let underlay=fill(rr(r-vec2f(.57,1.36),vec2f(6.78,10.95),2.22),aa);\n  let lip=line(chassis-.17,.38,.72*aa)*(.74+.26*quiet);\n  let split=line(lens-.10,.46,.72*aa)*screen;\n  let shell=vec3f(.025,.034,.10);\n  let violet=vec3f(.13,.178,.34);\n  let slate=vec3f(.22,.39,.51);\n  let pool=vec3f(.17,.57,.72);\n  let rose=vec3f(.91,.28,.17);\n  let apricot=vec3f(1.,.66,.37);\n  let chalk=vec3f(1.,.935,.76);\n  let blue=vec3f(.49,.86,.99);\n  let view=smoothstep(-8.,7.6,r.x-r.y*.26);\n  col=over(ink(shell,underlay*g*.82),col);\n  col=over(ink(mix(shell,violet,.42+.32*view),frame*g*(.94-.21*quiet)),col);\n  col=over(ink(mix(violet,slate,.46+.50*view),lip*g*(.86-.32*quiet)),col);\n  col=over(ink(mix(shell,slate,.22+.29*view+.21*charge),screen*g*(.94-.17*quiet)),col);\n  col=over(ink(mix(pool,blue,.49*charge),split*g*(.34+.48*charge-.11*quiet)),col);\n  // Pressure begins at a compact exterior touch point, spreads as an open\n  // colored interference front across glass and then leaves in two fronts.\n  let tap=(r-vec2f(-.32,3.37))*vec2f(1.,1.37);\n  let bump=1.-smoothstep(1.45,4.52,length(tap));\n  let lineTo=sin(smoothstep(.221,.405,t)*1.57079632679)*11.8;\n  let scan=(r.y-4.3+lineTo)-r.x*.24;\n  let volume=1.-smoothstep(1.02,3.52,abs(scan));\n  let bare=line(scan,.53,.83)*screen;\n  col=over(ink(mix(rose,apricot,.68),bump*screen*g*(.14*(1.-quiet)+.76*press)),col);\n  col=over(ink(apricot,volume*screen*g*charge*.35),col);\n  col=over(ink(chalk,bare*g*charge*.89),col);\n  let still=rr(r-vec2f(.86,-3.8),vec2f(2.9,2.22),.94);\n  let settled=line(still,.28,aa*.75)*screen*(.70+.30*view);\n  col=over(ink(pool,settled*g*quiet*.18),col);\n\n  if(t>=.235&&t<.797){\n   let w1=pressureFace(q0,t,.249,2.59,reduced,aa);\n   let w2=pressureFace(q0-vec2f(.31,.8),t,.335,2.59,reduced,aa);\n   let tint=smoothstep(.322,.677,t);\n   col=over(ink(mix(rose,apricot,tint),w2.membrane*.41+w1.membrane*.35),col);\n   col=over(ink(mix(apricot,blue,tint*.73),w2.seam*.58+w1.seam*.36),col);\n   col=over(ink(mix(chalk,blue,tint*.37),w2.lip*.86+w1.lip*.86),col);\n   if(obs){col=over(ink(mix(apricot,blue,tint*.48),(w2.halo+w1.halo)*.12),col);}\n  }\n }\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){let a=textureSampleLevel(tex,samp,uv,0.);col=over(ink(decode(a.rgb),a.a),col);}\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),P=Math.PI*2;
 const lp=(f)=>1.-Math.exp(-P*f/sampleRate);
 const weights=[188,552,1310,2860,4190].map(lp), band=[0,0,0,0,0];
 const hp=Math.exp(-P*74/sampleRate);let rng=0x67c9f321,mem=0,old=0;
 // A firmer glass depression and two overlapped pressure tails. The tails
 // are filtered air, not two button clicks or responses from another device.
 const shells=[.249,.335],amplitudes=[.82,.61];
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
  const h=(rng>>>0)/2147483648-1;
  for(let j=0;j<band.length;j++)band[j]+=(h-band[j])*weights[j];
  const low=(band[1]-band[0])*1.91,mid=(band[2]-band[1])*1.62,soft=(band[3]-band[2])*1.57,air=(band[4]-band[3])*1.58;
  const lean=cap((t-.055)/.061)*(1.-cap((t-.149)/.069));
  let mix=lean*(.093*mid+.11*soft);
  const dt=t-.222;
  if(dt>=0){
   const touch=(1-Math.exp(-dt*1750));const dy=Math.exp(-dt*122);
   const frame=Math.sin(P*368*dt)*.239*Math.exp(-dt*51)+Math.sin(P*921*dt)*.123*Math.exp(-dt*94)+Math.sin(P*1438*dt)*.094*Math.exp(-dt*139);
   mix+=touch*(frame+dy*(.42*mid+.35*soft+.18*air));
  }
  for(let j=0;j<shells.length;j++){
   const age=t-shells[j];if(age<0)continue;
   const form=(1-Math.exp(-age*125))*Math.exp(-age*(27.+j*6.));
   const flow=(.39*low+.31*mid+soft*(.127+.054*j)+.123*air);
   mix+=amplitudes[j]*form*flow;
  }
  const a=.80*Math.tanh(mix*1.19);const z=hp*(old+a-mem);old=z;mem=a;
  const tail=cap((out.length-1-i)/(sampleRate*.060));out[i]=z*tail*tail*(3-2*tail);
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
