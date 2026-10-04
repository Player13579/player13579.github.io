import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const lease=JSON.parse(fs.readFileSync(path.join(root,'HOST-LEASE.json'),'utf8'));
const startUrl=new URL(lease.reviewUrl),base=startUrl.origin;
assert.equal(startUrl.searchParams.get('verify'),'1');
assert.equal(startUrl.searchParams.get('mode'),'single-pulse-ready');
assert.equal(startUrl.searchParams.get('source'),'1');
assert.equal(startUrl.searchParams.get('observation'),'0');
assert.equal(startUrl.searchParams.get('reducedMotion'),'0');
const initial=await fetch(lease.reviewUrl,{redirect:'manual'});assert.equal(initial.status,302);
const redirected=new URL(initial.headers.get('location'),lease.reviewUrl);
for(const key of ['verify','mode','variant','source','observation','reducedMotion'])assert.equal(redirected.searchParams.get(key),startUrl.searchParams.get(key),`redirect lost ${key}`);
const setCookie=initial.headers.get('set-cookie');assert(setCookie?.startsWith('r16review='));
const cookie=setCookie.split(';')[0],routes=[];
for(const pin of lease.routePins){
 const response=await fetch(`${base}/${pin.route}`,{headers:{cookie}}),bytes=Buffer.from(await response.arrayBuffer());
 const hash=crypto.createHash('sha256').update(bytes).digest('hex');
 assert.equal(response.status,200,pin.route);assert.equal(bytes.length,pin.bytes,pin.route);assert.equal(hash,pin.sha256,pin.route);
 const expectedMime=pin.route.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8';
 assert.equal(response.headers.get('content-type'),expectedMime,pin.route);assert.equal(response.headers.get('x-codex-route-sha256'),pin.sha256,pin.route);
 routes.push({route:pin.route,status:response.status,bytes:bytes.length,sha256:hash,mime:response.headers.get('content-type')});
}
const denied=await fetch(`${base}/main.mjs`);assert.equal(denied.status,403);
const bad=await fetch(`${base}/gallery.html?verify=1&lease=bad`,{redirect:'manual'});assert.equal(bad.status,403);
const extra=await fetch(`${base}/not-allowed.json`,{headers:{cookie}});assert.equal(extra.status,404);
const result={schema:'dva-cannon-r16-native-host-route-check/v1',status:'pass',reviewStartupMode:'single-pulse-ready; no event auto-triggered',redirectPreservedVerifyAndControls:true,routes,unauthorizedStatus:denied.status,badLeaseStatus:bad.status,unlistedRouteStatus:extra.status,actualGpuReceiptAvailableAt:'window.__alchemyCannonProof.nativePulseProof.gpuConfiguration after root capture'};
fs.writeFileSync(path.join(root,'HOST-ROUTE-CHECK.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
