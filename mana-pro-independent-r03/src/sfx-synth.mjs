import {DURATION} from './contract.mjs';
import {TIME} from './shape-data.mjs';
import {smooth,stateAt} from './field.mjs';
/** この版のために書いた合成式。外部サンプル/旧版音色/乱数/ループを使用しない。 */
export function synthesize(sampleRate=48000){
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate must be 8000..192000');
  const n=Math.round(DURATION*sampleRate),pcm=new Float32Array(n),tau=2*Math.PI;
  const arrival=TIME.emitStart+TIME.transitDelay,full=TIME.emitEnd+TIME.transitDelay;
  for(let i=0;i<n;i++){
    const t=i/sampleRate,p=t/DURATION,s=stateAt(p);
    const end=(1-smooth(.90,1,p));const onset=smooth(0,.008,p);
    // 足元の低い芯→輸送中の上向き共鳴→受領面の厚い和音。全て同じ一回のbuffer内。
    const base=(Math.sin(tau*218*t)+.22*Math.sin(tau*436*t+.1)+.10*Math.sin(tau*653.4*t))*(.10+.30*s.source)*(1-smooth(.61,.83,p));
    const sweepPhase=tau*(315*t+185*t*t/DURATION);
    const transfer=(Math.sin(sweepPhase)+.21*Math.sin(sweepPhase*1.501))*(.12+.23*s.transit)*smooth(.015,.08,p)*(1-smooth(.70,.84,p));
    const ac=(p-arrival)*DURATION;const catchEnv=ac>0?Math.exp(-ac*13)*smooth(0,.015,ac):0;
    const arrivalSound=(Math.sin(tau*1048*ac)+.34*Math.sin(tau*1574*ac))*catchEnv*.15;
    const receiveEnv=smooth(arrival,arrival+.08,p)*(.10+.30*s.received);
    const stored=(Math.sin(tau*698.46*t)+.46*Math.sin(tau*1046.5*t+.2)+.18*Math.sin(tau*1396.92*t))*receiveEnv;
    const ft=(p-full)*DURATION;const cap=ft>0?Math.exp(-ft*20)*smooth(0,.009,ft):0;
    const fullTone=(Math.sin(tau*1396.92*ft)+.2*Math.sin(tau*2095.38*ft))*cap*.075;
    pcm[i]=(base+transfer+arrivalSound+stored+fullTone)*onset*end*.51;
  }
  // 一度だけの全バッファ正規化。振幅比・位相時刻は変えない。頭尾はゼロ。
  let peak=0;for(const x of pcm)peak=Math.max(peak,Math.abs(x));const gain=peak>.72?.72/peak:1;
  for(let i=0;i<n;i++)pcm[i]*=gain;pcm[0]=0;pcm[n-1]=0;return pcm;
}
