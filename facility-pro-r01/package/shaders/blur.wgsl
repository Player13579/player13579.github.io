// OBS1: source-bound separable bloom。PHの主輪郭を作らない。
struct Params{delta:vec2f,pad:vec2f};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var linearClamp:sampler;
struct V{@builtin(position) p:vec4f,@location(0) uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:V;o.p=vec4f(q[i],0.,1.);o.uv=vec2f(q[i].x*.5+.5,.5-q[i].y*.5);return o;}
@fragment fn fs(v:V)->@location(0)vec4f{
 var s=textureSampleLevel(source,linearClamp,v.uv,0.).rgb*.227027;
 s+=(textureSampleLevel(source,linearClamp,v.uv+u.delta*1.384615,0.).rgb+textureSampleLevel(source,linearClamp,v.uv-u.delta*1.384615,0.).rgb)*.316216;
 s+=(textureSampleLevel(source,linearClamp,v.uv+u.delta*3.230769,0.).rgb+textureSampleLevel(source,linearClamp,v.uv-u.delta*3.230769,0.).rgb)*.070270;
 return vec4f(s,1.);
}
