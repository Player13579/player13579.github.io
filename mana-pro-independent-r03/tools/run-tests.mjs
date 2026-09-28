// Windowsのシェルにワイルドカード展開を依存させない。
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));const files=fs.readdirSync(path.join(root,'tests')).filter(p=>p.endsWith('.test.mjs')).sort().map(p=>path.join(root,'tests',p));
const r=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit'});if(r.error)console.error(r.error);process.exitCode=r.status??1;
