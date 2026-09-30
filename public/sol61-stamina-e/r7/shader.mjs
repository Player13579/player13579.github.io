import {DESIGN} from './design.mjs';
const spark=DESIGN.sparkle.points.map(p=>`vec2f(${p.map(n=>n.toFixed(5)).join(',')})`).join(',');
export const shader=/*wgsl*/`
struct Frame {screen:vec4f,recipient:vec4f,clock:vec4f,switches:vec4f};
@group(0) @binding(0) var<uniform> u:Frame;
@group(0) @binding(1) var original:texture_2d<f32>;
@group(0) @binding(2) var linear:sampler;
struct VO{@builtin(position)p:vec4f};
@vertex fn vertex(@builtin(vertex_index)i:u32)->VO{let tri=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:VO;o.p=vec4f(tri[i],0.,1.);return o;}
fn space(pixel:vec2f)->vec2f{return (pixel-u.recipient.xy)/u.recipient.z;}
fn body(p:vec2f)->vec4f{let uv=vec2f((p.x+.3022222)/.6044444,p.y);if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(0.);}return textureSampleLevel(original,linear,(vec2f(62.,15.)+uv*vec2f(136.,225.))/vec2f(768.,512.),0.);}
fn gaussian(x:f32,c:f32,w:f32)->f32{let a=(x-c)/w;return exp(-a*a);}
struct Excitation{density:f32,radiance:f32,near:f32,coherence:f32};
fn excitation(p:vec2f)->Excitation{
 let t=u.clock.x;if(t<0.||t>=1.46||u.switches.x<.5){return Excitation(0.,0.,0.,0.);}
 let coherence=smoothstep(.18,.66,t);let phase=2.18*(1.-coherence);
 let q=vec2f(p.x,(p.y-.650));let r=vec2f(q.x/.455,q.y/.325);let r2=dot(r,r);
 let support=1.-smoothstep(.66,1.,r2);let vertical=smoothstep(.332,.375,p.y)*(1.-smoothstep(.92,.968,p.y));
 let a=cos(6.2831853*dot(q,vec2f(.72,1.03))+phase);
 let b=cos(6.2831853*dot(q,vec2f(1.05,-.63))-phase);
 let activation=smoothstep(0.,.11,t);
 let ending=1.-smoothstep(.96+clamp(p.y-.38,0.,.52)*.20,1.46,t);
 // Wide standing modes change geometry through their relative phase. No moving matter or body delivery routes.
 let mode=smoothstep(-.22,.92,(a+b)*.5);let filled=(.13+mode*.87)*support*vertical;
 let density=sqrt(max(0.,filled))*activation*ending;
 let radiance=(density*.33+pow(mode,2.)*support*vertical*(.58+coherence*1.10))*activation*ending;
 let near=exp(-max(0.,r2-.66)*7.)*vertical*activation*ending*(.12+mode*.40);
 return Excitation(density,radiance,near,coherence);
}
fn star(p:vec2f,c:vec2f)->f32{let d=(p-c)*u.recipient.z;let axis=vec2f(.920504853,-.390731128);let r=vec2f(dot(d,axis),dot(d,vec2f(-axis.y,axis.x)));return exp(-pow(r.x/6.,2.))*exp(-pow(r.y/.52,2.))+exp(-pow(r.y/3.4,2.))*exp(-pow(r.x/.52,2.));}
fn stars(p:vec2f)->f32{if(u.switches.z<.5){return 0.;}let centres=array<vec2f,3>(${spark});let timings=array<vec2f,3>(vec2f(.335,.135),vec2f(.580,.180),vec2f(.845,.165));var result=0.;for(var i=0u;i<3u;i++){let source=excitation(centres[i]);result+=star(p,centres[i])*gaussian(u.clock.x,timings[i].x,timings[i].y)*source.radiance*(.4+.6*source.coherence);}return result;}
@fragment fn background(i:VO)->@location(0)vec4f{return vec4f(mix(vec3f(.034,.050,.063),vec3f(.72,.75,.74),u.clock.y),1.);}
@fragment fn volume(i:VO)->@location(0)vec4f{let p=space(i.p.xy);let e=excitation(p);let alpha=e.density*.58;return vec4f(vec3f(.28,.09,.50)*alpha,alpha);}
@fragment fn recipient(i:VO)->@location(0)vec4f{return body(space(i.p.xy));}
@fragment fn light(i:VO)->@location(0)vec4f{let p=space(i.p.xy);let e=excitation(p);let alpha=body(p).a;let occlusion=1.-alpha;
 let primary=vec3f(1.,.72,.20)*e.radiance*.95*occlusion;
 let peak=vec3f(1.,.97,.88)*pow(e.radiance*.60,2.)*occlusion;
 let incident=vec3f(1.,.80,.38)*e.near*alpha*.18;
 let obs=select(0.,e.near*.13*occlusion,u.switches.y>.5);
 return vec4f(primary+peak+incident+vec3f(1.,.84,.52)*obs+vec3f(1.,.97,.9)*stars(p),0.);}
`;
