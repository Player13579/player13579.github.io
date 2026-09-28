import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),name='SHA256SUMS';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 if(e.name==='node_modules'||e.name==='.git'||e.name==='__pycache__')return [];
 const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p];
});}
const files=walk(root).map(p=>path.relative(root,p).split(path.sep).join('/')).filter(n=>n!==name).sort();
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
if(process.argv.includes('--verify')){
 const data=fs.readFileSync(path.join(root,name),'utf8').trim().split('\n').filter(Boolean),expected=new Map(data.map(l=>[l.slice(66),l.slice(0,64)]));let bad=0;
 for(const f of files){if(expected.get(f)!==digest(f)){console.error('MISMATCH or unlisted:',f);bad++;}}
 for(const f of expected.keys())if(!files.includes(f)){console.error('MISSING:',f);bad++;}
 console.log(bad?`${bad} manifest failures`:`PASS: ${files.length} payload files; manifest self excluded`);process.exitCode=bad?1:0;
}else{fs.writeFileSync(path.join(root,name),files.map(f=>`${digest(f)}  ${f}`).join('\n')+'\n');console.log(`SHA256SUMS: ${files.length} payload files. Self is intentionally excluded.`);}
