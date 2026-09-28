#!/usr/bin/env python3
"""納品後の集中再検査。GPU/実聴は別工程。実行でreportsが更新される。"""
import pathlib,subprocess,sys
R=pathlib.Path(__file__).resolve().parents[1]
commands=[['node','--test','--test-reporter=spec',*[str(p.relative_to(R)) for p in sorted((R/'tests').glob('*.test.mjs'))]],['node','tools/analyze_pcm.mjs'],[sys.executable,'tools/audit.py']]
for i,c in enumerate(commands):
 result=subprocess.run(c,cwd=R,capture_output=True,text=True)
 if i==0:(R/'reports/node-tests.txt').write_text(result.stdout+result.stderr)
 print(result.stdout,result.stderr)
 if result.returncode:sys.exit(result.returncode)
print('集中ローカル検査完了。WGSL/実GPU/視覚/実聴/本編接続はこのコマンドでは実施していません。')
