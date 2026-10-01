// OBS01 source-only separable blur。二pass、half-size rgba16float。
struct Blur{step:vec4f};
@group(0) @binding(0)var<uniform> b:Blur;
@group(0) @binding(1)var blurInput:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct V{@builtin(position)position:vec4f,@location(0)uv:vec2f};
@vertex fn vertex(@builtin(vertex_index)i:u32)->V{let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var v:V;v.position=vec4f(q[i],0.,1.);v.uv=q[i]*vec2f(.5,-.5)+vec2f(.5);return v;}
@fragment fn gaussianBlur(v:V)->@location(0)vec4f{let delta=b.step.xy*b.step.zw;var sum=vec4f(0.);var weights=0.;for(var i=-4;i<=4;i++){let w=exp(-.5*pow(f32(i)/2.,2.));sum+=textureSampleLevel(blurInput,smp,v.uv+delta*f32(i),0.)*w;weights+=w;}return sum/weights;}
