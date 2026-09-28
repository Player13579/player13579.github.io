import {readdir,writeFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
async function scan(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await scan(p));else if(e.name.endsWith('.mjs'))out.push(p);}return out;}
const records=[];for(const p of await scan(root)){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});records.push({path:path.relative(root,p).replaceAll('\\','/'),status:r.status===0?'pass':'failed',stderr:r.stderr.trim()});}
const report={scope:'JavaScript parse only. GPU shader compilation is not included.',status:records.every(r=>r.status==='pass')?'pass':'failed',node:process.version,records};
await writeFile(path.join(root,'evidence/js-syntax.json'),JSON.stringify(report,null,2)+'\n');console.log(`${records.length} JavaScript files: ${report.status}`);if(report.status!=='pass')process.exitCode=1;
