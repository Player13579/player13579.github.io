"""実在する検査結果だけを集約する。実GPU・聴感を自動passにしない。"""
from pathlib import Path
import json,wave,math,hashlib,platform,re
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
def save(path,obj): (ROOT/path).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
wave_records=[]
for p in sorted((ROOT/'sfx').glob('*.wav')):
 with wave.open(str(p),'rb') as f:
  metadata={'channels':f.getnchannels(),'sample_rate_Hz':f.getframerate(),'sample_width_bytes':f.getsampwidth(),'frames':f.getnframes()};raw=f.readframes(f.getnframes())
 x=np.frombuffer(raw,dtype='<i2').reshape(-1,metadata['channels']).astype(float)/32768
 rms=np.sqrt(np.mean(x*x,axis=0));peak=float(np.max(np.abs(x)));mono=x.mean(axis=1)
 bins=np.fft.rfftfreq(len(mono),1/metadata['sample_rate_Hz']);mag=np.abs(np.fft.rfft(mono))
 centroid=float((bins*mag).sum()/max(mag.sum(),1e-12))
 env=[float(np.sqrt(np.mean(x[i:i+480]**2))) for i in range(0,len(x),480)]
 record={'path':str(p.relative_to(ROOT)),**metadata,'duration_seconds_at_actor_rate_1':metadata['frames']/metadata['sample_rate_Hz'],'peak_amplitude':peak,'RMS_per_channel':rms.tolist(),'spectral_centroid_magnitude_Hz':centroid,'largest_10ms_RMS_bin_actor_ms':10*int(np.argmax(env)),'first_frame':x[0].tolist(),'last_frame':x[-1].tolist(),'clipped_sample_count':int((np.abs(x)>=1).sum()),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'status':'pass','listening_status':'not_run','interpretation':'波形値の検査。音色・聴き分け・快適性・規格ラウドネスの合格ではない。'}
 assert metadata['frames']==57600 and metadata['sample_rate_Hz']==48000 and metadata['channels']==2 and peak<.681
 assert np.all(x[0]==0) and np.all(x[-1]==0)
 wave_records.append(record)
save('evidence/sfx-analysis.json',{'status':'pass','method':'同梱PCM16 WAVをwave/NumPyで解析。','records':wave_records,'listening_status':'not_run'})
tap=(ROOT/'evidence/node-tests.tap').read_text();num=lambda label:int(re.search(r'^# '+label+r' (\d+)$',tap,re.M)[1])
node={'status':'pass' if num('fail')==0 else 'fail','tests':num('tests'),'passed':num('pass'),'failed':num('fail'),'source':'evidence/node-tests.tap'}
cpu=json.loads((ROOT/'evidence/cpu-pixel-tests-all-all.json').read_text());local=json.loads((ROOT/'evidence/local-structure.json').read_text());gpu=json.loads((ROOT/'evidence/gpu-attempt.json').read_text())
report={'package_version':'0.1.0','quality_state':'prototype_cpu_checked_actual_gpu_and_listening_unreviewed','main_game_integration':'not_performed','source_revision':'provenance/source-revision.json','executed':{'Node_contracts':node,'local_B_structure':{'status':local['status'],'checks':local['count'],'canonical_validator':'not_run','source':'evidence/local-structure.json'},'CPU_reference_pixels':{'status':cpu['status'],'sampled_frames':cpu['frames'],'records_including_ablation':len(cpu['records']),'spacing_actor_ms':cpu['step_actor_ms'],'conditions':'2 E × actorH64/E全包絡H64 × 明暗 × 0..1200の13時点。キー時点の資料と3原因重複も同梱。','source':'evidence/cpu-pixel-tests-all-all.json','not_equivalent_to':'WGSLコンパイル、実GPU画素、60Hz全フレーム品質、実GPU時刻'},'PCM_analysis':{'status':'pass','files':len(wave_records),'source':'evidence/sfx-analysis.json'}},'not_run':{'canonical_B_validator':'未取得・未実行。ローカル構造監査とは別。','WGSL_compile':'実GPUへ到達していないため未実施。','actual_GPU_pixels':'Chromiumのページ読込がERR_BLOCKED_BY_ADMINISTRATOR。','GPU_presentation_and_AV_latency':'既提出frameの実提示時刻、音声機器latencyは未測定。','human_listening':'ヘッドホン／スピーカーによる聴き分け・クリック・同時発生聴感は未実施。','main_game_adapter':'本編ソースfield・receiver mask・ゲーム権威イベントの呼出し接続は未実施。'},'attempt_record':'evidence/gpu-attempt.json','CPU_reference_visual_review':{'status':'reviewed_CPU_reference_only','evidence':['evidence/cpu-reference/action-rational-free-actorH64-light-lifetime.png','evidence/cpu-reference/action-ninjutsu-focus-envelopeH64-light-lifetime.png','evidence/cpu-reference/action-rational-free-actorH64-dark-lifetime.png','evidence/cpu-reference/action-ninjutsu-focus-actorH64-dark-lifetime.png'],'observations':'角形が開いて止まる状態と、曲面が内向きに張る状態をCPU参照で区別できる。明背景でも彩色主形は残る。','limits':'縮小条件では局所芯・表面の情報が減る。抽象形だけから支払い免除／準備開始の意味が一意に読めるとは断定しない。実actor・実GPUでの誤認検査が必要。'},'fixes_during_build':['音声終端の浮動小数丸め比較を1e-9 actor-msで保護。','WGSLで負値を取り得る二乗をpowではなくsq(x)=x*xへ置換。字句回帰検査を追加。','reduced motionを自動適用せず、明示UI操作だけの設定へ限定。'],'release_decision':'試作として保存・ギャラリー掲載。完成品質・実GPU合格・実聴合格は未承認。'}
save('evidence/validation-report.json',report)
entries=[]
for eventId,title in [('action-rational-free','支払い拘束の解除'),('action-ninjutsu-focus','術者局所の張力収束')]:
 entries.append({'id':eventId,'title':title,'version':'0.1.0','preview':eventId+'.html','standalone':True,'auto_loop':True,'loop_actor_ms':2800,'effect_lifetime_actor_ms':1200,'radius':145 if eventId=='action-rational-free' else 115,'quality_status':'prototype','execution_status':'source_ready_actual_gpu_not_run','audio_status':'PCM_checked_listening_not_run','B_design':'design/'+eventId+'.B-Expression-2.json','SFX':'sfx/'+eventId+'.wav','validation':'evidence/validation-report.json','game_connected':False,'uses_image_textures':False,'uses_Canvas2D':False,'approval':{'actual_gpu':False,'human_listening':False,'final_artistic_quality':False}})
save('gallery.json',{'schema':'DVA-standalone-E-gallery-1','quality_labels_are_not_completion_approval':True,'external_gallery_deployment':'not_performed','entries':entries})
print('report / PCM analysis / gallery metadata written')
