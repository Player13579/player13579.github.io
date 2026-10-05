import {MATERIAL_WGSL} from './material-model.mjs';
export const WORLD_WGSL=String.raw`
struct Params { extent:vec4f, invX:vec4f, invY:vec4f, assetAge:vec4f,
 blade:vec4f, packet:vec4f, packetShape:vec4f, tipSource:vec4f, motes:array<vec4f,32> };
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var sword:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
struct Vert { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Vert {var pts=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:Vert;o.position=vec4f(pts[i],0.0,1.0);return o;}
fn srcAt(screen:vec2f)->vec2f{return vec2f(dot(p.invX.xy,screen)+p.invX.z,dot(p.invY.xy,screen)+p.invY.z);}
fn sourceSample(imagePx:vec2f)->vec4f{if(any(imagePx<vec2f(0.0))||any(imagePx>p.assetAge.xy)){return vec4f(0.0);}return textureSampleLevel(sword,linearSampler,imagePx/p.assetAge.xy,0.0);}
fn bladeCoordinates(imagePx:vec2f)->vec2f{let q=imagePx-vec2f(220.0,1050.0);let u=normalize(vec2f(809.0,-800.0));return vec2f(dot(q,u)/1335.747,dot(q,vec2f(-u.y,u.x)));}
fn materialMask(imagePx:vec2f)->f32{
 let s=sourceSample(imagePx);let q=bladeCoordinates(imagePx);let width=mix(87.0,3.0,clamp((q.x-0.14)/0.86,0.0,1.0));let guard=select(0.0,150.0,q.x>0.04&&q.x<0.23);
 let semantic=select(0.0,1.0,q.x> -0.17&&q.x<1.012&&abs(q.y)<max(width,guard));
 let lum=dot(s.rgb,vec3f(0.2126,0.7152,0.0722));return smoothstep(0.88,0.985,s.a)*smoothstep(0.01,0.05,lum)*semantic;
}
`+MATERIAL_WGSL+String.raw`
struct RadianceOut { @location(0) world:vec4f, @location(1) emission:vec4f };
@fragment fn fs(@builtin(position) frag:vec4f)->RadianceOut {
 var out:RadianceOut;out.world=vec4f(0.0);out.emission=vec4f(0.0);if(p.extent.z<0.5){return out;}
 let x=frag.xy;let imagePx=srcAt(x);let source=sourceSample(imagePx);let q=bladeCoordinates(imagePx);let material=materialMask(imagePx);
 let width=mix(87.0,3.0,clamp((q.x-0.14)/0.86,0.0,1.0));let lateral=clamp(q.y/max(3.0,width),-1.0,1.0);
 let bevel=smoothstep(0.68,0.94,abs(lateral));let slope=sign(lateral)*mix(0.28,1.10,bevel);
 let n=normalize(vec3f(p.motes[30].xy*slope,1.0));let v=vec3f(0.0,0.0,1.0);let l=normalize(p.motes[29].xyz);
 let roughness=clamp(p.motes[28].x*(1.0+bevel*0.30-abs(lateral)*0.12),0.14,0.8);
 let gold=select(0.0,1.0,source.r>source.b*1.55&&source.g>source.b*1.10&&q.x<0.24);
 let handle=select(0.0,1.0,q.x<0.035&&gold<0.5);
 let f0=mix(mix(vec3f(0.56,0.57,0.58),vec3f(0.95,0.68,0.24),gold),vec3f(0.04),handle)*(vec3f(0.65)+source.rgb*0.35);
 let direct=conductorReflection(n,l,v,roughness,f0,vec3f(p.motes[28].y));
 let reflectedView=reflect(-v,n);let env=fresnel(f0,dot(n,v))*studioRadiance(reflectedView,roughness)*p.motes[28].z;
 let handleDiffuse=source.rgb*max(0.0,dot(n,l))*p.motes[28].y*(vec3f(1.0)-fresnel(vec3f(0.04),dot(n,v)))*handle/3.14159265359;
 var reflected=(direct+env+handleDiffuse)*material;
 let radius=p.invY.w;let m1=materialMask(srcAt(x+vec2f(radius,0.0)));let m2=materialMask(srcAt(x-vec2f(radius,0.0)));let m3=materialMask(srcAt(x+vec2f(0.0,radius)));let m4=materialMask(srcAt(x-vec2f(0.0,radius)));
 let outer=max(max(m1,m2),max(m3,m4));let inner=min(min(m1,m2),min(m3,m4));let edge=max(outer-material,material-inner);
 var received=0.0;
 for(var i:u32=14u;i<28u;i++){let dep=p.motes[i];let d=length(x-dep.xy)/max(0.01,dep.z);if(d<3.0){received+=dep.w*exp(-d*d*0.85);}}
 // Deposits spread on the actual blade, never a clock-only precharge.
 let field=received*0.46;let rim=field*edge*14.0;
 let insideChannel=material*exp(-lateral*lateral*8.0)*field*2.2;
 var light=vec3f(1.0,0.61,0.20)*rim+vec3f(1.0,0.76,0.37)*insideChannel;
 // E-source near-edge irradiance gives a separate reflected world response. It is not an optical emitter.
 let inwardIrradiance=field*(1.0-exp(-abs(lateral)*3.0));
 reflected+=fresnel(f0,dot(n,v))*vec3f(1.0,0.61,0.20)*inwardIrradiance*material*0.75;
 var coverage=max(material*source.a,edge*min(field,1.0));
 for(var i:u32=0u;i<14u;i++){let mote=p.motes[i];let d=length(x-mote.xy)/max(0.001,mote.z);if(d<3.2){let shape=exp(-d*d*1.35)*(1.0-smoothstep(2.9,3.2,d));let power=mote.w*shape;light+=vec3f(1.0,0.78,0.40)*power;coverage=max(coverage,min(1.0,power*0.42));}}
 if(p.packetShape.w>0.5&&p.packetShape.z>0.0){
  let delta=x-p.packet.xy;let axis=p.packet.zw;let side=vec2f(-axis.y,axis.x);let along=dot(delta,axis)/max(0.01,p.packetShape.x);let across=dot(delta,side)/max(0.01,p.packetShape.y);
  // Asymmetric tapered light front: wide trailing shoulder, sharp forward nose.
  let widthShape=clamp((1.0-along)*0.82,0.02,1.0);let transverse=abs(across)/widthShape;
  let boundary=1.0-smoothstep(0.80,1.04,transverse);let ends=smoothstep(-1.0,-0.78,along)*(1.0-smoothstep(0.92,1.02,along));let body=boundary*ends;
  let ridge=exp(-across*across*16.0)*ends;let front=exp(-pow((along-0.55)*3.8,2.0))*boundary;
  let depth=body*(0.35+0.65*sqrt(max(0.0,1.0-transverse*transverse)));
  light+=p.packetShape.z*(vec3f(1.0,0.42,0.08)*depth*6.5+vec3f(1.0,0.87,0.55)*ridge*17.0+vec3f(1.0,0.69,0.29)*front*5.0);
  coverage=max(coverage,body*p.packetShape.z*0.96);
 }
 out.world=vec4f(reflected+light,coverage);out.emission=vec4f(light,select(0.0,1.0,dot(light,vec3f(0.2126,0.7152,0.0722))>0.0001));return out;
}`;

export const OBS_WGSL=String.raw`
struct Params { extent:vec4f, invX:vec4f, invY:vec4f, assetAge:vec4f,
 blade:vec4f, packet:vec4f, packetShape:vec4f, tipSource:vec4f, motes:array<vec4f,32> };
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var world:texture_2d<f32>;
@group(0) @binding(2) var emission:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
struct Vert { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Vert {var points=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:Vert;o.position=vec4f(points[i],0.0,1.0);return o;}
fn sampleLight(pixel:vec2f)->vec3f{if(any(pixel<vec2f(0.0))||any(pixel>=p.extent.xy)){return vec3f(0.0);}return textureSampleLevel(emission,linearSampler,pixel/p.extent.xy,0.0).rgb;}
fn lumen(rgb:vec3f)->f32{return dot(rgb,vec3f(0.2126,0.7152,0.0722));}
struct SourceProbe { position:vec2f, radiance:vec3f };
fn emittedSource(seed:vec2f,along:vec2f,span:f32)->SourceProbe{
 let normal=vec2f(-along.y,along.x);var moment=vec2f(0.0);var power=0.0;var peak=vec3f(0.0);
 for(var row:i32=-1;row<=1;row++){
  for(var column:i32=-3;column<=3;column++){
   let pixel=seed+along*f32(row)*span*0.45+normal*f32(column)*span/3.0;
   let radiance=sampleLight(pixel);let weight=lumen(radiance);moment+=pixel*weight;power+=weight;
   if(lumen(radiance)>lumen(peak)){peak=radiance;}
  }
 }
 var out:SourceProbe;out.position=select(seed,moment/max(power,0.00001),power>0.00001);out.radiance=peak;return out;
}
// Hue-preserving common ratio compression; no background-dependent exposure or per-channel white clamp.
fn displayMap(hdr:vec3f)->vec3f{let peak=max(hdr.r,max(hdr.g,hdr.b));return hdr/(1.0+peak);}
@fragment fn fs(@builtin(position) f:vec4f)->@location(0) vec4f{
 if(p.extent.z<0.5){return vec4f(0.0);}
 let x=f.xy;let scene=textureSampleLevel(world,linearSampler,x/p.extent.xy,0.0);
 var optics=vec3f(0.0);
 if(p.extent.w>0.5){
  // A normalized sparse finite PSF, sampled solely from actual emitted radiance MRT.
  let blurRadius=max(1.0,p.assetAge.w*0.044);var blurred=sampleLight(x)*0.18;
  for(var i:u32=0u;i<8u;i++){
   let angle=f32(i)*0.785398163;let d=vec2f(cos(angle),sin(angle));
   blurred+=sampleLight(x+d*blurRadius)*0.0675;
   blurred+=sampleLight(x+d*blurRadius*2.5)*0.035;
  }
  optics+=blurred*0.19;
  // Coated near-circular camera lens: one weak defocused reflected aperture image.
  // Its screen placement is collinear with the emitter and optical centre. Not a world ring.
  var seed=p.tipSource.xy;var sourceAxis=normalize(p.blade.zw-p.blade.xy);
  if(p.packetShape.z>p.invX.w*0.65){seed=p.packet.xy;sourceAxis=p.packet.zw;}
  let actualSource=emittedSource(seed,sourceAxis,max(1.0,p.assetAge.w*0.050));
  let emitter=actualSource.position;let probe=actualSource.radiance;
  let sourcePower=lumen(probe);let admitted=max(0.0,sourcePower-0.35);
  let center=p.extent.xy*0.5;let offset=emitter-center;let opticalOffset=length(offset)/max(1.0,min(p.extent.x,p.extent.y));
  let ghostCenter=center-offset*0.46;let ghostRadius=max(2.4,p.assetAge.w*0.073);
  let r=length(x-ghostCenter)/ghostRadius;let aperture=exp(-r*r*2.3)*(1.0-smoothstep(0.78,1.2,r));
  let reflectionLoss=0.012/(1.0+opticalOffset*opticalOffset*5.0);
  optics+=probe*reflectionLoss*aperture*select(0.0,1.0,admitted>0.0)*vec3f(0.72,0.85,1.0);
  // Source-bound diffraction/scatter streak, not a freestanding decorative cross.
  let delta=x-emitter;let spread=max(1.0,p.assetAge.w*0.016);
  let streak=exp(-abs(delta.x)/max(1.0,p.assetAge.w*0.31))*exp(-pow(delta.y/spread,2.0)*2.0);
  optics+=probe*0.026*streak*select(0.0,1.0,admitted>0.0);
 }
 let hdr=scene.rgb+optics;let coverage=max(scene.a,1.0-exp(-lumen(optics)*0.72));
 // Premultiplied presentation: additive radiance remains visible at every supported alpha.
 return vec4f(displayMap(hdr/max(coverage,0.00001))*coverage,coverage);
}`;
