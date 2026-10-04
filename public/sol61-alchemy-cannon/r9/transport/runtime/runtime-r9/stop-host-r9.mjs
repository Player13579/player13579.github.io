import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const lease=JSON.parse(fs.readFileSync(path.join(root,'HOST-LEASE.json'),'utf8'));
const url=`http://${lease.host}:${lease.port}/__shutdown`;
const response=await fetch(url,{method:'POST',headers:{'x-codex-stop-token':lease.shutdownToken}});
if(response.status!==200)throw new Error(`host stop failed with HTTP ${response.status}`);
console.log(JSON.stringify({status:'stop-requested',pid:lease.pid,port:lease.port}));
