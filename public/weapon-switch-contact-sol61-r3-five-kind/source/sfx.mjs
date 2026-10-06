import {VERSION,TIMING,contactAt,KIND_MATERIALS,MODES,CONTACT_EVENTS} from './contact-model.mjs';
export {VERSION};
export function renderWeaponSwitchPcm({sampleRate=48000,variant=0,seed=0x61c043,friction=1,impact=1,sourceOn=true}={}) {
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sample rate');
  if(!Number.isInteger(variant)||variant<0||variant>4)throw new RangeError('weapon kind');
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||![friction,impact].every(x=>Number.isFinite(x)&&x>=0&&x<=2))throw new RangeError('excitation');
  const pcm=new Float32Array(Math.ceil(TIMING.soundEnd*sampleRate));
  if(!sourceOn)return {pcm,sampleRate,duration:TIMING.soundEnd,variant};
  const material=KIND_MATERIALS[variant]; let rng=(seed>>>0)||1;
  const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)/4294967296-.5;};
  const modes=MODES.filter(m=>m.hz*material.bodyScale<sampleRate*.42).map(m=>{
    const w=2*Math.PI*m.hz*material.bodyScale/sampleRate,r=Math.exp(-material.damping/(m.tau*sampleRate));
    return {a:2*r*Math.cos(w),b:-r*r,c:m.gain*Math.sin(w)*48000/sampleRate,y1:0,y2:0};
  });
  // A time-based roughness grid avoids sample-rate-dependent random grain counts.
  let nextGrain=TIMING.contact,grain=0,previousForce=0,low=0,dc=0;
  const lp=1-Math.exp(-2*Math.PI*3100/sampleRate),hp=1-Math.exp(-2*Math.PI*90/sampleRate);
  for(let i=1;i<pcm.length-1;i++){
    const t=i/sampleRate,c=contactAt(t);
    if(c.touching&&t>=nextGrain){grain=random();nextGrain+=.00075;}
    const slide=c.touching?grain*.11*Math.sqrt(c.slip)*c.loading*friction:0;
    let pulse=0;
    for(const event of CONTACT_EVENTS){const u=(t-event.at)/event.width;if(u>=0&&u<1)pulse+=event.force*Math.sin(Math.PI*u)**2;}
    const force=slide+pulse*impact;
    low+=lp*(force-low); const acceleration=force-previousForce;previousForce=force;
    let vibration=0;
    for(const m of modes){const y=m.a*m.y1+m.b*m.y2+m.c*low;m.y2=m.y1;m.y1=y;vibration+=y;}
    // Fixed radiation gain; no peak normalization, limiting or pitch sweep.
    const raw=.055*vibration+.06*acceleration;dc+=hp*(raw-dc);
    const tail=Math.max(0,Math.min(1,(TIMING.soundEnd-t)/.012));
    pcm[i]=(raw-dc)*tail;
  }
  return {pcm,sampleRate,duration:TIMING.soundEnd,variant};
}
const cache=new WeakMap();
export function playWeaponSwitchCue(context,destination,{verify=false,muted=false,age=0,variant=0}={}) {
  if(verify||muted||context?.state!=='running'||!Number.isFinite(age)||age<0||age+.004>=TIMING.soundEnd)return null;
  if(!destination||!Number.isInteger(variant)||variant<0||variant>4)return null;
  let buffers=cache.get(context);if(!buffers){buffers=new Map();cache.set(context,buffers);}
  let buffer=buffers.get(variant);
  if(!buffer){const sample=renderWeaponSwitchPcm({sampleRate:context.sampleRate,variant});buffer=context.createBuffer(1,sample.pcm.length,sample.sampleRate);buffer.getChannelData(0).set(sample.pcm);buffers.set(variant,buffer);}
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=.32;
  source.connect(gain);gain.connect(destination);
  const start=context.currentTime+.004,offset=age+.004;
  let cancelled=false,cleaned=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;source.disconnect();gain.disconnect();};source.onended=cleanup;
  try{source.start(start,offset);}catch(error){cleanup();throw error;}
  return {endTime:start+TIMING.soundEnd-offset,offsetSeconds:offset,variant,cancel(){
    if(cancelled||cleaned)return;cancelled=true;const now=context.currentTime;
    gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.linearRampToValueAtTime(0,now+.008);
    try{source.stop(now+.010);}catch{cleanup();}
  }};
}
