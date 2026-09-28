// GPT-6-Astra r31, independently authored positive recovery light.
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
fn radiation(p:vec2f,origin:vec2f,direction:vec2f,t:f32,onset:f32,peak:f32,end:f32)->vec3f{
 let life=window(t,onset,peak,peak+.035,end);
 if(life<=0.||distance(p,origin)>.38){return vec3f(0.);}
 let q=p-origin;let x=dot(q,direction);let y=dot(q,vec2f(-direction.y,direction.x));
 if(x<-.06||x>.31){return vec3f(0.);}
 let distanceOut=max(0.,x);let width=.025+distanceOut*.09;
 let diverge=.30*distanceOut;
 let rays=gaussian(y,width)*.62+gaussian(y-diverge,width)*.47+gaussian(y+diverge,width)*.47;
 let medium=gaussian(y,.042+distanceOut*.26)*.26;
 let longitudinal=smoothstep(-.055,-.014,x)*(1.-smoothstep(.15,.30,x))*exp(-distanceOut*3.5);
 let color=mix(vec3f(.94,1.,.69),vec3f(.40,1.,.83),smoothstep(0.,.25,x));
 return color*(rays+medium)*longitudinal*life*1.28;
}
fn reception(p:vec2f,seed:vec2f,t:f32,onset:f32,peak:f32,end:f32)->f32{
 let q=p-seed;return exp(-q.x*q.x/.012-q.y*q.y/.020)*window(t,onset-.04,peak-.02,peak+.06,end+.08);
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=vec2f(v.p.x-u.viewport.z,u.viewport.w-v.p.y)/u.state.x;let t=u.state.y;
 let body=sprite(p);let alpha=body.a;let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);
 var c=mix(background,body.rgb,alpha);if(t<=0.||t>=1.){return vec4f(c,1.);}
 let face=gaussian(p.x/.14,1.)*window(p.y,.10,.17,.36,.43);
 let chest=exp(-p.x*p.x/.014-(p.y+.022)*(p.y+.022)/.013)*window(t,.015,.08,.16,.27);
 c+=vec3f(.92,1.,.73)*chest*.85*(1.-face);
 let origins=array<vec2f,6>(vec2f(-.235325,-.126467),vec2f(.219404,-.128060),vec2f(-.211927,-.373262),vec2f(.186115,-.348168),vec2f(-.068827,-.504136),vec2f(.053336,-.456679));
 let directions=array<vec2f,6>(vec2f(-.995037,.099504),vec2f(.995037,.099504),vec2f(-.716995,-.697078),vec2f(.716995,-.697078),vec2f(-.196116,-.980581),vec2f(.196116,-.980581));
 let seeds=array<vec2f,6>(vec2f(-.1,-.14),vec2f(.1,-.14),vec2f(-.08,-.245),vec2f(.08,-.245),vec2f(-.05,-.41),vec2f(.04,-.39));
 let timing=array<vec3f,6>(vec3f(.15,.25,.39),vec3f(.24,.34,.48),vec3f(.37,.47,.61),vec3f(.46,.56,.70),vec3f(.58,.69,.82),vec3f(.67,.77,.91));
 var respond=0.;var light=vec3f(0.);
 for(var i=0;i<6;i++){
  let w=timing[i];let exists=sprite(seeds[i]).a;
  light+=radiation(p,origins[i],directions[i],t,w.x,w.y,w.z)*exists;
  respond=max(respond,reception(p,seeds[i],t,w.x,w.y,w.z)*exists);
  // All optical crosses share one E-wide axis: 22.5 degrees clockwise from vertical.
  c+=star(p,seeds[i],directions[i],vec2f(.38268343,.92387953),t,w.y-.025,w.y+.025,w.z+.045,.135);
 }
 // The body is the source; external radiation and received surface stay causally joined.
 c+=light*(.22+.78*(1.-alpha))*(1.-face);
 let whole=window(t,.74,.85,.88,.995);
 c+=alpha*(vec3f(.60,1.,.76)*respond*.78+vec3f(.47,1.,.78)*whole*.66)*(1.-face*.86);
 return vec4f(c,1.);
}
`;
