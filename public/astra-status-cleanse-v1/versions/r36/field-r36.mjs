// GPT-6-Astra r36, independently authored positive recovery light.
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
fn flowSample(q:vec3f,t:f32,frontY:f32)->vec3f{
 // An open, curved translucent volume; the receiver splits its front/back projection.
 let bend=.080*sin(q.x*5.2+t*1.2);
 let dy=q.y-frontY-bend;
 let depth=.115*sin(q.x*7.0+t*3.7)+.035*cos(dy*10.+q.x*4.);
 let width=.40+.025*cos(dy*7.+t*3.);
 let across=exp(-pow(abs(q.x)/width,4.));
 let sheet=exp(-dy*dy/.0115-(q.z-depth)*(q.z-depth)/.0039);
 let trailing=exp(-(dy-.115)*(dy-.115)/.009-(q.z-depth-.025)*(q.z-depth-.025)/.005)*.26;
 let density=across*(sheet+trailing);
 let rolling=.55+.45*cos(q.x*9.+(q.y+t*.72)*12.);
 let facing=.55+.45*abs(cos(q.x*7.+t*3.7));
 let core=sheet*sheet*across*(.45+.55*rolling);
 return vec3f(.24,.88,.78)*density*facing+vec3f(.84,1.,.88)*core*.75;
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=vec2f(v.p.x-u.viewport.z,u.viewport.w-v.p.y)/u.state.x;let t=u.state.y;
 let body=sprite(p);let alpha=body.a;let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);
 var c=mix(background,body.rgb,alpha);if(t<=0.||t>=1.){return vec4f(c,1.);}
 let face=gaussian(p.x/.14,1.)*window(p.y,.10,.17,.36,.43);
 let descent=smoothstep(.055,.68,t);let frontY=.15-.80*descent;
 let flowLife=window(t,.014,.105,.59,.73);
 var frontLight=vec3f(0.);var rearLight=vec3f(0.);
 if(abs(p.x)<.7&&abs(p.y-frontY)<.42){
  for(var i=0;i<16;i++){
   let z=-.30+f32(i)*.04;let sampleLight=flowSample(vec3f(p,z),t,frontY)*.19;
   if(z<0.){rearLight+=sampleLight;}else{frontLight+=sampleLight;}
  }
 }
 let floorFade=smoothstep(-.77,-.64,p.y);
 c+=(rearLight*(1.-alpha)+frontLight*(1.-alpha*.42))*flowLife*floorFade*(1.-face*.98);
 // Passage changes the same receiving surface; there is no removed material or adverse state.
 let bend=.080*sin(p.x*5.2+t*1.2);
 let passed=smoothstep(frontY+bend-.065,frontY+bend+.095,p.y);
 let belowFace=1.-smoothstep(.05,.14,p.y);
 let nearPass=exp(-(p.y-frontY-bend-.105)*(p.y-frontY-bend-.105)/.052);
 let deposit=passed*(nearPass*.70+.20)*window(t,.06,.22,.66,.85)*belowFace;
 c+=alpha*vec3f(.50,1.,.78)*deposit*(1.-face);
 let complete=window(t,.65,.78,.86,.995);
 c+=alpha*vec3f(.47,1.,.78)*complete*.66*(1.-face*.86);
 if(u.state.w<1.5){
  let axis=vec2f(.38268343,.92387953);
  c+=star(p,vec2f(-.10,-.12),vec2f(-1.,.10),axis,t,.18,.25,.39,.135);
  c+=star(p,vec2f(.10,-.14),vec2f(1.,.10),axis,t,.22,.29,.43,.135);
  c+=star(p,vec2f(-.08,-.29),vec2f(-.65,-.76),axis,t,.37,.44,.58,.135);
  c+=star(p,vec2f(.07,-.32),vec2f(.55,-.83),axis,t,.43,.50,.64,.135);
  c+=star(p,vec2f(-.05,-.41),vec2f(-.20,-.98),axis,t,.53,.60,.73,.135);
  c+=star(p,vec2f(.04,-.39),vec2f(.20,-.98),axis,t,.57,.64,.77,.135);
 }
 return vec4f(c,1.);
}
`;
