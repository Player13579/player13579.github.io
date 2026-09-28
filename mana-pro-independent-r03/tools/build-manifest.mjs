import fs from 'node:fs';import path from 'node:path';import {root,files,sha} from './manifest-lib.mjs';import {VERSION,DURATION,BOUNDS,H64_SCALE} from '../src/contract.mjs';
const content=files().filter(p=>!['manifest.json','SHA256SUMS'].includes(p));
const manifest={schema:'dva-gallery-package/1',name:'independent-mana',version:VERSION,release:'r0.3',kind:'executable_WebGPU_E_gallery_candidate',durationOwnerSeconds:DURATION,worldBounds:BOUNDS,H64Scale:H64_SCALE,
 provenance:{BCommit:'8ad8e9b07ab8dc8737dd9b4022a775bce61d16e1',baseBlob:'4e10a53310be5b9d0aa3a6c881cf4f39d6590bd4',extensionBlob:'0eda016558e426ff4142d850d26200b40fafd834',detail:'docs/PROVENANCE.md'},
 policy:{imageGeneration:false,gameEdits:false,publicSiteEdits:false,Canvas2D:false,imageAssetDependency:false},
 actualValidation:JSON.parse(fs.readFileSync(path.join(root,'evidence/validation-summary.json'),'utf8')),
 checksumPolicy:'manifest excludes manifest.json and SHA256SUMS; SHA256SUMS includes manifest.json and excludes only itself',
 files:content.map(p=>({path:p,bytes:fs.statSync(path.join(root,p)).size,sha256:sha(p)}))};
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const all=files().filter(p=>p!=='SHA256SUMS');fs.writeFileSync(path.join(root,'SHA256SUMS'),all.map(p=>`${sha(p)}  ${p}`).join('\n')+'\n');console.log(`${all.length} SHA-256 entries; ${content.length} payload files + manifest + checksum file`);
