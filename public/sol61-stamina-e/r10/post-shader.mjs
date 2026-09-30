export const postShader=/*wgsl*/`
struct U{viewport:vec4f,event:vec4f,options:vec4f,gates:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var input:texture_2d<f32>;
@group(0) @binding(2) var scene:texture_2d<f32>;
@group(0) @binding(3) var emission:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(a[i],0,1);}
fn blur(p:vec2i,axis:vec2i)->vec4f{let size=vec2i(textureDimensions(input));var sum=vec3f(0.);var weight=0.;for(var i=-7;i<=7;i++){let w=exp(-f32(i*i)/11.);sum+=textureLoad(input,clamp(p+axis*i*i32(round(u.viewport.w)),vec2i(0),size-vec2i(1)),0).rgb*w;weight+=w;}return vec4f(sum/weight,1.);}
@fragment fn horizontal(@builtin(position)p:vec4f)->@location(0)vec4f{return blur(vec2i(p.xy),vec2i(1,0));}
@fragment fn vertical(@builtin(position)p:vec4f)->@location(0)vec4f{return blur(vec2i(p.xy),vec2i(0,1));}
fn hot(p:vec2i)->vec3f{let size=vec2i(textureDimensions(emission));let f=textureLoad(emission,clamp(p,vec2i(0),size-vec2i(1)),0).rgb;return vec3f(1.05,1.02,.98)*max(0.,min(f.r,min(f.g,f.b))-.40);}
fn rays(p:vec2i)->vec3f{let axis=vec2f(.848048096,.529919264);let perpendicular=vec2f(-axis.y,axis.x);var sum=vec3f(0.);for(var i=-7;i<=7;i++){sum+=hot(p+vec2i(round(axis*f32(i)*u.viewport.w)))*exp(-f32(i*i)/19.)*.13;}for(var i=-4;i<=4;i++){sum+=hot(p+vec2i(round(perpendicular*f32(i)*u.viewport.w)))*exp(-f32(i*i)/6.)*.12;}return sum;}
@fragment fn composite(@builtin(position)p:vec4f)->@location(0)vec4f{let q=vec2i(p.xy);let world=textureLoad(scene,q,0).rgb;let near=textureLoad(input,q,0).rgb*.30*u.options.y;let sparkle=rays(q)*u.options.y*u.gates.z;return vec4f(pow(max(vec3f(0.),world+near+sparkle),vec3f(1./2.2)),1.);}
`;
