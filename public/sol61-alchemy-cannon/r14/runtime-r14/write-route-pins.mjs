import crypto from 'node:crypto';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),preview=path.join(root,'preview','cannon-r14');
const routes=['gallery.html','main.mjs','effect.mjs','material.mjs','audio.mjs'].map(route=>{const b=fs.readFileSync(path.join(preview,route));return{route,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}});
fs.writeFileSync(path.join(root,'ROUTE-PINS.json'),JSON.stringify({schema:'dva-cannon-r14-faithful-runtime-route-pins/v1',routes},null,2)+'\n');
