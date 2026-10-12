struct U { view:vec4f, caster:vec4f, crop:vec4f, dynamics:vec4f, gates:vec4f, light:vec4f, tint:vec4f, material:vec4f, optical:vec4f, context:vec4f };
@group(0) @binding(0) var<uniform> u:U;@group(0) @binding(1) var world:texture_2d<f32>;@group(0) @binding(2) var emission:texture_2d<f32>;
struct V { @builtin(position) p:vec4f };@vertex fn vs(@builtin(vertex_index) i:u32)->V{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:V;o.p=vec4f(p[i],0,1);return o;}
fn load(t:texture_2d<f32>,p:vec2i)->vec3f{return textureLoad(t,clamp(p,vec2i(0),vec2i(textureDimensions(t))-vec2i(1)),0).rgb;}
fn encode(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
// Same authored25tap aperture/gain, now its CSS step maps to actual backing DPR.
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f{let p=vec2i(pos.xy);var c=load(world,p);var response=vec3f(0);var weight=0.;for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){let r=vec2f(f32(x),f32(y));let w=exp(-dot(r,r)/2.5);let offset=vec2i(round(r*u.optical.x*u.optical.w));response+=load(emission,p+offset)*w;weight+=w;}}c+=response/max(weight,.0001)*.16*u.gates.y*u.gates.x;c=vec3f(1)-exp(-max(c,vec3f(0))*u.light.w);return vec4f(encode(c),1.);}
