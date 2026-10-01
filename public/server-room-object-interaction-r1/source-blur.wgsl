struct Blur { step:vec4f };
@group(0) @binding(0) var<uniform> blur:Blur;
@group(0) @binding(1) var blurInput:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
struct VOut { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vertex(@builtin(vertex_index)i:u32)->VOut {
  let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.))[i];
  var o:VOut;o.position=vec4f(q,0.,1.);o.uv=vec2f((q.x+1.)*.5,(1.-q.y)*.5);return o;
}
@fragment fn fragment(in:VOut)->@location(0)vec4f {
  let delta=blur.step.xy*blur.step.zw;
  var sum=vec4f(0.);var weights=0.;
  for(var i=-9;i<=9;i++) {
    let x=f32(i)/2.;let weight=exp(-.5*x*x);
    sum+=textureSampleLevel(blurInput,linearSampler,in.uv+delta*f32(i),0.)*weight;weights+=weight;
  }
  return sum/max(weights,1e-8);
}
