// r3 pixel mapping of medical-vfx-r4 code-declared stationary physical targets.
// No new emitter/apparatus/particles; illumination is an open upper boundary.
export const SIZE=[1161,1355], PERIOD=24;
export const EMPTY_SURFACES=Object.freeze(['water','wet-film','monitor','medical-lamp','particles','new-cast-shadow','lens-ghost','SFX']);
export const OBS_SIGMA=1161/288*.75, OBS_RADIUS=1161/288*2.25;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
const rect=(p,a,b,f=1)=>smooth(a[0],a[0]+f,p[0])*(1-smooth(b[0]-f,b[0],p[0]))*smooth(a[1],a[1]+f,p[1])*(1-smooth(b[1]-f,b[1],p[1]));
const ellipse=(p,c,r)=>Math.max(0,1-((p[0]-c[0])/r[0])**2-((p[1]-c[1])/r[1])**2)**2;
export function masks(p){
 const metal=clamp(rect(p,[572,443],[580,1005],1)+rect(p,[359,1014],[564,1023],1)+rect(p,[366,413],[550,421],1)+rect(p,[337,449],[345,1000],1)+ellipse(p,[889,125],[10,13])+rect(p,[888,145],[897,184],1));
 const ceramic=rect(p,[792,188],[974,286],2)*(1-ellipse(p,[884,235],[22,22]))*(1-rect(p,[871,186],[900,207],1));
 const vinyl=clamp(rect(p,[357,429],[563,552],4)+rect(p,[357,569],[563,997],5));
 const floor=rect(p,[185,365],[975,1255],3)*(1-rect(p,[325,396],[600,1103],1));
 const wall=clamp(rect(p,[155,61],[977,99],2)+rect(p,[145,350],[168,1248],2));
 const cabinet=rect(p,[205,115],[478,252],2)*(1-rect(p,[213,134],[339,238],1))*(1-rect(p,[379,119],[473,230],1));
 return {metal,ceramic,vinyl,floor,wall,cabinet};
}
export function sample(p,_t,{source=1,world=1,effect=1}={}){
 const m=masks(p),l=source*world*effect;
 const narrow=m.metal*(.011+.027*ellipse(p,[576,729],[10,230]));
 const broad=m.ceramic*(.005+.016*ellipse(p,[943,242],[45,37]));
 const vinyl=m.vinyl*(.003+.008*ellipse(p,[545,705],[55,300]));
 const architectural=m.floor*.0028+m.wall*.0035+m.cabinet*.007;
 return {...m,narrow,broad,architectural,rgb:[l*(narrow+broad+vinyl*.70+architectural),l*(narrow+broad*.98+vinyl*.88+architectural*.97),l*(narrow+broad*.94+vinyl+architectural*.91)]};
}
// Complete world and OBS calculations stay in WebGPU. No GPU-to-2D round trip.
export const WGSL=/* wgsl */`
struct Params { viewport:vec2f, time:f32, enabled:f32, fit:vec4f, source:f32, world:f32, obs:f32, padding:f32 };
@group(0) @binding(0) var original:texture_2d<f32>;
@group(0) @binding(1) var linearSampler:sampler;
@group(0) @binding(2) var<uniform> params:Params;
@vertex fn vertexMain(@builtin(vertex_index) id:u32)->@builtin(position) vec4f {var v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[id],0,1);}
fn box(p:vec2f,a:vec2f,b:vec2f,f:f32)->f32 {return smoothstep(a.x,a.x+f,p.x)*(1-smoothstep(b.x-f,b.x,p.x))*smoothstep(a.y,a.y+f,p.y)*(1-smoothstep(b.y-f,b.y,p.y));}
fn oval(p:vec2f,c:vec2f,r:vec2f)->f32 {let d=(p-c)/r;let v=max(0.,1-dot(d,d));return v*v;}
struct Masks { metal:f32, ceramic:f32, vinyl:f32, floor:f32, wall:f32, cabinet:f32 };
fn masks(p:vec2f)->Masks {
 let metal=clamp(box(p,vec2f(572.,443.),vec2f(580.,1005.),1.)+box(p,vec2f(359.,1014.),vec2f(564.,1023.),1.)+box(p,vec2f(366.,413.),vec2f(550.,421.),1.)+box(p,vec2f(337.,449.),vec2f(345.,1000.),1.)+oval(p,vec2f(889.,125.),vec2f(10.,13.))+box(p,vec2f(888.,145.),vec2f(897.,184.),1.),0.,1.);
 let ceramic=box(p,vec2f(792.,188.),vec2f(974.,286.),2.)*(1-oval(p,vec2f(884.,235.),vec2f(22.,22.)))*(1-box(p,vec2f(871.,186.),vec2f(900.,207.),1.));
 let vinyl=clamp(box(p,vec2f(357.,429.),vec2f(563.,552.),4.)+box(p,vec2f(357.,569.),vec2f(563.,997.),5.),0.,1.);
 let floorMask=box(p,vec2f(185.,365.),vec2f(975.,1255.),3.)*(1-box(p,vec2f(325.,396.),vec2f(600.,1103.),1.));
 let wall=clamp(box(p,vec2f(155.,61.),vec2f(977.,99.),2.)+box(p,vec2f(145.,350.),vec2f(168.,1248.),2.),0.,1.);
 let cabinet=box(p,vec2f(205.,115.),vec2f(478.,252.),2.)*(1-box(p,vec2f(213.,134.),vec2f(339.,238.),1.))*(1-box(p,vec2f(379.,119.),vec2f(473.,230.),1.));
 return Masks(metal,ceramic,vinyl,floorMask,wall,cabinet);
}
fn decode(v:vec3f)->vec3f {return select(v/12.92,pow((v+.055)/1.055,vec3f(2.4)),v>vec3f(.04045));}
fn encode(v:vec3f)->vec3f {return select(v*12.92,1.055*pow(max(v,vec3f(0.)),vec3f(1./2.4))-.055,v>vec3f(.0031308));}
fn baseAt(p:vec2f)->vec4f {return textureSampleLevel(original,linearSampler,p/vec2f(1161.,1355.),0.);}
fn worldAt(p:vec2f)->vec3f {
 let m=masks(p);let l=params.source*params.world;
 let narrow=m.metal*(.011+.027*oval(p,vec2f(576.,729.),vec2f(10.,230.)));
 let broad=m.ceramic*(.005+.016*oval(p,vec2f(943.,242.),vec2f(45.,37.)));
 let vinyl=m.vinyl*(.003+.008*oval(p,vec2f(545.,705.),vec2f(55.,300.)));
 let architecture=m.floor*.0028+m.wall*.0035+m.cabinet*.007;
 return decode(baseAt(p).rgb)+l*(vec3f(narrow)+broad*vec3f(1.,.98,.94)+vinyl*vec3f(.70,.88,1.)+architecture*vec3f(1.,.97,.91));
}
// OBS6: actual masked source extraction and finite same-member redistribution.
fn extraction(p:vec2f,member:u32)->vec3f {
 let m=masks(p);let mask=select(m.metal,m.ceramic,member==1u);let color=worldAt(p);let y=dot(color,vec3f(.2126,.7152,.0722));
 return color*mask*smoothstep(.8,.9,y)*params.source;
}
@fragment fn fragmentMain(@builtin(position) pos:vec4f)->@location(0) vec4f {
 let uv=(pos.xy-params.fit.xy)/params.fit.zw;if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(1.,1.,1.,1.);}
 let p=uv*vec2f(1161.,1355.);let base=baseAt(p);if(params.enabled==0.){return base;}
 let m=masks(p);var color=worldAt(p);
 if(params.obs>0. && (m.metal>0. || m.ceramic>0.)) {
  let member=select(0u,1u,m.ceramic>0.);let memberMask=select(m.metal,m.ceramic,member==1u);var sum=vec3f(0.);var weights=0.;
  let sigma=1161./288.*.75;let radius=1161./288.*2.25;let step=radius/2.;
  for(var yi=-2;yi<=2;yi++){for(var xi=-2;xi<=2;xi++){let d=vec2f(f32(xi),f32(yi))*step;let r2=dot(d,d);if(r2<=radius*radius){let w=exp(-r2/(2.*sigma*sigma));sum+=extraction(p+d,member)*w;weights+=w;}}}
  let own=extraction(p,member);let redistributed=(sum/weights-own)*(.06*params.obs)*memberMask;
  color+=redistributed;
 }
 return vec4f(encode(color),base.a);
}`;
