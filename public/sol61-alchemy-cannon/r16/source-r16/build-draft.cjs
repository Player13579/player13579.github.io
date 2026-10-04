const fs=require('node:fs'),path=require('node:path');
const prior=path.join(__dirname,'../finish-cannon-r15-creative-sol61-r1');
let text=fs.readFileSync(path.join(prior,'effect.mjs'),'utf8');
text=text.replace('// GPT-6.1-Sol R15 UNSEALED. New open plasma volumes; inherited sampler/activation preserved explicitly.',
 '// GPT-6.1-Sol R16 UNSEALED. Offset charge body and independent emission/extinction; inherited sampler/activation preserved.');
text=text.replace('alchemy-cannon-new-e-sol61-r15','alchemy-cannon-new-e-sol61-r16');
fs.writeFileSync(path.join(__dirname,'effect.mjs'),text);
fs.copyFileSync(path.join(prior,'audio.mjs'),path.join(__dirname,'audio.mjs'));
