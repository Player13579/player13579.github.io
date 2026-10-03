
struct U{frame:vec4f,response:vec4f};
@group(0) @binding(0)var<uniform>u:U;
@group(0) @binding(1)var scene:texture_2d<f32>;
@group(0) @binding(2)var source:texture_2d<f32>;
@group(0) @binding(3)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
@fragment fn fs(o:O)->@location(0)vec4f{
 let taps=array<vec2f,9>(vec2f(0.),vec2f(1.,0.),vec2f(-1.,0.),vec2f(0.,1.),vec2f(0.,-1.),vec2f(1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(-1.,-1.));
 var scatter=vec3f(0.);for(var i=0u;i<9u;i++){
  let weight=select(select(.045,.115,i<5u),.36,i==0u);
  let a=textureSample(source,smp,clamp(o.uv+taps[i]*1.4/u.frame.xy,vec2f(0.),vec2f(1.))).rgb;
  let b=textureSample(source,smp,clamp(o.uv+taps[i]*6.5/u.frame.xy,vec2f(0.),vec2f(1.))).rgb;
  scatter+=weight*(a*.14+b*.055);
 }
 let base=textureLoad(scene,vec2i(o.p.xy),0);
 return vec4f(base.rgb+scatter*u.response.x*u.response.y,base.a);
}
