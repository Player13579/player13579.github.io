struct Settings { resolution:vec2f, bloom:f32, exposure:f32, background:vec4f, control:vec4f };
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var linearClamp:sampler;
@group(0) @binding(2) var<uniform> cfg:Settings;
struct Out { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vertex_main(@builtin(vertex_index) i:u32)->Out {
 var p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:Out;
 o.position=vec4f(p[i],0.0,1.0);o.uv=vec2f((p[i].x+1.0)*0.5,(1.0-p[i].y)*0.5);return o;
}
fn shoulder(x:vec3f)->vec3f {return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),vec3f(0.0),vec3f(1.0));}
@fragment fn fragment_main(v:Out)->@location(0) vec4f {
 let base=textureSampleLevel(source,linearClamp,v.uv,0.0);
 var bloom=vec3f(0.0);
 let offsets=array<vec2f,8>(vec2f(1.5,0.0),vec2f(-1.5,0.0),vec2f(0.0,1.5),vec2f(0.0,-1.5),vec2f(3.0,3.0),vec2f(-3.0,3.0),vec2f(3.0,-3.0),vec2f(-3.0,-3.0));
 for(var i=0u;i<8u;i++){
  let c=textureSampleLevel(source,linearClamp,v.uv+offsets[i]*cfg.control.x/cfg.resolution,0.0);
  bloom+=max(c.rgb-vec3f(1.15),vec3f(0.0))/8.0;
 }
 let energy=base.rgb+bloom*cfg.bloom;
 let cover=clamp(base.a+max(max(bloom.r,bloom.g),bloom.b)*cfg.bloom*0.16,0.0,1.0);
 let rgb=pow(shoulder(energy/max(cover,0.0001)*cfg.exposure),vec3f(1.0/2.2))*cover;
 // Transparent API by default. Preview display backgrounds are OBS, never world geometry.
 return vec4f(rgb+cfg.background.rgb*cfg.background.a*(1.0-cover),cover+cfg.background.a*(1.0-cover));
}
