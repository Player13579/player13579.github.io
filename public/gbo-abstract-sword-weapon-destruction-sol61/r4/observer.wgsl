struct Out {@builtin(position) pos:vec4f,@location(0) uv:vec2f};
@group(0) @binding(0) var scene:texture_2d<f32>;
@group(0) @binding(1) var sceneSampler:sampler;
@group(0) @binding(2) var<uniform> params:vec4f;
@vertex fn screenVS(@builtin(vertex_index) i:u32)->Out{let p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:Out;o.pos=vec4f(p[i],0.0,1.0);o.uv=p[i]*vec2f(.5,-.5)+vec2f(.5,.5);return o;}
fn bright(uv:vec2f)->vec3f{let c=textureSampleLevel(scene,sceneSampler,uv,0.0).rgb;return max(c-vec3f(2.1),vec3f(0.0));}
fn encode(c:vec3f)->vec3f{return select(12.92*c,1.055*pow(max(c,vec3f(0.0)),vec3f(1.0/2.4))-.055,c>vec3f(.0031308));}
@fragment fn observerFS(o:Out)->@location(0) vec4f{
 let base=textureSampleLevel(scene,sceneSampler,o.uv,0.0);let delta=vec2f(2.2)/params.xy;
 // 既存の高輝度剣破断面だけが局所PSFへ入力する。独立した輪・ゴーストを作らない。
 let halo=(bright(o.uv+vec2f(delta.x,0.0))+bright(o.uv-vec2f(delta.x,0.0))+bright(o.uv+vec2f(0.0,delta.y))+bright(o.uv-vec2f(0.0,delta.y)))*.25*.42*params.z;
 let coverage=max(base.a,clamp(max(halo.r,max(halo.g,halo.b))*.24,0.0,1.0));
 if(coverage<.00001){return vec4f(0.0);}
 let straight=(base.rgb+halo)/coverage;let display=select(straight,encode(straight),params.w>.5);return vec4f(display*coverage,coverage);
}
