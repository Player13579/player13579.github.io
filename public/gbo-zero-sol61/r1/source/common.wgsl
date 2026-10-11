struct Frame{view:vec4f,weapon:vec4f,points:vec4f,flags:vec4f,extra:vec4f}
@group(0) @binding(0) var<uniform> f:Frame;
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let points=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(points[i],0.,1.);
}
fn weaponLocal(pixel:vec2f)->vec2f{
 let axis=f.weapon.zw-f.weapon.xy;let len=max(length(axis),8.);let dir=axis/len;let delta=(pixel-f.weapon.xy)/len;
 return vec2f(dot(delta,dir),dot(delta,vec2f(-dir.y,dir.x)));
}
fn segmentDistance(p:vec2f,a:vec2f,b:vec2f)->f32{
 let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.00001),0.,1.));
}
fn box(p:vec2f,b:vec2f)->f32{
 let d=abs(p)-b;return length(max(d,vec2f(0.)))+min(max(d.x,d.y),0.);
}
fn envelope(t:f32,retirement:bool)->f32{
 if(t<0.||t>=1.45){return 0.;}
 return select(smoothstep(0.,.06,t)*(1.-smoothstep(1.04,1.38,t)),smoothstep(0.,.035,t)*(1.-smoothstep(.52,.90,t)),retirement);
}
