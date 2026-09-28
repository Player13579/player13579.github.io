import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||8080);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wgsl':'text/plain; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wav':'audio/wav','.md':'text/plain; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Bad request');return;}
  const name=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(name!==root&&!name.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(name,(err,s)=>{if(err||!s.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(name).pipe(res);
  });
});
server.on('error',e=>{console.error(`Cannot start: ${e.message}. Set PORT to use another port.`);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`EMP E r0.3  http://localhost:${port}\nKeep this process open. Ctrl+C to stop. No network dependencies.`));
