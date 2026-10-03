// GPT-6.1-Sol: actual source-fed two-scale spread and route-aligned contact streak.
export const OBS_VERSION='donation-card-post-sol61-r1';
export const KERNEL=Object.freeze({nearRadius:1.6,farRadius:4,nearGain:.10,farGain:.045,streakGain:.52,arrivalRGB:Object.freeze([3,1.8,.35]),streakOffsets:Object.freeze([-18,-12,-8,-4,0,4,8,12,18]),streakWeights:Object.freeze([.04,.07,.11,.15,.26,.15,.11,.07,.04]),textureFetches:24,history:0});
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
  let offsets=array<f32,9>(-18.,-12.,-8.,-4.,0.,4.,8.,12.,18.);let weights=array<f32,9>(.04,.07,.11,.15,.26,.15,.11,.07,.04);
  var contact=0.;for(var i=0u;i<9u;i++){contact+=sourceAt(q+observer.route.xy*offsets[i]).a*weights[i];}
  scatter=(near*observer.gains.x+far*observer.gains.y+contact*vec3f(3.,1.8,.35)*observer.gains.z)*observerActive;
 }
 // R2 working RGB and exposure retained; tone mapping occurs exactly once after OBS.
 let rgb=1.-exp(-max(c.rgb+scatter,vec3f(0)));let alpha=max(c.a,max(rgb.r,max(rgb.g,rgb.b)));
 return vec4f(rgb,alpha);
}`;
export function responseCPU({q,axis=[1,0],sample,sourceOn=true,observerOn=true,intensity=1,age=1830,transmission=1}){
 if(!Array.isArray(q)||q.length!==2||!q.every(Number.isFinite)||!Array.isArray(axis)||axis.length!==2||!axis.every(Number.isFinite)||Math.abs(Math.hypot(...axis)-1)>1e-6||typeof sample!=='function'||typeof sourceOn!=='boolean'||typeof observerOn!=='boolean'||!Number.isFinite(intensity)||intensity<0||intensity>2||!Number.isFinite(age)||!Number.isFinite(transmission)||transmission<0||transmission>1)throw TypeError('Typed committed observer input required');
 if(!sourceOn||!observerOn||age<=0||age>=2800||!intensity||!transmission)return[0,0,0];
 const at=p=>{if(p[0]<0||p[0]>320||p[1]<0||p[1]>160)return[0,0,0,0];const a=sample(p);if(!Array.isArray(a)||a.length!==4||!a.every(n=>Number.isFinite(n)&&n>=0))throw TypeError('Finite nonnegative actual source sample required');return a.map(v=>v*transmission)};
 const dir=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],weights=[.25,.125,.125,.125,.125,.0625,.0625,.0625,.0625];let near=[0,0,0],far=[0,0,0],contact=0;
 for(let i=0;i<9;i++){const s=at(q.map((v,j)=>v+dir[i][j]*1.6));near=near.map((v,j)=>v+s[j]*weights[i])}
 for(let i=0;i<5;i++){const s=at(q.map((v,j)=>v+dir[i][j]*4));far=far.map((v,j)=>v+s[j]*(i===0?.4:.15))}
 for(let i=0;i<9;i++)contact+=at(q.map((v,j)=>v+axis[j]*KERNEL.streakOffsets[i]))[3]*KERNEL.streakWeights[i];
 return near.map((v,j)=>(v*.10+far[j]*.045+contact*KERNEL.arrivalRGB[j]*.52)*intensity);
}
export function presentCPU(material,scatter){if(![material,scatter].every(a=>Array.isArray(a)&&a.every(Number.isFinite))||material.length!==4||scatter.length!==3||material.some(v=>v<0)||material[3]>1||scatter.some(v=>v<0))throw TypeError('Finite HDR material/observer required');const rgb=scatter.map((v,i)=>1-Math.exp(-Math.max(0,material[i]+v)));return[...rgb,Math.max(material[3],...rgb)]}
export function postUniforms({width,height,ms,origin,recipient,source=true,obs=true,intensity=1}){
 const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 if(!Number.isSafeInteger(width)||width<1||!Number.isSafeInteger(height)||height<1||!Number.isFinite(ms)||!point(origin)||!point(recipient)||Math.hypot(recipient.x-origin.x,recipient.y-origin.y)<=1||typeof source!=='boolean'||typeof obs!=='boolean'||!Number.isFinite(intensity)||intensity<0||intensity>2)throw TypeError('Committed actual extent/receipt coordinates/clock/flags required');
 const d=Math.hypot(recipient.x-origin.x,recipient.y-origin.y),axis=[(recipient.x-origin.x)/d,(recipient.y-origin.y)/d];
 return new Float32Array([.10,.045,.52,intensity,width,height,source?1:0,obs?1:0,...axis,ms>0&&ms<2800?1:0,0]);
}
