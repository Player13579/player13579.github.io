import{readdir,readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
const root=new URL('../',import.meta.url);const manifest='HASHES.sha256';
async function list(dir=''){const paths=[];for(const entry of await readdir(new URL(dir||'.',root),{withFileTypes:true})){if(['node_modules','__pycache__','.git'].includes(entry.name))continue;const path=dir?`${dir}/${entry.name}`:entry.name;if(entry.isDirectory())paths.push(...await list(path));else if(path!==manifest)paths.push(path);}return paths.sort();}
const paths=await list();const hashes=await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(new URL(path,root))).digest('hex')]));
if(process.argv.includes('--check')){
 const entries=(await readFile(new URL(manifest,root),'utf8')).trim().split('\n').map(line=>[line.slice(66),line.slice(0,64)]);const expected=new Map(entries);const bad=[];
 for(const[path,sha]of hashes)if(expected.get(path)!==sha)bad.push(path);
 for(const[path]of entries)if(!paths.includes(path))bad.push(`missing:${path}`);
 console.log(JSON.stringify({files:hashes.length,manifest,manifest_self_hash:'excluded to avoid a circular hash; outer ZIP SHA256 protects the manifest',status:bad.length?'fail':'pass',mismatches:bad},null,2));process.exitCode=bad.length?1:0;
}else{await writeFile(new URL(manifest,root),hashes.map(([path,sha])=>`${sha}  ${path}`).join('\n')+'\n');console.log(`Hashed ${hashes.length} payload files. ${manifest} excludes itself.`);}
