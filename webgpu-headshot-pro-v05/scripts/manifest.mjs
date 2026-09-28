import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(process.argv.includes('--verify')){
  const file=path.join(root,'FILES.sha256'),lines=fs.readFileSync(file,'utf8').trim().split('\n'),covered=new Set(),errors=[];
  for(const line of lines){const m=/^([0-9a-f]{64})  (.+)$/.exec(line);if(!m){errors.push('invalid manifest line');continue;}const rel=m[2],p=path.resolve(root,rel);if(!p.startsWith(root+path.sep)||covered.has(rel)){errors.push('unsafe/duplicate path: '+rel);continue;}covered.add(rel);if(!fs.existsSync(p)||hash(p)!==m[1])errors.push('mismatch: '+rel);}
  for(const p of walk(root)){const rel=path.relative(root,p).replaceAll(path.sep,'/');if(rel!=='FILES.sha256'&&!covered.has(rel))errors.push('unlisted file: '+rel);}
  console.log(JSON.stringify({status:errors.length?'failed':'pass',checked:covered.size,errors},null,2));process.exitCode=errors.length?1:0;
}else{
 const files=walk(root).filter(p=>path.basename(p)!=='FILES.sha256').sort();fs.writeFileSync(path.join(root,'FILES.sha256'),files.map(p=>`${hash(p)}  ${path.relative(root,p).replaceAll(path.sep,'/')}`).join('\n')+'\n');console.log(JSON.stringify({status:'written',files:files.length,selfExcluded:'FILES.sha256'}));
}
