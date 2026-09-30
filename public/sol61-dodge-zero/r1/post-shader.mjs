export const postShader=String.raw`
struct Frame{viewport:vec4f,actor:vec4f,time:vec4f,gates:vec4f,crop:vec4f,optics:vec4f};
@group(0) @binding(0)var<uniform> f:Frame;
@group(0) @binding(1)var scene:texture_2d<f32>;
@group(0) @binding(2)var field:texture_2d<f32>;
@group(0) @binding(3)var smp:sampler;
struct Out{@builtin(position)position:vec4f};
@vertex fn vertex(@builtin(vertex_index)i:u32)->Out{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:Out;o.position=vec4f(p[i],0.,1.);return o;}
fn encode(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn finish(@builtin(position)p:vec4f)->@location(0)vec4f{var c=textureLoad(scene,vec2i(p.xy),0).rgb;let d=abs(p.xy-f.actor.xy);let support=f.actor.zw*.5+vec2f(f.optics.z+f.optics.x);if(f.gates.w>.5&&all(d<=support)&&f.time.z>.5){var sum=vec3f(0.);var weight=0.;for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){let q=vec2f(f32(x),f32(y))*f.optics.x*.5;let w=exp(-dot(q,q)/(f.optics.x*f.optics.x*.5));sum+=textureSampleLevel(field,smp,(p.xy+q)/f.viewport.xy,0.).rgb*w;weight+=w;}}c+=sum/max(weight,.0001)*f.optics.y;}return vec4f(encode(c),1.);}
`;
