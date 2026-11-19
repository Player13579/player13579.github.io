// dot: deterministic contact stress and snow-ice crush, no prerecorded/transmitted audio.
// One kernel for Web Audio buffers and the private synchronization film. Durations are seconds.
export function eventSchedule(plan){
 const a=[{age:0,kind:'strike',strength:.81},{age:plan.release[0],kind:'crack',strength:.92},{age:plan.release[1],kind:'crack',strength:.51}];
 for(const c of plan.collisions){if(c.speed<.7)continue;const bite=plan.bites.find(b=>b.piece===c.piece&&Math.abs(b.age-c.age)<.0001);
   const e={age:c.age,kind:bite?'bite':'tick',strength:Math.min(bite?.72:.48,(.2+c.speed*.15))};
   const last=a.findLast(x=>(x.kind==='bite'||x.kind==='tick')&&Math.abs(x.age-e.age)<.054);
   if(!last)a.push(e);else if(e.strength>last.strength+.03){Object.assign(last,e);}
 }return a.sort((u,v)=>u.age-v.age);
}
export function icePCM(kind,strength,sr=48000){
 const pair=kind==='bite'?[.116,95]:kind==='crack'?[.11,61]:kind==='tick'?[.048,123]:[.091,54];
 const wave=new Float32Array(Math.ceil(pair[0]*sr));let seed=(15937+Math.round(75*strength))>>>0,slow=0,med=0,prev=0;
 const rough=kind==='bite',crack=kind==='crack',hit=kind==='strike';
 const hz=hit?[221,798,1441]:crack?[510,1443,2968]:rough?[246,678,1257]:[628,1760,2845];
 const flashes=rough?[[0,1],[.011,.55],[.022,.34],[.040,.16],[.056,.10]]:crack?[[0,1],[.008,.72],[.021,.32],[.032,.14]]:[[0,1]];
 for(let i=0;i<wave.length;i++){const t=i/sr;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed/2147483648-1;
  slow+=Math.min(1,2*Math.PI*(rough?830:1340)/sr)*(x-slow);med+=Math.min(1,2*Math.PI*(crack?4400:3200)/sr)*(x-med);
  let sum=0;
  for(const [delay,level] of flashes){const u=t-delay;if(u<0)continue;const a=Math.min(1,u/.00085);sum+=level*a*(
    ((med-slow)*(rough?.53:crack?.59:.35)+slow*(rough?.38:.18)+(x-prev)*(crack?.068:.023))*Math.exp(-u*(rough?130:hit?165:178))
    +.14*Math.sin(2*Math.PI*hz[0]*u)*Math.exp(-u*pair[1])+.07*Math.sin(2*Math.PI*hz[1]*u+.22)*Math.exp(-u*(pair[1]+36))
    +.038*Math.sin(2*Math.PI*hz[2]*u)*Math.exp(-u*(pair[1]+75)));
  }wave[i]=sum*strength*.69;prev=x;
 }return wave;
}
export function scheduleIceSound(ctx,at,{kind='strike',strength=1,connect=ctx.destination}={}){
 const v=icePCM(kind,strength,ctx.sampleRate),buffer=ctx.createBuffer(1,v.length,ctx.sampleRate);buffer.getChannelData(0).set(v);
 const src=ctx.createBufferSource();src.buffer=buffer;src.connect(connect);src.start(at);return [src];
}
export async function renderOfflineSchedule(events,sampleRate=48000){
 const mix=new Float32Array(2*sampleRate);
 for(const {kind,age,strength=1} of events){const p=icePCM(kind,strength,sampleRate),k=Math.max(0,Math.round(age*sampleRate));for(let j=0;j<p.length&&k+j<mix.length;j++)mix[k+j]+=p[j];}
 return mix;
}
