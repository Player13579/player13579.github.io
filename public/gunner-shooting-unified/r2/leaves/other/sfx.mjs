import {VARIANTS} from './contract.mjs';
export function synthesizeShot(variant,sampleRate=48000,seed=1){
 const v=VARIANTS[variant];if(!v)throw Error('unsupported firearm SFX');
 const seconds=variant==='sniper'?.32:variant==='assault'?.23:.16;
 const data=new Float32Array(Math.ceil(seconds*sampleRate));let rng=(seed>>>0)||1,low=0;
 const mode=variant==='sniper'?82:variant==='assault'?130:175;
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;const noise=(rng>>>0)/2147483648-1;low+=.22*(noise-low);
  // Pressure discontinuity, turbulent report, fixed damped barrel/receiver modes. No melodic pitch sweep.
  const report=noise*Math.exp(-t/(variant==='sniper'?.036:.018))*.7+low*Math.exp(-t/.075)*.25;
  const body=Math.sin(2*Math.PI*mode*t)*Math.exp(-t/.04)*.28;
  const contact=t-v.ejectMs/1000;const mechanism=contact>=0?(noise*.17+Math.sin(2*Math.PI*1850*contact)*.09)*Math.exp(-contact/.009):0;
  const attack=Math.min(1,t/.0004);data[i]=Math.tanh((report+body+mechanism)*attack)*v.sfxGain;
 }
 return data;
}
export function createSfx({verify=false}={}){
 let context=null,gain=null,disposed=false,epoch=0;let watermark=-Infinity;const played=new Set(),nodes=new Set();const status={enabled:false,state:'locked',failures:[],count:0,verify};
 async function enable(){const ticket=++epoch;if(disposed||verify)return {...status};try{
  if(!context){context=new (globalThis.AudioContext||globalThis.webkitAudioContext)();gain=context.createGain();gain.gain.value=.6;gain.connect(context.destination);}
  await context.resume();if(disposed||ticket!==epoch)return {...status};status.state=context.state;status.enabled=context.state==='running';
 }catch(e){status.failures.push(String(e));status.enabled=false;status.state=context?.state??'unavailable';}return {...status};}
 function play(source){if(disposed||verify||!status.enabled||context?.state!=='running'||source.startedAt<watermark)return false;if(source.startedAt>watermark){played.clear();watermark=source.startedAt;}if(played.has(source.causeID))return false;
  const signal=synthesizeShot(source.variant,context.sampleRate,status.count+1);const buffer=context.createBuffer(1,signal.length,context.sampleRate);buffer.copyToChannel(signal,0);
  const node=context.createBufferSource();node.buffer=buffer;node.connect(gain);nodes.add(node);node.onended=()=>{nodes.delete(node);node.disconnect();};
  try{node.start();played.add(source.causeID);status.count++;return true;}catch(e){nodes.delete(node);node.disconnect();status.failures.push(String(e));return false;}
 }
 function suspend(){epoch++;status.enabled=false;for(const n of nodes){try{n.stop();}catch{}}nodes.clear();}
 async function dispose(){if(disposed)return;disposed=true;suspend();await context?.close();played.clear();status.state='closed';}
 return {enable,play,suspend,dispose,snapshot:()=>({...status,state:context?.state??status.state,nodes:nodes.size})};
}
