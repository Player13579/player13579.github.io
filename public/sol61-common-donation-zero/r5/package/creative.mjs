// GPT-6.1-Sol, newly authored donation debit film. No old artist equations.
export const VERSION='common-donation-sol61-quality-r5';
export const LIFE_E_MS=1200;
export const VISUAL_END_E_MS=1050;
export const PROFILE=Object.freeze({type:'action-smartphone',variants:Object.freeze(['donation-rational','donation-unjust']),
 linearFace:Object.freeze([0.115,0.035,0.245]),linearSeam:Object.freeze([1,0.78,0.93]),
 projectedSupportH:Object.freeze([-0.16,0.18,1.10,1.15]),pitch:-0.18,depthProjection:0.28,centerDepth:0.34});
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
// Artist-selected geometry: the outer tips bend toward the viewer on BOTH halves.
// Old R1 used signed z on each tip, leaving a coplanar rotating sheet.
export function buildFrame({ageEMs,H,variant='donation-rational',controls={}}) {
 if(!Number.isFinite(ageEMs)||!Number.isFinite(H)||H<=0||!PROFILE.variants.includes(variant)) throw new TypeError('Donation artist input invalid');
 const active=ageEMs>=0&&ageEMs<LIFE_E_MS;
 const grow=smooth(0,110,ageEMs),send=smooth(80,500,ageEMs),fold=smooth(260,760,ageEMs),collapse=smooth(800,1050,ageEMs);
 const envelope=grow*(1-smooth(790,1050,ageEMs));
 const peak=smooth(200,420,ageEMs)*(1-smooth(570,790,ageEMs));
 const energy=active && controls.source!==false ? envelope*(0.72+0.58*peak) : 0;
 const cx=0.22+0.39*send+0.055*collapse,cy=0.57+0.19*send;
 const w=0.23*grow*(1-0.28*collapse)*(1-collapse),h=0.135*grow*(1-0.10*send)*(1-0.58*collapse);
 const cp=Math.cos(PROFILE.pitch),sp=Math.sin(PROFILE.pitch);
 const vertex=(dx,dy,dz)=>[cx+dx,cy+dy*cp-dz*sp,PROFILE.centerDepth+dy*sp+dz*cp];
 const thetaL=0.10+0.92*fold,thetaR=0.16+1.18*fold;
 const points=[vertex(-w*Math.cos(thetaL),-h,w*Math.sin(thetaL)),vertex(-w*Math.cos(thetaL),h,w*Math.sin(thetaL)),
   vertex(0,-h,0),vertex(0,h,0),vertex(0,-h,0),vertex(0,h,0),
   vertex(w*Math.cos(thetaR),-h,w*Math.sin(thetaR)),vertex(w*Math.cos(thetaR),h,w*Math.sin(thetaR))];
 const panels=[];
 if(energy>0 && w>0 && h>0) for(let side=0;side<2;side++) {
   const vertices=points.slice(side*4,side*4+4);
   const n=cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0]));
   const nLength=length(n),normal=n.map(x=>x/nLength);
   const center=[0,1,2].map(i=>vertices.reduce((a,v)=>a+v[i],0)/4);
   const viewResponse=0.65+0.35*Math.abs(normal[2]);
   const panelEnergy=energy*viewResponse*(side===0?1:0.72);
   const opacity=envelope*(side===0?0.19:0.26);
   const moments=sourceMoments(panelEnergy,side,send,fold,opacity);
   panels.push(Object.freeze({vertices:Object.freeze(vertices.map(Object.freeze)),projected:Object.freeze(vertices.map(v=>Object.freeze(project(v)))),
     center:Object.freeze(center),normal:Object.freeze(normal),areaH2:nLength,energy:panelEnergy,opacity,front:vertices.every(v=>v[2]>0),
     meanRadiance:Object.freeze(moments.meanRadiance),radianceCentroid:Object.freeze(moments.centroid),peakLuminance:moments.peakLuminance,
     meanOpacity:moments.meanOpacity,
     uv:Object.freeze(side===0?[[0,1],[0,0],[0.5,1],[0.5,0]]:[[0.5,1],[0.5,0],[1,1],[1,0]])}));
 }
 const flux=panels.reduce((a,p)=>a+Y(p.meanRadiance)*p.areaH2,0);
 return Object.freeze({version:VERSION,ageEMs,H,variant,active,panels:Object.freeze(panels),flux,
   grow,send,fold,collapse,envelope,nearbyEnabled:flux>0&&controls.nearby!==false,
   observerEnabled:flux>0&&controls.observer!==false,projection:'orthographic artist field; screenY = height-.28depth'});
}
// Global UV: 0..1 across both halves. Chamfer the four OUTER corners, not the hinge.
export function materialAt(energy,u,v,{send=0,fold=0,opacity=0,coverage=1}={}) {
 if(![energy,u,v,send,fold,opacity,coverage].every(Number.isFinite)||energy<0||coverage<0||coverage>1) throw new TypeError('Invalid film material');
 const du=Math.min(u,1-u),dv=Math.min(v,1-v),edge=Math.min(du,dv,(du+dv-0.085)*0.7071067811865476);
 if(edge<=0)return {rgb:[0,0,0],alpha:0,edge};
 const perimeter=1-smooth(0.008,0.058,edge);
 const crease=1-smooth(0.018,0.073,Math.abs(u-0.5));
 const shoulder=smooth(0.032,0.070,Math.abs(u-0.5))*(1-smooth(0.070,0.145,Math.abs(u-0.5)));
 // A single wide transmission front crosses the film outward. No noise, particles or microtext.
 const front=0.14+0.72*send;
 const band=(1-smooth(0.045,0.14,Math.abs(u-front)))*smooth(0.10,0.30,v)*(1-smooth(0.70,0.90,v));
 const faceShade=(0.82+0.18*v)*(1-0.62*crease)*(1-0.18*fold);
 const rgb=PROFILE.linearFace.map((x,i)=>coverage*energy*(x*faceShade+PROFILE.linearSeam[i]*(0.80*perimeter+0.18*shoulder+0.14*band)));
 return {rgb,alpha:energy>0?coverage*opacity:0,edge};
}
export function panelColor(energy,u,v,coverage=1,phase={}) {return materialAt(energy,u,v,{...phase,coverage}).rgb;}
// Deterministic source integration; evaluate on prepare, never CPU-rasterize the frame.
// 24x24 midpoint integration per half binds receiver power and OBS to actual patterned material.
export function sourceMoments(energy,side,send,fold,opacity=0) {
 const N=24,mean=[0,0,0],weighted=[0,0],centroidDen={value:0};let maxLum=0,meanOpacity=0;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++) {
   const u=(side+(x+0.5)/N)/2,v=(y+0.5)/N,m=materialAt(energy,u,v,{send,fold,opacity});
   const lum=Y(m.rgb);for(let i=0;i<3;i++)mean[i]+=m.rgb[i]/(N*N);
   weighted[0]+=u*lum;weighted[1]+=v*lum;centroidDen.value+=lum;maxLum=Math.max(maxLum,lum);meanOpacity+=m.alpha/(N*N);
 }
 return {meanRadiance:mean,peakLuminance:maxLum,meanOpacity,centroid:centroidDen.value>0?weighted.map(x=>x/centroidDen.value):[side===0?0.25:0.75,0.5]};
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
   const strength=visibility*p.areaH2*receiverCos*emitterCos*support/(r*r+0.032);
   for(let i=0;i<3;i++)out[i]+=strength*albedo[i]*p.meanRadiance[i]/Math.PI;
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
   const response=Math.max(0,p.peakLuminance-0.62)*p.areaH2*visibleFractions[i]*(soft*0.019+narrow*0.010)*edge;
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
 u.set([frame.H,frame.panels[0]?.energy||0,frame.panels[1]?.energy||0,frame.envelope],4);
 u.set([frame.panels[0]?.opacity||0,frame.panels[1]?.opacity||0,frame.send,frame.fold],40);
 frame.panels.forEach((p,j)=>p.projected.forEach((v,i)=>u.set([...v,p.vertices[i][2],0],8+16*j+4*i)));
 return u;
}
export const SOURCE_WGSL=/* wgsl */`
struct DonationParams { view:vec4f, scale:vec4f, point:array<vec4f,8>, sourceSampler:vec4f };
@group(0) @binding(0) var<uniform> p:DonationParams;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f, @location(1) energy:f32, @location(2) opacity:f32 };
fn ease(a:f32,b:f32,x:f32)->f32 { let q=clamp((x-a)/(b-a),0.0,1.0);return q*q*(3.0-2.0*q); }
@vertex fn vs(@builtin(vertex_index) vertex:u32)->V {
 let index=array<u32,6>(0u,1u,2u,2u,1u,3u)[vertex%6u]+(vertex/6u)*4u;
 let uv=array<vec2f,8>(vec2f(0,1),vec2f(0,0),vec2f(.5,1),vec2f(.5,0),vec2f(.5,1),vec2f(.5,0),vec2f(1,1),vec2f(1,0))[index];
 let q=p.point[index].xy*p.scale.x;
 let pixel=vec2f(p.view.z+q.x,p.view.w-q.y);
 var out:V;out.position=vec4f(pixel/p.view.xy*vec2f(2,-2)+vec2f(-1,1),0,1);out.uv=uv;
 out.energy=select(p.scale.y,p.scale.z,vertex>=6u);
 out.opacity=select(p.sourceSampler.x,p.sourceSampler.y,vertex>=6u);return out;
}
@fragment fn fs(v:V)->@location(0) vec4f {
 let du=min(v.uv.x,1.0-v.uv.x);let dv=min(v.uv.y,1.0-v.uv.y);
 let edge=min(min(du,dv),(du+dv-.085)*.7071067811865476);
 let footprint=max(fwidth(edge),.000001);
 let coverage=ease(0.0,footprint,edge);
 let perimeter=1.0-ease(.008,.058,edge);
 let crease=1.0-ease(.018,.073,abs(v.uv.x-.5));
 let shoulder=ease(.032,.070,abs(v.uv.x-.5))*(1.0-ease(.070,.145,abs(v.uv.x-.5)));
 let front=.14+.72*p.sourceSampler.z;
 let band=(1.0-ease(.045,.14,abs(v.uv.x-front)))*ease(.10,.30,v.uv.y)*(1.0-ease(.70,.90,v.uv.y));
 let faceShade=(.82+.18*v.uv.y)*(1.0-.62*crease)*(1.0-.18*p.sourceSampler.w);
 let rgb=(vec3f(.115,.035,.245)*faceShade+vec3f(1,.78,.93)*(.80*perimeter+.18*shoulder+.14*band))*v.energy*coverage;
 return vec4f(rgb,coverage*v.opacity*select(0.0,1.0,v.energy>0.0));
}`;
// Optical ABI: view=(footPx.x,footPx.y,H,0), settings=(nearby,observer,0,0).
// Per panel: center+energy, normal+area, meanRadiance+peakLuminance, visibility+zeros.
// 160 bytes total. Visibility is qualified against the actual complete panel.
export function packOpticalUniform(frame,{footPx,visibleFractions}) {
 if(footPx.length!==2||!footPx.every(Number.isFinite)||visibleFractions.length!==frame.panels.length||visibleFractions.some(v=>!Number.isFinite(v)||v<0||v>1))throw new TypeError('Qualified optical inputs needed');
 const u=new Float32Array(40);u.set([...footPx,frame.H,0]);u.set([frame.nearbyEnabled?1:0,frame.observerEnabled?1:0,0,0],4);
 frame.panels.forEach((p,i)=>{const k=8+i*16;u.set([...p.center,p.energy],k);u.set([...p.normal,p.areaH2],k+4);u.set([...p.meanRadiance,p.peakLuminance],k+8);u.set([visibleFractions[i],0,0,0],k+12);});return u;
}
export const OPTICAL_WGSL=/* wgsl */`
struct OParams { view:vec4f, settings:vec4f, panel:array<vec4f,8> };
@group(0) @binding(0) var<uniform> o:OParams;
fn opticalEase(a:f32,b:f32,x:f32)->f32 {let q=clamp((x-a)/(b-a),0.0,1.0);return q*q*(3.0-2.0*q);}
@vertex fn opticalFull(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(q[i],0,1);
}
// Qualified neutral rough floor only; actual foot and source use the same projection.
// screenHeight = y-.28z; at y=0: z=(pixelY-footY)/(.28H).
@fragment fn nearbyFloor(@builtin(position) pix:vec4f)->@location(0) vec4f {
 if(o.settings.x<.5){return vec4f(0);}let h=o.view.z;
 let x=(pix.x-o.view.x)/h;let z=(pix.y-o.view.y)/(.28*h);
 if(z<.04||z>1.62){return vec4f(0);}let pos=vec3f(x,0,z);var rgb=vec3f(0);
 for(var i=0u;i<2u;i++){
  let center=o.panel[i*4u].xyz;let n=o.panel[i*4u+1u];let radiance=o.panel[i*4u+2u].xyz;
  if(n.w<=0.0){continue;}let d=center-pos;let r=length(d);if(r<=.000001||r>=1.02){continue;}
  let l=d/r;let receiverCos=max(0.0,l.y);let emitterCos=abs(dot(n.xyz,l));
  let support=1.0-opticalEase(.74,1.02,r);
  // Unobstructed preview fixture: visibility 1 is a qualified fixture property,
  // not source-alpha metadata. Later game receiver visibility is a separate input.
  let strength=n.w*receiverCos*emitterCos*support/(r*r+.032);
  rgb+=strength*vec3f(.6)*radiance/3.141592653589793;
 }return vec4f(rgb,0);
}
@fragment fn observerPSF(@builtin(position) pix:vec4f)->@location(0) vec4f {
 if(o.settings.y<.5){return vec4f(0);}let point=vec2f((pix.x-o.view.x)/o.view.z,(o.view.y-pix.y)/o.view.z);var rgb=vec3f(0);
 for(var i=0u;i<2u;i++){
  let c=o.panel[i*4u];let area=o.panel[i*4u+1u].w;let peak=o.panel[i*4u+2u].w;let vis=o.panel[i*4u+3u].x;
  let center=vec2f(c.x,c.y-.28*c.z);let d=point-center;let radial=length(d);
  if(area<=0.0||vis<=0.0||radial>=.20){continue;}
  let soft=exp(-d.x*d.x/(2.0*.064*.064)-d.y*d.y/(2.0*.042*.042));
  let narrow=exp(-d.x*d.x/(2.0*.092*.092)-d.y*d.y/(2.0*.014*.014));
  let edge=1.0-opticalEase(.16,.20,radial);
  let response=max(0.0,peak-.62)*area*vis*(soft*.019+narrow*.010)*edge;
  rgb+=response*vec3f(1,.78,.93);
 }return vec4f(rgb,0);
}`;
