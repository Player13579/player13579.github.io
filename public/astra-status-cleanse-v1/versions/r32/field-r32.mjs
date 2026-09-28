// GPT-6-Astra r32, independently authored positive recovery light.
// Source-bound crossing rays share the same 22.5/112.5-degree E-wide angle. Source-bound optical response, no affliction/removal layer.
export const shader=/*wgsl*/`
struct U{viewport:vec4f,state:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct V{@builtin(position) p:vec4f};
@vertex fn vs(@builtin(vertex_index) i:u32)->V{
 let p=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));var v:V;v.p=vec4f(p[i],0,1);return v;
}
fn sprite(p:vec2f)->vec4f{
 let q=vec2f(63.5+p.x*116.,63.5-p.y*116.);
 if(any(q<vec2f(.5))||any(q>vec2f(127.5))){return vec4f(0.);}
 return textureSampleLevel(actor,samp,q/vec2f(textureDimensions(actor)),0.);
}
fn window(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return smoothstep(a,b,t)*(1.-smoothstep(c,d,t));}
fn gaussian(x:f32,w:f32)->f32{return exp(-x*x/(w*w));}
fn star(p:vec2f,seed:vec2f,outward:vec2f,flowDirection:vec2f,t:f32,onset:f32,peak:f32,end:f32,size:f32)->vec3f{
 let life=window(t,onset,peak,peak+.022,end);
 if(life<=0.||distance(p,seed)>.49){return vec3f(0.);}
 let source=sprite(seed).a;var edge=seed;
 for(var i=1;i<=32;i++){let q=seed+outward*f32(i)*.008;if(sprite(q).a>.18){edge=q;}}
 let center=edge+outward*(2.6/64.);let delta=p-center;let direction=normalize(flowDirection);let d=abs(vec2f(dot(delta,direction),dot(delta,vec2f(-direction.y,direction.x))));let radius=size*(.75+.25*smoothstep(onset,peak,t));
 let x=pow(max(0.,1.-d.x/radius),2.)*exp(-d.y*d.y/.00020);
 let y=pow(max(0.,1.-d.y/(radius*1.12)),2.)*exp(-d.x*d.x/.00020);
 let core=exp(-dot(d,d)/.00038);
 let coverage=1.-smoothstep(.04,.25,sprite(p).a);
 return (vec3f(.75,1.,.90)*(x+y)*2.6+vec3f(1.)*core)*life*source*coverage;
}
fn softVolume(p:vec2f,t:f32)->vec3f{
 // One contiguous luminous breath. It moves into the receiver and is consumed there.
 let entering=smoothstep(.015,.34,t);let life=window(t,.006,.075,.19,.42);
 let center=mix(vec2f(-.41,.025),vec2f(-.16,-.06),entering);
 let q=p-center;let x=q.x+.38*q.y;let y=q.y-.15*q.x;
 let width=mix(.205,.105,entering);let height=mix(.133,.090,entering);
 let main=exp(-x*x/(width*width)-y*y/(height*height));
 let fold=exp(-(x+.095)*(x+.095)/.013-(y-.062)*(y-.062)/.006)*.57;
 let lower=exp(-(x-.044)*(x-.044)/.007-(y+.070)*(y+.070)/.006)*.44;
 // Broad internal radiance, no outline, hard shell, flying droplet, or emission tip.
 let density=(main+fold+lower)*life;
 let core=exp(-(x-.015)*(x-.015)/.009-y*y/.004)*life;
 return vec3f(.43,1.,.74)*density*.95+vec3f(1.,1.,.70)*core*.68;
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=vec2f(v.p.x-u.viewport.z,u.viewport.w-v.p.y)/u.state.x;let t=u.state.y;
 let body=sprite(p);let alpha=body.a;let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);
 var c=mix(background,body.rgb,alpha);if(t<=0.||t>=1.){return vec4f(c,1.);}
 let face=gaussian(p.x/.14,1.)*window(p.y,.10,.17,.36,.43);
 let incoming=softVolume(p,t);
 c+=incoming*(1.-alpha*.42)*(1.-face);
 // A continuous absorption front is received on the actual actor surface.
 // Chest/arms receive first; the same light travels through trunk and both legs.
 let bodyDepth=clamp((-p.y-.01)/.45,0.,1.);
 let arrival=.15+.40*bodyDepth+.16*clamp((p.x+.18)/.36,0.,1.);
 let receive=window(t,arrival,arrival+.09,arrival+.15,arrival+.35);
 let stay=smoothstep(arrival,arrival+.12,t)*window(t,.12,.32,.72,.91);
 let anatomy=1.-smoothstep(.02,.15,p.y);
 let whole=window(t,.71,.83,.88,.995);
 c+=alpha*(vec3f(.65,1.,.79)*receive*.95+vec3f(.29,.72,.56)*stay*.22)*anatomy*(1.-face);
 c+=alpha*vec3f(.47,1.,.78)*whole*.66*(1.-face*.86);
 // Sparse optical responses mark receiving contacts, all with the same E-wide angle.
 let axis=vec2f(.38268343,.92387953);
 c+=star(p,vec2f(-.10,-.12),vec2f(-1.,.10),axis,t,.16,.23,.37,.135);
 c+=star(p,vec2f(.10,-.14),vec2f(1.,.10),axis,t,.26,.33,.46,.135);
 c+=star(p,vec2f(-.08,-.25),vec2f(-.75,-.66),axis,t,.38,.45,.58,.135);
 c+=star(p,vec2f(.08,-.25),vec2f(.75,-.66),axis,t,.45,.52,.65,.135);
 c+=star(p,vec2f(-.05,-.41),vec2f(-.20,-.98),axis,t,.58,.65,.79,.135);
 c+=star(p,vec2f(.04,-.39),vec2f(.20,-.98),axis,t,.65,.72,.86,.135);
 return vec4f(c,1.);
}
`;
