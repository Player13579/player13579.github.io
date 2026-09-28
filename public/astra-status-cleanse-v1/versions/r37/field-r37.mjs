// GPT-6-Astra r37, independently authored positive recovery light.
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
fn nucleus(q:vec3f,t:f32,consumed:f32)->vec3f{
 let shrink=1.-consumed*.92;
 let contact=vec3f(-.135,-.13,-.025);
 let center=contact+vec3f(-.14,.008,-.02)*shrink;
 let r=q-center;let angle=.25+smoothstep(.08,.57,t)*1.05;
 let ca=cos(angle);let sa=sin(angle);
 let v=vec3f(ca*r.x+sa*r.z,r.y,-sa*r.x+ca*r.z);
 let size=vec3f(.155,.215,.145)*shrink;
 let local=v/size;let depth=abs(local.x)+abs(local.y)+abs(local.z);
 if(depth>1.){return vec3f(0.);}
 let normal=normalize(sign(local)/size);
 let faceLight=.38+.62*max(0.,dot(normal,normalize(vec3f(.7,.4,1.))));
 let skin=exp(-(1.-depth)*(1.-depth)/.014);
 let inside=max(0.,1.-depth);
 let facet=mix(vec3f(.25,.88,.76),vec3f(.62,1.,.94),normal.z*.5+.5);
 let focal=exp(-dot(local,local)*7.);
 return facet*(skin*.63+inside*.80)*faceLight+vec3f(.94,1.,.77)*focal*.65;
}
fn refractedSpot(p:vec2f,t:f32,facetSide:f32)->f32{
 let angle=.25+smoothstep(.08,.57,t)*1.05;
 let localNormal=normalize(vec3f(1.,facetSide*.65,.25));
 let worldNormal=normalize(vec3f(cos(angle)*localNormal.x-sin(angle)*localNormal.z,localNormal.y,sin(angle)*localNormal.x+cos(angle)*localNormal.z));
 let incident=normalize(vec3f(1.,-.32,.03));
 let ray=refract(incident,-worldNormal,.78);
 let distanceToBody=.22/max(.2,ray.x);
 let center=vec2f(-.135,-.13)+ray.xy*distanceToBody;
 let q=p-center;let along=q.x+ray.y*q.y;
 return exp(-pow(abs(along)/.21,4.)-pow(abs(q.y)/.16,4.));
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=vec2f(v.p.x-u.viewport.z,u.viewport.w-v.p.y)/u.state.x;let t=u.state.y;
 let body=sprite(p);let alpha=body.a;let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);
 var c=mix(background,body.rgb,alpha);if(t<=0.||t>=1.){return vec4f(c,1.);}
 let face=gaussian(p.x/.14,1.)*window(p.y,.10,.17,.36,.43);
 let consumed=smoothstep(.20,.67,t);let life=window(t,.01,.105,.53,.705);
 var frontLight=vec3f(0.);var rearLight=vec3f(0.);
 if(distance(p,vec2f(-.27,-.12))<.44){
  for(var i=0;i<24;i++){
   let z=-.30+f32(i)*(.60/23.);let sampleLight=nucleus(vec3f(p,z),t,consumed)*.37;
   if(z<0.){rearLight+=sampleLight;}else{frontLight+=sampleLight;}
  }
 }
 c+=(rearLight*(1.-alpha)+frontLight*(1.-alpha*.20))*life*(1.-face);
 // The body receives broad facet-shaped illumination while the same source is consumed.
 let delivered=1.-pow(1.-consumed,2.);
 let upper=refractedSpot(p,t,-1.);let lower=refractedSpot(p,t,1.);
 let uptake=delivered*(upper*(1.-smoothstep(.38,.58,t))+lower*smoothstep(.31,.53,t));
 c+=alpha*vec3f(.49,1.,.79)*uptake*window(t,.14,.28,.60,.79)*.92*(1.-face);
 let complete=window(t,.64,.78,.86,.995);
 c+=alpha*vec3f(.47,1.,.78)*complete*.66*(1.-face*.86);
 if(u.state.w<1.5){
  let axis=vec2f(.38268343,.92387953);
  c+=star(p,vec2f(-.10,-.12),vec2f(-1.,.10),axis,t,.22,.29,.43,.135);
  c+=star(p,vec2f(.10,-.14),vec2f(1.,.10),axis,t,.28,.35,.49,.135);
  c+=star(p,vec2f(-.08,-.29),vec2f(-.65,-.76),axis,t,.41,.48,.62,.135);
  c+=star(p,vec2f(.07,-.32),vec2f(.55,-.83),axis,t,.47,.54,.68,.135);
  c+=star(p,vec2f(-.10,-.12),vec2f(-1.,.10),axis,t,.71,.78,.89,.115);
  c+=star(p,vec2f(.10,-.14),vec2f(1.,.10),axis,t,.71,.78,.89,.115);
 }
 return vec4f(c,1.);
}
`;
