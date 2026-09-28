/** 実WebGPU端末用。描画の技術検査と、利用者による意味読解の受入は分離する。 */
import {ManaWebGPURenderer} from '../src/renderer.mjs';
import {EFFECT_DURATION_SECONDS,H64_WORLD_TO_CSS,BOUNDS,PHASE} from '../src/contract.mjs';
const canvas=document.getElementById('testCanvas');let report;
const views=[
 {rect:[0,0,128,112],background:[.006,.010,.016,1],project:()=>[64,92],scale:H64_WORLD_TO_CSS},
 {rect:[128,0,128,112],background:[.76,.80,.78,1],project:()=>[192,92],scale:H64_WORLD_TO_CSS},
];
const frame=(u,exists=true)=>({epoch:1,atMs:u*EFFECT_DURATION_SECONDS*1000,items:exists?[{key:'verify-only-r02',token:1,epoch:1,worldX:0,worldY:0,phase:u,seed:.5,reducedMotion:false,pending:false}]:[]});
function difference(pixels,baseline,panel,threshold=8){
 let count=0,nearWhite=0;const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
 for(let y=0;y<112;y++)for(let x=panel*128;x<(panel+1)*128;x++){
  const i=(y*256+x)*4;let delta=0;for(let c=0;c<3;c++)delta=Math.max(delta,Math.abs(pixels[i+c]-baseline[i+c]));
  if(delta<=threshold)continue;count++;
  if(pixels[i]>250&&pixels[i+1]>250&&pixels[i+2]>250)nearWhite++;
  const wx=(x+.5-(panel?192:64))/.5,wy=(y+.5-92)/.5;
  bounds.minX=Math.min(bounds.minX,wx);bounds.maxX=Math.max(bounds.maxX,wx);bounds.minY=Math.min(bounds.minY,wy);bounds.maxY=Math.max(bounds.maxY,wy);
 }
 return {count,nearWhite,bounds:count?bounds:null};
}
export async function runGPUVerification(){
 const result={version:'0.2.0-gallery-candidate',status:'not_run',scope:'実WebGPUコンパイル・提出・H64画素readbackの技術/代理検査。意味読解、聴感、実ゲーム合成の受入ではない。',userAgent:navigator.userAgent,devicePixelRatio,
  cssActorHeight:64,backingResolution:[256,112],phaseSampleCount:161,phaseSampling:'位相を0..1で固定サンプル。通常rAFの全寿命再生/実時間計測ではない。',shaderCompilation:'not_run',GPUReadback:'not_run',H64SemanticReadability:'not_run',listening:'not_run',gameIntegration:'not_run',qualityAcceptance:'not_claimed',checks:[],frames:[],layers:[]};
 const check=(name,ok,data)=>result.checks.push({name,status:ok?'pass':'failed',data});let renderer;
 try{
  renderer=await ManaWebGPURenderer.create(canvas);result.shaderCompilation='pass';result.compilationMessages=renderer.compilation;
  const info=renderer.adapter.info;result.adapterReported={vendor:info?.vendor,architecture:info?.architecture,device:info?.device,description:info?.description,isFallbackAdapter:info?.isFallbackAdapter??renderer.adapter.isFallbackAdapter??null};
  const baseline=await renderer.render(frame(0,false),views,{capture:true,verify:true});if(!baseline.pixels)throw new Error('baseline readbackなし');
  for(let i=0;i<=160;i++){
   const u=i/160,r=await renderer.render(frame(u),views,{capture:true,verify:true});if(!r.pixels||!r.gpuSucceeded)throw new Error('GPU readback/提出失敗');
   const panels=[0,1].map(p=>difference(r.pixels,baseline.pixels,p));result.frames.push({u,ownerSeconds:u*EFFECT_DURATION_SECONDS,panels});
   for(let p=0;p<2;p++){
    if(u>=.03&&u<=.94)check(`H64画素存在・位相 ${u} panel ${p}`,panels[p].count>=30,panels[p]);
    const b=panels[p].bounds;if(b)check(`包絡 ${u} panel ${p}`,b.minX>=BOUNDS.minX&&b.maxX<=BOUNDS.maxX&&b.minY>=BOUNDS.minY&&b.maxY<=BOUNDS.maxY,b);
    if(i===160)check(`終端がbaselineと一致 panel ${p}`,panels[p].count===0,panels[p]);
   }
  }
  // 同じGPUコードの層分解で、glowを面積の代わりに数えない。発音はverifyで禁止。
  const phases=[.08,.24,.30,.40,.48,.56,.62,.72,.76,.80,.84,.92];
  for(const u of phases){const layers={};
   for(let layer=1;layer<=3;layer++){
    const r=await renderer.render(frame(u),views,{capture:true,verify:true,inspectionLayer:layer,observation:false,lighting:false});
    layers[layer]=[0,1].map(p=>difference(r.pixels,baseline.pixels,p));
    check(`層分解でevent発音許可を出さない u=${u} layer=${layer}`,r.visibleTokens.length===0,r.visibleTokens);
   }
   result.layers.push({u,layers});
  }
  const at=u=>result.layers.find(f=>f.u===u).layers;
  for(let p=0;p<2;p++){
   check(`source面積の初期下限 panel=${p}`,at(.08)[1][p].count>=300,at(.08)[1][p]);
   check(`供給終了時source不在 panel=${p}`,at(.62)[1][p].count===0,at(.62)[1][p]);
   check(`到着前receiver不在 panel=${p}`,at(.30)[3][p].count===0,at(.30)[3][p]);
   check(`太い輸送の占有 panel=${p}`,at(.40)[2][p].count>=300,at(.40)[2][p]);
   check(`蓄積による面積増加 panel=${p}`,at(.40)[3][p].count<at(.56)[3][p].count&&at(.56)[3][p].count<at(.72)[3][p].count,{early:at(.40)[3][p],mid:at(.56)[3][p],late:at(.72)[3][p]});
   check(`receiver満量の面積下限 panel=${p}`,at(.80)[3][p].count>=600,at(.80)[3][p]);
   check(`輸送終了後の保持 panel=${p}`,at(.80)[3][p].count===at(.84)[3][p].count&&at(.80)[2][p].count===0,at(.80));
  }
  const full=await renderer.render(frame(.48),views,{capture:true,verify:true});
  const bare=await renderer.render(frame(.48),views,{capture:true,verify:true,observation:false,lighting:false});
  for(let p=0;p<2;p++){check(`OBS/受光なしで主形存続 panel=${p}`,difference(bare.pixels,baseline.pixels,p).count>=700,difference(bare.pixels,baseline.pixels,p));check(`周辺光とOBSの実差分 panel=${p}`,difference(full.pixels,bare.pixels,p,4).count>=16,difference(full.pixels,bare.pixels,p,4));}
  check('実主形由来のevent token',full.visibleTokens.includes(1),full.tokenCounts);
  result.GPUReadback='pass';result.status=result.checks.every(c=>c.status==='pass')?'pass':'failed';
 }catch(error){
  result.error=String(error);result.failedStage=error.gpuStage??null;
  if(['shader-compilation','pipeline-compilation'].includes(error.gpuStage)){result.shaderCompilation='failed';result.compilationMessages=error.compilationMessages??[];}
  result.status=result.shaderCompilation==='not_run'?'not_run':'failed';
 }finally{renderer?.dispose();}
 report=result;window.__gpuReport=result;document.getElementById('report').textContent=JSON.stringify(result,null,2);document.getElementById('testStatus').textContent=`技術検査: ${result.status} / H64意味読解・聴感・ゲーム統合: not_run`;document.getElementById('save').disabled=false;return result;
}
window.runGPUVerification=runGPUVerification;
document.getElementById('run').onclick=async()=>{document.getElementById('run').disabled=true;try{await runGPUVerification();}finally{document.getElementById('run').disabled=false;}};
document.getElementById('save').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='mana-r02-webgpu-verification.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
