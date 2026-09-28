import {writeFile,mkdir} from 'node:fs/promises';
import {synthesizeManaSFX,encodeWavePCM16} from '../src/sfx-synth.mjs';
import {EFFECT_DURATION_SECONDS} from '../src/contract.mjs';
const root=new URL('../',import.meta.url);await mkdir(new URL('sfx/',root),{recursive:true});
const samples=synthesizeManaSFX(48000);await writeFile(new URL('sfx/mana-receive-original.wav',root),encodeWavePCM16(samples,48000));
let square=0,peak=0;for(const s of samples){square+=s*s;peak=Math.max(peak,Math.abs(s));}
const report={sampleRate:48000,channels:1,format:'PCM16',durationSeconds:EFFECT_DURATION_SECONDS,samples:samples.length,peak,rms:Math.sqrt(square/samples.length),first:samples[0],last:samples.at(-1),nonFinite:Array.from(samples).filter(v=>!Number.isFinite(v)).length,listeningReview:'not_run',note:'数値信号検査のみ。聴感や実デバイス再生の合格を示さない。'};
await writeFile(new URL('evidence/sfx-numeric.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
