import {materialDescriptor} from './material.mjs';
export const VERSION='donation-zero-sol61-r11-visible-small-glints';
export const CREATIVE_EDITION=11;
export const CREATIVE_EDITION_LIMIT=11;
export const EXTRA_CORRECTION_EDITION=5;
export const EXTRA_CORRECTION_LIMIT=5;
export const DURATION_MS=2400;
export const COIN_COUNT=5;
export const COIN_RELEASE_MS=Object.freeze([280,390,500,610,720]);
export const FLIGHT_MS=980;
export const RAY_ANGLE_RAD=Math.PI/8;
export {RAY_EXTENT} from './glints.mjs';
import {RAY_EXTENT} from './glints.mjs';
export const REQUIRED_EXPANSION='22.5°斜線と112.5°斜線の交差光条多数でキラキラ演出';
const finite=(v,label)=>{if(!Number.isFinite(v))throw new TypeError(`${label}: finite number required`);return v;};
const point=(p,label)=>Object.freeze({x:finite(p?.x,`${label}.x`),y:finite(p?.y,`${label}.y`)});
export function smooth01(x){const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);}
export function validateReceipt(receipt){
 if(receipt?.kind!=='donation-settled'||receipt.success!==true||typeof receipt.id!=='string'||!receipt.id||typeof receipt.recipientId!=='string'||!receipt.recipientId)throw new TypeError('unique settled donation receipt and intake identity required');
 const amount=finite(receipt.amount,'receipt amount');if(amount<=0)throw new TypeError('positive settled receipt amount required');
 const source=point(receipt.source,'source'),recipient=point(receipt.recipient,'recipient');
 if(Math.hypot(source.x-recipient.x,source.y-recipient.y)<=1e-6)throw new TypeError('separated source/intake anchors required');
 return Object.freeze({kind:'donation-settled',success:true,id:receipt.id,recipientId:receipt.recipientId,amount,
  source,recipient,settledAt:finite(receipt.settledAt,'settledAt'),
  synthetic:receipt.synthetic===true});
}
export class ReceiptGate {
 constructor(generation=1){if(!Number.isSafeInteger(generation)||generation<1)throw new TypeError('positive generation required');this.generation=generation;this.ids=new Set();this.disposed=false;}
 receive(value,{generation=this.generation}={}){
  if(this.disposed)return Object.freeze({accepted:false,reason:'disposed'});
  if(generation!==this.generation)return Object.freeze({accepted:false,reason:'stale-generation'});
  let receipt;try{receipt=validateReceipt(value);}catch{return Object.freeze({accepted:false,reason:'invalid-receipt'});}
  if(this.ids.has(receipt.id))return Object.freeze({accepted:false,reason:'duplicate'});
  if(this.ids.size>=4096)return Object.freeze({accepted:false,reason:'generation-capacity'});
  this.ids.add(receipt.id);return Object.freeze({accepted:true,receipt,generation:this.generation});
 }
 reset(generation){if(this.disposed)throw new Error('disposed gate');if(!Number.isSafeInteger(generation)||generation<=this.generation)throw new TypeError('newer generation required');this.ids.clear();this.generation=generation;}
 dispose(){this.disposed=true;this.ids.clear();}
}
export function phase(ageMs){
 finite(ageMs,'integrated E age');const active=ageMs>=0&&ageMs<DURATION_MS;
 const cardGain=active?smooth01(ageMs/140)*(1-smooth01((ageMs-2050)/350)):0;
 const stage=!active?'off':ageMs<280?'settled-card':ageMs<1700?'payment-transfer':ageMs<2050?'intake-settle':'end';
 return Object.freeze({active,stage,ageMs,cardGain});
}
export function sampleDonation(input){
 const receipt=validateReceipt(input?.receipt),clock=phase(input.ageMs);
 const active=clock.active&&input.cancelled!==true&&input.alive!==false&&input.ejected!==true&&input.inVent!==true&&input.sceneOn!==false;
 const departure={x:receipt.source.x+28,y:receipt.source.y};
 const delta={x:receipt.recipient.x-departure.x,y:receipt.recipient.y-departure.y};const distance=Math.hypot(delta.x,delta.y);
 const normal=distance>1e-6?{x:-delta.y/distance,y:delta.x/distance}:{x:0,y:-1};
 // Semantic payment visualization, not ballistic metal from a real card.
 // Every trajectory begins at the registered card edge and ends at intake.
 const coins=COIN_RELEASE_MS.map((release,index)=>{
  const local=input.ageMs-release,q=Math.min(1,Math.max(0,local/FLIGHT_MS)),travel=smooth01(q);
  const bow=(index-2)*4.8*Math.sin(Math.PI*q);
  const alpha=active&&local>=0?smooth01(local/90)*(1-smooth01((local-FLIGHT_MS)/240)):0;
  const rotation=input.reducedMotion?0.38+index*.17:0.28+index*.39+q*Math.PI*1.35;
  return Object.freeze({index,release,localAgeMs:local,travel,alpha,rotation,
   x:departure.x+delta.x*travel+normal.x*bow,y:departure.y+delta.y*travel+normal.y*bow,
   arrived:local>=FLIGHT_MS});
 });
 const resultFill=active?coins.reduce((sum,c)=>sum+smooth01((c.localAgeMs-FLIGHT_MS)/110),0)/COIN_COUNT:0;
 return Object.freeze({version:VERSION,receipt,active,stage:active?clock.stage:'off',ageMs:input.ageMs,resultFill,resultGain:active?clock.cardGain:0,
  cardGain:active?clock.cardGain:0,departure:Object.freeze(departure),coins:Object.freeze(coins),
  sourceOn:input.sourceOn!==false,reducedMotion:Boolean(input.reducedMotion)});
}
export function packUniforms(input,view={},controls={}){
 const s=sampleDonation(input),width=finite(view.width??384,'width'),height=finite(view.height??256,'height'),scale=finite(view.scale??1,'scale');
 if(width<=0||height<=0||scale<=0)throw new TypeError('positive view extent/scale required');
 const camera=point(view.camera??{x:0,y:0},'camera'),origin=point(view.origin??{x:0,y:0},'origin');
 const project=p=>({x:origin.x+(p.x-camera.x)*scale,y:origin.y+(p.y-camera.y)*scale});
 const src=project(s.receipt.source),dst=project(s.receipt.recipient);const u=new Float32Array(52),material=materialDescriptor(controls.material);
 // R5 private ABI: unused R4 state.z/w become camera yaw/pitch. CPU reduced
 // motion still drives coin rotations. Unused backdrop.w becomes roughness.
 u.set([width,height,scale,s.ageMs,s.active?1:0,s.cardGain,material.viewYaw,material.viewPitch,src.x,src.y,28,17.6,dst.x,dst.y,s.resultFill,s.resultGain]);
 s.coins.forEach((coin,i)=>{const p=project(coin);u.set([p.x,p.y,coin.rotation,coin.alpha],16+i*4);});
 u.set([.75,RAY_EXTENT,controls.raysOn===false?0:.28,RAY_ANGLE_RAD,
  s.sourceOn?1:0,controls.cardOn===false?0:1,controls.nearOn===false?0:1,s.active?1:0,
  ...material.light,material.lightIntensity,.008,.012,.018,material.roughness],36);
 if(!u.every(Number.isFinite))throw new RangeError('projection cannot be represented by finite f32 uniforms');
 return u;
}
export function makeFixture(ageMs=1100,options={}){
 return {receipt:{kind:'donation-settled',success:true,id:options.id??'synthetic-donation-zero-r11-visible-small-glints',amount:1,
  recipientId:'synthetic-app-donation-intake',source:{x:106,y:150},recipient:{x:292,y:114},settledAt:10000,synthetic:true},
  ageMs,reducedMotion:options.reducedMotion===true,sourceOn:options.sourceOn!==false,sceneOn:true};
}
