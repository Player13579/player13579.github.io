"""Playwrightがある検査環境だけの到達性記録。通常起動には不要。"""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
report={'status':'not_run','WGSL_compile':'not_run','actual_GPU_pixels_and_timing':'not_run','human_listening':'not_run','attempt':'Chromiumでlocalhostへ通常のページ遷移を試行。管理ポリシーの回避はしない。'}
try:
 from playwright.sync_api import sync_playwright
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=b.new_page()
  report['browser_version']=b.version
  try:
   page.goto('http://127.0.0.1:8765/index.html',wait_until='domcontentloaded',timeout=10000)
   report['navigation']='reached'
   report['environment']=page.evaluate('({secure:isSecureContext,gpu:!!navigator.gpu,url:location.href})')
  except Exception as e:report['navigation']='blocked_or_failed';report['error']=str(e)
  b.close()
except Exception as e:report['probe_error']=str(e)
report['conclusion']='ページ到達性の記録であり、実GPUのshader・画素・聴感検査は未実施。'
(ROOT/'evidence/gpu-attempt.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
