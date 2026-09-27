struct Settings { resolution:vec2f, bloom:f32, exposure:f32, transparent:f32, _p0:f32, _p1:f32, _p2:f32 };
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var texSampler:sampler;
@group(0) @binding(2) var<uniform> cfg:Settings;
struct Out { @builtin(position) p:vec4f, @location(0) uv:vec2f };
@vertex fn vertex_main(@builtin(vertex_index) i:u32)->Out {
  var positions=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:Out;o.p=vec4f(positions[i],0.,1.);o.uv=vec2f((positions[i].x+1.)*.5,(1.-positions[i].y)*.5);return o;
}
fn shoulder(c:vec3f)->vec3f {
  // HDR shoulder retains narrow white cores without hard clipping broad cyan faces.
  return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),vec3f(0.),vec3f(1.));
}
@fragment fn fragment_main(v:Out)->@location(0) vec4f {
  let base=textureSample(source,texSampler,v.uv);
  var halo=vec3f(0.);
  let offsets=array<vec2f,12>(vec2f(1.,0.),vec2f(-1.,0.),vec2f(0.,1.),vec2f(0.,-1.),
   vec2f(2.,2.),vec2f(-2.,2.),vec2f(2.,-2.),vec2f(-2.,-2.),vec2f(4.,0.),vec2f(-4.,0.),vec2f(0.,4.),vec2f(0.,-4.));
  for(var i=0u;i<12u;i++){
    let c=textureSample(source,texSampler,v.uv+offsets[i]/cfg.resolution).rgb;
    halo+=max(c-vec3f(.9),vec3f(0.))/12.;
  }
  let e=base.rgb+halo*cfg.bloom;
  let a=clamp(base.a+max(max(halo.r,halo.g),halo.b)*cfg.bloom*.28,0.,1.);
  // The canvas is premultiplied. Tone mapped RGB never exceeds its coverage alpha.
  let unpremult=e/max(a,.0001);
  let mapped=pow(shoulder(unpremult*cfg.exposure),vec3f(1./2.2))*a;
  return vec4f(mapped,a);
}
