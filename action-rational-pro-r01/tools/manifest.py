#!/usr/bin/env python3
"""配布物のSHA256。manifest自身の再帰hashを作らない。"""
from pathlib import Path
import argparse,hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1]
EXCLUDED={'manifest.json','SHA256SUMS'}
def payload_files():
 return sorted(p for p in ROOT.rglob('*') if p.is_file() and not any(x in p.parts for x in ['__pycache__','.git','node_modules']) and p.name!='.DS_Store' and str(p.relative_to(ROOT)) not in EXCLUDED)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build():
 files=[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in payload_files()]
 manifest={'format':'DVA-E-SHA256-manifest-1','package_version':'0.1.0','hash_algorithm':'SHA256','scope':'全payload。manifest.jsonとSHA256SUMSは自己再帰を避け本listから除外。SHA256SUMSはmanifest.jsonも検証する。','files':files}
 (ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 covered=payload_files()+[ROOT/'manifest.json']
 (ROOT/'SHA256SUMS').write_text(''.join(f'{digest(p)}  {p.relative_to(ROOT).as_posix()}\n' for p in sorted(covered)))
 print(f'manifest: {len(files)} payload files / SHA256SUMS: {len(covered)} files')
def verify():
 m=json.loads((ROOT/'manifest.json').read_text());expected={x['path']:x for x in m['files']};actual={p.relative_to(ROOT).as_posix():p for p in payload_files()};fail=[]
 if set(actual)!=set(expected):fail.append({'file_set_difference':sorted(set(actual)^set(expected))})
 for path,entry in expected.items():
  p=ROOT/path
  if not p.is_file() or digest(p)!=entry['sha256'] or p.stat().st_size!=entry['bytes']:fail.append(path)
 sums={}
 for line in (ROOT/'SHA256SUMS').read_text().splitlines():
  h,path=line.split('  ',1);sums[path]=h
 if set(sums)!=set(expected)|{'manifest.json'}:fail.append('SHA256SUMS scope mismatch')
 for path,h in sums.items():
  p=ROOT/path
  if not p.is_file() or digest(p)!=h:fail.append(path)
 print(json.dumps({'status':'pass' if not fail else 'fail','payload_files':len(expected),'SHA256SUMS_entries':len(sums),'failures':fail},ensure_ascii=False,indent=2));return not fail
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args()
 if args.verify:sys.exit(0 if verify() else 1)
 build()
