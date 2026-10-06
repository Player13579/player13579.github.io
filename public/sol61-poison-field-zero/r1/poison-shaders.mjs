export const WORLD_WGSL = /* wgsl */ `
struct U { view:vec4f, clock:vec4f, material:vec4f, obs:vec4f, light:vec4f, thin:vec4f, dense:vec4f, source:vec4f };
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
  let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:V;o.position=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+vec2f(.5);return o;
}
// PH1: normalized radius remains exactly one; broad sheared mass concentrations.
fn density(p:vec3f)->f32 {
  let radial=length(p.xz);
  let boundary=(1.-smoothstep(.86,1.,radial))*(1.-smoothstep(.22,.31,p.y))*smoothstep(0.,.025,p.y);
  let t=u.clock.z;
  let angle=.14*t;
  let c=cos(angle);let s=sin(angle);
  let xz=mat2x2f(c,-s,s,c)*p.xz;
  let sheared=xz+vec2f(.28*p.y, .07*sin(t*.27+p.x*2.));
  let a=exp(-dot((sheared-vec2f(-.38,-.10))/vec2f(.34,.28),(sheared-vec2f(-.38,-.10))/vec2f(.34,.28)));
  let b=exp(-dot((sheared-vec2f(.30,-.29))/vec2f(.39,.24),(sheared-vec2f(.30,-.29))/vec2f(.39,.24)));
  let d=exp(-dot((sheared-vec2f(.08,.35))/vec2f(.36,.30),(sheared-vec2f(.08,.35))/vec2f(.36,.30)));
  let groundFall=exp(-p.y*8.);
  let build=.28+.72*u.material.y;
  return boundary*groundFall*(.24+(a+b+d)*1.15*build)*u.material.z;
}
struct F { @location(0) main:vec4f, @location(1) radiance:vec4f };
@fragment fn fs(v:V)->F {
  var out:F;out.main=vec4f(0.);out.radiance=vec4f(0.);
  if(u.clock.w<.5){return out;}
  let q=(v.position.xy-u.view.zw)/u.clock.x;
  if(abs(q.x)>1.04 || q.y<-.9 || q.y>.60){return out;}
  var transmission=1.;var color=vec3f(0.);var sourceLight=vec3f(0.);
  let lightDir=normalize(u.light.xyz);
  let viewDir=normalize(vec3f(0.,u.obs.z,u.obs.w));
  let segmentLength=(.305/14.)*length(vec3f(0.,1.,u.obs.w/u.obs.z));
  // 14 front-to-back samples. Fixed optical length, independent from output resolution.
  for(var i=0u;i<14u;i++) {
    let h=.305-(f32(i)+.5)*(.305/14.);
    let p=vec3f(q.x,h,(q.y+u.obs.w*h)/u.obs.z);
    let rho=density(p);
    let extinction=rho*segmentLength*7.0;
    let coverage=1.-exp(-extinction);
    // Particle medium: anisotropic scattering approximation, not conductor reflection.
    let cosine=dot(lightDir,viewDir);
    let phase=(1.-.18*.18)/pow(1.+.18*.18-2.*.18*cosine,1.5);
    let materialColor=mix(u.thin.rgb,u.dense.rgb,clamp(rho*.55,0.,1.));
    let scattered=materialColor*(.55+.24*phase);
    // Fictional field energy deposits in denser medium. No real radioactive glow claim.
    let supply=exp(-dot(p.xz,p.xz)*18.)*exp(-h*15.);
    let emit=u.source.rgb*u.material.w*(.20+.8*supply)*(.35+.65*u.material.y);
    let contribution=transmission*coverage;
    color+=contribution*(scattered+emit);
    sourceLight+=contribution*emit;
    transmission*=1.-coverage;
  }
  out.main=vec4f(color,1.-transmission);
  out.radiance=vec4f(sourceLight,1.);return out;
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
