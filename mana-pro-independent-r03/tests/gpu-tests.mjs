import {ManaRenderer} from '../src/renderer.mjs';
import {composePixel} from '../src/field.mjs';
const $=id=>document.getElementById(id),canvas=$('gpu');let renderer=null,report=null;
const MAX=(a,b)=>Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]),Math.abs(a[2]-b[2]));
const rgba=(buf,x,y,w)=>Array.from(buf.slice((y*w+x)*4,(y*w+x)*4+3)).map(x=>x/255);
const maskConnected=(pixels,bg,w,h)=>{
 const mask=new Uint8Array(w*h),seen=new Uint8Array(w*h);let total=0,largest=0;
 for(let i=0;i<w*h;i++){const o=i*4;if(Math.max(Math.abs(pixels[o]-bg[o]),Math.abs(pixels[o+1]-bg[o+1]),Math.abs(pixels[o+2]-bg[o+2]))>21){mask[i]=1;total++;}}
 for(let i=0;i<mask.length;i++)if(mask[i]&&!seen[i]){const q=[i];seen[i]=1;let k=0;for(;k<q.length;k++){const p=q[k],x=p%w,y=Math.floor(p/w);for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&mask[n]&&!seen[n]){seen[n]=1;q.push(n);}}largest=Math.max(largest,k);}
 return {total,largest,ratio:total?largest/total:1};
};
function frame(phase,serial){return {epoch:1,serial,at:performance.now(),items:[{key:'gpu-verification-only',token:1,worldX:0,worldY:0,phase,opacity:1,reducedMotion:false}]};}
const options={theme:'both',scale:.5,footY:130,camera:{x:0,y:0},verify:true,readPixels:true};
$('run').onclick=async()=>{
 $('run').disabled=true;$('results').textContent='GPU adapter/shaderを検査中…';
 report={version:'0.3.0',started:new Date().toISOString(),scope:'silent_WebGPU_technical_not_quality',environment:{userAgent:navigator.userAgent,devicePixelRatio,output:[240,160],H64Scale:.5},shader:'not_run',pixels:'not_run',quality:{dark:'not_run',light:'not_run'},listening:'not_run',gameIntegration:'not_run',phases:[],errors:[]};
 try{
  if(!renderer)renderer=await ManaRenderer.create(canvas);
  report.shader=renderer.diagnostics.shaderCompilation;report.adapter=renderer.diagnostics.adapter;
  const blank=await renderer.draw(frame(1,1),options);if(!blank)throw new Error('canvasが可視でありません');
  let emptyReceive=null;const fillAreas=[];
  for(let i=0;i<=160;i++){
    const phase=i/160;const r=await renderer.draw(frame(phase,i+2),options);if(!r)throw new Error('フレームが破棄されました（非表示/状態変更）');
    const regions=[];let maxReferenceError=0;
    for(let panel=0;panel<2;panel++){
      const cx=60+120*panel,bg=panel?'light':'dark';
      const cues=[[0,-3],[0,-34],[0,-91]].map(([x,y])=>{
        const sx=Math.floor(cx+x*.5),sy=Math.floor(130+y*.5);return MAX(rgba(r.pixels,sx,sy,240),rgba(blank.pixels,sx,sy,240));
      });
      regions.push({panel:bg,sourceContrast:cues[0],transportContrast:cues[1],receiverContrast:cues[2],witnessPixels:r.counts[panel*64]});
      // 独立CPU式との数値比較は移植ミスの検査に限る。生成品質を評価しない。
      for(let y=68;y<141;y+=3)for(let x=cx-34;x<=cx+34;x+=3){
        const cpu=composePixel((x+.5-cx)/.5,(y+.5-130)/.5,phase,{background:bg});maxReferenceError=Math.max(maxReferenceError,MAX(cpu,rgba(r.pixels,x,y,240)));
      }
    }
    if(i===32)emptyReceive=r.pixels.slice();
    if([56,80,128].includes(i)&&emptyReceive){
      let count=0;for(let y=75;y<102;y++)for(let x=37;x<83;x++)if(MAX(rgba(r.pixels,x,y,240),rgba(emptyReceive,x,y,240))>.12)count++;
      fillAreas.push({phase,pixels:count});
    }
    const active=phase<1;
    const ok=regions.every(c=>active?(c.sourceContrast>.08&&c.transportContrast>.08&&c.receiverContrast>.08&&c.witnessPixels>=3):(c.witnessPixels===0&&c.sourceContrast<.01&&c.transportContrast<.01&&c.receiverContrast<.01));
    if(!ok)report.errors.push({phase,check:'anchor-color-and-witness'});
    if(maxReferenceError>.035)report.errors.push({phase,check:'CPU-GPU-expression-difference',maxReferenceError});
    report.phases.push({phase,regions,maxReferenceError});
    $('results').textContent=`${i+1}/161 位相完了\n技術エラー: ${report.errors.length}\n品質観察: not_run`;
  }
  // ハローを切った本体像でも接続しているか。左右パネルは別成分として検査。
  report.primaryOnly=[];
  for(const phase of [0,.25,.5,.75,.999]){
    const r=await renderer.draw(frame(phase,1000+Math.round(phase*1000)),{...options,layers:7});
    for(let panel=0;panel<2;panel++){
      const crop=new Uint8Array(120*160*4),bg=new Uint8Array(120*160*4);
      for(let y=0;y<160;y++){crop.set(r.pixels.subarray((y*240+panel*120)*4,(y*240+panel*120+120)*4),y*120*4);bg.set(blank.pixels.subarray((y*240+panel*120)*4,(y*240+panel*120+120)*4),y*120*4);}
      const connected=maskConnected(crop,bg,120,160);report.primaryOnly.push({phase,panel,connected});if(connected.ratio<.98)report.errors.push({phase,panel,check:'primary-connectivity'});
    }
  }
  report.receiveChangedArea=fillAreas;
  if(fillAreas.length!==3||!(fillAreas[0].pixels<fillAreas[1].pixels&&fillAreas[1].pixels<fillAreas[2].pixels))report.errors.push({check:'receive-area-change'});
  report.pixels=report.errors.length?'failed':'pass';
 }catch(e){report.error=e.stack;report.pixels=report.shader==='pass'?'failed':'not_run';if(renderer?.diagnostics.shaderCompilation==='failed')report.shader='failed';}
 report.ended=new Date().toISOString();report.qualityConclusion='not_assessed_by_technical_tests';$('results').textContent=JSON.stringify(report,null,2);$('download').disabled=false;$('run').disabled=false;globalThis.__manaGPUReport=report;
};
$('download').onclick=()=>{
 report.quality={dark:$('manualDark').value,light:$('manualLight').value,basis:'手動入力。技術結果から自動生成しない。'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='mana-r03-gpu-and-manual-observation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
