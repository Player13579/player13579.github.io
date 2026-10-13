struct Uniforms { viewport:vec4f, timing:vec4f, anchor:vec4f, shape:vec4f };
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var worldTex:texture_2d<f32>;
@group(0) @binding(2) var emitTex:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
struct Vertex { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Vertex {
 var pos=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
 var o:Vertex; o.position=vec4f(pos[i],0.0,1.0); o.uv=vec2f((pos[i].x+1.0)*0.5,(1.0-pos[i].y)*0.5); return o;
}
fn displayEncode(c:vec3f)->vec3f {
 let lo=c*12.92; let hi=1.055*pow(max(c,vec3f(0.0)),vec3f(1.0/2.4))-vec3f(0.055);
 return select(hi,lo,c<=vec3f(0.0031308));
}
@fragment fn fs(in:Vertex)->@location(0) vec4f {
 let base=textureSample(worldTex,linearSampler,in.uv);
 // OBS1: finite eye/display point spread, sourced only by the emitted MRT.
 let span=vec2f(1.65*u.viewport.z/u.viewport.xy/64.0);
 var spread=vec4f(0.0);
 let offsets=array<vec2f,8>(vec2f(1,0),vec2f(-1,0),vec2f(0,1),vec2f(0,-1),vec2f(0.72,0.72),vec2f(-0.72,0.72),vec2f(0.72,-0.72),vec2f(-0.72,-0.72));
 for(var i=0u;i<8u;i=i+1u) { spread+=textureSample(emitTex,linearSampler,in.uv+offsets[i]*span); }
 spread*=0.105*u.timing.z;
 let a=1.0-(1.0-base.a)*(1.0-min(0.94,spread.a));
 if(a<=0.00001) { return vec4f(0.0); }
 let straight=(base.rgb+spread.rgb)/a;
 // Encode once after linear HDR composite, then premultiply for transparent WebGPU surface.
 return vec4f(displayEncode(straight)*a,a);
}
