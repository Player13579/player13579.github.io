// Original Astra creation. Coordinates: recipient ground origin; +x right, +y up; H = alpha-visible body height.
export const VERSION = 'astra-cooldown-benefit-r0.5';
export const LIFE_MS = 1480;
export class CooldownEvents {
  constructor({sound=()=>{}}={}){this.seen=new Set();this.active=[];this.sound=sound;}
  receive(e,now){
    if(!e||e.type!=='gain-cooldownReduction'||!e.id||!e.playerId||![e.x,e.y,e.at,now].every(Number.isFinite))return false;
    if(this.seen.has(e.id)||now<e.at||now-e.at>=LIFE_MS)return false;
    if(e.benefitOutcomeV1){const o=e.benefitOutcomeV1;if(o.recipientId!==e.playerId||o.result!=='changed'||!(o.actualDelta>0))return false;}
    this.seen.add(e.id);this.active.push({...e});
    // Old receipts may be replayed visually in-phase, but never sound as new transactions.
    if(now-e.at<180)this.sound(e.id);return true;
  }
  sample(now,resolve){this.active=this.active.filter(e=>now>=e.at&&now-e.at<LIFE_MS);return this.active.map(e=>{
    const p=resolve?.(e.playerId); return {...e,x:p&&Number.isFinite(p.x)?p.x:e.x,y:p&&Number.isFinite(p.y)?p.y:e.y,phase:(now-e.at)/LIFE_MS};
  });}
  resetSession(){this.seen.clear();this.active=[];}
}
// Three original timbres: inward glass coil, short warm release, clean high resonance.
// Deterministic PCM avoids oscillator scheduling differences and is reproducible offline.
export function synthesizeSfx(sampleRate=48000){
  const duration=1.22,data=new Float32Array(Math.round(sampleRate*duration));
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate;let a=0;
    if(t<.75){const env=Math.sin(Math.PI*t/.75)**1.35;const phase=2*Math.PI*(540*t-185*t*t);a+=.14*env*(Math.sin(phase)+.18*Math.sin(phase*2.003));}
    if(t>=.71){const u=t-.71,env=(1-Math.exp(-u*150))*Math.exp(-u*9);a+=.24*env*(Math.sin(2*Math.PI*864*u)+.30*Math.sin(2*Math.PI*1296*u)+.14*Math.sin(2*Math.PI*1728*u));}
    if(t>=.73){const u=t-.73;a+=.1*Math.exp(-u*27)*Math.sin(2*Math.PI*(180*u-95*u*u));}
    data[i]=a*Math.min(1,(duration-t)/.035);
  }return data;
}
export class CooldownSound {
  constructor({verify=false}={}){this.verify=verify;this.seen=new Set();this.triggers=0;this.played=0;this.enabled=false;}
  async enable(){if(this.verify)return false;this.context??=new AudioContext();await this.context.resume();this.enabled=true;return true;}
  trigger(id){if(this.seen.has(id))return false;this.seen.add(id);this.triggers++;if(this.verify||!this.enabled)return false;
    const c=this.context,a=synthesizeSfx(c.sampleRate),b=c.createBuffer(1,a.length,c.sampleRate);b.copyToChannel(a,0);const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.value=.7;s.connect(g).connect(c.destination);s.start();s.onended=()=>{s.disconnect();g.disconnect()};this.played++;return true;
  }
  async dispose(){await this.context?.close();}
}
export {shader} from './shader-r05.mjs';
