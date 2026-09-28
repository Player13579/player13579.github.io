import {ContactRenderer,HeadshotContactSystem,RateClock,CONTACT,VARIANTS,LAYERS,synthesizeContact,pcmMetrics} from '../src/index.mjs';
import {FixtureHost,fixtureScene,projection} from './fixture.mjs';
import {pngFromPixels} from './zip.mjs';
export const STEPS=60;
export function pixelMetrics(a,b){let changed=0,visible=0,clipped=0,maxDelta=0;for(let i=0;i<a.length;i+=4){let d=0;for(let c=0;c<3;c++)d=Math.max(d,Math.abs(a[i+c]-b[i+c]));if(d)changed++;if(d>10)visible++;maxDelta=Math.max(maxDelta,d);if(a[i]>=254&&a[i+1]>=254&&a[i+2]>=254)clipped++;}return {changedPixels:changed,visibleDeltaPixels:visible,whiteClippedPixels:clipped,maxDelta,clippingPolicy:'許可された飽和を報告するだけ。不合格にしない。'};}
function fixture(reduced=false){let now=1000;const clock=new RateClock({sourceNow:()=>now}),host=new FixtureHost(clock),system=new HeadshotContactSystem({clock,verifyCanonical:host.verifyCanonical,getPermission:host.getPermission,roomId:host.roomId,epoch:host.epoch,reducedMotion:reduced});return {clock,host,system,at(t){now=1000+t;}};}
/** 単一Eの全寿命。variant別の芸術性比較は作らない。通常/reduced、暗明、原寸の8条件。 */
export async function lifetimeEvidence(resources,onProgress=()=>{}){
  const files=[],report={schema:'DVA-v5-lifetime',scope:'実WebGPU提出/readbackの数値。目視・聴感受入ではない。',status:'pass',shaderCompilation:resources.compilation,conditions:[],humanVisual:'not_run',humanListening:'not_run'};
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const renderer=new ContactRenderer(canvas,resources);let progress=0;
  try{for(const reduced of [false,true])for(const size of [64,32])for(const light of [false,true]){
    renderer.resize(size,size);const scene=fixtureScene(size,light);renderer.setScenePixels(scene);
    const f=fixture(reduced),receipt=await f.system.accept(f.host.issue());if(!receipt.accepted)throw new Error('fixture admission failed');
    const name=`${reduced?'reduced':'normal'}-H${size}-${light?'light':'dark'}`,row={condition:name,frames:[],status:'pass'};
    const columns=8,rows=8,sheet={width:size*columns,height:size*rows,pixels:new Uint8Array(size*columns*size*rows*4)};
    for(let i=0;i<=STEPS;i++){
      f.at(CONTACT.durationMs*i/STEPS);const frame=f.system.frame()[0],result=await renderer.render(frame?[{frame,projection:projection(size),mask:f.host.mask()}]:[],{capture:true});
      const metric=pixelMetrics(result.pixels,scene);const endpoint=i===0||i===STEPS;
      const ok=endpoint?metric.changedPixels===0:(i>=4&&i<=50?metric.visibleDeltaPixels>0:true);if(!ok)row.status=report.status='failed';
      row.frames.push({u:i/STEPS,ageMs:CONTACT.durationMs*i/STEPS,phase:frame?.envelope.phase??'absent',...metric,numericPresenceCheck:ok?'pass':'failed'});
      const cellX=i%columns*size,cellY=Math.floor(i/columns)*size;
      for(let y=0;y<size;y++)sheet.pixels.set(result.pixels.subarray(y*size*4,(y+1)*size*4),((cellY+y)*sheet.width+cellX)*4);
      onProgress(++progress,8*(STEPS+1));
    }
    files.push({name:`lifetime/${name}.png`,data:await pngFromPixels(sheet)});report.conditions.push(row);f.system.dispose();
  }}finally{renderer.dispose();}
  files.push({name:'lifetime.json',data:JSON.stringify(report,null,2)});return {files,report};
}
/** 10入力の同一出力と遮蔽/保護/終端を実画素で検査。品質の10種識別とは逆の条件。 */
export async function compatibilityEvidence(resources){
  const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const renderer=new ContactRenderer(canvas,resources),scene=fixtureScene(32);renderer.setScenePixels(scene);
  const checks=[];let reference;
  try{
    for(const variant of VARIANTS){const f=fixture();await f.system.accept(f.host.issue(variant));f.at(CONTACT.durationMs*.24);const frame=f.system.frame()[0],result=await renderer.render([{frame,mask:f.host.mask(),projection:projection(32)}],{capture:true});reference??=result.pixels;const equal=result.pixels.every((v,i)=>v===reference[i]);checks.push({name:`input-equivalence:${variant}`,status:equal?'pass':'failed'});f.system.dispose();}
    const f=fixture();await f.system.accept(f.host.issue());f.at(CONTACT.durationMs*.16);let frame=f.system.frame()[0];
    f.host.visible=false;const hidden=await renderer.render(f.system.frame().map(frame=>({frame,mask:f.host.mask(),projection:projection(32)})),{capture:true});checks.push({name:'visibility-revocation',status:hidden.pixels.every((v,i)=>v===scene[i])?'pass':'failed'});
    // 全宛先を禁止したmaskを用い、光/OBSも0になることを確認する。
    const denied=new Uint8Array(128*128*4);const blocked=await renderer.render([{frame,mask:denied,projection:projection(32)}],{capture:true});checks.push({name:'all-layers-denied',status:blocked.pixels.every((v,i)=>v===scene[i])?'pass':'failed'});
    f.system.dispose();
    // ページ非対応環境ではこの関数自体が未実行。数値成功から聴感を推定しない。
    let offlineAudio={status:'not_run'};
    if(globalThis.OfflineAudioContext){const c=new OfflineAudioContext(1,24000,48000),pcm=synthesizeContact(c.sampleRate),buffer=c.createBuffer(1,pcm.length,c.sampleRate);buffer.copyToChannel(pcm,0);const s=c.createBufferSource();s.buffer=buffer;s.connect(c.destination);s.start(0);const rendered=await c.startRendering();const metrics=pcmMetrics(rendered.getChannelData(0));offlineAudio={status:metrics.finite&&metrics.peak>0&&metrics.clipSamples===0?'pass':'failed',metrics,humanListening:'not_run'};}
    return {schema:'DVA-v5-compatibility',status:checks.every(c=>c.status==='pass')?'pass':'failed',checks,offlineAudio,humanVisual:'not_run',humanListening:'not_run'};
  }finally{renderer.dispose();}
}
