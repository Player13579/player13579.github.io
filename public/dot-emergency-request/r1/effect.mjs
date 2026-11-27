// Gallery-only DVA action-smartphone / emergency. Requests, never convening.
export const VERSION_ID='dot-emergency-request-r1';
export const DURATION_MS=4000,SFX_OFFSET_MS=0,SFX_DURATION_MS=680,UNIFORM_FLOATS=12;
export const EDITION=1,EDITION_LIMIT=5;
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
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn hem(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn rounded(p:vec2f,h:vec2f,r:f32)->f32{\n let q=abs(p)-(h-vec2f(r));\n return length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.)-r;\n}\nfn tick(t:f32,on:f32,tr:f32)->f32{\n let k=t-on;return smoothstep(-.007,.022,k)*(1.-smoothstep(.043,tr,k));\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let flags=u32(u.actor.w);\n let t=u.view.w;\n let aa=clamp(.70*64./u.actor.z,.32,2.20);\n let act=u.state.z>.5;\n let reduce=(flags&4u)!=0u;\n let obs=(flags&2u)!=0u;\n let center=u.actor.xy+u.actor.z*vec2f(ACTOR_ASPECT*.5+.190,.028);\n let q=(p-center)*64./u.actor.z;\n var col=vec4f(0.);\n if(act&&q.x>-12.0&&q.x<33.&&q.y>-51.&&q.y<23.){\n  // This is a single chosen gallery prop, not the game pose/sprite.\n  // The display stays blank of characters, names, recipients and verdicts.\n  let lift=smoothstep(-.016,.221,t);\n  let visible=lift*(1.-smoothstep(3.455,3.990,t));\n  let press=tick(t,.235,.190);\n  let exitPulse=tick(t,.395,.27);\n  let seat=select(-.255+.117*lift+.080*press,-.142,reduce);\n  let cs=cos(seat);let sn=sin(seat);\n  let at=q-vec2f(0.,select(5.0*(1.-lift),0.,reduce));\n  let r=vec2f(dot(at,vec2f(cs,sn)),dot(at,vec2f(-sn,cs)));\n  let face=rounded(r,vec2f(6.9,10.5),2.1);\n  let glass=rounded(r+vec2f(.0,.31),vec2f(5.8,8.75),1.37);\n  let outer=fill(face,aa);\n  let screen=fill(glass,aa)*outer;\n  let line=hem(face-.13,.39,aa*.80);\n  let thick=fill(rounded(r-vec2f(.63,1.45),vec2f(7.3,10.9),2.3),aa);\n  let indigo=vec3f(.020,.040,.085);\n  let night=vec3f(.038,.078,.159);\n  let alloy=vec3f(.124,.255,.419);\n  let cyan=vec3f(.21,.65,.86);\n  let accent=vec3f(.95,.39,.18);\n  let heat=vec3f(1.,.86,.63);\n  let soft=vec3f(.68,.87,.98);\n  col=over(ink(indigo,thick*visible*.88),col);\n  col=over(ink(night,outer*visible*.98),col);\n  col=over(ink(mix(alloy,cyan,.29+.47*press),line*visible*.91),col);\n  let spec=smoothstep(-5.,6.,-r.x-r.y*.31);\n  let scanT=smoothstep(.722,3.32,t);\n  let scanY=select(4.1-11.2*scanT,0.,reduce);\n  let steady=smoothstep(.630,1.01,t)*(1.-smoothstep(2.965,3.58,t));\n  let film=hem(r.y-scanY,.53,.83)*screen*(.26+.24*smoothstep(-5.8,4.2,r.x));\n  let display=mix(night,alloy,.48+spec*.25+press*.14);\n  col=over(ink(display,screen*visible),col);\n  col=over(ink(mix(alloy,cyan,.61),film*visible*steady*.77),col);\n  // One virtual press against the face and a local press-bite. No count.\n  let catchAt=r-vec2f(-.44,2.1);\n  let tip=fill(rounded(catchAt,vec2f(4.0,1.84-.48*press),1.23),aa)*screen;\n  let inner=hem(catchAt.y-.1,.35,.77)*tip;\n  col=over(ink(mix(accent,heat,.39+.47*press),tip*visible*(.43+.54*press)*(1.-.84*exitPulse)),col);\n  col=over(ink(heat,inner*visible*(.42+.48*press)),col);\n\n  // This geometry starts at the upper edge and leaves only a few CSS pixels\n  // in-world. It marks \"request sent from here\"; it does not mark reception,\n  // success, a destination, an area of operation, or a meeting.\n  let u0=smoothstep(.236,.685,t);\n  let emission=smoothstep(.231,.302,t)*(1.-smoothstep(.541,.812,t));\n  let shift=select(u0,.21,reduce);\n  let vane=(q-vec2f(.82+7.3*shift,-10.7-16.2*shift));\n  let v=vec2f(vane.x+.34*vane.y,vane.y-.18*vane.x);\n  let w=4.0+4.3*shift;\n  let wing=abs(v.x)/(w+.01);\n  let curve=v.y-2.5*wing*wing+.82*wing;\n  let span=1.-smoothstep(.76,1.06,wing);\n  let shape=fill(abs(curve)-(.48+1.36*sin(wing*3.14159265)),aa)*span;\n  let ridge=hem(curve+.21,.34,.79*aa)*span;\n  let shade=mix(mix(accent,heat,.73),soft,smoothstep(.344,.747,t)*.70);\n  let halo=1.-smoothstep(.04,1.03,dot(v*vec2f(.100,.255),v*vec2f(.100,.255)));\n  col=over(ink(shade,halo*emission*.16),col);\n  col=over(ink(shade,shape*emission*.88),col);\n  col=over(ink(mix(heat,soft,.44),ridge*emission),col);\n  if(obs){\n   let touchQ=r-vec2f(.5,1.6);\n   let haze=1.-smoothstep(12.,98.,dot(touchQ*vec2f(.80,1.07),touchQ*vec2f(.80,1.07)));\n   col=over(ink(heat,haze*visible*.16*press),col);\n  }\n }\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((flags&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let a=textureSampleLevel(tex,samp,uv,0.);\n  col=over(ink(decode(a.rgb),a.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS*.001)),TAU=2*Math.PI;
 const a=1.-Math.exp(-TAU*372/sampleRate),b=1.-Math.exp(-TAU*1460/sampleRate),c=1.-Math.exp(-TAU*3320/sampleRate),hp=Math.exp(-TAU*72/sampleRate);
 let r=0x359b1aab,l=0,m=0,h=0,x=0,y=0;
 // Rounded contact at .235s; lighter glass edge moment at .395s is outgoing
 // movement energy, not an acknowledgement, chime signal, or incoming call.
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;r^=r<<13;r^=r>>>17;r^=r<<5;
  const u=(r>>>0)/2147483648-1;l+=(u-l)*a;m+=(u-m)*b;h+=(u-h)*c;
  const body=(m-l)*1.42,edge=(h-m)*1.51;
  const pick=cap((t-.027)/.069)*(1.-cap((t-.148)/.071));
  let mix=pick*(.139*body+.096*edge);
  const d=t-.235;
  if(d>=0.){
   const at=1.-Math.exp(-d*1260);
   const pull=at*Math.exp(-d*104);
   const frame=Math.sin(TAU*282*d)*Math.exp(-d*42)*.26+Math.sin(TAU*644*d)*Math.exp(-d*74)*.129;
   const glass=Math.sin(TAU*1975*d)*Math.exp(-d*155)*.078+Math.sin(TAU*3103*d)*Math.exp(-d*226)*.041;
   mix+=pull*(.48*body+.66*edge)+at*(frame+glass);
  }
  const z=t-.395;
  if(z>=0.){
   const at=1.-Math.exp(-z*971);
   const brush=(.22*body+.27*edge)*at*Math.exp(-z*85);
   const glint=(Math.sin(TAU*840*z)*Math.exp(-z*62)*.081+Math.sin(TAU*1471*z)*Math.exp(-z*100)*.048)*at;
   mix+=brush+glint;
  }
  const q=.81*Math.tanh(mix*1.16);
  const w=hp*(y+q-x);x=q;y=w;
  const e=cap((out.length-1-i)/(sampleRate*.051));out[i]=w*e*e*(3-2*e);
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
