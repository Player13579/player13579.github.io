import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildShader} from '../tools/build-shader.mjs';import {VERSION,DURATION} from '../src/contract.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('配布WGSLは新規形状正本からの全展開に一致',async()=>assert.equal(read('shaders/mana.wgsl'),await buildShader()));
test('WGSL二乗は負の底をpowへ渡さず積で計算',()=>{const s=read('shaders/field-body.wgsl');assert.match(s,/fn sq\(x:f32\)->f32 \{return x\*x;\}/);assert.equal((s.match(/\bpow\(/g)||[]).length,1);assert.match(s,/pow\(max\(0\.0,x\),1\.0\/2\.4\)/);});
test('独立版0.3と継承1.6所有者秒の設計正本が一致',()=>{const d=JSON.parse(read('design/mana-r03.B-Expression-2.json'));assert.equal(VERSION,'0.3.0');assert.equal(d.VideoGenerationPolicy.Duration.seconds,DURATION);assert.equal(d.FoundationOperationTemplate.OutputContract.operation,'design_only');});
test('GPU/無説明読解を静的検査から合格へ転記しない',()=>{const d=JSON.parse(read('design/mana-r03.B-Expression-2.json'));assert.equal(d.GlobalAcceptanceTemplate.ValidationResults.RenderObservation.status,'not_run');assert.equal(d.GlobalAcceptanceTemplate.OutcomeEvaluation.intent_alignment.status,'not_run');assert.equal(d.ECodeImplementation.validation.actual_GPU_pixels_and_timing,'not_run');});
test('verify画面はH64 native bufferをCSSで変形しない',()=>{assert.match(read('preview/style.css'),/#gpu\{width:240px;height:160px;max-width:none;\}/);assert.match(read('tests/verify.html'),/width="240" height="160"/);});
test('音声原音を収録しverifyページから音声APIを作らない',()=>{assert.ok(fs.statSync(new URL('../sfx/mana-r03-original.wav',import.meta.url)).size>44);assert.doesNotMatch(read('tests/gpu-tests.mjs'),/new\s+(AudioContext|Audio|ManaAudio)|\.playOnce\(/);});
