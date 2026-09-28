// Astra独立設計。画像テクスチャなし。PH1=手元射出光、OBS1=源に束縛したレンズ応答。
export const VERSION='astra-sunbeam-lens-ghost-v2';
export const DURATION=1.72;
export const SPARKLE_ANGLE=13*Math.PI/180;
export const GHOSTS=[[-.34,18,.18],[.50,36,.25],[.67,20,.19]];
export function ghostCenters(source,center){return GHOSTS.map(([k,r,gain])=>({x:center[0]+k*(center[0]-source[0]),y:center[1]+k*(center[1]-source[1]),k,r,gain}));}
export const WGSL=`
struct U { size:vec4f, sourceTarget:vec4f, optical:vec4f, settings:vec4f }; @group(0) @binding(0) var<uniform> u:U;
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position) vec4f {
 let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(a[i],0,1);
}
fn gauss(v:f32,r:f32)->f32{return exp(-v*v/max(r*r,.01));}
fn ss(a:f32,b:f32,v:f32)->f32{return smoothstep(a,b,v);}
fn crossLight(q:vec2f,r:f32)->f32{
 let a=.226892803;let p=vec2f(q.x*cos(a)+q.y*sin(a),-q.x*sin(a)+q.y*cos(a));
 return (gauss(p.x,r)*gauss(p.y,.50)+gauss(p.x,.50)*gauss(p.y,r*.67))*1.2;
}
@fragment fn fs(@builtin(position)f:vec4f)->@location(0) vec4f {
 let p=f.xy/u.size.z; let t=u.size.w;let S=u.sourceTarget.xy;let T=u.sourceTarget.zw;
 let C=u.optical.xy;let zoom=u.optical.z;let ghostOn=u.optical.w;
 let q=(p-S)/zoom;let d=(T-S)/zoom;let L=max(length(d),.001);let axis=d/L;let normal=vec2f(-axis.y,axis.x);
 let along=dot(q,axis);let across=dot(q,normal);let x=clamp(along/L,0.,1.);
 let charge=ss(.01,.14,t)*(1.-ss(.17,.31,t));
 let firing=ss(.16,.25,t)*(1.-ss(1.04,1.65,t));
 let sourceGain=(charge*.46+firing)*(1.-ss(1.65,1.72,t));
 let front=ss(.18,.40,t);let endGate=1.-ss(L*front-5.,L*front+5.,along);
 let tubeGate=ss(-2.,2.,along)*endGate;
 let profile=pow(max(0.,sin(x*3.14159265)),.65);
 let width=2.4+3.0*profile;
 // PH1: 有限光路の白金芯、散乱体積、移流する内部カースティクス。
 let core=gauss(across,width*.28)*tubeGate*firing;
 let body=gauss(across,width)*tubeGate*firing*(.52+.30*(1.-x));
 let volume=gauss(across,9.+8.*profile)*tubeGate*firing*.21;
 var light=vec3f(5.2,4.5,2.7)*core+vec3f(1.25,.63,.16)*body+vec3f(.88,.34,.045)*volume;
 for(var i=0;i<2;i++){
  let phase=f32(i)*3.14159265;let wave=sin(x*7.1-t*8.+phase);
  let offset=wave*(3.+4.*profile);let filament=gauss(across-offset,.58)*profile*tubeGate*firing;
  let depth=.45+.40*cos(x*7.1-t*8.+phase);
  light+=vec3f(1.8,1.06,.24)*filament*depth;
 }
 // 手元の源は半径に異なる光量勾配。OBSを切っても主形は成立する。
 let sr=length(q);light+=sourceGain*(vec3f(12.,9.5,5.4)*gauss(sr,3.7)+vec3f(2.4,1.25,.25)*gauss(sr,9.));
 let head=length((p-(S+(T-S)*front))/zoom);
 light+=vec3f(3.2,2.2,.65)*gauss(head,3.2)*firing*ss(.22,.32,t);
 // OBS1 bloom/streak。全光条が同じ13度基準。世界内の輪や粒子を追加しない。
 light+=sourceGain*vec3f(1.1,.53,.12)*gauss(sr,22.);
 light+=sourceGain*vec3f(4.4,3.2,1.4)*crossLight(q,23.);
 for(var j=0;j<3;j++) {
  let a=.30+f32(j)*.22;let loc=S+(T-S)*a+normal*zoom*(select(-1.,1.,j%2==0)*5.);
  let localT=t-.28-f32(j)*.09;let sparkle=ss(0.,.07,localT)*(1.-ss(.12,.30,localT));
  light+=vec3f(2.8,1.9,.7)*crossLight((p-loc)/zoom,4.8)*sparkle;
 }
 // OBS2: 本稿では虹色円弧を選択。ユーザーによる他形状の禁止は撤回済み。
 // 中心位置はレンズ内部反射の符号付き倍率、開口方位は光源側のけられの近似。
 let lensAxis=normalize(C-S+vec2f(.0001,0.));let lensNormal=vec2f(-lensAxis.y,lensAxis.x);
 let ks=array<f32,3>(-.34,.50,.67);let rs=array<f32,3>(18.,36.,20.);let gs=array<f32,3>(.18,.25,.19);
 let offAxis=ss(4.,60.,length(C-S)/zoom);let opticalGain=sourceGain*ghostOn*offAxis;
 for(var k=0;k<3;k++) {
  let center=C+ks[k]*(C-S);let raw=(p-center)/zoom;
  let gp=vec2f(dot(raw,lensAxis),dot(raw,lensNormal)/.88);
  let radius=rs[k]*(1.+.075*charge-.045*ss(.19,.4,t));
  let r=length(gp);let side=select(-1.,1.,k==0);let cosine=gp.x*side/max(r,.001);
  // 110–150度の開いた円弧。余った円周を弱い線で繋がない。
  let aperture=ss(.22,.55,cosine)*(1.-ss(radius+7.,radius+8.,r));
  let radial=r-radius;
  let rainbow=vec3f(.61,.08,.82)*gauss(radial+2.6,.90)
    +vec3f(.10,.20,.97)*gauss(radial+1.55,.80)
    +vec3f(.02,.83,.85)*gauss(radial+.55,.80)
    +vec3f(.28,.87,.10)*gauss(radial-.45,.80)
    +vec3f(1.,.63,.03)*gauss(radial-1.45,.80)
    +vec3f(.98,.10,.025)*gauss(radial-2.5,.90);
  // 円弧の中心部は透明。広い色にじみも同じ開いた円弧mask内だけに保つ。
  let opticalSoftness=vec3f(.23,.15,.20)*gauss(radial,5.8)*.18;
  light+=(rainbow+opticalSoftness)*aperture*gs[k]*opticalGain*2.8;
 }
 // linear additive light; sRGB encode once. Background is a verification fixture only.
 let bg=select(vec3f(.006,.012,.023),vec3f(.62,.66,.70),u.settings.x>.5);
 let linear=bg+light;let rgb=select(12.92*linear,1.055*pow(max(linear,vec3f(0.)),vec3f(1./2.4))-.055,linear>vec3f(.0031308));
 return vec4f(rgb,1.);
}`;
export async function createRenderer(canvas){
 if(!navigator.gpu)throw Error('WebGPU unavailable');const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('GPU adapter unavailable');
 const device=await adapter.requestDevice();const errors=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
 const shader=device.createShaderModule({code:WGSL});const compilation=await shader.getCompilationInfo();
 if(compilation.messages.some(x=>x.type==='error'))throw Error(compilation.messages.map(x=>x.message).join('\n'));
 const context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
 const buffer=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});let submissions=0;
 return {errors,compilation:compilation.messages.map(x=>({type:x.type,message:x.message})),adapter:adapter.info,
 render({time,width,height,dpr=1,zoom=1,source=[100,146],target=[530,102],center=[320,160],light=false,ghost=true}){
  if(![time,width,height,dpr,zoom,...source,...target,...center].every(Number.isFinite)||dpr<=0||zoom<=0)throw Error('invalid finite render inputs');
  const pw=Math.round(width*dpr),ph=Math.round(height*dpr);if(canvas.width!==pw)canvas.width=pw;if(canvas.height!==ph)canvas.height=ph;
  device.queue.writeBuffer(buffer,0,new Float32Array([width,height,dpr,time,...source,...target,...center,zoom,+ghost,+light,0,0,0]));
  const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);submissions++;
 },get submissions(){return submissions},done(){return device.queue.onSubmittedWorkDone()},destroy(){buffer.destroy();context.unconfigure();device.destroy()}};
}
