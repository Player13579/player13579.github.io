"""Run the unmodified r0.4 site in a browser. Does not patch WGSL or bypass managed policies.
Requires Python playwright and a locally installed compatible Chromium. No runtime dependency.
A successful compilation/submission is NOT a human visual or auditory acceptance.
"""
from pathlib import Path
import argparse, json, os, shutil, subprocess, time, urllib.request, hashlib
ROOT = Path(__file__).resolve().parents[1]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--url',default='http://127.0.0.1:4184')
    ap.add_argument('--browser',default=shutil.which('chromium') or shutil.which('google-chrome'))
    ap.add_argument('--headful',action='store_true')
    ap.add_argument('--external-server',action='store_true')
    ap.add_argument('--out',default=str(ROOT/'qa/browser-run.json'))
    ap.add_argument('--audio-telemetry',action='store_true',help='Unlock with volume zero and collect processor telemetry; never a listening test')
    args=ap.parse_args()
    report={'release':'r0.4','scope':'Unmodified shipped WGSL; mock positive events and calibration body only',
            'navigation':'not_run','original_WGSL_compilation':'not_run','draw_submission':'not_run',
            'hardware_render_quality':'not_run','full_lifetime_human_review':'not_run','auditory_review':'not_run',
            'AudioWorklet':'not_run','live_DVA':'not_run','production_approved':False,'cases':[], 'errors':[],
            'input_shaders':[]}
    for rel in ['shaders/mana.wgsl','shaders/post.wgsl','preview/fixture.wgsl']:
        data=(ROOT/rel).read_bytes()
        report['input_shaders'].append({'file':rel,'sha256':hashlib.sha256(data).hexdigest()})
    server=None
    try:
        if not args.external_server:
            from urllib.parse import urlparse
            port=urlparse(args.url).port or 4184
            server=subprocess.Popen(['node',str(ROOT/'tools/server.mjs'),str(port)],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            for _ in range(50):
                try:
                    with urllib.request.urlopen(args.url,timeout=.3) as r:
                        if r.status==200:break
                except Exception:time.sleep(.08)
            else:raise RuntimeError('Local test server did not become available')
        if not args.browser:raise RuntimeError('No local Chromium executable found')
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            # Root-only container requirement; never change enterprise policy or enable an unsafe GPU backend.
            flags=['--no-sandbox'] if getattr(os,'geteuid',lambda:1)()==0 else []
            browser=p.chromium.launch(executable_path=args.browser,headless=not args.headful,args=flags)
            report['browser_version']=browser.version
            page=browser.new_page(viewport={'width':1440,'height':1400},device_scale_factor=1)
            page.on('pageerror',lambda e:report['errors'].append(str(e)))
            page.on('console',lambda m:report['errors'].append('console: '+m.text) if m.type=='error' else None)
            try:
                page.goto(args.url,wait_until='networkidle',timeout=30000)
                report['navigation']='completed'
                page.wait_for_function('window.__manaQA && (window.__manaQA.ready || !document.getElementById("error").hidden)',timeout=30000)
                initial=page.evaluate('window.__manaQA.report()')
                report['initial_browser_report']=initial
                if not page.evaluate('window.__manaQA.ready'):
                    report['original_WGSL_compilation']='failed_or_unavailable_see_browser_report'
                    return
                report['original_WGSL_compilation']='completed_see_original_hashes_and_messages'
                report['draw_submission']='completed'
                captures=Path(args.out).resolve().parent/'browser-captures';captures.mkdir(parents=True,exist_ok=True)
                for scenario in ('single','burst'):
                    for rate in (1,2):
                        page.evaluate('([s,r])=>{__manaQA.setScenario(s);__manaQA.setRate(r);__manaQA.restart();}',[scenario,rate])
                        # Observe actual clock-driven submissions through a complete cycle; this is not a human review.
                        page.wait_for_timeout((1500+(320 if scenario=='burst' else 0)+440)/rate+100)
                        report['cases'].append({'scenario':scenario,'rate':rate,'kind':'continuous_programmatic_submission','report':page.evaluate('__manaQA.report()')})
                page.evaluate('__manaQA.setScenario("single");__manaQA.setRate(1);')
                for ms in [0,100,300,450,650,850,1009,1200,1380,1460,1500,1700]:
                    page.evaluate('(t)=>__manaQA.seek(t)',ms)
                    page.wait_for_timeout(40)
                    file=captures/f'phase-{ms:04d}.png'
                    page.locator('#views').screenshot(path=str(file))
                    report['cases'].append({'actorMs':ms,'kind':'GPU_canvas_capture_not_human_judgment','file':str(file)})
                page.evaluate('__manaQA.setDuration(900);__manaQA.restart();')
                page.wait_for_timeout(1450)
                report['minimum_lifetime']=page.evaluate('__manaQA.report()')
                for reason in ['dead','departed','vent','invisible','session']:
                    page.evaluate('()=>{__manaQA.restart();}')
                    page.wait_for_timeout(260)
                    page.evaluate('(x)=>__manaQA.remove(x)',reason)
                    page.wait_for_timeout(60)
                    report['cases'].append({'lifecycle':reason,'report':page.evaluate('__manaQA.report()')})
                if args.audio_telemetry:
                    page.evaluate('__manaQA.setDuration(1500);__manaQA.setRate(1);')
                    page.locator('#gain').evaluate("el => {el.value='0';el.dispatchEvent(new Event('input'));}")
                    page.locator('#sound').click()
                    page.wait_for_function("document.getElementById('sound').textContent==='音 有効'", timeout=10000)
                    page.evaluate('__manaQA.setScenario("burst");')
                    page.wait_for_timeout(1900)
                    report['AudioWorklet']=page.evaluate('__manaQA.report().AudioWorklet')
                    report['audio_output_note']='Volume zero; processor telemetry is not real listening'
                report['final_browser_report']=page.evaluate('__manaQA.report()')
            finally:browser.close()
    except Exception as e:
        report['errors'].append(str(e))
        report['stop_reason']='Test stopped at the available capability boundary; no browser/GPU policy changed'
    finally:
        if server:
            server.terminate()
            try:server.communicate(timeout=4)
            except subprocess.TimeoutExpired:server.kill();server.communicate()
        out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({k:report[k] for k in ['navigation','original_WGSL_compilation','hardware_render_quality','auditory_review','errors']},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
