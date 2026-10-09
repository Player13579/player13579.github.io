// PH1/PH2 state shared verbatim by world and observer shader modules.
struct Frame { viewport:vec4f, anchor:vec4f, flags:vec4f, extra:vec4f }
@group(0) @binding(0) var<uniform> f:Frame;
struct Emitter { center:vec2f, flux:f32, radius:f32 }
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
fn rise(t:f32)->f32 {let u=t/1.62;return .12+.2*u+1.12*u*u;}
fn birthSite(k:i32)->vec2f {
 // Actual arrow boundary sites: head sides, tip, shaft sides and base.
 let sites=array<vec2f,8>(vec2f(-.08648,.12),vec2f(-.062,-.12),vec2f(0.,.23),vec2f(.12564168,.07),vec2f(.062,-.20),vec2f(-.17417,.008),vec2f(0.,-.25),vec2f(.17417,.008));
 return sites[(k/2)%8];
}
fn birthNormal(k:i32)->vec2f {
 // Unit outward normals of the same registered union-boundary features.
 let normals=array<vec2f,8>(vec2f(-.787,.616),vec2f(-1.,0.),vec2f(0.,1.),vec2f(.787,.616),vec2f(1.,0.),vec2f(-.787,.616),vec2f(0.,-1.),vec2f(.787,.616));
 return normalize(normals[(k/2)%8]);
}
fn emitter(t:f32,k:i32)->Emitter {
 let birth=.19+f32(k)*.045+f32(k%3)*.004;
 let life=min(.25+f32(k%4)*.035,1.8-birth);
 let dt=t-birth;let carrier=k%2;let sourceAge=birth-f32(carrier)*.18;
 if(dt<0.||dt>=life||sourceAge<0.||sourceAge>=1.62){return Emitter(vec2f(0.),0.,0.);}
 let site=birthSite(k);
 let normal=birthNormal(k);let detach=.55+.06*f32(k%3);
 let velocity=(.2+2.24*sourceAge/1.62)/1.62;
 let drift=select(1.,.12,f.extra.x>.5);
 let y=select(rise(sourceAge),.64,f.extra.x>.5)+site.y+drift*(dt*(.26+velocity*.7+normal.y*detach)-.12*dt*dt);
 let x=select(-.28,.28,carrier==1)+site.x+drift*normal.x*detach*dt;
 let phase=dt/life;
 // Boundary-origin release; peak follows normal separation, then finite extinction.
 let ignition=smoothstep(0.,.32,phase)*(1.-smoothstep(.44,1.,phase));
 return Emitter(vec2f(x,y),(4.8+f32(k%3)*.6)*ignition,.010+f32(k%3)*.0015);
}
