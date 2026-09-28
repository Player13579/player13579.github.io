import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);}
const errors=[],checks=[];
for(const file of walk(root)){
 const ext=path.extname(file);if(!['.js','.html','.mjs'].includes(ext))continue;
 const text=fs.readFileSync(file,'utf8');const patterns=ext==='.html'?[/\b(?:src|href)="([^"#]+)"/g]:[/\bfrom\s+['"]([^'"]+)['"]/g,/new URL\(['"]([^'"]+)['"],\s*import\.meta\.url\)/g];
 for(const re of patterns)for(const m of text.matchAll(re)){
  const ref=m[1];if(!ref.startsWith('.'))continue;
  const p=path.resolve(path.dirname(file),ref.split('?')[0]);const ok=fs.existsSync(p);
  checks.push({file:path.relative(root,file),ref,status:ok?'pass':'fail'});if(!ok)errors.push(`${file} -> ${ref}`);
 }
}
const report={status:errors.length?'fail':'pass',scope:'Static local module, shader, HTML asset resolution. No browser/GPU execution.',checks:checks.length,errors,details:checks};
fs.writeFileSync(path.join(root,'quality/asset-check.json'),JSON.stringify(report,null,2)+'\n');
console.log(`${report.status.toUpperCase()}: ${checks.length} local asset references`);if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
