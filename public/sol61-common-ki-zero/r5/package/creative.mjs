// GPT-6.1-Sol R5 creative equations. Fictional coherent Ki field, no physical-energy claim.
// Ordinary and tenfold producer semantics and finite 1200 E-ms support are inherited unchanged.
export {supports, synthesizeSfx} from './common-ki-zero-sol61-preview-r4/package/creative.mjs';
export const VERSION = 'common-ki-sol61-r5';
export const LIFE_E_MS = 1200;
export const UNIFORM_BYTES = 416;
export const PROFILE = Object.freeze({type:'action-renki',variants:Object.freeze(['','tenfold']),
  supportH:Object.freeze([-.74,-.15,.74,1.12]),maxPlates:8,
  linearEdge:Object.freeze([.035,.22,1.10]),linearCore:Object.freeze([.48,1.45,2.05]),
  linearPeak:Object.freeze([2.15,2.55,2.65]),
  source:'paired inward folded emissive channels, two finite supply packets, abdominal consolidation'});
const sat=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const q=sat(x);return q*q*(3-2*q);};
const pulse=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const mix=(a,b,t)=>a+(b-a)*t;
const gauss=(x,s)=>Math.exp(-x*x/(2*s*s));
const luminance=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
// Coordinates are body-alpha H units, foot=(0,0), +y upward. Broad bent channels
// remain connected by overlapping beveled pieces; none are detached head icons.
export function buildFrame({ageEMs,variant='',H,controls={}}){
  if(!Number.isFinite(ageEMs)||!Number.isFinite(H)||H<=0||!PROFILE.variants.includes(variant))
    throw TypeError('Invalid R5 common Ki input');
  const active=ageEMs>=0&&ageEMs<LIFE_E_MS,src=active&&controls.source!==false;
  const strength=variant==='tenfold'?1.52:1;
  const growth=ease((ageEMs-20)/230),consolidate=pulse(ageEMs,490,650,840,1080);
  const release=ease((ageEMs-920)/280);
  const progress1=(ageEMs-110)/450,progress2=(ageEMs-355)/425;
  const plates=[];
  if(src) for(const side of [-1,1]){
    const wobble=.022*Math.sin(ageEMs*.006+side*.35)*(1-release);
    const inward=.065*consolidate;
    const nodes=[ [side*(.49+wobble),.105], [side*(.35+wobble*.6),.265],
      [side*(.285-inward*.35),.405], [side*(.145-inward*.5),.485],
      [side*.025,.575] ];
    for(let j=0;j<4;j++){
      const a=nodes[j],b=nodes[j+1],dx=b[0]-a[0],dy=b[1]-a[1];
      const q=(j+.5)/4;
      const env=pulse(ageEMs,j*34,j*34+105,930-j*24,1200-j*6);
      const packetA=8*(progress1-q),packetB=8*(progress2-q);
      const receive=j===3?consolidate:consolidate*(j/3)*.22;
      const width=[.045,.048,.054,.062][j]*(.82+.18*growth)*(1-.28*release);
      const radiance=strength*env*(1.1+1.45*receive);
      const z=[-.19,-.105,.075,.135][j]+side*.025;
      plates.push(Object.freeze({x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,
        angle:Math.atan2(dy,dx),halfLength:Math.hypot(dx,dy)*.5+.018,
        halfWidth:width,radiance,z,front:j>=2,packetA,packetB,receive,side,
        areaH2:4*(Math.hypot(dx,dy)*.5+.018)*width}));
    }
  }
  const sourceFlux=plates.reduce((sum,p)=>sum+p.radiance*p.areaH2*(1+2.4*gauss(p.packetA,.65)+1.9*gauss(p.packetB,.65)),0);
  const peak=plates.reduce((m,p)=>Math.max(m,p.radiance*(1+4.2*gauss(p.packetA,.65)+3.2*gauss(p.packetB,.65))),0);
  return Object.freeze({version:VERSION,ageEMs,H,variant,active,plates:Object.freeze(plates),
    sourceFlux,peak,nearbyEnabled:src&&controls.nearby!==false,
    observerEnabled:src&&controls.observer!==false&&peak>1.4,supportH:PROFILE.supportH});
}
// The cross-section is a broad faceted luminous fold: blue outer shoulder,
// cyan receiving face, and finite travelling near-white packet. It is not fog.
function plateSample(p,x,y){
  const dx=x-p.x,dy=y-p.y,c=Math.cos(p.angle),s=Math.sin(p.angle);
  const u=(c*dx+s*dy)/p.halfLength,v=(-s*dx+c*dy)/p.halfWidth;
  const metric=Math.max(Math.abs(u),Math.abs(v)+.20*Math.abs(u));
  const edge=1-ease((metric-.72)/.28);
  const face=1-ease((Math.abs(v)-.20)/.62);
  const bevel=.36+.64*face*(v<0?.76:1);
  const travel=(4.2*gauss(u-p.packetA,.28)+3.2*gauss(u-p.packetB,.32))*face;
  const receive=p.receive*(1-ease((Math.abs(u)-.1)/.8));
  return {edge,rgb:PROFILE.linearEdge.map((e,k)=>p.radiance*edge*(mix(e,PROFILE.linearCore[k],face)*bevel+
    PROFILE.linearPeak[k]*travel+PROFILE.linearCore[k]*receive*.65))};
}
export function sourceAt(frame,x,y,front=null){
  const out=[0,0,0];
  for(const p of frame.plates)if(front===null||p.front===front){const a=plateSample(p,x,y);for(let k=0;k<3;k++)out[k]+=a.rgb[k];}
  return out;
}
// Receiver basis [x,height,z], normalized outward normal, linear albedo;
// live host supplies world visibility and body-alpha mask separately.
export function nearbyAt(frame,position,normal,albedo,visibility=1){
  if(position.length!==3||normal.length!==3||albedo.length!==3||
    ![...position,...normal,...albedo,visibility].every(Number.isFinite)||
    Math.abs(Math.hypot(...normal)-1)>1e-5||visibility<0||visibility>1||albedo.some(v=>v<0||v>1))
    throw TypeError('Invalid R5 receiver');
  const out=[0,0,0];if(!frame.nearbyEnabled)return out;
  for(const p of frame.plates){
    const d=position.map((v,k)=>[p.x,p.y,p.z][k]-v),r2=d.reduce((s,v)=>s+v*v,0),r=Math.sqrt(r2);
    if(r===0||r>=.94)continue;
    const facing=Math.max(0,d.reduce((s,v,k)=>s+v*normal[k],0)/r);
    const transport=1+2.4*gauss(p.packetA,.65)+1.9*gauss(p.packetB,.65);
    const power=visibility*p.radiance*p.areaH2*transport*facing*(1-ease((r-.66)/.28))/(r2+.024);
    for(let k=0;k<3;k++)out[k]+=power*albedo[k]*PROFILE.linearCore[k]/Math.PI;
  }return out;
}
export function bodyReceivedAt(frame,x,height,bodyAlpha){
  if(!Number.isFinite(bodyAlpha)||bodyAlpha<0||bodyAlpha>1)throw TypeError('Body mask needed');
  return nearbyAt(frame,[x,height,0],[0,0,1],[.42,.46,.52]).map(v=>v*bodyAlpha*.78);
}
// OBS is visible-source local PSF. No screen-fixed glyph, generic circle,
// flare axis or ghost is introduced. Probes/visibility are supplied by host.
export function observerAt(frame,x,y,visibleFractions){
  if(!Array.isArray(visibleFractions)||visibleFractions.length!==frame.plates.length||visibleFractions.some(v=>!Number.isFinite(v)||v<0||v>1))
    throw TypeError('R5 source visibility proof needed');
  const out=[0,0,0];if(!frame.observerEnabled)return out;
  frame.plates.forEach((p,i)=>{
    const d2=(x-p.x)**2+(y-p.y)**2;if(d2>=.23**2)return;
    const kernel=(gauss(Math.sqrt(d2),.042)*.28+gauss(Math.sqrt(d2),.105)*.065)*(1-ease((Math.sqrt(d2)-.18)/.05));
    const power=Math.max(0,p.radiance*(1+2.4*gauss(p.packetA,.65)+1.9*gauss(p.packetB,.65))*luminance(PROFILE.linearCore)-1.4);
    for(let k=0;k<3;k++)out[k]+=visibleFractions[i]*power*p.areaH2*kernel*PROFILE.linearCore[k];
  });return out;
}
export function packSourceUniform(frame,footPx,front=null){
  if(!Array.isArray(footPx)||footPx.length!==2||!footPx.every(Number.isFinite))throw TypeError('Invalid foot');
  const out=new Float32Array(UNIFORM_BYTES/4);
  out.set([footPx[0],footPx[1],frame.H,0]);out.set([front===null?-1:Number(front),0,0,0],4);
  frame.plates.forEach((p,i)=>out.set([p.x,p.y,p.angle,p.halfLength,p.radiance,p.halfWidth,p.z,Number(p.front),p.packetA,p.packetB,p.receive,p.side],8+i*12));
  return out;
}
export const SOURCE_WGSL=/* wgsl */`
struct KiPlate { shape:vec4f, light:vec4f, flow:vec4f };
struct KiParams { footH:vec4f, sourceSampler:vec4f, plates:array<KiPlate,8> };
@group(0) @binding(0) var<uniform> ki:KiParams;
fn kiEase(x:f32)->f32{let q=clamp(x,0.,1.);return q*q*(3.-2.*q);}
fn kiGauss(x:f32,s:f32)->f32{return exp(-x*x/(2.*s*s));}
@fragment fn commonKiSource(@builtin(position) pixel:vec4f)->@location(0) vec4f{
 let point=vec2f((pixel.x-ki.footH.x)/ki.footH.z,(ki.footH.y-pixel.y)/ki.footH.z);
 var radiance=vec3f(0.);var coverage=0.;
 for(var i=0u;i<8u;i++){
  let p=ki.plates[i];if(p.light.x<=0.||(ki.sourceSampler.x>=0.&&abs(p.light.w-ki.sourceSampler.x)>.1)){continue;}
  let d=point-p.shape.xy;let c=cos(p.shape.z);let s=sin(p.shape.z);
  let u=dot(d,vec2f(c,s))/p.shape.w;let v=dot(d,vec2f(-s,c))/p.light.y;
  let metric=max(abs(u),abs(v)+.20*abs(u));let edge=1.-kiEase((metric-.72)/.28);
  let face=1.-kiEase((abs(v)-.20)/.62);let bevel=.36+.64*face*select(1.,.76,v<0.);
  let transport=(4.2*kiGauss(u-p.flow.x,.28)+3.2*kiGauss(u-p.flow.y,.32))*face;
  let receive=p.flow.z*(1.-kiEase((abs(u)-.1)/.8));
  radiance+=p.light.x*edge*(mix(vec3f(.035,.22,1.10),vec3f(.48,1.45,2.05),face)*bevel+
    vec3f(2.15,2.55,2.65)*transport+vec3f(.48,1.45,2.05)*receive*.65);
  coverage=max(coverage,edge);
 }
 return vec4f(radiance,coverage);
}`;
// Insert after the shared KiPlate/KiParams definitions in receiver shaders.
// This is the same settled light model as nearbyAt; host visibility remains
// separate from local imaging. Host defines kiSourceVisibility(source,receiver)
// from its actual occluders (fixture slab in preview). Body alpha applies once.
export const RECEIVING_WGSL=/* wgsl */`
fn kiReceiveEase(x:f32)->f32{let q=clamp(x,0.,1.);return q*q*(3.-2.*q);}
fn kiReceiveGauss(x:f32,s:f32)->f32{return exp(-x*x/(2.*s*s));}
fn kiReceived(position:vec3f,normal:vec3f,albedo:vec3f,visibility:f32)->vec3f{
 var rgb=vec3f(0.);
 for(var i=0u;i<8u;i++){
  let p=ki.plates[i];if(p.light.x<=0.){continue;}
  let source=vec3f(p.shape.xy,p.light.z);let delta=source-position;let r2=dot(delta,delta);let r=sqrt(r2);
  if(r>=.94||r==0.){continue;}
  let facing=max(0.,dot(delta,normal)/r);
  let transport=1.+2.4*kiReceiveGauss(p.flow.x,.65)+1.9*kiReceiveGauss(p.flow.y,.65);
  let support=1.-kiReceiveEase((r-.66)/.28);
  let power=visibility*kiSourceVisibility(source,position)*p.light.x*(4.*p.shape.w*p.light.y)*transport*facing*support/(r2+.024);
  rgb+=power*albedo*vec3f(.48,1.45,2.05)/3.14159265;
 }
 return rgb;
}`;
// Insert after shared KiPlate/KiParams plus bodyTexture + flags declarations.
// Five source probes measure body occlusion; front sources are fully visible.
// Side-obstacle visibility must be multiplied by the host before integration.
export const OBS_WGSL=/* wgsl */`
fn kiObsEase(x:f32)->f32{let q=clamp(x,0.,1.);return q*q*(3.-2.*q);}
fn kiObsGauss(x:f32,s:f32)->f32{return exp(-x*x/(2.*s*s));}
fn kiVisibleAt(point:vec2f)->f32{
 let pixel=vec2i(vec2f(ki.footH.x+point.x*ki.footH.z,ki.footH.y-point.y*ki.footH.z));
 let dims=textureDimensions(bodyTexture);let q=clamp(pixel,vec2i(0),vec2i(dims)-vec2i(1));
 return 1.-textureLoad(bodyTexture,q,0).a;
}
@fragment fn commonKiObserver(@builtin(position) pix:vec4f)->@location(0) vec4f{
 if(flags.x<.5){return vec4f(0.);}
 let point=vec2f((pix.x-ki.footH.x)/ki.footH.z,(ki.footH.y-pix.y)/ki.footH.z);
 var rgb=vec3f(0.);
 for(var i=0u;i<8u;i++){
  let p=ki.plates[i];let d2=dot(point-p.shape.xy,point-p.shape.xy);
  if(p.light.x<=0.||d2>=.23*.23){continue;}
  let c=cos(p.shape.z);let s=sin(p.shape.z);
  let probes=array<vec2f,5>(p.shape.xy,p.shape.xy+vec2f(c,s)*p.shape.w*.5,
   p.shape.xy-vec2f(c,s)*p.shape.w*.5,p.shape.xy+vec2f(-s,c)*p.light.y*.5,
   p.shape.xy-vec2f(-s,c)*p.light.y*.5);
  var vis=1.;if(p.light.w<.5){vis=0.;for(var j=0u;j<5u;j++){vis+=kiVisibleAt(probes[j])*.2;}}
  let radius=sqrt(d2);let kernel=(kiObsGauss(radius,.042)*.28+kiObsGauss(radius,.105)*.065)*(1.-kiObsEase((radius-.18)/.05));
  let strength=p.light.x*(1.+2.4*kiObsGauss(p.flow.x,.65)+1.9*kiObsGauss(p.flow.y,.65));
  let power=max(0.,strength*dot(vec3f(.48,1.45,2.05),vec3f(.2126,.7152,.0722))-1.4);
  rgb+=vis*power*(4.*p.shape.w*p.light.y)*kernel*vec3f(.48,1.45,2.05);
 }
 return vec4f(rgb,0.);
}`;
