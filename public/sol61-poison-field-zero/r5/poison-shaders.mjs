// R5: fixed broad grounded feed, connected rising folded mist; no rotating whole field.
// Executable core only. Existing 128-byte U, two MRT outputs, pipeline entrypoints remain.
export const WORLD_WGSL = /* wgsl */ `
struct U { view:vec4f, clock:vec4f, material:vec4f, obs:vec4f, light:vec4f, thin:vec4f, dense:vec4f, source:vec4f };
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {let pts=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:V;o.position=vec4f(pts[i],0.0,1.0);o.uv=pts[i]*vec2f(0.5,-0.5)+vec2f(0.5);return o;}

fn radialGate(p:vec3f)->f32 {return 1.0-smoothstep(0.86,1.0,length(p.xz));}
// A finite field at y=0, not a floor texture/mesh or a decorative circumference.
// Low continuous carrier and three broader supply regions share one grounded layer.
fn feedFootprint(p:vec3f)->f32 {
 let r2=dot(p.xz,p.xz);let carrier=exp(-r2*r2*r2/(0.82*0.82*0.82*0.82*0.82*0.82));
 let f0=exp(-dot(p.xz-vec2f(-0.40,-0.30),p.xz-vec2f(-0.40,-0.30))/0.085);
 let f1=exp(-dot(p.xz-vec2f(0.30,-0.05),p.xz-vec2f(0.30,-0.05))/0.080);
 let f2=exp(-dot(p.xz-vec2f(-0.08,0.43),p.xz-vec2f(-0.08,0.43))/0.090);
 return radialGate(p)*carrier*(0.62+0.38*min(1.0,f0+f1+f2));
}
fn feedDensity(p:vec3f)->f32 {
 return feedFootprint(p)*2.8*exp(-p.y/0.030)*smoothstep(0.0,0.010,p.y)*(1.0-smoothstep(0.060,0.090,p.y));
}
// The moving phase travels upward (phase = time - height), whereas feet stay at
// their registered supply. Widening and depth shear form open folded curtains.
// No closed shell, rigid rotation, sharp loop reset, random micro-noise or particle.
fn liftedSheet(p:vec3f, foot:vec2f, phaseOffset:f32, top:f32, lean:f32, gain:f32)->f32 {
 let y=p.y;let rise=smoothstep(0.015,0.30,y);let phase=0.90*u.clock.z-9.0*y+phaseOffset;
 let bend=vec2f(0.080*sin(phase),lean*y+0.14*rise*sin(phase+0.75));
 let center=foot+bend*rise;
 let wx=0.14+0.19*rise*(0.85+0.15*cos(phase+0.4));
 let wz=0.095+0.065*rise;
 let dx=(p.x-center.x)/wx;let dz=(p.z-center.y)/wz;
 let broad=exp(-dx*dx*dx*dx-dz*dz);
 let envelope=(1.0-smoothstep(top-0.060,top,y))*smoothstep(0.0,0.016,y);
 let fold=0.70+0.30*cos(phase+dx*1.1);
 // A wider upper shoulder and dense continuous root are material, not glow.
 let shoulder=1.0+0.45*exp(-pow((y-(top-0.09))/0.07,2.0));
 return broad*envelope*fold*shoulder*gain;
}
fn mistDensity(p:vec3f)->f32 {
 let a=liftedSheet(p,vec2f(-0.40,-0.30),0.0,0.405,-0.24,1.65);
 let b=liftedSheet(p,vec2f(0.30,-0.05),2.1,0.335,0.28,1.45);
 let c=liftedSheet(p,vec2f(-0.08,0.43),4.3,0.245,-0.18,1.75);
 return radialGate(p)*(1.0-smoothstep(0.41,0.44,p.y))*(a+b+c);
}
fn medium(p:vec3f)->vec2f {
 let build=u.material.y;let lift=smoothstep(0.0,0.42,u.clock.y);
 return vec2f(feedDensity(p)*build,mistDensity(p)*build*lift)*u.material.z;
}
fn density(p:vec3f)->f32 {let m=medium(p);return m.x+m.y;}
// Irradiance is received from the existing finite ground supply underneath this
// receiver. Three-segment attenuation uses the same receiving medium, not a mask.
fn sourceTransmission(p:vec3f)->f32 {
 let sourcePoint=vec3f(p.x*0.88,0.022,p.z*0.88);
 let path=p-sourcePoint;let ds=length(path)/3.0;var opticalDepth=0.0;
 for(var j=0u;j<3u;j++) {opticalDepth+=density(sourcePoint+path*((f32(j)+0.5)/3.0))*ds*6.5;}
 return exp(-opticalDepth);
}
fn supplyIrradiance(p:vec3f)->f32 {
 let ground=vec3f(p.x*0.88,0.022,p.z*0.88);
 return feedFootprint(ground)*exp(-max(0.0,p.y-0.022)/0.32);
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
  let p=vec3f(q.x,h,(q.y+u.obs.w*h)/u.obs.z);let m=medium(p);let rho=m.x+m.y;
  let coverage=1.0-exp(-rho*segmentLength*6.5);let feedFraction=m.x/max(0.00001,rho);
  let materialColor=mix(u.thin.rgb,u.dense.rgb,clamp(m.y*0.55,0.0,1.0));
  // Emission exists on the grounded supply only. It is not spread as a glow
  // floor over the raised non-emitting mist; that mist receives source light.
  let supplyPower=u.material.w*(0.35+0.65*u.material.y);
  let emit=u.source.rgb*supplyPower*5.6*feedFraction;
  let toSupply=normalize(vec3f(-p.x*0.12,0.022-p.y,-p.z*0.12)+vec3f(0.0,0.0001,0.0));
  let sourceCosine=dot(toSupply,viewDir);
  let sourcePhase=(1.0-0.18*0.18)/pow(1.0+0.18*0.18-2.0*0.18*sourceCosine,1.5);
  let sourceScatter=u.source.rgb*supplyPower*1.45*supplyIrradiance(p)*sourcePhase*sourceTransmission(p);
  let scattered=materialColor*(0.62+0.28*phase)+sourceScatter;
  let contribution=transmission*coverage;color+=contribution*(scattered+emit);sourceLight+=contribution*(emit+sourceScatter);transmission*=1.0-coverage;
 }
 out.main=vec4f(color,1.0-transmission);out.radiance=vec4f(sourceLight,1.0);return out;
}`;

// OBSERVER_WGSL is appended byte-for-byte from the frozen R4 export by prepare.mjs.

export const VOLUME_PARAMETERS=Object.freeze({height:.44,boundaryInner:.86,boundaryOuter:1,layerCount:32,sourcePathSamples:3,feedRadius:.82,feedHeight:.030,feedGain:2.8,emissionGain:5.6,scatterGain:1.45,extinction:6.5,angularRate:0,upwardPhaseSpeed:.90/9,sheets:[{foot:[-.40,-.30],phase:0,top:.405,lean:-.24,gain:1.65},{foot:[.30,-.05],phase:2.1,top:.335,lean:.28,gain:1.45},{foot:[-.08,.43],phase:4.3,top:.245,lean:-.18,gain:1.75}]});
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const radialGate=p=>1-smooth(.86,1,Math.hypot(p[0],p[2]));
export function sampleVolume(p,{motionSeconds=0,timeSeconds=motionSeconds,build=1,densityGain=1,emissionGain=1}={}) {
 if(!Array.isArray(p)||p.length!==3||![...p,motionSeconds,timeSeconds,build,densityGain,emissionGain].every(Number.isFinite)||p[1]<0||densityGain<0||emissionGain<0||build<0||build>1)throw new TypeError('finite normalized volume parameters');
 const [x,y,z]=p,r2=x*x+z*z,C=VOLUME_PARAMETERS;
 const carrier=Math.exp(-(r2**3)/C.feedRadius**6);
 const f=C.sheets.map((s,i)=>Math.exp(-((x-s.foot[0])**2+(z-s.foot[1])**2)/[.085,.080,.090][i]));
 const footprint=radialGate(p)*carrier*(.62+.38*Math.min(1,f.reduce((a,b)=>a+b,0)));
 const feed=footprint*C.feedGain*Math.exp(-y/C.feedHeight)*smooth(0,.010,y)*(1-smooth(.060,.090,y))*build*densityGain;
 const sheets=C.sheets.map(s=>{
  const rise=smooth(.015,.30,y),phase=.90*motionSeconds-9*y+s.phase;
  const cx=s.foot[0]+.080*Math.sin(phase)*rise,cz=s.foot[1]+(s.lean*y+.14*rise*Math.sin(phase+.75))*rise;
  const wx=.14+.19*rise*(.85+.15*Math.cos(phase+.4)),wz=.095+.065*rise;
  const dx=(x-cx)/wx,dz=(z-cz)/wz;
  return Math.exp(-(dx**4)-dz**2)*(1-smooth(s.top-.060,s.top,y))*smooth(0,.016,y)*(.70+.30*Math.cos(phase+dx*1.1))*(1+.45*Math.exp(-(((y-(s.top-.09))/.07)**2)))*s.gain;
 });
 const mist=radialGate(p)*(1-smooth(.41,.44,y))*sheets.reduce((a,b)=>a+b,0)*build*smooth(0,.42,timeSeconds)*densityGain;
 const ground=[x*.88,.022,z*.88],gr2=ground[0]**2+ground[2]**2;
 const gf=C.sheets.reduce((sum,s,i)=>sum+Math.exp(-((ground[0]-s.foot[0])**2+(ground[2]-s.foot[1])**2)/[.085,.080,.090][i]),0);
 const groundFootprint=radialGate(ground)*Math.exp(-(gr2**3)/C.feedRadius**6)*(.62+.38*Math.min(1,gf));
 const density=feed+mist,feedFraction=feed/Math.max(.00001,density),supplyPower=(.35+.65*build)*emissionGain;
 return {density,feedDensity:feed,mistDensity:mist,feedFootprint:footprint,feedFraction,sheets,sourceEmissionPerCoverage:C.emissionGain*supplyPower*feedFraction,receivedSourcePerCoverage:C.scatterGain*supplyPower*groundFootprint*Math.exp(-Math.max(0,y-.022)/.32),boundary:radialGate(p)};
}
export function sourceTransmission(p,options={}) {
 const source=[p[0]*.88,.022,p[2]*.88],path=p.map((v,i)=>v-source[i]),ds=Math.hypot(...path)/3;
 let opticalDepth=0;
 for(let j=0;j<3;j++){const at=source.map((v,i)=>v+path[i]*(j+.5)/3);opticalDepth+=sampleVolume(at,options).density*ds*6.5;}
 return Math.exp(-opticalDepth);
}

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
