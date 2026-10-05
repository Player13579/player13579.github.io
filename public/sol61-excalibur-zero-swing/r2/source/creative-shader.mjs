export const WORLD_WGSL=String.raw`
struct Params { extent:vec4f, invX:vec4f, invY:vec4f, assetAge:vec4f,
 blade:vec4f, packet:vec4f, packetShape:vec4f, tipSource:vec4f, motes:array<vec4f,32> };
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var sword:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
struct Vert { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Vert {
 var points=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
 var o:Vert; o.position=vec4f(points[i],0.0,1.0);return o;
}
fn srcAt(screen:vec2f)->vec2f{return vec2f(dot(p.invX.xy,screen)+p.invX.z,dot(p.invY.xy,screen)+p.invY.z);}
fn sourceSample(imagePx:vec2f)->vec4f{
 if(any(imagePx<vec2f(0.0))||any(imagePx>p.assetAge.xy)){return vec4f(0.0);}
 return textureSampleLevel(sword,linearSampler,imagePx/p.assetAge.xy,0.0);
}
// Semantic sword support rejects the detached baked radiance in the allowed original.
// No new image or radiance texture is authored here. The sampled original defines the material edge.
fn materialMask(imagePx:vec2f)->f32{
 let s=sourceSample(imagePx);let fromGrip=imagePx-vec2f(220.0,1050.0);
 let axis=normalize(vec2f(954.0,-935.0));let along=dot(fromGrip,axis)/1335.747;
 let lateral=abs(dot(fromGrip,vec2f(-axis.y,axis.x)));
 let bladeWidth=mix(87.0,3.0,clamp((along-0.14)/0.86,0.0,1.0));
 let guardWidth=select(0.0,150.0,along>0.04&&along<0.23);
 let semantic=select(0.0,1.0,along> -0.17&&along<1.012&&lateral<max(bladeWidth,guardWidth));
 let lum=dot(s.rgb,vec3f(0.2126,0.7152,0.0722));
 return smoothstep(0.85,0.985,s.a)*smoothstep(0.16,0.28,lum)*semantic;
}
struct RadianceOut { @location(0) world:vec4f, @location(1) emission:vec4f };
@fragment fn fs(@builtin(position) frag:vec4f)->RadianceOut {
 var out:RadianceOut;out.world=vec4f(0.0);out.emission=vec4f(0.0);
 if(p.extent.z<0.5){return out;}
 let x=frag.xy;let imagePx=srcAt(x);let source=sourceSample(imagePx);
 let radius=p.invY.w;let material=materialMask(imagePx);
 let m1=materialMask(srcAt(x+vec2f(radius,0.0)));let m2=materialMask(srcAt(x-vec2f(radius,0.0)));
 let m3=materialMask(srcAt(x+vec2f(0.0,radius)));let m4=materialMask(srcAt(x-vec2f(0.0,radius)));
 let outer=max(max(m1,m2),max(m3,m4));let inner=min(min(m1,m2),min(m3,m4));
 let edge=max(outer-material,material-inner);
 // Warm energy stays on the original metal; the silver source image keeps its own color.
 let bladeDir=normalize(p.blade.zw-p.blade.xy);let bladeT=clamp(dot(x-p.blade.xy,bladeDir)/max(1.0,length(p.blade.zw-p.blade.xy)),0.0,1.0);
 let rimEnergy=p.invX.w*8.8*edge;
 var light=vec3f(1.0,0.56,0.16)*rimEnergy;var coverage=max(source.a,edge*min(p.invX.w,1.0));
 // Local albedo-bound response near the emitting material edge, not bulk self-emission of every metal pixel.
 let materialResponse=source.rgb*vec3f(1.0,0.56,0.16)*p.invX.w*edge*material*0.24;
 for(var i:u32=0u;i<14u;i++){
  let m=p.motes[i];let dist=length(x-m.xy)/max(m.z,0.001);
  let shape=exp(-dist*dist*1.65);let visible=m.w*shape;
  light+=vec3f(1.0,0.72,0.31)*visible;coverage=max(coverage,min(1.0,visible*0.5));
 }
 if(p.packetShape.w>0.5&&p.packetShape.z>0.0){
  let relative=x-p.packet.xy;let axis=p.packet.zw;let side=vec2f(-axis.y,axis.x);
  let along=dot(relative,axis)/max(0.01,p.packetShape.x);let across=dot(relative,side)/max(0.01,p.packetShape.y);
  // A single finite convex luminous blade packet; clear nose, compressed waist, trailing falloff.
  let width=0.38+0.62*sqrt(max(0.0,1.0-along*along));
  let boundary=1.0-smoothstep(0.76,1.06,abs(across)/width);
  let ends=1.0-smoothstep(0.72,1.03,abs(along));let body=boundary*ends;
  let core=exp(-across*across*10.0)*ends;
  let nose=exp(-pow((along-0.48)*3.5,2.0))*boundary;
  let tail=(1.0-smoothstep(-0.8,0.55,along))*body;
  light+=p.packetShape.z*(vec3f(1.0,0.47,0.09)*body*3.2+vec3f(1.0,0.82,0.41)*core*5.8+vec3f(1.0,0.65,0.21)*nose*2.5);
  coverage=max(coverage,body*p.packetShape.z*0.94+tail*p.packetShape.z*0.04);
 }
 out.world=vec4f(source.rgb*source.a+materialResponse*source.a+light,coverage);
 out.emission=vec4f(light,select(0.0,1.0,dot(light,vec3f(0.2126,0.7152,0.0722))>0.0001));
 return out;
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
  let blurRadius=max(1.0,p.assetAge.w*0.039);var blurred=sampleLight(x)*0.18;
  for(var i:u32=0u;i<8u;i++){
   let angle=f32(i)*0.785398163;let d=vec2f(cos(angle),sin(angle));
   blurred+=sampleLight(x+d*blurRadius)*0.0675;
   blurred+=sampleLight(x+d*blurRadius*2.5)*0.035;
  }
  optics+=blurred*0.15;
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
  optics+=probe*0.022*streak*select(0.0,1.0,admitted>0.0);
 }
 let hdr=scene.rgb+optics;let coverage=max(scene.a,1.0-exp(-lumen(optics)*0.72));
 // Premultiplied presentation: additive radiance remains visible at every supported alpha.
 return vec4f(displayMap(hdr/max(coverage,0.00001))*coverage,coverage);
}`;
