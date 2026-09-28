"""任意の端末でpython tests/gpu_probe.py。PlaywrightとChromiumが別途必要。
既定は自身で立ち上げたnpm startのlocalhostへ接続。verifyは無音。
"""
import argparse, json, pathlib, sys
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8765/tests/verify.html');p.add_argument('--chromium',default=None);p.add_argument('--software-adapter',action='store_true');p.add_argument('--output',default='evidence/gpu-local.json');args=p.parse_args()
result={'status':'not_run','shaderCompilation':'not_run','GPUReadback':'not_run','listening':'not_run','gameIntegration':'not_run'}
try:
 from playwright.sync_api import sync_playwright
 with sync_playwright() as pw:
  flags=['--enable-unsafe-webgpu']
  if args.software_adapter: flags+=['--use-angle=swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']
  browser=pw.chromium.launch(headless=True,executable_path=args.chromium,args=flags)
  page=browser.new_page(viewport={'width':1000,'height':800},device_scale_factor=1)
  page.goto(args.url,wait_until='networkidle');page.wait_for_function('typeof window.runGPUVerification === "function"')
  result=page.evaluate('window.runGPUVerification()');result['softwareAdapterRequested']=args.software_adapter
  browser.close()
except Exception as error:
 result['environmentProbe']='failed';result['error']=str(error);result['note']='GPU検査に到達していない失敗を、shader合格や画素合格に置換しない。'
out=pathlib.Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:v for k,v in result.items() if k not in ['frames','checks']},ensure_ascii=False,indent=2));sys.exit(0 if result['status']=='pass' else 2)
