import {DESIGN} from './design.mjs';
const polygon=DESIGN.main.vertices.map(p=>`vec2f(${p.map(n=>n.toFixed(6)).join(',')})`).join(',');
const sparklePoints=DESIGN.sparkle.positions.map(p=>`vec2f(${p.map(n=>n.toFixed(6)).join(',')})`).join(',');
export const shader=/*wgsl*/`
struct Frame {canvas:vec4f,actor:vec4f,state:vec4f,controls:vec4f};
@group(0) @binding(0) var<uniform> u:Frame;
@group(0) @binding(1) var sprite:texture_2d<f32>;
@group(0) @binding(2) var sampling:sampler;
struct VO{@builtin(position)p:vec4f};
@vertex fn vertex(@builtin(vertex_index)i:u32)->VO{let t=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:VO;o.p=vec4f(t[i],0.,1.);return o;}
fn local(pixel:vec2f)->vec2f{return vec2f((pixel.x-u.actor.x)/u.actor.z,(pixel.y-u.actor.y)/u.actor.z);}
fn body(p:vec2f)->vec4f{let uv=vec2f((p.x+.302222)/.604444,p.y);if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(0.);}return textureSampleLevel(sprite,sampling,(vec2f(62.,15.)+uv*vec2f(136.,225.))/vec2f(768.,512.),0.);}
fn gaussian(x:f32,c:f32,w:f32)->f32{let n=(x-c)/w;return exp(-n*n);}
fn boundary(p:vec2f)->f32{let points=array<vec2f,9>(${polygon});var distance=10.;var inside=false;for(var i=0u;i<9u;i++){let a=points[i];let b=points[(i+1u)%9u];let edge=b-a;let s=clamp(dot(p-a,edge)/dot(edge,edge),0.,1.);distance=min(distance,length(p-a-s*edge));if((a.y>p.y)!=(b.y>p.y)){let cross=a.x+(p.y-a.y)*edge.x/edge.y;if(p.x<cross){inside=!inside;}}}return select(distance,-distance,inside);}
struct Manifest {matter:f32,radiance:f32,spread:f32};
fn manifestation(p:vec2f)->Manifest{
 let t=u.state.x;if(t<0.||t>=1.12||u.controls.x<.5){return Manifest(0.,0.,0.);}
 // Activation, not compression/transport. Geometry opens and never travels to a receiver.
 let on=smoothstep(0.,.17,t);let alive=1.-smoothstep(.71,1.12,t);let openScale=mix(.78,1.,smoothstep(.025,.24,t));
 let centre=vec2f(-.13,.61);let q=centre+(p-centre)/openScale;let sd=boundary(q);
 let filled=1.-smoothstep(-.075,.016,sd);let depth=sqrt(max(0.,filled));
 // Broad standing masses change radiance; no moving front/route.
 let upper=gaussian(p.x,-.205,.125)*gaussian(p.y,.480,.125);
 let middle=gaussian(p.x,-.165,.145)*gaussian(p.y,.645,.100);
 let lower=gaussian(p.x,-.120,.085)*gaussian(p.y,.800,.080);
 let material=depth*on*alive;
 let ignition=upper*gaussian(t,.175,.14)+middle*gaussian(t,.430,.21)+lower*gaussian(t,.700,.21);
 let radiance=material*(.38+1.50*ignition)+filled*gaussian(t,.440,.205)*.32*alive;
 let spread=exp(-max(0.,sd)*42.)*on*alive*(.24+ignition*.55);
 return Manifest(material,radiance,spread);
}
fn ray(p:vec2f,c:vec2f)->f32{let d=(p-c)*u.actor.z;let angle=1.169370599;let axis=vec2f(cos(angle),sin(angle));let q=vec2f(dot(d,axis),dot(d,vec2f(-axis.y,axis.x)));return exp(-pow(q.x/6.2,2.))*exp(-pow(q.y/.50,2.))+exp(-pow(q.y/3.1,2.))*exp(-pow(q.x/.50,2.));}
fn glitter(p:vec2f)->f32{if(u.controls.z<.5){return 0.;}let points=array<vec2f,3>(${sparklePoints});let times=array<vec2f,3>(vec2f(.190,.110),vec2f(.435,.165),vec2f(.670,.180));var response=0.;for(var i=0u;i<3u;i++){response+=ray(p,points[i])*gaussian(u.state.x,times[i].x,times[i].y)*manifestation(points[i]).radiance;}return response;}
@fragment fn backdrop(i:VO)->@location(0)vec4f{return vec4f(mix(vec3f(.034,.050,.063),vec3f(.72,.75,.74),u.state.y),1.);}
@fragment fn actor(i:VO)->@location(0)vec4f{return body(local(i.p.xy));}
@fragment fn volume(i:VO)->@location(0)vec4f{let p=local(i.p.xy);let f=manifestation(p);let a=f.matter*.63*(1.-body(p).a*.38);let spectral=vec3f(.69,.24,.045);return vec4f(spectral*a,a);}
@fragment fn light(i:VO)->@location(0)vec4f{let p=local(i.p.xy);let f=manifestation(p);let existingSurface=body(p).a;let emission=vec3f(1.,.82,.29)*f.radiance*.73;let illumination=vec3f(1.,.73,.26)*f.spread*existingSurface*.24;let obs=select(0.,f.spread*.13,u.controls.y>.5);return vec4f(emission+illumination+vec3f(1.,.83,.52)*obs+vec3f(1.,.98,.89)*glitter(p),0.);}
`;
