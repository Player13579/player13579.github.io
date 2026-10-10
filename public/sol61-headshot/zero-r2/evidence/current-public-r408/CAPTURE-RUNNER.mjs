import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'file:///C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const dir=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:([A-Za-z]):)/,'$1:'));
const run=path.join(dir,'runs',new Date().toISOString().replaceAll(':','-')+'-'+crypto.randomUUID());fs.mkdirSync(run,{recursive:true});
const report={runnerSha256:crypto.createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),scope:'Actual current public normal gallery preview; screenshots and viewport recording only. No injected per-frame readback, age forcing, native receipt/PTS join, quality/adoption/game acceptance implied.',computerUseFailure:'cua.createBrowserTab failed before acquiring a tab: failed to write kernel assets, os error3; user tabs untouched',startedAtUtc:new Date().toISOString(),pageErrors:[],consoleErrors:[],snapshots:[],cleanup:{}};
let browser,context,page,video;
try{
browser=await chromium.launch({headless:false,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',timeout:30000,args:['--no-first-run','--enable-unsafe-webgpu','--enable-features=Vulkan','--disable-background-timer-throttling']});
context=await browser.newContext({viewport:{width:1240,height:860},recordVideo:{dir:path.join(run,'video-temp'),size:{width:1240,height:860}}});page=await context.newPage();video=page.video();
page.on('pageerror',e=>report.pageErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
const url='https://player13579.github.io/webgpu-e-gallery.html?verify=headshot-r2-normal-visible-r399&category=effect&filter=unadopted&asset=gunner-headshot-sol&version=headshot-zero-sol61-r2';report.url=url;
const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});if(response?.status()!==200)throw Error('Gallery HTTP not200');
await page.waitForFunction(()=>{const f=document.querySelector('#stage iframe');return window.__webgpuEGallery?.initialDeepLink?.version==='headshot-zero-sol61-r2'&&f?.src.includes('/sol61-headshot/zero-r2/package/');},null,{timeout:25000});
const ownedFrame = await (await page.locator('#stage iframe').elementHandle()).contentFrame();
await ownedFrame.waitForFunction(()=>globalThis.__headshotZero?.snapshot().ready,null,{timeout:25000});
await ownedFrame.evaluate(()=>{
 const marker=parent.document.createElement('div');marker.id='root-natural-clock';marker.style.cssText='position:fixed;bottom:0;left:0;width:420px;height:16px;z-index:99999;color:white;background:black;font:12px monospace;pointer-events:none';marker.textContent="natural runtime clock pending first sample";parent.document.body.append(marker);
 const r=marker.getBoundingClientRect(); if(r.width<=0||r.height<=0||r.bottom>parent.innerHeight||r.left<0)throw Error("Clock marker outside actual viewport"); globalThis.__rootMarkerGeometry={rect:{x:r.x,y:r.y,width:r.width,height:r.height},viewport:{width:parent.innerWidth,height:parent.innerHeight}}; globalThis.__rootNaturalSamples=[];
 globalThis.__rootNaturalTimer=setInterval(()=>{const s=globalThis.__headshotZero.snapshot();const r={at:performance.now(),age:s.ageMs,cause:s.cause,generation:s.generation,mode:s.mode,submitted:s.submitted,completed:s.completed,lastReceipt:s.lastReceipt};globalThis.__rootNaturalSamples.push(r);marker.textContent=JSON.stringify({at:Math.round(r.at),age:Math.round(r.age),cause:r.cause,completed:r.completed});},40);
});
for(let i=0;i<4;i++){
await page.waitForTimeout(i===0?2000:1700);
const iframe=page.locator('#stage iframe');const frameElement=await iframe.elementHandle();const frame=await frameElement?.contentFrame();if(!frame||typeof frame.evaluate!=='function')throw Error('Selected iframe did not yield an evaluable Page Frame');
const state=await frame.evaluate(()=>({url:location.href,visibility:document.visibilityState,body:{...document.body.dataset},diagnostic:({text:document.body.innerText.slice(0,1000),canvases:[...document.querySelectorAll("canvas")].map(c=>({id:c.id,width:c.width,height:c.height,rect:{x:c.getBoundingClientRect().x,y:c.getBoundingClientRect().y,width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height}}))})}));
const file='sample-'+i+'.png';await iframe.screenshot({path:path.join(run,file),timeout:10000});report.snapshots.push({index:i,atUtc:new Date().toISOString(),file,state});
}
report.markerGeometry=await ownedFrame.evaluate(()=>globalThis.__rootMarkerGeometry); report.temporalSamples=await ownedFrame.evaluate(()=>{clearInterval(globalThis.__rootNaturalTimer);return globalThis.__rootNaturalSamples;});report.status='CAPTURED_NORMAL_PUBLIC_PREVIEW_QUALITY_PENDING';
}catch(e){report.status='FAIL_NORMAL_PUBLIC_PREVIEW';report.error=String(e?.stack||e);if(page)try{await page.screenshot({path:path.join(run,'failure.png'),timeout:5000});}catch{}}
finally{
try{if(context){await context.close();report.cleanup.contextClosed=true;}}catch(e){report.cleanup.contextError=String(e)}
try{if(video&&report.cleanup.contextClosed){const file=path.join(run,'viewport.webm');await video.saveAs(file);const bytes=fs.readFileSync(file);report.video={file:'viewport.webm',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}}catch(e){report.videoError=String(e)}
try{if(browser){await browser.close();report.cleanup.browserClosed=!browser.isConnected();}}catch(e){report.cleanup.browserError=String(e)}
report.finishedAtUtc=new Date().toISOString();fs.writeFileSync(path.join(run,'RESULT.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({run,status:report.status,video:report.video,cleanup:report.cleanup}));
}
if(report.status.startsWith('FAIL'))process.exitCode=1;
