// Broadband, pupil-fixed optical spread. Approximation assumptions are in HOST-CONTRACT.md.
export const OBS_VERSION='donation-card-outward-glow-sol61-r6';
export const KERNEL=Object.freeze({nearRadius:1.6,farRadius:4,nearGain:.10,farGain:.045,streakGain:.18,sourceRGB:Object.freeze([42,32,12]),step:.75,radius:24,coreScale:5,history:0,textureFetches:144,axis:Object.freeze([1,0])});
export function rayWeight(offset){const r=Math.abs(offset);const z=Math.max(0,Math.min(1,(r-20)/4));return (1-z*z*(3-2*z))/(1+(offset/5)**2);}
export const RAY_TAPS=Object.freeze(Array.from({length:65},(_,i)=>{const offset=(i-32)*.75;return Object.freeze({offset,weight:rayWeight(offset)});}));
export const RAY_NORMALIZATION=RAY_TAPS.reduce((s,t)=>s+t.weight,0);
export const POST_WGSL=/*wgsl*/`
@group(0) @binding(0) var scene:texture_2d<f32>;
@group(0) @binding(1) var opticalSource:texture_2d<f32>;
@group(0) @binding(2) var linearSource:sampler;
struct Observation { gains:vec4f, geometry:vec4f, route:vec4f } // near/far/streak/intensity; width/height/sourceOn/obsOn; axisXY/alive/reserved
@group(0) @binding(3) var<uniform> observer:Observation;
struct V { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->V {let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var v:V;v.position=vec4f(a[i],0,1);return v;}
fn sourceAt(logicalPixel:vec2f)->vec4f {
 let uv=logicalPixel/vec2f(320.,160.);
 if(any(uv<vec2f(0)) || any(uv>vec2f(1))){return vec4f(0);}
 return max(textureSampleLevel(opticalSource,linearSource,uv,0.),vec4f(0));
}
@fragment fn fs(v:V)->@location(0)vec4f {
 let c=textureLoad(scene,vec2i(v.position.xy),0);let q=v.position.xy/observer.geometry.xy*vec2f(320.,160.);var scatter=vec3f(0);
 let observerActive=observer.geometry.z*observer.geometry.w*observer.route.z*observer.gains.w;
 if(observerActive>0.){
  let directions=array<vec2f,9>(vec2f(0),vec2f(1,0),vec2f(-1,0),vec2f(0,1),vec2f(0,-1),vec2f(1,1),vec2f(-1,1),vec2f(1,-1),vec2f(-1,-1));
  let nearWeights=array<f32,9>(.25,.125,.125,.125,.125,.0625,.0625,.0625,.0625);
  var near=vec3f(0);for(var i=0u;i<9u;i++){near+=sourceAt(q+directions[i]*1.6).rgb*nearWeights[i];}
  var far=vec3f(0);for(var i=0u;i<5u;i++){far+=sourceAt(q+directions[i]*4.).rgb*select(.15,.40,i==0u);}
  // Smooth, nonnegative broadband diffraction-envelope approximation.
  // The numerical support is apodized; there are no filled ray polygons or hard arm endpoints.
  var ray=0.;var norm=0.;
  for(var i=0u;i<65u;i++){
   let offset=(f32(i)-32.)*.75;let r=abs(offset);
   let z=clamp((r-20.)/4.,0.,1.);let weight=(1.-z*z*(3.-2.*z))/(1.+pow(offset/5.,2.));
   ray+=(sourceAt(q+vec2f(offset,0.)).a+sourceAt(q+vec2f(0.,offset)).a)*weight*.5;
   norm+=weight;
  }
  scatter=(near*observer.gains.x+far*observer.gains.y+ray/norm*vec3f(42.,32.,12.)*observer.gains.z)*observerActive;
 } else {
  // OBS-off diagnostic keeps the compact source's entire direct energy.
  // Source-off and expiry do not acquire energy from an independent procedural star.
  scatter=sourceAt(q).a*vec3f(42.,32.,12.)*.18*observer.geometry.z*observer.route.z;

 }
 // R2 working RGB and exposure retained; tone mapping occurs exactly once after OBS.
 let rgb=1.-exp(-max(c.rgb+scatter,vec3f(0)));let alpha=max(c.a,max(rgb.r,max(rgb.g,rgb.b)));
 return vec4f(rgb,alpha);
}`;
export function responseCPU({q,axis=[1,0],sample,sourceOn=true,observerOn=true,intensity=1,age=1830,transmission=1}){
 if(!Array.isArray(q)||q.length!==2||!q.every(Number.isFinite)||!Array.isArray(axis)||axis.length!==2||!axis.every(Number.isFinite)||Math.abs(Math.hypot(...axis)-1)>1e-6||typeof sample!=='function'||typeof sourceOn!=='boolean'||typeof observerOn!=='boolean'||!Number.isFinite(intensity)||intensity<0||intensity>2||!Number.isFinite(age)||!Number.isFinite(transmission)||transmission<0||transmission>1)throw TypeError('Typed committed observer input required');
 if(!sourceOn||!observerOn||age<=0||age>=2800||!intensity||!transmission)return[0,0,0];
 const at=p=>{if(p[0]<0||p[0]>320||p[1]<0||p[1]>160)return[0,0,0,0];const a=sample(p);if(!Array.isArray(a)||a.length!==4||!a.every(n=>Number.isFinite(n)&&n>=0))throw TypeError('Finite nonnegative actual source sample required');return a.map(v=>v*transmission)};
 const dir=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],weights=[.25,.125,.125,.125,.125,.0625,.0625,.0625,.0625];let near=[0,0,0],far=[0,0,0],ray=0;
 for(let i=0;i<9;i++){const s=at(q.map((v,j)=>v+dir[i][j]*1.6));near=near.map((v,j)=>v+s[j]*weights[i])}
 for(let i=0;i<5;i++){const s=at(q.map((v,j)=>v+dir[i][j]*4));far=far.map((v,j)=>v+s[j]*(i===0?.4:.15))}
 for(const t of RAY_TAPS)ray+=(at([q[0]+t.offset,q[1]])[3]+at([q[0],q[1]+t.offset])[3])*t.weight*.5;
 return near.map((v,j)=>(v*.10+far[j]*.045+ray/RAY_NORMALIZATION*KERNEL.sourceRGB[j]*.18)*intensity);
}
export function presentCPU(material,scatter){if(![material,scatter].every(a=>Array.isArray(a)&&a.every(Number.isFinite))||material.length!==4||scatter.length!==3||material.some(v=>v<0)||material[3]>1||scatter.some(v=>v<0))throw TypeError('Finite HDR material/observer required');const rgb=scatter.map((v,i)=>1-Math.exp(-Math.max(0,material[i]+v)));return[...rgb,Math.max(material[3],...rgb)]}
export function postUniforms({width,height,ms,origin,recipient,source=true,obs=true,intensity=1}){
 const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 if(!Number.isSafeInteger(width)||width<1||!Number.isSafeInteger(height)||height<1||!Number.isFinite(ms)||!point(origin)||!point(recipient)||Math.hypot(recipient.x-origin.x,recipient.y-origin.y)<=1||typeof source!=='boolean'||typeof obs!=='boolean'||!Number.isFinite(intensity)||intensity<0||intensity>2)throw TypeError('Committed actual extent/receipt coordinates/clock/flags required');
 const d=Math.hypot(recipient.x-origin.x,recipient.y-origin.y),axis=[(recipient.x-origin.x)/d,(recipient.y-origin.y)/d];
 return new Float32Array([.10,.045,.18,intensity,width,height,source?1:0,obs?1:0,...axis,ms>0&&ms<2800?1:0,0]);
}
