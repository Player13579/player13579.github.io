// GPT-6-Astra r33, independently authored positive recovery light.
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
fn recoveryField(p:vec2f,t:f32)->vec3f{
 let q=p-vec2f(0.,-.13);
 let opening=mix(.43,1.,smoothstep(.025,.31,t));
 let a=dot(q,vec2f(.38268343,.92387953))/opening;
 let b=dot(q,vec2f(-.92387953,.38268343))/opening;
 if(length(q)>.67){return vec3f(0.);}
 // One fixed optical field, no travelling payload, boundary line or outward jet.
 let broadA=exp(-a*a/.095-b*b/.0068);
 let broadB=exp(-b*b/.095-a*a/.0068);
 let core=exp(-dot(q,q)/(.026*opening*opening));
 let structure=(broadA+broadB)*.54+core*.23;
 let hue=mix(vec3f(.49,1.,.77),vec3f(.98,1.,.76),core);
 return hue*structure;
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let p=vec2f(v.p.x-u.viewport.z,u.viewport.w-v.p.y)/u.state.x;let t=u.state.y;
 let body=sprite(p);let alpha=body.a;let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);
 var c=mix(background,body.rgb,alpha);if(t<=0.||t>=1.){return vec4f(c,1.);}
 let face=gaussian(p.x/.14,1.)*window(p.y,.10,.17,.36,.43);
 let field=recoveryField(p,t);
 let appearance=window(t,.012,.16,.34,.64);
 let received=window(t,.018,.24,.51,.78);
 // Same optical field creates the visible exterior and the lit actor surface.
 c+=field*(appearance*(1.-alpha)*1.48+received*alpha*1.15)*(1.-face);
 let diffusionRadius=mix(.12,.56,smoothstep(.09,.53,t));
 let diffusion=exp(-dot(p-vec2f(0.,-.13),p-vec2f(0.,-.13))/(diffusionRadius*diffusionRadius));
 let settle=window(t,.10,.38,.58,.81);
 c+=alpha*vec3f(.53,1.,.79)*diffusion*settle*.49*(1.-face*.90);
 let whole=window(t,.51,.78,.87,.995);
 c+=alpha*vec3f(.47,1.,.78)*whole*.66*(1.-face*.86);
 // Delayed small glints are optical responses of the same E-wide fixed axes.
 let axis=vec2f(.38268343,.92387953);
 c+=star(p,vec2f(-.10,-.12),vec2f(-1.,.10),axis,t,.27,.34,.49,.115);
 c+=star(p,vec2f(.10,-.14),vec2f(1.,.10),axis,t,.35,.42,.57,.115);
 c+=star(p,vec2f(-.08,-.25),vec2f(-.75,-.66),axis,t,.43,.50,.65,.115);
 c+=star(p,vec2f(.08,-.25),vec2f(.75,-.66),axis,t,.50,.57,.72,.115);
 c+=star(p,vec2f(-.05,-.41),vec2f(-.20,-.98),axis,t,.61,.68,.82,.115);
 c+=star(p,vec2f(.04,-.39),vec2f(.20,-.98),axis,t,.66,.73,.86,.115);
 return vec4f(c,1.);
}
`;
