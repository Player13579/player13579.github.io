"""実在する検査ログから構造結果だけを記録する。GPU/品質を推測補完しない。"""
import json,re
from pathlib import Path
R=Path(__file__).resolve().parent.parent
read=lambda p:json.loads((R/p).read_text())
write=lambda p,v:(R/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
tap=(R/'evidence/node-tests.tap').read_text()
def count(k):
 m=re.search(r'^# '+k+r' (\d+)$',tap,re.M)
 if not m:raise ValueError('TAP result missing '+k)
 return int(m.group(1))
src=read('evidence/source-check.json');structure=read('evidence/design-structure.json');cpu=read('evidence/cpu-field.json');audio=read('evidence/sfx-numeric.json');http=read('evidence/http-smoke.json');browser=read('evidence/browser-attempt.json')
summary={'version':'0.3.0','purpose':'ギャラリー候補。技術検査と無説明読解は別。','nodeTests':{'status':'pass'if count('fail')==0 else 'failed','tests':count('tests'),'pass':count('pass'),'fail':count('fail'),'evidence':'evidence/node-tests.tap'},'JavaScriptSyntax':{'status':src['status'],'files':src['javascriptFiles'],'evidence':'evidence/source-check.json'},'localBStructure':{'status':structure['status'],'checks':structure['checkCount'],'mappedRules':structure['ruleCount'],'canonicalValidator':False,'evidence':'evidence/design-structure.json'},'CPUField':{'status':cpu['status'],'phaseSamples':161,'evidence':'evidence/cpu-field.json','qualitySubstitute':False},'SFXNumerical':{'status':audio.get('status','pass'if not audio.get('errors')else 'failed'),'evidence':'evidence/sfx-numeric.json','listeningSubstitute':False},'HTTP':{'status':http['status'],'routes':len(http['checks']),'evidence':'evidence/http-smoke.json'},'WebGPU':{'shaderCompilation':'not_run','actualPixels':'not_run','motionAndTiming':'not_run','attemptEvidence':'evidence/browser-attempt.json','reason':browser['error']},'humanObservation':{'H64DarkWholeLifetime':'not_run','H64LightWholeLifetime':'not_run','listening':'not_run','audioVisualSynchronization':'not_run','qualityAccepted':False},'gameIntegration':'not_run','gameOrPublicSiteEdits':False,'overall':'gallery_candidate_not_quality_accepted'}
write('evidence/validation-summary.json',summary)
d=read('design/mana-r03.B-Expression-2.json')
d['GlobalAcceptanceTemplate']['ValidationResults']['StructuralInspection']={'status':'pass'if structure['status']=='pass'else 'fail','evidence_ref':'evidence/design-structure.json','checks':{'required_blocks':'ローカルの完全field保持検査。','rule_contracts':str(structure['ruleCount'])+'件のrule_id/実装anchorを確認。','PH_OBS_separation':'4 PH/2 OBS、型別リンクと非循環OBS依存を検査。','OctaDomain':'全4 PHの8領域/役割/不適用理由を検査。','scientific_fields':'PhysicalModel/ScaleRegime/StateDynamics/知覚/不確実性fieldの存在を検査。科学的真偽の実証ではない。','coordinate_gravity_wind':'同じworld-camera-screenと静穏媒体/Gravity。','template_consolidation':'インスタンスはmapping正規形。公式validatorの実行ではない。'}}
d['ECodeImplementation']['validation']['syntax_detail']='JavaScript '+str(src['javascriptFiles'])+'ファイルのnode --checkは'+src['status']+'。GPU shaderはnot_runのため、syntax_and_shader全体をpassにはしない。'
write('design/mana-r03.B-Expression-2.json',d)
write('evidence/user-r02-report.json',{'versionObserved':'r0.2','source':'この依頼内のユーザー実観察報告。第三者再実行やr0.3の結果ではない。','environment':'Windows Chrome WebGPU / H64原寸 / 暗明両背景 / 全寿命','reportedTechnical':{'shaderCompilation':'pass','GPUPhaseSamples':161,'GPUPixels':'pass'},'reportedQuality':'未達','reportedAppearance':{'approximately25Percent':'琥珀色の小楕円から離れた青緑の鉤','approximately50Percent':'二つの小さな塊','approximately75Percent':'単独の青緑カプセル'},'cause':'未特定。旧パラメータ原因の断定なし。','usage':'棄却条件。次版の造形見本にはしない。'})
print(json.dumps(summary,ensure_ascii=False,indent=2))
