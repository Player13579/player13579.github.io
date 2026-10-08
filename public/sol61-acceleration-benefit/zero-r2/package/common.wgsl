// PH1/PH2 state shared verbatim by world and observer shader modules.
struct Frame { viewport:vec4f, anchor:vec4f, flags:vec4f, extra:vec4f }
@group(0) @binding(0) var<uniform> f:Frame;
struct Emitter { center:vec2f, flux:f32, radius:f32 }
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
fn rise(t:f32)->f32 {let u=t/1.62;return .12+.2*u+1.12*u*u;}
fn emitter(t:f32,k:i32)->Emitter {
 let birth=.14+f32(k)*.061+f32(k%3)*.007;
 let life=min(.19+f32(k%4)*.029,1.8-birth);
 let dt=t-birth;let carrier=k%2;let sourceAge=birth-f32(carrier)*.18;
 if(dt<0.||dt>=life||sourceAge<0.||sourceAge>=1.62){return Emitter(vec2f(0.),0.,0.);}
 let side=select(-1.,1.,k%4>=2);
 let localY=.065+f32(k%3)*.048;
 let localX=side*.18*(1.-localY/.23);
 let velocity=(.2+2.24*sourceAge/1.62)/1.62;
 let drift=select(1.,.12,f.extra.x>.5);
 let y=select(rise(sourceAge),.64,f.extra.x>.5)+localY+drift*(dt*(.38+velocity*.55)-.12*dt*dt);
 let x=select(-.28,.28,carrier==1)+localX+drift*side*dt*(.18+f32(k%3)*.055);
 let phase=dt/life;
 // Fast finite ignition, slower release; no periodic filler blinking.
 let ignition=smoothstep(0.,.16,phase)*(1.-smoothstep(.24,1.,phase));
 return Emitter(vec2f(x,y),(4.8+f32(k%3)*.6)*ignition,.008+f32(k%3)*.0018);
}
