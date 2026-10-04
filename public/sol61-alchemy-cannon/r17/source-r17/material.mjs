// GPT-6.1-Sol R17 UNSEALED. Source-born cohesive charge packets; no continuous band material.
export const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function packet(index,age){
 const elapsed=age-index*50,gain=smooth(elapsed/90);
 return {index,birthMs:index*50,elapsed,nose:elapsed/210,gate:smooth(elapsed/12),gain,
  cy:(-2+index*.6)*smooth(elapsed/70),ry:9+7*gain,rx:.09+.025*gain};
}
export function section(u,age,{reducedMotion=false}={}){
 const t=reducedMotion?210:Math.max(0,age);
 return {front:Math.min(1,t/210),packets:Array.from({length:7},(_,i)=>packet(i,t))};
}
const cloud=(a,b,c)=>smooth(1-a*a-b*b-c*c);
export function opticalSample(u,y,z,age,options={}){
 if(u<=0||u>=1)return {extinction:0,emission:[0,0,0],body:0,head:0};
 let body=0,head=0;
 for(const p of section(u,age,options).packets){
  if(p.gate<=0||u>p.nose||u<p.nose-.23)continue;
  const gate=p.gate*smooth(u/.008)*smooth((1-u)/.012)*smooth((p.nose-u)/.012);
  body+=gate*cloud((u-(p.nose-.095))/p.rx,(y-p.cy-2*p.gain)/p.ry,(z-4)/11);
  head+=gate*cloud((u-(p.nose-.025))/.028,(y-p.cy+3*p.gain)/(4+1.5*p.gain),(z+3)/5);
 }
 return {extinction:.22*body+.40*head,
  emission:[.045*body+35.308*head,.24*body+21.372*head,.50*body+6.656*head],body,head};
}
export function sampleTransportMaterial(u,y,age,{reducedMotion=false,power=1,steps=24}={}){
 let trans=1,rgb=[0,0,0];const ds=48/steps*.24;
 for(let i=0;i<steps;i++){
  const p=opticalSample(u,y,-24+(i+.5)*48/steps,age,{reducedMotion});
  const opacity=1-Math.exp(-p.extinction*ds),path=p.extinction>1e-6?opacity/p.extinction:ds;
  rgb=rgb.map((v,j)=>v+trans*path*p.emission[j]);trans*=1-opacity;
 }
 return {rgb:rgb.map(v=>v*power),alpha:(1-trans)*power};
}
export const MATERIAL_WGSL=/*wgsl*/`
fn smooth01(v:f32)->f32 {let q=clamp(v,0.0,1.0);return q*q*(3.0-2.0*q);}
struct ChargePacket { nose:f32,gate:f32,gain:f32,cy:f32,ry:f32,rx:f32, }
fn chargePacket(index:u32,t:f32)->ChargePacket {
 let elapsed=t-f32(index)*50.0;let gain=smooth01(elapsed/90.0);
 return ChargePacket(elapsed/210.0,smooth01(elapsed/12.0),gain,
  (-2.0+f32(index)*0.6)*smooth01(elapsed/70.0),9.0+7.0*gain,0.09+0.025*gain);
}
fn chargeCloud(q:vec3f)->f32 {return smooth01(1.0-dot(q,q));}
fn packetSample(u:f32,y:f32,z:f32,t:f32)->vec4f {
 var body=0.0;var head=0.0;
 for(var i=0u;i<7u;i=i+1u){
  let p=chargePacket(i,t);
  if(p.gate<=0.0||u>p.nose||u<p.nose-0.23){continue;}
  let gate=p.gate*smooth01(u/0.008)*smooth01((1.0-u)/0.012)*smooth01((p.nose-u)/0.012);
  body=body+gate*chargeCloud(vec3f((u-(p.nose-0.095))/p.rx,(y-p.cy-2.0*p.gain)/p.ry,(z-4.0)/11.0));
  head=head+gate*chargeCloud(vec3f((u-(p.nose-0.025))/0.028,(y-p.cy+3.0*p.gain)/(4.0+1.5*p.gain),(z+3.0)/5.0));
 }
 let sigma=0.22*body+0.40*head;
 let j=vec3f(0.045,0.24,0.50)*body+vec3f(35.308,21.372,6.656)*head;
 return vec4f(j,sigma);
}
fn chargeRadiance(u:f32,y:f32,t:f32)->vec4f {
 var trans=1.0;var rgb=vec3f(0.0);
 for(var i=0u;i<24u;i=i+1u){
  let p=packetSample(u,y,-24.0+(f32(i)+0.5)*2.0,t);
  let opacity=1.0-exp(-p.a*0.48);
  var path=0.48;if(p.a>0.000001){path=opacity/p.a;}
  rgb=rgb+trans*path*p.rgb;trans=trans*(1.0-opacity);
 }
 return vec4f(rgb,1.0-trans);
}
fn packetSpread(u:f32,y:f32,t:f32)->vec4f {
 var a=0.0;var rgb=vec3f(0.0);
 for(var i=0u;i<7u;i=i+1u){
  let p=chargePacket(i,t);
  if(p.gate<=0.0||u>p.nose||u<p.nose-0.23){continue;}
  let gate=p.gate*smooth01(u/0.008)*smooth01((1.0-u)/0.012)*smooth01((p.nose-u)/0.012);
  let bq=vec2f((u-(p.nose-0.095))/(p.rx+0.008),(y-p.cy-2.0*p.gain)/(p.ry+4.0));
  let hq=vec2f((u-(p.nose-0.025))/0.036,(y-p.cy+3.0*p.gain)/(8.0+1.5*p.gain));
  let body=smooth01(1.0-dot(bq,bq))*gate*0.020;
  let head=smooth01(1.0-dot(hq,hq))*gate*0.060;
  a=a+body+head;rgb=rgb+vec3f(0.10,0.65,1.30)*body+vec3f(1.50,1.15,0.70)*head;
 }
 return vec4f(rgb,a);
}
@fragment fn fs(o:Output)->@location(0) vec4f {
 if(o.emission>=0.0){return vec4f(o.color.rgb*(1.0+o.emission)*o.color.a,o.color.a);}
 let u=o.color.x;let y=o.color.y;
 let age=select(o.color.z,-1.0-o.color.z,o.color.z<0.0);
 let t=select(max(0.0,age),210.0,o.color.z<0.0);let power=o.color.w;
 if(u<=0.0||u>=1.0||power<=0.0){return vec4f(0.0);}
 if(o.emission > -1.5){return packetSpread(u,y,t)*power;}
 return chargeRadiance(u,y,t)*power;
}
`;
