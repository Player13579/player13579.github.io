/** 不足・改変・予期しない追加を検査。自己再帰hashは要求しない。検査は配布物を変更しない。 */
import {readdir,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),problems=[];
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const expected=new Map();
for(const line of (await readFile(path.join(root,'SHA256SUMS'),'utf8')).trim().split('\n')){
 const m=/^([0-9a-f]{64})  (.+)$/.exec(line);if(!m)throw new Error('SHA256SUMS形式不正');
 const name=m[2];if(name.includes('\\')||name.startsWith('/')||name.split('/').includes('..')||expected.has(name))throw new Error('hash path不正: '+name);
 expected.set(name,m[1]);
}
const digest=data=>createHash('sha256').update(data).digest('hex');
for(const [name,hash]of expected){try{if(digest(await readFile(path.join(root,name)))!==hash)problems.push('modified:'+name);}catch{problems.push('missing:'+name);}}
for(const e of manifest.files){try{const data=await readFile(path.join(root,e.path));if(data.length!==e.bytes||digest(data)!==e.sha256||expected.get(e.path)!==e.sha256)problems.push('manifest-mismatch:'+e.path);}catch{problems.push('manifest-missing:'+e.path);}}
const payload=new Set(manifest.files.map(e=>e.path));
if(payload.size!==manifest.files.length)problems.push('duplicate-manifest-entry');
for(const name of expected.keys())if(name!=='manifest.json'&&!payload.has(name))problems.push('unmanifested:'+name);
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name),name=path.relative(root,p).split(path.sep).join('/');if(e.isSymbolicLink())problems.push('unexpected-symlink:'+name);else if(e.isDirectory())await walk(p);else if(name!=='SHA256SUMS'&&!expected.has(name))problems.push('unexpected:'+name);}}
await walk(root);
console.log(JSON.stringify({status:problems.length?'failed':'pass',hashedFiles:expected.size,payloadFiles:payload.size,problems},null,2));if(problems.length)process.exitCode=1;
