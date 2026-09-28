#!/usr/bin/env python3
"""依存なしローカルpreview。外部公開しない。"""
import argparse,http.server,pathlib
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8765);a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.wgsl':'text/plain'}
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root),**kwargs)
print(f'http://localhost:{a.port}/  |  verify: http://localhost:{a.port}/?verify=1',flush=True)
try:http.server.ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
except KeyboardInterrupt:pass
