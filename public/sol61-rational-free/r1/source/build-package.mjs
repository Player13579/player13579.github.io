import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {CONTRACT,SFX_SCORE} from './artist.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const bCheckout='C:/Users/user/.codex/b-foundation-current';
const revision='37eb4bdfe59f0dc075f9b4333b7d6af76b784a88';
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
fs.mkdirSync(path.join(root,'b-source'),{recursive:true});
const base=execFileSync('git',['-C',bCheckout,'show',`${revision}:基底.md`]);
const ext=execFileSync('git',['-C',bCheckout,'show',`${revision}:拡張.md`]);
fs.writeFileSync(path.join(root,'b-source','基底.md'),base);
fs.writeFileSync(path.join(root,'b-source','拡張.md'),ext);
const facts=path.resolve(root,'../../rational-free-port-inventory/FACTS.json');
const factsMd=path.resolve(root,'../../rational-free-port-inventory/FACTS.md');
const manifest={
  version:CONTRACT.version,author:{executionModel:'gpt-6.1-sol',displayName:'GPT-6.1-Sol',creativeSource:'ゼロ設計。旧候補の造形・音・コードを読まない。'},
  event:{type:'action-rational-free',meaning:'有理化により成功した一つの能力のマナ消費が免除された',owner:'playerId',position:'authoritative event x/y retained; resolve projected actual actor foot anchor',radius:145,serverDurationMs:0,clientDurationMs:1200,clock:'client receive presentation time',cooldownMs:30000,noManaGain:true,noGameplayReevaluation:true},
  output:{newRasterAssets:0,worldShader:'world.wgsl',observationShader:'post.wgsl',artist:'artist.mjs',score:'artist.mjs:SFX_SCORE/synthesizeSfx',wav:'rational-free-r1.wav',uniformFloatCount:48,uniformByteSize:192,drawVertexCount:6},
  source:{b:{repo:'https://github.com/player13579/B',branch:'Codex-honoo',commit:revision,baseBlob:'8a908495ae1f9b7175e00384ab88c50e5c78bd43',extensionBlob:'0eda016558e426ff4142d850d26200b40fafd834',baseSha256:sha(base),extensionSha256:sha(ext),read:'authenticated git fetch + git show remote exact revision; both specs read in chunks',imageSchemaValidation:'not_applicable: runtime E branch; no image-generation design'},
    facts:{path:'outputs/request-20260930/rational-free-port-inventory/FACTS.json',sha256:sha(fs.readFileSync(facts)),markdownSha256:sha(fs.readFileSync(factsMd))},
    otherInputs:['codex-full-access/SKILL.md','dva-ate-maintainer/SKILL.md','dva-ate-maintainer/references/e-design-quality.md','b-foundation-loader/SKILL.md','parent assignment and current AGENTS.md'],
    historicalInputBoundary:'FACTS provides historical candidate status/clock summary only. No old E creative artifact inspected/copied. No actor fixture inspected yet.'},
  extensions:{VFX:'explicit',ECodeImplementation:'explicit',PostEffects:'attribute_resolved local source-bound display spread',LDM:'explicit VFX',GradientAnchorPolicy:'attribute_resolved PH1 blue-source to cyan-path gradient',MagicArchitecture:'not activated; explicit token absent',KeywordExpansion:'not activated; registered tokens absent',VideoGenerationPolicy:'not activated; executable runtime E, not generated Video',crossStreaks:'DVA benefit requirement; fixed screen horizontal22.5deg axes, not falsely v1 explicit'},
  validation:{cpu:'14/14 pass; CPU-PROOF.json',jsSyntax:'pass node parser and executed import',wgslCompilation:'not_run',actualGpuPixels:'not_run',continuousTiming:'not_run',darkLightH64:'not_run',actorRegistration:'not_run',sfxListening:'not_run',galleryReplay:'not_run',gameEventConnection:'not_run',quality:'not_run',userAdopted:false,published:false},
  approximations:['Analytic 2.5D ribbon/curved sheet, not measured 3D mechanics.','Local sprite-alpha emission response, not physical normal-based irradiation/reflection.','Analytic source-bound display spread, not physical lens ghosts or threshold-convolution bloom.','Own local face mask is a design projection assumption until actual actor registration is tested.'],
  score:SFX_SCORE,
  immutablePolicy:'After this hash handoff, changes are separate attempts/versions with source SHA and adapter diff; do not overwrite r1 evidence.',
  handoff:'RUNTIME-HANDOFF.md; parent owns runtime/GPU/gallery/publication/integration/final creative acceptance and user adoption gate.'
};
fs.writeFileSync(path.join(root,'PACKAGE.json'),JSON.stringify(manifest,null,2)+'\n');
const files=[];
function visit(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);if(d.isDirectory())visit(f);else if(d.name!=='SHA256.json')files.push({path:path.relative(root,f).replaceAll('\\','/'),bytes:fs.statSync(f).size,sha256:sha(fs.readFileSync(f))});}}
visit(root);files.sort((a,b)=>a.path.localeCompare(b.path));
fs.writeFileSync(path.join(root,'SHA256.json'),JSON.stringify({version:CONTRACT.version,algorithm:'SHA-256',files},null,2)+'\n');
console.log(JSON.stringify({version:CONTRACT.version,files:files.length,sourceCommit:revision,cpu:manifest.validation.cpu,quality:'not_run',published:false}));
