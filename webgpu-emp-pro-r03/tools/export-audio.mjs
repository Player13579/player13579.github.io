import fs from 'node:fs';
import {synthesizeBank,wavEncode,SFX_SPEC} from '../src/synthesis.js';
import {voiceSample} from '../src/audio-dsp.js';
fs.mkdirSync(new URL('../audio/',import.meta.url),{recursive:true});
const metadata={sampleRate:48000,note:'Design-time PCM reference renders, not proof of listening or browser playback',sounds:{}};
for(const kind of Object.keys(SFX_SPEC)){
 const bank=synthesizeBank(kind);const hold=kind==='charge'?2.4:kind==='suppression'?2.8:null;
 const duration=hold!==null?hold+SFX_SPEC[kind].tailSeconds:SFX_SPEC[kind].bodySeconds;
 const v={kind,atMs:0,deadlineMs:hold!==null?hold*1000:null,resolveMs:null,updates:[]};const samples=new Float32Array(Math.ceil(duration*48000));for(let i=0;i<samples.length;i++)samples[i]=voiceSample(v,i/48,bank);
 fs.writeFileSync(new URL(`../audio/${kind}.wav`,import.meta.url),wavEncode(samples));metadata.sounds[kind]={...SFX_SPEC[kind],referenceDuration:duration,authorityDeadlineForAuditionMs:hold!==null?hold*1000:null};
}
fs.writeFileSync(new URL('../audio/metadata.json',import.meta.url),JSON.stringify(metadata,null,2));
