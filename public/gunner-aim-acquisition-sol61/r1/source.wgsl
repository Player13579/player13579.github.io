struct U { viewport: vec4f, endpoints: vec4f, state: vec4f, controls: vec4f }
@group(0) @binding(0) var<uniform> u: U;
struct V { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i];
 var v:V; v.position=vec4f(p,0,1); v.uv=p*vec2f(.5,-.5)+vec2f(.5); return v;
}
fn box(p:vec2f,b:vec2f)->f32 { let q=abs(p)-b; return length(max(q,vec2f(0)))+min(max(q.x,q.y),0); }
fn mask(d:f32)->f32 { return 1-smoothstep(-.65,.65,d); }
fn plate(p:vec2f,r:f32,w:f32)->f32 {
 let a=atan2(p.y,p.x); let q=abs(sin(2*a));
 return mask(abs(length(p)-r)-w*.5)*smoothstep(.32,.5,q);
}
@fragment fn fs(v:V)->@location(0) vec4f {
 let p=v.uv*u.viewport.xy; let d=p-u.endpoints.zw; let age=u.state.x;
 let alive=select(0.,1.,age>=0&&age<900&&u.controls.x>.5);
 let entry=smoothstep(0.,85.,age); let exit=1-smoothstep(670.,900.,age);
 let settle=smoothstep(0.,300.,age);
 let r=mix(52.,30.,settle)*u.state.y;
 let breadth=mix(7.,4.8,settle)*u.state.y;
 let aperture=plate(d,r,breadth);
 let inner=plate(d,25.*u.state.y,2.2*u.state.y)*smoothstep(210.,290.,age);
 // Four broad sectors have a dark outer shoulder and a hot inner boundary.
 let radial=length(d); let edge=exp(-pow((radial-(r-breadth*.3))/(1.1*u.state.y),2.));
 let lock=exp(-pow((age-315.)/82.,2.));
 let color=mix(vec3f(.015,.32,.76),vec3f(.08,.92,1.4),settle);
 let source=(color*aperture*(1.2+lock*1.7)+vec3f(3.8,4.5,4.8)*aperture*edge*(.8+lock*1.8)+vec3f(.1,1.6,2.5)*inner)*entry*exit*alive;
 return vec4f(source, max(aperture,inner)*entry*exit*alive);
}
