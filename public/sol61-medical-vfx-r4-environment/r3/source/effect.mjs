// Medical r4 E r3: fixed upper source -> curved metal -> floor-bound reflection.
export const SIZE=[1164,1351],PERIOD=0;
export const RECEIVERS=Object.freeze({rail:{anchor:[574,660],direction:[1,0],start:78,end:332,widthNear:44,widthFar:77,radiance:1.15},lower:{anchor:[468,1016],direction:[0,1],start:100,end:229,widthNear:41,widthFar:63,radiance:.66}});
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
const box=(p,a,b,f=1)=>smooth(a[0],a[0]+f,p[0])*(1-smooth(b[0]-f,b[0],p[0]))*smooth(a[1],a[1]+f,p[1])*(1-smooth(b[1]-f,b[1],p[1]));
const g=(p,c,r)=>Math.exp(-.5*(((p[0]-c[0])/r[0])**2+((p[1]-c[1])/r[1])**2));
export function footprint(p,f){const d=[p[0]-f.anchor[0],p[1]-f.anchor[1]],u=d[0]*f.direction[0]+d[1]*f.direction[1],v=-d[0]*f.direction[1]+d[1]*f.direction[0];const width=f.widthNear+(f.widthFar-f.widthNear)*clamp((u-f.start)/(f.end-f.start));const support=smooth(f.start,f.start+29,u)*(1-smooth(f.end-46,f.end,u));const across=Math.max(0,1-(v/width)**2)**2;return support*across*f.radiance;}
export function probe(p,{source=1,world=1,obs=1,effect=1}={}){const floor=box(p,[183,358],[974,1252],3)*(1-box(p,[323,394],[603,1100]));const gain=source*world*effect;const primary=footprint(p,RECEIVERS.rail)*floor*gain,secondary=footprint(p,RECEIVERS.lower)*floor*gain;const core=(box(p,[569,443],[580,994])*g(p,[574,660],[3.8,66])*4.5+box(p,[355,1006],[570,1026])*g(p,[468,1016],[48,3.5])*3.2)*gain;const bloom=(.13*g(p,[574,660],[20,77])+.10*g(p,[468,1016],[57,19]))*gain*obs;return {primary,secondary,core,bloom};}
export const WGSL=/* wgsl */`
struct Params{viewport:vec2f,time:f32,enabled:f32,fit:vec4f,source:f32,world:f32,obs:f32,padding:f32};
@group(0) @binding(0) var original:texture_2d<f32>;
@group(0) @binding(1) var linearSampler:sampler;
@group(0) @binding(2) var<uniform> params:Params;
@vertex fn vertexMain(@builtin(vertex_index) id:u32)->@builtin(position) vec4f{var v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[id],0,1);}
fn box(p:vec2f,a:vec2f,b:vec2f,f:f32)->f32{return smoothstep(a.x,a.x+f,p.x)*(1.-smoothstep(b.x-f,b.x,p.x))*smoothstep(a.y,a.y+f,p.y)*(1.-smoothstep(b.y-f,b.y,p.y));}
fn g(p:vec2f,c:vec2f,r:vec2f)->f32{let d=(p-c)/r;return exp(-.5*dot(d,d));}
// Receiver footprint in coordinates of the registered reflecting surface.
// No light volume/beam in air: the world signal only exists on the dry floor.
fn footprint(p:vec2f,anchor:vec2f,direction:vec2f,start:f32,end:f32,widthNear:f32,widthFar:f32,radiance:f32)->f32{
 let d=p-anchor;let u=dot(d,direction);let v=dot(d,vec2f(-direction.y,direction.x));
 let width=mix(widthNear,widthFar,clamp((u-start)/(end-start),0.,1.));
 let support=smoothstep(start,start+29.,u)*(1.-smoothstep(end-46.,end,u));
 let across=max(0.,1.-pow(v/width,2.));return support*across*across*radiance;
}
fn decode(v:vec3f)->vec3f{return select(v/12.92,pow((v+.055)/1.055,vec3f(2.4)),v>vec3f(.04045));}
fn encode(v:vec3f)->vec3f{return select(v*12.92,1.055*pow(max(v,vec3f(0.)),vec3f(1./2.4))-.055,v>vec3f(.0031308));}
struct Field{core:f32,primary:f32,secondary:f32,ceramic:f32,background:f32,bloom:f32};
fn field(p:vec2f)->Field{
 let rail=box(p,vec2f(569.,443.),vec2f(580.,994.),1.);let lower=box(p,vec2f(355.,1006.),vec2f(570.,1026.),1.);
 let faucet=box(p,vec2f(884.,111.),vec2f(903.,191.),2.);
 let leftRail=box(p,vec2f(336.,440.),vec2f(349.,994.),1.);
 let legs=box(p,vec2f(350.,1020.),vec2f(363.,1038.),2.)+box(p,vec2f(560.,1020.),vec2f(573.,1038.),2.);
 let core=4.5*rail*g(p,vec2f(574.,660.),vec2f(3.8,66.))+3.2*lower*g(p,vec2f(468.,1016.),vec2f(48.,3.5))+1.6*faucet*g(p,vec2f(893.,138.),vec2f(6.,12.))+leftRail*.08+legs*.16;
 let floorMask=box(p,vec2f(183.,358.),vec2f(974.,1252.),3.)*(1.-box(p,vec2f(323.,394.),vec2f(603.,1100.),1.));
 let primary=floorMask*footprint(p,vec2f(574.,660.),vec2f(1.,0.),78.,332.,44.,77.,1.15);
 let secondary=floorMask*footprint(p,vec2f(468.,1016.),vec2f(0.,1.),100.,229.,41.,63.,.66);
 let ceramicMask=box(p,vec2f(795.,188.),vec2f(977.,286.),3.)*(1.-g(p,vec2f(885.,235.),vec2f(18.,17.)));
 let ceramic=ceramicMask*.28*g(p,vec2f(944.,228.),vec2f(32.,29.));
 let vinyl=box(p,vec2f(357.,430.),vec2f(563.,550.),5.)+box(p,vec2f(358.,572.),vec2f(563.,990.),5.);
 let cabinet=box(p,vec2f(206.,117.),vec2f(479.,253.),3.)*(1.-box(p,vec2f(215.,136.),vec2f(338.,239.),1.))*(1.-box(p,vec2f(384.,121.),vec2f(470.,233.),1.));
 let wall=box(p,vec2f(146.,350.),vec2f(169.,1247.),2.)+box(p,vec2f(156.,59.),vec2f(977.,99.),2.);
 let background=vinyl*.009+cabinet*.010+wall*.005+floorMask*.003;
 // Secondary observer PSF; world directional footprints carry the main read.
 let room=box(p,vec2f(139.,58.),vec2f(1019.,1256.),3.);
 let bloom=room*(.13*g(p,vec2f(574.,660.),vec2f(20.,77.))+.10*g(p,vec2f(468.,1016.),vec2f(57.,19.))+.065*g(p,vec2f(893.,138.),vec2f(18.,22.)));
 return Field(core,primary,secondary,ceramic,background,bloom);
}
@fragment fn fragmentMain(@builtin(position) pos:vec4f)->@location(0) vec4f{
 let uv=(pos.xy-params.fit.xy)/params.fit.zw;
 if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(1.,1.,1.,1.);}
 let base=textureSampleLevel(original,linearSampler,uv,0.);if(params.enabled==0.||params.source==0.||params.world==0.){return base;}
 let f=field(uv*vec2f(1164.,1351.));let sourceColor=vec3f(1.,.96,.88);
 let world=sourceColor*(f.core+f.ceramic+f.background)+vec3f(1.,.94,.82)*(f.primary+f.secondary);
 let observer=sourceColor*f.bloom*params.obs;
 let radiance=decode(base.rgb)+(world+observer)*params.source*params.world;
 return vec4f(encode(radiance),base.a);
}`;
