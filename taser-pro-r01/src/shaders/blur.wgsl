struct BlurParams { dir: vec4f }; // x,y = source pixel step, z=threshold enabled,w=unused
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var<uniform> b: BlurParams;
struct BlurVertex { @builtin(position) position: vec4f };
@vertex fn vertex(@builtin(vertex_index) i:u32)->BlurVertex {
  let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:BlurVertex; o.position=vec4f(p[i],0.,1.); return o;
}
fn sampleSource(uv:vec2f)->vec3f {
  let c=textureSampleLevel(src,smp,uv,0.).rgb;
  if(b.dir.z>.5) {
    let peak=max(c.r,max(c.g,c.b));
    return c*smoothstep(.60,1.50,peak);
  }
  return c;
}
// OBS1: 有限9tap×2のsource-bound PSF近似。物理レンズゴーストとは主張しない。
@fragment fn fragment(i:BlurVertex)->@location(0) vec4f {
  let size=vec2f(textureDimensions(src)); let uv=i.position.xy/size;
  let step=b.dir.xy/size;
  var sum=sampleSource(uv)*.227027;
  sum+=(sampleSource(uv+step*1.)+sampleSource(uv-step*1.))*.1945946;
  sum+=(sampleSource(uv+step*2.)+sampleSource(uv-step*2.))*.1216216;
  sum+=(sampleSource(uv+step*3.)+sampleSource(uv-step*3.))*.054054;
  sum+=(sampleSource(uv+step*4.)+sampleSource(uv-step*4.))*.016216;
  return vec4f(sum,0.);
}
