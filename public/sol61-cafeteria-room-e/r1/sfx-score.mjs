// 新規作曲。有限PCMのみ。AudioContext/自動音声解錠はruntime所有。
export const SAMPLE_RATE=48000;
export const SCORE=Object.freeze({vent:{duration:1.2,gain:.024,sourcePx:[619,38]},steam:{duration:2.4,gain:.020,sourcePx:[369,321]},purge:{duration:1.7,gain:.060,sourcePx:[920,333]}});
export const CUES=Object.freeze([{atMs:0,score:'vent',cause:'room-entry'},{atMs:500,score:'steam',cause:'hot-food'},{atMs:2800,score:'purge',cause:'purge-0'},{atMs:7200,score:'purge',cause:'purge-1'}]);
export function synthesize(kind){
 const s=SCORE[kind];if(!s)throw new Error('Unknown score');
 const pcm=new Float32Array(Math.round(s.duration*SAMPLE_RATE));let seed=0x52caf37,low=0,mid=0;
 for(let i=0;i<pcm.length;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;const t=i/SAMPLE_RATE;
  low+=.021*(noise-low);mid+=.19*(noise-mid);
  const attack=Math.min(1,t/.03),release=Math.min(1,(s.duration-t)/.09),edge=attack*release;
  let wave=0;
  if(kind==='vent')wave=(low*.85+.11*Math.sin(2*Math.PI*91*t)+.04*Math.sin(2*Math.PI*182*t))*Math.sin(Math.PI*t/s.duration)**.65;
  if(kind==='steam')wave=(mid-low)*.5*(.35+.65*Math.sin(Math.PI*t/s.duration));
  if(kind==='purge'){
   const valve=(mid-low)*Math.exp(-t*85)*.75;
   const fluid=(mid-low)*Math.min(1,t/.065)*Math.min(1,Math.max(0,1.4-t)/.12)*.55;
   const tray=Math.sin(2*Math.PI*613*t+1.4*Math.sin(2*Math.PI*67*t))*Math.exp(-Math.max(0,t-.08)*3.7)*Math.min(1,t/.08)*.12;
   const end=(mid-low)*Math.exp(-Math.max(0,t-1.4)*23)*Math.max(0,Math.min(1,(t-1.4)/.015))*.22;
   wave=valve+fluid+tray+end;
  }
  pcm[i]=wave*s.gain*edge;
 }
 pcm[0]=0;pcm[pcm.length-1]=0;return pcm;
}
export function wavBytes(pcm){
 const b=new ArrayBuffer(44+pcm.length*2),v=new DataView(b);const txt=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
 txt(0,'RIFF');v.setUint32(4,b.byteLength-8,true);txt(8,'WAVE');txt(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SAMPLE_RATE,true);v.setUint32(28,SAMPLE_RATE*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);txt(36,'data');v.setUint32(40,pcm.length*2,true);
 for(let i=0;i<pcm.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),true);return new Uint8Array(b);
}
