import {seeded,smooth} from './math.js';
export const decay=(t,start,tau)=>t<start?0:Math.exp(-(t-start)/tau);
export function bell(t,start,freq,tau=0.2){const q=t-start;return q<0?0:Math.sin(2*Math.PI*freq*q)*Math.exp(-q/tau)*smooth(0,.004,q);}
/** 決定的手続き合成。画像・既存E・既存音源を使用しない。 */
export function renderStereo(kind,rate=48000) {
 if(!Number.isInteger(rate)||rate<8000||rate>192000)throw new RangeError('sampleRate');
 const n=Math.round(rate*2.2),left=new Float32Array(n),right=new Float32Array(n),rand=seeded([27183,91421,65089][kind]);
 let low=0,slow=0,phase=0;
 for(let i=0;i<n;i++) {
  const t=i/rate,noise=rand()*2-1;low+=Math.min(.9,9500/rate)*(noise-low);slow+=Math.min(.9,900/rate)*(noise-slow);
  const paper=low-slow;let x=0,pan=0;
  if(kind===0){
   for(const [s,a] of [[.06,.19],[.23,.16],[.43,.12]])x+=paper*a*decay(t,s,.105)*smooth(s,s+.018,t);
   x+=bell(t,.11,182,.047)*.21+bell(t,.31,229,.045)*.12;
   x+=paper*.05*smooth(.64,.74,t)*(1-smooth(.91,1.05,t));
   x+=bell(t,1.04,523.25,.31)*.15+bell(t,1.09,784.88,.27)*.072+bell(t,1.14,1046.5,.19)*.035;
   pan=.13*Math.sin(2*Math.PI*t*.5);
  }else if(kind===1){
   x+=paper*.23*decay(t,.028,.010)+bell(t,.036,138,.028)*.10;
   const e=smooth(.12,.37,t)*(1-smooth(1.12,1.94,t));
   const f=310+20*smooth(.18,.72,t);phase+=2*Math.PI*f/rate;
   x+=e*(Math.sin(phase)*.135+Math.sin(phase*2)*.035+Math.sin(phase*3+.25)*.012);
   x+=(low*.015+Math.sin(2*Math.PI*92*t)*.023)*smooth(.12,.40,t)*(1-smooth(.85,1.45,t));
   x+=bell(t,.77,660,.30)*.046;pan=-.04;
  }else{
   for(const [s,f,a] of [[.075,910,.14],[.34,1180,.11],[.68,1510,.095]])x+=paper*.055*decay(t,s,.015)+bell(t,s,f,.043)*a+bell(t,s,151,.017)*.07;
   x+=bell(t,1.055,392,.26)*.17+bell(t,1.085,587.33,.23)*.105+bell(t,1.16,1174.66,.1)*.023;
   x+=slow*.018*smooth(.12,.17,t)*(1-smooth(.9,1.02,t));pan=.09*Math.sin(t*8);
  }
  const safety=smooth(0,.003,t)*(1-smooth(2.10,2.16,t));
  x=Math.tanh(x*1.15)*.76*safety;
  left[i]=safety===0?0:x*(1-pan)*.94;right[i]=safety===0?0:x*(1+pan)*.94;
 }
 return {left,right,sampleRate:rate,durationMs:2200};
}
