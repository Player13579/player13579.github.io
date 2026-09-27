import {HeadshotRenderer,VARIANTS,profileFor,sampleProfile,makeReceiverMask,synthesizeContact,pcmMetrics,OBSERVATION_BUDGET} from '../src/index.mjs';
const background=(n=64)=>{const a=new Uint8Array(n*n*4);for(let i=0;i<a.length;i+=4){a[i]=28;a[i+1]=33;a[i+2]=41;a[i+3]=255;}return a;};
const diffCount=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])n++;return n;};
const fixtureSurface={normal:[0,0,1],view:[0,0,1],light:[0,0,1],roughness:.65,f0:.04,albedo:.5,occlusion:1,coverage:1};
function frameAt(variant,u){const p=profileFor(variant);return {event:{id:'pixel-fixture',x:0,y:0,variant},profile:p,ageMs:p.durationMs*u,rate:1,reducedMotion:false,envelope:sampleProfile(p,p.durationMs*u)};}
export async function runBrowserValidation(device,initialDiagnostics={}){
 const started=new Date().toISOString();const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const renderer=await HeadshotRenderer.create({canvas,device});const scene=background();renderer.setScenePixels(scene);
 const projection={center:[32,32],axisX:[32,0],axisY:[0,-32]};
 const permit=makeReceiverMask({authorizePixel:()=>true,sampleReceiver:()=>fixtureSurface});
 const zero=new Uint8Array(permit.length);
 const samples=[];const checks=[];
 try{
  for(const variant of VARIANTS)for(const u of [0,.02,.08,.18,.45,.75,.95,1]){
   const capture=await renderer.render([{frame:frameAt(variant,u),projection,mask:permit}],{capture:true});
   const changed=diffCount(capture.pixels,scene);let allWhite=0;
   for(let i=0;i<capture.pixels.length;i+=4)if(capture.pixels[i]>250&&capture.pixels[i+1]>250&&capture.pixels[i+2]>250)allWhite++;
   samples.push({variant,u,changedPixels:changed,nearWhitePixels:allWhite});
  }
  checks.push({name:'寿命端点で残留しない',pass:samples.filter(s=>s.u===0||s.u===1).every(s=>s.changedPixels===0)});
  checks.push({name:'H64主作用時の画素が存在',pass:samples.filter(s=>s.u===.08||s.u===.18).every(s=>s.changedPixels>=12)});
  checks.push({name:'白い全面フラッシュでない',pass:samples.every(s=>s.nearWhitePixels<64)});
  const testFrame=frameAt('aim:assault',.18);
  const masked=await renderer.render([{frame:testFrame,projection,mask:zero}],{capture:true});checks.push({name:'不許可maskは完全不変',pass:diffCount(masked.pixels,scene)===0});
  const withoutSource=await renderer.render([{frame:testFrame,projection,mask:permit}],{capture:true,layerMask:12});checks.push({name:'source無しで光/にじみ無し',pass:diffCount(withoutSource.pixels,scene)===0});
  const stripe=makeReceiverMask({authorizePixel:u=>!(u>.5&&u<.75),sampleReceiver:()=>fixtureSurface});
  const hiddenStripe=await renderer.render([{frame:testFrame,projection,mask:stripe}],{capture:true});let leaked=0;
  for(let y=0;y<64;y++)for(let x=32;x<48;x++){const i=(y*64+x)*4;if(hiddenStripe.pixels[i]!==scene[i]||hiddenStripe.pixels[i+1]!==scene[i+1]||hiddenStripe.pixels[i+2]!==scene[i+2])leaked++;}
  checks.push({name:'局所bloom後も前景遮蔽帯へ漏れない',pass:leaked===0,leakedPixels:leaked});
  const start=performance.now();let frames=0,maxFrameGapMs=0,last=start;
  while(performance.now()-start<2500){await new Promise(requestAnimationFrame);const now=performance.now();maxFrameGapMs=Math.max(maxFrameGapMs,now-last);last=now;const u=((now-start)%400)/400;renderer.render([{frame:frameAt('hip:sniper',u),projection,mask:permit}]);frames++;}
  await renderer.submitted();
  const audio=await offlineAudioCheck();
  return {started,finished:new Date().toISOString(),userAgent:navigator.userAgent,devicePixelRatio,
    adapter:initialDiagnostics.adapterInfo??null,shader:renderer.diagnostics.shaderMessages,
    submission_and_readback:{status:checks.every(c=>c.pass)?'pass':'failed',checks,samples},
    continuous_submission:{status:'completed',wallMs:performance.now()-start,frames,maxFrameGapMs,note:'フレーム提出の計測であり人による動きの評価ではない'},
    audio,physical_GPU_observation:'not_independently_verified',
    human_motion_review:'not_run',human_listening:'not_run',artistic_effect:'not_run',game_integration:'not_run',
    note:'この記録はこの実行環境の測定。別のGPU/表示寸法/実ゲームmixへ一般化しない。'};
 }finally{renderer.dispose();}
}
async function offlineAudioCheck(){
 if(!window.OfflineAudioContext)return {status:'not_run',reason:'OfflineAudioContext unavailable'};
 const context=new OfflineAudioContext(2,48000,48000);
 const bus=context.createGain();bus.gain.value=OBSERVATION_BUDGET.masterGain;bus.connect(context.destination);
 for(let i=0;i<8;i++){
  const pcm=synthesizeContact(VARIANTS[i%VARIANTS.length],48000);const b=context.createBuffer(1,pcm.length,48000);b.copyToChannel(pcm,0);
  const source=context.createBufferSource();source.buffer=b;const gain=context.createGain();gain.gain.value=OBSERVATION_BUDGET.voiceGain;
  const pan=context.createStereoPanner();pan.pan.value=(i%3-1)*.6;source.connect(gain).connect(pan).connect(bus);source.start(0);
 }
 const result=await context.startRendering();const channels=[0,1].map(i=>pcmMetrics(result.getChannelData(i),48000));
 return {status:channels.every(x=>x.peak<1)?'pass':'failed',kind:'OfflineAudioContext_render',channels,human_listening:'not_run'};
}
