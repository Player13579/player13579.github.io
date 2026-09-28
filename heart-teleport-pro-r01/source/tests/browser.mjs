import {HeartGPU} from '../src/gpu.mjs';
let report=null;
const $=id=>document.getElementById(id);
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
function metrics(data,baseline){let changed=0,delta=0,peak=0;for(let i=0;i<data.length;i+=4){let diff=0;for(let c=0;c<3;c++){diff+=Math.abs(data[i+c]-baseline[i+c]);peak=Math.max(peak,data[i+c]);}if(diff>6)changed++;delta+=diff;}return {changedPixels:changed,meanAbsoluteRGBDelta:delta/(64*64*3),peakByte:peak};}
export async function runGPUChecks(){
 const r={startedAt:new Date().toISOString(),syntax_and_shader:'not_run',queue_and_readback:'not_run',hardware_GPU:'not_run',visual_quality:'not_run',real_audition:'not_run',game_connection:'not_run',audioContextsCreated:0,tests:[],samples:[],limitations:['GPU画素検査は芸術的な可読性の評価を代替しない。','adapterは実測のinfoを記録する。softwareをhardwareと呼ばない。']};
 let device,gpu,texture,staging;
 try{
  assert(navigator.gpu,'WebGPU unavailable in this secure context');const adapter=await navigator.gpu.requestAdapter();assert(adapter,'No adapter');
  device=await adapter.requestDevice();const info=adapter.info||device.adapterInfo;
  r.adapter={vendor:info?.vendor,architecture:info?.architecture,device:info?.device,description:info?.description,isFallbackAdapter:info?.isFallbackAdapter};
  r.backend=/swiftshader|software|llvmpipe/i.test(JSON.stringify(r.adapter))?'software':'unclassified_adapter';
  const response=await fetch('../shaders/heart.wgsl');assert(response.ok,'shader source fetch');
  gpu=await HeartGPU.create(device,'rgba8unorm-srgb',await response.text());r.syntax_and_shader='pass';
  texture=device.createTexture({label:'H64 diagnostic attachment (not an image asset)',size:[64,64],format:'rgba8unorm-srgb',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
  staging=device.createBuffer({size:256*64,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  const view=texture.createView();
  async function sample(age,clear,{reducedMotion=false,glow=true,layer=0,count=1}={}){
   device.pushErrorScope('validation');
   gpu.render(view,{width:64,height:64,clear,items:age===null?[]:Array.from({length:count},()=>({x:32,y:32,h:64,ageMs:age})),reducedMotion,glow,layer});
   const encoder=device.createCommandEncoder();encoder.copyTextureToBuffer({texture},{buffer:staging,bytesPerRow:256,rowsPerImage:64},[64,64]);device.queue.submit([encoder.finish()]);
   await staging.mapAsync(GPUMapMode.READ);const data=new Uint8Array(staging.getMappedRange()).slice();staging.unmap();
   const error=await device.popErrorScope();assert(!error,error?.message||'GPU validation');return data;
  }
  const backgrounds={dark:{r:.005,g:.006,b:.012,a:1},light:{r:.78,g:.76,b:.72,a:1}};
  for(const [name,bg] of Object.entries(backgrounds)){
   const baseline=await sample(null,bg);
   for(let i=0;i<=108;i++){
    const t=i*1800/108,data=await sample(t,bg),m=metrics(data,baseline);r.samples.push({background:name,ageMs:t,...m});
    if(i===0||i===108)assert(m.changedPixels===0,`${name}: nonzero endpoint ${t}`);
    if(i===40)assert(m.changedPixels>150,`${name}: missing shape at peak`);
    if(i%18===0){$('progress').textContent=`${name} ${i}/108`;const c=$('pixel').getContext('2d');c.putImageData(new ImageData(new Uint8ClampedArray(data),64,64),0,0);await new Promise(resolve=>requestAnimationFrame(resolve));}
   }
   r.tests.push({name:`${name} 109 full-lifetime samples`,status:'pass'});
   for(const flags of [{reducedMotion:true},{glow:false},{count:8},{layer:1},{layer:2}]){
    const data=await sample(670,bg,flags),m=metrics(data,baseline);assert(m.changedPixels>0,`empty diagnostic ${JSON.stringify(flags)}`);r.tests.push({name:`${name} ${JSON.stringify(flags)}`,status:'pass',metrics:m});
   }
   const a=await sample(670,bg),b=await sample(670,bg);assert(a.every((v,i)=>v===b[i]),'nondeterministic fixed-time render');r.tests.push({name:`${name} repeated-frame equality`,status:'pass'});
  }
  await gpu.settled();assert(gpu.errors().length===0,'uncaptured GPU errors');r.queue_and_readback='pass';r.shaderMessages=gpu.errors();
 }catch(e){r.error=String(e.message||e);r.status='failed';if(r.syntax_and_shader==='pass')r.queue_and_readback='failed';}
 finally{gpu?.dispose();staging?.destroy();texture?.destroy();device?.destroy();r.resourcesReleased=true;r.completedAt=new Date().toISOString();}
 if(!r.error)r.status='pass_for_implemented_numerical_checks_only';return r;
}
$('run').addEventListener('click',async()=>{$('run').disabled=true;report=await runGPUChecks();$('report').textContent=JSON.stringify(report,null,2);$('progress').textContent=report.status;$('save').disabled=false;$('run').disabled=false;});
$('save').addEventListener('click',()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gpu-browser-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
if(new URLSearchParams(location.search).get('auto')==='1')$('run').click();
