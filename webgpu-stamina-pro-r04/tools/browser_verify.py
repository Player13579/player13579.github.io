"""Optional actual-Chrome pipeline/draw probe. No CPU renderer and no quality verdict.
Requires Python playwright and a Chrome/Chromium executable. Never bypasses browser policy.
"""
import argparse, json, os, shutil, subprocess, sys, time, urllib.request
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--browser',default=shutil.which('chromium') or shutil.which('google-chrome'));p.add_argument('--url',default='http://localhost:8080');p.add_argument('--headed',action='store_true');args=p.parse_args()
result={'revision':'0.4.0','attemptedAt':datetime.now(timezone.utc).isoformat(),'browser_executable':args.browser,'url':args.url,'navigation':'not_run','shaderCompilation':'not_run','pipelineCreation':'not_run','hardwareRender':'not_run','fullLifetimeQuality':'not_run','listening':'not_run','qualityAdoption':'not_approved','gameIntegration':'not_approved','cpuProxyUsed':False,'errors':[]}
server=None
try:
 try: urllib.request.urlopen(args.url,timeout=2)
 except Exception:
  server=subprocess.Popen(['node','tools/serve.mjs'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  for _ in range(30):
   time.sleep(.1)
   try: urllib.request.urlopen(args.url,timeout=1);break
   except Exception: pass
 from playwright.sync_api import sync_playwright
 if not args.browser: raise RuntimeError('No installed Chrome/Chromium executable found')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=args.browser,headless=not args.headed,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1280,'height':1000},device_scale_factor=1)
  page.on('pageerror',lambda error:result['errors'].append(str(error)))
  try:
   page.goto(args.url,wait_until='networkidle',timeout=15000);result['navigation']='pass'
   page.wait_for_function('window.__CONFLUENCE__ !== undefined',timeout=20000)
   ready=page.evaluate('window.__CONFLUENCE__.ready')
   if ready:
    result['browserRecord']=page.evaluate('window.__CONFLUENCE__.record()')
    result['shaderCompilation']=result['browserRecord']['diagnostic']['shaderCompilation']
    result['pipelineCreation']=result['browserRecord']['diagnostic']['pipelineCreation']
    result['drawMatrix']=page.evaluate('window.__CONFLUENCE__.probeMatrix()')
    result['hardwareRender']='requires_adapter_review; see actual adapter record, not quality acceptance'
   else:
    result['errors'].append(page.evaluate('window.__CONFLUENCE__.error'))
  finally: browser.close()
except Exception as exc: result['errors'].append(str(exc))
finally:
 if server:
  server.terminate()
  try:server.wait(timeout=3)
  except subprocess.TimeoutExpired:server.kill()
(ROOT/'verification/browser-attempt.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
