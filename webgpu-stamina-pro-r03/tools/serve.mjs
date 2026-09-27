import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const port=Number(process.env.PORT??8080);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wgsl':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.wav':'audio/wav','.txt':'text/plain; charset=utf-8'};
createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
  if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`CORELOAD r0.3: http://localhost:${port}\nPress Ctrl+C to stop. No external network dependencies.`));
