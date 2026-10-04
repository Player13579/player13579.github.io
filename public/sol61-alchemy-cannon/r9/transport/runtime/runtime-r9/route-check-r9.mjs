import crypto from 'node:crypto';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyRuntimeSourcePins } from './preview/cannon-r9/main.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),base=process.argv[2];
if(!base)throw new Error('usage: node route-check-r9.mjs http://127.0.0.1:PORT');
const routes=JSON.parse(fs.readFileSync(path.join(root,'ROUTE-PINS.json'),'utf8')).routes,checked=[];
for(const entry of routes){
 const response=await fetch(new URL('/'+entry.route,base));if(response.status!==200)throw new Error(`${entry.route} HTTP ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer()),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 const mime=entry.route.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8';
 if(bytes.length!==entry.bytes||sha256!==entry.sha256||response.headers.get('content-type')!==mime)throw new Error(`${entry.route} byte/hash/MIME mismatch`);
 checked.push({route:entry.route,http:response.status,bytes:bytes.length,sha256,contentType:mime});
}
const pins=await verifyRuntimeSourcePins({fetchImpl:url=>fetch(new URL(`/${new URL(url).pathname.split('/').at(-1)}`,base)),cryptoImpl:webcrypto});
if(pins.version!=='alchemy-cannon-new-e-sol61-r9')throw new Error('R9 source identity mismatch');
console.log(JSON.stringify({status:'pass',base,checked,sourcePins:pins},null,2));
