"""任意のPlaywright環境で検査ページまで進む補助ツール。制限回避を行わない。通常はGUIで直接検査する。"""
import argparse,json,shutil,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8783/tests/verify.html');p.add_argument('--browser',default=shutil.which('chromium'));p.add_argument('--out',default='evidence/browser-attempt.json');a=p.parse_args()
r={'version':'0.3.0','attempt':'not_run','navigation':'not_run','shader':'not_run','actualGPUPixels':'not_run','listening':'not_run','quality':'not_run','error':None,'url':a.url}
try:
 from playwright.sync_api import sync_playwright
 if not a.browser:raise RuntimeError('browser executableを--browserで指定してください')
 with sync_playwright() as w:
  browser=w.chromium.launch(executable_path=a.browser,headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1000,'height':800});r['attempt']='attempted';r['browserVersion']=browser.version
  page.goto(a.url,wait_until='networkidle',timeout=20000);r['navigation']='pass'
  page.click('#run');page.wait_for_function("!document.querySelector('#run').disabled",timeout=120000)
  r['pageResult']=page.locator('#results').inner_text()
  # GUI上の聴感・無説明全寿命は自動処理で補完しない。
  try:
   q=json.loads(r['pageResult']);r['shader']=q.get('shader','not_run');r['actualGPUPixels']=q.get('pixels','not_run')
  except ValueError:pass
  browser.close()
except Exception as e:
 r['error']=str(e);r['navigation']='failed' if r['navigation']=='not_run' else r['navigation']
Path(a.out).parent.mkdir(parents=True,exist_ok=True);Path(a.out).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,ensure_ascii=False,indent=2))
