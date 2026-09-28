import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const d=JSON.parse(fs.readFileSync(path.join(root,'design/B-Expression-2.json'),'utf8'));
const problems=[],checks=[];
const check=(test,message)=>{checks.push({status:test?'pass':'fail',message});if(!test)problems.push(message);};
const fields=['identity','DeepStructure','PhysicalModel','ScaleRegime','OctaDomain','PerceptualReadability','GeometryConstraint','StateDynamics','Couplings','CausalityLinks','Evidence','SurroundingChanges','VisualProjection','BeautyStructureApplication','AcceptanceCriteria','FailurePatterns'];
const domains=['Thermo','Fluid','Optics','Materials','Electromagnetics','Rheology','WaveOptics','SurfaceScience'];
const ph=d.PhenomenonSystemTemplate.PhenomenonRegistry,bl=d.PhenomenonSystemTemplate.PhenomenonBlock,obs=d.ObservationIntegrationTemplate.ObservationRegistry;
const needed=['FoundationOperationTemplate','InferenceExpansionPolicy','PlatonicGoodTemplate','PhenomenonSystemTemplate','PEMTemplate','CoordinateGravityWindTemplate','OctaDomainTemplate','AnimeStudiesTemplate','ObservationIntegrationTemplate','ExtremumDesignColorTemplate','ReflectionClosureTemplate','PhenomenonProfileTemplate','TermsTemplate','GlobalAcceptanceTemplate','ExtensionActivationTable','VFX','PostEffects','LuminanceDynamicsModule','VideoGenerationPolicy'];
for(const k of needed)check(!!d[k],`required block: ${k}`);
check(d.FoundationOperationTemplate.OutputContract.schema_version==='B-Expression-2','schema version');
check(d.FoundationOperationTemplate.OutputContract.mode==='Video','runtime mapped to Video');
check(JSON.stringify(Object.keys(ph))===JSON.stringify(Object.keys(bl)),'registry and block IDs match');
for(const [id,p] of Object.entries(bl)){
 check(/^PH\d+$/.test(id)&&p.identity.id===id,`${id}: real ID`);
 check(JSON.stringify(ph[id])===JSON.stringify(p.identity),`${id}: registry identity equality`);
 for(const f of fields)check(f in p,`${id}: ${f}`);
 for(const f of ['model_kind','system_boundary','state_variables','inputs','balance_conditions','constitutive_response','initial_condition','boundary_conditions','approximation_scope'])check(f in p.PhysicalModel,`${id}: PhysicalModel.${f}`);
 for(const n of ['mass','momentum','energy','charge'])check(['applicable','not_applicable'].includes(p.PhysicalModel.balance_conditions[n]?.status),`${id}: ${n} balance applicability`);
 for(const n of domains){const x=p.OctaDomain.Domains[n];check(!!x,`${id}: ${n} present`);if(!x)continue;check(['applicable','not_applicable'].includes(x.applicability)&&['primary','supporting','latent'].includes(x.role),`${id}: ${n} role`);check(x.items.length>0&&typeof x.evidence_or_constraint==='string',`${id}: ${n} substantive fields`);if(x.applicability==='not_applicable')check(x.role==='latent',`${id}: ${n} not-applicable stays latent`);}
 check(p.Couplings.CausalAssessment.check_status==='hypothesis_only'&&p.Couplings.CausalAssessment.evidence_refs.length===0,`${id}: no invented empirical causal evidence`);
 for(const l of p.CausalityLinks.physical_influence)check(!!ph[l.source]&&!!ph[l.target]&&!!l.mechanism&&!!l.consequence,`${id}: world influence resolves`);
 for(const l of p.CausalityLinks.observation_dependency)check(!!obs[l.source]&&(!!ph[l.target]||!!obs[l.target]||['display_condition','optical_condition'].includes(l.target)),`${id}: observation dependency resolves`);
 if(p.identity.visibility==='visible')check(p.Evidence.direct.length>=2,`${id}: two direct cues`);
 if(p.BeautyStructureApplication.target_policy==='standard'){const axes=Object.values(p.BeautyStructureApplication.axes);check(axes.length>=2&&axes.every(a=>a.length>=2),`${id}: standard beauty evidence counts`);}
 check(p.VisualProjection.world_state_ref.startsWith(id+'.'),`${id}: own world state reference`);
}
const ext=['display_condition','optical_condition'];
for(const [id,o] of Object.entries(obs)){
 for(const f of ['operation_type','input_references','target_mask','stage','composite_method','intensity','protected_regions','output_consequence','dependencies','sampling_consequence'])check(f in o,`${id}: ${f}`);
 for(const ref of [...o.input_references,...o.dependencies])check(!!ph[ref]||!!obs[ref]||ext.includes(ref),`${id}: ref ${ref}`);
}
const visited=new Set(),stack=new Set();function walk(id){if(stack.has(id))throw Error('OBS cycle: '+id);if(visited.has(id))return;stack.add(id);for(const r of obs[id].dependencies)if(obs[r])walk(r);stack.delete(id);visited.add(id);}
try{Object.keys(obs).forEach(walk);check(true,'OBS dependency DAG');}catch(e){check(false,e.message);}
check(!!d.CoordinateGravityWindTemplate.WindCapsule.medium_state,'WindCapsule medium');
check(!!d.CoordinateGravityWindTemplate.Gravity&&!!d.CoordinateGravityWindTemplate.TransformChain,'Gravity and transforms');
const ids=new Set(d.VFX.layers.map(l=>l.layer_id));check(ids.size===d.VFX.layers.length,'unique layer IDs');
check(d.VFX.layers.some(l=>l.domain==='world'),'VFX has a world layer');
for(const l of d.VFX.layers)check(l.domain==='world'?l.PH_refs.length>0&&l.OBS_refs.length===0&&l.PH_refs.every(x=>ph[x]):l.OBS_refs.length>0&&l.PH_refs.length===0&&l.OBS_refs.every(x=>obs[x]),`${l.layer_id}: world/observation separation`);
for(const l of d.VFX.interlayer_links)check(ids.has(l.source_layer)&&ids.has(l.target_layer)&&l.source_layer!==l.target_layer,'layer link resolves');
for(const track of Object.values(d.VideoGenerationPolicy.timeline.tracks))for(const x of track)check(x.start>=0&&x.end<=d.VideoGenerationPolicy.Duration.seconds&&x.start<=x.end,'timeline bounded by one Duration');
check(d.GlobalAcceptanceTemplate.ValidationResults.RenderObservation.status==='not_run','unobserved actual renderer marked not_run');
check(d.GlobalAcceptanceTemplate.FinalStatus.render_status==='NotRun','render final status not promoted');
const text=JSON.stringify(d);check(!text.includes('"$ref"'),'formal JSON fully expanded');check(!/<(?:PHx|OBSx|declared|value|target)/.test(text),'no unresolved schema placeholders');
const report={tool:'local structural validator; not the user bundled validator',scope:'JSON shape, registry correspondence, domain presence, link resolution, DAG, declared truthfulness statuses. This is not a physical/visual proof.',status:problems.length?'fail':'pass',checks:checks.length,problems,details:checks};
fs.writeFileSync(path.join(root,'quality/structural-tests.json'),JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--record')){
 d.GlobalAcceptanceTemplate.ValidationResults.StructuralInspection={status:report.status,checks:{required_blocks:`${checks.length} structural checks: quality/structural-tests.json`,rule_contracts:'Source rule IDs retained in docs/RULE-TRACE.md; original supplied validator not available. Local checker does not claim equivalence.',PH_OBS_separation:'registry membership, references and OBS DAG checked',OctaDomain:'all seven PHs, all eight domains retained',scientific_fields:'PhysicalModel, ScaleRegime, dynamics, perceptual cues, CausalAssessment and sampling fields checked for presence; physical proof not performed',coordinate_gravity_wind:'blocks and medium state present',template_consolidation:'one top-level instance per selected template; no schema placeholder IDs'}};
 fs.writeFileSync(path.join(root,'design/B-Expression-2.json'),JSON.stringify(d,null,2)+'\n');
}
console.log(`${report.status.toUpperCase()}: ${checks.length} checks; ${problems.length} failures`);if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}
