import {ERenderer} from '../src/gpu.mjs';
import {EFFECTS} from '../src/contract.mjs';
import {sampleEffect} from '../src/sampler.mjs';
const $=s=>document.querySelector(s);let report={status:'not_run'},renderer;
function event(eventId,causeId='gpu-check',targetId=''){
  const e={eventId,causeId,playerId:'test-player',actorStartMs:0,x:0,y:0,radius:EFFECTS[eventId].radius};
  if(eventId==='action-ninjutsu-focus')e.targetId=targetId;return e;
}
function diff(a,b){let max=0,changed=0;for(let i=0;i<a.length;i+=4){let m=0;for(let c=0;c<3;c++)m=Math.max(m,Math.abs(a[i+c]-b[i+c]));max=Math.max(max,m);if(m>8)changed++;}return {max,changed_pixels_gt8:changed};}
function outside(a,b,width,height,radius,scale){let max=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(Math.hypot(x+.5-width/2,y+.5-height/2)<=radius*scale+3)continue;
  const k=(y*width+x)*4;for(let c=0;c<3;c++)max=Math.max(max,Math.abs(a[k+c]-b[k+c]));}return max;}
function check(value,message){if(!value)throw new Error(message);}
async function capture(events,age,options){const samples=events.map(e=>sampleEffect(e,age)).filter(s=>s.active);return renderer.draw({actorNowMs:age,samples,...options},{readback:true});}
$('#run').onclick=async()=>{
  $('#run').disabled=true;report={status:'not_run',basis:'このブラウザーでの実WebGPU readback。主観品質・実聴は含めない。',userAgent:navigator.userAgent,isSecureContext,startedAt:new Date().toISOString(),shader:'not_run',pixels:'not_run',real_time_presentation:'not_run',human_listening:'not_run',game_integration:'not_run',records:[]};
  let initialized=false;
  try{
    $('#status').textContent='adapter / shader の初期化中…';
    renderer=await ERenderer.create($('#test'));initialized=true;
    const i=renderer.adapter.info;
    report.adapter={vendor:i?.vendor,architecture:i?.architecture,device:i?.device,description:i?.description};
    report.compilation=renderer.compilation;report.shader='pass';
    const begin=performance.now();
    for(const eventId of Object.keys(EFFECTS))for(const compact of [false,true])for(const background of [0,1]){
      const size=compact?96:304,scale=compact?64/(2*EFFECTS[eventId].radius):1;
      renderer.resize(size,size,1);const options={scale,background,fixture:true};
      const base=await capture([],0,options);let frames=0;
      for(let age=0;age<=1200;age+=20){
        const pixels=await capture([event(eventId)],age,options);const difference=diff(pixels,base);
        const leak=outside(pixels,base,size,size,EFFECTS[eventId].radius,scale);
        check(leak<=1,`${eventId} / age=${age}: radius外の差分 ${leak}`);
        if(age===0||age===1200)check(difference.max<=1,`${eventId}: 寿命端が非ゼロ`);
        report.records.push({eventId,mode:compact?'envelopeH64':'actorH64',background,age,...difference,outside_radius_max_difference:leak});frames++;
        $('#status').textContent=`${eventId} / ${compact?'envelopeH64':'actorH64'} / ${background?'明':'暗'} / ${age} actor-ms`;
      }
      const peak=eventId==='action-rational-free'?156:610;
      const on=await capture([event(eventId)],peak,options);
      const noOBS=await capture([event(eventId)],peak,{...options,observation:false});
      check(diff(noOBS,base).changed_pixels_gt8>0,'OBS OFFで主形が消失');
      const triple=await capture([0,1,2].map(n=>event(eventId,`overlap-${n}`)),peak,options);
      check(diff(on,triple).changed_pixels_gt8>0,'重複原因の合成差なし');
      if(eventId==='action-ninjutsu-focus'){
        const targeted=await capture([event(eventId,'gpu-check','upstream-valid-id')],peak,options);
        check(diff(on,targeted).max===0,'targetId空/非空で画素が変化');
      }
      report.records.push({eventId,compact,background,kind:'ablation_overlap_target',frames,world_without_OBS:true,overlap_changed:true});
    }
    check(renderer.errors.length===0,JSON.stringify(renderer.errors));
    report.elapsed_wall_seconds=(performance.now()-begin)/1000;report.pixels='pass';report.status='pass';
    report.limitations=['readback所要時間は画面の実提示latencyを測るものではない。','同時二deviceや長時間稼働は各独立プレビューで別検査。','聴感、Bの芸術的成果、本編イベント契約は未判定。'];
  }catch(e){report.status=initialized?'failed':'not_run';report.error=e.message;report.initialization_failed=!initialized;
    report.limitations=['初期化失敗時はWGSLがコンパイルされたとみなさない。エラー内容で環境・shader・deviceを個別調査。'];
  }finally{renderer?.destroy();renderer=null;$('#report').textContent=JSON.stringify(report,null,2);$('#status').textContent=report.status;$('#export').disabled=false;$('#run').disabled=false;}
};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='DVA-E-actual-GPU-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
