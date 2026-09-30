export const postShader=String.raw`
struct Frame{viewportTime:vec4f,gates:vec4f,more:vec4f,sourceSize:vec4f};
@group(0) @binding(0)var<uniform> f:Frame;
@group(0) @binding(1)var scene:texture_2d<f32>;
@group(0) @binding(2)var radiance:texture_2d<f32>;
@group(0) @binding(3)var smp:sampler;
@vertex fn vertex(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
fn encode(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn finish(@builtin(position)p:vec4f)->@location(0)vec4f{var c=textureLoad(scene,vec2i(p.xy),0).rgb;if(f.more.z>.5){var sum=vec3f(0.);var w=0.;let radius=vec2f(6.)*f.viewportTime.xy/vec2f(1305.,1206.);for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){let q=vec2f(f32(x),f32(y))*.5;let weight=exp(-dot(q,q)*2.);let uv=clamp((p.xy+q*radius)/f.viewportTime.xy,vec2f(0.),vec2f(1.));sum+=textureSampleLevel(radiance,smp,uv,0.).rgb*weight;w+=weight;}}c+=sum/max(w,.0001)*.16;}return vec4f(encode(c),1.);}
`;
