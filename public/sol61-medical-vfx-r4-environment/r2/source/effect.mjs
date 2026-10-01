// New Medical r4 runtime E r2. Reflected upper-source radiance, receivers, OBS.
export const SIZE=[1164,1351],PERIOD=0;
export const SOURCES=Object.freeze([{id:'bed-rail',center:[574,580],core:[3.6,55],radiance:6},{id:'bed-lower',center:[468,1016],core:[44,3.2],radiance:4},{id:'faucet',center:[893,138],core:[6,12],radiance:3}]);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
const box=(p,a,b,f=1)=>smooth(a[0],a[0]+f,p[0])*(1-smooth(b[0]-f,b[0],p[0]))*smooth(a[1],a[1]+f,p[1])*(1-smooth(b[1]-f,b[1],p[1]));
const g=(p,c,r)=>Math.exp(-.5*(((p[0]-c[0])/r[0])**2+((p[1]-c[1])/r[1])**2));
export function probe(p,{source=1,world=1,obs=1,effect=1}={}){
 const rail=box(p,[569,443],[580,994]);const lower=box(p,[355,1006],[570,1026]);const faucet=clamp(box(p,[884,111],[903,191],2));
 const floor=box(p,[183,358],[974,1252],3)*(1-box(p,[323,394],[603,1100]));const room=box(p,[139,58],[1019,1256],3);
 const core=6*rail*g(p,[574,580],[3.6,55])+4*lower*g(p,[468,1016],[44,3.2])+3*faucet*g(p,[893,138],[6,12]);
 const receiver=floor*(.24*g(p,[636,590],[72,113])+.18*g(p,[468,1108],[93,76]));
 const bloom=room*(.30*g(p,[574,580],[27,74])+.23*g(p,[468,1016],[62,25])+.20*g(p,[893,138],[24,26]));
 const gain=source*world*effect;
 return {core:core*gain,receiver:receiver*gain,bloom:bloom*gain*obs};
}
export const WGSL=/* wgsl */`
struct Params{viewport:vec2f,time:f32,enabled:f32,fit:vec4f,source:f32,world:f32,obs:f32,padding:f32};
@group(0) @binding(0) var original:texture_2d<f32>;
@group(0) @binding(1) var linearSampler:sampler;
@group(0) @binding(2) var<uniform> params:Params;
@vertex fn vertexMain(@builtin(vertex_index) id:u32)->@builtin(position) vec4f{var v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[id],0,1);}
fn box(p:vec2f,a:vec2f,b:vec2f,f:f32)->f32{return smoothstep(a.x,a.x+f,p.x)*(1.-smoothstep(b.x-f,b.x,p.x))*smoothstep(a.y,a.y+f,p.y)*(1.-smoothstep(b.y-f,b.y,p.y));}
fn g(p:vec2f,c:vec2f,r:vec2f)->f32{let d=(p-c)/r;return exp(-.5*dot(d,d));}
fn decode(v:vec3f)->vec3f{return select(v/12.92,pow((v+.055)/1.055,vec3f(2.4)),v>vec3f(.04045));}
fn encode(v:vec3f)->vec3f{return select(v*12.92,1.055*pow(max(v,vec3f(0.)),vec3f(1./2.4))-.055,v>vec3f(.0031308));}
struct Field{reflectedCore:f32,ceramic:f32,vinyl:f32,architecture:f32,nearby:f32,bloom:f32};
fn field(p:vec2f)->Field{
 // PH3 source is a finite curved exposed rail, not a new light-emitting fixture.
 let rail=box(p,vec2f(569.,443.),vec2f(580.,994.),1.);
 let lower=box(p,vec2f(355.,1006.),vec2f(570.,1026.),1.);
 let faucet=box(p,vec2f(884.,111.),vec2f(903.,191.),2.);
 let leftRail=box(p,vec2f(336.,440.),vec2f(349.,994.),1.);
 let legs=box(p,vec2f(350.,1020.),vec2f(363.,1038.),2.)+box(p,vec2f(560.,1020.),vec2f(573.,1038.),2.);
 let core=6.*rail*g(p,vec2f(574.,580.),vec2f(3.6,55.))+4.*lower*g(p,vec2f(468.,1016.),vec2f(44.,3.2))+3.*faucet*g(p,vec2f(893.,138.),vec2f(6.,12.));
 let restrainedMetal=(leftRail*.10+legs*.22);
 // PH5 broad ceramic reflection remains distinct from the faucet glint.
 let ceramicMask=box(p,vec2f(795.,188.),vec2f(977.,286.),3.)*(1.-g(p,vec2f(885.,235.),vec2f(18.,17.)));
 let ceramic=ceramicMask*.38*g(p,vec2f(945.,235.),vec2f(37.,32.));
 let vinylMask=box(p,vec2f(357.,430.),vec2f(563.,550.),5.)+box(p,vec2f(358.,572.),vec2f(563.,990.),5.);
 let vinyl=vinylMask*.035*g(p,vec2f(545.,622.),vec2f(34.,153.));
 // PH1 floor receivers are outside existing bed/contact support exclusion.
 let floorMask=box(p,vec2f(183.,358.),vec2f(974.,1252.),3.)*(1.-box(p,vec2f(323.,394.),vec2f(603.,1100.),1.));
 let nearby=floorMask*(.24*g(p,vec2f(636.,590.),vec2f(72.,113.))+.18*g(p,vec2f(468.,1108.),vec2f(93.,76.)));
 let cabinet=box(p,vec2f(206.,117.),vec2f(479.,253.),3.)*(1.-box(p,vec2f(215.,136.),vec2f(338.,239.),1.))*(1.-box(p,vec2f(384.,121.),vec2f(470.,233.),1.));
 let wall=box(p,vec2f(146.,350.),vec2f(169.,1247.),2.)+box(p,vec2f(156.,59.),vec2f(977.,99.),2.);
 let architecture=floorMask*.006+cabinet*.018+wall*.008;
 // OBS1 analytic source-bound Gaussian PSF. Not world scattering or new particles.
 // The PSF broadens the SAME registered core; its weight derives from source radiance.
 let room=box(p,vec2f(139.,58.),vec2f(1019.,1256.),3.);
 let bloom=room*(6.*.05*g(p,vec2f(574.,580.),vec2f(27.,74.))+4.*.0575*g(p,vec2f(468.,1016.),vec2f(62.,25.))+3.*.066666667*g(p,vec2f(893.,138.),vec2f(24.,26.)));
 return Field(core+restrainedMetal,ceramic,vinyl,architecture,nearby,bloom);
}
@fragment fn fragmentMain(@builtin(position) pos:vec4f)->@location(0) vec4f{
 let uv=(pos.xy-params.fit.xy)/params.fit.zw;
 if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(1.,1.,1.,1.);}
 let base=textureSampleLevel(original,linearSampler,uv,0.);
 if(params.enabled==0.||params.source==0.||params.world==0.){return base;}
 let f=field(uv*vec2f(1164.,1351.));let neutral=vec3f(1.,.965,.89);
 let world=neutral*(f.reflectedCore+f.ceramic+f.architecture)+vec3f(.84,.93,1.)*f.vinyl+vec3f(1.,.96,.86)*f.nearby;
 let observation=neutral*f.bloom*params.obs;
 // Source radiance is not capped to .97/headroom. SDR presentation may clip highlights.
 let radiance=decode(base.rgb)+(world+observation)*params.source*params.world;
 return vec4f(encode(radiance),base.a);
}`;
