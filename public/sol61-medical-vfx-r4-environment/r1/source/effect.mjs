// Original r4 registration. Static upper diffuse source, material-specific response.
export const SIZE=[1164,1351],PERIOD=0;
const smooth=(a,b,x)=>{let q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q);};
const rect=(p,a,b,f=1)=>smooth(a[0],a[0]+f,p[0])*(1-smooth(b[0]-f,b[0],p[0]))*smooth(a[1],a[1]+f,p[1])*(1-smooth(b[1]-f,b[1],p[1]));
const oval=(p,c,r)=>Math.max(0,1-((p[0]-c[0])/r[0])**2-((p[1]-c[1])/r[1])**2)**2;
export const masks=p=>({metal:Math.min(1,rect(p,[568,444],[579,993])+rect(p,[336,439],[349,993])+rect(p,[355,1005],[566,1026])+rect(p,[367,410],[551,423])+rect(p,[350,1020],[363,1038],2)+rect(p,[560,1020],[573,1038],2)+oval(p,[893,125],[11,15])+rect(p,[886,140],[901,190])),ceramic:rect(p,[794,190],[977,285],3)*(1-oval(p,[885,235],[25,23])),vinyl:rect(p,[357,430],[562,550],5)+rect(p,[358,571],[562,989],5),floor:rect(p,[182,358],[974,1251],3)*(1-rect(p,[323,394],[603,1100])),wall:rect(p,[145,350],[169,1247],2)+rect(p,[156,59],[977,99],2),cabinet:rect(p,[205,117],[479,253],3)*(1-rect(p,[215,135],[336,239]))*(1-rect(p,[384,121],[470,233]))});
export const response=(p,{source=1,world=1,effect=1}={})=>{const m=masks(p);const gain=source*world*effect;return gain*(m.metal*.32+m.ceramic*.10+m.vinyl*.11+m.floor*.045+m.wall*.05+m.cabinet*.14);};
export const WGSL=/* wgsl */`
struct Params{viewport:vec2f,time:f32,enabled:f32,fit:vec4f,source:f32,world:f32,obs:f32,padding:f32};
@group(0) @binding(0) var original:texture_2d<f32>;
@group(0) @binding(1) var linearSampler:sampler;
@group(0) @binding(2) var<uniform> params:Params;
@vertex fn vertexMain(@builtin(vertex_index) id:u32)->@builtin(position) vec4f{var v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[id],0,1);}
fn box(p:vec2f,a:vec2f,b:vec2f,f:f32)->f32{return smoothstep(a.x,a.x+f,p.x)*(1.-smoothstep(b.x-f,b.x,p.x))*smoothstep(a.y,a.y+f,p.y)*(1.-smoothstep(b.y-f,b.y,p.y));}
fn oval(p:vec2f,c:vec2f,r:vec2f)->f32{let d=(p-c)/r;let q=max(0.,1.-dot(d,d));return q*q;}
struct Masks{metal:f32,ceramic:f32,vinyl:f32,floorMask:f32,wall:f32,cabinet:f32};
fn masks(p:vec2f)->Masks{
 let metal=clamp(box(p,vec2f(568.,444.),vec2f(579.,993.),1.)+box(p,vec2f(336.,439.),vec2f(349.,993.),1.)+box(p,vec2f(355.,1005.),vec2f(566.,1026.),1.)+box(p,vec2f(367.,410.),vec2f(551.,423.),1.)+box(p,vec2f(350.,1020.),vec2f(363.,1038.),2.)+box(p,vec2f(560.,1020.),vec2f(573.,1038.),2.)+oval(p,vec2f(893.,125.),vec2f(11.,15.))+box(p,vec2f(886.,140.),vec2f(901.,190.),1.),0.,1.);
 let ceramic=box(p,vec2f(794.,190.),vec2f(977.,285.),3.)*(1.-oval(p,vec2f(885.,235.),vec2f(25.,23.)));
 let vinyl=box(p,vec2f(357.,430.),vec2f(562.,550.),5.)+box(p,vec2f(358.,571.),vec2f(562.,989.),5.);
 let floorMask=box(p,vec2f(182.,358.),vec2f(974.,1251.),3.)*(1.-box(p,vec2f(323.,394.),vec2f(603.,1100.),1.));
 let wall=box(p,vec2f(145.,350.),vec2f(169.,1247.),2.)+box(p,vec2f(156.,59.),vec2f(977.,99.),2.);
 let cabinet=box(p,vec2f(205.,117.),vec2f(479.,253.),3.)*(1.-box(p,vec2f(215.,135.),vec2f(336.,239.),1.))*(1.-box(p,vec2f(384.,121.),vec2f(470.,233.),1.));
 return Masks(metal,ceramic,vinyl,floorMask,wall,cabinet);
}
fn decode(v:vec3f)->vec3f{return select(v/12.92,pow((v+.055)/1.055,vec3f(2.4)),v>vec3f(.04045));}
fn encode(v:vec3f)->vec3f{return select(v*12.92,1.055*pow(max(v,vec3f(0.)),vec3f(1./2.4))-.055,v>vec3f(.0031308));}
fn baseAt(p:vec2f)->vec4f{return textureSampleLevel(original,linearSampler,p/vec2f(1164.,1351.),0.);}
fn worldAt(p:vec2f)->vec3f{
 let b=decode(baseAt(p).rgb);let m=masks(p);
 // Reconstruct response from finite headroom; never add a second baked highlight.
 // Uniform upper input PH6, local geometric lobe support and material widths.
 let narrow=m.metal*(.12+.20*oval(p,vec2f(575.,709.),vec2f(12.,276.)));
 let bowl=m.ceramic*(.04+.06*oval(p,vec2f(949.,248.),vec2f(39.,33.)));
 let vinyl=m.vinyl*(.04+.07*oval(p,vec2f(539.,758.),vec2f(61.,257.)));
 let architecture=m.floorMask*.045+m.wall*.05+m.cabinet*.14;
 let factor=vec3f(narrow)+bowl*vec3f(1.,.98,.95)+vinyl*vec3f(.82,.92,1.)+architecture*vec3f(1.,.98,.93);
 return b+max(vec3f(0.),vec3f(.97)-b)*factor*params.source*params.world;
}
fn extraction(p:vec2f,member:u32)->vec3f{
 let m=masks(p);let memberMask=select(m.metal,m.ceramic,member==1u);let c=worldAt(p);let y=dot(c,vec3f(.2126,.7152,.0722));
 return c*memberMask*smoothstep(.8,.9,y)*params.source*params.world;
}
@fragment fn fragmentMain(@builtin(position) pos:vec4f)->@location(0) vec4f{
 let uv=(pos.xy-params.fit.xy)/params.fit.zw;
 if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(1.,1.,1.,1.);}
 let p=uv*vec2f(1164.,1351.);let base=baseAt(p);
 if(params.enabled==0.||params.source==0.||params.world==0.){return base;}
 var c=worldAt(p);let m=masks(p);
 if(params.obs>0.&&(m.metal>0.||m.ceramic>0.)){
  let member=select(0u,1u,m.ceramic>0.);let memberMask=select(m.metal,m.ceramic,member==1u);
  let sigma=1164./288.*.75;let radius=1164./288.*2.25;let stride=radius/2.;var sum=vec3f(0.);var weight=0.;
  for(var yi=-2;yi<=2;yi++){for(var xi=-2;xi<=2;xi++){let d=vec2f(f32(xi),f32(yi))*stride;let r2=dot(d,d);if(r2<=radius*radius){let neighborMask=masks(p+d);let same=select(neighborMask.metal,neighborMask.ceramic,member==1u);let w=exp(-r2/(2.*sigma*sigma))*same;sum+=extraction(p+d,member)*w;weight+=w;}}}
  // Renormalize at same-material boundaries rather than leaking into background.
  let own=extraction(p,member);let redistributed=select(own,sum/max(weight,.0001),weight>.0001);
  c+=(redistributed-own)*(.06*params.obs)*memberMask;
 }
 return vec4f(encode(clamp(c,vec3f(0.),vec3f(1.))),base.a);
}`;
