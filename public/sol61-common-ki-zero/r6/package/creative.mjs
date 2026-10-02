// GPT-6.1-Sol R6: finite inbound curved fronts + abdominal condensation.
// Only supports/PCM are inherited technical/semantic interfaces; R5 wing art is replaced.
export {supports,synthesizeSfx} from '../common-ki-zero-sol61-preview-r4/package/creative.mjs';
export const VERSION='common-ki-sol61-quality-r6';
export const LIFE_E_MS=1200;
export const UNIFORM_BYTES=256;
export const PROFILE=Object.freeze({type:'action-renki',variants:Object.freeze(['','tenfold']),supportH:Object.freeze([-.60,-.12,.60,.82]),
 linearEdge:Object.freeze([.025,.13,.48]),linearCore:Object.freeze([.12,.75,1.55]),linearPeak:Object.freeze([.78,1.65,2.40]),maxCurves:3});
const sat=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,x)=>{const q=sat((x-a)/(b-a));return q*q*(3-2*q);};
const pulse=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),Y=v=>dot(v,[.2126,.7152,.0722]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const mul=(a,b)=>a.map(x=>x*b);
const paths=Object.freeze([
 {a:[-.47,.17,-.12],b:[-.42,.43,-.05],c:[-.025,.445,.13],start:70,end:570,width:.045,gain:1},
 {a:[.46,.09,-.10],b:[.37,.36,-.04],c:[.026,.432,.14],start:270,end:750,width:.041,gain:.86},
 {a:[.13,.035,-.18],b:[-.23,.16,-.11],c:[-.010,.420,.11],start:425,end:880,width:.035,gain:.76}
]);
export function curvePoint(p,q){return add(add(mul(p.a,(1-q)**2),mul(p.b,2*(1-q)*q)),mul(p.c,q*q));}
export function curveWindow(p,q){return smooth(p.head-.40,p.head-.30,q)*(1-smooth(p.head-.025,p.head+.045,q));}
export function buildFrame({ageEMs,H,variant='',controls={}}){
 if(![ageEMs,H].every(Number.isFinite)||H<=0||!PROFILE.variants.includes(variant))throw TypeError('Invalid R6 Ki inputs');
 const active=ageEMs>=0&&ageEMs<LIFE_E_MS,source=active&&controls.source!==false,strength=variant==='tenfold'?1.52:1;
 const curves=source?paths.map(p=>({...p,head:1.50*(ageEMs-p.start)/(p.end-p.start)-.12,
  energy:strength*p.gain*pulse(ageEMs,p.start,p.start+85,p.end-35,p.end+65)})):[];
 // Arrival is tied to each finite front crossing the actual endpoint q=1.
 const arrivals=paths.map(p=>p.start+(p.end-p.start)*1.12/1.50);
 const received=arrivals.reduce((s,t)=>s+smooth(t-25,t+65,ageEMs),0)/3;
 const resolve=smooth(890,1100,ageEMs),coreEnvelope=received*(1-resolve);
 const core={x:0,y:.435,z:.14,rx:(.075+.040*received)*(1-.52*resolve),ry:(.070+.068*received)*(1-.68*resolve),
  energy:source?strength*coreEnvelope*(.85+.95*received):0,fold:smooth(450,870,ageEMs),received,resolve};
 const frame={version:VERSION,ageEMs,H,variant,active,curves,core,nearbyEnabled:source&&controls.nearby!==false,observerEnabled:source&&controls.observer!==false,supportH:PROFILE.supportH};
 frame.emitters=sampleEmitters(frame);frame.sourceFlux=frame.emitters.reduce((s,e)=>s+Y(e.rgb)*e.area,0);
 if(frame.sourceFlux<=0){frame.nearbyEnabled=false;frame.observerEnabled=false;}
 return Object.freeze(frame);
}
function closest(p,x,y){let best=Infinity,bq=0;for(let j=0;j<16;j++){
 const a=curvePoint(p,j/16),b=curvePoint(p,(j+1)/16),d=sub(b,a),r=[x-a[0],y-a[1]];
 const u=sat((r[0]*d[0]+r[1]*d[1])/(d[0]*d[0]+d[1]*d[1])),q=(j+u)/16,c=add(a,mul(d,u));
 const dist=Math.hypot(x-c[0],y-c[1]);if(dist<best){best=dist;bq=q;}}
 return {q:bq,distance:best,z:curvePoint(p,bq)[2]};}
export function curveSample(p,q,distance){
 const window=curveWindow(p,q),width=p.width*(.68+.32*smooth(0,.9,q))*(.86+.14*smooth(p.head-.19,p.head-.015,q));
 const v=distance/width,edge=1-smooth(.70,1,v),face=1-smooth(.12,.77,v);
 const head=smooth(p.head-.16,p.head-.04,q)*(1-smooth(p.head-.01,p.head+.04,q));
 const fold=.70+.30*Math.cos((q-.18)*2.7);
 return PROFILE.linearEdge.map((e,k)=>p.energy*window*edge*((e+(PROFILE.linearCore[k]-e)*face)*fold+PROFILE.linearPeak[k]*head*.70));
}
export function coreAt(core,x,y){if(core.energy<=0)return [0,0,0];
 const dx=(x-core.x)/core.rx,dy=(y-core.y)/core.ry,skew=dx+.23*dy*(1-.35*core.fold);
 const metric=Math.abs(skew)+Math.abs(dy)**1.8,coverage=1-smooth(.72,1.0,metric);
 const ridge=1-smooth(.07,.29,Math.abs(skew-.12*dy)),shoulder=smooth(.20,.48,Math.abs(skew))*(1-smooth(.48,.75,Math.abs(skew)));
 const faces=skew<0?.70:1.0;
 return PROFILE.linearCore.map((c,k)=>core.energy*coverage*(c*faces*(.54+.24*core.received)+PROFILE.linearPeak[k]*(.28*ridge+.15*shoulder)));
}
export function sourceAt(f,x,y,front=null){const out=[0,0,0];if(x<-.60||x>.60||y<-.12||y>.82)return out;
 for(const p of f.curves){if(p.energy<=0)continue;const s=closest(p,x,y);if(front!==null&&(s.z>=0)!==front)continue;
  const rgb=curveSample(p,s.q,s.distance);for(let k=0;k<3;k++)out[k]+=rgb[k];}
 if(front===null||front===true){const rgb=coreAt(f.core,x,y);for(let k=0;k<3;k++)out[k]+=rgb[k];}return out;}
function sampleEmitters(f){const out=[];
 for(const p of f.curves)for(let j=0;j<16;j++){
  const q=(j+.5)/16,position=curvePoint(p,q),a=curvePoint(p,j/16),b=curvePoint(p,(j+1)/16);
  const area=Math.hypot(b[0]-a[0],b[1]-a[1])*p.width*2;
  const rgb=[0,0,0];for(const v of [-.75,-.25,.25,.75]){const c=curveSample(p,q,Math.abs(v)*p.width);for(let k=0;k<3;k++)rgb[k]+=c[k]/4;}
  if(Y(rgb)>0)out.push({position,area,rgb,front:position[2]>=0});
 }
 // Eight quadrature samples represent the full core, not a peak times solid area.
 if(f.core.energy>0)for(const dx of [-.6,-.2,.2,.6])for(const dy of [-.35,.35]){
  const x=f.core.x+dx*f.core.rx,y=f.core.y+dy*f.core.ry;
  out.push({position:[x,y,f.core.z],area:4*f.core.rx*f.core.ry/8,rgb:coreAt(f.core,x,y),front:true});
 }return out;}
export function nearbyAt(f,pos,normal,albedo,visibility=1){
 if(pos.length!==3||normal.length!==3||albedo.length!==3||![...pos,...normal,...albedo,visibility].every(Number.isFinite)||Math.abs(Math.hypot(...normal)-1)>1e-5||visibility<0||visibility>1||albedo.some(x=>x<0||x>1))throw TypeError('Qualified R6 receiver required');
 const out=[0,0,0];if(!f.nearbyEnabled)return out;for(const e of f.emitters){const d=sub(e.position,pos),r=Math.hypot(...d);if(r===0||r>=.88)continue;
  const gain=visibility*e.area*Math.max(0,dot(d,normal)/r)*(1-smooth(.62,.88,r))/(r*r+.027)/Math.PI;
  for(let k=0;k<3;k++)out[k]+=gain*albedo[k]*e.rgb[k];}return out;}
export function bodyReceivedAt(f,x,y,alpha){if(!Number.isFinite(alpha)||alpha<0||alpha>1)throw TypeError('Actual body alpha required');return nearbyAt(f,[x,y,0],[0,0,1],[.42,.46,.52]).map(x=>x*alpha*.78);}
export function observerAt(f,x,y,visibleFractions){if(visibleFractions.length!==f.emitters.length||visibleFractions.some(v=>!Number.isFinite(v)||v<0||v>1))throw TypeError('Qualified R6 emitter visibility required');
 const out=[0,0,0];if(!f.observerEnabled)return out;f.emitters.forEach((e,i)=>{const r=Math.hypot(x-e.position[0],y-e.position[1]);if(r>=.19)return;
  const k=(Math.exp(-r*r/(2*.043**2))*.24+Math.exp(-r*r/(2*.095**2))*.045)*(1-smooth(.14,.19,r));
  const gain=visibleFractions[i]*e.area*Math.max(0,Y(e.rgb)-.28)*k;
  for(let j=0;j<3;j++)out[j]+=gain*e.rgb[j];});return out;}
export function packSourceUniform(f,footPx,front=null){if(!Array.isArray(footPx)||footPx.length!==2||!footPx.every(Number.isFinite))throw TypeError('Qualified actual foot required');const u=new Float32Array(64);u.set([...footPx,f.H,front===null?-1:Number(front)]);
 u.set([f.core.x,f.core.y,f.core.rx,f.core.ry],4);u.set([f.core.energy,f.core.fold,f.core.received,f.core.resolve],8);u.set([0,0,0,0],12);
 f.curves.forEach((p,i)=>{const k=16+i*16;u.set([...p.a,p.width],k);u.set([...p.b,p.energy],k+4);u.set([...p.c,p.head],k+8);u.set([0,0,0,0],k+12);});return u;}
export const SHARED_WGSL=/*wgsl*/`
struct KiCurve {a:vec4f,b:vec4f,c:vec4f,padding:vec4f};
struct KiParams {footH:vec4f,coreShape:vec4f,coreLight:vec4f,padding:vec4f,curves:array<KiCurve,3>};
@group(0) @binding(0) var<uniform> ki:KiParams;
fn ks(a:f32,b:f32,x:f32)->f32{let q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
fn kp(p:KiCurve,q:f32)->vec3f{return p.a.xyz*(1.-q)*(1.-q)+p.b.xyz*2.*(1.-q)*q+p.c.xyz*q*q;}
fn curveRadiance(p:KiCurve,q:f32,distance:f32)->vec3f{
 let head=p.c.w;let window=ks(head-.40,head-.30,q)*(1.-ks(head-.025,head+.045,q));
 let width=p.a.w*(.68+.32*ks(0.,.9,q))*(.86+.14*ks(head-.19,head-.015,q));
 let v=distance/width;let edge=1.-ks(.70,1.,v);let face=1.-ks(.12,.77,v);
 let front=ks(head-.16,head-.04,q)*(1.-ks(head-.01,head+.04,q));let fold=.70+.30*cos((q-.18)*2.7);
 return p.b.w*window*edge*(mix(vec3f(.025,.13,.48),vec3f(.12,.75,1.55),face)*fold+vec3f(.78,1.65,2.40)*front*.70);
}
fn coreRadiance(point:vec2f)->vec3f{
 if(ki.coreLight.x<=0.){return vec3f(0.);}let d=(point-ki.coreShape.xy)/ki.coreShape.zw;
 let skew=d.x+.23*d.y*(1.-.35*ki.coreLight.y);let metric=abs(skew)+pow(abs(d.y),1.8);let cov=1.-ks(.72,1.,metric);
 let ridge=1.-ks(.07,.29,abs(skew-.12*d.y));let shoulder=ks(.20,.48,abs(skew))*(1.-ks(.48,.75,abs(skew)));
 let faces=select(1.,.70,skew<0.);
 return ki.coreLight.x*cov*(vec3f(.12,.75,1.55)*faces*(.54+.24*ki.coreLight.z)+vec3f(.78,1.65,2.40)*(.28*ridge+.15*shoulder));
}
fn commonSource(point:vec2f,frontFilter:f32)->vec3f{
 if(point.x<-.60||point.x>.60||point.y<-.12||point.y>.82){return vec3f(0.);}var rgb=vec3f(0.);
 for(var i=0u;i<3u;i++){let p=ki.curves[i];if(p.b.w<=0.){continue;}var best=100.;var bestQ=0.;
  for(var j=0u;j<16u;j++){let a=kp(p,f32(j)/16.);let b=kp(p,f32(j+1u)/16.);let delta=b.xy-a.xy;
   let t=clamp(dot(point-a.xy,delta)/dot(delta,delta),0.,1.);let distance=length(point-(a.xy+t*delta));if(distance<best){best=distance;bestQ=(f32(j)+t)/16.;}}
  let z=kp(p,bestQ).z;let front=select(0.,1.,z>=0.);if(frontFilter>=0.&&abs(front-frontFilter)>.1){continue;}
  rgb+=curveRadiance(p,bestQ,best);
 }if(frontFilter<0.||frontFilter>.5){rgb+=coreRadiance(point);}return rgb;
}`;
// Host declares kiSourceVisibility(source,receiver) and kiEmitterVisible(source,front).
// These are actual slab/body/viewport witnesses, not hard-coded game authorization.
export const RECEIVING_WGSL=/*wgsl*/`
fn emitterContribution(source:vec3f,area:f32,radiance:vec3f,position:vec3f,normal:vec3f,albedo:vec3f,visibility:f32)->vec3f{
 let delta=source-position;let r=length(delta);if(r<=.000001||r>=.88){return vec3f(0.);}
 let gain=visibility*kiSourceVisibility(source,position)*area*max(0.,dot(delta,normal)/r)*(1.-ks(.62,.88,r))/(r*r+.027)/3.141592653589793;
 return gain*albedo*radiance;
}
fn kiReceived(position:vec3f,normal:vec3f,albedo:vec3f,visibility:f32)->vec3f{
 var rgb=vec3f(0.);for(var i=0u;i<3u;i++){let p=ki.curves[i];if(p.b.w<=0.){continue;}
  for(var j=0u;j<16u;j++){let q=(f32(j)+.5)/16.;let source=kp(p,q);let a=kp(p,f32(j)/16.);let b=kp(p,f32(j+1u)/16.);
   let area=length(b.xy-a.xy)*p.a.w*2.;var radiance=vec3f(0.);
   for(var n=0u;n<4u;n++){let v=-.75+f32(n)*.5;radiance+=curveRadiance(p,q,abs(v)*p.a.w)/4.;}
   rgb+=emitterContribution(source,area,radiance,position,normal,albedo,visibility);
  }
 }if(ki.coreLight.x>0.){for(var x=0u;x<4u;x++){for(var y=0u;y<2u;y++){
  let offset=vec2f(-.6+f32(x)*.4,-.35+f32(y)*.70);let point=ki.coreShape.xy+offset*ki.coreShape.zw;
  rgb+=emitterContribution(vec3f(point,.14),ki.coreShape.z*ki.coreShape.w*.5,coreRadiance(point),position,normal,albedo,visibility);
 }}}return rgb;
}`;
export const OBS_WGSL=/*wgsl*/`
fn obsContribution(source:vec3f,area:f32,radiance:vec3f,point:vec2f)->vec3f{
 let r=length(point-source.xy);if(r>=.19){return vec3f(0.);}
 let kernel=(exp(-r*r/(2.*.043*.043))*.24+exp(-r*r/(2.*.095*.095))*.045)*(1.-ks(.14,.19,r));
 let gain=kiEmitterVisible(source,source.z>=0.)*area*max(0.,dot(radiance,vec3f(.2126,.7152,.0722))-.28)*kernel;
 return gain*radiance;
}
@fragment fn commonKiObserver(@builtin(position) pix:vec4f)->@location(0) vec4f{
 if(flags.x<.5){return vec4f(0.);}let point=vec2f((pix.x-ki.footH.x)/ki.footH.z,(ki.footH.y-pix.y)/ki.footH.z);
 if(point.x<-.79||point.x>.79||point.y<-.31||point.y>1.01){return vec4f(0.);}var rgb=vec3f(0.);
 for(var i=0u;i<3u;i++){let p=ki.curves[i];if(p.b.w<=0.){continue;}
  for(var j=0u;j<16u;j++){let q=(f32(j)+.5)/16.;let source=kp(p,q);let a=kp(p,f32(j)/16.);let b=kp(p,f32(j+1u)/16.);
   let area=length(b.xy-a.xy)*p.a.w*2.;var radiance=vec3f(0.);for(var n=0u;n<4u;n++){radiance+=curveRadiance(p,q,abs(-.75+f32(n)*.5)*p.a.w)/4.;}
   rgb+=obsContribution(source,area,radiance,point);
  }
 }if(ki.coreLight.x>0.){for(var x=0u;x<4u;x++){for(var y=0u;y<2u;y++){
  let offset=vec2f(-.6+f32(x)*.4,-.35+f32(y)*.70);let q=ki.coreShape.xy+offset*ki.coreShape.zw;
  rgb+=obsContribution(vec3f(q,.14),ki.coreShape.z*ki.coreShape.w*.5,coreRadiance(q),point);
 }}}return vec4f(rgb,0.);
}`;
export const SOURCE_WGSL=SHARED_WGSL+/*wgsl*/`
@fragment fn commonKiSource(@builtin(position) pix:vec4f)->@location(0) vec4f{
 let p=vec2f((pix.x-ki.footH.x)/ki.footH.z,(ki.footH.y-pix.y)/ki.footH.z);let rgb=commonSource(p,ki.footH.w);
 return vec4f(rgb,select(0.,1.,dot(rgb,vec3f(1.))>0.));
}`;
