#!/usr/bin/env python3
import json,pathlib,re,platform
R=pathlib.Path(__file__).resolve().parents[1]
text=(R/'reports/node-tests.txt').read_text()
count=lambda k:int(re.search(r'ℹ '+k+r' (\d+)',text).group(1))
audit=json.loads((R/'reports/structural-audit.json').read_text());audio=json.loads((R/'reports/audio-browser-results.json').read_text())
result={'artifact':'action-heart-teleport','release_status':'Warning: executable source and local checks delivered; GPU/artistic/game acceptance not completed','source_revision':json.loads((R/'design/00-contract-lock.json').read_text())['source_revision'],
 'executed':{'node_tests':{'status':'pass' if count('fail')==0 else 'failed','total':count('tests'),'passed':count('pass'),'failed':count('fail'),'evidence':'reports/node-tests.txt','limits':'GPU API mock 3件を含む。WGSLコンパイルや実画素観察ではない。'},'local_structural_audit':{'status':audit['status'],'checks_total':audit['checks_total'],'checks_passed':audit['checks_passed'],'evidence':'reports/structural-audit.json','limits':'独自検査。B同梱validatorは未実行。'},'real_browser_audio_graph':{'status':audio['status'],'checks_passed':sum(x['status']=='pass' for x in audio['tests']),'evidence':'reports/audio-browser-results.json','limits':'自動操作trusted input後、ミュート下で実graphを開始・抑止・解放。実聴ではない。'},'PCM_numeric_analysis':{'status':'pass','evidence':'reports/pcm-analysis.json','limits':'音色品質や実機音圧を測定していない。'}},
 'not_executed':{'canonical_B_validator':'not_run','WGSL_compilation':'not_run','actual_GPU_queue_pixels_timing':'not_run','hardware_GPU':'not_run','H64_full_lifetime_visual_quality':'not_run','actual_GPU_resource_release':'not_run','real_audition':'not_run','DVA_main_game_connection':'not_run','production_authentication_private_delivery':'not_run'},
 'preview_features_implemented':['暗明H64の全寿命自動ループ（各周回は別fixture ID）','3原因と8原因数値検査','同ID再送ボタン','verify音声資源ゼロ','通常モードのtrusted操作後だけSFX','reduced motion','caster不可視・画面外・遮蔽・他viewerの抑止治具','GPU/音声/購読/rAF解放'],
 'evidence_policy':'未実施をpass/acceptedへ転記しない。画像生成済み・動画生成済みとはしない。',
 'remaining_acceptance':['対応実GPUでtests/browser.htmlを実行する','H64の形状・内向き作用・暗明・全寿命を実観察する','実スピーカー/ヘッドホンで1回/複数原因/終端を実聴する','DVAの実認証・private receipt・session切替・BODY/結果音と接続し別所有を検査する']}
(R/'reports/RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result['executed'].items()},ensure_ascii=False,indent=2))
