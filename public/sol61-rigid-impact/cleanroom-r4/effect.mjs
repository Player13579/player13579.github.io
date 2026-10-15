export const VERSION='rigid-item-impact-cleanroom-sol61-r4';
export const DURATION_MS=980;
export const SFX_OFFSET_MS=0;
export const SFX_ONSET_WINDOW_MS=45;
export const DEFAULT_VARIANT='rigid:body:0.30:0.00';
export const VARIANTS=Object.freeze(['sword:blade:2.00:0.00','sword:safe-side:0.30:0.00','firearm:body:0.20:0.00','invention:body:0.30:0.00','heavy:body:0.40:0.00','rigid:body:0.30:0.00','gbo:heavy:body:4.00:0.00']);
const KIND=Object.freeze(['sword','firearm','invention','heavy','rigid']);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export function parseVariant(variant=DEFAULT_VARIANT){
 if(typeof variant!=='string')throw new TypeError('variant must be receipt string');
 const m=/^(gbo:)?(sword|firearm|invention|heavy|rigid):(blade|safe-side|body):(\d+\.\d{2}):(-?\d+\.\d{2})$/.exec(variant);
 if(!m)throw new TypeError('invalid rigid impact receipt variant');
 const gbo=!!m[1],kind=m[2],contact=m[3],damage=Number(m[4]),luck=Number(m[5]),multiplier=gbo?10:1;
 if(luck< -1||luck>1)throw new RangeError('luck out of receipt range');
 if(kind==='sword'?!['blade','safe-side'].includes(contact):contact!=='body')throw new TypeError('kind/contact mismatch');
 const bounds=contact==='blade'?[2,2]:kind==='sword'?[0.12,0.51]:kind==='firearm'?[0.08,0.36]:[0.10,0.60];
 if(damage<bounds[0]*multiplier-0.00001||damage>bounds[1]*multiplier+0.00001)throw new RangeError('damage outside kind/contact bounds');
 const durationMs=contact==='blade'?640:kind==='heavy'?980:kind==='firearm'?740:820;
 return {variant,gbo,kind,kindIndex:KIND.indexOf(kind),contact,contactIndex:['blade','safe-side','body'].indexOf(contact),damage,luck,durationMs,graphicsMultiplier:gbo?2.2:1,damageMultiplier:multiplier};
}
export const durationForVariant=v=>parseVariant(v).durationMs;
export function phaseAt(elapsedMs,variant=DEFAULT_VARIANT){
 const v=parseVariant(variant);if(!Number.isFinite(elapsedMs))throw new TypeError('finite elapsedMs required');
 const alive=elapsedMs>0&&elapsedMs<v.durationMs;
 const attack=v.contact==='blade'?16:26,contactEnd=v.contact==='blade'?75:v.kind==='heavy'?142:105;
 const reboundEnd=v.contact==='blade'?250:v.kind==='heavy'?440:330;
 const envelope=alive?smooth(elapsedMs/attack)*smooth((v.durationMs-elapsedMs)/(v.durationMs-reboundEnd))*Math.exp(-elapsedMs/v.durationMs*0.65):0;
 return {phase:elapsedMs<=0?'idle':elapsedMs>=v.durationMs?'ended':elapsedMs<contactEnd?'compression':elapsedMs<reboundEnd?'recoil':'dissipation',alive,elapsedMs,durationMs:v.durationMs,progress:clamp(elapsedMs/v.durationMs),envelope};
}
export function frameState({elapsedMs,variant=DEFAULT_VARIANT,sourceEnabled=true,observerEnabled=true}={}){
 const v=parseVariant(variant),p=phaseAt(elapsedMs,variant),t=elapsedMs/1000;
 const compression=smooth(t/(v.kind==='heavy'?0.142:0.105));
 const recoil=smooth((t-(v.contact==='blade'?0.055:0.10))/(v.kind==='heavy'?0.40:v.contact==='blade'?0.335:0.29));
 return {...v,...p,compression,recoil,sourceEnabled,observerEnabled,incomingDirection:null,surfaceNormal:null,victimDisplacement:0};
}
export const SFX=Object.freeze({offsetMs:0,onsetWindowMs:SFX_ONSET_WINDOW_MS,onsetPolicy:'first-completed-positive-frame-within-window-else-skip-whole-cause',kind:'original-synthesized-contact-friction-and-damped-rigid-modes',channels:1,sampleRate:48000,normalListening:'NOT_RUN',oneShotPerReceipt:true,verifyHardMute:true});
export function synthesizeSfx({variant=DEFAULT_VARIANT,sampleRate=48000,verify=false}={}){
 const v=parseVariant(variant);if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
 const pcm=new Float32Array(Math.round(sampleRate*v.durationMs/1000));
 if(!verify){let seed=0x19d4267a,low=0,mid=0;
  const frequencies=v.contact==='blade'?[1180,1733,2489]:v.kind==='firearm'?[360,973,1411]:v.kind==='invention'?[287,681,1217]:v.kind==='heavy'?[74,167,319]:v.contact==='safe-side'?[179,431,829]:[211,587,1093];
  const damping=v.contact==='blade'?[14,22,35]:v.kind==='heavy'?[6,12,21]:[10,19,29];
  for(let i=0;i<pcm.length;i++){const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const n=(seed>>>0)/2147483648-1;low+=0.025*(n-low);mid+=0.28*(n-mid);
   const contactImpulse=(mid-low)*Math.exp(-t*(v.contact==='blade'?62:95))*(v.contact==='blade'?0.28:0.56);
   const friction=(mid-low)*Math.exp(-Math.pow((t-(v.contact==='blade'?0.07:0.10))/(v.contact==='blade'?0.055:0.04),2))*(v.contact==='blade'?0.14:0.065);
   let modal=0;for(let j=0;j<3;j++)modal+=Math.sin(2*Math.PI*frequencies[j]*t)*Math.exp(-damping[j]*t)/(j+1);
   const body=low*Math.exp(-t*(v.kind==='heavy'?11:24))*0.65;
   const env=smooth(t/0.0015)*smooth((v.durationMs/1000-t)/0.10);
   pcm[i]=clamp((contactImpulse+friction+modal*0.095+body)*env*(v.gbo?1.15:1),-0.92,0.92);
  }
  if(pcm.length){pcm[0]=0;pcm[pcm.length-1]=0;}
 }
 return {sampleRate,channels:[pcm],durationMs:v.durationMs,muted:!!verify};
}
export const WGSL="struct Params { viewport:vec4f, clock:vec4f, contact:vec4f, flags:vec4f };\n@group(0) @binding(0) var<uniform> u:Params;\nstruct VOut { @builtin(position) position:vec4f };\n@vertex fn vs(@builtin(vertex_index) index:u32)->VOut{\n let positions=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var out:VOut;out.position=vec4f(positions[index],0.,1.);return out;\n}\nfn g(x:f32,s:f32)->f32{return exp(-0.5*x*x/(s*s));}\nfn lens(p:vec2f,rx:f32,ry:f32)->f32{\n let n=p/vec2f(rx,ry);return exp(-2.0*dot(n,n)*dot(n,n));\n}\n// Finite graded oblate stress medium; prescribed section, not collision normal.\n// rho(s)=(1-s*s)*(.25+3.61704*s*s) within the unit ellipsoid, zero outside.\n// Same integrated density .720064 as the R3 .25core/.72radius + 1shell.\n// Smooth vanishing density makes normal chord scale as h^3 at the boundary.\nfn stressDepth(p:vec2f,rx:f32,ry:f32,rz:f32)->f32{\n let q=p/vec2f(rx,ry);let r2=dot(q,q);\n if(r2>=1.){return 0.;}\n let v=max(0.,1.-r2);let h=sqrt(v);let h3=h*h*h;\n let poly=(2./3.)*(.25+3.61704*r2)+(2./15.)*3.61704*v;\n return 18.*(2.*rz)*h3*poly;\n}\nfn stressLight(tau:f32)->f32{return 0.90*(1.-exp(-max(0.,tau)));}\n@fragment fn fs(input:VOut)->@location(0) vec4f{\n let p=(input.position.xy-u.contact.xy)/u.contact.z;\n let t=u.clock.x;let contactKind=u.clock.y;let kind=u.clock.z;let env=u.clock.w;\n if(env<=0.||u.flags.x<0.5){return vec4f(0.);}\n let compression=smoothstep(0.,select(0.105,0.142,kind==3.),t);\n let recoil=smoothstep(select(0.10,0.055,contactKind==0.),select(0.39,0.50,kind==3.),t);\n let layer=u.flags.z;let showBack=layer==0.||layer==1.;let showFront=layer==0.||layer==2.;\n var tauBack=0.;var tauFront=0.;var observer=vec3f(0.);\n let tint=select(vec3f(0.86,0.68,0.36),vec3f(0.64,0.80,0.91),contactKind==0.||kind==1.||kind==2.);\n // A display-oriented contact section, not an inferred world normal or trajectory.\n if(contactKind==0.){\n  let extension=0.19+0.45*compression;let gap=0.015+0.20*recoil;\n  let crease=stressDepth(p,0.035,extension,0.035);\n  tauBack+=crease*(1.-recoil)*1.20;\n  {\n   for(var side=0;side<2;side++){\n    let signum=select(-1.,1.,side==1);let center=vec2f(signum*gap,0.08*recoil);\n    let q=p-center;let bend=q.x-signum*0.19*q.y*q.y;\n    let width=0.11*(1.-0.40*recoil);\n    // Constant ellipsoid volume during prescribed local deformation.\n    let thickness=0.032*(0.11*0.19)/(width*extension);\n    let body=stressDepth(vec2f(bend,q.y),width,extension,thickness);\n    tauFront+=body*(1.-0.82*recoil);\n    if(showFront){observer+=tint*lens(vec2f(bend,q.y),0.19,extension*1.08)*0.12*(1.-recoil);}\n   }\n  }\n }else{\n  // Local compression broadens the contact face then opens four stress lobes.\n  let width=0.17+0.36*compression;let depth=0.29-0.12*compression;\n  let thickness=0.055*(0.17*0.29)/(width*depth);\n  let centerFace=stressDepth(p,width,depth,thickness)*(1.-recoil);\n  let crease=stressDepth(vec2f(p.x,p.y+0.06*(1.-pow(clamp(p.x/width,-1.,1.),2.))),width*0.62,0.04,0.028)*(1.-recoil);\n  tauBack+=centerFace*0.80+crease*0.65;\n  if(showBack){observer+=tint*lens(p,width+0.11,depth+0.09)*(1.-recoil)*0.12;}\n  {\n   for(var j=0;j<4;j++){\n    let angle=f32(j)*1.5707963+0.7853982;\n    let axis=vec2f(cos(angle),sin(angle));let tangent=vec2f(-axis.y,axis.x);\n    let center=axis*(0.12+0.47*recoil);\n    let q=p-center;let radial=dot(q,axis);let transverse=dot(q,tangent);\n    let rwidth=0.16-0.045*recoil;let twidth=0.20-0.05*recoil;\n    let thicknessLobe=0.040*(0.16*0.20)/(rwidth*twidth);\n    let face=stressDepth(vec2f(radial,transverse),rwidth,twidth,thicknessLobe);\n    let birth=smoothstep(0.025,0.085,t);let decay=1.-0.72*recoil;\n    tauFront+=face*birth*decay;\n    if(showFront){observer+=tint*lens(vec2f(radial,transverse),rwidth+0.07,twidth+0.07)*birth*decay*0.09;}\n   }\n  }\n }\n // Section selection filters output, never the physical medium's optical depth.\n // Front medium extinguishes back emission before the host's additive passes.\n // Equal source functions make the sum exact for total internal Beer transport.\n // This output still has no actor/background absorption under the preserved ABI.\n let backSource=stressLight(tauBack)*exp(-max(0.,tauFront));\n let frontSource=stressLight(tauFront);\n let source=tint*(select(0.,backSource,showBack)+select(0.,frontSource,showFront));\n return vec4f((source+observer*u.flags.y)*env,0.);\n}";
export function createRenderer({device,format='bgra8unorm'}={}){
 if(!device)throw new TypeError('GPUDevice required');let disposed=false,ready=false;
 const module=device.createShaderModule({label:VERSION,code:WGSL});
 const blend={color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}};
 const pipeline=device.createRenderPipeline({label:VERSION,layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend}]},primitive:{topology:'triangle-list'}});
 const buffers=[0,1,2].map(index=>device.createBuffer({label:VERSION+'-'+index,size:64,usage:72}));
 const groups=buffers.map(buffer=>device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]}));
 const diagnosticsReady=module.getCompilationInfo().then(info=>{const messages=Array.from(info.messages,m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));if(messages.some(m=>m.type==='error'))throw Object.assign(Error('WGSL diagnostics failed'),{messages});if(!disposed)ready=true;return {messages,source:VERSION};});
 function render({encoder,view,width,height,elapsedMs,variant=DEFAULT_VARIANT,actor,contact,sourceEnabled=true,observerEnabled=true,layer='both'}={}){
  if(disposed)throw Error('renderer destroyed');if(!ready)throw Error('await diagnosticsReady before render');
  const state=frameState({elapsedMs,variant,sourceEnabled,observerEnabled});if(![width,height].every(Number.isFinite)||width<=0||height<=0)throw new RangeError('positive backing viewport');
  actor=actor||{x:width/2,y:height/2,height:64};if(![actor.x,actor.y,actor.height].every(Number.isFinite)||actor.height<=0)throw new RangeError('actor');
  contact=contact||{x:actor.x,y:actor.y,radius:actor.height*(state.kind==='sword'?0.66:0.50)*state.graphicsMultiplier};
  if(![contact.x,contact.y,contact.radius].every(Number.isFinite)||contact.radius<=0)throw new RangeError('contact');
  const index=['both','back','front'].indexOf(layer);if(index<0)throw new TypeError('layer');if(!state.alive||!sourceEnabled)return 0;
  device.queue.writeBuffer(buffers[index],0,new Float32Array([width,height,0,0,elapsedMs/1000,state.contactIndex,state.kindIndex,state.envelope,contact.x,contact.y,contact.radius,0,1,observerEnabled?1:0,index,0]));
  const pass=encoder.beginRenderPass({label:VERSION+'-'+layer,colorAttachments:[{view,loadOp:'load',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,groups[index]);pass.draw(3);pass.end();return 1;
 }
 return {diagnosticsReady,render,destroy(){if(disposed)return;disposed=true;ready=false;for(const buffer of buffers)buffer.destroy();}};
}
