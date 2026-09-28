// GPT-6-Astra r30, independently authored positive recovery light.
// Source-bound crossing rays oriented by the actual chest-to-recipient light flow. Source-bound optical response, no affliction/removal layer.
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
fn curve(a:vec2f,b:vec2f,c:vec2f,s:f32)->vec2f{return mix(mix(a,b,s),mix(b,c,s),s);}
fn channel(p:vec2f,t:f32,a:vec2f,b:vec2f,c:vec2f,start:f32,arrival:f32,leave:f32)->vec2f{
 if(t<=start||t>=leave||abs(p.x)>.55||p.y>.22||p.y<-.66){return vec2f(0.);}
 let progress=smoothstep(start,arrival,t);var nearest=10.;var along=0.;var side=0.;
 for(var i=0;i<16;i++){
  let lo=f32(i)/16.;let hi=f32(i+1)/16.;let pa=curve(a,b,c,lo);let pb=curve(a,b,c,hi);
  let edge=pb-pa;let q=clamp(dot(p-pa,edge)/dot(edge,edge),0.,1.);let d=p-mix(pa,pb,q);let separation=length(d);
  if(separation<nearest){nearest=separation;along=mix(lo,hi,q);side=dot(d,normalize(vec2f(-edge.y,edge.x)));}
 }
 let reveal=1.-smoothstep(progress-.065,progress+.025,along);let life=window(t,start,start+.04,leave-.12,leave);
 // A broad carrier plus separated density crests: direction is a continuous shape.
 let crest=gaussian(side-.027,.020)+gaussian(side+.027,.020);
 let carrier=gaussian(side,.068)*.28;
 let front=.35+1.15*gaussian(along-progress+.065,.17);
 let limit=1.-smoothstep(.075,.11,nearest);
 return vec2f((crest+carrier)*front*reveal*life*limit,gaussian(nearest,.10)*reveal*life);
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=vec2f(v.p.x-u.viewport.z,u.viewport.w-v.p.y)/u.state.x;let t=u.state.y;
 let actorColor=sprite(p);let alpha=actorColor.a;let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);
 var c=mix(background,actorColor.rgb,alpha);if(t<=0.||t>=1.){return vec4f(c,1.);}
 let face=gaussian(p.x/.14,1.)*window(p.y,.10,.17,.36,.43);
 // Entry is a stationary chest receiving volume, followed by growing connected paths.
 let contact=exp(-pow(p.x/.15,2.)-pow((p.y+.022)/.095,2.))*window(t,.015,.085,.20,.31);
 c+=vec3f(.90,1.,.66)*contact*1.25*(1.-face);
 let left=channel(p,t,vec2f(-.035,-.025),vec2f(-.37,.06),vec2f(-.29,-.19),.13,.35,.52);
 let right=channel(p,t,vec2f(.035,-.025),vec2f(.36,.06),vec2f(.29,-.19),.23,.45,.61);
 let trunk=channel(p,t,vec2f(0.,-.025),vec2f(.035,-.14),vec2f(0.,-.30),.37,.60,.77);
 let leftFoot=channel(p,t,vec2f(-.01,-.255),vec2f(-.19,-.32),vec2f(-.10,-.49),.53,.72,.86);
 let rightFoot=channel(p,t,vec2f(.01,-.255),vec2f(.18,-.32),vec2f(.10,-.42),.61,.79,.92);
 let rays=vec3f(.65,1.,.79)*left.x+vec3f(.89,1.,.63)*right.x+vec3f(.37,1.,.80)*(trunk.x+leftFoot.x+rightFoot.x);
 let entered=max(max(left.y,right.y),max(trunk.y,max(leftFoot.y,rightFoot.y)));
 c+=rays*(.44+.56*(1.-alpha))*(1.-face);
 let whole=window(t,.74,.85,.88,.995);
 c+=alpha*(vec3f(.46,1.,.76)*(entered*.28+whole*.66))*(1.-face*.86);
 c+=star(p,vec2f(-.12,-.17),vec2f(-1,0),vec2f(.08,-.25),t,.30,.37,.49,.14);
 c+=star(p,vec2f(.12,-.175),vec2f(1,0),vec2f(-.07,-.25),t,.40,.47,.59,.15);
 c+=star(p,vec2f(-.06,-.235),vec2f(-1,0),vec2f(-.035,-.16),t,.56,.63,.74,.14);
 c+=star(p,vec2f(-.045,-.46),vec2f(-1,0),vec2f(.09,-.17),t,.68,.75,.87,.13);
 c+=star(p,vec2f(.05,-.405),vec2f(1,0),vec2f(-.08,-.10),t,.75,.82,.92,.15);
 c+=star(p,vec2f(.12,-.175),vec2f(1,0),vec2f(-.07,-.25),t,.81,.87,.97,.14);
 return vec4f(c,1.);
}
`;
