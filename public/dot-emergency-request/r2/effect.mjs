// Gallery-only DVA action-smartphone / emergency. Grip-anchored tap and folded uplink, never convening.
export const VERSION_ID='dot-emergency-request-r2';
export const DURATION_MS=4000,SFX_OFFSET_MS=0,SFX_DURATION_MS=680,UNIFORM_FLOATS=12;
export const EDITION=2,EDITION_LIMIT=5;
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
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn hem(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn rounded(p:vec2f,h:vec2f,r:f32)->f32{\n let q=abs(p)-(h-vec2f(r));\n return length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.)-r;\n}\nfn tick(t:f32,on:f32,tr:f32)->f32{\n let k=t-on;return smoothstep(-.009,.015,k)*(1.-smoothstep(.038,tr,k));\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let flags=u32(u.actor.w);\n let t=u.view.w;\n let aa=clamp(.70*64./u.actor.z,.32,2.20);\n let act=u.state.z>.5;\n let reduced=(flags&4u)!=0u;\n let obs=(flags&2u)!=0u;\n // Neutral actor source cell: right fist around (96,135) of 134x222.\n // Handset rotates around that near lower-left contact, not its own center.\n let grip=u.actor.xy+u.actor.z*vec2f(.215*ACTOR_ASPECT,.108);\n let q=(p-grip)*64./u.actor.z;\n var col=vec4f(0.);\n if(act&&q.x>-12.&&q.x<44.&&q.y>-51.&&q.y<17.){\n  let reveal=smoothstep(-.021,.158,t);\n  let ageVisibility=reveal*(1.-smoothstep(3.477,3.988,t));\n  let press=tick(t,.214,.200);\n  let returnToGrip=smoothstep(.021,.211,t);\n  let tab=select(-.28+.16*returnToGrip+.061*press,-.120,reduced);\n  let ct=cos(tab);let st=sin(tab);\n  let r0=vec2f(dot(q,vec2f(ct,st)),dot(q,vec2f(-st,ct)));\n  let r=r0-vec2f(5.0,-5.15);\n  let bodySdf=rounded(r,vec2f(6.5,10.8),2.4);\n  let glassSdf=rounded(r-vec2f(.14,-.025),vec2f(5.39,9.15),1.50);\n  let shadow=fill(rounded(r-vec2f(.72,1.15),vec2f(6.79,10.82),2.22),aa);\n  let silhouette=fill(bodySdf,aa);\n  let screen=fill(glassSdf,aa)*silhouette;\n  let ridge=hem(bodySdf-.19,.44,.72*aa);\n  let glassEdge=hem(glassSdf,.36,.73*aa);\n  let navy=vec3f(.026,.048,.109);\n  let cool=vec3f(.081,.210,.326);\n  let garnet=vec3f(.51,.119,.125);\n  let amber=vec3f(.94,.421,.171);\n  let ice=vec3f(.50,.82,.94);\n  let hot=vec3f(1.,.92,.78);\n  let highlight=smoothstep(-3.5,5.4,r.x+r.y*.38);\n  let bodyColor=mix(navy,cool,.40+.50*highlight);\n  let pending=smoothstep(.714,1.04,t)*(1.-smoothstep(3.137,3.60,t));\n  let fadeSide=(1.-smoothstep(.40,.81,t));\n  col=over(ink(navy,shadow*ageVisibility*.96),col);\n  col=over(ink(bodyColor,silhouette*ageVisibility*.99),col);\n  col=over(ink(mix(cool,ice,.34+.30*highlight),ridge*ageVisibility*.96),col);\n  col=over(ink(mix(navy,cool,.40+.30*highlight+.08*pending),screen*ageVisibility),col);\n  col=over(ink(mix(cool,ice,.16+.27*fadeSide),glassEdge*ageVisibility*.65),col);\n  let speaker=hem(r.y+8.03,.31,.68)*fill(abs(r.x)-1.95,aa)*screen;\n  col=over(ink(navy,speaker*ageVisibility),col);\n  // A single localized pressure mark bends the glass reflection, then the\n  // band runs from the mark to the top edge, within the screen mask only.\n  let sense=(r-vec2f(.80,4.98))*vec2f(1.,1.37);\n  let spot=1.-smoothstep(1.55,4.9,length(sense));\n  col=over(ink(mix(amber,hot,.68),spot*screen*ageVisibility*(.24*fadeSide+.75*press)),col);\n  let travel=smoothstep(.213,.370,t);\n  let barY=5.2-14.45*travel;\n  let dy=r.y-barY-r.x*.26;\n  let stroke=hem(dy,.56+.48*press,aa*.80)*screen;\n  let bed=1.-smoothstep(.78,3.35,abs(dy));\n  let cut=smoothstep(.207,.243,t)*(1.-smoothstep(.353,.433,t));\n  col=over(ink(amber,bed*screen*cut*.47),col);\n  col=over(ink(hot,stroke*cut),col);\n  // A single code-drawn vitreous flap starts at the same top edge. The two\n  // faces are folded halves of one local glint, not a second handset/packet.\n  let tail=smoothstep(.335,.666,t);\n  let leafGate=smoothstep(.321,.381,t)*(1.-smoothstep(.574,.801,t));\n  let e=select(tail,.24,reduced);\n  let lift=sin(3.14159265*e);\n  let cp=vec2f(5.9+10.2*e,-14.7-12.4*e);\n  let v=r0-cp;\n  let swing=.27+.76*e;\n  let a=vec2f(cos(swing),sin(swing));\n  let d=vec2f(dot(v,a),dot(v,vec2f(-a.y,a.x)));\n  let s=d.y-.39*d.x;\n  let u=d.x+.37*d.y;\n  let wing0=1.39+2.93*lift;\n  let wing1=1.12+1.9*(1.-e);\n  let planeWidth=select(wing0,wing1,s<0.);\n  let split=max(abs(u)-5.50,abs(s)-planeWidth*(.65+.35*(1.-smoothstep(-4.9,4.9,-u))));\n  let edge=fill(split,aa);\n  let rib=hem(s,.36,aa*.63)*edge;\n  let chamfer=fill(max(abs(u)-4.65,abs(s)-planeWidth+1.16),aa);\n  let sheetColor=mix(mix(garnet,amber,.65+.28*lift),mix(ice,hot,.45),smoothstep(-1.2,1.0,s));\n  col=over(ink(sheetColor,edge*leafGate*.89),col);\n  col=over(ink(mix(amber,hot,.63),rib*leafGate),col);\n  col=over(ink(ice,chamfer*leafGate*.25),col);\n  // Pending is one quiet silver reflection, not a separate confirmation.\n  let shineY=select(3.0-7.2*smoothstep(.92,3.04,t),.1,reduced);\n  let hold=smoothstep(.28,.86,highlight);\n  let shine=hem(r.y-shineY+.13*r.x,.37,.81)*screen*(.34+.26*hold);\n  col=over(ink(ice,shine*ageVisibility*pending*.55),col);\n  if(obs){\n   let p0=(r-vec2f(.4,2.5))*vec2f(1.,.83);\n   let veil=1.-smoothstep(13.,88.,dot(p0,p0));\n   col=over(ink(mix(amber,hot,.37),veil*press*.12),col);\n  }\n }\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((flags&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let a=textureSampleLevel(tex,samp,uv,0.);\n  col=over(ink(decode(a.rgb),a.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),TAU=2*Math.PI;
 const c0=1.-Math.exp(-TAU*424/sampleRate),c1=1.-Math.exp(-TAU*1190/sampleRate),c2=1.-Math.exp(-TAU*3130/sampleRate),c3=1.-Math.exp(-TAU*4120/sampleRate);
 const hp=Math.exp(-TAU*97/sampleRate);let rng=0x407d2577,f0=0,f1=0,f2=0,f3=0,old=0,raw=0;
 // One light screen contact; a softer seam travels outward with the folded
 // glint. No acknowledgement sound or later pending-mode repetition.
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
  const n=(rng>>>0)/2147483648-1;
  f0+=(n-f0)*c0;f1+=(n-f1)*c1;f2+=(n-f2)*c2;f3+=(n-f3)*c3;
  const casing=(f1-f0)*1.53,glass=(f2-f1)*1.39,film=(f3-f2)*1.62;
  const move=cap((t-.035)/.088)*(1.-cap((t-.167)/.032));
  let x=move*(.094*casing+.117*glass);
  const dt=t-.214;
  if(dt>=0){
   const onset=1.-Math.exp(-dt*1740);
   const frame=(Math.sin(TAU*539*dt)*Math.exp(-dt*74)*.210+Math.sin(TAU*1059*dt)*Math.exp(-dt*100)*.108+Math.sin(TAU*2007*dt)*Math.exp(-dt*149)*.052);
   x+=onset*(frame+Math.exp(-dt*185)*(.44*casing+.67*glass+.36*film));
  }
  const send=t-.344;
  if(send>=0){
   const fluff=(1.-Math.exp(-send*96))*Math.exp(-send*17);
   x+=fluff*(.15*glass+.13*film)*(.88+.12*Math.sin(send*543));
  }
  const earned=.76*Math.tanh(x*1.18),outVal=hp*(old+earned-raw);old=outVal;raw=earned;
  const fade=cap((out.length-1-i)/(sampleRate*.057));out[i]=outVal*fade*fade*(3-2*fade);
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
