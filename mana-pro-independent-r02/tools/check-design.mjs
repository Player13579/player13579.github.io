import {readFile,writeFile} from 'node:fs/promises';import {CONTRACT,EFFECT_DURATION_SECONDS} from '../src/contract.mjs';
const root=new URL('../',import.meta.url),d=JSON.parse(await readFile(new URL('design/mana-receive.B-Expression-2.json',root),'utf8'));
const records=[];function check(name,condition,detail=''){records.push({name,status:condition?'pass':'failed',detail});}
const required=['InferenceExpansionPolicy','FoundationOperationTemplate','PlatonicGoodTemplate','PhenomenonSystemTemplate','PEMTemplate','CoordinateGravityWindTemplate','OctaDomainTemplate','AnimeStudiesTemplate','ObservationIntegrationTemplate','ExtremumDesignColorTemplate','ReflectionClosureTemplate','PhenomenonProfileTemplate','TermsTemplate','GlobalAcceptanceTemplate','ECodeImplementation','VFX','PostEffects','LuminanceDynamicsModule','GradientAnchorPolicy','ExtensionActivationTable'];
for(const n of required)check('block:'+n,!!d[n]);
const sys=d.PhenomenonSystemTemplate,PH=sys.PhenomenonRegistry,PB=sys.PhenomenonBlock,OBS=d.ObservationIntegrationTemplate.ObservationRegistry;
check('PH_registry_identity_keys',JSON.stringify(Object.keys(PH).sort())===JSON.stringify(Object.keys(PB).sort()));
const PHfields=['identity','DeepStructure','PhysicalModel','ScaleRegime','OctaDomain','PerceptualReadability','GeometryConstraint','StateDynamics','Couplings','CausalityLinks','Evidence','SurroundingChanges','VisualProjection','BeautyStructureApplication','AcceptanceCriteria','FailurePatterns'];
const domains=['Thermo','Fluid','Optics','Materials','Electromagnetics','Rheology','WaveOptics','SurfaceScience'];
for(const [id,p]of Object.entries(PB)){
 for(const field of PHfields)check(id+'.'+field,p[field]!==undefined);
 check(id+'.identity',JSON.stringify(p.identity)===JSON.stringify(PH[id]));
 for(const n of domains){const x=p.OctaDomain.Domains[n];check(id+'.domain.'+n,x&&['applicable','not_applicable'].includes(x.applicability)&&['primary','supporting','latent'].includes(x.role)&&x.items?.length>0&&!!x.evidence_or_constraint);if(x?.applicability==='not_applicable')check(id+'.latent.'+n,x.role==='latent');}
 for(const n of ['mass','momentum','energy','charge'])check(id+'.balance.'+n,!!p.PhysicalModel.balance_conditions[n]?.balance_or_reason);
 check(id+'.visible_evidence',p.Evidence.direct.length>=2);check(id+'.cue_roles',p.PerceptualReadability.cue_roles.length>=2);
 check(id+'.beauty',Object.keys(p.BeautyStructureApplication.axes).length>=2&&Object.values(p.BeautyStructureApplication.axes).every(x=>x.length>=2));
 for(const l of p.CausalityLinks.physical_influence)check(id+'.physical_ref.'+l.target,!!PH[l.source]&&!!PH[l.target]&&!!l.mechanism&&!!l.consequence);
 check(id+'.causal_hypothesis_honesty',p.Couplings.CausalAssessment.check_status==='hypothesis_only'&&p.Couplings.CausalAssessment.evidence_refs.length===0);
}
const external=new Set(['display_condition','optical_condition']),visiting=new Set(),visited=new Set();
function visit(id){if(visiting.has(id))throw new Error('OBS cycle');if(visited.has(id))return;visiting.add(id);for(const dep of OBS[id].dependencies){if(OBS[dep])visit(dep);else if(!PH[dep]&&!external.has(dep))throw new Error('unknown dependency '+dep);}visiting.delete(id);visited.add(id);}
try{for(const id of Object.keys(OBS))visit(id);check('OBS_DAG',true);}catch(e){check('OBS_DAG',false,String(e));}
for(const [id,o]of Object.entries(OBS))for(const n of ['operation_type','input_references','target_mask','stage','composite_method','intensity','protected_regions','output_consequence','dependencies','sampling_consequence'])check(id+'.'+n,o[n]!==undefined);
check('WindCapsule',d.CoordinateGravityWindTemplate.WindCapsule.medium_state==='air');check('Gravity',!!d.CoordinateGravityWindTemplate.Gravity.condition);
check('no-generation',d.FoundationOperationTemplate.OutputContract.operation==='design_only'&&d.ECodeImplementation.output_kind==='executable_effect_source_not_image_generation');
check('single-runtime-duration',d.ECodeImplementation.source_and_time_contract.serialized_duration_seconds===EFFECT_DURATION_SECONDS);
check('revision',d.ECodeImplementation.source_revision.commit===CONTRACT.sourceCommit&&d.ECodeImplementation.source_revision.base_blob===CONTRACT.baseBlob&&d.ECodeImplementation.source_revision.extension_blob===CONTRACT.extensionBlob);
check('no-untriggered-modules',!d.MagicArchitecture&&!d.KeywordExpansion&&!d.CharacterPolicy&&!d.BeautifulPoseCapsule&&!d.VideoGenerationPolicy);
check('not-run-honesty',d.GlobalAcceptanceTemplate.ValidationResults.RenderObservation.status==='not_run'&&d.GlobalAcceptanceTemplate.FinalStatus.render_status==='NotRun');
for(const layer of d.VFX.layers)check('layer_registry:'+layer.layer_id,layer.domain==='world'?layer.PH_refs.length>0&&layer.OBS_refs.length===0&&layer.PH_refs.every(p=>PH[p]):layer.OBS_refs.length>0&&layer.PH_refs.length===0&&layer.OBS_refs.every(o=>OBS[o]));
const map=JSON.parse(await readFile(new URL('design/rule-implementation-map.json',root),'utf8'));const ids=new Set();
for(const row of map.rules){check('rule_unique:'+row.rule_id,!ids.has(row.rule_id));ids.add(row.rule_id);for(const loc of row.implementation){try{const text=await readFile(new URL(loc.path,root),'utf8');check('rule_location:'+row.rule_id+':'+loc.symbol,text.includes(loc.symbol),loc.path);}catch(e){check('rule_location:'+row.rule_id,false,String(e));}}}
const result={status:records.every(r=>r.status==='pass')?'pass':'failed',scope:'同梱インスタンスのローカル構造/参照/実装symbol検査。公式B検証器でも意味・画素・聴感の合格でもない。',checks:records.length,records};
await writeFile(new URL('evidence/design-structure.json',root),JSON.stringify(result,null,2)+'\n');console.log(`${records.length} structural/reference checks: ${result.status}`);if(result.status!=='pass'){console.log(records.filter(r=>r.status==='failed'));process.exitCode=1;}
