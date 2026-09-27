import {writeFile,mkdir}from'node:fs/promises';import{renderReference}from'../src/synthesis.js';import{createHash}from'node:crypto';
const root=new URL('../',import.meta.url);await mkdir(new URL('assets/audio/',root),{recursive:true});
const cases=[
 {name:'gain-1500-actor1',durationMs:1500,actorRate:1}, {name:'gain-1500-actor2',durationMs:1500,actorRate:2},
 {name:'gain-900-actor1',durationMs:900,actorRate:1}, {name:'gain-900-actor2',durationMs:900,actorRate:2},
 {name:'two-gains-delta180',durationMs:1500,actorRate:1,gains:[{actorOffsetMs:0},{actorOffsetMs:180}]},
 {name:'cancel-at650',durationMs:1500,actorRate:1,cancelAtActorMs:650}
];
const results=[];
for(const spec of cases){
 const a=renderReference(spec),frames=a.left.length,dataSize=frames*4;const wav=Buffer.alloc(44+dataSize);
 wav.write('RIFF',0);wav.writeUInt32LE(36+dataSize,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(a.sampleRate,24);wav.writeUInt32LE(a.sampleRate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(dataSize,40);
 let peak=0,sum=0,square=0,maxStep=0;
 for(let i=0;i<frames;i++){for(let ch=0;ch<2;ch++){const value=(ch?a.right:a.left)[i];wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+i*4+ch*2);}const v=a.left[i];peak=Math.max(peak,Math.abs(v));sum+=v;square+=v*v;if(i)maxStep=Math.max(maxStep,Math.abs(v-a.left[i-1]));}
 const filename=`assets/audio/${spec.name}.wav`;await writeFile(new URL(filename,root),wav);
 const tail=a.left.slice(-480);const tailRMS=Math.sqrt(tail.reduce((s,x)=>s+x*x,0)/tail.length);
 results.push({...spec,filename,sampleRate:a.sampleRate,channels:2,pcmBits:16,frames,seconds:frames/a.sampleRate,voiceCount:a.voiceCount,peak,peakDbFS:20*Math.log10(peak),dc:sum/frames,rms:Math.sqrt(square/frames),maxAdjacentSampleDelta:maxStep,tail10msRMS:tailRMS,sha256:createHash('sha256').update(wav).digest('hex'),assessment:'numeric waveform checks only; listening not_run'});
}
await writeFile(new URL('verification/audio-analysis.json',root),JSON.stringify({revision:'0.3.0',kernel:'src/synthesis.js',actualListening:'not_run',results},null,2)+'\n');
console.log(JSON.stringify(results.map(({name,peakDbFS,tail10msRMS,voiceCount})=>({name,peakDbFS,tail10msRMS,voiceCount})),null,2));
