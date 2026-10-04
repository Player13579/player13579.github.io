// Preserve settled transport/activation ABI exactly; new material is separately imported.
const fs=require('node:fs'),path=require('node:path');
const prior=path.join(__dirname,'../finish-cannon-r14-creative-sol61-r1');
let text=fs.readFileSync(path.join(prior,'effect.mjs'),'utf8');
text=text.replace('// GPT-6.1-Sol R14 UNSEALED. New beam medium; inherited mechanical sampler/activation preserved explicitly.',
 '// GPT-6.1-Sol R15 UNSEALED. New open plasma volumes; inherited sampler/activation preserved explicitly.');
text=text.replace("alchemy-cannon-new-e-sol61-r14","alchemy-cannon-new-e-sol61-r15");
fs.writeFileSync(path.join(__dirname,'effect.mjs'),text);
fs.copyFileSync(path.join(prior,'audio.mjs'),path.join(__dirname,'audio.mjs'));
