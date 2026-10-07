export const WORLD_WGSL = /* wgsl */ `
struct U { view:vec4f, clock:vec4f, material:vec4f, obs:vec4f, light:vec4f, thin:vec4f, dense:vec4f, source:vec4f };
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {let pts=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:V;o.position=vec4f(pts[i],0.0,1.0);o.uv=pts[i]*vec2f(0.5,-0.5)+vec2f(0.5);return o;}

// R3: luminous supply is a finite low reservoir, not a delta-like point.
fn sourceSupply(p:vec3f)->f32{return exp(-dot(p.xz,p.xz)/(0.42*0.42))*exp(-p.y/0.11);}
// Light travels farther than the emitting material. In-scatter is still
// multiplied by this ray segment's actual medium coverage below.
fn supplyIrradiance(p:vec3f)->f32{return exp(-dot(p.xz,p.xz)/(0.66*0.66))*exp(-p.y/0.32);}
// R4: broad open density rolls, not closed bubbles or decorative outlines.
// Each crest bends through depth and has a connected low foot; the channels
// between their footprints are genuine lower-density medium.
fn roll(p:vec3f, center:vec2f, width:vec2f, bend:f32, height:f32, thickness:f32, gain:f32)->f32 {
 let along=(p.x-center.x)/width.x;
 let across=(p.z-center.y-bend*(1.0-along*along))/width.y;
 let footprint=exp(-along*along*along*along-across*across);
 let crestHeight=0.045+height*exp(-0.85*across*across)+0.018*sin(along*2.0);
 let dy=(p.y-crestHeight)/thickness;let crest=exp(-dy*dy);
 let foot=0.24*exp(-p.y/0.065);
 return gain*footprint*(crest+foot);
}
fn density(p:vec3f)->f32 {
 let radial=length(p.xz);
 let boundary=(1.0-smoothstep(0.85,1.0,radial))*(1.0-smoothstep(0.35,0.44,p.y))*smoothstep(0.0,0.018,p.y);
 let t=u.clock.z;let angle=0.14*t;let c=cos(angle);let s=sin(angle);
 let xz=mat2x2f(c,-s,s,c)*p.xz;
 let advected=xz+vec2f(0.12*p.y,0.08*sin(t*0.42+p.x*1.7));
 let domain=vec3f(advected.x,p.y,advected.y);
 let mass0=roll(domain,vec2f(-0.12,-0.46),vec2f(0.62,0.14),0.12,0.12,0.052,1.65);
 let mass1=roll(domain,vec2f(0.18,-0.03),vec2f(0.52,0.13),-0.13,0.23,0.062,1.45);
 let mass2=roll(domain,vec2f(-0.14,0.39),vec2f(0.59,0.16),0.10,0.075,0.047,1.8);
 let coreY=(p.y-0.045)/0.055;let core=exp(-dot(p.xz,p.xz)*32.0)*exp(-coreY*coreY)*0.65;
 let carrier=0.14*exp(-p.y/0.095);
 let build=0.32+(1.0-0.32)*u.material.y;
 return boundary*(carrier+(mass0+mass1+mass2+core)*build)*u.material.z;
}
// Finite single-scatter source path. Absorption uses exactly the receiving
// medium's extinction; no screen-space contour or arbitrary dark mask.
fn sourceTransmission(p:vec3f)->f32 {
 let sourcePoint=vec3f(0.0,0.045,0.0);
 let path=p-sourcePoint;let ds=length(path)/3.0;var opticalDepth=0.0;
 for(var j=0u;j<3u;j++) {opticalDepth+=density(sourcePoint+path*((f32(j)+0.5)/3.0))*ds*6.5;}
 return exp(-opticalDepth);
}

struct F { @location(0) main:vec4f, @location(1) radiance:vec4f };
@fragment fn fs(v:V)->F {
 var out:F;out.main=vec4f(0.0);out.radiance=vec4f(0.0);if(u.clock.w<0.5){return out;}
 let q=(v.position.xy-u.view.zw)/u.clock.x;if(abs(q.x)>1.04||q.y< -1.0||q.y>0.60){return out;}
 var transmission=1.0;var color=vec3f(0.0);var sourceLight=vec3f(0.0);
 let lightDir=normalize(u.light.xyz);let viewDir=normalize(vec3f(0.0,u.obs.z,u.obs.w));
 let segmentLength=(0.44/32.0)*length(vec3f(0.0,1.0,u.obs.w/u.obs.z));
 let cosine=dot(lightDir,viewDir);let phase=(1.0-0.18*0.18)/pow(1.0+0.18*0.18-2.0*0.18*cosine,1.5);
 for(var i=0u;i<32u;i++) {
  let h=0.44-(f32(i)+0.5)*(0.44/32.0);
  let p=vec3f(q.x,h,(q.y+u.obs.w*h)/u.obs.z);let rho=density(p);
  let extinction=rho*segmentLength*6.5;let coverage=1.-exp(-extinction);
  let materialColor=mix(u.thin.rgb,u.dense.rgb,clamp(rho*0.70,0.0,1.0));
  // Scatter follows the medium. Emission is a separate field input localized
  // at the landing supply: no constant glow floor across every density mass.
  let supplyPower=u.material.w*(0.35+0.65*u.material.y);
  let emit=u.source.rgb*supplyPower*5.6*sourceSupply(p);
  let toSupply=normalize(vec3f(-p.x,0.045-p.y,-p.z)+vec3f(0.0,0.0001,0.0));
  let sourceCosine=dot(toSupply,viewDir);
  let sourcePhase=(1.0-0.18*0.18)/pow(1.0+0.18*0.18-2.0*0.18*sourceCosine,1.5);
  let sourceScatter=u.source.rgb*supplyPower*1.45*supplyIrradiance(p)*sourcePhase*sourceTransmission(p);
  let scattered=materialColor*(0.62+0.28*phase)+sourceScatter;
  let contribution=transmission*coverage;color+=contribution*(scattered+emit);sourceLight+=contribution*(emit+sourceScatter);transmission*=1.0-coverage;
 }
 out.main=vec4f(color,1.0-transmission);out.radiance=vec4f(sourceLight,1.0);return out;
}`;
export const OBSERVER_WGSL = /* wgsl */ `
struct U { view:vec4f, clock:vec4f, material:vec4f, obs:vec4f, light:vec4f, thin:vec4f, dense:vec4f, source:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var mainTexture:texture_2d<f32>;
@group(0) @binding(2) var sourceTexture:texture_2d<f32>;
@group(0) @binding(3) var filterSampler:sampler;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
  let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:V;o.position=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+vec2f(.5);return o;
}
fn displayEncode(x:vec3f)->vec3f {
  return select(1.055*pow(max(x,vec3f(0.)),vec3f(1./2.4))-.055,x*12.92,x<=vec3f(.0031308));
}
@fragment fn fs(v:V)->@location(0) vec4f {
  if(u.clock.w<.5){return vec4f(0.);}
  let main=textureSampleLevel(mainTexture,filterSampler,v.uv,0.);
  var halo=vec3f(0.);
  if(u.obs.x>.5) {
    let spacing=max(1.2,u.clock.x*.055)/u.view.xy;
    let offsets=array<vec2f,9>(vec2f(-1.,-1.),vec2f(0.,-1.),vec2f(1.,-1.),vec2f(-1.,0.),vec2f(0.),vec2f(1.,0.),vec2f(-1.,1.),vec2f(0.,1.),vec2f(1.,1.));
    let weights=array<f32,9>(1.,2.,1.,2.,4.,2.,1.,2.,1.);
    for(var i=0u;i<9u;i++) {
      let coord=v.uv+offsets[i]*spacing;
      if(all(coord>=vec2f(0.))&&all(coord<=vec2f(1.))) {halo+=textureSampleLevel(sourceTexture,filterSampler,coord,0.).rgb*weights[i]/16.;}
    }
    halo*=u.obs.y;
  }
  // Source-derived local observer scatter; RGB premultiplied exactly once after encode.
  let haloAlpha=1.-exp(-dot(halo,vec3f(.2126,.7152,.0722)));
  let alpha=main.a+(1.-main.a)*haloAlpha;
  if(alpha<.00001){return vec4f(0.);}
  let straight=(main.rgb+halo)/alpha;
  return vec4f(displayEncode(straight)*alpha,alpha);
}`;

// CPU mechanism probes share the exact normalized medium recipe. They are
// source-contract checks, not rendered pixels or quality evidence.
export const VOLUME_PARAMETERS=Object.freeze({height:.44,boundaryInner:.85,boundaryOuter:1,layerCount:32,sourcePathSamples:3,buildBase:.32,carrier:.14,carrierHeight:.095,rollShear:.12,advect:.08,angularRate:.14,advectionRate:.42,sourceRadiusExponent:1/(.42*.42),sourceHeightExponent:1/.11,sourceGain:5.6,scatterRadiusExponent:1/(.66*.66),scatterHeightExponent:1/.32,scatterGain:1.45,extinction:6.5,rolls:[{center:[-.12,-.46],width:[.62,.14],bend:.12,height:.12,thickness:.052,gain:1.65},{center:[.18,-.03],width:[.52,.13],bend:-.13,height:.23,thickness:.062,gain:1.45},{center:[-.14,.39],width:[.59,.16],bend:.10,height:.075,thickness:.047,gain:1.8}]});
const smooth=(a,b,x)=>{const q=Math.min(1,Math.max(0,(x-a)/(b-a)));return q*q*(3-2*q);};
export function sampleVolume(p,{motionSeconds=0,build=1,densityGain=1,emissionGain=1}={}){
 if(!Array.isArray(p)||p.length!==3||![...p,motionSeconds,build,densityGain,emissionGain].every(Number.isFinite)||p[1]<0||densityGain<0||emissionGain<0||build<0||build>1)throw new TypeError('finite normalized volume parameters');
 const C=VOLUME_PARAMETERS,[x,y,z]=p,radial=Math.hypot(x,z),boundary=(1-smooth(C.boundaryInner,C.boundaryOuter,radial))*(1-smooth(.35,C.height,y))*smooth(0,.018,y);
 const a=C.angularRate*motionSeconds,c=Math.cos(a),s=Math.sin(a),advected=[c*x+s*z+C.rollShear*y,-s*x+c*z+C.advect*Math.sin(motionSeconds*C.advectionRate+x*1.7)];
 const masses=C.rolls.map(r=>{const along=(advected[0]-r.center[0])/r.width[0],across=(advected[1]-r.center[1]-r.bend*(1-along*along))/r.width[1],footprint=Math.exp(-(along**4)-across**2),height=.045+r.height*Math.exp(-.85*across**2)+.018*Math.sin(along*2);return r.gain*footprint*(Math.exp(-Math.pow((y-height)/r.thickness,2))+.24*Math.exp(-y/.065));});
 const core=.65*Math.exp(-radial*radial*32)*Math.exp(-(((y-.045)/.055)**2)),carrier=C.carrier*Math.exp(-y/C.carrierHeight),b=C.buildBase+(1-C.buildBase)*build;
 const density=boundary*(carrier+(masses.reduce((sum,n)=>sum+n,0)+core)*b)*densityGain;
 const supply=Math.exp(-radial*radial*C.sourceRadiusExponent)*Math.exp(-y*C.sourceHeightExponent);
 const irradiance=Math.exp(-radial*radial*C.scatterRadiusExponent)*Math.exp(-y*C.scatterHeightExponent);
 return {density,supply,irradiance,emissionPerDensity:C.sourceGain*supply*(.35+.65*build)*emissionGain,scatterPerCoverage:C.scatterGain*irradiance*(.35+.65*build)*emissionGain,masses,boundary};
}
export function sourceTransmission(p,options={}) {
 const C=VOLUME_PARAMETERS,source=[0,.045,0],path=p.map((v,i)=>v-source[i]),ds=Math.hypot(...path)/C.sourcePathSamples;
 let opticalDepth=0;for(let j=0;j<C.sourcePathSamples;j++){const at=source.map((v,i)=>v+path[i]*(j+.5)/C.sourcePathSamples);opticalDepth+=sampleVolume(at,options).density*ds*C.extinction;}
 return Math.exp(-opticalDepth);
}
