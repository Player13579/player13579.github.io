struct U { view:vec4f, caster:vec4f, crop:vec4f, dynamics:vec4f, gates:vec4f, light:vec4f, tint:vec4f, material:vec4f, optical:vec4f, context:vec4f };
struct K { kernelMeta:vec4f, weights:array<vec4f,11> };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var world:texture_2d<f32>;
@group(0) @binding(2) var horizontal:texture_2d<f32>;
@group(0) @binding(3) var<uniform> kernel:K;
struct V { @builtin(position) p:vec4f };@vertex fn vs(@builtin(vertex_index) i:u32)->V{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:V;o.p=vec4f(p[i],0,1);return o;}
fn weight(i:u32)->f32{return kernel.weights[i/4u][i%4u];}
fn sampleZero(p:vec2i)->vec3f{let extent=vec2i(textureDimensions(horizontal));if(any(p<vec2i(0))||any(p>=extent)){return vec3f(0.);}return textureLoad(horizontal,p,0).rgb;}
fn encode(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f{
 let p=vec2i(pos.xy);let offset=i32(kernel.kernelMeta.x);let count=u32(kernel.kernelMeta.y);var response=vec3f(0.);
 for(var i=0u;i<41u;i++){if(i>=count){break;}let w=weight(i);if(w>0.){response+=sampleZero(p+vec2i(0,i32(i)-offset))*w;}}
 var c=textureLoad(world,p,0).rgb+response/kernel.kernelMeta.z*.16*u.gates.y*u.gates.x;
 c=vec3f(1)-exp(-max(c,vec3f(0))*u.light.w);return vec4f(encode(c),1.);
}
