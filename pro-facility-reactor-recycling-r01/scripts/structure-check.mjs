/** 本パッケージ固有の静的検査。B正本に同梱された検証器の実行を装わない。 */
export const DOMAINS=['Thermo','Fluid','Optics','Materials','Electromagnetics','Rheology','WaveOptics','SurfaceScience'];
export const PH_FIELDS=['identity','DeepStructure','PhysicalModel','ScaleRegime','OctaDomain','PerceptualReadability','GeometryConstraint','StateDynamics','Couplings','CausalityLinks','Evidence','SurroundingChanges','VisualProjection','BeautyStructureApplication','AcceptanceCriteria','FailurePatterns'];
const ROOTS=['FoundationOperationTemplate','InferenceExpansionPolicy','PlatonicGoodTemplate','PhenomenonSystemTemplate','PEMTemplate','CoordinateGravityWindTemplate','OctaDomainTemplate','AnimeStudiesTemplate','ObservationIntegrationTemplate','ExtremumDesignColorTemplate','ReflectionClosureTemplate','PhenomenonProfileTemplate','TermsTemplate','GlobalAcceptanceTemplate','ExtensionActivationTable','VFX','ECodeImplementation','PostEffects','LuminanceDynamicsModule','VideoGenerationPolicy'];
export function inspectDesign(d){
 const errors=[];const need=(test,message)=>{if(!test)errors.push(message);};
 for(const root of ROOTS)need(d[root]&&typeof d[root]==='object',`missing ${root}`);
 if(errors.length)return errors;
 const contract=d.FoundationOperationTemplate.OutputContract;
 need(contract.schema_version==='B-Expression-2'&&contract.mode==='Video'&&contract.operation==='design_only','wrong output contract');
 need(d.VideoGenerationPolicy.Duration.seconds===2.2,'visual duration');
 const reg=d.PhenomenonSystemTemplate.PhenomenonRegistry,phs=d.PhenomenonSystemTemplate.PhenomenonBlock,obs=d.ObservationIntegrationTemplate.ObservationRegistry;
 need(JSON.stringify(Object.keys(reg).sort())===JSON.stringify(Object.keys(phs).sort()),'PH registry mismatch');
 for(const [id,ph] of Object.entries(phs)){
  need(/^PH\d+$/.test(id),'invalid PH ID');for(const k of PH_FIELDS)need(k in ph,`${id}.${k}`);
  need(JSON.stringify(ph.identity)===JSON.stringify(reg[id]),`${id} identity mismatch`);
  for(const domain of DOMAINS){const x=ph.OctaDomain?.Domains?.[domain];need(x&&['applicable','not_applicable'].includes(x.applicability),`${id}.${domain} applicability`);need(x&&['primary','supporting','latent'].includes(x.role),`${id}.${domain} role`);need(x?.items?.length>0&&x.evidence_or_constraint,`${id}.${domain} reason`);if(x?.applicability==='not_applicable')need(x.role==='latent',`${id}.${domain} NA role`);}
  for(const field of ['model_kind','system_boundary','state_variables','inputs','balance_conditions','constitutive_response','initial_condition','boundary_conditions','approximation_scope'])need(field in ph.PhysicalModel,`${id}.PhysicalModel.${field}`);
  for(const term of ['mass','momentum','energy','charge'])need(ph.PhysicalModel.balance_conditions[term]?.balance_or_reason,`${id}.balance.${term}`);
  for(const field of ['characteristic_length','characteristic_time','dominant_balance','dimensionless_reasoning','detail_cutoff'])need(ph.ScaleRegime[field],`${id}.ScaleRegime.${field}`);
  for(const field of ['driving_input','response_timescale','phase_relation','stability_condition'])need(ph.StateDynamics[field],`${id}.StateDynamics.${field}`);
  for(const field of ['cue_roles','confusable_alternative','disambiguating_evidence','viewing_conditions'])need(ph.PerceptualReadability[field],`${id}.readability.${field}`);
  need(ph.Couplings.CausalAssessment.check_status==='hypothesis_only'&&ph.Couplings.CausalAssessment.evidence_refs.length===0,`${id} unsupported empirical causality`);
  need(ph.Evidence.direct.length>=2,`${id} evidence`);
  const axes=Object.values(ph.BeautyStructureApplication.axes);need(axes.length>=2&&axes.every(x=>x.length>=2),`${id} beauty evidence`);
  need(Object.keys(ph.GTB_connections).length>=2,`${id} GTB`);
  for(const link of ph.CausalityLinks.physical_influence)need(reg[link.source]&&reg[link.target]&&link.mechanism&&link.consequence,`${id} physical link`);
  for(const link of ph.CausalityLinks.observation_dependency)need(obs[link.source]&&(reg[link.target]||obs[link.target]||['optical_condition','display_condition'].includes(link.target))&&link.basis,`${id} observation link`);
  for(const link of ph.CausalityLinks.gaze_path)need(reg[link.source]&&reg[link.target]&&link.reason,`${id} gaze link`);
 }
 const fields=['operation_type','input_references','target_mask','stage','composite_method','intensity','protected_regions','output_consequence','dependencies','sampling_consequence'];
 const special=['optical_condition','display_condition'];
 for(const [id,x] of Object.entries(obs)){need(/^OBS\d+$/.test(id),'OBS ID');for(const k of fields)need(k in x,`${id}.${k}`);for(const dep of [...x.dependencies,...x.input_references])need(reg[dep]||obs[dep]||special.includes(dep),`${id} unresolved ${dep}`);}
 const done=new Set(),visiting=new Set();function walk(id){if(done.has(id))return;if(visiting.has(id)){errors.push('OBS dependency cycle');return;}visiting.add(id);for(const dep of obs[id].dependencies)if(obs[dep])walk(dep);visiting.delete(id);done.add(id);}for(const id of Object.keys(obs))walk(id);
 need(d.CoordinateGravityWindTemplate.WindCapsule.required===true,'WindCapsule required');need(d.CoordinateGravityWindTemplate.WindCapsule.medium_state,'medium_state');need(d.CoordinateGravityWindTemplate.Gravity&&d.CoordinateGravityWindTemplate.TransformChain,'Gravity/transform');
 const layers=d.VFX.layers,ids=new Set(layers.map(x=>x.layer_id));need(ids.size===layers.length,'duplicate layers');need(layers.some(x=>x.domain==='world'),'VFX needs world layer');
 for(const l of layers){need(l.domain==='world'||l.domain==='observation','layer domain');if(l.domain==='world')need(l.PH_refs.length>0&&l.OBS_refs.length===0&&l.PH_refs.every(x=>reg[x]),'world layer registry');else need(l.OBS_refs.length>0&&l.PH_refs.length===0&&l.OBS_refs.every(x=>obs[x]),'observation layer registry');for(const k of ['selection','function_and_visible_result','spatial_structure','material_and_optics','motion_and_phase','integration'])need(l[k],`layer.${k}`);}
 for(const x of d.VFX.interlayer_links)need(ids.has(x.source_layer)&&ids.has(x.target_layer)&&x.source_layer!==x.target_layer,'interlayer target');
 for(const k of ['CharacterPolicy','BeautifulPoseCapsule','MagicArchitecture','KeywordExpansion','GradientAnchorPolicy'])need(!(k in d),'inactive module '+k);
 need(d.PostEffects.trigger.ordinary_posteffects===false,'posteffects attribute mode');need(d.LuminanceDynamicsModule.trigger.explicit_VFX===true,'LDM trigger');
 const global=d.GlobalAcceptanceTemplate;need(global.ValidationResults.RenderObservation.status==='not_run','unobserved render must not_run');need(global.FinalStatus.render_status==='NotRun','Final render status');need(global.OutcomeEvaluation.intent_alignment.status==='not_run'&&global.OutcomeEvaluation.artistic_effect.status==='not_run','unsupported outcome');
 need(d.ECodeImplementation.validation.actual_GPU_pixels_and_timing==='not_run','GPU unobserved');need(d.ECodeImplementation.validation.syntax_and_shader==='not_run','uncompiled shader');
 for(const track of Object.values(d.VideoGenerationPolicy.timeline.tracks))for(const e of track)need(e.start>=0&&e.end<=2.2&&e.end>=e.start,'timeline bounds');
 const json=JSON.stringify(d);need(!json.includes('"$ref"'),'unexpanded shared reference');return errors;
}
