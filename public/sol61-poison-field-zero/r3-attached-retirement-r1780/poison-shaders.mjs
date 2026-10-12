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
fn density(p:vec3f)->f32 {
 let radial=length(p.xz);
 let boundary=(1.0-smoothstep(0.85,1.0,radial))*(1.0-smoothstep(0.35,0.44,p.y))*smoothstep(0.0,0.018,p.y);
 let t=u.clock.z;let angle=0.14*t;let c=cos(angle);let s=sin(angle);
 let xz=mat2x2f(c,-s,s,c)*p.xz;
 let advected=xz+vec2f(0.12*p.y,0.08*sin(t*0.42+p.x*1.7));
 // Unequal vertical density profiles make the same medium contain low front,
 // higher back and low supply-adjacent rolls; not three surface bubbles.
 let domain=vec3f(advected.x,p.y,advected.y);
 let q0=(domain-vec3f(-0.4,0.125,-0.19))/vec3f(0.34,0.13,0.27);let mass0=exp(-dot(q0,q0))*0.93;
 let q1=(domain-vec3f(0.31,0.205,-0.27))/vec3f(0.38,0.16,0.25);let mass1=exp(-dot(q1,q1))*0.8;
 let q2=(domain-vec3f(0.07,0.075,0.38))/vec3f(0.42,0.085,0.3);let mass2=exp(-dot(q2,q2))*1.02;
 let core=exp(-dot(p.xz,p.xz)*32.0)*exp(-pow((p.y-0.045)/0.055,2.0))*0.65;
 let carrier=0.14*exp(-p.y/0.095);
 let build=0.32+(1.0-0.32)*u.material.y;
 return boundary*(carrier+(mass0+mass1+mass2+core)*build)*u.material.z;
}

struct F { @location(0) main:vec4f, @location(1) radiance:vec4f };
@fragment fn fs(v:V)->F {
 var out:F;out.main=vec4f(0.0);out.radiance=vec4f(0.0);if(u.clock.w<0.5){return out;}
 let q=(v.position.xy-u.view.zw)/u.clock.x;if(abs(q.x)>1.04||q.y< -1.0||q.y>0.60){return out;}
 var transmission=1.0;var color=vec3f(0.0);var sourceLight=vec3f(0.0);
 let lightDir=normalize(u.light.xyz);let viewDir=normalize(vec3f(0.0,u.obs.z,u.obs.w));
 let segmentLength=(0.44/20.0)*length(vec3f(0.0,1.0,u.obs.w/u.obs.z));
 let cosine=dot(lightDir,viewDir);let phase=(1.0-0.18*0.18)/pow(1.0+0.18*0.18-2.0*0.18*cosine,1.5);
 for(var i=0u;i<20u;i++) {
  let h=0.44-(f32(i)+0.5)*(0.44/20.0);
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
  let sourceScatter=u.source.rgb*supplyPower*1.45*supplyIrradiance(p)*sourcePhase;
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

// Actual shared parameters used to emit WORLD above. CPU probes evaluate the
// normalized density/input mechanism only; they are not rendered pixel proof.
export const VOLUME_PARAMETERS=Object.freeze({"height":0.44,"boundaryInner":0.85,"boundaryOuter":1,"layerCount":20,"buildBase":0.32,"carrier":0.14,"carrierHeight":0.095,"rollShear":0.12,"advect":0.08,"angularRate":0.14,"advectionRate":0.42,"sourceRadiusExponent":1/(.42*.42),"sourceHeightExponent":1/.11,"sourceGain":5.6,"scatterRadiusExponent":1/(.66*.66),"scatterHeightExponent":1/.32,"scatterGain":1.45,"extinction":6.5,"lobes":[{"center":[-0.4,0.125,-0.19],"width":[0.34,0.13,0.27],"gain":0.93},{"center":[0.31,0.205,-0.27],"width":[0.38,0.16,0.25],"gain":0.8},{"center":[0.07,0.075,0.38],"width":[0.42,0.085,0.3],"gain":1.02}]});
const smooth=(a,b,x)=>{const q=Math.min(1,Math.max(0,(x-a)/(b-a)));return q*q*(3-2*q);};
export function sampleVolume(p,{motionSeconds=0,build=1,densityGain=1,emissionGain=1}={}){
 if(!Array.isArray(p)||p.length!==3||![...p,motionSeconds,build,densityGain,emissionGain].every(Number.isFinite)||p[1]<0||densityGain<0||emissionGain<0||build<0||build>1)throw new TypeError('finite normalized volume parameters');
 const C=VOLUME_PARAMETERS,[x,y,z]=p,radial=Math.hypot(x,z),boundary=(1-smooth(C.boundaryInner,C.boundaryOuter,radial))*(1-smooth(.35,C.height,y))*smooth(0,.018,y);
 const a=C.angularRate*motionSeconds,c=Math.cos(a),s=Math.sin(a),advected=[c*x+s*z+C.rollShear*y,-s*x+c*z+C.advect*Math.sin(motionSeconds*C.advectionRate+x*1.7)];
 const masses=C.lobes.map(l=>l.gain*Math.exp(-([advected[0],y,advected[1]].reduce((sum,v,i)=>sum+((v-l.center[i])/l.width[i])**2,0))));
 const core=.65*Math.exp(-radial*radial*32)*Math.exp(-(((y-.045)/.055)**2)),carrier=C.carrier*Math.exp(-y/C.carrierHeight),b=C.buildBase+(1-C.buildBase)*build;
 const density=boundary*(carrier+(masses.reduce((sum,n)=>sum+n,0)+core)*b)*densityGain;
 const supply=Math.exp(-radial*radial*C.sourceRadiusExponent)*Math.exp(-y*C.sourceHeightExponent);
 const irradiance=Math.exp(-radial*radial*C.scatterRadiusExponent)*Math.exp(-y*C.scatterHeightExponent);
 return {density,supply,irradiance,emissionPerDensity:C.sourceGain*supply*(.35+.65*build)*emissionGain,scatterPerCoverage:C.scatterGain*irradiance*(.35+.65*build)*emissionGain,masses,boundary};
}
