import assert from 'node:assert/strict';
import {RELOAD_VERSION,planReloadFrame,packReloadUniform,sampleReloadMechanism,createReloadReceiptState,GEOMETRY_CONTRACT} from '../creative/reload-e-sol61-r2.mjs';
import {renderReloadPcm,createReloadSfx} from '../creative/reload-e-sfx-sol61-r2.mjs';
const checks=[],test=(name,fn)=>{fn();checks.push({name,status:'pass'});};
const frame=(ageMs=0,changes={})=>planReloadFrame({causeId:'r2-test',clockKind:'fixture',phase:'start',weaponId:'handgun',ageMs,pending:true,heightPx:64,viewport:[640,360],anchor:[320,180],...changes});
test('H64 actual shape contract preserves one receiving aperture and broad supply proportions',()=>{
 const p=sampleReloadMechanism(frame(480));assert.equal(p.receiverWidthPx,48.64);assert.equal(p.supplyWidthPx,25.6);assert.equal(p.supplyHeightPx,21.76);assert.equal(p.physicalAmmoCount,null);assert.equal(GEOMETRY_CONTRACT.mouthYH,0);
});
test('supply advances to the same receiver mouth and pending holds without pretending completion',()=>{
 const ages=[0,80,160,320,480,1000,100000],s=ages.map(x=>sampleReloadMechanism(frame(x)));
 for(let i=1;i<5;i++)assert.ok(s[i].supplyCenterYH>s[i-1].supplyCenterYH);
 assert.ok(s[0].supplyTopYH<0);assert.ok(s[4].supplyTopYH>0);assert.equal(s[4].stage,'pending-open');assert.equal(s[4].seat,0);assert.equal(s[4].latch,0);assert.equal(s[4].supplyCenterYH,s[6].supplyCenterYH);
});
test('complete seats before latch; locked broad body persists until finite fade and620 equality clear',()=>{
 const at=age=>sampleReloadMechanism(frame(age,{phase:'complete',pending:false}));
 assert.equal(at(0).supplyCenterYH,-.13);assert.equal(at(240).seat,1);assert.equal(at(240).latch,0);assert.equal(at(260).latch,0);assert.ok(at(300).latch>0);assert.equal(at(380).latch,1);assert.equal(at(410).stage,'locked');assert.equal(at(500).stage,'clear-decay');assert.equal(at(620).active,false);
 assert.ok(at(240).supplyTopYH<.35);assert.ok(at(240).supplyBottomYH<0);assert.equal(at(240).stage,'seated');
});
test('negative age,source/main/visibility/cancel gates suppress active; expiry boundaries exact',()=>{
 for(const opts of [{ageMs:-1},{mainOn:false},{sourceOn:false},{visibility:0},{cancelled:true}])assert.equal(frame(50,opts).active,false);
 assert.equal(frame(480,{pending:false}).active,false);assert.equal(frame(479.999,{pending:false}).active,true);assert.equal(frame(480,{pending:true}).active,true);
 assert.equal(frame(620,{phase:'complete'}).active,false);
 const u=packReloadUniform(frame(500,{sourceOn:false}));assert.equal(u[8],0);assert.equal(packReloadUniform(frame(500,{mainOn:false}))[10],0);assert.equal(packReloadUniform(frame(500,{obsOn:false}))[9],0);
});
test('same-source uniform128 and all actor phases finite across realtime scale/angle variants',()=>{
 for(const h of [32,64,128])for(const a of [-Math.PI,.18,Math.PI/2])for(const phase of ['start','complete'])for(let t=0;t<=700;t+=7){const p=frame(t,{heightPx:h,angleRad:a,phase});const u=packReloadUniform(p);assert.equal(u.byteLength,128);assert.ok(u.every(Number.isFinite));assert.ok(Number.isFinite(sampleReloadMechanism(p).supplyCenterYH));}
 assert.throws(()=>packReloadUniform({...frame(10),obsSourceId:'other'}));assert.throws(()=>frame(0,{heightPx:0}));
});
test('reduced motion shortens only initial transport; pending alignment/seating/latchedstate preserved',()=>{
 const normal=sampleReloadMechanism(frame(0)),reduced=sampleReloadMechanism(frame(0,{reducedMotion:true}));assert.ok(Math.abs(reduced.supplyCenterYH)<Math.abs(normal.supplyCenterYH));
 assert.equal(sampleReloadMechanism(frame(480,{reducedMotion:true})).supplyCenterYH,sampleReloadMechanism(frame(480)).supplyCenterYH);
 assert.equal(sampleReloadMechanism(frame(380,{phase:'complete',reducedMotion:true})).latch,1);
});
test('real receipt contract preserved: duplicate rejected, pending holds, completedifferentcause retiresstart, cancellationclears',()=>{
 const state=createReloadReceiptState();const receipt=(id,variant)=>({type:'action-reload',id,playerId:'player1',variant,x:3,y:4});
 assert.equal(state.admit(receipt('start','handgun:start'),1000).admitted,true);assert.equal(state.admit(receipt('start','handgun:start'),1000).reason,'duplicate');
 state.syncPending({playerId:'player1',pending:true,weaponId:'handgun'},1020);const geometry=()=>({heightPx:64,viewport:[640,360],anchor:[320,180]});
 assert.equal(state.sample(5000,geometry)[0].active,true);const complete=state.admit(receipt('done','handgun:complete'),5100);assert.equal(complete.run.causeId,'done');assert.equal(state.snapshot().runs.length,1);
 assert.equal(state.sample(5719,geometry).length,1);assert.equal(state.sample(5720,geometry).length,0);
 state.admit(receipt('restart','smg:start'),6000);state.syncPending({playerId:'player1',pending:false},6010);assert.equal(state.sample(6010,geometry).length,0);state.dispose();assert.throws(()=>state.admit(receipt('later','smg:start'),6020));
});
test('new R2 PCM is finite with exact bounded endpoints anddistinctphase envelopes',()=>{
 const start=renderReloadPcm({phase:'start'}),complete=renderReloadPcm({phase:'complete'});assert.equal(start.duration,.47);assert.equal(complete.duration,.55);
 for(const s of [start,complete]){assert.equal(s.pcm[0],0);assert.equal(s.pcm.at(-1),0);assert.ok(s.pcm.every(Number.isFinite));assert.ok(s.pcm.some(x=>Math.abs(x)>.01));assert.ok(Math.max(...s.pcm.map(Math.abs))<.5);}
 assert.notEqual(start.pcm.length,complete.pcm.length);
});
test('preserved technical soundowner respects verifyzero andsamecauseonce',()=>{
 let starts=0;const node=()=>({connect(){},disconnect(){},gain:{value:0,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},pan:{value:0}});
 const context={state:'running',sampleRate:48000,currentTime:0,createGain:node,destination:{},createBuffer:(a,n)=>({getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>({...node(),start(){starts++;},stop(){}})};
 const zero=createReloadSfx({context,verify:true});assert.equal(zero.play({causeId:'x',phase:'start'}).reason,'verify-zero');assert.equal(starts,0);
 const sfx=createReloadSfx({context});assert.equal(sfx.play({causeId:'r2-start',phase:'start'}).played,true);assert.equal(sfx.play({causeId:'r2-start',phase:'start'}).reason,'duplicate');assert.equal(starts,1);sfx.dispose();
});
console.log(JSON.stringify({schema:'reload-r2-creative-mechanism-tests/v1',edition:RELOAD_VERSION,passed:checks.length,checks,WGSLCompilation:'not_run',actualPixels:'not_run',artisticQuality:'not_run',normalListening:'not_run',limits:['Numerical mechanism andtechnicalownership only','Primary actualparentR1observation attributed; no local screenshotavailable']},null,2));
