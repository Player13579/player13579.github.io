// Independent OBS candidate 1. Source RGB is already integrated linear radiance;
// source alpha is coverage, never another multiplier on emitted RGB.
export const kernel = Object.freeze(Array.from({length:25},(_,i)=>{
  const b=[1,4,6,4,1],x=i%5,y=Math.floor(i/5);
  return Object.freeze({x:x-2,y:y-2,weight:b[x]*b[y]/256});
}));
export const observerWGSL = /* wgsl */ `
struct ObsParams { view:vec4f, }
@group(0) @binding(0) var sourceTex:texture_2d<f32>;
@group(0) @binding(1) var sourceSampler:sampler;
@group(0) @binding(2) var<uniform> params:ObsParams;
struct VertexOutput { @builtin(position) position:vec4f, @location(0) uv:vec2f, }
@vertex fn vs(@builtin(vertex_index) index:u32)->VertexOutput {
  let positions=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
  let p=positions[index];
  var o:VertexOutput;
  o.position=vec4f(p,0.0,1.0);
  o.uv=vec2f(p.x*0.5+0.5,0.5-p.y*0.5);
  return o;
}
fn sourceAt(uv:vec2f,texel:vec2f)->vec3f {
  let safeUV=clamp(uv,texel*0.5,vec2f(1.0)-texel*0.5);
  return max(textureSampleLevel(sourceTex,sourceSampler,safeUV,0.0).rgb,vec3f(0.0));
}
fn displayEncode(linear:vec3f)->vec3f {
  let low=12.92*linear;
  let high=1.055*pow(linear,vec3f(1.0/2.4))-vec3f(0.055);
  return select(high,low,linear<=vec3f(0.0031308));
}
@fragment fn fs(i:VertexOutput)->@location(0) vec4f {
  let texel=1.0/max(params.view.xy,vec2f(1.0));
  let b=array<f32,5>(1.0,4.0,6.0,4.0,1.0);
  var blur=vec3f(0.0);
  for(var y=0;y<5;y=y+1){
    for(var x=0;x<5;x=x+1){
      let offset=vec2f(f32(x-2),f32(y-2))*texel;
      blur+=sourceAt(i.uv+offset,texel)*(b[x]*b[y]/256.0);
    }
  }
  let direct=sourceAt(i.uv,texel)*max(params.view.z,0.0);
  let radiance=direct+blur*max(params.view.z,0.0)*max(params.view.w,0.0);
  // Unit exposure, hue-preserving shoulder. Strong source energy reaches this
  // stage unclipped; mapping preserves channel ratios rather than whitening RGB.
  let peak=max(radiance.r,max(radiance.g,radiance.b));
  let mapped=radiance/(1.0+peak);
  return vec4f(displayEncode(mapped),1.0);
}`;

// CPU reference for the exact shader kernel, bilinear sampling and edge clamp.
export function evaluateObserver(pixels,width,height,x,y,sourceGain=1,bloomGain=.35){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||pixels.length!==width*height*4)throw new Error('Invalid source texture dimensions');
  const at=(px,py)=>{
    px=Math.max(0,Math.min(width-1,px));py=Math.max(0,Math.min(height-1,py));
    const x0=Math.floor(px),y0=Math.floor(py),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),tx=px-x0,ty=py-y0;
    return [0,1,2].map(c=>Math.max(0,
      pixels[(y0*width+x0)*4+c]*(1-tx)*(1-ty)+pixels[(y0*width+x1)*4+c]*tx*(1-ty)+
      pixels[(y1*width+x0)*4+c]*(1-tx)*ty+pixels[(y1*width+x1)*4+c]*tx*ty));
  };
  const blur=[0,0,0];for(const k of kernel){const s=at(x+k.x,y+k.y);for(let c=0;c<3;c++)blur[c]+=s[c]*k.weight;}
  const s=at(x,y),g=Math.max(0,sourceGain),bg=Math.max(0,bloomGain);
  const radiance=s.map((v,c)=>g*(v+bg*blur[c])),peak=Math.max(...radiance);
  const mapped=radiance.map(v=>v/(1+peak));
  const display=mapped.map(v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055);
  return {radiance,mapped,display,alpha:1};
}
