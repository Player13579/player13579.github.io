// DVA gallery-only: performer-local fold alignment reflecting an already-finished common task.
export const VERSION_ID='dot-task-local-completion-r3';
export const DURATION_MS=1200,SFX_OFFSET_MS=0,SFX_DURATION_MS=470,UNIFORM_FLOATS=12;
export const EDITION=3,EDITION_LIMIT=5;
const finite=Number.isFinite,cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<186?'align':ageMs<443?'closure':'settle';
}
export function planSource(event,serverNow,viewerId){
 const off=reason=>({valid:false,active:false,phase:'off',reason,causalId:null,ageMs:0});
 if(!event||event.type!=='action-task'||event.variant!==''||!['download','upload'].includes(event.mode))return off('not-completed-common-task');
 if(typeof event.id!=='string'||!/^magic_.{1,174}$/.test(event.id)||typeof event.playerId!=='string'||!event.playerId)return off('missing-cause-owner');
 if(typeof viewerId!=='string'||!viewerId||viewerId!==event.playerId)return off('not-performer');
 if(![event.x,event.y,event.at,serverNow,event.targetX,event.targetY].every(finite)||event.at<946684800000||serverNow<946684800000||event.durationMs!==0||event.radius!==105||typeof event.targetId!=='string'||!event.targetId)return off('invalid-receipt-fields');
 if(event.at-serverNow>125)return off('future-receipt');
 const ageMs=serverNow-event.at,phase=phaseAt(ageMs);
 return {valid:true,active:phase!=='off',phase,reason:null,causalId:'task-local-completion:'+event.id,ageMs,startedAt:event.at,endsAt:event.at+DURATION_MS};
}
export function frameState({width,height,dpr=1,event,serverNow,viewerId,actorCenterCss,actorHeightCss=64,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}={}){
 if(![width,height,dpr,actorHeightCss].every(finite)||width<1||width>32768||height<1||height>32768||dpr<=0||dpr>8||actorHeightCss<8||actorHeightCss>2048||!Array.isArray(actorCenterCss)||actorCenterCss.length!==2||!actorCenterCss.every(finite))throw RangeError('viewport and actor fixture');
 const source=planSource(event,serverNow,viewerId),active=source.active&&sourceOn!==false&&mainOn!==false;
 const flags=(showActor!==false?1:0)+(observerOn!==false?2:0)+(reducedMotion?4:0);
 const uniforms=new Float32Array([width,height,dpr,Math.max(0,Math.min(1.2,source.ageMs*.001)),...actorCenterCss,actorHeightCss,flags,0,0,+active,0]);
 if(![...uniforms].every(finite))throw RangeError('uniform overflow');
 return {uniforms,source,active,phase:active?source.phase:'off'};
}
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\n\nfn absDistance(p:vec2f,a:vec2f,b:vec2f)->f32{\n let d=b-a;return length(p-a-d*sat(dot(p-a,d)/dot(d,d)));\n}\nfn fold(p:vec2f,tip:vec2f,axis:vec2f,side:f32,aa:f32)->vec2f{\n let d=p-tip;\n let q=vec2f(dot(d,axis),dot(d,vec2f(-axis.y,axis.x))*side);\n // This is a split wavefront, not a solid object. The outer fold has an\n // empty center, one short resolving edge and a translucent inner plane.\n let corner=vec2f(-5.4,-2.4);\n let distal=vec2f(-9.35,-.43);\n let inner=vec2f(-5.9,1.7);\n let edge=min(absDistance(q,vec2f(0.),corner),absDistance(q,corner,distal));\n let crease=absDistance(q,corner,inner);\n let band=fill(max(max(q.x,-8.8-q.x),abs(q.y+.65)-1.28),aa);\n return vec2f(fill(edge-.53,aa),max(fill(crease-.27,aa)*.89,band*.33));\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let bits=u32(u.actor.w);\n let t=u.view.w;\n let showSource=u.state.z>.5;\n let reduced=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let aa=clamp(.72*64./u.actor.z,.29,2.17);\n // Distances are relative to the existing right wrist, at a fixed scale.\n let hand=u.actor.xy+u.actor.z*vec2f(.213*ACTOR_ASPECT,.108);\n let q=(p-hand)*64./u.actor.z;\n let od=q-vec2f(15.6,-4.0);\n let cerulean=vec3f(.195,.521,.806);\n let dusk=vec3f(.248,.221,.561);\n let iris=vec3f(.643,.555,.953);\n let cool=vec3f(.676,.897,1.);\n let white=vec3f(.868,.967,1.);\n let time=t-.186;\n let press=smoothstep(-.012,.014,time)*(1.-smoothstep(.028,.149,time));\n var col=vec4f(0.);\n if(showSource&&q.x>-8.&&q.x<46.&&q.y>-34.&&q.y<25.&&t<.663){\n  let engage=smoothstep(.035,.186,t);\n  let amt=select(1.-engage,0.,reduced);\n  let aTip=vec2f(-.36,.25)+vec2f(-3.3,7.0)*amt;\n  let bTip=vec2f(.36,-.20)+vec2f(7.5,-5.3)*amt;\n  let aFold=fold(od,aTip,vec2f(.628,-.7782),-1.,aa);\n  let bFold=fold(od,bTip,vec2f(-.883,.46936),1.,aa);\n  let vanish=1.-smoothstep(.174,.254,t);\n  let awaken=smoothstep(.010,.061,t);\n  let foldMask=awaken*vanish;\n  col=over(ink(dusk,aFold.y*foldMask*.57),col);\n  col=over(ink(iris,aFold.x*foldMask*.79),col);\n  col=over(ink(cerulean,bFold.y*foldMask*.57),col);\n  col=over(ink(cool,bFold.x*foldMask*.82),col);\n  // One front travels through a widening curved membrane; its envelope\n  // collapses before it can look like an object remaining in the hand.\n  let launch=smoothstep(.180,.227,t);\n  let foldback=smoothstep(.294,.581,t);\n  let membrane=(1.-smoothstep(.255,.657,t))*launch;\n  let along=dot(od,vec2f(.896,-.444));\n  let across=dot(od,vec2f(.444,.896));\n  let u=select(smoothstep(.186,.437,t),.37,reduced);\n  let arch=3.3+13.9*u-5.7*foldback;\n  let width=1.4+7.8*u;\n  let s=across/width;\n  let fadeSide=1.-smoothstep(.63,1.02,abs(s));\n  let sweep=arch-arch*.82*s*s+(1.9-2.8*foldback)*s;\n  let rim=along-sweep;\n  let lightBand=line(rim,.39,.88*aa)*fadeSide;\n  let rear=1.-smoothstep(.26,4.3+u*1.2,abs(rim+1.07));\n  let film=rear*fadeSide*fill(-along-.73,aa);\n  let spectral=smoothstep(-.91,.67,s);\n  col=over(ink(mix(dusk,cerulean,spectral),film*membrane*.52),col);\n  col=over(ink(mix(iris,cool,spectral),lightBand*membrane*.84),col);\n  let fine=1.-smoothstep(.38,2.09,abs(rim+.33));\n  col=over(ink(white,fine*fadeSide*membrane*(.22+.3*press)),col);\n  let junction=fill(abs(od.x)*.79+abs(od.y)*1.14-2.96,aa)*press;\n  col=over(ink(white,junction*.83),col);\n  if(obs){\n   let atmosphere=1.-smoothstep(4.9,37.,dot(od,od));\n   col=over(ink(iris,atmosphere*press*.17),col);\n  }\n }\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let c=textureSampleLevel(tex,samp,uv,0.);\n  var lit=decode(c.rgb);\n  if(showSource){\n   let edgeLight=1.-smoothstep(1.5,5.6,length(q*vec2f(1.11,.94)-vec2f(2.9,-.7)));\n   lit=min(vec3f(1.),lit+cool*edgeLight*press*.17);\n  }\n  col=over(ink(lit,c.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";

export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),TAU=2*Math.PI;
 const low=1.-Math.exp(-TAU*510/sampleRate),mid=1.-Math.exp(-TAU*1330/sampleRate);
 const hi=1.-Math.exp(-TAU*2770/sampleRate),hp=Math.exp(-TAU*92/sampleRate);
 let seed=0x8f59b2ac,l=0,m=0,h=0,pre=0,carry=0;
 // One dry optical catch, followed by a brief widening brush. Sloping
 // partials keep it from sounding like a second task chime or a coin.
 const slopes=[[485,760,.17,62],[1408,1920,.125,88],[2314,830,.073,113]];
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const n=(seed>>>0)/2147483648-1;l+=(n-l)*low;m+=(n-m)*mid;h+=(n-h)*hi;
  const brush=(m-l)*2.14,air=(h-m)*1.9;
  const opening=cap((t-.021)/.058)*(1.-cap((t-.159)/.025));
  let x=opening*(.035*brush+.087*air)*(.6+.4*Math.sin(t*56)**2);
  const u=t-.186;
  if(u>=0.){
   const edge=(1.-Math.exp(-u*1850))*Math.exp(-u*254);
   const sheet=(1.-Math.exp(-u*66))*Math.exp(-u*29);
   let glass=0.;
   for(const [f,k,g,decay] of slopes)glass+=g*Math.sin(TAU*(f*u-k*u*u))*Math.exp(-u*decay);
   x+=edge*(.154*brush+.61*air)+(1.-Math.exp(-u*430))*glass+sheet*(.072*brush+.168*air);
  }
  const v=.83*Math.tanh(x*1.31),y=hp*(carry+v-pre);carry=y;pre=v;
  const tail=cap((out.length-1-i)/(sampleRate*.067));out[i]=y*tail*tail*(3-2*tail);
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
