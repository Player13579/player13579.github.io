import crypto from 'node:crypto';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),preview=path.join(root,'preview','cannon-r15');const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const routes=['gallery.html','main.mjs','effect.mjs','material.mjs','audio.mjs'].map(route=>{const b=fs.readFileSync(path.join(preview,route));return{route,bytes:b.length,sha256:sha(b)}});
fs.writeFileSync(path.join(root,'ROUTE-PINS.json'),JSON.stringify({schema:'dva-cannon-r15-faithful-runtime-route-pins/v1',routes},null,2)+'\n');
