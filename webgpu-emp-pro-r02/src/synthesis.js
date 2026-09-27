/** r0.2 original deterministic SFX. PCM synthesis; no reused recordings. */
const TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
const sine=(f,t,p=0)=>Math.sin(TAU*f*t+p);
const chirp=(f0,f1,d,t)=>Math.sin(TAU*(f0*t+(f1-f0)*t*t/(2*d)));
const impulse=(t,at,decay)=>t<at?0:Math.exp(-(t-at)/decay);
export const SFX_SPEC=Object.freeze({
 charge:{bodySeconds:1.2,tailSeconds:.24,loop:[.80,1.20],description:'quantized pickup -> rising comb -> steady two-pole hold; brief folding coda on resolution'},
 normal:{bodySeconds:.52,tailSeconds:.16,loop:null,description:'dry source snap -> moving three-band sweep -> receiver clasp at .18 -> cut conduction'},
 resonance:{bodySeconds:1.6,tailSeconds:.23,loop:null,description:'bifurcated low attack -> interlocked six-tone rise -> fracture cascade -> low finite tail'},
 cancellation:{bodySeconds:1.6,tailSeconds:.23,loop:null,description:'opposed falling/rising chirps -> narrow convergent band -> sequential spectral deletion -> suction closure'},
 suppression:{bodySeconds:.80,tailSeconds:.28,loop:[.40,.80],description:'short latch -> quiet stable memory-cell hum -> split descending unlatch; extension adds no attack'}
});
function random(seed){let n=seed|0;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return((n>>>0)/4294967296)*2-1;};}
function bodySignal(kind,t,n){
 if(kind==='charge'){
  const rise=smooth(0,.85,t),attack=smooth(0,.02,t),click=(impulse(t,0,.012)+impulse(t,.18,.010)+impulse(t,.39,.008))*.085*n;
  const f=Math.min(t,.8),ph=TAU*(110*f+75*f*f/.8)+TAU*260*Math.max(0,t-.8);
  return attack*((.11+.09*rise)*Math.sin(ph)+.07*sine(520,t)+.055*sine(1040,t)) + click;
 }
 if(kind==='normal')return smooth(0,.002,t)*(1-smooth(.40,.52,t))*(.19*chirp(2100,320,.35,t)*Math.exp(-t*4)+.26*n*impulse(t,.004,.019)+.23*(sine(740,t)+.3*sine(1480,t))*impulse(t,.18,.065));
 if(kind==='resonance'){
  let x=.26*chirp(85,38,1.6,t)*Math.exp(-t*1.9)+.22*n*impulse(t,0,.04);
  for(let i=0;i<6;i++){const start=.16+i*.038;const age=t-start;if(age>=0)x+=(.095-i*.007)*sine(240+i*72,age)*Math.exp(-age*(1.3+i*.12));x+=n*.025*impulse(t,.83+i*.08,.027);}
  return x*smooth(0,.004,t)*(1-smooth(1.28,1.6,t));
 }
 if(kind==='cancellation'){
  const converge=smooth(.15,.65,t),b=(.12*chirp(1550,420,.75,t)+.12*chirp(200,720,.75,t))*(1-smooth(.65,.93,t));
  let zipped=0;for(let i=0;i<7;i++)zipped+=.055*n*impulse(t,.69+i*.072,.016);
  return (b+.07*sine(560,t)*converge*(1-smooth(.81,1.24,t))+zipped+.14*chirp(180,44,1.6,t)*Math.exp(-t*2))*smooth(0,.008,t)*(1-smooth(1.28,1.6,t));
 }
 return (.13*n*impulse(t,0,.016)+.14*sine(1300,t)*impulse(t,.028,.027)+(.024*sine(600,t)+.018*sine(750,t))*smooth(.04,.18,t))*smooth(0,.003,t);
}
export function synthesizeBank(kind,sampleRate=48000){const spec=SFX_SPEC[kind];if(!spec)throw new TypeError('Unknown SFX');if(!Number.isInteger(sampleRate)||sampleRate<8000)throw new RangeError('sample rate >= 8000');
 const rng=random(0x713a91+Object.keys(SFX_SPEC).indexOf(kind)*117),body=new Float32Array(Math.round(spec.bodySeconds*sampleRate)),tail=new Float32Array(Math.round(spec.tailSeconds*sampleRate));
 // Low-pass before rate-dependent interpolation; not an ideal bandlimited reconstruction claim.
 const a=1-Math.exp(-TAU*5500/sampleRate);let l1=0,l2=0;
 for(let i=0;i<body.length;i++){const x=bodySignal(kind,i/sampleRate,rng());l1+=a*(x-l1);l2+=a*(l1-l2);body[i]=l2;}
 const base={charge:650,normal:480,resonance:150,cancellation:340,suppression:1050}[kind];l1=l2=0;
 for(let i=0;i<tail.length;i++){const t=i/sampleRate,q=t/spec.tailSeconds;const x=(.13*chirp(base,base*.30,spec.tailSeconds,t)+.025*rng()*Math.exp(-q*15))*smooth(0,.004,t)*(1-smooth(.10,1,q));l1+=a*(x-l1);l2+=a*(l1-l2);tail[i]=l2;}
 // Exact finite endpoint. Fade only one-shot bodies; held loops do not vanish before authority.
 if(!spec.loop){const n=Math.min(200,body.length);for(let i=0;i<n;i++)body[body.length-n+i]*=(n-1-i)/n;}
 for(let i=0;i<100&&i<tail.length;i++)tail[tail.length-1-i]*=i/100;
 let peak=0;for(const buf of[body,tail])for(const x of buf)peak=Math.max(peak,Math.abs(x));const gain=peak>0?.65/peak:1;
 for(const buf of[body,tail])for(let i=0;i<buf.length;i++)buf[i]*=gain;
 return{kind,sampleRate,body,tail,loop:spec.loop?spec.loop.map(x=>x*sampleRate):null};
}
export function wavEncode(samples,sampleRate=48000){const bytes=new ArrayBuffer(44+samples.length*2),v=new DataView(bytes);const text=(off,s)=>{for(let i=0;i<s.length;i++)v.setUint8(off+i,s.charCodeAt(i));};text(0,'RIFF');v.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples.length*2,true);for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(clamp(samples[i],-1,1)*32767),true);return new Uint8Array(bytes);}
