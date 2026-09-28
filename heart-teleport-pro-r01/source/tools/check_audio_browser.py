#!/usr/bin/env python3
"""外部URLを開かず、メモリ内test pageで実Web Audio graphを検査する。実聴ではない。"""
import argparse,json,pathlib,hashlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--chromium',default='/usr/bin/chromium');a=p.parse_args()
source=(ROOT/'src/sfx.mjs').read_text()
# ES moduleのimport/exportヘッダだけを除去する検査用inline bundle。関数本体は無変更。
inline='const LIFETIME_MS=1800,MAX_ACTIVE=8;\n'+'\n'.join(x for x in source.splitlines() if not x.startswith('import '))
inline=inline.replace('export function ','function ').replace('export class ','class ')
r={'kind':'real_Web_Audio_graph_in_memory_muted_test','source_sha256':hashlib.sha256(source.encode()).hexdigest(),'real_audition':'not_run','hardware_audio_output':'not_run','browser_navigation':'not_used','tests':[],'status':'not_run'}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=a.chromium,headless=True,args=['--no-sandbox','--mute-audio'])
  page=browser.new_page();page.set_content('<button id="go">enable audio</button>')
  page.add_script_tag(content=inline+'''\nwindow.created=0;window.create=()=>{created++;return new AudioContext();};
  window.silent=new HeartSFX({verify:true,contextFactory:create});
  window.normal=new HeartSFX({contextFactory:create});
  document.getElementById('go').addEventListener('click',async e=>{
    window.trusted=e.isTrusted;window.active=navigator.userActivation.isActive;
    window.silentUnlock=await silent.unlockFromGesture(e);silent.playOnce({id:'verify-1'});
    window.ready=await normal.unlockFromGesture(e);
    window.play1=normal.playOnce({id:'normal-1'});window.play2=normal.playOnce({id:'normal-1'});
    window.finished=true;
  });''')
  page.click('#go');page.wait_for_function('window.finished===true',timeout=10000)
  before=page.evaluate('({trusted,active,ready,play1,play2,created,silent:silent.stats(),normal:normal.stats()})')
  assert before['silent']['contextsCreated']==0 and before['silent']['sourcesStarted']==0
  assert before['created']==1 and before['ready'] and before['play1'] and not before['play2']
  r['tests'].append({'name':'verify: zero contexts/sources under actual trusted input','status':'pass'})
  r['tests'].append({'name':'normal: trusted input starts one source, duplicate suppressed','status':'pass'})
  after=page.evaluate('async()=>{await normal.dispose();await silent.dispose();return {normal:normal.stats(),silent:silent.stats()};}')
  assert after['normal']['state']=='closed' and after['normal']['voices']==0
  r['tests'].append({'name':'audio graph disposal / context close','status':'pass'})
  r['before_dispose']=before;r['after_dispose']=after;r['browser_version']=browser.version;r['status']='pass';browser.close()
except Exception as e:r['status']='failed';r['error']=str(e)
(ROOT/'reports/audio-browser-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(r,ensure_ascii=False,indent=2))
