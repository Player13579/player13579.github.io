// DVA gallery-only: performer-local wrist seam closure of an already-finished common task.
export const VERSION_ID='dot-task-local-completion-r2';
export const DURATION_MS=1200,SFX_OFFSET_MS=0,SFX_DURATION_MS=470,UNIFORM_FLOATS=12;
export const EDITION=2,EDITION_LIMIT=5;
const finite=Number.isFinite,cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<238?'align':ageMs<485?'closure':'settle';
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
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn joinFlash(t:f32)->f32{\n let d=t-.242;return smoothstep(-.008,.017,d)*(1.-smoothstep(.031,.184,d));\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let bits=u32(u.actor.w);\n let t=u.view.w;\n let showSource=u.state.z>.5;\n let reduced=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let aa=clamp(.72*64./u.actor.z,.29,2.17);\n // Right wrist of the matching actor fixture; no new hand or prop.\n let hand=u.actor.xy+u.actor.z*vec2f(.213*ACTOR_ASPECT,.108);\n let q=(p-hand)*64./u.actor.z;\n let pivot=vec2f(8.4,-5.4);\n let delta=q-pivot;\n let axis=vec2f(.54076,-.841177);\n let normal=vec2f(.841177,.54076);\n let a=dot(delta,axis);\n let b=dot(delta,normal);\n let touch=joinFlash(t);\n let wake=smoothstep(-.019,.094,t);\n let residue=1.-smoothstep(.527,.998,t);\n let violet=vec3f(.233,.13,.47);\n let wine=vec3f(.48,.15,.31);\n let rose=vec3f(.94,.47,.65);\n let pale=vec3f(1.,.842,.70);\n let silver=vec3f(.78,.904,1.);\n var col=vec4f(0.);\n if(showSource&&q.x>-7.&&q.x<38.&&q.y>-34.&&q.y<17.&&t<1.01){\n  // One local seam with a visible center interruption. Both open edges are\n  // already present by the hand. Their gap closes; nothing flies in or out.\n  let closed=smoothstep(.032,.248,t);\n  let profile=select(closed,smoothstep(.207,.269,t),reduced);\n  let open=(1.-profile);\n  let maxLen=16.4-3.1*smoothstep(.485,.916,t);\n  let u=sat(abs(a)/maxLen);\n  let bend=.0128*a*a-.34;\n  let side=select(-1.,1.,a>=0.);\n  let s=b-bend-side*open*2.64*(1.-u*.68);\n  let gap=6.18*open;\n  let lengthGate=max(-maxLen-a,a-maxLen);\n  let tear=gap-abs(a)+s*.21*open*side;\n  let body=1.24+1.97*pow(max(0.,sin(u*3.14159265)),.84);\n  let dist=max(max(lengthGate,tear),abs(s)-body*(.87+.13*open));\n  let shape=fill(dist,aa);\n  let edge=shape*line(s-body*.78,.42,.64*aa);\n  let fold=shape*line(s+.26*body,.35,.78*aa);\n  let socket=shape*line(tear,.43,aa*.70)*open;\n  let skin=mix(mix(violet,wine,.36+.54*u),rose,.38+.29*smoothstep(-1.5,2.6,s));\n  let transfer=smoothstep(.297,.598,t);\n  let tone=mix(skin,mix(rose,silver,.44),transfer*.76+touch*.17);\n  let speed=smoothstep(.240,.512,t);\n  let cursor=select(12.9*speed,1.5,reduced);\n  let wave=1.-smoothstep(1.65,5.96,abs(a-cursor));\n  let light=(.95*touch+.58*wave*transfer);\n  let closedTone=mix(pale,silver,transfer*.60);\n  col=over(ink(tone,shape*wake*residue*(.79+.15*touch)),col);\n  col=over(ink(mix(rose,pale,.38+.33*light),edge*wake*residue*.88),col);\n  col=over(ink(closedTone,fold*wake*residue*(.49+.49*light)),col);\n  col=over(ink(pale,socket*wake*residue*(.59+.31*touch)),col);\n  // A single localized flash appears only when the two inner tips contact.\n  let near=vec2f(a*.73,(b-bend)*1.29);\n  let join=fill((abs(near.x)*.79+abs(near.y))-3.38,aa);\n  let core=join*touch;\n  col=over(ink(closedTone,core*.88),col);\n  if(obs){\n   let fog=1.-smoothstep(8.,76.,dot(near,near));\n   col=over(ink(mix(rose,pale,.59),fog*touch*.22),col);\n  }\n }\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let c=textureSampleLevel(tex,samp,uv,0.);\n  var lit=decode(c.rgb);\n  if(showSource){\n   let glove=1.-smoothstep(2.3,7.2,length(q*vec2f(1.11,.94)));\n   lit=min(vec3f(1.),lit+mix(rose,pale,.32)*glove*touch*.23);\n  }\n  col=over(ink(lit,c.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),TAU=2*Math.PI;
 const a=1.-Math.exp(-TAU*730/sampleRate),b=1.-Math.exp(-TAU*2170/sampleRate),c=1.-Math.exp(-TAU*3850/sampleRate);
 const hp=Math.exp(-TAU*106/sampleRate);
 let seed=0x367fb639,l=0,m=0,h=0,pre=0,carry=0;
 // Two ribbons drawing closed sound as one tight seam; light, thin contact
 // at .242 s, not a reward chime or a second task-finished event.
 const modal=[[674,.28,74],[1221,.17,91],[2003,.11,125],[2851,.066,176]];
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const n=(seed>>>0)/2147483648-1;l+=(n-l)*a;m+=(n-m)*b;h+=(n-h)*c;
  const grip=(m-l)*1.56,seam=(h-m)*1.49;
  const draw=cap((t-.052)/.078)*(1.-cap((t-.190)/.049));
  let x=draw*(.088*grip+.139*seam)*(.62+.38*Math.sin(t*269)**2);
  const u=t-.242;
  if(u>=0.){
   const start=1.-Math.exp(-u*1470);
   const leading=start*Math.exp(-u*213);
   let tone=0.;
   for(const [f,g,decay] of modal)tone+=g*Math.sin(TAU*f*u)*Math.exp(-u*decay);
   x+=leading*(.38*grip+.50*seam)+start*tone;
  }
  const v=.77*Math.tanh(x*1.15);
  const y=hp*(carry+v-pre);carry=y;pre=v;
  const tail=cap((out.length-1-i)/(sampleRate*.045));out[i]=y*tail*tail*(3-2*tail);
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
