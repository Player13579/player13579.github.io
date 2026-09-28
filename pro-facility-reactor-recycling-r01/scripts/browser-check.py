"""ブラウザの台帳/verify無音と、ハードウェアadapter可用性のみを検査する。
画素readback・スクリーンショット・代替レンダラ・聴感判定は一切行わない。
任意依存: Python Playwrightと実行環境のChromium。E実行には不要。
"""
import json, os, pathlib, subprocess, time
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
record={'browser_storage':'not_run','verify_audio_contexts':'not_run','shader_compile':'not_run','actual_GPU_pixels_and_timing':'not_run','hearing':'not_run','game_event_and_SFX':'not_run'}
try:
    time.sleep(.7)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-software-rasterizer'])
        page=browser.new_page()
        page.add_init_script("""window.__audioContexts=0; const NativeAudioContext=window.AudioContext; window.AudioContext=class extends NativeAudioContext {constructor(...args){super(...args);window.__audioContexts++;}};""")
        page.goto('http://127.0.0.1:8094/preview/index.html?verify=1')
        page.wait_for_timeout(1200)
        record['browser_version']=browser.version
        record['hardware_probe']=page.evaluate("window.__facilityProbe ?? {status:'not_run',reason:'initialization not completed'}")
        record['verify_audio_contexts_created']=page.evaluate('window.__audioContexts')
        record['verify_audio_contexts']='pass' if record['verify_audio_contexts_created']==0 else 'failed'
        ledger_test=page.evaluate("""async()=>{
          const {IndexedDBCauseLedger}=await import('/src/runtime/ledger.mjs');
          const name='isolated-browser-check-'+Date.now();const a=await IndexedDBCauseLedger.open(name),b=await IndexedDBCauseLedger.open(name);
          const results=await Promise.all(Array.from({length:80},(_,i)=>(i%2?a:b).claim('same','fingerprint')));
          const conflict=await b.claim('same','changed');a.close();b.close();
          const reopened=await IndexedDBCauseLedger.open(name);const persisted=await reopened.claim('same','fingerprint');reopened.close();
          return {claims:results.filter(x=>x==='claimed').length,duplicates:results.filter(x=>x==='duplicate').length,conflict,persisted};
        }""")
        record['indexeddb_results']=ledger_test
        record['browser_storage']='pass' if ledger_test=={'claims':1,'duplicates':79,'conflict':'conflict','persisted':'duplicate'} else 'failed'
        # 複数タブから実際に同じDBへ同時にclaim。別GPUや描画経路を作らない。
        other=browser.new_page();other.goto('http://127.0.0.1:8094/provenance/') # 404でも同origin
        name='cross-tab-'+str(time.time_ns())
        js="""async name=>{const {IndexedDBCauseLedger}=await import('/src/runtime/ledger.mjs');window.__ledger=await IndexedDBCauseLedger.open(name);window.__claims=[];}"""
        page.evaluate(js,name);other.evaluate(js,name)
        kick="""()=>{window.__promise=Promise.all(Array.from({length:30},()=>window.__ledger.claim('cross-tab','fp')));}"""
        page.evaluate(kick);other.evaluate(kick)
        one=page.evaluate('window.__promise');two=other.evaluate('window.__promise')
        record['cross_tab']={'claims':(one+two).count('claimed'),'duplicates':(one+two).count('duplicate')}
        if record['cross_tab']!={'claims':1,'duplicates':59}: record['browser_storage']='failed'
        browser.close()
except Exception as error:
    record['browser_navigation']='failed'
    record['execution_error']=str(error)
finally:
    server.terminate()
    try:server.wait(timeout=3)
    except subprocess.TimeoutExpired:server.kill()
(ROOT/'verification'/'browser-check.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(record,ensure_ascii=False,indent=2))
