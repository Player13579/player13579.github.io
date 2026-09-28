/** Byte reproduction of current r0.4 sampler and synth outputs only. No previous release is read. */
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const files=['qa/samples.json','qa/audio-metrics.json',...['single','burst'].flatMap(s=>[1,2].map(r=>`audio/mana-r04-${s}-${r}x.wav`))];
const digest=async name=>crypto.createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex');
const before=new Map();for(const f of files)before.set(f,await digest(f));
for(const f of ['tools/export-samples.mjs','tools/export-audio.mjs']){const r=spawnSync(process.execPath,[f],{cwd:root,encoding:'utf8'});if(r.status!==0)throw Error(`${f}: ${r.stderr}`);}
const checks=[];for(const f of files){const after=await digest(f);checks.push({file:f,status:before.get(f)===after?'pass':'fail',before:before.get(f),after});}
const result={release:'r0.4',scope:'Current source -> deterministic sampler JSON and offline PCM; not GPU or listening validation',status:checks.every(c=>c.status==='pass')?'pass':'fail',checks};
if(process.argv.includes('--record'))await fs.writeFile(path.join(root,'qa/regeneration.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(result.status!=='pass')process.exitCode=1;
