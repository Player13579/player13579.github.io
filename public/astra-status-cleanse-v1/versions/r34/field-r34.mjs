// GPT-6-Astra r34, independently authored positive recovery light.
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
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=vec2f(v.p.x-u.viewport.z,u.viewport.w-v.p.y)/u.state.x;let t=u.state.y;
 let body=sprite(p);let alpha=body.a;let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);
 var c=mix(background,body.rgb,alpha);if(t<=0.||t>=1.){return vec4f(c,1.);}
 let face=gaussian(p.x/.14,1.)*window(p.y,.10,.17,.36,.43);
 // All three phases are responses of the receiver. There is no external payload or path.
 // First receipt keeps original material/color structure and rises softly.
 let receipt=window(t,.01,.085,.12,.24);
 let material=body.rgb*vec3f(.40,.80,.66)+vec3f(.045,.10,.066);
 c+=alpha*material*receipt*.32*(1.-face*.83);
 // Broad receiving surfaces settle once, from left through right to the lower body.
 let left=exp(-(p.x+.12)*(p.x+.12)/.010-(p.y+.15)*(p.y+.15)/.055);
 let right=exp(-(p.x-.12)*(p.x-.12)/.010-(p.y+.15)*(p.y+.15)/.055);
 let lower=exp(-p.x*p.x/.033-(p.y+.37)*(p.y+.37)/.016);
 let lm=window(t,.15,.27,.31,.42);let rm=window(t,.27,.39,.43,.54);let bm=window(t,.39,.51,.56,.67);
 let receiving=left*lm+right*rm+lower*bm;
 let structure=mix(material,vec3f(.58,1.,.82),.36);
 c+=alpha*structure*receiving*.92*(1.-face);
 // Final confirmation: one broad, clear whole-body peak, followed by finite settling.
 let complete=window(t,.60,.75,.84,.995);
 c+=alpha*vec3f(.47,1.,.78)*complete*.66*(1.-face*.86);
 let axis=vec2f(.38268343,.92387953);
 c+=star(p,vec2f(-.10,-.12),vec2f(-1.,.10),axis,t,.23,.29,.42,.135);
 c+=star(p,vec2f(.10,-.14),vec2f(1.,.10),axis,t,.35,.41,.54,.135);
 c+=star(p,vec2f(-.08,-.29),vec2f(-.65,-.76),axis,t,.46,.52,.66,.135);
 c+=star(p,vec2f(.07,-.32),vec2f(.55,-.83),axis,t,.54,.60,.73,.135);
 c+=star(p,vec2f(-.10,-.12),vec2f(-1.,.10),axis,t,.70,.76,.87,.115);
 c+=star(p,vec2f(.10,-.14),vec2f(1.,.10),axis,t,.70,.76,.87,.115);
 return vec4f(c,1.);
}
`;
