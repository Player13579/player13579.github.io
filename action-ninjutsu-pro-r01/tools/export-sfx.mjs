import {writeFile,mkdir} from 'node:fs/promises';
import {synthesizeSFX,encodeWAV} from '../src/sfx-synth.mjs';
await mkdir(new URL('../sfx/',import.meta.url),{recursive:true});
for(const id of ['action-rational-free','action-ninjutsu-focus']){
 const pcm=synthesizeSFX(id);await writeFile(new URL(`../sfx/${id}.wav`,import.meta.url),encodeWAV(pcm));
 console.log(`${id}: ${pcm.left.length} frames, stereo PCM16, ${pcm.sampleRate} Hz`);
}
