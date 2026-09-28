#!/usr/bin/env python3
"""SHA256は改変検出であり署名・権威認証ではない。manifest自体は自己参照から除外する。"""
import argparse,hashlib,json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
MAN=ROOT/'SHA256SUMS.json'
def files():
 return sorted(p for p in ROOT.rglob('*') if p.is_file() and p!=MAN and '__pycache__' not in p.parts and '.DS_Store'!=p.name)
def sha256(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');a=p.parse_args()
actual={str(p.relative_to(ROOT)):sha256(p) for p in files()}
if a.write:
 MAN.write_text(json.dumps({'algorithm':'SHA256','excludes':['SHA256SUMS.json','**/__pycache__/**'],'file_count':len(actual),'files':actual},ensure_ascii=False,indent=2)+'\n');print('manifest written:',len(actual),'files')
else:
 expected=json.loads(MAN.read_text())['files']
 errors=[f'mismatch or missing: {name}' for name,h in expected.items() if actual.get(name)!=h]+[f'unlisted: {name}' for name in actual if name not in expected]
 if errors:print('\n'.join(errors));sys.exit(1)
 print('SHA256 verification PASS:',len(actual),'files')
