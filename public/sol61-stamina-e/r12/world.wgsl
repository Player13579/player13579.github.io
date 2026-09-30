// 新規r12：一つのfilled体積の前後部分を別drawする。PH3受光関数は同じfieldを使う。
struct Frame { viewport:vec4f, anchor:vec4f, clock:vec4f, switches:vec4f };
@group(0) @binding(0) var<uniform> frame:Frame;
struct Field { density:f32, radiation:vec3f };
fn ramp(a:f32,b:f32,x:f32)->f32 { let t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t); }
fn bell(x:f32,w:f32)->f32 {return exp(-pow(x/w,2.));}
fn width(v:f32)->f32 {return .16+.40*ramp(.12,.66,v)*(1.-.35*ramp(.82,1.,v));}
fn source(p:vec3f)->Field {
 var out:Field;out.density=0.;out.radiation=vec3f(0.);
 if(frame.clock.z<.5||frame.clock.y<.9){return out;}let u=frame.clock.x/frame.clock.y;
 if(u<0.||u>=1.){return out;}
 let v=(p.y+.70)/1.04;if(v<=0.||v>=1.){return out;}
 let establish=ramp(0.,.09,u);let fill=.12+.88*ramp(.06,.48,u);let settle=ramp(.48,.78,u);
 let q=pow((p.x-.05*(v-.5))/width(v),2.)+pow((p.z-.035)/(.30-.10*v),2.);
 let shape=(1.-ramp(.42,1.,q))*ramp(0.,.065,v)*(1.-ramp(.91,1.,v));
 let eActive=shape*(1.-ramp(fill-.025,fill+.025,v))*establish;
 let supply=1.-ramp(.92,1.,u);let working=(1.-settle)*bell(v-fill,.18)+settle*(.40+.60*bell(v-.68,.26));
 let currentV=mix(fill,.68,settle);let hx=width(currentV)*.60;let hy=-.70+1.04*currentV;
 let extrema=(bell(p.x-hx,.065)+bell(p.x+hx,.065))*bell(p.y-hy,.065)*bell(p.z-.13,.12);
 out.density=eActive*(1.-ramp(.82,.94,u));
 out.radiation=(vec3f(.06,1.05,.24)*(eActive*supply*(2.4+1.6*settle))+vec3f(1.07,1.10,.98)*(eActive*supply*(4.*working+18.*extrema)))*frame.switches.x;
 return out;
}
fn receiverLight(p:vec3f)->vec3f {
 if(frame.switches.z<.5||frame.clock.z<.5||frame.clock.y<.9){return vec3f(0.);}let u=frame.clock.x/frame.clock.y;
 let taps=array<vec3f,4>(vec3f(-.11,0,.17),vec3f(.11,0,.17),vec3f(0,-.09,.17),vec3f(0,.09,.17));var answer=vec3f(0.);
 for(var i=0u;i<4u;i++){answer+=source(p+taps[i]).radiation*.009*(1.-ramp(.78,.90,u));}return answer;
}
struct Vertex { @builtin(position) clip:vec4f, @location(0) plane:vec2f };
@vertex fn fieldVertex(@builtin(vertex_index)index:u32)->Vertex {
 let corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
 let plane=corners[index]*vec2f(.78,.91);let pixel=frame.anchor.xy+vec2f(plane.x*frame.anchor.z,-plane.y)*frame.viewport.z;
 var out:Vertex;out.plane=plane;out.clip=vec4f(2.*pixel.x/frame.viewport.x-1.,1.-2.*pixel.y/frame.viewport.y,.5,1.);return out;
}
struct Optical { @location(0) colour:vec4f, @location(1) emission:vec4f };
fn integrate(v:Vertex,front:bool)->Optical {
 let step=.40/30.;var transmission=1.;var premultiplied=vec3f(0.);var emission=vec3f(0.);
 for(var i=0u;i<30u;i++){
  let z=select(0.,.40,front)-(f32(i)+.5)*step;let f=source(vec3f(v.plane,z));
  let coverage=(1.-exp(-f.density*step*1.20))*frame.switches.y;
  let photons=f.radiation*step;
  premultiplied+=transmission*(vec3f(.015,.06,.025)*coverage+photons);emission+=transmission*photons;transmission*=1.-coverage;
 }
 var out:Optical;out.colour=vec4f(premultiplied,1.-transmission);out.emission=vec4f(emission,1.-transmission);return out;
}
@fragment fn fieldFront(v:Vertex)->Optical {return integrate(v,true);}
@fragment fn fieldRear(v:Vertex)->Optical {return integrate(v,false);}
