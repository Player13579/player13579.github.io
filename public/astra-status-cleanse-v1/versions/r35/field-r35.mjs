// GPT-6-Astra r35, independently authored positive recovery light.
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
fn sourceRadiance(p:vec2f,t:f32)->vec3f{
 let body=sprite(p);if(body.a<.001){return vec3f(0.);}
 let face=gaussian(p.x/.14,1.)*window(p.y,.10,.17,.36,.43);
 let d=length(vec2f(p.x*1.5,(p.y+.08)*.80));
 let frontier=.016+.39*smoothstep(.025,.66,t);
 let flowEnvelope=window(t,.015,.13,.55,.73);
 let crest=gaussian(d-frontier,.095)*flowEnvelope;
 let received=smoothstep(d-.035,d+.055,frontier)*window(t,.04,.22,.63,.86)*.21;
 let complete=window(t,.62,.77,.85,.995);
 let source=vec3f(.47,1.,.78)*(crest*1.32+received+complete*.66);
 return source*body.a*(1.-face*.90);
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=vec2f(v.p.x-u.viewport.z,u.viewport.w-v.p.y)/u.state.x;let t=u.state.y;
 let body=sprite(p);let alpha=body.a;let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);
 var c=mix(background,body.rgb,alpha);if(t<=0.||t>=1.){return vec4f(c,1.);}
 let source=sourceRadiance(p,t);
 let offsets=array<vec2f,16>(vec2f(.070,0.),vec2f(-.070,0.),vec2f(0.,.070),vec2f(0.,-.070),vec2f(.05,.05),vec2f(-.05,.05),vec2f(.05,-.05),vec2f(-.05,-.05),vec2f(.140,0.),vec2f(-.140,0.),vec2f(0.,.140),vec2f(0.,-.140),vec2f(.100,.100),vec2f(-.100,.100),vec2f(.100,-.100),vec2f(-.100,-.100));
 var spread=vec3f(0.);
 for(var i=0;i<16;i++){let weight=select(.068,.034,i>=8);spread+=sourceRadiance(p+offsets[i],t)*weight;}
 let face=gaussian(p.x/.14,1.)*window(p.y,.10,.17,.36,.43);
 c+=(source+spread*.95)*(1.-face*.8);
 if(u.state.w<1.5){
  let axis=vec2f(.38268343,.92387953);
  c+=star(p,vec2f(-.10,-.12),vec2f(-1.,.10),axis,t,.22,.29,.43,.135);
  c+=star(p,vec2f(.10,-.14),vec2f(1.,.10),axis,t,.27,.34,.48,.135);
  c+=star(p,vec2f(-.08,-.29),vec2f(-.65,-.76),axis,t,.43,.50,.64,.135);
  c+=star(p,vec2f(.07,-.32),vec2f(.55,-.83),axis,t,.48,.55,.69,.135);
  c+=star(p,vec2f(-.10,-.12),vec2f(-1.,.10),axis,t,.71,.78,.89,.115);
  c+=star(p,vec2f(.10,-.14),vec2f(1.,.10),axis,t,.71,.78,.89,.115);
 }
 return vec4f(c,1.);
}
`;
