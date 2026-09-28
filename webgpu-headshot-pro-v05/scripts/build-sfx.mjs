import fs from 'node:fs';import {createHash} from 'node:crypto';import {synthesizeContact,encodeWav,pcmMetrics,SOUND} from '../src/index.mjs';
const pcm=synthesizeContact(48000),wav=encodeWav(pcm);fs.writeFileSync(new URL('../sfx/contact-common.wav',import.meta.url),wav);
const m={schema:'v5-single-SFX',file:'contact-common.wav',sampleRate:48000,...SOUND,channels:1,bits:16,sha256:createHash('sha256').update(wav).digest('hex'),metrics:pcmMetrics(pcm),provenance:'v5のsrc/sfx.mjsから新規生成。旧SFX・銃声・外部サンプルは不使用。',commonForAllInputs:true,OfflineAudioContext:'not_run',audioOutput:'not_run',listening:'not_run'};
fs.writeFileSync(new URL('../sfx/manifest.json',import.meta.url),JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify(m,null,2));
