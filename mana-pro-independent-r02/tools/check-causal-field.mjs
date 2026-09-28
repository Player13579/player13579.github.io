import {writeFile} from 'node:fs/promises';
import {fieldMasks,connectedComponentSizes,renderReference,WIDTH,HEIGHT} from './reference-utils.mjs';
import {EFFECT_DURATION_SECONDS,PHASE} from '../src/contract.mjs';
const frames=[],checks=[];
const area=m=>m.reduce((a,n)=>a+n,0);
for(let i=0;i<=160;i++){
  const u=i/160,m=fieldMasks(u),union=m.source.map((v,k)=>v||m.transport[k]||m.receive[k]);
  frames.push({u,ownerSeconds:u*EFFECT_DURATION_SECONDS,areas:Object.fromEntries(Object.entries(m).map(([k,a])=>[k,area(a)])),components:connectedComponentSizes(union),
    source_transport_overlap:m.source.reduce((s,v,k)=>s+(v&&m.transport[k]?1:0),0),transport_receive_overlap:m.transport.reduce((s,v,k)=>s+(v&&m.receive[k]?1:0),0)});
}
const check=(name,ok,detail)=>checks.push({name,status:ok?'pass':'failed',detail});
check('単一連続形の位相引渡し .03.. .94',frames.filter(f=>f.u>=.03&&f.u<=.94).every(f=>f.components.length===1),'opacity>.22の4近傍、拡大なし。意味読解の判定ではない');
check('到着前の受領無し',frames.filter(f=>f.u<=PHASE.receiveStart).every(f=>f.areas.receive===0),'前端の到着と受領開始を同じ契約に束縛');
check('量を受領面積へ写像',frames.filter(f=>f.u>=.32&&f.u<=.76).every((f,i,a)=>i===0||f.areas.receive>=a[i-1].areas.receive),'描画モデルの面積単調性');
const panels=[];
for(const u of [.08,.24,.40,.56,.72,.84,.94]){
 const withOBS=renderReference(u),raw=renderReference(u,{observation:false,lighting:false});
 const data=[];
 for(let panel=0;panel<2;panel++){
  let count=0,clipped=0;const baseline=renderReference(1); // reference only; no WebGPU claims
  for(let y=0;y<HEIGHT;y++)for(let x=panel*128;x<(panel+1)*128;x++){
   const k=(y*WIDTH+x)*4;let delta=0;for(let c=0;c<3;c++)delta=Math.max(delta,Math.abs(raw[k+c]-baseline[k+c]));
   if(delta>8)count++;if(raw[k]>250&&raw[k+1]>250&&raw[k+2]>250&&delta>8)clipped++;
  }
  data.push({panel,coloredShapePixelsWithoutOBS:count,nearWhiteChangedPixels:clipped});
  check(`本体存続（CPU・OBS/受光なし）u=${u}, panel=${panel}`,count>30,{count});
 }
 panels.push({u,data});
}
const result={kind:'CPU_ANALYTIC_PROXY_NOT_WEBGPU',status:checks.every(c=>c.status==='pass')?'pass':'failed',scope:'同じ設計定数を使うCPU参照場。WGSLコンパイル・実画素・意味読解・聴感は検証しない。',dimensions:[256,112],actorCSSHeight:64,frameStepOwnerSeconds:EFFECT_DURATION_SECONDS/160,thresholds:{opacity:.22,rgbDifference:8},checks,frames,panels,qualityAcceptance:'not_claimed',actualGPU:'not_run'};
await writeFile(new URL('../evidence/causal-field-cpu.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`${frames.length} CPU phases, ${checks.length} proxy checks: ${result.status}`);if(result.status!=='pass'){console.log(checks.filter(c=>c.status==='failed'));process.exitCode=1;}
