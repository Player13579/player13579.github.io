struct K { kernelMeta:vec4f, weights:array<vec4f,11> };
@group(0) @binding(0) var emission:texture_2d<f32>;
@group(0) @binding(1) var<uniform> kernel:K;
struct V { @builtin(position) p:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:V;o.p=vec4f(p[i],0,1);return o;}
fn weight(i:u32)->f32{return kernel.weights[i/4u][i%4u];}
fn sampleZero(p:vec2i)->vec3f{let extent=vec2i(textureDimensions(emission));if(any(p<vec2i(0))||any(p>=extent)){return vec3f(0.);}return textureLoad(emission,p,0).rgb;}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f{
 let p=vec2i(pos.xy);let offset=i32(kernel.kernelMeta.x);let count=u32(kernel.kernelMeta.y);var value=vec3f(0.);
 for(var i=0u;i<41u;i++){if(i>=count){break;}let w=weight(i);if(w>0.){value+=sampleZero(p+vec2i(i32(i)-offset,0))*w;}}
 return vec4f(value/kernel.kernelMeta.z,0.);
}
