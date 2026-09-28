/** 無音の静的・ロジック・PCM数値検査。GPU画素・音出しは実行しない。 */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
import {inspectDesign} from './structure-check.mjs';import {synthesizeReactor} from '../src/effects/reactor/sound.mjs';import {synthesizeRecycling} from '../src/effects/recycling/sound.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));process.chdir(root);
const write=(file,obj)=>fs.writeFileSync(file,JSON.stringify(obj,null,2)+'\n');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);}
export function runVerification(){
 const report={method:'パッケージ固有の静的/数値検査。B正本同梱validator、GPU shader compiler、画素評価、聴感ではない。',executedAt:new Date().toISOString(),node:process.version};
 const syntax=[];
 for(const file of walk('.').filter(f=>f.endsWith('.mjs'))){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});syntax.push({file,status:r.status===0?'pass':'failed',diagnostic:r.stderr.trim()});}
 report.javascript_syntax={status:syntax.every(x=>x.status==='pass')?'pass':'failed',files:syntax};
 const type=spawnSync('tsc',['--noEmit','--strict','--lib','ES2022,DOM','src/index.d.ts'],{encoding:'utf8'});
 report.public_declarations={status:type.error?'not_run':type.status===0?'pass':'failed',diagnostic:type.error?.message??(type.stdout+type.stderr).trim()};
 const result=spawnSync(process.execPath,['--test',...walk('tests').filter(x=>x.endsWith('.test.mjs')).sort()],{encoding:'utf8'});
 fs.writeFileSync('verification/node-tests.tap',result.stdout+result.stderr);
 report.node_tests={status:result.status===0?'pass':'failed',tests:Number(/# tests (\d+)/.exec(result.stdout)?.[1]??0),pass:Number(/# pass (\d+)/.exec(result.stdout)?.[1]??0),fail:Number(/# fail (\d+)/.exec(result.stdout)?.[1]??0),evidence:'verification/node-tests.tap'};
 report.B_structure={};
 for(const key of ['A','B']){const file=`design/${key}.B-Expression-2.json`,d=JSON.parse(fs.readFileSync(file));const errors=inspectDesign(d);report.B_structure[key]={status:errors.length?'failed':'pass',errors};
  d.GlobalAcceptanceTemplate.ValidationResults.StructuralInspection={status:errors.length?'fail':'pass',checks:{required_blocks:'必須20 root blockを機械検査',rule_contracts:'docs/B-rule-mapping.jsonの一意ID/実在ファイルを検査',PH_OBS_separation:'3 PH/4 OBS、world/observation層と依存DAGを検査',OctaDomain:'全3 PH×8領域、非該当理由とroleを検査',scientific_fields:'PhysicalModel/ScaleRegime/StateDynamics/cue/CausalAssessment/Samplingを構造検査。実在物理の実証ではない。',coordinate_gravity_wind:'ブロックと単位/transform記述の存在を検査',template_consolidation:'JSON rootは章ごとに一つ。正本文書の章末配置の再検査ではない。'}};
  d.GlobalAcceptanceTemplate.FinalStatus.specification_status=errors.length?'Fail':'Warning';write(file,d);
 }
 const audio=[];
 for(const rate of [8000,44100,48000,96000])for(const [key,synth] of [['A',synthesizeReactor],['B',synthesizeRecycling]]){const x=synth(rate);let sum=0,peak=0,dc=0;for(const a of x.samples){sum+=a*a;dc+=a;peak=Math.max(peak,Math.abs(a));}audio.push({effect:key,sampleRate:rate,sampleCount:x.samples.length,durationMs:x.durationMs,peak,rms:Math.sqrt(sum/x.samples.length),mean:dc/x.samples.length,first:x.samples[0],last:x.samples.at(-1),status:peak<.8&&Number.isFinite(sum)?'pass':'failed',interpretation:'PCMの数値検査。実音出し/聴感ではない。'});}
 write('verification/audio-numerics.json',audio);
 report.PCM_numeric={status:audio.every(x=>x.status==='pass')?'pass':'failed',evidence:'verification/audio-numerics.json',hearing:'not_run'};
 report.WGSL_static={status:report.node_tests.status,scope:'entrypoints/ABI/別形状/時間窓/括弧の静的確認のみ。コンパイラではない。'};
 report.shader_compile='not_run';report.actual_GPU_pixels_and_timing='not_run';report.hearing='not_run';report.game_event_and_SFX='not_run';
 report.browser=JSON.parse(fs.readFileSync('verification/browser-check.json','utf8'));
 report.quality_acceptance='not_run';report.visual_superiority='not_established';
 report.summary_status=report.javascript_syntax.status==='pass'&&report.node_tests.status==='pass'&&Object.values(report.B_structure).every(x=>x.status==='pass')?'static_pass_render_not_run':'static_failed';
 write('verification/static-report.json',report);
 console.log(JSON.stringify({summary:report.summary_status,tests:report.node_tests,shader_compile:report.shader_compile,actual_GPU_pixels_and_timing:report.actual_GPU_pixels_and_timing,hearing:report.hearing},null,2));
 process.exitCode=report.summary_status==='static_failed'?1:0;return report;
}
runVerification();
