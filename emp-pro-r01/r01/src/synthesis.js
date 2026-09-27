/** Original deterministic synthesis, no samples, no external assets. Actor seconds. */
export const SFX_SECONDS=Object.freeze({charge:1.2,normal:0.62,resonance:1.6,cancellation:1.6,suppression:0.28});
const TAU=Math.PI*2;
const sat=(x)=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const q=sat((x-a)/(b-a));return q*q*(3-2*q);};
export function synthesize(kind,sampleRate=48000) {
  if(!(kind in SFX_SECONDS))throw new TypeError('Unknown SFX kind');
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
  const out=new Float32Array(Math.ceil(SFX_SECONDS[kind]*sampleRate));
  let seed=0xC1EA7E,low=0,band=0,dc=0,prev=0,aa1=0,aa2=0;
  for(let i=0;i<out.length;i++){
    const t=i/sampleRate, end=SFX_SECONDS[kind];
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const n=(seed>>>0)/2147483648-1;
    low+=0.055*(n-low);band+=0.28*(n-band);
    const hp=n-band;
    let s=0;
    if(kind==='charge'){
      const q=t/1.2;
      const env=smooth(0,.045,t)*(0.14+0.42*q)*(1-smooth(1.155,1.2,t));
      const phase=TAU*(135*t+215*t*t+90*t*t*t);
      const teeth=0.70+0.30*Math.pow(.5+.5*Math.sin(TAU*(9*t+8*t*t)),6);
      s=env*(Math.sin(phase)*.5+Math.sin(phase*2.003)*.18+Math.sin(phase*3.001)*.09+hp*.11)*teeth;
      s+=.09*Math.sin(TAU*90*t)*Math.exp(-t*60);
    } else if(kind==='normal'){
      const strike=smooth(0,.0025,t)*Math.exp(-t*17);
      const electric=Math.sin(TAU*(740*t-320*t*t))*Math.exp(-t*7);
      const arrive=Math.max(0,t-.175);
      s=.46*strike*(hp*.55+Math.sin(TAU*(220*t-150*t*t))*.7)
       +.17*electric+.17*Math.sin(TAU*1480*arrive)*Math.exp(-arrive*38)*smooth(.172,.184,t);
      s+=.09*band*Math.exp(-t*5)*(1-smooth(.45,.62,t));
    } else if(kind==='resonance'){
      // Ingress, topology-breaking bass impact, inharmonic metallic bloom, long digital tail.
      const ingress=(1-smooth(.12,.21,t))*smooth(0,.016,t);
      s+=.18*(Math.sin(TAU*(230*t+850*t*t))+hp*.25)*ingress;
      const u=Math.max(0,t-.18), onset=smooth(.18,.186,t);
      s+=onset*(.50*Math.sin(TAU*(49*u+31*(1-Math.exp(-u*9))/9))*Math.exp(-u*4.4)
        +.30*hp*Math.exp(-u*18)+.18*band*Math.exp(-u*5.5));
      for(const [f,w] of [[327,.13],[521,.11],[877,.08],[1331,.045]])
        s+=onset*w*Math.sin(TAU*(f*u+8*(1-Math.exp(-u*5))))*Math.exp(-u*(3+f/800));
      const ch=smooth(.44,.46,t)*Math.exp(-Math.max(0,t-.44)*7);
      s+=ch*.10*Math.sin(TAU*2081*t);
    } else if(kind==='cancellation'){
      const e=smooth(0,.012,t)*(1-smooth(1.08,1.6,t));
      const q=sat(t/1.15), slip=TAU*(3*t+11*t*t);
      const pair=Math.sin(TAU*(460*t-150*t*t))+Math.sin(TAU*(467*t-150*t*t)+slip);
      s=e*(.16*pair*(1-q)+.18*band*(1-q));
      const pinch=Math.exp(-Math.pow((t-.57)/.075,2));
      s+=pinch*(.18*Math.sin(TAU*71*t)-hp*.16);
      const tail=Math.max(0,t-1.1);
      s+=smooth(1.1,1.106,t)*Math.exp(-tail*16)*.09*Math.sin(TAU*(210*tail-65*tail*tail));
    } else {
      s=smooth(0,.003,t)*Math.exp(-t*20)*(.14*Math.sin(TAU*1820*t)+.08*hp);
    }
    s*=1-smooth(end-.025,end,t);
    // 20 Hz DC blocker followed by bounded soft saturation. No clipping normalization boost.
    const h=s-prev+Math.exp(-TAU*20/sampleRate)*dc;prev=s;dc=h;
    const aa=1-Math.exp(-TAU*6500/sampleRate);
    aa1+=aa*(h-aa1);aa2+=aa*(aa1-aa2);
    out[i]=Math.tanh(aa2*1.25)*.76;
  }
  out[0]=0;out[out.length-1]=0;
  return out;
}
export function pcmWav(samples,sampleRate=48000) {
  const buffer=new ArrayBuffer(44+samples.length*2),v=new DataView(buffer);
  const text=(offset,s)=>{for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i));};
  text(0,'RIFF');v.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);
  v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
  return new Uint8Array(buffer);
}
