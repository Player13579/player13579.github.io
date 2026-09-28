"""B設計のローカル静的検査。正本Bの同梱検証器・GPU compilerの代替ではない。"""
from pathlib import Path
import json,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
FOUNDATION=['FoundationOperationTemplate','InferenceExpansionPolicy','PlatonicGoodTemplate','PhenomenonSystemTemplate','PEMTemplate','CoordinateGravityWindTemplate','OctaDomainTemplate','AnimeStudiesTemplate','ObservationIntegrationTemplate','ExtremumDesignColorTemplate','ReflectionClosureTemplate','PhenomenonProfileTemplate','TermsTemplate','GlobalAcceptanceTemplate']
PHFIELDS=['identity','DeepStructure','PhysicalModel','ScaleRegime','OctaDomain','PerceptualReadability','GeometryConstraint','StateDynamics','Couplings','CausalityLinks','Evidence','SurroundingChanges','VisualProjection','BeautyStructureApplication','AcceptanceCriteria','FailurePatterns']
DOMAINS=['Thermo','Fluid','Optics','Materials','Electromagnetics','Rheology','WaveOptics','SurfaceScience']
OBS_FIELDS=['operation_type','input_references','target_mask','stage','composite_method','intensity','protected_regions','output_consequence','dependencies','sampling_consequence']
results=[]
def check(ok,label):
 results.append({'check':label,'status':'pass' if ok else 'fail'})
 if not ok:raise AssertionError(label)
def audit(path):
 d=json.loads(path.read_text());tag=path.name
 check(all(k in d for k in FOUNDATION),tag+':基底全block')
 contract=d['FoundationOperationTemplate']['OutputContract']
 check(contract=={'schema_version':'B-Expression-2','mode':'Image','operation':'design_only'},tag+':実行EとB画像基準設計の分離')
 system=d['PhenomenonSystemTemplate'];PH=system['PhenomenonBlock'];registry=system['PhenomenonRegistry'];OBS=d['ObservationIntegrationTemplate']['ObservationRegistry']
 check(set(PH)==set(registry)=={'PH1','PH2'},tag+':実PH mapping一致')
 for pid,p in PH.items():
  check(all(k in p for k in PHFIELDS),tag+':'+pid+'完全構造')
  check(p['identity']==registry[pid],tag+':'+pid+'identity一致')
  domains=p['OctaDomain']['Domains'];check(set(domains)==set(DOMAINS),tag+':'+pid+'八領域')
  check(all(v.get('items') and v.get('evidence_or_constraint') and v['applicability'] in ['applicable','not_applicable'] and v['role'] in ['primary','supporting','latent'] and (v['applicability']!='not_applicable' or v['role']=='latent') for v in domains.values()),tag+':'+pid+'領域分類と非該当理由')
  model=p['PhysicalModel'];check(all(k in model for k in ['model_kind','system_boundary','state_variables','inputs','balance_conditions','constitutive_response','initial_condition','boundary_conditions','approximation_scope']),tag+':'+pid+'PhysicalModel')
  check(set(model['balance_conditions'])=={'mass','momentum','energy','charge'},tag+':'+pid+'四収支')
  check(all(k in p['ScaleRegime'] for k in ['characteristic_length','characteristic_time','dominant_balance','dimensionless_reasoning','detail_cutoff']),tag+':'+pid+'ScaleRegime')
  check(all(k in p['StateDynamics'] for k in ['driving_input','response_timescale','phase_relation','stability_condition']),tag+':'+pid+'時間条件')
  check(all(k in p['PerceptualReadability'] for k in ['cue_roles','confusable_alternative','disambiguating_evidence','viewing_conditions']),tag+':'+pid+'知覚条件')
  ca=p['Couplings']['CausalAssessment'];check(ca['check_status']=='tested' and all((ROOT/r).is_file() for r in ca['evidence_refs']),tag+':'+pid+'CPU因果比較記録')
  axes=p['BeautyStructureApplication']['axes'];check(len(axes)>=2 and all(len(x)>=2 for x in axes.values()),tag+':'+pid+'Beauty証拠数（評価点ではない）')
  for l in p['CausalityLinks']['physical_influence']:check(l['source'] in PH and l['target'] in PH and bool(l['mechanism']) and bool(l['consequence']),tag+':世界内因果参照')
  for l in p['CausalityLinks']['observation_dependency']:check(l['source'] in OBS and l['target'] in set(PH)|set(OBS)|{'display_condition','optical_condition'},tag+':観測参照')
 for oid,o in OBS.items():
  check(all(k in o for k in OBS_FIELDS),tag+':'+oid+'観測構造')
  check(all(r in set(PH)|set(OBS)|{'display_condition','optical_condition'} for r in o['dependencies']+o['input_references']),tag+':'+oid+'登録済み参照')
 visited=set();stack=set()
 def visit(oid):
  check(oid not in stack,tag+':OBS自己依存・循環なし')
  if oid in visited:return
  stack.add(oid)
  for dep in OBS[oid]['dependencies']:
   if dep in OBS:visit(dep)
  stack.remove(oid);visited.add(oid)
 for oid in OBS:visit(oid)
 coords=d['CoordinateGravityWindTemplate'];check(all(k in coords for k in ['Gravity','WindCapsule','TransformChain','WorldCoordinates','ScreenCoordinates']),tag+':座標重力媒体')
 check(coords['WindCapsule']['medium_state']=='air',tag+':静穏air条件')
 check(set(d['ExtensionActivationTable']['entries'])=={'VFX','ECodeImplementation','PostEffects','LDM','GradientAnchorPolicy'},tag+':選択拡張のみ')
 layers=d['VFX']['layers'];ids={l['layer_id'] for l in layers};check(len(ids)==len(layers),tag+':層ID一意')
 for l in layers:
  check((l['domain']=='world' and bool(l['PH_refs']) and not l['OBS_refs'] and set(l['PH_refs'])<=set(PH)) or (l['domain']=='observation' and bool(l['OBS_refs']) and not l['PH_refs'] and set(l['OBS_refs'])<=set(OBS)),tag+':層のPH/OBS排他参照')
 for l in d['VFX']['interlayer_links']:check(l['source_layer'] in ids and l['target_layer'] in ids and l['source_layer']!=l['target_layer'],tag+':層間参照')
 check(all((ROOT/p).is_file() for p in d['ECodeImplementation']['implementation_artifacts']),tag+':実装artifact実在')
 check(d['GlobalAcceptanceTemplate']['ValidationResults']['RenderObservation']['status']=='not_run' and d['GlobalAcceptanceTemplate']['FinalStatus']['render_status']=='NotRun',tag+':未観察を合格にしない')
 return d
try:
 docs={p:audit(p) for p in sorted((ROOT/'design').glob('*.B-Expression-2.json'))}
 for path in sorted(list((ROOT/'src').glob('*.mjs'))+list((ROOT/'tests').glob('*.mjs'))+list((ROOT/'tools').glob('*.mjs'))):
  p=subprocess.run(['node','--check',str(path)],capture_output=True,text=True)
  check(p.returncode==0,str(path.relative_to(ROOT))+':JS構文 '+p.stderr[:200])
 source='\n'.join(p.read_text() for p in (ROOT/'src').glob('*.mjs'))+'\n'+(ROOT/'shaders/effects.wgsl').read_text()
 check(not re.search(r'getContext\s*\(\s*[\'\"]2d[\'\"]',source),'Canvas2Dなし')
 check(not re.search(r'\b(textureSample|textureLoad|copyExternalImageToTexture|createImageBitmap|new Image)\b',source),'画像textureを入力にしない')
 wgsl=(ROOT/'shaders/effects.wgsl').read_text()
 for a,b in [('(',')'),('{','}'),('[',']')]:check(wgsl.count(a)==wgsl.count(b),'WGSL字句delimiter '+a+b+'（コンパイルではない）')
 check(all('fn '+name+'(' in wgsl for name in ['rational','ninjutsu','receiverLight','receiverGloss','sourcePoint','sourcePower','fs','vs']),'WGSL実装関数存在')
 rulemap=json.loads((ROOT/'design/rule-implementation-map.json').read_text());rules=rulemap['rules']
 check(len({x['rule_id'] for x in rules})==len(rules),'適用規則対応表の一意rule_id')
 for path,d in docs.items():
  d['GlobalAcceptanceTemplate']['ValidationResults']['StructuralInspection']={'status':'pass','checks':{'required_blocks':'ローカル構造監査で必須block・PH完全構造を確認。evidence/local-structure.json','rule_contracts':'一意な適用rule対応と正本参照。正本同梱validatorは未実行。','PH_OBS_separation':'registryと層参照・OBS非循環を確認。','OctaDomain':'全PHの8領域、非該当理由とlatent roleを確認。','scientific_fields':'PhysicalModel/ScaleRegime/cue/StateDynamics/CausalAssessment構造。科学的真偽の自動証明ではない。','coordinate_gravity_wind':'座標・Gravity・WindCapsule・媒体を確認。','template_consolidation':'一つの設計mapping。正本本文の章末数の再検査は未実施。'}}
  path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 status='pass'
except Exception as e:status='fail';results.append({'error':str(e)})
report={'status':status,'scope':'ローカル静的検査のみ。正本Bの同梱検証器・意味適合の全証明・WGSLコンパイル・実GPU品質の証明ではない。','checks':results,'count':len(results),'canonical_validator':'not_run','WGSL_compile':'not_run'}
(ROOT/'evidence/local-structure.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(status,len(results),'checks');sys.exit(status!='pass')
