import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const port=Number(process.env.PORT||8783);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.wgsl':'text/plain; charset=utf-8','.wav':'audio/wav','.png':'image/png','.md':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let name=path.resolve(root,'.'+rel);
    if(name!==root&&!name.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    if((await stat(name)).isDirectory())name=path.join(name,'index.html');
    const data=await readFile(name);
    res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' blob:; media-src 'self' blob:; worker-src 'self'; object-src 'none'; base-uri 'none'"});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`独立Mana r0.3: http://127.0.0.1:${port}/\nGPU検査: http://127.0.0.1:${port}/tests/verify.html\n終了: Ctrl+C`));
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
