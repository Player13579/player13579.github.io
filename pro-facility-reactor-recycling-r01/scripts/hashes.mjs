import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));process.chdir(root);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name).replaceAll('\\','/')]);}
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if(process.argv.includes('--write')){
 const files=walk('.').filter(x=>!['MANIFEST.json','SHA256SUMS'].includes(x)&&!x.endsWith('.zip')).sort();
 const manifest={algorithm:'SHA-256',scope:'全payloadファイル。MANIFEST.json自身はSHA256SUMSで保護。SHA256SUMSとZIP自身の自己ハッシュは循環するため内包しない。',files:files.map(p=>({path:p,bytes:fs.statSync(p).size,sha256:digest(p)}))};
 fs.writeFileSync('MANIFEST.json',JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync('SHA256SUMS',[...files,'MANIFEST.json'].sort().map(p=>`${digest(p)}  ${p}`).join('\n')+'\n');
 console.log(`sealed ${files.length} payload files + MANIFEST.json`);
}else{
 const lines=fs.readFileSync('SHA256SUMS','utf8').trim().split('\n');let failures=0;
 for(const line of lines){const match=/^([a-f0-9]{64})  (.+)$/.exec(line);if(!match)throw new Error('checksum format');const [,hash,file]=match;if(!fs.existsSync(file)||digest(file)!==hash){console.error('HASH MISMATCH',file);failures++;}}
 console.log(`${lines.length-failures}/${lines.length} hash checks passed`);process.exitCode=failures?1:0;
}
