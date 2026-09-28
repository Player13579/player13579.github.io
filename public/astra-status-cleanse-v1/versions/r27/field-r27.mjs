// GPT-6-Astra r27, independently authored positive recovery light.
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
fn arrival(p:vec2f,t:f32)->vec3f{
 let start=vec2f(-.70,.34);let receiving=vec2f(-.10,.015);let axis=receiving-start;
 let q=p-start;let along=dot(q,axis)/dot(axis,axis);let normal=normalize(vec2f(-axis.y,axis.x));let across=dot(q,normal);
 let head=smoothstep(.025,.27,t);let flow=window(t,.01,.065,.24,.39);
 let reach=smoothstep(-.10,.03,along)*(1.-smoothstep(head-.04,head+.12,along));
 let throat=mix(.17,.050,clamp(along,0.,1.));
 let ribs=gaussian(across-throat*.54,throat*.27)+gaussian(across+throat*.52,throat*.31);
 let volume=gaussian(across,throat)*.35;
 let moving=1.+.36*gaussian(along-head+.10,.14);
 let near=vec3f(1.,.82,.36);let received=vec3f(.50,1.,.79);
 return mix(near,received,smoothstep(.3,1.,along))*(ribs*.65+volume)*reach*flow*moving;
}
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
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=vec2f(v.p.x-u.viewport.z,u.viewport.w-v.p.y)/u.state.x;let t=u.state.y;
 let a=sprite(p);let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);
 var c=mix(background,a.rgb,a.a);
 if(t<=0.||t>=1.){return vec4f(c,1.);}
 let face=gaussian((p.x)/.13,1.)*window(p.y,.12,.19,.34,.42);
 // Open incoming volume passes behind the alpha, with a localized contact in front.
 let input=arrival(p,t);c+=input*(1.-a.a*.89);
 let contact=gaussian(distance(p,vec2f(-.10,.015)),.065)*window(t,.18,.27,.34,.46);
 c+=vec3f(.76,1.,.85)*contact*1.45*(1.-face);
 // Light advances from the receiving chest into the silhouette, then settles.
 let distanceFromContact=length((p-vec2f(-.10,.015))*vec2f(.94,.88));
 let advance=mix(.025,.64,smoothstep(.24,.68,t));
 let front=gaussian(distanceFromContact-advance,.068)*window(t,.20,.27,.63,.77);
 let received=(1.-smoothstep(advance-.05,advance+.03,distanceFromContact))*window(t,.22,.40,.73,.97);
 let bodyPeak=window(t,.48,.65,.76,.98);
 let slope=.68+.32*smoothstep(-.35,.25,p.y);
 let warm=vec3f(.93,1.,.67);let clear=vec3f(.32,1.,.83);
 let body=mix(warm,clear,smoothstep(.20,.56,distanceFromContact))*(front*.94+received*.22+bodyPeak*.54)*slope;
 c+=body*a.a*(1.-face*.74);
 let px=1.5/64.;let neighbor=max(max(sprite(p+vec2f(px,0)).a,sprite(p-vec2f(px,0)).a),max(sprite(p+vec2f(0,px)).a,sprite(p-vec2f(0,px)).a));
 let rim=max(0.,neighbor-a.a);c+=vec3f(.36,1.,.74)*rim*(front*.42+bodyPeak*.20);
 // Distinct, finite responses follow the received region. No independent particles.
 c+=star(p,vec2f(-.09,.005),vec2f(-1,0),t,.31,.39,.52,.14);
 c+=star(p,vec2f(.08,.06),vec2f(1,0),t,.38,.47,.61,.15);
 c+=star(p,vec2f(-.07,-.22),vec2f(-1,0),t,.47,.56,.70,.14);
 c+=star(p,vec2f(.05,-.37),vec2f(1,0),t,.54,.64,.78,.15);
 c+=star(p,vec2f(-.045,-.39),vec2f(-1,0),t,.64,.73,.86,.13);
 c+=star(p,vec2f(.10,-.03),vec2f(1,0),t,.72,.81,.94,.14);
 return vec4f(c,1.);
}`;
