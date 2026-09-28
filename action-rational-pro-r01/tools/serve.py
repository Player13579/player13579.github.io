#!/usr/bin/env python3
"""Python標準ライブラリだけでlocalhost起動。外部公開はしない。"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse, functools, threading, webbrowser
ROOT = Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.wgsl':'text/plain','.json':'application/json','.wav':'audio/wav'}
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
def main():
    p=argparse.ArgumentParser(description='DVA E独立プレビュー');p.add_argument('--port',type=int,default=8765);p.add_argument('--no-open',action='store_true');a=p.parse_args()
    try: server=ThreadingHTTPServer(('127.0.0.1',a.port),functools.partial(Handler,directory=str(ROOT)))
    except OSError as e: p.exit(1,f'起動失敗: {e}\n--port 8766 等で未使用ポートを指定してください。\n')
    url=f'http://127.0.0.1:{a.port}/index.html'
    print(f'DVA E Lab: {url}\n停止: Ctrl+C',flush=True)
    if not a.no_open: threading.Timer(.3,lambda:webbrowser.open(url)).start()
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__=='__main__': main()
