#!/usr/bin/env python3
"""ローカルの構造・参照・実装境界検査。B正本同梱validatorとは別。画素評価をしない。"""
import hashlib,json,pathlib,re,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
D=json.loads((ROOT/'design/B-design.json').read_text());T=json.loads((ROOT/'design/rule-traceability.json').read_text());checks=[]
def check(name,condition,detail):checks.append({'name':name,'status':'pass' if condition else 'failed','evidence':detail})
base=['FoundationOperationTemplate','InferenceExpansionPolicy','PlatonicGoodTemplate','PhenomenonSystemTemplate','PEMTemplate','CoordinateGravityWindTemplate','OctaDomainTemplate','AnimeStudiesTemplate','ObservationIntegrationTemplate','ExtremumDesignColorTemplate','ReflectionClosureTemplate','PhenomenonProfileTemplate','TermsTemplate','GlobalAcceptanceTemplate']
check('foundation blocks',all(k in D for k in base),base)
P=D['PhenomenonSystemTemplate'];registry=P['PhenomenonRegistry'];blocks=P['PhenomenonBlock'];O=D['ObservationIntegrationTemplate']['ObservationRegistry']
check('PH mapping identity',set(registry)==set(blocks)=={'PH1','PH2'},list(registry))
required=['identity','DeepStructure','PhysicalModel','ScaleRegime','OctaDomain','PerceptualReadability','GeometryConstraint','StateDynamics','Couplings','CausalityLinks','Evidence','SurroundingChanges','VisualProjection','BeautyStructureApplication','AcceptanceCriteria','FailurePatterns']
domains={'Thermo','Fluid','Optics','Materials','Electromagnetics','Rheology','WaveOptics','SurfaceScience'}
for id,b in blocks.items():
 check(id+' full structure',all(k in b for k in required),required)
 check(id+' identity matches registry',b['identity']==registry[id],b['identity'])
 check(id+' OctaDomain full set',set(b['OctaDomain']['Domains'])==domains,list(b['OctaDomain']['Domains']))
 check(id+' OctaDomain nonapplicability reasons',all(x['items'] and x['evidence_or_constraint'] and (x['applicability']!='not_applicable' or x['role']=='latent') for x in b['OctaDomain']['Domains'].values()),'not_applicable => latent, nonempty reasons')
 check(id+' physical balance fields',set(b['PhysicalModel']['balance_conditions'])=={'mass','momentum','energy','charge'},b['PhysicalModel']['balance_conditions'])
 check(id+' timescale and causal uncertainty',all(k in b['StateDynamics'] for k in ['driving_input','response_timescale','phase_relation','stability_condition']) and b['Couplings']['CausalAssessment']['check_status']=='hypothesis_only','因果仮説を測定結果としない')
 check(id+' direct cues and beauty axes',len(b['Evidence']['direct'])>=2 and len(b['BeautyStructureApplication']['axes'])>=2 and all(len(set(v))>=2 for v in b['BeautyStructureApplication']['axes'].values()),'2+ existing cues; 2 axes x 2 distinct items')
 for link in b['CausalityLinks']['physical_influence']:check(id+' physical link',link['source'] in registry and link['target'] in registry and bool(link['mechanism']) and bool(link['consequence']),link)
for id,o in O.items():
 fields=['operation_type','input_references','target_mask','stage','composite_method','intensity','protected_regions','output_consequence','dependencies','sampling_consequence']
 check(id+' OBS structure',all(k in o and o[k] for k in fields),fields)
 check(id+' OBS resolves',all(x in set(registry)|set(O)|{'display_condition','optical_condition'} for x in o['input_references']+o['dependencies']),o['dependencies'])
visiting=set();done=set()
def visit(id):
 if id in visiting:return False
 if id in done:return True
 visiting.add(id)
 for x in O[id]['dependencies']:
  if x in O and not visit(x):return False
 visiting.remove(id);done.add(id);return True
check('OBS dependency DAG',all(visit(id) for id in O),{id:o['dependencies'] for id,o in O.items()})
check('PH/OBS separation',not set(O)&set(registry),'PH1/PH2 versus OBS1/OBS2/OBS3')
check('Wind and Gravity present',all(k in D['CoordinateGravityWindTemplate'] for k in ['WorldApplicability','WorldCoordinates','CameraCoordinates','ScreenCoordinates','TransformChain','WindCapsule','Gravity']),'全ブロック保持、実在しない風VFXなし')
check('E branch no render request',D['FoundationOperationTemplate']['OutputContract']=={'schema_version':'B-Expression-2','mode':'Video','operation':'design_only'},D['FoundationOperationTemplate']['OutputContract'])
check('Duration 1.8',D['VideoGenerationPolicy']['Duration']['seconds']==1.8,'ユーザー指定1800ms。10秒既定を使わない。')
check('disabled modules omitted',not any(k in D for k in ['CharacterPolicy','BeautifulPoseCapsule','MagicArchitecture','KeywordExpansion']),list(D['ExtensionActivationTable']['entries']))
layers=D['VFX']['layers'];ids={l['layer_id'] for l in layers}
check('VFX distinct world/observation layers',len(ids)==len(layers) and any(l['domain']=='world' for l in layers) and all((l['PH_refs'] and not l['OBS_refs']) if l['domain']=='world' else (l['OBS_refs'] and not l['PH_refs']) for l in layers),[l['layer_id'] for l in layers])
check('VFX links resolve',all(l['source_layer'] in ids and l['target_layer'] in ids and l['source_layer']!=l['target_layer'] for l in D['VFX']['interlayer_links']),'no invented layer IDs')
check('unobserved render not accepted',D['GlobalAcceptanceTemplate']['ValidationResults']['RenderObservation']['status']=='not_run' and D['GlobalAcceptanceTemplate']['FinalStatus']['render_status']=='NotRun','実GPU未観察を合格にしない')
check('rule IDs unique',len({r['rule_id'] for r in T['rules']})==len(T['rules']),len(T['rules']))
for row in T['rules']:
 f=ROOT/row['requirement_to_code']['file'];symbol=row['requirement_to_code']['symbol'];valid=f.is_file() and (not row['active'] or symbol in f.read_text())
 # design pointerも同一文書へ解決する。
 node=D
 try:
  for key in row['requirement_to_code']['design_pointer'].strip('/').split('/'):node=node[key]
  pointer=True
 except (KeyError,TypeError):pointer=False
 check('rule '+row['rule_id'],valid and pointer,row['requirement_to_code'])
 row['verification']['structural_result']='pass' if valid and pointer and row['active'] else 'not_applicable' if not row['active'] else 'failed'
 row['verification']['execution_evidence']=['reports/node-tests.txt'] if row['active'] and 'tests/' in row['verification']['method'] and 'browser.mjs' not in row['verification']['method'] else []
for name in ['src/gpu.mjs','src/sfx.mjs','src/runtime.mjs','shaders/heart.wgsl']:
 s=(ROOT/name).read_text();check('target data forbidden in '+name,not re.search(r'\b(targetX|targetY|targetId|targetPosition|targetDirection)\b',s),'renderer/audio/culling have no target fields')
check('no spatial audio',not re.search(r'create(?:Stereo)?Panner\s*\(', (ROOT/'src/sfx.mjs').read_text()),'中央mono、一回source')
check('no image assets',not any(p.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.ktx','.dds','.gif','.wav','.mp3','.ogg'} for p in ROOT.rglob('*') if p.is_file()),'画像/texture/既存音素材ゼロ')
syntax=[]
for f in sorted(ROOT.rglob('*.mjs')):
 r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True);syntax.append({'file':str(f.relative_to(ROOT)),'status':'pass' if r.returncode==0 else 'failed','stderr':r.stderr})
check('JavaScript syntax',all(x['status']=='pass' for x in syntax),syntax)
lock=ROOT/'design/00-contract-lock.json';h=hashlib.sha256(lock.read_bytes()).hexdigest();old=(ROOT/'design/00-contract-lock.sha256').read_text().split()[0]
check('initial contract lock unchanged',h==old,h)
status='pass' if all(c['status']=='pass' for c in checks) else 'failed'
report={'status':status,'scope':'独自の構造・参照・JavaScript syntax・情報境界検査。正本Bの同梱validatorおよびWGSL compilerは未実行。','checks_total':len(checks),'checks_passed':sum(c['status']=='pass' for c in checks),'checks':checks,'canonical_B_validator':'not_run','WGSL_compilation':'not_run','RenderObservation':'not_run'}
(ROOT/'reports/structural-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(ROOT/'design/rule-traceability.json').write_text(json.dumps(T,ensure_ascii=False,indent=2)+'\n')
G=D['GlobalAcceptanceTemplate'];G['ValidationResults']['StructuralInspection']['status']='pass' if status=='pass' else 'fail'
for k in G['ValidationResults']['StructuralInspection']['checks']:G['ValidationResults']['StructuralInspection']['checks'][k]='reports/structural-audit.json / ローカル検査。正本validatorと実画素検査は未実行。'
(ROOT/'design/B-design.json').write_text(json.dumps(D,ensure_ascii=False,indent=2)+'\n')
print(status,len(checks),'checks');
for c in checks:
 if c['status']!='pass':print('FAILED',c['name'],c['evidence'])
sys.exit(0 if status=='pass' else 1)
