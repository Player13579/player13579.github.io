export const VERSION='gravity-tempo-cleanroom-sol61-r1';
export const DURATION_MS=8000;
export const SFX_OFFSET_MS=0;
export const VARIANTS=Object.freeze(['accelerate','decelerate','blocked']);
export function normalizeVariant(v='accelerate'){
 if(v==='rational-natural-recovery-immune')return 'blocked';
 if(!VARIANTS.includes(v))throw new TypeError('Unknown Gravity tempo variant: '+v);
 return v;
}
export const durationForVariant=v=>normalizeVariant(v)==='blocked'?900:8000;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
export function phaseAt(elapsedMs,variant='accelerate'){
 const durationMs=durationForVariant(variant); if(!Number.isFinite(elapsedMs))throw new TypeError('finite elapsedMs required');
 const alive=elapsedMs>0&&elapsedMs<durationMs;
 const attack=variant==='blocked'||variant==='rational-natural-recovery-immune'?90:260;
 const release=durationMs===900?320:620;
 const envelope=alive?smooth(elapsedMs/attack)*smooth((durationMs-elapsedMs)/release):0;
 return {phase:elapsedMs<=0?'idle':elapsedMs>=durationMs?'ended':elapsedMs<attack?'arrival':elapsedMs>durationMs-release?'release':'sustain',elapsedMs,durationMs,progress:clamp(elapsedMs/durationMs),alive,envelope};
}
export function frameState({elapsedMs,variant='accelerate',sourceEnabled=true,observerEnabled=true}={}){
 variant=normalizeVariant(variant);const p=phaseAt(elapsedMs,variant); const blocked=variant==='blocked';
 return {...p,variant,mode:VARIANTS.indexOf(variant),tempo:blocked?1:variant==='accelerate'?2.5:0.38,
 bodyResponse:blocked?0:p.envelope*(sourceEnabled?1:0),transport:blocked?0:elapsedMs/1000*(variant==='accelerate'?1.45:0.26),blocked,sourceEnabled,observerEnabled};
}
export const SFX=Object.freeze({kind:'original-synthesized-pressure-and-cloth-friction',offsetMs:0,channels:1,variants:{accelerate:8000,decelerate:8000,blocked:900},playOncePerReceipt:true,verifyHardMute:true,normalListening:'NOT_RUN'});
export function synthesizeSfx({variant='accelerate',sampleRate=48000,verify=false}={}){
 variant=normalizeVariant(variant);if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
 const durationMs=durationForVariant(variant), n=Math.round(sampleRate*durationMs/1000), pcm=new Float32Array(n);
 if(!verify){let seed=0x6d71af93, low=0,mid=0,previous=0;
  for(let i=0;i<n;i++){const t=i/sampleRate,ms=t*1000; seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const noise=(seed>>>0)/2147483648-1;
   low+=0.012*(noise-low);mid+=0.16*(noise-mid);const rough=mid-low;
   const env=phaseAt(ms,variant).envelope;
   // Air compression with frictional lamella passage; no decorative pitch sweep.
   const rate=variant==='accelerate'?4.35:variant==='decelerate'?0.78:0;
   const cycle=0.5+0.5*Math.cos(2*Math.PI*rate*t);const flutter=0.18+0.82*Math.pow(cycle,5);
   const onset=Math.exp(-t*19)*(rough*0.26+low*0.4);
   const sustain=(rough*0.18*flutter+low*0.32)*(variant==='blocked'?0:1);
   const reject=variant==='blocked'?(Math.exp(-Math.pow((t-0.14)/0.055,2))*rough*0.8+Math.exp(-Math.pow((t-0.38)/0.13,2))*low*0.65):0;
   const out=env*(onset+sustain+reject);pcm[i]=clamp(out,-0.85,0.85);previous=out;
  }
  if(n){pcm[0]=0;pcm[n-1]=0;}
 }
 return {sampleRate,channels:[pcm],durationMs,muted:!!verify};
}
export const WGSL=String.raw`struct Params { viewport:vec4f, clock:vec4f, actor:vec4f, flags:vec4f };
@group(0) @binding(0) var<uniform> u:Params;
struct VOut { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) index:u32)->VOut{
 var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:VOut;o.position=vec4f(p[index],0.,1.);return o;
}
fn gauss(x:f32,s:f32)->f32{return exp(-0.5*x*x/(s*s));}
fn sat(x:f32)->f32{return clamp(x,0.,1.);}
@fragment fn fs(in:VOut)->@location(0) vec4f{
 let q=(in.position.xy-u.actor.xy)/u.actor.z;let t=u.clock.x;let mode=u.clock.y;let env=u.clock.z;let layer=u.flags.z;
 if(env<=0.||u.flags.x<0.5){return vec4f(0.);}
 var material=vec3f(0.);var optics=vec3f(0.);
 let fast=mode<0.5;let blocked=mode>1.5;
 let tint=select(vec3f(0.83,0.50,0.16),vec3f(0.18,0.78,0.91),fast);
 // Cross-section scale is in recipient heights. No world movement is applied.
 for(var j=0;j<3;j++){
  let lane=f32(j)-1.; let depth=select(-1.,1.,j==1); let isFront=depth>0.;
  let included=layer==0.|| (layer==1.&&!isFront)||(layer==2.&&isFront);
  if(!included){continue;}
  if(blocked){
   // Incoming compressed material stops at shoulder-side boundary and peels away.
   let advance=smoothstep(0.,0.18,t);let shed=smoothstep(0.19,0.75,t);
   let side=select(-1.,1.,j!=0);let cx=side*(0.64-0.18*advance+0.39*shed);
   let cy=-0.19+lane*0.12+0.24*shed;let dx=q.x-cx;
   let tangent=q.y-cy-0.45*side*dx;let span=gauss(dx,0.11*(1.-0.4*shed));
   let sheet=gauss(tangent,0.035+0.022*advance)*span;
   material+=vec3f(0.68,0.70,0.57)*sheet*(1.-shed)*0.65;
   optics+=vec3f(0.83,0.90,0.79)*gauss(tangent,0.085)*gauss(dx,0.15)*(1.-shed)*0.14;
  }else{
   let speed=select(0.26,1.45,fast); let travel=fract(t*speed+f32(j)*0.3333);
   let y=-0.68+travel*1.35;
   // Fold bends across the body, broad projected face and curled tapered ends.
   let bend=0.12*sin(q.x*7.+f32(j)*1.6+t*speed*2.);
   let lean=select(-0.32,0.44,fast);
   let center=y+lean*q.x+bend;
   let dy=q.y-center;let halfWidth=select(0.44,0.38,fast);
   let taper=1.-smoothstep(halfWidth*0.72,halfWidth,abs(q.x));
   let thickness=select(0.085,0.052,fast)*(0.68+0.32*cos(q.x*4.));
   let transit=smoothstep(0.,0.10,travel)*(1.-smoothstep(0.90,1.,travel));
   let face=gauss(dy,thickness)*taper*transit;
   let core=gauss(dy+thickness*0.58,0.010)*taper*transit;
   let crest=sat(0.5+0.5*cos(q.x*9.+travel*6.));
   let frontMask=select(1.,0.65+0.35*gauss(q.x,0.22),isFront);
   material+=tint*(face*(0.20+0.17*crest)+core*0.62)*frontMask;
   // Continuous analytic PSF width in height units; no separated source replicas.
   optics+=tint*gauss(dy,thickness+0.055)*taper*transit*0.15;
   // Recipient response is the same traveling pressure sheet crossing the body,
   // separate from the outer fold: compressed central contact face.
   let body=gauss(q.x,0.145)*gauss(dy,thickness*1.8)*transit;
   if(isFront){material+=tint*body*0.11;}
  }
 }
 let result=(material+optics*u.flags.y)*env;
 return vec4f(result,0.);
}`;
export function createRenderer({device,format='bgra8unorm'}={}){
 if(!device)throw new TypeError('GPUDevice required');
 let destroyed=false,ready=false;const module=device.createShaderModule({label:VERSION,code:WGSL});
 const blend={color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}};
 const pipeline=device.createRenderPipeline({label:VERSION,layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend}]},primitive:{topology:'triangle-list'}});
 const buffers=[0,1,2].map(i=>device.createBuffer({label:VERSION+'-'+i,size:64,usage:72}));
 const groups=buffers.map(buffer=>device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]}));
 const diagnosticsReady=module.getCompilationInfo().then(info=>{const messages=Array.from(info.messages,m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));if(messages.some(m=>m.type==='error'))throw Object.assign(Error('WGSL diagnostics failed'),{messages});if(!destroyed)ready=true;return {messages,source:VERSION,scope:'actual device when provided; CPU mock is not compilation'};});
 function render({encoder,view,width,height,elapsedMs,variant='accelerate',actor,sourceEnabled=true,observerEnabled=true,layer='both'}={}){
  if(destroyed)throw Error('renderer destroyed');if(!ready)throw Error('await diagnosticsReady before render');
  const state=frameState({elapsedMs,variant,sourceEnabled,observerEnabled});
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new RangeError('positive backing viewport required');
  actor=actor||{x:width/2,y:height/2,height:64};if(![actor.x,actor.y,actor.height].every(Number.isFinite)||actor.height<=0)throw new RangeError('valid actor center/height required');
  const index=['both','back','front'].indexOf(layer);if(index<0)throw new TypeError('unknown layer');
  if(!state.alive||!sourceEnabled)return 0;
  const data=new Float32Array([width,height,0,0,elapsedMs/1000,state.mode,state.envelope,0,actor.x,actor.y,actor.height,0,1,observerEnabled?1:0,index,0]);
  device.queue.writeBuffer(buffers[index],0,data);
  const pass=encoder.beginRenderPass({label:VERSION+'-'+layer,colorAttachments:[{view,loadOp:'load',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,groups[index]);pass.draw(3);pass.end();return 1;
 }
 return {diagnosticsReady,render,destroy(){if(destroyed)return;destroyed=true;ready=false;for(const b of buffers)b.destroy();}};
}
