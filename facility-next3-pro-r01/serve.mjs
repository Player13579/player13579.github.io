import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,stat} from 'node:fs/promises';
const root=path.dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||8766);
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wgsl':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.wav':'audio/wav','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
    const uri=decodeURIComponent(new URL(req.url,'http://localhost').pathname),target=path.resolve(root,'.'+(uri==='/'?'/index.html':uri));
    if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const info=await stat(target);if(!info.isFile())throw new Error('not file');
    const data=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`通常: http://127.0.0.1:${port}/\n無音検証: http://127.0.0.1:${port}/?verify=1\nCtrl+Cで終了`));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
