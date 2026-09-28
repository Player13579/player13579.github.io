import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),port=Number(process.argv[2]??4184);
if(!Number.isInteger(port)||port<1||port>65535)throw new RangeError('port must be 1..65535');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wgsl':'text/plain; charset=utf-8','.json':'application/json','.md':'text/plain; charset=utf-8','.png':'image/png','.wav':'audio/wav','.mp4':'video/mp4','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('GET/HEAD only');return;}
  try{
    const pathname=decodeURIComponent((req.url??'/').split('?')[0]);
    if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').includes('..')){res.writeHead(403);res.end('Forbidden');return;}
    let target=path.resolve(root,'.'+pathname);if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);res.end('Forbidden');return;}
    const stat=await fs.stat(target);if(stat.isDirectory())target=path.join(target,'index.html');
    const body=await fs.readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:400);res.end('Not found or invalid request');}
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log(`Mana E r0.4 · http://localhost:${port}\nLoopback only. No telemetry or game connection.`));
