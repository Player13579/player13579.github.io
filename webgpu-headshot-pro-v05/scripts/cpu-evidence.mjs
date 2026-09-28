import fs from 'node:fs';import {createHash} from 'node:crypto';import {CONTACT,sampleContact,formCoverage,boundaryAt,packInstance,VARIANTS,RateClock,HeadshotContactSystem} from '../src/index.mjs';
import {FixtureHost,projection,PresentationClock} from '../preview/fixture.mjs';
const report={schema:'DVA-v5-CPU',status:'pass',scope:'ホスト数値/共有境界のみ。shader/材質/PSF/実GPU/聴感ではない。',oneVisualProfile:true,oneSFX:true,lifetime:[],inputEquivalence:[],scheduler:[]};
for(const reduced of [false,true])for(let i=0;i<=120;i++){
 const ageMs=CONTACT.durationMs*i/120,s=sampleContact(ageMs,reduced),sizes={};
 for(const size of [32,64]){const m=formCoverage(size,s);sizes[size]={area:m.reduce((a,b)=>a+b,0),center:m[size/2*size+size/2],sha256:createHash('sha256').update(m).digest('hex')};}
 report.lifetime.push({ageMs,reduced,...s,coverage:sizes});
}
for(const u of [.2,.5,.7]){let ref;for(const variant of VARIANTS){let now=1000;const clock=new RateClock({sourceNow:()=>now}),host=new FixtureHost(clock),sys=new HeadshotContactSystem({clock,verifyCanonical:host.verifyCanonical,getPermission:host.getPermission,roomId:host.roomId,epoch:host.epoch});await sys.accept(host.issue(variant));now+=CONTACT.durationMs*u;const packed=packInstance(sys.frame()[0],projection(32)),sha=createHash('sha256').update(new Uint8Array(packed.buffer)).digest('hex');ref??=sha;report.inputEquivalence.push({variant,u,packedStateSHA256:sha,status:sha===ref?'pass':'failed'});if(sha!==ref)report.status='failed';sys.dispose();}}
for(const dt of [8,1000/60,250]){const t=new PresentationClock(),clock=new RateClock({sourceNow:t.now}),host=new FixtureHost(clock),sys=new HeadshotContactSystem({clock,verifyCanonical:host.verifyCanonical,getPermission:host.getPermission,roomId:host.roomId,epoch:host.epoch});let cycles=0,positive=0,early=0,late=0;
 for(let i=0;i<300;i++){t.advance(i*dt);let f=sys.frame();if(!f.length){await sys.accept(host.issue());cycles++;f=sys.frame();}const s=f[0].envelope;if(s.body>0)positive++;if(s.u>0&&s.u<.15)early++;if(s.u>.85)late++;}
 const ok=cycles>2&&positive>280&&early>0&&late>0;report.scheduler.push({dt,steps:300,cycles,positive,early,late,clampedSteps:t.clampedSteps,discardedWallMs:t.discardedWallMs,status:ok?'pass':'failed'});if(!ok)report.status='failed';sys.dispose();}
report.hardwareGPU='not_run';report.browser='evidence/browser-check.json';report.artisticAcceptance='not_run';
fs.writeFileSync(new URL('../evidence/cpu-trace.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,lifetimeStates:report.lifetime.length,equivalence:report.inputEquivalence.length,scheduler:report.scheduler},null,2));process.exitCode=report.status==='pass'?0:1;
