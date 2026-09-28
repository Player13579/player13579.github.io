import fs from 'node:fs/promises';import {synthesize,encodeWav} from '../src/sfx.js';import {VoiceEngine} from '../src/voice-engine.js';
const root=new URL('..',import.meta.url),sampleRate=48000,pcm=synthesize({sampleRate}),results=[];
for(const scenario of ['single','burst'])for(const rate of [1,2]){
  const offsets=scenario==='burst'?[0,160,320]:[0],endWallMs=(1500+offsets.at(-1))/rate,n=Math.ceil((endWallMs+220)*sampleRate/1000),left=new Float32Array(n),right=new Float32Array(n),engine=new VoiceEngine();
  // Deterministic sample-accurate offline schedule. Not an AudioContext or microphone recording.
  offsets.forEach((o,i)=>engine.start({id:`cause-${i}`,pcm,ageMs:0,rate,at:o/rate/1000}));
  engine.render(left,right,0,sampleRate,{watchdog:false});
  const rms=(a,b)=>{let sum=0;const start=Math.round(a*sampleRate/1000),stop=Math.min(n,Math.round(b*sampleRate/1000));for(let i=start;i<stop;i++)sum+=(left[i]**2+right[i]**2)/2;return Math.sqrt(sum/Math.max(1,stop-start));};
  const file=`audio/mana-r04-${scenario}-${rate}x.wav`;await fs.writeFile(new URL(file,root),encodeWav({left,right,sampleRate}));
  let peak=0;for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  results.push({file,scenario,rate,expectedStarts:offsets.length,starts:engine.stats.starts,peakVoices:engine.stats.peakVoices,actorOffsetsMs:offsets,wallOffsetsMs:offsets.map(o=>o/rate),endWallMs,peak,rmsMain:rms(250/rate,700/rate),rmsTail:rms((offsets.at(-1)+1430)/rate,endWallMs),rmsAfter:rms(endWallMs+5,endWallMs+200),listening:'not_run',AudioWorklet:'not_run'});
}
await fs.writeFile(new URL('qa/audio-metrics.json',root),JSON.stringify({release:'r0.4',scope:'Offline PCM numeric checks only, using the shipped synth and VoiceEngine',results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
