import {readdir,readFile,writeFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import path from 'node:path';import {fileURLToPath} from 'node:url';import {buildShader} from './build-shader.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),files=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()&&!['evidence','sfx','node_modules'].includes(e.name))await walk(p);else if(e.isFile()&&p.endsWith('.mjs'))files.push(p);}}await walk(root);
const errors=[];
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0)errors.push({file:path.relative(root,file),message:r.stderr});}
for(const dir of ['src','preview'])for(const file of files.filter(p=>p.startsWith(path.join(root,dir)+path.sep))){const s=await readFile(file,'utf8');if(/getContext\s*\(\s*['"](?:2d|webgl2?)['"]/.test(s)||/new\s+Image\s*\(|createImageBitmap\s*\(|drawImage\s*\(/.test(s))errors.push({file:path.relative(root,file),message:'forbidden fallback/image dependency'});}
const actual=await readFile(path.join(root,'shaders/mana.wgsl'),'utf8');if(actual!==await buildShader())errors.push({file:'shaders/mana.wgsl',message:'generated shader stale'});
const report={status:errors.length?'failed':'pass',javascriptFiles:files.length,errors,shaderCompilation:'not_run',note:'node --check と禁止依存/生成ファイル一致のみ。WGSL/GPU/知覚の検査ではない。'};
await writeFile(path.join(root,'evidence/source-check.json'),JSON.stringify(report,null,2));console.log(report);if(errors.length)process.exitCode=1;
