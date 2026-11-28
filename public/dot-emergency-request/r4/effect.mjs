// Gallery-only DVA action-smartphone / emergency. Grip-to-lip single submission trace, never convening.
export const VERSION_ID='dot-emergency-request-r4';
export const DURATION_MS=4000,SFX_OFFSET_MS=0,SFX_DURATION_MS=680,UNIFORM_FLOATS=12;
export const EDITION=4,EDITION_LIMIT=5;
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
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn rr(p:vec2f,h:vec2f,r:f32)->f32{\n let d=abs(p)-(h-vec2f(r));return length(max(d,vec2f(0.)))+min(max(d.x,d.y),0.)-r;\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;let t=u.view.w;let bits=u32(u.actor.w);\n let reduced=(bits&4u)!=0u;let obs=(bits&2u)!=0u;\n let aa=clamp(.71*64./u.actor.z,.33,2.21);\n let grip=u.actor.xy+u.actor.z*vec2f(.215*ACTOR_ASPECT,.108);\n let q=(p-grip)*64./u.actor.z;\n var col=vec4f(0.);\n if(u.state.z>.5&&q.x>=-10.&&q.x<37.&&q.y>-28.&&q.y<25.){\n  let wake=smoothstep(0.,.168,t);let dim=1.-smoothstep(3.46,3.992,t);\n  let press=smoothstep(.193,.224,t)*(1.-smoothstep(.248,.316,t));\n  let lean=select(-.21+.08*wake+.036*press,-.138,reduced);\n  let axis=vec2f(cos(lean),sin(lean));\n  let q0=vec2f(dot(q,axis),dot(q,vec2f(-axis.y,axis.x)));\n  // Shift the glass to the visible hand side, lowered from R3's hair overlap.\n  // Its lower inward corner remains against the pose; no invented hand animation.\n  let r=q0-vec2f(8.2,-2.0);let g=wake*dim;\n  let casing=rr(r,vec2f(6.2,9.75),1.88);\n  let lens=rr(r-vec2f(.11,.08),vec2f(5.13,8.20),1.51);\n  let b=fill(casing,aa);let glass=fill(lens,aa)*b;\n  let bevel=line(casing-.10,.34,aa*.70);\n  let grazing=smoothstep(-6.,7.,r.x-r.y*.24);\n  let enamel=vec3f(.029,.065,.100);\n  let visible=vec3f(.113,.25,.319);\n  let frame=vec3f(.25,.48,.55);\n  let inkBlack=vec3f(.037,.119,.175);\n  let amber=vec3f(1.,.60,.29);let honey=vec3f(1.,.84,.56);\n  let silver=vec3f(.76,.96,1.);let cyan=vec3f(.32,.75,.87);\n  col=over(ink(enamel,fill(rr(r-vec2f(.51,1.11),vec2f(6.42,9.91),1.9),aa)*g*.79),col);\n  col=over(ink(mix(enamel,visible,.48+.27*grazing),b*g*.94),col);\n  col=over(ink(mix(visible,frame,.53+.36*grazing),bevel*g*.78),col);\n  col=over(ink(mix(inkBlack,visible,.28+.37*grazing),glass*g*.86),col);\n  col=over(ink(cyan,line(lens-.2,.36,aa*.58)*glass*g*(.12+.15*grazing)),col);\n  // One fictional interface pulse: pressure at the\n  // grasp-facing lower corner; transmission across glass into the same lip.\n  let touchPoint=vec2f(-2.65,4.72);let mouth=vec2f(5.13,-4.62);\n  let heading=normalize(mouth-touchPoint);\n  let perp=vec2f(-heading.y,heading.x);\n  let gp=r-touchPoint;\n  let along=dot(gp,heading);let across=dot(gp,perp);\n  let l=length(mouth-touchPoint);\n  let flow=smoothstep(.213,.249,t)*(1.-smoothstep(.399,.542,t));\n  let front=select(l*smoothstep(.214,.398,t),l*.69,reduced);\n  let fold=(1.-smoothstep(1.03,3.18,abs(along-front)))*(1.-smoothstep(1.26,3.22,abs(across)));\n  let core=line(along-front,.42,.78)*smoothstep(-2.55,-.95,across)*(1.-smoothstep(1.14,2.62,across));\n  let contact=1.-smoothstep(1.45,4.17,length((r-touchPoint)*vec2f(1.,1.24)));\n  col=over(ink(amber,glass*contact*press*g*.91),col);\n  col=over(ink(mix(cyan,honey,.42),glass*fold*flow*g*.68),col);\n  col=over(ink(mix(silver,honey,.37),glass*core*flow*g*.92),col);\n  let emit=smoothstep(.345,.400,t)*(1.-smoothstep(.467,.638,t));\n  let e=smoothstep(.347,.519,t);\n  let reach=select(1.18+7.21*e,3.62,reduced);\n  let fork=r-mouth;\n  let ax=dot(fork,heading);\n  let v=dot(fork,perp)-.035*max(ax,0.)*max(ax,0.);\n  let neck=(1.-smoothstep(reach*.84,reach,ax))*smoothstep(-.52,.15,ax);\n  let width=1.82*(1.-.55*sat(ax/reach));\n  let stream=neck*(1.-smoothstep(width*.54,width+.72,abs(v)));\n  let spine=neck*line(v-.14,.39,.61);\n  let throat=1.-smoothstep(1.06,2.59,length((r-mouth)*vec2f(1.,1.27)));\n  col=over(ink(mix(cyan,amber,.18),stream*emit*dim*.76),col);\n  col=over(ink(silver,spine*emit*dim*.86+throat*emit*dim*.20),col);\n  if(obs){\n   // Compact observation scattering only, not a second wave or changed weather.\n   let halo=neck*(1.-smoothstep(1.46,3.54,abs(v)));\n   col=over(ink(cyan,halo*emit*dim*.18),col);\n  }\n }\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){let a=textureSampleLevel(tex,samp,uv,0.);col=over(ink(decode(a.rgb),a.a),col);}\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),P=2*Math.PI;
 let rand=0x7f3ec922, slow=0, fast=0;
 const l1=1-Math.exp(-780*P/sampleRate),l2=1-Math.exp(-3950*P/sampleRate);
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;rand^=rand<<13;rand^=rand>>>17;rand^=rand<<5;
  const r=(rand>>>0)/2147483648-1;slow+=(r-slow)*l1;fast+=(r-fast)*l2;
  const contact=Math.max(0,t-.222);const sent=Math.max(0,t-.350);
  const onset=(1.-Math.exp(-contact*2600))*Math.exp(-contact*105);
  const click=onset*(.31*(fast-slow)+.13*Math.sin(P*471*contact)+.05*Math.sin(P*1156*contact));
  const flow=(1.-Math.exp(-sent*120))*Math.exp(-sent*24);
  const tail=cap((out.length-1-i)/(sampleRate*.06));out[i]=.7*Math.tanh(click+flow*(.13*(fast-slow)+.048*Math.sin(P*(438*sent-126*sent*sent))))*tail*tail*(3.-2.*tail);
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
