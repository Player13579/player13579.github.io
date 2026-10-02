// GPT-6.1-Sol. Exact newest-map image-space environment additions only.
export const VERSION='map-missing-object-e-sol61-r1';
export const UNIFORM_BYTES=64;
export const AUDIO_GAIN=0;
export const TARGETS=Object.freeze([
 {id:'server-chair-backrest-ambient-r1',room:'server',owner:'server-chair-backrest-ambient-r1',mode:'ambient',rect:[654,309,749,362],material:'backrest upholstery/shear; armrests and castors fixed'},
 {id:'server-keyboard-console-subpart-r1',room:'server',owner:'server-r05-monitor-console',mode:'existing-console-age',rect:[656,242,743,278],material:'powered keyboard diagnostic wake/check'},
 {id:'server-trackball-console-subpart-r1',room:'server',owner:'server-r05-monitor-console',mode:'existing-console-age',rect:[747,243,773,278],material:'pointing-device status response; ball itself stationary'},
 {id:'server-controlpad-console-subpart-r1',room:'server',owner:'server-r05-monitor-console',mode:'existing-console-age',rect:[782,239,820,277],material:'existing control-key lamp check'},
 {id:'server-worktop-console-receiver-r1',room:'server',owner:'server-r05-monitor-console',mode:'existing-console-age',rect:[637,277,830,291],material:'local worktop receiving of above input activity'},
 {id:'server-entry-thresholds-ambient-r1',room:'server',owner:'server-entry-thresholds-ambient-r1',mode:'ambient',regions:[[580,936,766,981],[72,531,177,633]],material:'open passage air-curtain refraction; jambs/threshold geometry fixed'},
 {id:'medical-door-handle-ambient-r1',room:'medical',owner:'medical-door-handle-ambient-r1',mode:'ambient',rect:[1000,748,1020,832],material:'fixed-end pull handle elastic settling; door leaf/frame fixed'}
]);
const smooth=(a,b,x)=>{const q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q);};
const pulse=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
export function materialMask([x,y],[x0,y0,x1,y1],fade=4){
 return smooth(x0,x0+fade,x)*(1-smooth(x1-fade,x1,x))*smooth(y0,y0+fade,y)*(1-smooth(y1-fade,y1,y));
}
function localPhase(t,period,offset){return ((t+offset)%period+period)%period;}
export function sample({room,clockMs,monitorAgeMs=-1,ambientOn=true,consoleOn=true,nearbyOn=true},point){
 if(!['server','medical'].includes(room)||!Number.isFinite(clockMs)||clockMs<0||!Number.isFinite(monitorAgeMs)||point.length!==2||!point.every(Number.isFinite))throw TypeError('Qualified current map/clock/point required');
 const [x,y]=point,offset=[0,0],radiance=[0,0,0];
 if(room==='server'&&ambientOn){
  const t=localPhase(clockMs,19000,1700),q=pulse(t,0,180,6100,7600)*(1-Math.exp(-t/330))*Math.exp(-Math.max(t-650,0)/1800)*Math.sin(2*Math.PI*t/4800);
  const chair=materialMask(point,[654,309,749,362],5),v=(y-309)/53;
  offset[0]+=2.6*q*Math.sin(Math.PI*v)*chair;offset[1]+=.48*q*Math.sin(Math.PI*(x-654)/95)*chair;
  // Existing openings only. Finite travelling optical shear in near-floor air,
  // not an invented panel sliding through wall/collision geometry.
  const a=localPhase(clockMs,13700,4100),env=pulse(a,300,650,3200,4100),front=936+45*(a-300)/3800;
  const south=materialMask(point,[580,936,766,981],6),band=Math.exp(-(((y-front)/11)**2));
  offset[0]+=1.65*env*band*Math.sin((x-580)*Math.PI/186)*south;
  const left=materialMask(point,[72,531,177,633],6),xfront=72+105*(a-300)/3800;
  offset[1]+=1.25*env*Math.exp(-(((x-xfront)/13)**2))*Math.sin(Math.PI*(y-531)/102)*left;
 }
 if(room==='server'&&consoleOn&&monitorAgeMs>=0&&monitorAgeMs<1800){
  const age=monitorAgeMs,env=pulse(age,90,210,1240,1630);
  const keyboard=materialMask(point,[656,242,743,278],3),v=(y-242)/36;
  const head=656+87*Math.max(0,Math.min(1,(age-160)/540));
  const k=env*keyboard*Math.exp(-(((x-head)/12)**2))*(.42+.58*Math.sin(Math.PI*v)**2);
  const track=materialMask(point,[747,243,773,278],4)*pulse(age,540,660,900,1180);
  const pad=materialMask(point,[782,239,820,277],3)*pulse(age,800,910,1200,1500)*(.30+.70*smooth(239,277,y));
  const receiver=nearbyOn?materialMask(point,[637,277,830,291],4)*env*.11:0;
  const power=k*.48+track*.16+pad*.26+receiver;
  radiance[0]+=.07*power;radiance[1]+=.38*power;radiance[2]+=.68*power;
 }
 if(room==='medical'&&ambientOn){
  const t=localPhase(clockMs,21100,6700),q=pulse(t,0,180,4400,6000)*Math.exp(-t/1300)*Math.sin(2*Math.PI*t/2200);
  const handle=materialMask(point,[1000,748,1020,832],3),v=(y-748)/84;
  offset[0]+=.90*q*Math.sin(Math.PI*v)**2*handle;
  offset[1]+=.25*q*Math.sin(2*Math.PI*v)*handle;
 }
 return {offset,radiance};
}
export function packUniform({viewportPx,imageRectPx,room,clockMs,monitorAgeMs=-1,ambientOn=true,consoleOn=true,nearbyOn=true}){
 const dims=room==='server'?[1340,1174]:room==='medical'?[1164,1351]:null;
 if(!dims||viewportPx.length!==2||imageRectPx.length!==4||![...viewportPx,...imageRectPx,clockMs,monitorAgeMs].every(Number.isFinite)||clockMs<0||viewportPx.some(x=>x<=0))throw TypeError('Exact map basis and finite current clock required');
 const scale=imageRectPx[2]/dims[0];if(scale<=0||Math.abs(imageRectPx[3]/dims[1]-scale)>1e-5)throw TypeError('Uniform original-image fit required');
 const u=new Float32Array(16);u.set([...viewportPx,...dims]);u.set([imageRectPx[0],imageRectPx[1],scale,room==='server'?0:1],4);
 u.set([clockMs,monitorAgeMs,Number(ambientOn),Number(consoleOn)],8);u.set([Number(nearbyOn),0,0,0],12);return u;
}
export const WGSL=/*wgsl*/`
struct MissingParams {view:vec4f,image:vec4f,clocks:vec4f,padding:vec4f};
@group(0) @binding(0) var<uniform> p:MissingParams;
@group(0) @binding(1) var baseScene:texture_2d<f32>;
@group(0) @binding(2) var sceneSampler:sampler;
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(q[i],0,1);
}
fn sm(a:f32,b:f32,x:f32)->f32{let q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
fn gate(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return sm(a,b,t)*(1.-sm(c,d,t));}
fn phase(t:f32,period:f32,offset:f32)->f32{return ((t+offset)%period+period)%period;}
fn mask(point:vec2f,r:vec4f,f:f32)->f32{return sm(r.x,r.x+f,point.x)*(1.-sm(r.z-f,r.z,point.x))*sm(r.y,r.y+f,point.y)*(1.-sm(r.w-f,r.w,point.y));}
@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f{
 let screen=pixel.xy;let point=(screen-p.image.xy)/p.image.z;
 var offset=vec2f(0.);var radiance=vec3f(0.);
 if(point.x<0.||point.y<0.||point.x>=p.view.z||point.y>=p.view.w){return textureSampleLevel(baseScene,sceneSampler,screen/p.view.xy,0.);}
 if(p.image.w<.5&&p.clocks.z>.5){
  let t=phase(p.clocks.x,19000.,1700.);let q=gate(t,0.,180.,6100.,7600.)*(1.-exp(-t/330.))*exp(-max(t-650.,0.)/1800.)*sin(6.283185307179586*t/4800.);
  let chair=mask(point,vec4f(654,309,749,362),5.);let v=(point.y-309.)/53.;
  offset+=vec2f(2.6*q*sin(3.141592653589793*v),.48*q*sin(3.141592653589793*(point.x-654.)/95.))*chair;
  let a=phase(p.clocks.x,13700.,4100.);let env=gate(a,300.,650.,3200.,4100.);let front=936.+45.*(a-300.)/3800.;
  let south=mask(point,vec4f(580,936,766,981),6.);let band=exp(-pow((point.y-front)/11.,2.));
  offset.x+=1.65*env*band*sin((point.x-580.)*3.141592653589793/186.)*south;
  let left=mask(point,vec4f(72,531,177,633),6.);let xf=72.+105.*(a-300.)/3800.;
  offset.y+=1.25*env*exp(-pow((point.x-xf)/13.,2.))*sin(3.141592653589793*(point.y-531.)/102.)*left;
 }
 if(p.image.w<.5&&p.clocks.w>.5&&p.clocks.y>=0.&&p.clocks.y<1800.){
  let age=p.clocks.y;let env=gate(age,90.,210.,1240.,1630.);let kb=mask(point,vec4f(656,242,743,278),3.);let v=(point.y-242.)/36.;
  let head=656.+87.*clamp((age-160.)/540.,0.,1.);let k=env*kb*exp(-pow((point.x-head)/12.,2.))*(.42+.58*pow(sin(3.141592653589793*v),2.));
  let track=mask(point,vec4f(747,243,773,278),4.)*gate(age,540.,660.,900.,1180.);
  let pad=mask(point,vec4f(782,239,820,277),3.)*gate(age,800.,910.,1200.,1500.)*(.30+.70*sm(239.,277.,point.y));
  let receiver=mask(point,vec4f(637,277,830,291),4.)*env*.11*select(0.,1.,p.padding.x>.5);
  radiance+=vec3f(.07,.38,.68)*(k*.48+track*.16+pad*.26+receiver);
 }
 if(p.image.w>.5&&p.clocks.z>.5){
  let t=phase(p.clocks.x,21100.,6700.);let q=gate(t,0.,180.,4400.,6000.)*exp(-t/1300.)*sin(6.283185307179586*t/2200.);
  let handle=mask(point,vec4f(1000,748,1020,832),3.);let v=(point.y-748.)/84.;
  offset+=vec2f(.90*q*pow(sin(3.141592653589793*v),2.),.25*q*sin(6.283185307179586*v))*handle;
 }
 // Offset is image pixels; texture is the previous rendered scene in backing pixels.
 let uv=(screen+offset*p.image.z)/p.view.xy;let source=textureSampleLevel(baseScene,sceneSampler,uv,0.);
 return vec4f(source.rgb+radiance,source.a);
}`;
