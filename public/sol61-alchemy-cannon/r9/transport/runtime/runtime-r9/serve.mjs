import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const packageRoot=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(packageRoot,'preview','cannon-r9');
const pins=JSON.parse(fs.readFileSync(path.join(packageRoot,'ROUTE-PINS.json'),'utf8'));
const routes=new Map(pins.routes.map(entry=>['/'+entry.route,entry]));
const shutdownToken=crypto.randomBytes(24).toString('hex');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8'};
const server=http.createServer((req,res)=>{
 if(req.method==='POST'&&req.url==='/__shutdown'){
  if(req.headers['x-codex-stop-token']!==shutdownToken){res.writeHead(403).end('forbidden');return;}
  res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'}).end('stopping');
  server.close(()=>process.exit(0));return;
 }
 if(req.method!=='GET'){res.writeHead(405,{'Allow':'GET'}).end('method not allowed');return;}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400).end('bad request');return;}
 if(pathname==='/')pathname='/gallery.html';
 const entry=routes.get(pathname);if(!entry){res.writeHead(404).end('route not in R9 allowlist');return;}
 const target=path.join(root,entry.route);
 fs.readFile(target,(error,bytes)=>{
  if(error){res.writeHead(500).end('owned route missing');return;}
  const digest=crypto.createHash('sha256').update(bytes).digest('hex');
  if(bytes.length!==entry.bytes||digest!==entry.sha256){res.writeHead(503).end('owned route differs from exact route pin');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)],'Content-Length':String(bytes.length),'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}).end(bytes);
 });
});
server.listen(0,'127.0.0.1',()=>{
 const now=new Date(),address=server.address(),lease={schema:'dva-cannon-r9-private-host-lease/v1',pid:process.pid,port:address.port,host:'127.0.0.1',root,startedAt:now.toISOString(),expiresAt:new Date(now.getTime()+45*60*1000).toISOString(),purpose:'Root-owned GPU/native review of private faithful R9 runtime draft; no public/shared files served.',sourceStatus:'unsealed R9 creative draft copied byte-exactly; not creative approval',stopMethod:'node stop-host-r9.mjs (authenticated local shutdown); auto-exits at expiry',routes:pins.routes.map(({route,bytes,sha256})=>({route,bytes,sha256})),shutdownToken};
 fs.writeFileSync(path.join(packageRoot,'HOST-LEASE.json'),JSON.stringify(lease,null,2)+'\n');
 console.log(JSON.stringify({pid:lease.pid,port:lease.port,host:lease.host,expiresAt:lease.expiresAt,root:lease.root}));
 setTimeout(()=>server.close(()=>process.exit(0)),45*60*1000).unref();
});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
