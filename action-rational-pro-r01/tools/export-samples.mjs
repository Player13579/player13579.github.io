import {writeFile} from 'node:fs/promises';import {sampleEffect} from '../src/sampler.mjs';
const out={basis:'純粋samplerのCPU記録。実GPU画素検査ではない。',frames:[]};
for(const [eventId,radius] of [['action-rational-free',145],['action-ninjutsu-focus',115]]){
 const e={eventId,causeId:'cpu-reference-'+eventId,playerId:'reference-actor',x:0,y:0,radius,actorStartMs:0,...(radius===115?{targetId:''}:{})};
 for(let t=0;t<=1200;t+=20)out.frames.push(sampleEffect(e,t));
 for(const t of [46,72,156,290,610,640,820,900,1199])out.frames.push(sampleEffect(e,t));
}
await writeFile(new URL('../evidence/sampler-frames.json',import.meta.url),JSON.stringify(out,null,2));
