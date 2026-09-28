/** 配布物の内容hash。manifest自身の再帰hashは作らず、SHA256SUMSがmanifestも被覆する。 */
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isSymbolicLink())throw new Error('symlinkは配布対象外: '+p);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const entries=[];
for(const file of (await walk(root)).sort()){
 const name=path.relative(root,file).split(path.sep).join('/');
 if(['manifest.json','SHA256SUMS'].includes(name))continue;
 const data=await readFile(file);entries.push({path:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
const manifest={package:'dva-mana-receive-independent',version:JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version,algorithm:'SHA-256',outputKind:'executable_effect_source_not_image_generation',
 scope:'payload全ファイル。manifest自身はSHA256SUMSでhash、SHA256SUMS自身は再帰を避けて除外。ZIP全体のSHA-256は配布時の外部値。',
 qualityStatus:'gpu_technical_pass_h64_visual_quality_failed_listening_and_game_not_run',files:entries};
const bytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');await writeFile(path.join(root,'manifest.json'),bytes);
const all=[...entries,{path:'manifest.json',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}].sort((a,b)=>a.path.localeCompare(b.path,'en'));
await writeFile(path.join(root,'SHA256SUMS'),all.map(e=>`${e.sha256}  ${e.path}`).join('\n')+'\n');
console.log(`manifest: ${entries.length} payload files; SHA256SUMS: ${all.length} files`);
