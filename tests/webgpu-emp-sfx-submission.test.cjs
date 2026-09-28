'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const scene = fs.readFileSync(path.join(root, 'webgpu-main-scene.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(app, /IS_VERIFICATION_MODE \? Promise\.resolve\(null\)\s*:\s*import\('\.\/astra-emp-v1\/versions\/v1\.8\/sfx\.mjs\?adapter=/,
  'normal play preloads the authored v1.8 sound module; verify mode does not');
assert.match(scene, /const EMP_SOUND_VARIANTS = Object\.freeze\(\{[\s\S]*?'emp-storage-lock': Object\.freeze\(\['storage'\]\)/,
  'submitted sound receipt contract lists all five EMP event types');
const empBranch = scene.indexOf("} else if (event.type === 'empEffect') {");
const empClaimCheck = scene.indexOf("outcome.drawn !== true", empBranch);
const empSoundReceipt = scene.indexOf('empSoundVisualReceipts.push(', empBranch);
assert.ok(empBranch >= 0 && empClaimCheck > empBranch && empSoundReceipt > empClaimCheck,
  'EMP sound receipt is created only after the pass reports a drawn effect');
assert.match(scene, /visibleAtMs: event\.input\.visibleAtMs/,
  'receipt retains captured visual time for sync');
assert.match(scene, /empSoundVisualReceipts: Object\.freeze\(empSoundVisualReceipts\.slice\(\)\)/,
  'receipt array is returned with the recorded frame');
assert.match(app, /function commitSubmittedEmpSoundFrame\(data, receipts\)[\s\S]*?webgpuMainSubmittedFrameCurrent\(\)/,
  'audio admission requires a current submitted WebGPU frame');
assert.match(app, /eventAtMs: receipt\.visibleAtMs/,
  'PCM event is clocked from the visible submitted receipt');
assert.match(app, /if \(sound\.type === 'emp'\) continue;/,
  'the pre-submit world sound cannot duplicate the submitted PCM cue');
assert.doesNotMatch(app, /function pairedEmpMagicEffect\(/,
  'the earlier world-sound/effect pairing route is removed');
assert.match(app, /function isWallClockEmpLifetime\(effect\)[\s\S]*?effect\?\.type === 'emp-charge' \|\| effect\?\.type === 'emp-storage-lock'/,
  'charge and storage-lock use the designated wall-clock lifetime');
assert.ok((app.match(/isWallClockEmpLifetime\(effect\)/g) || []).length >= 2,
  'wall lifetime applies to both source pruning and visible EMP admission');
assert.match(app, /effect: isWallClockEmpLifetime\(effect\)[\s\S]*?wallMs: Math\.max\(0, magicInput\.now - effect\.startedAt\)/,
  'the EMP planner receives wall elapsed time while its visual phase keeps actor time');
assert.match(html, /webgpu-combat-e-sfx\.js\?v=webgpu-main-bootstrap-v8-emp-pcm-v1/,
  'the deployed adapter URL bypasses the previous cached script');
for (const token of ['emp=astra-v18', 'emp=astra-v18-receipt', 'emp=astra-v18-sfx'])
  assert.ok(html.includes(token), `the deployed ${token} module bypasses its previous cached script`);

process.stdout.write('EMP submitted-audio integration contract passed.\n');
