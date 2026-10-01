// Fixed upper diffuse source; projected cylinder reflection, material sheen, separate OBS.
export const SIZE=[1164,1351],PERIOD=0;
export const CONTRACT=Object.freeze({pixelsPerMetre:1164/2.88,height:.70,tubeRadius:.018,reflectance:.72,sourceAngles:[-10,0,10],normalAngles:[11,14.5,18,21.5,25],normalWeights:[.12,.23,.30,.23,.12],sourceWeights:[.25,.5,.25],roughness:.10,sourceExposure:4,rail:{cross:574,start:443,end:994},lower:{cross:1016,start:355,end:570},upperDirection:[0,0,1],vinylRoughnessExponent:16,vinylPeak:.14});
const smooth=(a,b,x)=>{let t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const box=(p,a,b,f=1)=>smooth(a[0],a[0]+f,p[0])*(1-smooth(b[0]-f,b[0],p[0]))*smooth(a[1],a[1]+f,p[1])*(1-smooth(b[1]-f,b[1],p[1]));
const gauss=(x,s)=>Math.exp(-.5*(x/s)**2);
export const RAYS=Object.freeze(CONTRACT.normalAngles.flatMap((a,i)=>CONTRACT.sourceAngles.map((b,j)=>{const n=[Math.cos(a*Math.PI/180),Math.sin(a*Math.PI/180)],incoming=[Math.sin(b*Math.PI/180),-Math.cos(b*Math.PI/180)],incidence=-(incoming[0]*n[0]+incoming[1]*n[1]),outgoing=[incoming[0]+2*incidence*n[0],incoming[1]+2*incidence*n[1]];if(outgoing[1]>=-.08)throw Error('ray does not reach floor');const travel=CONTRACT.height/(-outgoing[1]),offset=travel*outgoing[0]*CONTRACT.pixelsPerMetre,sigma=(.035+travel*CONTRACT.roughness)*CONTRACT.pixelsPerMetre,weight=CONTRACT.normalWeights[i]*CONTRACT.sourceWeights[j]*incidence*CONTRACT.reflectance*CONTRACT.sourceExposure*(2*CONTRACT.tubeRadius*CONTRACT.pixelsPerMetre)/(Math.sqrt(2*Math.PI)*sigma);return Object.freeze({normal:n,incoming,outgoing,incidence,offset,sigma,weight});})));
export function receiver(p,kind='rail'){const r=CONTRACT[kind],cross=kind==='rail'?p[0]:p[1],axis=kind==='rail'?p[1]:p[0];let total=0;for(const ray of RAYS){const blur=ray.sigma*.35;const along=smooth(r.start-blur,r.start+blur,axis)*(1-smooth(r.end-blur,r.end+blur,axis));total+=ray.weight*gauss(cross-r.cross-ray.offset,ray.sigma)*along;}return total;}
export function satin(p,a,b){const q=[(p[0]-(a[0]+b[0])*.5)/((b[0]-a[0])*.5),(p[1]-(a[1]+b[1])*.5)/((b[1]-a[1])*.5)];const nz=1/Math.sqrt(1+(.62*q[0])**2+(.43*q[1])**2);return box(p,a,b,7)*CONTRACT.vinylPeak*nz**CONTRACT.vinylRoughnessExponent;}
export function probe(p,{source=1,world=1,obs=1,effect=1}={}){const floor=box(p,[183,358],[974,1252],3)*(1-box(p,[323,394],[603,1100]));const gain=source*world*effect;return {rail:receiver(p)*floor*gain,lower:receiver(p,'lower')*floor*gain,vinyl:(satin(p,[357,430],[563,550])+satin(p,[358,572],[563,990]))*gain,observer:obs*gain*(.075*gauss(p[0]-574,20)*gauss(p[1]-716,180))};}
const rays=RAYS.map(r=>`vec3f(${r.offset.toFixed(8)},${r.sigma.toFixed(8)},${r.weight.toFixed(8)})`).join(',\n');
export const WGSL=/*wgsl*/`
struct Params{viewport:vec2f,time:f32,enabled:f32,fit:vec4f,source:f32,world:f32,obs:f32,padding:f32};
@group(0) @binding(0) var original:texture_2d<f32>;
@group(0) @binding(1) var linearSampler:sampler;
@group(0) @binding(2) var<uniform> params:Params;
@vertex fn vertexMain(@builtin(vertex_index) id:u32)->@builtin(position) vec4f{var v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[id],0,1);}
fn box(p:vec2f,a:vec2f,b:vec2f,f:f32)->f32{return smoothstep(a.x,a.x+f,p.x)*(1.-smoothstep(b.x-f,b.x,p.x))*smoothstep(a.y,a.y+f,p.y)*(1.-smoothstep(b.y-f,b.y,p.y));}
fn g(p:vec2f,c:vec2f,r:vec2f)->f32{let d=(p-c)/r;return exp(-.5*dot(d,d));}
fn decode(v:vec3f)->vec3f{return select(v/12.92,pow((v+.055)/1.055,vec3f(2.4)),v>vec3f(.04045));}
fn encode(v:vec3f)->vec3f{return select(v*12.92,1.055*pow(max(v,vec3f(0.)),vec3f(1./2.4))-.055,v>vec3f(.0031308));}
// Each frozen ray is derived from incident direction, cylinder normal, height and roughness.
const rays=array<vec3f,15>(${rays});
fn projectedReceiver(cross:f32,axis:f32,surface:f32,start:f32,end:f32)->f32{
 var sum=0.;for(var i=0u;i<15u;i++){let r=rays[i];let blur=r.y*.35;let along=smoothstep(start-blur,start+blur,axis)*(1.-smoothstep(end-blur,end+blur,axis));let d=(cross-surface-r.x)/r.y;sum+=r.z*exp(-.5*d*d)*along;}return sum;
}
// Actual cushion dome: normal toward overhead source/view sets the broad satin lobe.
fn satin(p:vec2f,a:vec2f,b:vec2f)->f32{
 let mask=box(p,a,b,7.);let q=(p-(a+b)*.5)/((b-a)*.5);
 let normal=normalize(vec3f(-q.x*.62,-q.y*.43,1.));
 let source=vec3f(0.,0.,1.);let observer=vec3f(0.,0.,1.);let halfVector=normalize(source+observer);
 return mask*.14*pow(max(0.,dot(normal,halfVector)),16.);
}
@fragment fn fragmentMain(@builtin(position) pos:vec4f)->@location(0) vec4f{
 let uv=(pos.xy-params.fit.xy)/params.fit.zw;if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(1.,1.,1.,1.);}
 let base=textureSampleLevel(original,linearSampler,uv,0.);if(params.enabled==0.||params.source==0.||params.world==0.){return base;}
 let p=uv*vec2f(1164.,1351.);let linear=decode(base.rgb);
 let floor=box(p,vec2f(183.,358.),vec2f(974.,1252.),3.)*(1.-box(p,vec2f(323.,394.),vec2f(603.,1100.),1.));
 let reflected=floor*(projectedReceiver(p.x,p.y,574.,443.,994.)+projectedReceiver(p.y,p.x,1016.,355.,570.));
 let rail=box(p,vec2f(569.,443.),vec2f(580.,994.),1.);let lower=box(p,vec2f(355.,1006.),vec2f(570.,1026.),1.);
 let metal=rail*1.8*g(p,vec2f(574.,716.),vec2f(3.5,240.))+lower*1.25*g(p,vec2f(468.,1016.),vec2f(90.,3.5));
 let legs=.14*(box(p,vec2f(350.,1020.),vec2f(363.,1038.),2.)+box(p,vec2f(560.,1020.),vec2f(573.,1038.),2.));
 let vinyl=satin(p,vec2f(357.,430.),vec2f(563.,550.))+satin(p,vec2f(358.,572.),vec2f(563.,990.));
 let ceramic=box(p,vec2f(795.,188.),vec2f(977.,286.),5.)*(1.-g(p,vec2f(885.,235.),vec2f(20.,18.)))*.10*g(p,vec2f(942.,229.),vec2f(33.,30.));
 let faucet=box(p,vec2f(884.,111.),vec2f(903.,191.),2.)*.8*g(p,vec2f(893.,138.),vec2f(6.,20.));
 let world=linear*reflected+vec3f(1.,.96,.88)*(metal+legs+vinyl+ceramic+faucet);
 // Lens response is an additional observer term, never the floor irradiation.
 let room=box(p,vec2f(139.,58.),vec2f(1019.,1256.),3.);
 let observer=room*params.obs*vec3f(1.,.96,.88)*(.075*g(p,vec2f(574.,716.),vec2f(20.,180.))+.055*g(p,vec2f(468.,1016.),vec2f(80.,18.))+.04*g(p,vec2f(893.,138.),vec2f(18.,22.)));
 return vec4f(encode(linear+(world+observer)*params.source*params.world),base.a);
}`;
