"""Optional browser evidence collector. No browser-policy changes or forced software backend.
Start npm start, install Playwright separately, then EMP_BROWSER=/path/to/browser python tests/browser-smoke.py.
Default is an initialization smoke only. --full traverses each entire scenario and every condition.
GPU execution/AudioContext success NEVER confers human visual or listening approval.
"""
import asyncio, argparse, json, os, pathlib, time
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'quality'/'browser-run'
BASE=os.environ.get('EMP_BASE_URL','http://localhost:8080')
async def main(full=False):
    OUT.mkdir(parents=True,exist_ok=True)
    report={'version':'r0.3','attempt':'initialization_and_runtime','browser_execution':'not_run',
            'hardware_gpu':'not_run','visual_quality':'not_run','actual_listening':'not_run',
            'cases':[],'errors':[],'note':'Headless audio processing is not actual listening. Adapter alone is not hardware proof.'}
    async with async_playwright() as p:
        options={'headless':True}
        if os.environ.get('EMP_BROWSER'):options['executable_path']=os.environ['EMP_BROWSER']
        browser=None
        try:
            browser=await p.chromium.launch(**options)
            page=await browser.new_page(viewport={'width':1440,'height':1080},device_scale_factor=1)
            page.on('pageerror',lambda e:report['errors'].append(str(e)))
            await page.goto(BASE+'/?scene=all',wait_until='domcontentloaded',timeout=15000)
            await page.wait_for_function('!!window.empPreview',timeout=12000)
            await page.evaluate('empPreview.pause()')
            report['environment']=await page.evaluate('empPreview.report()')
            report['initial_frame']=await page.evaluate('empPreview.frameCheck()')
            report['browser_execution']='initialized'
            report['hardware_gpu']='requires_adapter_and_host_verification'
            await page.locator('#audio').click()
            report['audio_context_state']=await page.evaluate('empPreview.fx.audio.context.state')
            if full:
                for branch in ['charge','normal','resonance','cancellation','suppression','order-forward','order-reverse','overlap','lock-resolved','normal-resolved','charge-expired','d0','continuous']:
                    for bg in ['dark','light']:
                        for quality in ['high','low']:
                            for rate in [1,2]:
                                for zoom in [1,2]:
                                    for occ in ['mixed','front','back']:
                                        case={'branch':branch,'background':bg,'quality':quality,'rate':rate,'zoom':zoom,'occlusion':occ,'visual_quality':'not_run','listening':'not_run'}
                                        await page.evaluate('([b,g,q,r,z,o])=>{let p=empPreview;p.state.loop=false;p.setBackground(g);p.setQuality(q);p.setRate(r);p.setZoom(z);p.setOcclusion(o);p.select(b);p.play();}',[branch,bg,quality,rate,zoom,occ])
                                        await page.wait_for_function('empPreview.state.playing===false',timeout=25000)
                                        case['frameCheck']=await page.evaluate('empPreview.frameCheck()')
                                        case['record']=await page.evaluate('empPreview.state.records.at(-1)')
                                        report['cases'].append(case)
                                        (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
                report['browser_execution']='traversal_completed_not_quality_approval'
            await page.screenshot(path=str(OUT/'runtime-ui.png'))
        except Exception as e:
            report['attempt']='blocked_or_failed'
            report['errors'].append(str(e))
            report['hardware_gpu']='not_run'
        finally:
            if browser:await browser.close()
            (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ['environment','cases']},ensure_ascii=False,indent=2))
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--full',action='store_true');asyncio.run(main(a.parse_args().full))
