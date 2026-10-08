import {FORM_WGSL} from './form.mjs';
export const WORLD_WGSL = /* wgsl */`
struct Params {viewport:vec4f,contact:vec4f,optical:vec4f,};
@group(0) @binding(0) var<uniform> u:Params;
struct VOut {@builtin(position) position:vec4f,@location(0) uv:vec2f,};
@vertex fn vertexMain(@builtin(vertex_index) i:u32)->VOut {
  let positions=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var out:VOut;out.position=vec4f(positions[i],0,1);
  out.uv=positions[i]*vec2f(.5,-.5)+vec2f(.5);return out;
}
${FORM_WGSL}
fn faceRadiance(face:FaceSample,life:f32,cooling:f32,opening:f32)->vec3f {
  let viewDirection=vec3f(0,0,1);
  // Two curving faces reflect the same local contact illumination. A wider
  // rough lobe moves over the face instead of inheriting an emissive outline.
  let lightDirection=normalize(vec3f(-.42,-.36,1.0));
  let halfDirection=normalize(viewDirection+lightDirection);
  let fresnel = 0.04+.96*pow(1.0-max(dot(face.normal,viewDirection),0.0),5.0);
  let roughSpec=pow(max(dot(face.normal,halfDirection),0.0),14.0)*fresnel;
  let transmittance = exp(-.42*face.thickness);
  let scatter=(1.0-transmittance)*(.45+.55*max(dot(face.normal,lightDirection),0.0));
  let warm=vec3f(1.0,.77,.40);let cold=vec3f(.30,.63,.85);
  let emitted=face.coverage*life*mix(warm,cold,cooling)*(1.45+.65*(1.0-opening));
  let matter=face.coverage*life*vec3f(.50,.64,.76)*(scatter+roughSpec)*3.8*u.optical.y;
  var result=emitted*u.optical.y+matter;
  if(u.optical.z>.5&&u.optical.z<1.5){result=matter;}
  if(u.optical.z>1.5){result=emitted*u.optical.y;}
  return result;
}
@fragment fn worldMain(in:VOut)->@location(0) vec4f {
  if(u.viewport.w<.5||u.viewport.z<0.0||u.viewport.z >= 420.0){return vec4f(0);}
  let p=(in.uv*u.viewport.xy-u.contact.xy)/u.contact.z;
  let t=u.viewport.z/1000.0;
  let terminal=1.0-smooth01((t-.285)/.135);
  let rise=smooth01((t+.002)/.014);
  let compression=rise*exp(-t/.029)*terminal;
  let opening=1.0-exp(-max(t-.018,0.0)/.055);
  let motion=mix(1.0,.52,u.contact.w);
  let shearLife=smooth01((t-.008)/.028)*exp(-max(t-.040,0.0)/.145)*terminal;
  let upper=contactFace(p,opening,motion,0u);
  let lower=contactFace(p,opening,motion,1u);
  let cooling=smooth01((t-.055)/.210);
  let faces=faceRadiance(upper,shearLife,cooling,opening)+faceRadiance(lower,shearLife,cooling,opening);
  // The broad initial compression is localized at the actual event xy. It
  // remains brighter than its finite nearby medium and hands off to faces.
  let slit=band(p.y,.72)*exp(-pow(abs(p.x)/5.7,4.0));
  let density=exp(-dot(p,p)/(2.0*pow(2.1+3.8*opening,2.0)));
  let transmittance = exp(-.23*density);
  let medium=(1.0-transmittance)*rise*exp(-t/.092)*terminal;
  let contactLight=(slit*compression*vec3f(5.2,3.6,1.55)+medium*vec3f(2.5,1.975,1.05))*u.optical.y;
  let support=1.0-smooth01((length(p)-25.0)/7.0);
  var radiance=(faces+contactLight)*support;
  if(u.optical.z>.5&&u.optical.z<1.5){radiance=faces*support;}
  return vec4f(radiance,0);
}`;

export const OBSERVER_WGSL = /* wgsl */`
struct Params {viewport:vec4f,contact:vec4f,optical:vec4f,};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var worldImage:texture_2d<f32>;
struct VOut {@builtin(position) position:vec4f,@location(0) uv:vec2f,};
@vertex fn vertexMain(@builtin(vertex_index) i:u32)->VOut {
  let positions=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var out:VOut;out.position=vec4f(positions[i],0,1);out.uv=positions[i]*vec2f(.5,-.5)+vec2f(.5);return out;
}
fn sourceAt(p:vec2i)->vec3f {
  let size=vec2i(textureDimensions(worldImage));return textureLoad(worldImage,clamp(p,vec2i(0),size-vec2i(1)),0).rgb;
}
fn encodeSRGB(x:vec3f)->vec3f {
  let c=max(x,vec3f(0));return select(12.92*c,1.055*pow(c,vec3f(1.0/2.4))-vec3f(.055),c>vec3f(.0031308));
}
@fragment fn observerMain(in:VOut)->@location(0) vec4f {
  let p=vec2i(in.position.xy);let source=sourceAt(p);
  let psfClock=(1.0-clamp(u.viewport.z/90.0,0.0,1.0))*u.viewport.w;
  // A positive compact 3x3 PSF gives isotropic local spread, without the old
  // four-neighbor cross imprint. Source position and age own every response.
  let stepPx=max(1,i32(round(u.contact.z)));
  var filtered=source*.25;
  filtered+=(sourceAt(p+vec2i(stepPx,0))+sourceAt(p-vec2i(stepPx,0))
    +sourceAt(p+vec2i(0,stepPx))+sourceAt(p-vec2i(0,stepPx)))*.125;
  filtered+=(sourceAt(p+vec2i(stepPx,stepPx))+sourceAt(p-vec2i(stepPx,stepPx))
    +sourceAt(p+vec2i(stepPx,-stepPx))+sourceAt(p+vec2i(-stepPx,stepPx)))*.0625;
  let sensorSpread=filtered*.32*psfClock*u.optical.x*select(1.0,0.0,u.optical.z>.5&&u.optical.z<1.5);
  let radiance=source+sensorSpread;
  let previewField=vec3f(.014,.018,.025);
  let hdr=previewField+radiance;let displayed=hdr/(vec3f(1)+hdr);
  return vec4f(encodeSRGB(displayed),1);
}`;
