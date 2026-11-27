// DVA gallery-only: fixed contact with two planes registering into a single footprint.
export const VERSION_ID='dot-task-local-completion-r5';
export const DURATION_MS=1200,SFX_OFFSET_MS=0,SFX_DURATION_MS=470,UNIFORM_FLOATS=12;
export const EDITION=5,EDITION_LIMIT=5;
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
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\n\nfn absDistance(p:vec2f,a:vec2f,b:vec2f)->f32{\n let d=b-a;return length(p-a-d*sat(dot(p-a,d)/dot(d,d)));\n}\nfn fold(p:vec2f,tip:vec2f,axis:vec2f,side:f32,aa:f32)->vec2f{\n let d=p-tip;\n let q=vec2f(dot(d,axis),dot(d,vec2f(-axis.y,axis.x))*side);\n // This is a split wavefront, not a solid object. The outer fold has an\n // empty center, one short resolving edge and a translucent inner plane.\n let corner=vec2f(-5.4,-2.4);\n let distal=vec2f(-9.35,-.43);\n let inner=vec2f(-5.9,1.7);\n let edge=min(absDistance(q,vec2f(0.),corner),absDistance(q,corner,distal));\n let crease=absDistance(q,corner,inner);\n let band=fill(max(max(q.x,-8.8-q.x),abs(q.y+.65)-1.28),aa);\n return vec2f(fill(edge-.53,aa),max(fill(crease-.27,aa)*.89,band*.33));\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let bits=u32(u.actor.w);\n let t=u.view.w;\n let showSource=u.state.z>.5;\n let reduced=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let aa=clamp(.72*64./u.actor.z,.29,2.17);\n // Distances are relative to the existing right wrist, at a fixed scale.\n let hand=u.actor.xy+u.actor.z*vec2f(.213*ACTOR_ASPECT,.108);\n let q=(p-hand)*64./u.actor.z;\n let od=q-vec2f(7.1,-4.4);\n let cool=vec3f(.517,.815,.944);\n let deepBlue=vec3f(.155,.314,.543);\n let violet=vec3f(.419,.367,.655);\n let ivory=vec3f(.901,.959,.966);\n let slide=smoothstep(.077,.268,t);\n let flush=1.-slide;\n let roll=smoothstep(.316,.663,t);\n let press=smoothstep(.219,.268,t)*(1.-smoothstep(.338,.467,t));\n let birth=smoothstep(.031,.087,t);\n let fall=1.-smoothstep(.465,.769,t);\n var col=vec4f(0.);\n if(showSource&&t<.78&&abs(od.x)<17.&&abs(od.y)<22.){\n  // Both shapes remain in one local area; the thinner registration shape\n  // ends because its supporting area coincides with the main plane.\n  let a=vec2f(dot(od,vec2f(.913,.408)),dot(od,vec2f(-.408,.913)));\n  let b=a-vec2f(select(3.9,1.5,reduced)*flush,-select(7.2,3.,reduced)*flush);\n  let height=4.15-3.4*roll;\n  let faceD=max(abs(a.x-.28*a.y)-(8.0-roll*1.2),abs(a.y)-height);\n  let guideD=max(abs(b.x-.28*b.y)-7.4,abs(b.y)-2.55);\n  let face=fill(faceD,aa);\n  let edge=fill(faceD-1.15,aa)-face;\n  let guide=fill(guideD,aa)*flush;\n  let central=(1.-smoothstep(.46,5.3,abs(a.x+1.2)))*smoothstep(-height,height,a.y);\n  let top=smoothstep(-height,0.45*height,a.y);\n  let translucency=.35+.22*top;\n  let sheen=press*central;\n  col=over(ink(violet,guide*birth*.64),col);\n  col=over(ink(deepBlue,edge*birth*fall*.58),col);\n  col=over(ink(mix(mix(deepBlue,cool,top),ivory,sheen*.77),face*birth*fall*(translucency+sheen*.33)),col);\n  if(obs){col=over(ink(ivory,face*sheen*.21),col);}\n }\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let c=textureSampleLevel(tex,samp,uv,0.);\n  var lit=decode(c.rgb);\n  if(showSource){\n   let edgeLight=1.-smoothstep(1.5,5.6,length(q*vec2f(1.11,.94)-vec2f(2.9,-.7)));\n   lit=min(vec3f(1.),lit+cool*edgeLight*press*.17);\n  }\n  col=over(ink(lit,c.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";

export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),TAU=2*Math.PI;
 const low=1.-Math.exp(-TAU*510/sampleRate),mid=1.-Math.exp(-TAU*1330/sampleRate);
 const hi=1.-Math.exp(-TAU*2770/sampleRate),hp=Math.exp(-TAU*92/sampleRate);
 let seed=0x8f59b2ac,l=0,m=0,h=0,pre=0,carry=0;
 // One dry optical catch, followed by a short, stationary settling texture. Sloping
 // partials keep it from sounding like a second task chime or a coin.
 const slopes=[[420,510,.19,55],[1040,1120,.112,83],[1990,675,.040,117]];
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const n=(seed>>>0)/2147483648-1;l+=(n-l)*low;m+=(n-m)*mid;h+=(n-h)*hi;
  const brush=(m-l)*2.14,air=(h-m)*1.9;
  const opening=cap((t-.021)/.058)*(1.-cap((t-.159)/.025));
  let x=opening*(.035*brush+.087*air)*(.6+.4*Math.sin(t*56)**2);
  const u=t-.268;
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
