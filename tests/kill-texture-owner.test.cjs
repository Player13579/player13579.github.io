const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync(process.env.DVA_APP || require('node:path').join(__dirname,'../app.js'),'utf8');
const start=app.indexOf('function killTextureSourcesForWebGPU(');
const end=app.indexOf('async function createDormantWebGPUMainAppDriver(',start);
const create=start<0?null:vm.runInNewContext(app.slice(start,end)+'\ncreateWebGPUKillTextureOwner');
function harness(){
 const made=[],copies=[];
 const device={limits:{maxTextureDimension2D:8192},createTexture(descriptor){const t={descriptor,destroyCount:0,destroy(){this.destroyCount++},createView(){return {}}};made.push(t);return t},queue:{copyExternalImageToTexture(...args){copies.push(args)}}};
 return {device,made,copies,owner:create(device)};
}
function image(width=2048,height=1940){return {complete:true,naturalWidth:width,naturalHeight:height,src:'a.png'}}
function coverage(assets,source,device){
 const a=app.indexOf('  if (liveKills.length) {',app.indexOf('  const killInput = candidate.stages.killAnimation;'));
 const b=app.indexOf("  if (typeof passes.killAnimation.prepare",a);
 vm.runInNewContext(app.slice(a,b),{assets,liveKills:[{killerIsBot:true}],state:{textures:{worldKillFilamentAtlas:source}},tailResources:{headMarkerDevice:device},normalizeSkinId:x=>x});
}
test('actual current coverage rejects absent upload, owner supplies same-device filament',()=>{
 const source=image();assert.throws(()=>coverage({},source,{}),/loaded kill filament/);
 assert.equal(typeof create,'function','production owner must be wired, not only suppress the guard');
 const h=harness(),out=h.owner.prepare({worldKillFilamentAtlas:source});
 assert.doesNotThrow(()=>coverage(out.assets,source,h.device));assert.equal(out.assets.filament.device,h.device);
});
test('repeated frames reuse one upload; destroy is idempotent',()=>{const h=harness(),textures={worldKillFilamentAtlas:image()};const a=h.owner.prepare(textures),b=h.owner.prepare(textures);assert.equal(a.assets.filament,b.assets.filament);assert.equal(h.copies.length,1);h.owner.destroy();h.owner.destroy();assert.equal(h.made[0].destroyCount,1);assert.throws(()=>a.assertCurrent(textures),e=>e.code==='DVA_WEBGPU_STALE_SCENE');});
test('same image changed URI retires old upload and invalidates held preparation',()=>{const h=harness(),textures={worldKillFilamentAtlas:image()},a=h.owner.prepare(textures);textures.worldKillFilamentAtlas.src='b.png';assert.throws(()=>a.assertCurrent(textures),/source or owner/);h.owner.prepare(textures);assert.equal(h.copies.length,2);assert.equal(h.made[0].destroyCount,1);});
test('source replacement and readiness changes invalidate after async boundary',()=>{const h=harness(),textures={worldKillFilamentAtlas:image()},a=h.owner.prepare(textures);textures.worldKillFilamentAtlas=image();assert.throws(()=>a.assertCurrent(textures),/source or owner/);const b=h.owner.prepare(textures);textures.worldKillFilamentAtlas.complete=false;assert.throws(()=>b.assertCurrent(textures),/source or owner/);});
test('incomplete optional sources are absent, not uploaded',()=>{const h=harness(),source=image();source.complete=false;assert.equal(Object.keys(h.owner.prepare({worldKillFilamentAtlas:source}).assets).length,0);assert.equal(h.copies.length,0);});
test('upload exceptions release the failed texture',()=>{const h=harness();h.device.queue.copyExternalImageToTexture=()=>{throw Error('copy failed')};assert.throws(()=>h.owner.prepare({worldKillFilamentAtlas:image()}),/copy failed/);assert.equal(h.made[0].destroyCount,1);h.owner.destroy();assert.equal(h.made[0].destroyCount,1);});
test('oversized images are rejected before allocation',()=>{const h=harness();assert.throws(()=>h.owner.prepare({worldKillFilamentAtlas:image(9000,10)}),/device limits/);assert.equal(h.made.length,0);});
test('injected cross-device texture rejected by actual candidate guard',()=>{const h=harness(),source=image(),out=h.owner.prepare({worldKillFilamentAtlas:source});assert.throws(()=>coverage(out.assets,source,{}),/does not match/);});
test('driver integrates owner, late-source check, and residual submission acknowledgement',()=>{assert.match(app,/killAssets = null/);assert.match(app,/killTextureOwner = createWebGPUKillTextureOwner\(device\)/);assert.match(app,/killTextureOwner\?\.destroy\(\)/);assert.match(app,/prepared\.killUpload\?\.assertCurrent\(state.textures\)/);assert.match(app,/submitBloom: ownedBloomEncoder/);assert.match(app,/acknowledgeBloomSubmission/);});
function driverPreparation({injected=null,residual=false,mutate=false}={}) {
 const h=harness(),events=[];
 const textures=residual?{worldKillResidual:image(128,128)}:{worldKillFilamentAtlas:image()};
 const captured={stages:{killAnimation:{effects:[{startedAt:0}],now:10}},assertCurrent(){},viewport:{},camera:{x:0,y:0,zoom:1},zoom:1,remainingStages:[]};
 const begin=app.indexOf('            const killInput = captured.stages.killAnimation;');
 const finish=app.indexOf('            const prepared = scene.prepare',begin);
 assert.ok(begin>=0&&finish>begin);
 h.device.createCommandEncoder=()=>({finish(){events.push('finish');return {}},beginRenderPass(){}});
 h.device.queue.submit=()=>events.push('submit');
 const context={captured,device:h.device,killAssets:injected,killTextureOwner:null,
  createWebGPUKillTextureOwner:create,state:{textures},bloomEncoder:null,residualRevision:0,
  registry:{passes:{killAnimation:{acknowledgeBloomSubmission(){events.push('ack')}}}},
  currentMarkerMaterials:{},textAtlas:{},markerDomFallbackReady:false,expandedCanvas:{},expandedTarget:'expanded',acquisitionCanvas:{},acquisitionTarget:'acq',
  markWebGPUStartupStage(){},candidatePrepareStartedAt:null,WEBGPU_MAIN_VERIFY_ROUTE:false,destroyed:false,
  viewport:captured.viewport,camera:captured.camera,sceneApi:{REQUIRED:[]},
  async prepareWebGPUMainAppWorldCandidate(captured,passes,atlas,tail){
   if(!residual)coverage(tail.killAssets,textures.worldKillFilamentAtlas,h.device);
   else {assert.ok(tail.killAssets.residual);assert.ok(tail.bloomEncoder);tail.submitBloom();}
   if(mutate)textures.worldKillFilamentAtlas.src='new.png';
   return {...captured,stages:{killAnimation:{preparedPlan:{bloomTexture:residual?{}:null}}}};
  }};
 const fn=vm.runInNewContext('(async()=>{'+app.slice(begin,finish)+'return killUpload;})',context);
 return {h,events,run:fn};
}
test('actual driver prepare supplies absent/null injection and uploads on its device',async()=>{const h=driverPreparation();await h.run();assert.equal(h.h.copies.length,1);assert.equal(h.events.length,0)});
test('actual driver prepare retains explicit empty injection failure',async()=>{await assert.rejects(driverPreparation({injected:{}}).run(),/loaded kill filament/)});
test('actual driver prepare rejects URI change during async material preparation',async()=>{await assert.rejects(driverPreparation({mutate:true}).run(),/source or owner/)});
test('actual driver residual preparation submits then acknowledges same-device bloom',async()=>{const h=driverPreparation({residual:true});await h.run();assert.deepEqual(h.events,['finish','submit','ack'])});
test('real kill pass submits cached bloom before a later text failure, then retry succeeds',async()=>{
 const api=require('../webgpu-kill-animation.js'),events=[],texture={createView(){}};
 let failText=true,cached=false;
 const pass=api.create({textAtlas:{textures:[],layout(){},async ensure(){events.push('text');if(failText)throw Error('text stale')}},bloom:{prepare(){events.push(cached?'cache':'encode');cached=true;return {texture,width:128,height:128}}}});
 const input={effects:[{x:10,y:10,startedAt:0,duration:1000,killerIsBot:true}],now:100,camera:{x:0,y:0},zoom:1,viewport:{width:640,height:480},assets:{residual:{texture,width:128,height:128}},bloomEncoder:{beginRenderPass(){}},submitBloom(){events.push('submit')}};
 await assert.rejects(pass.prepare(input),/text stale/);
 assert.deepEqual(events,['encode','submit','text']);
 failText=false;const plan=await pass.prepare(input);pass.acknowledgeBloomSubmission(plan);
 assert.equal(plan.drawn,true);assert.deepEqual(events.slice(3),['cache','submit','text']);
});
