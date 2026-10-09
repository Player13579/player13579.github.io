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
  // Three broad expanding, buoyant lobes: Beer-Lambert absorption separates
  // cooler dust from the luminous reaction zone; no particle noise texture.
  for(var j=0u;j<3u;j=j+1u){
   let k=f32(j);let signX=select(-1.0,1.0,j==1u);
   let center=vec2f(signX*(5.0+23.0*u.phase.x),-8.0-(17.0+k*9.0)*u.phase.x-10.0*t*t);
   let size=vec2f(12.0+25.0*u.phase.x,11.0+22.0*u.phase.x)*(1.0-k*.10);
   let rho=bell(length((p-center)/size))*u.energy.z*(.72-k*.10);
   let opticalDepth=rho*1.2;let alpha=1.0-exp(-opticalDepth);
   let sourceDistance=dot(center,center)+600.0;
   let incident=u.energy.x*50.0/sourceDistance;
   let phaseScatter=.48+.12*sat((p.y-center.y)/size.y);
   let dustShade=vec3f(.095,.085,.071)+vec3f(1,.52,.17)*incident*phaseScatter;
   background=mix(background,dustShade,alpha);
   transmission*=exp(-opticalDepth*.5);
  }
  // Compact physical reaction source, white-hot center and amber cooler rim.
  let hotCenter=vec2f(0,-8.0-18.0*u.phase.x);
  let coreMetric=length((p-hotCenter)/vec2f(11.0+15.0*u.phase.x,10.0+23.0*u.phase.x));
  let hotDensity=bell(coreMetric*1.4);
  let warmDensity=bell(coreMetric*.88);
  emission=(vec3f(1,.86,.58)*hotDensity+vec3f(1,.20,.018)*warmDensity*.28)*u.energy.x*transmission;
  // Seven finite shell fragments. Their cold body is reflected metal, not
  // an additive spark. A tiny cooling contact edge is source-bound only.
  for(var i=0u;i<${FRAGMENT_COUNT}u;i=i+1u){
   let k=f32(i);let angle=k*2.399963+1.1;
   let velocity=vec2f(cos(angle)*(115.0+9.0*k),sin(angle)*43.0-73.0-k*5.0)*u.phase.z;
   let raw=velocity*t+vec2f(0,${GRAVITY_HALF}.0*t*t*u.phase.z);
   let groundHeight=(12.0+k*1.3)*u.phase.z;
   let center=vec2f(raw.x,min(raw.y,groundHeight));
   let spin=angle+t*(9.0+k*1.3);
   let delta=p-center;let c=cos(spin);let s=sin(spin);
   let local=vec2f(c*delta.x+s*delta.y,-s*delta.x+c*delta.y);
   let size=vec2f(2.0+f32(i%3u)*.65,1.4);
   let shape=rectangle(local,size)*u.phase.y;
   background=mix(background,metal(center,spin),shape);
   let heatedEdge=rectangle(local-vec2f(size.x-.35,0),vec2f(.35,size.y))*shape;
   emission+=vec3f(1,.23,.018)*heatedEdge*u.energy.y*.28;
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
