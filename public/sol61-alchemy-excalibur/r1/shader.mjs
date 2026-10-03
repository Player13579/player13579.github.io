export const WORLD_WGSL = /* wgsl */`
struct Params { data: array<vec4<f32>,8> };
@group(0) @binding(0) var<uniform> u: Params;
struct Vertex { @builtin(position) position:vec4<f32>, @location(0) uv:vec2<f32> };
@vertex fn vertexMain(@builtin(vertex_index) i:u32) -> Vertex {
  let p=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
  var o:Vertex;o.position=vec4<f32>(p[i],0.,1.);o.uv=vec2<f32>((p[i].x+1.)*.5,(1.-p[i].y)*.5);return o;
}
fn sq(x:f32)->f32 {return x*x;}
@fragment fn fragmentMain(v:Vertex) -> @location(0) vec4<f32> {
  let age=u.data[0].z; let isEnabled=u.data[0].w;
  if(isEnabled<.5 || age<0. || age>=1200.) {return vec4<f32>(0.);}
  let hand=u.data[1].xy; let end=u.data[1].zw; let dir=u.data[2].xy;
  let halfWidth=u.data[2].z; let normal=vec2<f32>(-dir.y,dir.x);
  let rel=v.position.xy-hand; let x=dot(rel,dir);let y=dot(rel,normal);
  let pathLength=max(1.,dot(end-hand,dir));
  let drive=clamp(age/320.,0.,1.);let headFraction=drive*drive*(3.-2.*drive);
  let reached=max(1.,pathLength*headFraction);let longitudinal=clamp(x/reached,0.,1.);
  let erosion=clamp((age-900.)/300.,0.,1.);
  let widthProfile=halfWidth*(.22+.78*pow(max(0.,sin(longitudinal*3.14159265)),.65));
  let lean=halfWidth*.12*sin(longitudinal*3.14159265);
  let normalizedY=(y-lean)/max(1.,widthProfile);
  let bentFace=reached-halfWidth*.42*sq(normalizedY);
  let aa=max(.75,fwidth(y));
  let side=1.-smoothstep(widthProfile-aa,widthProfile+aa,abs(y-lean));
  let rootErase=reached*erosion;
  let axial=smoothstep(rootErase-aa,rootErase+aa,x)*(1.-smoothstep(bentFace-aa,bentFace+aa,x));
  let aperture=smoothstep(0.,35.,age);let tail=1.-smoothstep(1120.,1200.,age);
  let coverage=side*axial*aperture*tail;
  // Two broad internal openings reveal independent surfaces, not decorative speed lines.
  let seamA=.20+.07*sin(longitudinal*4.);
  let seamB=-.46+.10*cos(longitudinal*3.);
  let seamEnvelope=smoothstep(.07,.25,longitudinal)*(1.-smoothstep(.72,.95,longitudinal));
  let gapA=1.-smoothstep(.07,.15,abs(normalizedY-seamA));
  let gapB=1.-smoothstep(.09,.18,abs(normalizedY-seamB));
  let density=1.-seamEnvelope*max(gapA*.72,gapB*.46);
  let faceDistance=abs(x-bentFace);
  let whiteCore=exp(-sq(faceDistance/max(1.,halfWidth*.035)))*side;
  let broadFace=exp(-sq(faceDistance/max(1.,halfWidth*.18)))*side;
  let innerFold=exp(-sq((normalizedY+.16)/.26));
  let rim=pow(clamp(abs(normalizedY),0.,1.),5.);
  let warm=vec3<f32>(1.25,.59,.105);let silver=vec3<f32>(.25,.54,.78);
  let color=mix(silver,warm,smoothstep(-.5,.62,normalizedY));
  let sustain=.52+.34*(1.-longitudinal)+.27*innerFold;
  let body=color*density*sustain;
  let radiance=(body+warm*rim*.55+vec3<f32>(3.9,3.55,2.75)*whiteCore+
    vec3<f32>(1.8,.86,.24)*broadFace)*coverage;
  return vec4<f32>(radiance,coverage*density);
}`;

export const POST_WGSL = /* wgsl */`
struct Params {data:array<vec4<f32>,8>};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var sourceSampler:sampler;
struct Vertex { @builtin(position) position:vec4<f32>, @location(0) uv:vec2<f32> };
@vertex fn vertexMain(@builtin(vertex_index) i:u32)->Vertex {
  let p=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
  var o:Vertex;o.position=vec4<f32>(p[i],0.,1.);o.uv=vec2<f32>((p[i].x+1.)*.5,(1.-p[i].y)*.5);return o;
}
@fragment fn fragmentMain(v:Vertex)->@location(0) vec4<f32> {
  let viewport=u.data[0].xy;let q=v.uv;let texel=1./viewport;
  let base=textureSampleLevel(source,sourceSampler,q,0.).rgb;
  var halo=vec3<f32>(0.);
  // OBS1: finite nine-tap source transport in screen space, after world rendering.
  // It is not a second geometry copy; source OFF yields exact zero contribution.
  let offsets=array<vec2<f32>,8>(vec2<f32>(1.,0.),vec2<f32>(-1.,0.),vec2<f32>(0.,1.),vec2<f32>(0.,-1.),
    vec2<f32>(.707,.707),vec2<f32>(-.707,.707),vec2<f32>(.707,-.707),vec2<f32>(-.707,-.707));
  let spread=max(2.,u.data[2].z*.34);
  for(var i=0u;i<8u;i=i+1u) {
    halo+=textureSampleLevel(source,sourceSampler,q+offsets[i]*texel*spread,0.).rgb;
  }
  halo=halo/8.;
  let observation=(halo*.26+base*.045)*u.data[3].x;
  let linear=u.data[3].yzw+base+observation;
  // Fixed observer exposure, no background-adaptive tone or primary brightness repair.
  let mapped=1.-exp(-linear);
  return vec4<f32>(pow(max(mapped,vec3<f32>(0.)),vec3<f32>(1./2.2)),1.);
}`;
