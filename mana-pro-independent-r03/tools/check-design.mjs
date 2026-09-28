import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DURATION,VERSION,BOUNDS} from '../src/contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const D=read('design/mana-r03.B-Expression-2.json'),map=read('design/rule-implementation-map.json');
const checks=[];const check=(id,ok,evidence)=>checks.push({id,status:ok?'pass':'failed',evidence});
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const has=(v,ks)=>obj(v)&&ks.every(k=>Object.hasOwn(v,k));
const full=['identity','DeepStructure','PhysicalModel','ScaleRegime','OctaDomain','PerceptualReadability','GeometryConstraint','StateDynamics','Couplings','CausalityLinks','Evidence','SurroundingChanges','VisualProjection','BeautyStructureApplication','AcceptanceCriteria','FailurePatterns'];
const phys=['model_kind','system_boundary','state_variables','inputs','balance_conditions','constitutive_response','initial_condition','boundary_conditions','approximation_scope'];
const scale=['characteristic_length','characteristic_time','dominant_balance','dimensionless_reasoning','detail_cutoff'];
const dyn=['state_space_extent','transition_path_character','local_stability_type','convergence_behavior','damping_profile','oscillation_pattern','equilibrium_recovery','transition_failure_risk','driving_input','response_timescale','phase_relation','stability_condition'];
const percept=['direct_evidence','indirect_evidence','figure_ground_separation','edge_legibility','perceptual_failure_risk','cue_roles','confusable_alternative','disambiguating_evidence','viewing_conditions'];
const domains=['Thermo','Fluid','Optics','Materials','Electromagnetics','Rheology','WaveOptics','SurfaceScience'];
for(const k of ['FoundationOperationTemplate','InferenceExpansionPolicy','PlatonicGoodTemplate','PhenomenonSystemTemplate','PEMTemplate','CoordinateGravityWindTemplate','OctaDomainTemplate','AnimeStudiesTemplate','ObservationIntegrationTemplate','ExtremumDesignColorTemplate','ReflectionClosureTemplate','PhenomenonProfileTemplate','TermsTemplate','GlobalAcceptanceTemplate','ExtensionActivationTable','VFX','ECodeImplementation','PostEffects','LuminanceDynamicsModule','GradientAnchorPolicy','VideoGenerationPolicy'])check('block.'+k,obj(D[k]),'トップレベルobjectの存在。内容の科学的成立/画素成功は別検査。');
const out=D.FoundationOperationTemplate.OutputContract;check('output-contract',out.schema_version==='B-Expression-2'&&out.mode==='Video'&&out.operation==='design_only',out);
const ps=D.PhenomenonSystemTemplate,reg=ps.PhenomenonRegistry,blocks=ps.PhenomenonBlock,obs=D.ObservationIntegrationTemplate.ObservationRegistry;
check('same-PH-keys',JSON.stringify(Object.keys(reg))===JSON.stringify(Object.keys(blocks)),Object.keys(reg));
check('world-not-empty',Object.keys(reg).length===4,'この独立設計で4状態。仕様一般のPH最低数ではない。');
for(const [id,b]of Object.entries(blocks)){
 check(id+'.id',/^PH\d+$/.test(id)&&b.identity.id===id,id);
 check(id+'.registry',JSON.stringify(reg[id])===JSON.stringify(b.identity),'identityとregistry、partition理由が一致');
 for(const k of full)check(id+'.'+k,Object.hasOwn(b,k),'必須構造を保持');
 check(id+'.model',has(b.PhysicalModel,phys),phys);check(id+'.scale',has(b.ScaleRegime,scale),scale);check(id+'.dynamics',has(b.StateDynamics,dyn),dyn);check(id+'.cues',has(b.PerceptualReadability,percept),percept);
 for(const name of ['mass','momentum','energy','charge'])check(`${id}.balance.${name}`,has(b.PhysicalModel.balance_conditions[name],['status','balance_or_reason'])&&['applicable','not_applicable'].includes(b.PhysicalModel.balance_conditions[name].status),b.PhysicalModel.balance_conditions[name]);
 for(const name of domains){const d=b.OctaDomain.Domains?.[name];check(`${id}.${name}.present`,has(d,['applicability','role','items','evidence_or_constraint']),d?.role);check(`${id}.${name}.items`,Array.isArray(d?.items)&&d.items.length>0, '理由または機構が非空');check(`${id}.${name}.classification`,['applicable','not_applicable'].includes(d?.applicability)&&['primary','supporting','latent'].includes(d?.role)&&(d?.applicability!=='not_applicable'||d.role==='latent'),d?.applicability);if(d?.role==='primary')check(`${id}.${name}.primary-mechanisms`,d.items.length>=2,'2つ以上の異なる機構記述。実際の独立性は意味照合。');}
 check(id+'.visible-evidence',b.identity.visibility!=='visible'||b.Evidence.direct.length>=2,b.Evidence.direct);
 check(id+'.beauty',Object.keys(b.BeautyStructureApplication.axes).length>=2&&Object.values(b.BeautyStructureApplication.axes).every(x=>Array.isArray(x)&&x.length>=2),'既存証拠2軸×2項目。美の合格点ではない。');
 check(id+'.hypothesis',b.Couplings.CausalAssessment.check_status==='hypothesis_only'&&b.Couplings.CausalAssessment.evidence_refs.length===0,'測定/因果識別を主張しない');
 check(id+'.no-unauthorized-exaggeration',['omission_scope','exaggeration_scope','ambiguity_scope'].every(k=>Array.isArray(b.VisualProjection[k])&&b.VisualProjection[k].length===0),'明示特別許可なし');
 for(const [type,links]of Object.entries(b.CausalityLinks))for(const l of links){const ok=type==='physical_influence'?reg[l.source]&&reg[l.target]&&l.mechanism&&l.consequence:type==='observation_dependency'?obs[l.source]&&(reg[l.target]||obs[l.target]||['optical_condition','display_condition'].includes(l.target))&&l.basis:reg[l.source]&&reg[l.target]&&l.reason;check(`${id}.${type}.${l.source}.${l.target}`,!!ok,l);}
}
const obsFields=['operation_type','input_references','target_mask','stage','composite_method','intensity','protected_regions','output_consequence','dependencies','sampling_consequence'];
for(const [id,o]of Object.entries(obs)){check(id+'.id',/^OBS\d+$/.test(id)&&!reg[id],id);check(id+'.fields',has(o,obsFields),obsFields);for(const x of [...o.input_references,...o.dependencies])check(id+'.ref.'+x,!!(reg[x]||obs[x]||['display_condition','optical_condition'].includes(x)),x);}
let cycle=false;const done=new Set(),stack=new Set();function visit(id){if(stack.has(id)){cycle=true;return;}if(done.has(id))return;stack.add(id);for(const dep of obs[id].dependencies)if(obs[dep])visit(dep);stack.delete(id);done.add(id);}Object.keys(obs).forEach(visit);check('OBS-DAG',!cycle,'依存方向は参照OBS→入力。評価は入力から。');
check('OBS1-order',obs.OBS1.stage==='pre_composite','field-body.wgsl: 背景局所項→有色本体→OBS2');
const cw=D.CoordinateGravityWindTemplate;check('world-applicable',cw.WorldApplicability.status==='applicable','world PHが存在');for(const k of ['Units','WorldCoordinates','CameraCoordinates','ScreenCoordinates','TransformChain','ContactCoordinates','VectorField','Gravity','WindCapsule'])check('coord.'+k,obj(cw[k]),k);
check('wind-medium',cw.WindCapsule.medium_state==='air'&&has(cw.WindCapsule,['medium_properties','Field','ApplicableResponses']),'静穏空気、適用応答を明示');
const samp=D.ObservationIntegrationTemplate.SamplingContract;for(const k of ['output_resolution','intended_display_scale','spatial_detail_policy','temporal_sampling','filter_and_resample_policy'])check('sampling.'+k,typeof samp[k]==='string'&&samp[k].length>0,samp[k]);
check('duration',D.VideoGenerationPolicy.Duration.seconds===DURATION,DURATION);check('no-render-request',D.ECodeImplementation.output_kind==='executable_effect_source_not_image_generation','Eは画像生成命令ではない');
const vf=D.VFX,ls=new Map(vf.layers.map(l=>[l.layer_id,l]));check('layer-ids-unique',ls.size===vf.layers.length,'役割やPHの個数と同一視しない');check('world-layer',vf.layers.some(l=>l.domain==='world'),'OBSだけのVFXにしない');
for(const l of vf.layers){check(l.layer_id+'.full',has(l,['role','domain','selection','PH_refs','OBS_refs','function_and_visible_result','spatial_structure','material_and_optics','motion_and_phase','integration']),'層ごとの機構/範囲/時間/統合');check(l.layer_id+'.partition',l.domain==='world'?l.PH_refs.length>0&&l.OBS_refs.length===0&&l.PH_refs.every(p=>reg[p]):l.OBS_refs.length>0&&l.PH_refs.length===0&&l.OBS_refs.every(o=>obs[o]),l.domain);}
for(const l of vf.interlayer_links){const a=ls.get(l.source_layer),b=ls.get(l.target_layer);check('layer-link.'+l.source_layer+'.'+l.target_layer,!!(a&&b&&a!==b&&(l.relation_type!=='physical_influence'||a.domain==='world'&&b.domain==='world')&&(l.relation_type!=='observation_dependency'||a.domain==='observation')),l);}
for(const k of ['KeywordExpansion','MagicArchitecture','CharacterPolicy','BeautifulPoseCapsule'])check('inactive.'+k,!Object.hasOwn(D,k),'起動条件なし。規則説明に語があるだけで一括起動しない。');
check('poste-selection',D.PostEffects.trigger.ordinary_posteffects===false&&D.PostEffects.selection.mode==='exact_selected_operations','OBS1だけ属性具体化');
check('ldm-trigger',D.LuminanceDynamicsModule.trigger.inferred_requires_luminance_dynamics===true,'既存発光の包絡が必要');
check('shared-budget',vf.output_integration.budget_ref===D.PostEffects.autonomous_activation.budget_ref&&vf.output_integration.budget_ref===D.LuminanceDynamicsModule.budget_ref,'単一のIntensityBudget');
const ga=D.GlobalAcceptanceTemplate;check('render-not-run',ga.ValidationResults.RenderObservation.status==='not_run'&&ga.FinalStatus.render_status==='NotRun','実GPU未観察');check('outcome-not-run',ga.OutcomeEvaluation.intent_alignment.status==='not_run'&&ga.OutcomeEvaluation.artistic_effect.status==='not_run','技術成功を品質へ転記しない');
check('requirements-not-results',Object.values(ga.Requirements).every(v=>v===true),'trueは要求値');
const seen=new Set();for(const r of map.entries){check('unique-rule.'+r.rule_id,!seen.has(r.rule_id),r.rule_id);seen.add(r.rule_id);for(const a of r.implementation){const text=fs.readFileSync(path.join(root,a.path),'utf8');check('anchor.'+r.rule_id,text.includes(a.anchor),{path:a.path,anchor:a.anchor});}check('no-fake-GPU.'+r.rule_id,r.verification.gpu_observation==='not_run'&&r.verification.quality_observation==='not_run',r.verification);}
const failed=checks.filter(c=>c.status==='failed');
const result={version:VERSION,scope:'local_static_structure_reference_check_not_canonical_validator',status:failed.length?'failed':'pass',checkCount:checks.length,failed:failed.length,ruleCount:map.entries.length,worldPH:Object.keys(reg),OBS:Object.keys(obs),worldBounds:BOUNDS,tests:checks,shaderCompilation:'not_run',actualGPUPixels:'not_run',quality:'not_run',listening:'not_run'};
fs.writeFileSync(path.join(root,'evidence/design-structure.json'),JSON.stringify(result,null,2)+'\n');
console.log(`${checks.length} local B/implementation checks: ${result.status}; ${map.entries.length} rules; actual GPU/quality not_run`);if(failed.length){console.error(failed);process.exitCode=1;}
