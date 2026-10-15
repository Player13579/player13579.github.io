export const VERSION='gravity-tempo-cleanroom-sol61-r5';
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
export const WGSL="struct Params { viewport:vec4f, clock:vec4f, actor:vec4f, flags:vec4f };\n@group(0) @binding(0) var<uniform> u:Params;\nstruct VOut { @builtin(position) position:vec4f };\n@vertex fn vs(@builtin(vertex_index) index:u32)->VOut{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:VOut;o.position=vec4f(p[index],0.,1.);return o;}\nfn gauss(x:f32,s:f32)->f32{return exp(-0.5*x*x/(s*s));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn compact(x:f32)->f32 {let a=max(1.-x*x,0.);return a*a;}\nfn ellipseColumn(n:f32,h:f32,d:f32)->f32 {let nh=n/h;let a=max(1.-nh*nh,0.);return (16./15.)*d*pow(a,2.5);}\nstruct Fold { y:f32,lean:f32,phase:f32,width:f32,H:f32,D:f32,travel:f32,transit:f32,kind:f32 };\nfn geometry(j:f32,t:f32,fast:bool)->Fold {\n let speed=select(.26,1.45,fast);let travel=fract(t*speed+j*.3333);let y=-.68+travel*1.35;\n let contact=compact(y/.52);let compression=1.+.6*contact;\n return Fold(y,select(-.32,.44,fast),j*1.6+t*speed*2.,select(.66,.62,fast),select(.080,.060,fast)*compression,select(.065,.045,fast)/compression,travel,smoothstep(0.,.10,travel)*(1.-smoothstep(.90,1.,travel)),0.);\n}\nfn blockedGeometry(t:f32)->Fold {\n let advance=smoothstep(0.,.18,t);let shed=smoothstep(.19,.75,t);let c=1.+.65*advance*(1.-shed);\n return Fold(.75-.25*advance+.38*shed,.025+.04*advance*(1.-shed),0.,.31,.045*c,.050/c,0.,1.-shed,1.);\n}\nfn foldCurve(s:f32,g:Fold)->vec2f {\n if(g.kind>.5){let u1=s/g.width;let a=max(1.-u1*u1,0.);return vec2f(g.y-g.lean*a*a,4.*g.lean*u1*a/g.width);}\n let a=s*5.+g.phase;return vec2f(g.y+g.lean*s+.09*sin(a),g.lean+.45*cos(a));\n}\nfn foldSecond(s:f32,g:Fold)->f32 {\n if(g.kind>.5){let u1=s/g.width;return 4.*g.lean/(g.width*g.width)*(1.-3.*u1*u1);}\n return -2.25*sin(s*5.+g.phase);\n}\nfn foldMetric(s:f32,q:vec2f,g:Fold)->vec2f {let c=foldCurve(s,g);let d=vec2f(s,c.x)-q;return vec2f(d.x+d.y*c.y,dot(d,d));}\nfn closestFold(q:vec2f,g:Fold)->vec2f {\n let extent=select(abs(g.lean)*g.width+.09,g.lean,g.kind>.5);\n if(abs(q.x)>g.width+g.H||abs(q.y-g.y)>extent+g.H){return vec2f(g.width,0.);}\n var bestS=-g.width;var bestD=foldMetric(bestS,q,g).y;let e=foldMetric(g.width,q,g);if(e.y<bestD){bestS=g.width;bestD=e.y;}\n let start=max(-g.width,q.x-g.H);let end=min(g.width,q.x+g.H);var lo=start;var low=foldMetric(lo,q,g);\n for(var cell=0u;cell<4u;cell++){let hi=start+f32(cell+1u)*((end-start)/4.);let high=foldMetric(hi,q,g);\n  if(low.x<=0.&&high.x>=0.){var a=lo;var b=hi;for(var step=0u;step<18u;step++){let mid=(a+b)*.5;let m=foldMetric(mid,q,g);if(m.x<=0.){a=mid;}else{b=mid;}}\n   let s=(a+b)*.5;let d=foldMetric(s,q,g).y;if(d<bestD){bestS=s;bestD=d;}}\n  lo=hi;low=high;\n }\n if(bestD>g.H*g.H){return vec2f(g.width,0.);}let c=foldCurve(bestS,g);let delta=q-vec2f(bestS,c.x);return vec2f(bestS,(delta.y-c.y*delta.x)/sqrt(1.+c.y*c.y));\n}\nfn sourceZ(px:f32,g:Fold)->f32 {if(g.kind>.5){return .12;}let roll=smoothstep(.32,.60,abs(px));return g.D*(1.-2.*roll);}\nfn layerFraction(u1:f32,depth:f32,px:f32,g:Fold,layer:f32)->f32 {\n if(layer==0.){return 1.;}let a=max(1.-u1*u1,0.);if(a<=0.){return 0.;}\n let z=sourceZ(px,g);let extent=depth*sqrt(a);let cut=min(abs(z)/extent,1.);\n let tail=(1.-cut)*(1.-cut)*(1.-cut)*(8.+9.*cut+3.*cut*cut)/16.;\n let front=select(tail,1.-tail,z>=0.);let back=select(1.-tail,tail,z>=0.);return select(back,front,layer==2.);\n}\nfn directFold(q:vec2f,g:Fold,layer:f32)->f32 {\n let physical=closestFold(q,g);let s=physical.x;let taper=compact(s/g.width);if(taper<=0.){return 0.;}\n let h=g.H*(.68+.32*cos(s*4.));let n=physical.y;\n let face=ellipseColumn(n,h,g.D)*layerFraction(n/h,g.D,q.x,g,layer);\n var core=0.;if(g.kind<.5){core=ellipseColumn(n+h*.58,.010,.012)*layerFraction((n+h*.58)/.010,.012,q.x,g,layer);}\n let crest=sat(.5+.5*cos(s*9.+g.travel*6.));let power=select(8.+6.8*crest,22.,g.kind>.5);\n let concentration=select(.65+.35*gauss(s,.22),1.,g.kind>.5);\n return (face*power+core*56.)*taper*g.transit*concentration;\n}\nfn opticalKernel(delta:vec2f)->f32 {let R:f32=.14;let a=max(1.-dot(delta,delta)/(R*R),0.);return (3./(3.141592653589793*R*R))*a*a;}\nfn redistributedFold(q:vec2f,g:Fold,layer:f32)->f32 {\n if(g.transit<=0.){return 0.;}let extent=select(abs(g.lean)*g.width+.09,g.lean,g.kind>.5);\n if(abs(q.y-g.y)>extent+g.H+.14){return 0.;}let start=max(-g.width,q.x-g.H-.14);let end=min(g.width,q.x+g.H+.14);if(end<=start){return 0.;}\n let sn=array<f32,16>(0.989400934992,0.944575023073,0.865631202388,0.755404408355,0.617876244403,0.458016777657,0.281603550779,0.0950125098376,-0.0950125098376,-0.281603550779,-0.458016777657,-0.617876244403,-0.755404408355,-0.865631202388,-0.944575023073,-0.989400934992);\n let sw=array<f32,16>(0.0271524594118,0.0622535239386,0.0951585116825,0.124628971256,0.149595988817,0.169156519395,0.182603415045,0.189450610455,0.189450610455,0.182603415045,0.169156519395,0.149595988817,0.124628971256,0.0951585116825,0.0622535239386,0.0271524594118);\n let fnodes=array<f32,8>(0.960289856498,0.796666477414,0.525532409916,0.183434642496,-0.183434642496,-0.525532409916,-0.796666477414,-0.960289856498);\n let fweights=array<f32,8>(0.000171142286571,0.0179386133515,0.139827855154,0.332940180655,0.332940180655,0.139827855154,0.0179386133515,0.000171142286571);\n let cnodes=array<f32,6>(0.932469514203,0.661209386466,0.238619186083,-0.238619186083,-0.661209386466,-0.932469514203);\n let cweights=array<f32,6>(0.00105402464857,0.0857254228979,0.404124618859,0.404124618859,0.0857254228979,0.00105402464857);\n\n let mid=(start+end)*.5;let scale=(end-start)*.5;var total=0.;\n for(var i=0u;i<16u;i++){\n  let s=mid+scale*sn[i];let c=foldCurve(s,g);let length=sqrt(1.+c.y*c.y);let normal=vec2f(-c.y,1.)/length;let curvature=foldSecond(s,g)/(length*length*length);\n  let h=g.H*(.68+.32*cos(s*4.));let taper=compact(s/g.width);let crest=sat(.5+.5*cos(s*9.+g.travel*6.));\n  let concentration=select(.65+.35*gauss(s,.22),1.,g.kind>.5);let sourceWeight=sw[i]*scale*taper*g.transit*concentration;\n  let power=select(8.+6.8*crest,22.,g.kind>.5);let facePower=(16./15.)*g.D*h*power;let corePower=(16./15.)*.012*.010*56.;var face=0.;var core=0.;\n  for(var k=0u;k<8u;k++){let n=h*fnodes[k];let pos=vec2f(s,c.x)+normal*n;let jac=length*(1.-curvature*n);face+=fweights[k]*jac*opticalKernel(q-pos)*layerFraction(fnodes[k],g.D,pos.x,g,layer);}\n  if(g.kind<.5){for(var k=0u;k<6u;k++){let n=-.58*h+.010*cnodes[k];let pos=vec2f(s,c.x)+normal*n;let jac=length*(1.-curvature*n);core+=cweights[k]*jac*opticalKernel(q-pos)*layerFraction(cnodes[k],.012,pos.x,g,layer);}}\n  total+=sourceWeight*(facePower*face+corePower*core);\n }\n return total;\n}\n@fragment fn fs(in:VOut)->@location(0) vec4f{\n let q=(in.position.xy-u.actor.xy)/u.actor.z;let t=u.clock.x;let mode=u.clock.y;let env=u.clock.z;let layer=u.flags.z;\n if(env<=0.||u.flags.x<.5){return vec4f(0.);}let blocked=mode>1.5;let fast=mode<.5;var material=0.;var optics=0.;\n if(blocked){\n  if(layer==1.){return vec4f(0.);}let g=blockedGeometry(t);\n  for(var i=0u;i<2u;i++){let side=select(-1.,1.,i==1u);let local=vec2f(q.y+.06,side*q.x);material+=directFold(local,g,layer);if(u.flags.y>0.){optics+=redistributedFold(local,g,layer);}}\n }else{\n  for(var j=0u;j<3u;j++){let g=geometry(f32(j),t,fast);material+=directFold(q,g,layer);if(u.flags.y>0.){optics+=redistributedFold(q,g,layer);}}\n }\n let tint=select(select(vec3f(.83,.50,.16),vec3f(.18,.78,.91),fast),vec3f(.68,.70,.57),blocked);\n let result=tint*(material*(1.-.15*u.flags.y)+optics*.15*u.flags.y)*env;return vec4f(result,0.);\n}\r\n";
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
