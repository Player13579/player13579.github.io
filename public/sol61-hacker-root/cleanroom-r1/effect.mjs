export const VERSION='hacker-root-cleanroom-sol61-r1';
export const EVENT_DURATION_MS=1100;
export const DURATION_MS=EVENT_DURATION_MS;
export const SFX_OFFSET_MS=0;
export const SFX_ONSET_WINDOW_MS=100;
export const VARIANTS=Object.freeze(['all-operators','active-state','release']);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export function normalizeVariant(variant){if(!VARIANTS.includes(variant))throw new TypeError('Unknown HackerRoot variant');return variant;}
export function durationForVariant(variant){return normalizeVariant(variant)==='active-state'?null:variant==='release'?760:1100;}
export function phaseAt(elapsedMs,variant,{rootActive,stateElapsedMs}={}){
 normalizeVariant(variant);const durationMs=durationForVariant(variant),state=variant==='active-state';
 const clockMs=state?stateElapsedMs:elapsedMs;
 let suppressionReason=null;
 if(typeof rootActive!=='boolean')suppressionReason='explicit-root-state-required';
 else if(variant==='release'?rootActive:!rootActive)suppressionReason=variant==='release'?'reactivated-release-stale':'root-inactive';
 else if(!Number.isFinite(clockMs)||clockMs<0)suppressionReason='valid-source-or-cue-clock-required';
 const alive=!suppressionReason&&(state||clockMs<durationMs);
 const phase=suppressionReason?'suppressed':!alive?'ended':state?'active':variant==='release'?(clockMs<260?'unlatch':'withdraw'):clockMs<620?'grant-separation':'grant-latch';
 const envelope=alive?(state?1:variant==='release'?1-smooth(clockMs/760):smooth(clockMs/80)):0;
 return {variant,phase,alive,suppressionReason,clockKind:state?'source-state':'receipt-cue',clockMs:Number.isFinite(clockMs)?clockMs:null,elapsedMs:Number.isFinite(elapsedMs)?elapsedMs:null,stateElapsedMs:Number.isFinite(stateElapsedMs)?stateElapsedMs:null,durationMs,progress:durationMs===null?null:clamp((Number.isFinite(clockMs)?clockMs:0)/durationMs),envelope};
}
export function frameState({elapsedMs,variant,rootActive,stateElapsedMs,sourceEnabled=true,observerEnabled=true}={}){
 const p=phaseAt(elapsedMs,variant,{rootActive,stateElapsedMs});
 return {...p,mode:VARIANTS.indexOf(variant),rootActive:typeof rootActive==='boolean'?rootActive:null,sourceEnabled,observerEnabled,voiceKind:variant==='active-state'?'none':'finite-event',persistent:variant==='active-state',gameplayExpiryMs:null};
}
export function planSfxCue({variant,rootActive,stateElapsedMs,elapsedMs,sourceId,causeId,verify=false}={}){
 const p=phaseAt(elapsedMs,variant,{rootActive,stateElapsedMs});
 if(verify||variant==='active-state'||!p.alive||!(elapsedMs>0)||elapsedMs>SFX_ONSET_WINDOW_MS||typeof sourceId!=='string'||!sourceId||typeof causeId!=='string'||!causeId)return null;
 return {sourceId,causeId,variant,voiceKey:JSON.stringify([sourceId,causeId,variant]),durationMs:durationForVariant(variant),offsetMs:0,onsetWindowMs:SFX_ONSET_WINDOW_MS,requiresHostDeduplication:true};
}
export const SFX=Object.freeze({offsetMs:0,onsetWindowMs:SFX_ONSET_WINDOW_MS,policy:'first-completed-positive-cause-frame-within-window-else-skip-whole-cause',activeStateVoice:'none',channels:1,sampleRate:48000,kind:'original-synthetic-sliding-contact-and-latch-resonance',normalListening:'NOT_RUN'});
export function synthesizeSfx({variant,sampleRate=48000,verify=false}={}){
 normalizeVariant(variant);if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
 if(variant==='active-state')return {sampleRate,channels:[new Float32Array(0)],durationMs:0,muted:true,voiceEligible:false};
 const durationMs=durationForVariant(variant),pcm=new Float32Array(Math.round(sampleRate*durationMs/1000));
 if(!verify){let seed=0x4391ca23,low=0,band=0;
  const events=variant==='all-operators'?[0.38,0.49,0.60,0.71,0.81]:[0.035,0.11,0.18,0.25];
  for(let i=0;i<pcm.length;i++){const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const noise=(seed>>>0)/2147483648-1;low+=0.032*(noise-low);band+=0.25*(noise-band);const friction=band-low;
   const slideEnv=variant==='all-operators'?Math.exp(-Math.pow((t-0.30)/0.26,2)):Math.exp(-Math.pow((t-0.32)/0.21,2));
   let latch=0;for(let j=0;j<events.length;j++){const dt=t-events[j];if(dt>=0)latch+=(Math.sin(2*Math.PI*(410+j*137)*dt)*0.10+Math.sin(2*Math.PI*(1091+j*173)*dt)*0.055+friction*0.45)*Math.exp(-dt*65)*smooth(dt/0.001);}
   const tail=smooth((durationMs/1000-t)/0.12),head=smooth(t/0.004);
   pcm[i]=clamp((friction*slideEnv*0.14+low*slideEnv*0.12+latch)*tail*head,-0.9,0.9);
  }if(pcm.length){pcm[0]=0;pcm[pcm.length-1]=0;}
 }
 return {sampleRate,channels:[pcm],durationMs,muted:!!verify,voiceEligible:!verify};
}
export const WGSL=String.raw`struct Params { viewport:vec4f, clock:vec4f, actor:vec4f, flags:vec4f };
@group(0) @binding(0) var<uniform> u:Params;
struct VOut { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) index:u32)->VOut{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:VOut;o.position=vec4f(p[index],0.,1.);return o;}
fn g(x:f32,s:f32)->f32{return exp(-0.5*x*x/(s*s));}
fn box(p:vec2f,b:vec2f)->f32{let q=abs(p)-b;return length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.);}
@fragment fn fs(input:VOut)->@location(0) vec4f{
 let p=(input.position.xy-u.actor.xy)/u.actor.z;let t=u.clock.x;let mode=u.clock.y;let env=u.clock.z;let layer=u.flags.z;
 if(env<=0.||u.flags.x<0.5){return vec4f(0.);}
 let showBack=layer==0.||layer==1.;let showFront=layer==0.||layer==2.;
 var material=vec3f(0.);var optics=vec3f(0.);let tint=vec3f(0.18,0.73,0.66);
 for(var j=0;j<4;j++){
  let side=select(-1.,1.,j%2==1);let tier=select(-1.,1.,j>=2);let delay=f32(j)*0.11;
  var opening=1.;if(mode<0.5){opening=smoothstep(delay,delay+0.38,t);}else if(mode>1.5){opening=1.-smoothstep(delay*0.35,0.56+delay*0.35,t);}
  let cx=side*(0.12+0.24*opening);let cy=tier*0.18;
  let hw=0.018+0.12*opening;let hh=0.17;
  // Folded plane projection changes with its opening; the actor is unchanged.
  let q=p-vec2f(cx,cy);let shear=side*(0.46-0.26*opening);
  let local=vec2f(q.x-shear*q.y,q.y);let sdf=box(local,vec2f(hw,hh));
  let coverage=1.-smoothstep(-0.004,0.010,sdf);
  let innerFace=g(local.x+side*hw*0.36,hw*0.63)*(1.-smoothstep(hh*0.68,hh,abs(local.y)));
  let edge=g(sdf,0.008);
  let ridge=g(local.x-side*hw*0.30,0.012)*g(local.y,hh*0.76);
  let visibleSide=select(showBack,showFront,j==1||j==2);
  if(visibleSide){
   let opticalNormal=0.40+0.60*opening;
   material+=tint*(coverage*(0.13+0.15*innerFace)*opticalNormal+edge*0.19+ridge*0.34)*opening;
   optics+=tint*g(sdf,0.045)*(0.11*opening);
  }
  // A bounded conductive bridge couples the central source to each latched face.
  let bridgeReach=max(abs(cx)-hw,0.01);let ax=abs(p.x);
  let inSide=select(0.,1.,p.x*side>=0.);
  let pathY=cy*(ax/bridgeReach);let connection=opening*opening;
  let support=(1.-smoothstep(bridgeReach-0.02,bridgeReach+0.01,ax))*inSide;
  if(showFront){material+=tint*g(p.y-pathY,0.016)*support*connection*0.36;optics+=tint*g(p.y-pathY,0.044)*support*connection*0.045;}
 }
 // Source-owned central root seam is a finite section, never a full-body tint.
 if(showFront){
  let sourceHeight=0.24;let rootmask=(1.-smoothstep(sourceHeight*0.7,sourceHeight,abs(p.y)));
  let inputSupply=select(smoothstep(0.,0.16,t),1.,mode>0.5);
  material+=vec3f(0.48,0.92,0.79)*g(p.x,0.024)*rootmask*0.52*inputSupply;
  optics+=tint*g(p.x,0.061)*rootmask*0.09*inputSupply;
 }
 return vec4f((material+optics*u.flags.y)*env,0.);
}`;
export function createRenderer({device,format='bgra8unorm'}={}){
 if(!device)throw new TypeError('GPUDevice required');let ready=false,disposed=false;
 const module=device.createShaderModule({label:VERSION,code:WGSL});const blend={color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}};
 const pipeline=device.createRenderPipeline({label:VERSION,layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend}]},primitive:{topology:'triangle-list'}});
 const buffers=[0,1,2].map(i=>device.createBuffer({label:VERSION+'-'+i,size:64,usage:72}));const groups=buffers.map(buffer=>device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]}));
 const diagnosticsReady=module.getCompilationInfo().then(info=>{const messages=Array.from(info.messages,m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));if(messages.some(m=>m.type==='error'))throw Object.assign(Error('WGSL diagnostics failed'),{messages});if(!disposed)ready=true;return {messages,source:VERSION};});
 function render({encoder,view,width,height,elapsedMs,variant,rootActive,stateElapsedMs,actor,sourceEnabled=true,observerEnabled=true,layer='both'}={}){
  if(disposed)throw Error('renderer destroyed');if(!ready)throw Error('await diagnosticsReady before render');const f=frameState({elapsedMs,variant,rootActive,stateElapsedMs,sourceEnabled,observerEnabled});
  if(![width,height].every(Number.isFinite)||width<=0||height<=0)throw new RangeError('positive backing viewport required');actor=actor||{x:width/2,y:height/2,height:64};if(![actor.x,actor.y,actor.height].every(Number.isFinite)||actor.height<=0)throw new RangeError('actor');const index=['both','back','front'].indexOf(layer);if(index<0)throw new TypeError('layer');
  if(!f.alive||!sourceEnabled||f.envelope<=0)return 0;
  // Sustained geometry is static latched authority. The source clock is retained
  // for ownership/receipts, not used to generate repeated grants or expiry.
  const visualTime=f.persistent?0:f.clockMs/1000;
  device.queue.writeBuffer(buffers[index],0,new Float32Array([width,height,0,0,visualTime,f.mode,f.envelope,0,actor.x,actor.y,actor.height,0,1,observerEnabled?1:0,index,0]));
  const pass=encoder.beginRenderPass({label:VERSION+'-'+layer,colorAttachments:[{view,loadOp:'load',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,groups[index]);pass.draw(3);pass.end();return 1;
 }
 return {diagnosticsReady,render,destroy(){if(disposed)return;disposed=true;ready=false;for(const b of buffers)b.destroy();}};
}
