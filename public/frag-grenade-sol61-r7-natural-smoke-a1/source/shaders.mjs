// Frag Grenade E — frag-grenade-sol61-r7 natural smoke revision.
// Parent: frag-grenade-sol61-r6.
// Group: gunner-frag-grenade-sol61.
// Author: GPT-6.1-Sol.
// Natural-smoke creative revision: remove regular folds and use irregular broad density variation while preserving the R6 support envelope.
import {FRAGMENT_COUNT,GRAVITY_HALF} from './plan.mjs';
const COMMON=/* wgsl */`
struct U { view:vec4f, origin:vec4f, energy:vec4f, phase:vec4f, receiver:vec4f, controls:vec4f, observer:vec4f, cause:vec4f }
@group(0) @binding(0) var<uniform> u:U;
struct Vertex { @builtin(position) position:vec4f, @location(0) uv:vec2f }
@vertex fn vs(@builtin(vertex_index) n:u32)->Vertex {
 let c=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[n];
 var v:Vertex;v.position=vec4f(c,0,1);v.uv=c*vec2f(.5,-.5)+vec2f(.5);return v;
}
fn sat(x:f32)->f32{return clamp(x,0.0,1.0);}
fn bell(x:f32)->f32{return exp(-x*x);}
fn disk(p:vec2f,r:f32)->f32{return 1.0-smoothstep(r-.65,r+.65,length(p));}
fn rectangle(p:vec2f,extent:vec2f)->f32 {let d=abs(p)-extent;return 1.0-smoothstep(-.5,.65,max(d.x,d.y));}
fn floorAlbedo(p:vec2f)->vec3f {
 let stripe=1.0-smoothstep(.65,1.35,abs(fract((p.x+p.y*.12)/58.0)-.5)*58.0);
 let seam=1.0-smoothstep(.65,1.35,abs(fract(p.y/42.0)-.5)*42.0);
 return vec3f(.052,.062,.068)+vec3f(.013)*(stripe+seam);
}
`;
export const WORLD=COMMON+/* wgsl */`
// Connected ejecta volume: initial outward impulse, entrainment, then buoyancy.
// This is a bounded qualitative volume model, not a claim of resolved CFD.
fn smokeHash(p:vec3f)->f32{return fract(sin(dot(p,vec3f(127.1,311.7,74.7)))*43758.5453);}
fn smokeNoise(p:vec3f)->f32{
 let cell=floor(p);let f=fract(p);let q=f*f*(vec3f(3)-2.0*f);
 let a=mix(smokeHash(cell),smokeHash(cell+vec3f(1,0,0)),q.x);
 let b=mix(smokeHash(cell+vec3f(0,1,0)),smokeHash(cell+vec3f(1,1,0)),q.x);
 let c=mix(smokeHash(cell+vec3f(0,0,1)),smokeHash(cell+vec3f(1,0,1)),q.x);
 let d=mix(smokeHash(cell+vec3f(0,1,1)),smokeHash(cell+vec3f(1,1,1)),q.x);
 return mix(mix(a,b,q.y),mix(c,d,q.y),q.z);
}
fn smokeDensity(point:vec3f,t:f32)->f32{
 let expansion=1.0-exp(-t/.19);
 let rise=30.0*t+34.0*t*t;
 let radius=vec3f(12.0+39.0*expansion,8.0+37.0*expansion,10.0+23.0*expansion);
 let center=vec3f(4.0*expansion+12.0*t*t,-7.0-rise,0.0);
 var q=(point-center)/radius;
 if(dot(q,q)>12.0){return 0.0;}

 let flow=vec3f(point.x/29.0,point.y/25.0,point.z/27.0)
     +vec3f(-t*.55,t*1.15,t*.22);
 let large=smokeNoise(flow);
 let medium=smokeNoise(flow*2.05+vec3f(5.7,1.9,-3.1));

 q.x+=expansion*(.21*sin(q.y*3.2-t*2.6)+.30*(large-.5));
 q.z+=expansion*(.16*sin(q.y*3.2-t*2.6+1.7)+.22*(medium-large));
 q.y+=expansion*(.19*(medium-.5)+.08*sin(q.x*3.6+t*1.8));

 let shoulder=1.0-.30*smoothstep(-.05,1.25,q.y);
 let radial=(q.x*q.x+q.z*q.z)/(shoulder*shoulder);
 let bulk=exp(-1.55*radial-1.40*q.y*q.y);

 let stemHeight=8.0+.62*rise;
 let stemCenter=vec3f(center.x*.35,-4.0-.32*rise,0.0);
 var stem=(point-stemCenter)/vec3f(
     10.0+16.0*expansion,
     stemHeight,
     10.0+9.0*expansion
 );
 stem.x+=.10*expansion*sin(stem.y*2.6-t*2.0);
 let root=.56*exp(-1.65*(stem.x*stem.x+stem.z*stem.z)-1.3*stem.y*stem.y);

 let envelope=(bulk+root)*(.82+.34*large+.16*medium);
 let silhouette=smoothstep(.075,.62,envelope);

 // Repurpose the former fine-noise lookup for broad material variation.
 // Shear and unequal domain warps break visible value-noise lattice alignment.
 // Restrained depth frequency keeps this field coherent across six samples.
 let billowCoord=vec3f(
     1.45*q.x+.26*q.y+.24*(medium-.5)-t*.08,
     1.30*q.y-.19*q.x+.28*(large-.5)+t*.38,
     .30*q.z+.10*(large-medium)
 )+vec3f(6.7,-3.4,9.2);
 let billow=smokeNoise(billowCoord);

 // One connected density field, not stacked layers or separate puffs.
 // Broad, smooth contrast preserves positive-density valleys.
 let material=.82*billow+.12*large+.06*medium;
 let crest=smoothstep(.26,.74,material);
 let rolledStructure=(.42+1.40*crest)
     *(.88+.18*large+.10*medium+.04*billow);

 let baseStructure=.66+.42*large+.24*medium+.08*billow;
 let rollWeight=smoothstep(.08,.30,t)
     *smoothstep(.12,.46,envelope);
 let structure=mix(baseStructure,rolledStructure,rollWeight);

 let entrained=1.0-smoothstep(-.08,.20,point.y/(8.0+12.0*expansion));
 return max(0.0,silhouette*(.42+.62*envelope)*structure*entrained);
}

struct Result { @location(0) world:vec4f, @location(1) source:vec4f }
fn metal(p:vec2f,angle:f32)->vec3f {
 let normal=normalize(vec3f(sin(angle)*.55,cos(angle)*.45,1.0));
 let incoming=normalize(vec3f(-p.x,-p.y,27.0));
 let viewDirection=vec3f(0,0,1);
 let halfVector=normalize(incoming+viewDirection);
 let ndl=max(0.0,dot(normal,incoming));
 let eta=vec3f(2.7,2.9,3.1);let extinction=vec3f(3.2,3.1,3.0);
 let f0=((eta-vec3f(1))*(eta-vec3f(1))+extinction*extinction)/((eta+vec3f(1))*(eta+vec3f(1))+extinction*extinction);
 let f=f0+(vec3f(1)-f0)*pow(1.0-max(0.0,dot(viewDirection,halfVector)),5.0);
 let ndv=max(.001,dot(normal,viewDirection));
 let ndh=max(.001,dot(normal,halfVector));
 let roughness=.31;let a2=pow(roughness,4.0);
 let divisor=ndh*ndh*(a2-1.0)+1.0;
 let distribution=a2/(3.14159265*divisor*divisor);
 let k=pow(roughness+1.0,2.0)/8.0;
 let masking=ndl/(ndl*(1.0-k)+k)*ndv/(ndv*(1.0-k)+k);
 let brdf=distribution*masking*f/max(4.0*ndl*ndv,.0001);
 let attenuation=1.0/(1.0+dot(p,p)/1250.0);
 return vec3f(.048,.057,.062)+vec3f(1.0,.57,.23)*u.energy.x*attenuation*brdf*ndl*.12;
}
@fragment fn fs(v:Vertex)->Result {
 let pixel=v.uv*u.view.xy;
 let p=(pixel-u.origin.xy)/u.view.z;
 let h=u.view.w;let t=u.origin.z;let extent=u.cause.x;
 let live=u.origin.w*u.controls.x;
 let horizon=p.y+11.0;
 var background=vec3f(.031,.039,.049);
 let floorMask=smoothstep(-13.0,-9.0,p.y);
 // Pressure is a transient density/IOR gradient. It warps floor reflection,
 // never acts as a luminous ring or a gameplay hit boundary.
 let radial=length(vec2f(p.x,p.y/.42));
 let front=extent*(.07+.92*u.phase.x);
 let densityGradient=bell((radial-front)/max(3.0,extent*.036))*u.energy.w;
 let offset=normalize(p+vec2f(.001))*densityGradient*1.7;
 background=mix(background,floorAlbedo(p+offset),floorMask);
 let distanceSquared=dot(vec2f(p.x,p.y/.72),vec2f(p.x,p.y/.72));
 let floorIncident=u.energy.x*20.0/(distanceSquared+420.0)*max(0.0,19.0/sqrt(distanceSquared+361.0));
 if(u.receiver.z>.5){background+=vec3f(1.0,.54,.17)*floorIncident*floorMask;}
 // Neutral receiving person is diagnostic geometry, not a gameplay sprite.
 let q=p-u.receiver.xy;
 let head=disk(q-vec2f(0,-h*.895),h*.105);
 let torso=rectangle(q-vec2f(0,-h*.52),vec2f(h*.115,h*.21));
 let legs=max(rectangle(q-vec2f(-h*.065,-h*.16),vec2f(h*.046,h*.16)),rectangle(q-vec2f(h*.065,-h*.16),vec2f(h*.046,h*.16)));
 let arms=max(rectangle(q-vec2f(-h*.17,-h*.51),vec2f(h*.035,h*.20)),rectangle(q-vec2f(h*.17,-h*.51),vec2f(h*.035,h*.20)));
 let actor=max(max(head,torso),max(legs,arms));
 var actorShade=vec3f(.19,.225,.24);
 if(u.receiver.z>.5){actorShade+=vec3f(1,.58,.22)*u.energy.x*28.0/(dot(p,p)+620.0)*max(.15,-q.x/h+.5);}
 background=mix(background,actorShade,actor);
 var emission=vec3f(0);var transmission=1.0;
 if(live>.5){
  // Floor ejecta is a patchy connected settling sheet, thickest near cause.
  // Pressure refraction above remains separate from dust material coverage.
  let outward=1.0-exp(-t/.19);
  let floorQ=vec2f(p.x/(12.0+67.0*outward),(p.y-3.0)/(4.0+13.0*outward));
  let floorVariation=.45+.65*smokeNoise(vec3f(p.x/23.0,p.y/12.0,t*.7));
  let floorDensity=exp(-dot(floorQ,floorQ)*1.5)*floorVariation*u.energy.w*.55*(1.0-.65*smoothstep(.22,.80,t));
  let floorAlpha=1.0-exp(-floorDensity);
  background=mix(background,vec3f(.18,.159,.128)+vec3f(1,.5,.12)*u.energy.x*.035,floorAlpha);
  // Six view-depth samples integrate one continuous heterogeneous volume.
  // Optical depth and source attenuation are accumulated once, so overlapping
  // density belongs to the same smoke body rather than four opaque blobs.
  var dustTransmission=1.0;var dustScatter=vec3f(0);
  for(var slice=0u;slice<6u;slice=slice+1u){
   let z=-31.0+(f32(slice)+.5)*(62.0/6.0);
   let rho=smokeDensity(vec3f(p,z),t)*u.energy.z;
   let opticalDepth=rho*.30;
   let sampleAlpha=1.0-exp(-opticalDepth);
   let lightDistance=dot(vec3f(p,z)-vec3f(0,-9,0),vec3f(p,z)-vec3f(0,-9,0))+600.0;
   let incident=u.energy.x*36.0/lightDistance;
   let smokeShadow=smoothstep(.10,1.30,max(rho,0.0));
   let ambient=mix(vec3f(.54,.50,.44),vec3f(.17,.145,.12),smokeShadow);
   let scattering=ambient+vec3f(.64,.59,.51)*incident;
   dustScatter+=scattering*sampleAlpha*dustTransmission;
   dustTransmission*=exp(-opticalDepth);
  }
  background=background*dustTransmission+dustScatter;
  transmission=dustTransmission;
  // PH.rupture: finite lobed reaction boundary; three cooling zones inside.
  // The finite boundary is generated in the WORLD pass, never from the PSF.
  let hotCenter=vec2f(-2.0,-9.0-8.0*u.phase.x);
  let hotLocal=(p-hotCenter)/vec2f(8.0+15.0*u.phase.x,8.0+18.0*u.phase.x);
  let hotAngle=atan2(hotLocal.y,hotLocal.x);
  let hotRadius=length(hotLocal);
  let hotBoundary=1.0-smoothstep(.80,1.0,hotRadius/(1.0+.12*sin(hotAngle*3.0+1.3)+.07*cos(hotAngle*5.0)));
  let whiteCore=1.0-smoothstep(.12,.48,hotRadius);
  let amberZone=1.0-smoothstep(.42,.82,hotRadius);
  let sourceColor=mix(vec3f(1,.115,.012),vec3f(1,.55,.07),amberZone);
  let reactionColor=mix(sourceColor,vec3f(1,.90,.66),whiteCore);
  emission=reactionColor*hotBoundary*u.energy.x*transmission;
  // PH.fragments: seven asymmetric finite shell pieces, reflecting metal.
  // A gravity parabola ends at each ground plane; friction slows translation
  // after contact, so settled pieces do not keep sliding at launch velocity.
  for(var i=0u;i<${FRAGMENT_COUNT}u;i=i+1u){
   let k=f32(i);let angle=k*2.399963+1.1;
   let velocity=vec2f(cos(angle)*(115.0+9.0*k),sin(angle)*43.0-73.0-k*5.0)*u.phase.z;
   let groundHeight=(12.0+k*1.3)*u.phase.z;
   let gravity=${GRAVITY_HALF}.0*u.phase.z;
   let contact=(-velocity.y+sqrt(velocity.y*velocity.y+4.0*gravity*groundHeight))/(2.0*gravity);
   let flight=min(t,contact);let elapsed=max(0.0,t-contact);
   let travel=flight+(1.0-exp(-elapsed*9.0))/9.0;
   let center=vec2f(velocity.x*travel,min(velocity.y*flight+gravity*flight*flight,groundHeight));
   let spin=angle+flight*(9.0+k*1.3);
   let delta=p-center;let c=cos(spin);let sn=sin(spin);
   let local=vec2f(c*delta.x+sn*delta.y,-sn*delta.x+c*delta.y);
   // R4: only three existing pieces receive a modest scale emphasis.
   // Count, launch, spin, gravity and ground-contact times remain unchanged.
   let principal=i==0u||i==2u||i==6u;
   let size=vec2f(2.4+f32(i%3u)*.8,1.6+f32(i%2u)*.35)*select(1.0,1.4,principal);
   // Unequal planar corner cuts retain a finite, visibly angular shell
   // silhouette rather than turning small pieces into round dust flecks.
   let sides=max(abs(local.y)-size.y,abs(local.x)-size.x+max(0.0,local.y)*.26);
   let upperCut=dot(local,vec2f(.8,-.6))-(.8*size.x+.6*size.y-.60*size.y);
   let lowerCut=dot(local,vec2f(-.6,.8))-(.6*size.x+.8*size.y-.45*size.y);
   let chipMetric=max(sides,max(upperCut,lowerCut));
   let shape=(1.0-smoothstep(-.45,.65,chipMetric))*u.phase.y;
   // Broad, attached steel facets supply non-emissive material contrast.
   // A narrow dark fracture edge separates the solid from either a bright
   // dust patch or the dark floor; no particles, trails or halo are added.
   let facet=1.0-smoothstep(-.18,.18,local.y+local.x*.28);
   let lightFace=select(vec3f(.105,.130,.150),vec3f(.170,.205,.235),principal);
   let faceReflection=mix(vec3f(.018,.023,.028),lightFace,facet);
   let faceInterior=1.0-smoothstep(-.85,-.25,chipMetric);
   let reflected=mix(vec3f(.026,.032,.038),metal(center,spin)+faceReflection,faceInterior);
   background=mix(background,reflected,shape);
   let heatedEdge=rectangle(local-vec2f(size.x-.4,0),vec2f(.45,size.y))*shape;
   emission+=vec3f(1,.27,.025)*heatedEdge*u.energy.y*.42;
  }
 }
 // Diagnostic opaque wall blocks direct radiance before any observer kernel.
 let wall=rectangle(p-vec2f(23,-22),vec2f(5,34))*u.receiver.w;
 background=mix(background,vec3f(.075,.085,.095),wall);
 emission*=1.0-wall;
 var out:Result;out.world=vec4f(background+emission,1);out.source=vec4f(emission,1);return out;
}
`;
export const OPTICS=COMMON+/* wgsl */`
@group(0) @binding(1) var sourceTexture:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
@fragment fn fs(v:Vertex)->@location(0) vec4f {
 if(u.controls.y<.5||u.controls.x<.5||u.origin.w<.5){return vec4f(0);}
 // Normalized 25-tap PSF; redistribution share .16 leaves direct share .84.
 // Size responds to observer pupil, not to a new decorative phenomenon.
 var scattered=vec3f(0);var weightSum=0.0;
 let kernelRadius=5.0*u.observer.y*u.view.z;
 for(var y=-2;y<=2;y=y+1){for(var x=-2;x<=2;x=x+1){
  let d=vec2f(f32(x),f32(y));let w=exp(-dot(d,d)*.48);
  scattered+=textureSampleLevel(sourceTexture,linearSampler,v.uv+d*kernelRadius/u.view.xy,0.0).rgb*w;weightSum+=w;
 }}
 return vec4f(scattered/max(weightSum,.0001),1);
}
`;
export const POST=COMMON+/* wgsl */`
@group(0) @binding(1) var worldTexture:texture_2d<f32>;
@group(0) @binding(2) var sourceTexture:texture_2d<f32>;
@group(0) @binding(3) var opticalTexture:texture_2d<f32>;
@group(0) @binding(4) var linearSampler:sampler;
fn transfer(x:vec3f)->vec3f{return select(x*12.92,1.055*pow(max(x,vec3f(0)),vec3f(1.0/2.4))-.055,x>vec3f(.0031308));}
@fragment fn fs(v:Vertex)->@location(0) vec4f {
 let world=textureSampleLevel(worldTexture,linearSampler,v.uv,0.0).rgb;
 let direct=textureSampleLevel(sourceTexture,linearSampler,v.uv,0.0).rgb;
 let scatter=textureSampleLevel(opticalTexture,linearSampler,v.uv,0.0).rgb;
 let enabled=u.controls.y*u.controls.x*u.origin.w;
 let radiance=max(vec3f(0),world-enabled*u.observer.z*direct+enabled*u.observer.z*scatter);
 let exposed=radiance*u.observer.x;
 let display=vec3f(1)-exp(-exposed);
 return vec4f(transfer(display),1);
}
`;
