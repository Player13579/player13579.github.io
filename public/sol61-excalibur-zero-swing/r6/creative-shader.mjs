import {MATERIAL_WGSL} from './material-model.mjs';
import {FIELD_WGSL} from './field-model.mjs';
export const WORLD_WGSL=String.raw`
struct Params { extent:vec4f, invX:vec4f, invY:vec4f, assetAge:vec4f,
 blade:vec4f, packet:vec4f, packetShape:vec4f, tipSource:vec4f, motes:array<vec4f,72> };
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
`+MATERIAL_WGSL+FIELD_WGSL+String.raw`
struct RadianceOut { @location(0) world:vec4f, @location(1) emission:vec4f };
@fragment fn fs(@builtin(position) frag:vec4f)->RadianceOut {
 var out:RadianceOut;out.world=vec4f(0.0);out.emission=vec4f(0.0);if(p.extent.z<0.5){return out;}
 let x=frag.xy;let imagePx=srcAt(x);let source=sourceSample(imagePx);let q=bladeCoordinates(imagePx);let material=materialMask(imagePx);
 let width=mix(87.0,3.0,clamp((q.x-0.14)/0.86,0.0,1.0));let lateral=clamp(q.y/max(3.0,width),-1.0,1.0);
 let bevel=smoothstep(0.68,0.94,abs(lateral));let slope=sign(lateral)*mix(0.28,1.10,bevel);
 let n=normalize(vec3f(p.motes[30].xy*slope,1.0));let v=vec3f(0.0,0.0,1.0);let l=normalize(p.motes[29].xyz);
 let roughness=clamp(p.motes[28].x*(1.0+bevel*0.30-abs(lateral)*0.12),0.14,0.8);
 let originalGold=select(0.0,1.0,source.r>source.b*1.55&&source.g>source.b*1.10&&q.x<0.24);
 let gold=select(0.0,1.0,q.x>=0.035||originalGold>0.5);
 let handle=select(0.0,1.0,q.x<0.035&&gold<0.5);
 // Gold conductor has its own RGB reflectance; the old steel image does not darken its F0.
 let f0=mix(vec3f(0.98,0.78,0.34),vec3f(0.04),handle);
 let direct=conductorReflection(n,l,v,roughness,f0,vec3f(p.motes[28].y));
 let reflectedView=reflect(-v,n);let env=fresnel(f0,dot(n,v))*studioRadiance(reflectedView,roughness)*p.motes[28].z;
 let handleDiffuse=source.rgb*max(0.0,dot(n,l))*p.motes[28].y*(vec3f(1.0)-fresnel(vec3f(0.04),dot(n,v)))*handle/3.14159265359;
 var reflected=(direct+env+handleDiffuse)*material;
 let radius=p.invY.w;let m1=materialMask(srcAt(x+vec2f(radius,0.0)));let m2=materialMask(srcAt(x-vec2f(radius,0.0)));let m3=materialMask(srcAt(x+vec2f(0.0,radius)));let m4=materialMask(srcAt(x-vec2f(0.0,radius)));
 let outer=max(max(m1,m2),max(m3,m4));let inner=min(min(m1,m2),min(m3,m4));let edge=max(outer-material,material-inner);
 var received=0.0;
 for(var i:u32=14u;i<28u;i++){let dep=p.motes[i];let d=length(x-dep.xy)/max(0.01,dep.z);if(d<2.4){received+=dep.w*exp(-d*d*2.0)*(1.0-smoothstep(2.0,2.4,d));}}
 // Deposits spread on the actual blade, never a clock-only precharge.
 // Local conduction kernels are zero until their own receiver has deposited field.
 let field=received*0.34;let rim=field*edge*68.0;
 let spine=material*exp(-lateral*lateral*20.0)*field*16.0;
 let shoulders=material*exp(-lateral*lateral*3.0)*field*5.0;
 var light=vec3f(1.0,0.97,0.72)*rim+vec3f(1.0,0.95,0.44)*spine+vec3f(1.0,0.93,0.22)*shoulders;
 // E-source near-edge irradiance gives a separate reflected world response. It is not an optical emitter.
 let inwardIrradiance=field*(1.0-exp(-abs(lateral)*3.0));
 reflected+=fresnel(f0,dot(n,v))*vec3f(1.0,0.93,0.22)*inwardIrradiance*material*0.75;
 var coverage=max(material*source.a,edge*min(field,1.0));
 for(var i:u32=0u;i<14u;i++){let mote=p.motes[i];let d=length(x-mote.xy)/max(0.001,mote.z);if(d<3.2){let receiverPos=p.motes[14u+i].xy;let toTarget=receiverPos-mote.xy;let separation=length(toTarget);
 let tangent=toTarget/max(separation,0.001);let normal=vec2f(-tangent.y,tangent.x);let delta=x-mote.xy;
 let stretch=1.0+min(1.7,separation/max(0.01,mote.z)*0.10);
 let ds=select(d,length(vec2f(dot(delta,tangent)/stretch,dot(delta,normal)))/max(0.001,mote.z),separation>0.001);
 let shape=exp(-ds*ds*1.35)*(1.0-smoothstep(2.9,3.2,ds));let core=exp(-ds*ds*6.0);
 let power=mote.w*shape;light+=mote.w*(vec3f(1.0,0.93,0.22)*shape+vec3f(1.0,0.99,0.85)*core*0.8);coverage=max(coverage,min(1.0,power*0.42));}}
 if(p.packetShape.w>0.5&&p.packetShape.z>0.0){
  let delta=x-p.packet.xy;let axis=p.packet.zw;let side=vec2f(-axis.y,axis.x);let along=dot(delta,axis)/max(0.01,p.packetShape.x);let across=dot(delta,side)/max(0.01,p.packetShape.y);
  // A finite sheared radiance sheet: bowed leading ridge, two continuous transport channels, open trailing falloff.
  let shape=packetField(along,across);light+=p.packetShape.z*shape.rgb;
  coverage=max(coverage,shape.a*p.packetShape.z*0.96);
 }
 for(var i:u32=32u;i<60u;i++){
  let mote=p.motes[i];let d=length(x-mote.xy)/max(0.001,mote.z);
  if(d<2.8&&mote.w>0.0){let shape=exp(-d*d*1.8)*(1.0-smoothstep(2.2,2.8,d));let core=exp(-d*d*7.0);
   light+=mote.w*(vec3f(1.0,0.93,0.22)*shape+vec3f(1.0,0.99,0.85)*core*0.8);coverage=max(coverage,min(1.0,mote.w*shape*0.11));}
 }
 out.world=vec4f(reflected*p.motes[31].w+light,coverage);out.emission=vec4f(light,select(0.0,1.0,dot(light,vec3f(0.2126,0.7152,0.0722))>0.0001));return out;
}`;

export const PROBE_WGSL=String.raw`
struct Params { extent:vec4f, invX:vec4f, invY:vec4f, assetAge:vec4f,
 blade:vec4f, packet:vec4f, packetShape:vec4f, tipSource:vec4f, motes:array<vec4f,72> };
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var world:texture_2d<f32>;
@group(0) @binding(2) var emission:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
struct Vert { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Vert {var points=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:Vert;o.position=vec4f(points[i],0.0,1.0);return o;}
fn sampleLight(pixel:vec2f)->vec3f{if(any(pixel<vec2f(0.0))||any(pixel>=p.extent.xy)){return vec3f(0.0);}return textureSampleLevel(emission,linearSampler,pixel/p.extent.xy,0.0).rgb;}
fn lumen(rgb:vec3f)->f32{return dot(rgb,vec3f(0.2126,0.7152,0.0722));}
struct SourceProbe { position:vec2f, flux:vec3f };
fn emittedSource(seed:vec2f,along:vec2f,span:f32)->SourceProbe{
 let normal=vec2f(-along.y,along.x);var moment=vec2f(0.0);var power=0.0;var flux=vec3f(0.0);
 let step=max(0.7,span/3.0);
 for(var row:i32=-2;row<=2;row++){
  for(var column:i32=-3;column<=3;column++){
   let pixel=seed+along*f32(row)*step+normal*f32(column)*step;
   let radiance=sampleLight(pixel);let weight=lumen(radiance);moment+=pixel*weight;power+=weight;flux+=radiance*step*step;
  }
 }
 var out:SourceProbe;out.position=select(seed,moment/max(power,0.00001),power>0.00001);out.flux=flux;return out;
}

@fragment fn fs(@builtin(position) f:vec4f)->@location(0) vec4f{
 if(p.extent.z<0.5||p.extent.w<0.5||p.tipSource.w<=0.0||(p.motes[31].y<=0.0&&p.motes[31].z<=0.0)){return vec4f(0.0);}
 var seed=p.tipSource.xy;var sourceAxis=normalize(p.blade.zw-p.blade.xy);
 if(p.packetShape.z>p.invX.w*0.65){seed=p.packet.xy+p.packet.zw*p.packetShape.x*0.58;sourceAxis=p.packet.zw;}
 let source=emittedSource(seed,sourceAxis,max(2.1,p.assetAge.w*0.033));
 if(f.x<1.0){return vec4f(source.flux,0.0);}
 return vec4f(source.position,0.0,0.0);
}`;
export const OBS_WGSL=String.raw`
struct Params { extent:vec4f, invX:vec4f, invY:vec4f, assetAge:vec4f,
 blade:vec4f, packet:vec4f, packetShape:vec4f, tipSource:vec4f, motes:array<vec4f,72> };
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var world:texture_2d<f32>;
@group(0) @binding(2) var emission:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
@group(0) @binding(4) var opticalSource:texture_2d<f32>;
struct Vert { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Vert {var points=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:Vert;o.position=vec4f(points[i],0.0,1.0);return o;}
fn sampleLight(pixel:vec2f)->vec3f{if(any(pixel<vec2f(0.0))||any(pixel>=p.extent.xy)){return vec3f(0.0);}return textureSampleLevel(emission,linearSampler,pixel/p.extent.xy,0.0).rgb;}
fn lumen(rgb:vec3f)->f32{return dot(rgb,vec3f(0.2126,0.7152,0.0722));}
// Hue-preserving common ratio compression; no background-dependent exposure or per-channel white clamp.
fn displayMap(hdr:vec3f)->vec3f{let peak=max(hdr.r,max(hdr.g,hdr.b));return hdr/(1.0+peak);}
// Canvas bgra8unorm is displayed as sRGB. Linear texture/material HDR must be encoded once.
fn displayEncode(linear:vec3f)->vec3f{let c=max(linear,vec3f(0.0));return select(1.055*pow(c,vec3f(1.0/2.4))-vec3f(0.055),c*12.92,c<=vec3f(0.0031308));}
@fragment fn fs(@builtin(position) f:vec4f)->@location(0) vec4f{
 if(p.extent.z<0.5){return vec4f(0.0);}
 let x=f.xy;let scene=textureSampleLevel(world,linearSampler,x/p.extent.xy,0.0);
 var optics=vec3f(0.0);
 if(p.extent.w>0.5){
  // Finite near PSF, normalized sample weights: .18+8*.0675+8*.035=1.
  if(p.motes[31].x>0.0){
  let blurRadius=max(1.4,p.assetAge.w*0.060);var blurred=sampleLight(x)*0.18;
  for(var i:u32=0u;i<8u;i++){
   let angle=f32(i)*0.785398163;let d=vec2f(cos(angle),sin(angle));
   blurred+=sampleLight(x+d*blurRadius)*0.0675;blurred+=sampleLight(x+d*max(2.2,p.assetAge.w*0.16))*0.035;
  }
  optics+=blurred*0.22*p.motes[31].x;
  }
  // Actual receiver admission, never an age-derived flare onset. Incoming motes receive near PSF only.
  if(p.tipSource.w>0.0){
  let emitter=textureLoad(opticalSource,vec2i(1,0),0).xy;
  let flux=textureLoad(opticalSource,vec2i(0,0),0).rgb;
  // Positive actual light is the entire admission condition: no clock threshold, prearrival rim or constant ghost.
  let center=p.extent.xy*0.5;let offset=emitter-center;let opticalOffset=length(offset)/max(1.0,min(p.extent.x,p.extent.y));
  let ghostCenter=center-offset*0.46;let ghostRadius=max(3.0,p.assetAge.w*0.080);
  let r=length(x-ghostCenter)/ghostRadius;
  let aperture=exp(-r*r*2.3)*(1.0-smoothstep(0.78,1.2,r));
  // Defocus aperture kernel integral approximately pi*R²/2.3; residual loss decreases off axis.
  optics+=flux*(0.03/(1.0+opticalOffset*opticalOffset*5.0))*aperture/(3.14159265359*ghostRadius*ghostRadius/2.3)*vec3f(0.72,0.85,1.0)*p.motes[31].z;
  // Coherent sensor-oriented crossed PSF, angle 0 for all sources and times. Continuous decay, no symbolic arms.
  let delta=x-emitter;let sigma=max(0.65,p.assetAge.w*0.011);
  let lx=max(4.0,p.assetAge.w*0.38);let ly=max(4.0,p.assetAge.w*0.27);
  let horizontal=exp(-abs(delta.x)/lx)*exp(-pow(delta.y/sigma,2.0))/(2.0*lx*sigma*1.77245385);
  let vertical=exp(-abs(delta.y)/ly)*exp(-pow(delta.x/sigma,2.0))/(2.0*ly*sigma*1.77245385);
  let finite=1.0-smoothstep(3.5,4.0,max(abs(delta.x)/lx,abs(delta.y)/ly));
  optics+=flux*0.18*(horizontal*0.60+vertical*0.40)*finite*p.motes[31].y;
  }

 }
 // Constant calibrated camera response: .72 direct throughput and reciprocal sensor exposure.
 // Thus enabling optics never dims the direct white source to manufacture a difference.
 let observedOptics=optics/0.72;let hdr=scene.rgb+observedOptics;let coverage=max(scene.a,1.0-exp(-lumen(observedOptics)*0.72));
 // Premultiplied presentation: additive radiance remains visible at every supported alpha.
 return vec4f(displayEncode(displayMap(hdr/max(coverage,0.00001)))*coverage,coverage);
}`;
