import http from 'node:http';import {readFile,stat} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),port=Number(process.env.PORT||8765);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wgsl':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.wav':'audio/wav','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let p=path.resolve(root,'.'+name);
  if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  const s=await stat(p);if(s.isDirectory())p=path.join(p,'index.html');
  const data=await readFile(p);res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Mana E gallery: http://127.0.0.1:${port}\nCtrl+Cで終了。外部ネットワークへは公開しません。`));
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
