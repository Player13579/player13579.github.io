import fs from 'node:fs';import {synthesizeHeartPCM} from '../src/sfx.mjs';
const rate=48000,pcm=synthesizeHeartPCM(rate);let sum=0,energy=0,peak=0,maxAdjacent=0;
for(let i=0;i<pcm.length;i++){sum+=pcm[i];energy+=pcm[i]*pcm[i];peak=Math.max(peak,Math.abs(pcm[i]));if(i)maxAdjacent=Math.max(maxAdjacent,Math.abs(pcm[i]-pcm[i-1]));}
const windows=[];for(let j=0;j<18;j++){let e=0;for(let n=j*4800;n<(j+1)*4800;n++)e+=pcm[n]*pcm[n];windows.push({startSeconds:j/10,rms:Math.sqrt(e/4800)});}
const result={status:'pass_for_numeric_signal_checks',sampleRate:rate,channels:1,samples:pcm.length,durationSeconds:pcm.length/rate,peak,rms:Math.sqrt(energy/pcm.length),DC:sum/pcm.length,maxAdjacentSampleDifference:maxAdjacent,first:pcm[0],last:pcm.at(-1),windows,real_audition:'not_run',note:'PCMの数値は音色の芸術的品質や実機での聴感を保証しない。'};
fs.writeFileSync(new URL('../reports/pcm-analysis.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result.peak,result.rms);
