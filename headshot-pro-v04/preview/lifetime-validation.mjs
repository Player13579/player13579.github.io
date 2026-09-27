import {HeadshotRenderer,HeadshotContactSystem,RateClock,VARIANTS,profileFor} from '../src/index.mjs';
import {FixtureHost,fixtureScene} from './fixture-host.mjs';
import {canvasPNG} from './evidence-export.mjs';

export const LIFETIME_STEPS=60; // 0/1を含む61時点。連続動画ではなく全区間の離散標本。
export const H64_PROJECTION=Object.freeze({center:[32,32],axisX:[32,0],axisY:[0,-32]});
export function pixelMetrics(pixels,baseline) {
  if(pixels.length!==baseline.length)throw new RangeError('pixel dimensions');
  let changedPixels=0,visibleDeltaPixels=0,nearWhitePixels=0,maxChannelDelta=0,sum=0,coloredPixels=0;
  for(let i=0;i<pixels.length;i+=4){
    const delta=Math.max(Math.abs(pixels[i]-baseline[i]),Math.abs(pixels[i+1]-baseline[i+1]),Math.abs(pixels[i+2]-baseline[i+2]));
    if(delta>0)changedPixels++;if(delta>=4)visibleDeltaPixels++;maxChannelDelta=Math.max(maxChannelDelta,delta);sum+=delta;
    if(pixels[i]>250&&pixels[i+1]>250&&pixels[i+2]>250)nearWhitePixels++;
    if(delta>=4&&Math.max(pixels[i],pixels[i+1],pixels[i+2])-Math.min(pixels[i],pixels[i+1],pixels[i+2])>=24)coloredPixels++;
  }
  return {changedPixels,visibleDeltaPixels,nearWhitePixels,maxChannelDelta,meanMaxChannelDelta:sum/(pixels.length/4),coloredPixels};
}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function frameFor(system){return system.frame().at(-1)??null;}
function contactSheet(variant,bodyOnly=false,size=64){
  const columns=9,cellW=size+8,blockH=size*2+36,margin=42,header=42;
  const canvas=document.createElement('canvas');canvas.width=margin+columns*cellW;canvas.height=header+Math.ceil((LIFETIME_STEPS+1)/columns)*blockH;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#e8ebee';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#1e2630';ctx.font='12px monospace';
  ctx.fillText(`${variant} / H${size} / ${bodyOnly?'body only':'composite'} / GPU readback`,8,17);
  ctx.fillText('u=0..1 / 61 samples / NOT continuous playback evidence',8,33);
  return {canvas,place(index,u,dark,light){
    const col=index%columns,row=Math.floor(index/columns);const x=margin+col*cellW,y=header+row*blockH;
    ctx.fillStyle='#1e2630';ctx.fillText(u.toFixed(3),x,y+12);
    if(col===0){ctx.fillText('dark',2,y+18+size/2);ctx.fillText('light',2,y+26+size*1.5);}
    ctx.putImageData(new ImageData(new Uint8ClampedArray(dark),size,size),x,y+18);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(light),size,size),x,y+size+26);
  }};
}
/**
 * GPUで正規fixtureを61時点×両背景×合成/本体単独へ提出してreadbackする。
 * 2D canvasは取得済みRGBAの証拠配置にのみ使用。代替Eを描かない。
 * ページの自動発行/継続観察は別途 live-loop の証拠で検査する。
 */
export async function captureLifetimeEvidence(device,{diagnostics={},reducedMotion=false,onProgress=()=>{}}={}){
  const report={schema:'DVA-E-lifetime-evidence-3',createdAt:new Date().toISOString(),status:'running',
    scope:'制御時刻での権威fixture→System.frame→WGSL→GPU readback。自動ループ/人の目視とは別検査。',
    adapter:diagnostics.adapterInfo??null,userAgent:navigator.userAgent,reducedMotion,
    nativeSizes:[64,32],devicePixelRatio:devicePixelRatio,
    sampleCountPerVariantPerBackground:LIFETIME_STEPS+1,backgrounds:['dark','light'],
    rendererSources:'src/contact-geometry.mjs (v4) + shaders/contact.wgsl (v4) + shaders/composite.wgsl (保持)',
    variants:[],checks:[],human_visual_acceptance:'not_run',human_listening:'not_run',game_integration:'not_run'};
  const files=[];const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const renderer=await HeadshotRenderer.create({canvas,device});
  let scene;
  try{
    for(let vi=0;vi<VARIANTS.length;vi++){
      const variant=VARIANTS[vi],p=profileFor(variant);let now=1000;
      const clock=new RateClock({sourceNow:()=>now}),host=new FixtureHost(clock);
      const system=new HeadshotContactSystem({clock,verifyCanonical:host.verifyCanonical,getPermission:host.getPermission,roomId:host.roomId,epoch:host.epoch,reducedMotion});
      const packet=host.issue(variant);const admission=await system.accept(packet);if(!admission.accepted)throw new Error(`fixture admission: ${admission.reason}`);
      const mask=host.mask();
      const row={variant,durationMs:p.durationMs,status:'running',admission,samples:[],checks:[],evidence:[]};report.variants.push(row);
      for(const size of [64,32]){
        renderer.resize(size,size);
        scene={dark:fixtureScene(size,size,{single:true,light:false}),light:fixtureScene(size,size,{single:true,light:true})};
        const sheet=contactSheet(variant,false,size),bodySheet=contactSheet(variant,true,size);
        let sampleNow=1000;const sampleClock=new RateClock({sourceNow:()=>sampleNow}),sampleHost=new FixtureHost(sampleClock);
        const sampleSystem=new HeadshotContactSystem({clock:sampleClock,verifyCanonical:sampleHost.verifyCanonical,getPermission:sampleHost.getPermission,roomId:sampleHost.roomId,epoch:sampleHost.epoch,reducedMotion});
        const samplePacket=sampleHost.issue(variant);const accepted=await sampleSystem.accept(samplePacket);if(!accepted.accepted)throw new Error(accepted.reason);
        const projection={center:[size/2,size/2],axisX:[size/2,0],axisY:[0,-size/2]};
      for(let i=0;i<=LIFETIME_STEPS;i++){
        const u=i/LIFETIME_STEPS;sampleNow=1000+p.durationMs*u;const frame=frameFor(sampleSystem);
        const records=frame?[{frame,projection,mask}]:[];
        const results={};
        for(const background of ['dark','light']){
          renderer.setScenePixels(scene[background]);
          const full=await renderer.render(records,{capture:true,layerMask:15});
          const body=await renderer.render(records,{capture:true,layerMask:1});
          const sample={nativeSize:size,index:i,u,ageMs:p.durationMs*u,background,active:!!frame,
            composite:{...pixelMetrics(full.pixels,scene[background]),rgba_sha256:await sha256(full.pixels)},
            body:{...pixelMetrics(body.pixels,scene[background]),rgba_sha256:await sha256(body.pixels)}};
          row.samples.push(sample);results[background]={full:full.pixels,body:body.pixels};
        }
        sheet.place(i,u,results.dark.full,results.light.full);bodySheet.place(i,u,results.dark.body,results.light.body);
        onProgress({variant,nativeSize:size,variantIndex:vi+1,totalVariants:VARIANTS.length,index:i,total:LIFETIME_STEPS});
      }
      const stem=variant.replace(':','-');
      for(const [suffix,s]of [['composite',sheet],['body',bodySheet]]){
        const name=`lifetime/H${size}/${stem}-${suffix}.png`,data=await canvasPNG(s.canvas);files.push({name,data});
        row.evidence.push({path:name,sha256:await sha256(data),kind:'actual_GPU_readback_contact_sheet',nativeSize:size,columns:9,cellWidth:size+8,blockHeight:size*2+36,marginLeft:42,headerHeight:42});
      }
      sampleSystem.dispose();
      }
      const check=(name,pass,scope)=>row.checks.push({name,status:pass?'pass':'failed',scope});
      check('両背景・始端/終端に残留なし',row.samples.filter(s=>s.index===0||s.index===LIFETIME_STEPS).every(s=>s.composite.changedPixels===0),'画素差');
      check('両背景・主作用0.05〜0.65に有効画素',row.samples.filter(s=>s.u>=.05&&s.u<=.65).every(s=>s.composite.visibleDeltaPixels>=12),'4階調以上の差が12画素以上。美的可読性の合格ではない');
      check('glowなしの本体も両背景で存在',row.samples.filter(s=>s.u>=.08&&s.u<=.65).every(s=>s.body.visibleDeltaPixels>=8),'本体パスの画素差');
      check('白い塊/全面白飛びなし',row.samples.every(s=>s.composite.nearWhitePixels<64),'白画素の数だけを制限');
      // 独立した再実行で終端後の再発音/再発行を作らず、ID単位検証も記録。
      const duplicate=await system.accept(packet);check('同id再入場不可',!duplicate.accepted&&duplicate.reason==='duplicate','権威fixture');
      const stem=variant.replace(':','-');
      row.status=row.checks.some(c=>c.status==='failed')?'failed':'pass';
      files.push({name:`lifetime/${stem}.json`,data:JSON.stringify(row,null,2)+'\n'});system.dispose();
    }
    const distinct=(background,size)=>new Set(report.variants.map(r=>r.samples.find(s=>s.index===24&&s.background===background&&s.nativeSize===size)?.body.rgba_sha256)).size===10;
    report.checks.push({name:'u=.40・H64/H32両背景の10本体画素は非同一',status:[32,64].every(n=>distinct('dark',n)&&distinct('light',n))?'pass':'failed',scope:'非同一性だけ。人が武器/aim-hipを識別できる実証ではない'});
    report.status=report.variants.every(r=>r.status==='pass')&&report.checks.every(c=>c.status==='pass')?'pass':'failed';
    report.shaderMessages=renderer.diagnostics.shaderMessages;report.uncapturedErrors=renderer.diagnostics.uncapturedErrors;
    if(report.uncapturedErrors.length)report.status='failed';
  }catch(e){report.status='failed';report.error=String(e.stack??e);}
  finally{renderer.dispose();}
  files.push({name:'lifetime-report.json',data:JSON.stringify(report,null,2)+'\n'});
  return {report,files};
}
