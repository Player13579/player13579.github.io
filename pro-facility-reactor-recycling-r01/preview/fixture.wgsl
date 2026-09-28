// 検査fixtureのみ。actorの人体・施設の既存デザインを描かず、H64境界を示す。
struct U { viewport:vec4f, endpoints:vec4f }
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) p:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->V{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var v:V;v.p=vec4f(p[i],0,1);return v;}
fn rect(p:vec2f,h:vec2f)->f32{let d=abs(p)-h;return max(d.x,d.y);}
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=v.p.xy;let actor=abs(rect(p-u.endpoints.zw,vec2f(13,32)));
 let facility=abs(rect(p-u.endpoints.xy,vec2f(19,20)));
 let c=max(1-smoothstep(.4,1.1,actor),1-smoothstep(.4,1.1,facility));
 let color=select(vec3f(.22,.25,.29),vec3f(.16,.18,.21),u.viewport.z>.5);
 return vec4f(color*c*.65,c*.65);
}
