const params=new URLSearchParams(location.search), verify=params.has('verify');
const VERSION_ID='preparation-summon-gallery-fit-r2';
const canvas=document.querySelector('#preview'),status=document.querySelector('#status'),receipt=document.querySelector('#receipt');
const $=id=>document.getElementById(id),clockNow=()=>performance.now();
const fixtureManifest=await (await fetch('material-fixtures.json',{cache:'no-store'})).json();
const registration=await (await fetch('material-registration.json',{cache:'no-store'})).json();
function fixedH64Zoom(skin){const row=registration.materials.find(x=>x.skin===skin);if(!row||!Number.isFinite(row.H64FixedCameraZoom))throw new Error(`No frozen H64 registration for ${skin}`);return row.H64FixedCameraZoom;}
const expected=new Map(fixtureManifest.fixtures.map(f=>[f.skin,f]));
const hex=buffer=>[...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function loadFixture(skin){const row=expected.get(skin);if(!row)throw new Error(`Unknown atlas ${skin}`);const bytes=await (await fetch(row.entry.assetPath,{cache:'no-store'})).arrayBuffer();const digest=hex(await crypto.subtle.digest('SHA-256',bytes));if(digest.toLowerCase()!==row.entry.assetSha256.toLowerCase())throw new Error(`Atlas SHA-256 mismatch: ${skin}`);const image=new Image();image.src=row.entry.assetPath;await image.decode();return {entry:row.entry,image,productionScaleMultiplier:row.productionScaleMultiplier};}
let audioContext=null,master=null,muted=false,runtime=null,renderer=null,target=null,resizePending=false,rafStart=0,seeking=false;
const audioLedger=DvaWebGPEEventSfx.createLedger({maxEntries:256,retentionMs:30000});
const cuePlayer=DvaWebGPUECuePlayer.createPlayer({getContext:()=>audioContext,getMaster:()=>master,isMuted:()=>verify||muted,maxVolume:.22,maxLateMs:180,maxLayers:8,maxLayerMs:700,maxEntries:256,retentionMs:30000});
const audio={ledger:audioLedger,player:cuePlayer,getState:()=>({verify,supported:Boolean(window.AudioContext||window.webkitAudioContext),contextState:verify?'closed':audioContext?.state||'suspended',masterGain:verify?0:Number(master?.gain?.value)||0,muted:verify||muted,hidden:document.visibilityState==='hidden'})};
const startupBridge=DvaPreparationGalleryHostBridge.create({params,startup:window.__dvaGalleryStartup,windowRef:window,
  documentRef:document,canvas,verify,unlockAudio,getAudioSnapshot:audio.getState});
window.__dvaGalleryStartupSnapshot=()=>startupBridge.getSnapshot()||window.__dvaGalleryStartup?.snapshot?.()||null;
window.__gallerySfx=startupBridge.sfx;
document.documentElement.classList.toggle('embed',params.get('embed')==='1');
function show(s){status.textContent=s;}
function updateReceipt(snapshot){receipt.textContent=JSON.stringify(snapshot,null,2);}
function dimensions(){const dpr=Math.max(1,Number(devicePixelRatio)||1);return {width:Math.max(1,Math.round(384*dpr)),height:Math.max(1,Math.round(320*dpr)),dpr};}
async function initialize(){
  startupBridge.report('adapter','pending');startupBridge.report('adapter','ready');
  startupBridge.report('device','pending');
  try{
    const size=dimensions();canvas.width=size.width;canvas.height=size.height;
    renderer=await DvaWebGPURenderer.create({gpu:navigator.gpu,onFailure:error=>{show(`WebGPU failed: ${error?.message||error}`);startupBridge.fail(error,'WEBGPU_RENDERER_FAILURE');}});
    startupBridge.report('device','ready');startupBridge.report('assets','pending');
    const fixtures={};for(const skin of ['white-hood','blue-dress','male-bot'])fixtures[skin]=await loadFixture(skin);
    startupBridge.report('assets','ready');startupBridge.report('pipelines','pending');
    target=renderer.registerTarget('preparation-summon-preview',canvas,{width:size.width,height:size.height,logicalWidth:384,logicalHeight:320,alphaMode:'premultiplied'});
    const textureCache=DvaWebGPUPlayerSprite.createTextureCache(renderer.device);
    const pass=DvaWebGPUPreparationSummons.create({device:renderer.device});
    runtime=DvaPreparationSummonGalleryRuntime.create({renderer,targetId:'preparation-summon-preview',pass,spriteApi:DvaWebGPUPlayerSprite,textureCache,fixtures,audio,startupBridge,canvas,verify,getBackingSize:()=>({width:target.width,height:target.height}),documentRef:document,onStatus:s=>{if(s.stage==='queue-complete'){updateReceipt(runtime.snapshot());show(`Frame ${s.frameId} submitted and queue fulfilled; ${s.effectCount} active E, ${s.actorCount} visible fixture actors.`);}else if(s.error)show(`${s.stage}: ${s.error}`);}});
    DvaWebGPUPreparationSummons.plan({scene:{active:false,nowMs:0,roomId:'preparation-summon-gallery-r1',roomSessionGeneration:0,players:[],entries:new Map(),reducedMotion:false},camera:{x:0,y:0},zoom:1,viewport:{width:384,height:320,pixelWidth:size.width,pixelHeight:size.height}});
    document.addEventListener('visibilitychange',()=>runtime?.setVisible(document.visibilityState!=='hidden'));
    window.addEventListener('resize',()=>{resizePending=true;});
    let heldRefresh=Promise.resolve();const refreshHeld=()=>{if(!seeking)return;const age=Number($('seek').value);heldRefresh=heldRefresh.then(()=>runtime.drawAt(clockNow()-rafStart,{heldAge:age})).catch(error=>show(`Held preview failed: ${error.message}`));};
    const applyView=()=>runtime.setView({zoom:$('h64').checked?fixedH64Zoom($('skin').value):1,camera:{x:0,y:0}});
    $('skin').addEventListener('change',event=>{runtime.setSkin(event.target.value);applyView();runtime.resetPlayback();rafStart=clockNow();refreshHeld();});
    $('h64').addEventListener('change',()=>{applyView();runtime.resetPlayback();rafStart=clockNow();refreshHeld();});
    $('add-human').addEventListener('click',()=>{const idx=runtime.snapshot().participants.filter(p=>p.id!=='human-self').length+1;runtime.addHuman({id:`human-other-${idx}`,label:`Other human ${idx}`,x:105+((idx-1)%2)*72,y:184});refreshHeld();});
    $('remove-other').addEventListener('click',()=>{for(const p of runtime.snapshot().participants)if(p.id!=='human-self')runtime.removeHuman(p.id);refreshHeld();});
    $('session').addEventListener('click',()=>{if(runtime.snapshot().sessionActive){runtime.endSession();$('session').textContent='Start fixture session';}else{runtime.startSession();$('session').textContent='End fixture session';}refreshHeld();});
    $('source').addEventListener('change',event=>{runtime.setSourceOn(event.target.checked);refreshHeld();});
    $('reduced').addEventListener('change',event=>{runtime.setReducedMotion(event.target.checked);refreshHeld();});
    $('e-only').addEventListener('change',event=>{runtime.setTransparentEOnly(event.target.checked);refreshHeld();});
    $('muted').addEventListener('change',event=>{muted=event.target.checked;runtime?.audioPolicyChanged();if(muted)cuePlayer.stopAll();if(master)master.gain.setTargetAtTime(muted?0:.22,audioContext.currentTime,.008);$('audio-state').textContent=muted?'Muted; arrivals are consumed without sound.':audioContext?.state==='running'?'Audio unlocked.':'Audio locked until gesture.';});
    $('audio').disabled=verify;$('audio').textContent=verify?'Audio disabled in verify':'Unlock audio by gesture';
    $('audio').addEventListener('click',unlockAudio);
    $('seek').addEventListener('input',async event=>{seeking=true;$('seek-value').value=event.target.value;try{await runtime.drawAt(Number(event.target.value),{heldAge:Number(event.target.value)});}catch(error){show(`Held seek failed: ${error.message}`);}});
    $('play').addEventListener('click',()=>{seeking=false;runtime.resetPlayback();rafStart=clockNow();});
    if(verify){muted=true;$('muted').checked=true;$('audio-state').textContent='Verify mode: audio hard-zero and gesture unlock disabled.';document.documentElement.classList.add('verify');}
    rafStart=clockNow();let drawing=false;
    runtime.start(async stamp=>{if(seeking||drawing)return;drawing=true;try{if(resizePending){resizePending=false;const next=dimensions();if(target.resize(next.width,next.height))runtime.resized();}await runtime.drawAt(Math.max(0,clockNow()-rafStart));}finally{drawing=false;}});
    show(verify?'Verify mode: hard-zero audio. Autoplaying existing preparation arrival.':'Autoplaying existing preparation arrival. Audio stays locked until gesture.');
  }catch(error){show(`Initialization failed: ${error?.message||error}`);receipt.textContent=error?.stack||String(error);startupBridge.fail(error,navigator.gpu?'WEBGPU_STARTUP_FAILED':'WEBGPU_UNSUPPORTED',navigator.gpu?'error':'unsupported');}
}
async function unlockAudio(){if(verify){muted=true;return false;}try{const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)throw Object.assign(new Error('Web Audio is unsupported'),{unsupported:true});if(!audioContext){audioContext=new Ctx();master=audioContext.createGain();master.gain.value=muted?0:.22;master.connect(audioContext.destination);}await audioContext.resume();const active=audioContext.state==='running';$('audio-state').textContent=active&&!muted?'Audio unlocked by gesture.':`Audio state: ${audioContext.state}`;return active;}catch(error){$('audio-state').textContent=`Audio unavailable: ${error?.message||error}`;return false;}}
window.addEventListener('pagehide',()=>{runtime?.dispose();if(audioContext)void audioContext.close().catch(()=>{});});
await initialize();


