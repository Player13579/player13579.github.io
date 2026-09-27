import {distanceGain,clamp,VISUAL} from './contract.js';
export function interpolate(a,pos){if(pos<0||pos>=a.length)return 0;const i=Math.floor(pos),f=pos-i;return a[i]*(1-f)+(a[Math.min(i+1,a.length-1)]??0)*f;}
function bodyAt(bank,age){let p=age*bank.sampleRate;if(bank.loop&&p>=bank.loop[1])p=bank.loop[0]+(p-bank.loop[0])%(bank.loop[1]-bank.loop[0]);if(bank.loop&&p>bank.loop[1]-bank.sampleRate*.012){const n=bank.sampleRate*.012,q=(p-(bank.loop[1]-n))/n;return interpolate(bank.body,p)*(1-q)+interpolate(bank.body,bank.loop[0]+p-(bank.loop[1]-n))*q;}return interpolate(bank.body,p);}
export function voiceTiming(v,actorMs,bank){let deadline=v.deadlineMs;for(const u of v.updates??[])if(u.atMs<=actorMs)deadline=u.deadlineMs;const r=v.resolveMs!=null&&v.resolveMs<=actorMs?v.resolveMs:null;const end=r==null?deadline:deadline==null?r:Math.min(deadline,r);const natural=bank.loop?Infinity:v.atMs+bank.body.length/bank.sampleRate*1000;const release=end!=null&&end<natural?end:null;const done=release!=null?Math.min(natural,release+VISUAL.releaseMs[v.kind]):natural;return{release,done};}
export function voiceSample(v,actorMs,bank){const age=(actorMs-v.atMs)/1000;if(age<0)return 0;const {release,done}=voiceTiming(v,actorMs,bank);if(actorMs>=done)return 0;if(release!==null&&actorMs>=release){const dt=(actorMs-release)/1000,q=clamp(dt/.018);return bodyAt(bank,age)*(1-q)+interpolate(bank.tail,dt*bank.sampleRate)*q;}return bodyAt(bank,age);}
/** One retained voice per causal event; resolution edits that voice, never starts a second one. */
export class VoiceEngine{
 constructor(){this.banks=new Map();this.voices=new Map();this.seen=new Set();this.listener={x:0,y:0};this.volume=.6;this.stats={created:0,started:0,duplicates:0,resolutions:0,extensions:0,finished:0,capacityDropped:0};this.started=new Set();this.gate=1;}
 add(v){if(this.seen.has(v.key)){this.stats.duplicates++;return false;}this.seen.add(v.key);if(this.voices.size>=64){this.stats.capacityDropped++;return false;}this.voices.set(v.id,{...v,updates:[]});this.stats.created++;return true;}
 resolve(id,ms){const v=this.voices.get(id);if(!v||v.resolveMs!=null)return false;v.resolveMs=ms;this.stats.resolutions++;return true;}
 extend(id,atMs,deadlineMs){const v=this.voices.get(id);if(!v)return false;v.updates.push({atMs,deadlineMs});this.stats.extensions++;return true;}
 clear(){this.voices.clear();this.seen.clear();this.started.clear();this.stats={created:0,started:0,duplicates:0,resolutions:0,extensions:0,finished:0,capacityDropped:0};}
 process(left,right,actorMs,rate,sampleRate,stale=false){
  const mix=[];for(const[id,v]of this.voices){const bank=this.banks.get(v.kind);if(!bank)continue;if(actorMs>=voiceTiming(v,actorMs,bank).done){this.voices.delete(id);this.stats.finished++;continue;}if(rate>0&&!stale&&actorMs>=v.atMs&&!this.started.has(id)){this.started.add(id);this.stats.started++;}
   const dx=v.origin.x-this.listener.x,dy=v.origin.y-this.listener.y,gain=distanceGain(Math.hypot(dx,dy),v.range),pan=clamp(dx/600,-1,1);mix.push({v,bank,l:gain*Math.cos((pan+1)*Math.PI/4),r:gain*Math.sin((pan+1)*Math.PI/4)});
  }
  for(let i=0;i<left.length;i++){let l=0,r=0;const ms=actorMs+i/sampleRate*rate*1000;for(const a of mix){const s=voiceSample(a.v,ms,a.bank);l+=s*a.l;r+=s*a.r;}this.gate+=((rate===0||stale?0:1)-this.gate)*.015;left[i]=Math.tanh(l*this.volume)*.88*this.gate;right[i]=Math.tanh(r*this.volume)*.88*this.gate;}
 }
}
