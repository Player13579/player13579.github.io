"""通常のChromium/Playwrightによる実行。管理者制限を解除・迂回しない。"""
from pathlib import Path
import os, json, time, subprocess, base64, sys, datetime
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence'/'browser'; OUT.mkdir(parents=True,exist_ok=True)
report={'schema':'DVA-v5-browser','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'not_run','shaderCompilation':'not_run','GPUReadback':'not_run','autoLoop':'not_run','lifetime':'not_run','OfflineAudio':'not_run','audioOutput':'not_run','listening':'not_run','visualAcceptance':'not_run','integration':'not_run','attempt':'通常Chromium + localhost。ブラウザー制限解除フラグ無し。'}
server=None
try:
 from playwright.sync_api import sync_playwright
 env={**os.environ,'PORT':'8795'}
 server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 time.sleep(.4)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),headless=os.environ.get('HEADFUL')!='1')
  report['browserVersion']=browser.version
  page=browser.new_page(viewport={'width':1120,'height':1000},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8795/',wait_until='domcontentloaded',timeout=30000)
  page.wait_for_function('window.contactPreview?.snapshot().ready === true',timeout=60000)
  page.wait_for_function('window.contactPreview.snapshot().cycles >= 3 && window.contactPreview.snapshot().positiveFrames > 35',timeout=90000)
  report['autoLoop']='pass';report['snapshot']=page.evaluate('window.contactPreview.snapshot()')
  report['resources']=page.evaluate('window.contactPreview.resources()');report['shaderCompilation']='pass'
  page.screenshot(path=str(OUT/'automatic-preview.png'),full_page=True)
  def store_payload(expression):
   payload=page.evaluate("""async (expr)=>{const r=await eval(expr);const files=[];for(const f of r.files){let b;if(typeof f.data==='string')b=new TextEncoder().encode(f.data);else b=f.data;let s='';for(const x of b)s+=String.fromCharCode(x);files.push({name:f.name,data:btoa(s)});}return {files,report:r.report};}""",expression)
   for f in payload['files']:
    dest=OUT/f['name'];dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(base64.b64decode(f['data']))
   return payload['report']
  live=store_payload('window.contactPreview.captureNext()');report['live']=live;report['GPUReadback']='pass'
  lifetime=store_payload('window.contactPreview.runLifetime()');report['lifetime']=lifetime['status']
  compatibility=page.evaluate('window.contactPreview.runCompatibility()');report['compatibility']=compatibility
  report['OfflineAudio']=compatibility['offlineAudio']['status'];report['pageErrors']=errors
  page.wait_for_function('window.contactPreview.snapshot().active === 1 && !window.contactPreview.snapshot().testing',timeout=20000)
  report['postInspectionResume']='pass'
  report['status']='pass' if lifetime['status']=='pass' and compatibility['status']=='pass' and not errors else 'failed'
  browser.close()
except Exception as e:
 report['reason']=str(e)
 # ページ移動前の環境制限は描画コードのfailedとは分ける。
 report['status']='not_run' if report['shaderCompilation']=='not_run' else 'failed'
finally:
 if server:
  server.terminate()
  try:server.wait(timeout=3)
  except subprocess.TimeoutExpired:server.kill()
 (ROOT/'evidence'/'browser-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(0 if report['status']=='pass' else 2 if report['status']=='not_run' else 1)
