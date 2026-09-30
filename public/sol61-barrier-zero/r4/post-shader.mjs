export const postShader=/*wgsl*/`
struct U{viewport:vec4f,time:vec4f,options:vec4f,more:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var scene:texture_2d<f32>;
@group(0) @binding(3) var emission:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{var a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(a[i],0,1);}
fn blur(p:vec2i,axis:vec2i)->vec4f{let dimensions=vec2i(textureDimensions(source));var rgb=vec3f(0.);var weights=0.;for(var i=-8;i<=8;i++){let weight=exp(-f32(i*i)/14.);rgb+=textureLoad(source,clamp(p+axis*i*i32(round(u.viewport.w)),vec2i(0),dimensions-vec2i(1)),0).rgb*weight;weights+=weight;}return vec4f(rgb/weights,1.);}
@fragment fn horizontal(@builtin(position)p:vec4f)->@location(0)vec4f{return blur(vec2i(p.xy),vec2i(1,0));}
@fragment fn vertical(@builtin(position)p:vec4f)->@location(0)vec4f{return blur(vec2i(p.xy),vec2i(0,1));}
fn whitePeak(p:vec2i)->vec3f{let size=vec2i(textureDimensions(emission));let src=textureLoad(emission,clamp(p,vec2i(0),size-vec2i(1)),0).rgb;let hot=max(0.,min(src.r,min(src.g,src.b))-.65);return vec3f(1.05,1.02,.95)*hot;}
fn cross(p:vec2i)->vec3f{let angle=-.29670597284;let axis=vec2f(cos(angle),sin(angle));let short=vec2f(-axis.y,axis.x);var light=vec3f(0.);for(var i=-6;i<=6;i++){let w=exp(-f32(i*i)/18.);light+=whitePeak(p+vec2i(round(axis*f32(i)*u.viewport.w)))*w*.115;}for(var i=-3;i<=3;i++){let w=exp(-f32(i*i)/5.5);light+=whitePeak(p+vec2i(round(short*f32(i)*u.viewport.w)))*w*.13;}return light;}
@fragment fn composite(@builtin(position)p:vec4f)->@location(0)vec4f{let q=vec2i(p.xy);let world=textureLoad(scene,q,0).rgb;let near=textureLoad(source,q,0).rgb*.32*u.options.y;var stars=vec3f(0.);if(u.options.y>.5&&u.more.z>.5&&(u.time.y<.5||(u.time.y>1.5&&u.time.y<3.5))){stars=cross(q)*u.options.y*u.more.z;}return vec4f(pow(max(world+near+stars,vec3f(0.)),vec3f(1./2.2)),1.);}
`;
