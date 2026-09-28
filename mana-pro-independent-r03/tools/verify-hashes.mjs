import fs from 'node:fs';import path from 'node:path';import {root,files,sha} from './manifest-lib.mjs';
const lines=fs.readFileSync(path.join(root,'SHA256SUMS'),'utf8').trim().split(/\r?\n/),errors=[],listed=[];
for(const line of lines){const m=/^([a-f0-9]{64}) {2}(.+)$/.exec(line);if(!m){errors.push('invalid checksum line');continue;}const [,h,p]=m;if(path.isAbsolute(p)||p.split('/').includes('..')||p.includes('\\')){errors.push('unsafe path '+p);continue;}listed.push(p);try{if(sha(p)!==h)errors.push('hash mismatch '+p);}catch{errors.push('missing '+p);}}
const actual=files().filter(p=>p!=='SHA256SUMS');if(JSON.stringify([...listed].sort())!==JSON.stringify(actual))errors.push('listed files do not equal package files');if(new Set(listed).size!==listed.length)errors.push('duplicate checksum path');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
for(const f of manifest.files){try{if(sha(f.path)!==f.sha256||fs.statSync(path.join(root,f.path)).size!==f.bytes)errors.push('manifest mismatch '+f.path);}catch{errors.push('manifest missing '+f.path);}}
const expected=actual.filter(p=>p!=='manifest.json');if(JSON.stringify(manifest.files.map(f=>f.path).sort())!==JSON.stringify(expected))errors.push('manifest file coverage mismatch');
const result={status:errors.length?'failed':'pass',checksumEntries:lines.length,payloadFiles:manifest.files.length,errors};console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
