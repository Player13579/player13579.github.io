import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
export const root=fileURLToPath(new URL('../',import.meta.url));
export const sha=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
export function files(dir=''){
 let out=[];for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const rel=path.posix.join(dir,e.name);if(e.isSymbolicLink())throw new Error('Symlink not allowed: '+rel);if(e.isDirectory()){if(!['node_modules','.git','__pycache__'].includes(e.name))out.push(...files(rel));}else if(e.isFile())out.push(rel);}
 return out.sort();
}
