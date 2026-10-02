// GPT-6.1-Sol, newly authored donation debit film. No old artist equations.
export const VERSION='common-donation-zero-sol61-r1';
export const LIFE_E_MS=1200;
export const VISUAL_END_E_MS=1050;
export const PROFILE=Object.freeze({type:'action-smartphone',variants:Object.freeze(['donation-rational','donation-unjust']),
 linearFace:Object.freeze([0.38,0.16,0.56]),linearSeam:Object.freeze([1,0.91,0.83]),
 projectedSupportH:Object.freeze([-0.10,0.20,0.90,1.00]),pitch:-0.28,depthProjection:0.28,centerDepth:0.16});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const length=v=>Math.hypot(...v);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const Y=c=>dot(c,[0.2126,0.7152,0.0722]);
export function validateSource(e) {
 if(!e || typeof e.id!=='string'||!e.id || e.type!==PROFILE.type || !PROFILE.variants.includes(e.variant) ||
   typeof e.playerId!=='string'||!e.playerId || ![e.x,e.y,e.at,e.donationResultDelta].every(Number.isFinite) ||
   e.durationMs!==0 || e.radius!==105 || e.targetX!==null || e.targetY!==null ||
   !['targetId','viewerId','objectId','mode','effectKind','completionKind'].every(k=>e[k]==='') ||
   e.markerCount!==1 || Math.abs(e.donationResultDelta)>0.0500001 ||
   Math.abs(e.donationResultDelta*100-Math.round(e.donationResultDelta*100))>1e-7 ||
   (e.variant==='donation-rational' ? e.donationResultDelta<0 : e.donationResultDelta>0)) return false;
 return true;
}
export function project(v) {return [v[0],v[1]-PROFILE.depthProjection*v[2]];}
export function buildFrame({ageEMs,H,variant='donation-rational',controls={}}) {
 if(!Number.isFinite(ageEMs)||!Number.isFinite(H)||H<=0||!PROFILE.variants.includes(variant)) throw new TypeError('Donation artist input invalid');
 const active=ageEMs>=0&&ageEMs<LIFE_E_MS;
 const grow=smooth(0,100,ageEMs),send=smooth(90,450,ageEMs),fold=smooth(320,690,ageEMs),collapse=smooth(760,1050,ageEMs);
 const envelope=grow*(1-smooth(820,1050,ageEMs));
 const peak=smooth(280,450,ageEMs)*(1-smooth(550,730,ageEMs));
 const energy=active && controls.source!==false ? envelope*(2.8+5.4*peak) : 0;
 const cx=0.20+0.32*send+0.045*collapse,cy=0.58+0.16*send;
 const w=0.18*grow*(1-0.52*fold)*(1-collapse),h=0.105*grow*(1-0.13*send);
 const theta=1.12*fold;
 const cp=Math.cos(PROFILE.pitch),sp=Math.sin(PROFILE.pitch);
 const vertex=(dx,dy,dz)=>[cx+dx,cy+dy*cp-dz*sp,PROFILE.centerDepth+dy*sp+dz*cp];
 const points=[vertex(-w*Math.cos(theta),-h,-w*Math.sin(theta)),vertex(-w*Math.cos(theta),h,-w*Math.sin(theta)),
   vertex(0,-h,0),vertex(0,h,0),vertex(0,-h,0),vertex(0,h,0),
   vertex(w*Math.cos(theta),-h,w*Math.sin(theta)),vertex(w*Math.cos(theta),h,w*Math.sin(theta))];
 const panels=[];
 if(energy>0 && w>0 && h>0) for(let side=0;side<2;side++) {
   const vertices=points.slice(side*4,side*4+4);
   const n=cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0]));
   const nLength=length(n),normal=n.map(x=>x/nLength);
   const center=[0,1,2].map(i=>vertices.reduce((a,v)=>a+v[i],0)/4);
   const viewResponse=0.30+0.70*Math.abs(normal[2]);
   panels.push(Object.freeze({vertices:Object.freeze(vertices.map(Object.freeze)),projected:Object.freeze(vertices.map(v=>Object.freeze(project(v)))),
     center:Object.freeze(center),normal:Object.freeze(normal),areaH2:nLength,energy:energy*viewResponse,front:center[2]>0,
     uv:Object.freeze(side===0?[[0,1],[0,0],[0.5,1],[0.5,0]]:[[0.5,1],[0.5,0],[1,1],[1,0]])}));
 }
 const flux=panels.reduce((a,p)=>a+p.energy*p.areaH2,0);
 return Object.freeze({version:VERSION,ageEMs,H,variant,active,panels:Object.freeze(panels),flux,
   grow,send,fold,collapse,nearbyEnabled:flux>0&&controls.nearby!==false,
   observerEnabled:flux>0&&controls.observer!==false,projection:'orthographic artist field; screenY = height-.28depth'});
}
export function panelColor(energy,u,v,coverage=1) {
 if(![energy,u,v,coverage].every(Number.isFinite)||energy<0||coverage<0||coverage>1) throw new TypeError('Invalid film color');
 const boundary=Math.min(u,1-u,v,1-v);
 const perimeter=1-smooth(0.025,0.10,boundary);
 const hinge=1-smooth(0.018,0.068,Math.abs(u-0.5));
 const band=(1-smooth(0.016,0.053,Math.abs(v-0.29)))+(1-smooth(0.016,0.053,Math.abs(v-0.71)));
 const seam=clamp(perimeter*0.68+hinge*0.93+band*0.33);
 return PROFILE.linearFace.map((x,i)=>energy*coverage*(x+(PROFILE.linearSeam[i]-x)*seam));
}
export function nearbyAt(frame,position,normal,albedo,visibility) {
 if(position.length!==3||normal.length!==3||albedo.length!==3||
   ![...position,...normal,...albedo,visibility].every(Number.isFinite)||Math.abs(length(normal)-1)>1e-5 ||
   albedo.some(x=>x<0||x>1)||visibility<0||visibility>1) throw new TypeError('Qualified receiver needed');
 const out=[0,0,0]; if(!frame.nearbyEnabled) return out;
 for(const p of frame.panels) {
   const d=sub(p.center,position),r=length(d);if(r>=1.02||r===0)continue;
   const l=d.map(x=>x/r);
   const receiverCos=Math.max(0,dot(normal,l)),emitterCos=Math.abs(dot(p.normal,l));
   const support=1-smooth(0.74,1.02,r);
   const strength=visibility*p.energy*p.areaH2*receiverCos*emitterCos*support/(r*r+0.032);
   for(let i=0;i<3;i++)out[i]+=strength*albedo[i]*PROFILE.linearSeam[i]/Math.PI;
 }return out;
}
export function observerAt(frame,point,visibleFractions) {
 if(point.length!==2||!point.every(Number.isFinite)||visibleFractions.length!==frame.panels.length||
   visibleFractions.some(v=>!Number.isFinite(v)||v<0||v>1))throw new TypeError('Visible-source OBS input needed');
 const out=[0,0,0];if(!frame.observerEnabled)return out;
 frame.panels.forEach((p,i)=>{
   const center=project(p.center),dx=point[0]-center[0],dy=point[1]-center[1];
   if(Math.hypot(dx,dy)>=0.20)return;
   const soft=Math.exp(-dx*dx/(2*0.064**2)-dy*dy/(2*0.042**2));
   const narrow=Math.exp(-dx*dx/(2*0.092**2)-dy*dy/(2*0.014**2));
   const edge=1-smooth(0.16,0.20,Math.hypot(dx,dy));
   const response=Math.max(0,p.energy*Y(PROFILE.linearSeam)-3.8)*p.areaH2*visibleFractions[i]*(soft*0.019+narrow*0.010)*edge;
   for(let k=0;k<3;k++)out[k]+=response*PROFILE.linearSeam[k];
 });return out;
}
export function synthesizeSfx(sampleRate=48000) {
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new TypeError('Invalid sample rate');
 const pcm=new Float32Array(Math.ceil(sampleRate*0.76));
 for(let i=0;i<pcm.length;i++) {
   const t=i/sampleRate;
   const tap=smooth(0,0.004,t)*(1-smooth(0.014,0.06,t));
   const outbound=smooth(0.035,0.075,t)*(1-smooth(0.34,0.51,t));
   const settle=smooth(0.42,0.47,t)*(1-smooth(0.61,0.76,t));
   const phase=2*Math.PI*(420*t+44*(1-Math.exp(-5*t)));
   pcm[i]=0.13*tap*Math.sin(2*Math.PI*990*t)+0.17*outbound*Math.sin(phase)+
     0.10*settle*(Math.sin(2*Math.PI*264*t)+0.20*Math.sin(2*Math.PI*396*t));
 }return pcm;
}
// 8 vertices, each vec4(projectedXH,projectedYH,proxyDepthH,reserved), two panel energies.
// Shared device/encoder/target host supplies actual backing dimensions and foot.
export function packSourceUniform(frame,{footPx,pixelWidth,pixelHeight}) {
 if(footPx.length!==2||![...footPx,pixelWidth,pixelHeight].every(Number.isFinite)||pixelWidth<=0||pixelHeight<=0)throw new TypeError('Target/capture geometry invalid');
 const u=new Float32Array(44);u.set([pixelWidth,pixelHeight,...footPx]);
 u.set([frame.H,frame.panels[0]?.energy||0,frame.panels[1]?.energy||0,0],4);
 frame.panels.forEach((p,j)=>p.projected.forEach((v,i)=>u.set([...v,p.vertices[i][2],0],8+16*j+4*i)));
 return u;
}
export const SOURCE_WGSL=/* wgsl */`
struct DonationParams { view:vec4f, scale:vec4f, point:array<vec4f,8>, filter:vec4f };
@group(0) @binding(0) var<uniform> p:DonationParams;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f, @location(1) energy:f32 };
fn ease(a:f32,b:f32,x:f32)->f32 { let q=clamp((x-a)/(b-a),0.0,1.0);return q*q*(3.0-2.0*q); }
@vertex fn vs(@builtin(vertex_index) vertex:u32)->V {
 let index=array<u32,6>(0u,1u,2u,2u,1u,3u)[vertex%6u]+(vertex/6u)*4u;
 let uv=array<vec2f,8>(vec2f(0,1),vec2f(0,0),vec2f(.5,1),vec2f(.5,0),vec2f(.5,1),vec2f(.5,0),vec2f(1,1),vec2f(1,0))[index];
 let q=p.point[index].xy*p.scale.x;
 let pixel=vec2f(p.view.z+q.x,p.view.w-q.y);
 var out:V;out.position=vec4f(pixel/p.view.xy*vec2f(2,-2)+vec2f(-1,1),0,1);out.uv=uv;
 out.energy=select(p.scale.y,p.scale.z,vertex>=6u);return out;
}
@fragment fn fs(v:V)->@location(0) vec4f {
 let boundary=min(min(v.uv.x,1.0-v.uv.x),min(v.uv.y,1.0-v.uv.y));
 let footprint=max(max(fwidth(v.uv.x),fwidth(v.uv.y)),0.000001);
 let coverage=ease(0.0,footprint,boundary);
 let rim=1.0-ease(.025,.10,boundary);
 let hinge=1.0-ease(.018,.068,abs(v.uv.x-.5));
 let bands=(1.0-ease(.016,.053,abs(v.uv.y-.29)))+(1.0-ease(.016,.053,abs(v.uv.y-.71)));
 let seam=clamp(rim*.68+hinge*.93+bands*.33,0.0,1.0);
 let rgb=mix(vec3f(.38,.16,.56),vec3f(1,.91,.83),seam)*v.energy*coverage;
 return vec4f(rgb,coverage*select(0.0,1.0,v.energy>0.0));
}`;
