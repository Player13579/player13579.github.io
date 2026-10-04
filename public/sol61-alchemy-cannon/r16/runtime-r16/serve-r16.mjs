import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const preview=path.join(root,'preview','cannon-r16');
const pins=JSON.parse(fs.readFileSync(path.join(root,'ROUTE-PINS.json'),'utf8'));
const routes=new Map(pins.routes.map(route=>['/'+route.route,route]));
const token=crypto.randomBytes(32).toString('hex');
const start=Date.now(),ttl=30*60*1000;
const cookie=`r16review=${token}`;
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8'};
const reviewQuery=new URLSearchParams({verify:'1',mode:'single-pulse-ready',variant:'continuous',source:'1',observation:'0',reducedMotion:'0'});
const server=http.createServer((req,res)=>{
 if(req.method==='POST'&&req.url==='/__shutdown'){
  if(req.headers['x-codex-stop-token']!==token){res.writeHead(403,{'Cache-Control':'no-store'}).end('forbidden');return;}
  res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'}).end('stopping');
  server.close(()=>process.exit(0));return;
 }
 if(req.method!=='GET'){res.writeHead(405,{'Allow':'GET','Cache-Control':'no-store'}).end('method not allowed');return;}
 let url;try{url=new URL(req.url,'http://127.0.0.1');}catch{res.writeHead(400,{'Cache-Control':'no-store'}).end('bad request');return;}
 let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400,{'Cache-Control':'no-store'}).end('bad route');return;}
 if(pathname==='/')pathname='/gallery.html';
 const lease=url.searchParams.get('lease');
 if(lease!==null){
  if(pathname!=='/gallery.html'||lease!==token){res.writeHead(403,{'Cache-Control':'no-store'}).end('invalid lease');return;}
  url.searchParams.delete('lease');
  res.writeHead(302,{'Set-Cookie':`${cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`,'Location':`${url.pathname}${url.search}`,'Cache-Control':'no-store'}).end();return;
 }
 if(!(req.headers.cookie||'').split(';').some(v=>v.trim()===cookie)){res.writeHead(403,{'Cache-Control':'no-store'}).end('valid review lease required');return;}
 const route=routes.get(pathname);if(!route){res.writeHead(404,{'Cache-Control':'no-store'}).end('route not in exact R16 allowlist');return;}
 fs.readFile(path.join(preview,route.route),(err,bytes)=>{
  if(err){res.writeHead(500,{'Cache-Control':'no-store'}).end('route missing');return;}
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  if(bytes.length!==route.bytes||hash!==route.sha256){res.writeHead(503,{'Cache-Control':'no-store'}).end('route differs from R16 pin');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(route.route)],'Content-Length':String(bytes.length),'Cache-Control':'no-store','X-Codex-Route-SHA256':hash}).end(bytes);
 });
});
server.listen(0,'127.0.0.1',()=>{
 const address=server.address(),base=`http://${address.address}:${address.port}`;
 const lease={schema:'dva-cannon-r16-native-review-host-lease/v1',pid:process.pid,host:'127.0.0.1',port:address.port,startedAt:new Date(start).toISOString(),expiresAt:new Date(start+ttl).toISOString(),ttlMs:ttl,runtimeRoot:root,purpose:'Root actual GPU OFF220/ON220 initial R16 material gate using cause-preserving review API; exact five routes only; authenticated short-lived loopback lease.',verifyModeRequired:true,routePins:pins.routes,reviewUrl:`${base}/gallery.html?${reviewQuery.toString()}&lease=${token}`,rootApi:'After page startup and screencast subscription: await window.__alchemyCannonNativeReview.capturePulsePhase({phaseMs:220,causeId:"cannon-r16-root-review"}); toggle the OBS checkbox OFF/ON between matched captures and use the same API cause again. Read window.__alchemyCannonProof.nativePulseProof.gpuConfiguration for the actual format/alpha/blend/depth-sample receipt.',cleanupScript:'stop-host.ps1 (identity checked process, token shutdown, then verify process and port closed)',shutdownToken:token};
 fs.writeFileSync(path.join(root,'HOST-LEASE.json'),JSON.stringify(lease,null,2)+'\n');
 console.log(JSON.stringify({pid:lease.pid,host:lease.host,port:lease.port,expiresAt:lease.expiresAt,reviewUrl:lease.reviewUrl,runtimeRoot:root}));
 const timeout=setTimeout(()=>server.close(()=>process.exit(0)),ttl);timeout.unref();
});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
