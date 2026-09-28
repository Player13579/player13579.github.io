/** Exercise the shipped server and inspect local page references; never executes browser/GPU code. */
import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';import crypto from 'node:crypto';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),port=4189;
const checks=[];function check(id,ok,evidence){checks.push({id,status:ok?'pass':'fail',evidence});}
function request(p,method='GET'){return new Promise((resolve,reject)=>{const q=http.request({host:'127.0.0.1',port,path:p,method},r=>{const chunks=[];r.on('data',b=>chunks.push(b));r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,bytes:Buffer.concat(chunks)}));});q.on('error',reject);q.setTimeout(2500,()=>q.destroy(Error('HTTP timeout')));q.end();});}
const child=spawn(process.execPath,['tools/server.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});let startup='';child.stdout.on('data',s=>startup+=s);child.stderr.on('data',s=>startup+=s);
try{
 let available=false;for(let i=0;i<50;i++){try{if((await request('/')).status===200){available=true;break;}}catch{}await new Promise(r=>setTimeout(r,60));}check('server-start',available,startup);if(!available)throw Error('Server unavailable');
 const entries=[['/','index.html','text/html'],['/gallery.html','gallery.html','text/html'],['/src/index.js','src/index.js','text/javascript'],['/src/audio-worklet.js','src/audio-worklet.js','text/javascript'],['/shaders/mana.wgsl','shaders/mana.wgsl','text/plain'],['/shaders/post.wgsl','shaders/post.wgsl','text/plain'],['/preview/fixture.wgsl','preview/fixture.wgsl','text/plain'],['/audio/mana-r04-burst-2x.wav','audio/mana-r04-burst-2x.wav','audio/wav'],['/docs/B-Expression-2.json','docs/B-Expression-2.json','application/json']];
 for(const [url,rel,mime] of entries){const r=await request(url),local=await fs.readFile(path.join(root,rel));check(`${rel}:delivery`,r.status===200&&String(r.headers['content-type']).startsWith(mime),{status:r.status,mime:r.headers['content-type']});check(`${rel}:exact-bytes`,r.bytes.equals(local),{sha256:crypto.createHash('sha256').update(r.bytes).digest('hex'),bytes:r.bytes.length});}
 for(const [url,method,expected] of [['/does-not-exist','GET',404],['/%2e%2e%2foutside','GET',403],['/','POST',405],['/','HEAD',200]]){const r=await request(url,method);check(`${method} ${url}`,r.status===expected&& (method!=='HEAD'||r.bytes.length===0),{expected,observed:r.status});}
 for(const rel of ['index.html','gallery.html']){
  const text=await fs.readFile(path.join(root,rel),'utf8');for(const m of text.matchAll(/(?:src|href)="([^"]+)"/g)){
   const name=m[1].split('#')[0].split('?')[0];if(!name||/^(https?:|data:|blob:)/.test(name))continue;
   let ok=false;try{ok=(await fs.stat(path.resolve(root,path.dirname(rel),name))).isFile();}catch{}check(`${rel} -> ${name}`,ok,'Referenced packaged file exists');
  }
 }
} catch(e){check('harness',false,String(e));} finally{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)resolve();else{child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve();},1500).unref();}});}
const report={release:'r0.4',scope:'HTTP bytes and local links only; GPU/app execution not performed',passed:checks.filter(x=>x.status==='pass').length,failed:checks.filter(x=>x.status==='fail').length,checks};
if(process.argv.includes('--record'))await fs.writeFile(path.join(root,'qa/http.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
