// GPT-6-Astra r29, independently authored positive recovery light.
// 22.5°斜線と112.5°斜線の交差光条多数でキラキラ演出. Source-bound optical response, no affliction/removal layer.
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
fn star(p:vec2f,seed:vec2f,outward:vec2f,t:f32,onset:f32,peak:f32,end:f32,size:f32)->vec3f{
 let life=window(t,onset,peak,peak+.022,end);
 if(life<=0.||distance(p,seed)>.49){return vec3f(0.);}
 let source=sprite(seed).a;var edge=seed;
 for(var i=1;i<=32;i++){let q=seed+outward*f32(i)*.008;if(sprite(q).a>.18){edge=q;}}
 let center=edge+outward*(2.6/64.);let delta=p-center;let d=abs(vec2f(dot(delta,vec2f(.92387953,-.38268343)),dot(delta,vec2f(.38268343,.92387953))));let radius=size*(.75+.25*smoothstep(onset,peak,t));
 let x=pow(max(0.,1.-d.x/radius),2.)*exp(-d.y*d.y/.00020);
 let y=pow(max(0.,1.-d.y/(radius*1.12)),2.)*exp(-d.x*d.x/.00020);
 let core=exp(-dot(d,d)/.00038);
 let coverage=1.-smoothstep(.04,.25,sprite(p).a);
 return (vec3f(.75,1.,.90)*(x+y)*2.6+vec3f(1.)*core)*life*source*coverage;
}
fn packet(p:vec2f,t:f32)->vec3f{
 let travel=smoothstep(.025,.23,t);let center=mix(vec2f(-.22,.025),vec2f(-.035,-.018),travel);
 let radius=mix(.14,.17,sin(travel*3.14159265));let d=p-center;
 let volume=exp(-dot(d,d)/(radius*radius));
 let focus=exp(-dot(d-vec2f(.025,-.012),d-vec2f(.025,-.012))/(radius*radius*.22));
 return (vec3f(.60,1.,.90)*volume*.92+vec3f(1.,.91,.59)*focus*1.25)*window(t,.01,.045,.21,.34);
}
fn pointOn(a:vec2f,b:vec2f,c:vec2f,q:f32)->vec2f{return mix(mix(a,b,q),mix(b,c,q),q);}
fn distribution(p:vec2f,t:f32,a:vec2f,b:vec2f,c:vec2f,onset:f32,done:f32)->vec2f{
 if(t<=onset||t>=.985){return vec2f(0.);}
 let advance=smoothstep(onset,done,t);let position=pointOn(a,b,c,advance);
 let axis=normalize(mix(b-a,c-b,advance));let delta=p-position;
 let moving=gaussian(dot(delta,axis),.16)*gaussian(dot(delta,vec2f(-axis.y,axis.x)),.13)*window(t,onset,onset+.035,done-.012,done+.075);
 var reached=0.;
 for(var i=0;i<=8;i++){
  let q=f32(i)/8.;let position=pointOn(a,b,c,q);
  reached=max(reached,exp(-dot(p-position,p-position)/.018)*(1.-smoothstep(advance-.04,advance+.04,q)));
 }
 return vec2f(moving,reached*window(t,onset,onset+.09,.80,.985));
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=vec2f(v.p.x-u.viewport.z,u.viewport.w-v.p.y)/u.state.x;let t=u.state.y;
 let a=sprite(p);let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);
 var c=mix(background,a.rgb,a.a);if(t<=0.||t>=1.){return vec4f(c,1.);}
 let face=gaussian(p.x/.14,1.)*window(p.y,.10,.17,.36,.43);
 c+=packet(p,t)*(1.-a.a*.42)*(1.-face);
 let contact=gaussian(distance(p,vec2f(-.035,-.018)),.060)*window(t,.15,.22,.27,.36);
 c+=vec3f(.83,1.,.69)*contact*.92*(1.-face);
 let left=distribution(p,t,vec2f(-.02,-.025),vec2f(-.18,.008),vec2f(-.23,-.17),.21,.39);
 let right=distribution(p,t,vec2f(.015,-.025),vec2f(.17,-.035),vec2f(.23,-.175),.30,.48);
 let trunk=distribution(p,t,vec2f(0.,-.035),vec2f(-.025,-.12),vec2f(0.,-.275),.43,.61);
 let rightLeg=distribution(p,t,vec2f(.01,-.25),vec2f(.13,-.33),vec2f(.045,-.405),.56,.73);
 let leftLeg=distribution(p,t,vec2f(-.01,-.25),vec2f(-.12,-.34),vec2f(-.045,-.405),.64,.81);
 let front=left.x+right.x+trunk.x+rightLeg.x+leftLeg.x;
 let wake=max(max(left.y,right.y),max(trunk.y,max(rightLeg.y,leftLeg.y)));
 let whole=window(t,.74,.85,.88,.995);
 let side=mix(vec3f(.55,1.,.79),vec3f(.88,1.,.62),smoothstep(-.25,.25,p.x));
 c+=a.a*(side*(front*1.30+wake*.30)+vec3f(.47,1.,.78)*whole*.66)*(1.-face*.86);
 // The same moving node lights the receiver and its immediately surrounding volume.
 // This increases projected area, rather than decorating an alpha-clipped point.
 c+=vec3f(.44,1.,.78)*(front*.82+wake*.10)*(1.-a.a)*(1.-face);
 c+=star(p,vec2f(-.09,-.06),vec2f(-1,0),t,.34,.42,.55,.14);
 c+=star(p,vec2f(.08,-.06),vec2f(1,0),t,.43,.50,.63,.15);
 c+=star(p,vec2f(-.06,-.235),vec2f(-1,0),t,.55,.63,.74,.14);
 c+=star(p,vec2f(.05,-.37),vec2f(1,0),t,.65,.73,.84,.15);
 c+=star(p,vec2f(-.045,-.39),vec2f(-1,0),t,.73,.81,.91,.13);
 c+=star(p,vec2f(.10,-.03),vec2f(1,0),t,.80,.87,.97,.14);
 return vec4f(c,1.);
}
`;
