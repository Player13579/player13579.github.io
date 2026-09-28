import {writeFile} from 'node:fs/promises';
import {synthesize} from '../src/sfx-synth.mjs';
import {DURATION} from '../src/contract.mjs';
const rate=48000,pcm=synthesize(rate),data=Buffer.alloc(44+pcm.length*2);
data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(pcm.length*2,40);
let peak=0,sum=0,sq=0;for(let i=0;i<pcm.length;i++){const x=pcm[i];data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32767),44+i*2);peak=Math.max(peak,Math.abs(x));sum+=x;sq+=x*x;}
await writeFile(new URL('../sfx/mana-r03-original.wav',import.meta.url),data);
await writeFile(new URL('../evidence/sfx-numeric.json',import.meta.url),JSON.stringify({status:'pass',basis:'original synthesis numerical inspection only',sampleRate:rate,channels:1,bits:16,duration:DURATION,samples:pcm.length,peak,mean:sum/pcm.length,rms:Math.sqrt(sq/pcm.length),head:pcm[0],tail:pcm.at(-1),listening:'not_run',avSynchronization:'not_run'},null,2));
console.log(`original SFX: ${pcm.length} samples; listening not_run`);
