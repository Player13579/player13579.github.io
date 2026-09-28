// Astra独立設計。画像テクスチャなし。PH1=手元射出光、OBS1=源に束縛したレンズ応答。
export const VERSION='astra-sunbeam-lens-ghost-v5';
export const DURATION=1.72;
export const SPARKLE_ANGLE=13*Math.PI/180;
export const GHOSTS=[[-.30,12,.021],[.11,7,.036],[.40,15,.016],[.63,27,.025]];
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
 let ignition=gauss(t-.235,.055);let arrival=gauss(t-.465,.070);
 let sourceGain=(charge*.30+firing*(.50+2.7*ignition+.55*arrival))*(1.-ss(1.65,1.72,t))*u.settings.y;
 let front=ss(.18,.46,t);let endGate=1.-ss(L*front-5.,L*front+5.,along);
 let withdrawal=ss(1.05,1.60,t);
 let rootGate=ss(L*withdrawal-6.,L*withdrawal+3.,along);
 let tubeGate=ss(-2.,2.,along)*endGate*rootGate;
 let profile=pow(max(0.,sin(x*3.14159265)),.58);
 let compression=gauss(x-clamp((t-.22)/.46,0.,1.2),.14)*(1.-ss(.70,.80,t));
 let releaseWidth=1.-.66*ss(.91,1.55,t);
 let radius=(3.5+9.8*profile)*(.64+.36*ss(.24,.46,t))*releaseWidth*(1.+.27*compression);let channel=across-1.5*sin(x*6.2-t*3.5)*profile;
 // PH1a: 柱の断面を解析的に積分。長い外形・中空でない厚み・中心輸送を分離。
 let radial=abs(channel)/radius;
 let chord=sqrt(max(0.,1.-radial*radial));
 let density=chord*(1.-ss(.84,1.05,radial));
 let axialEnvelope=(.72-.27*x)*(.70+.55*compression);
 let volume=density*tubeGate*firing*axialEnvelope;
 let boundary=gauss(abs(channel)-radius*.78,1.5)*profile*tubeGate*firing;
 let core=gauss(channel,(1.15+1.2*profile)*releaseWidth)*tubeGate*firing*(.72+compression*.65);
 var light=vec3f(6.2,4.6,2.25)*core+vec3f(1.48,.43,.037)*volume+vec3f(.38,.17,.025)*boundary;
 // PH1b: 螺旋面の投影。前面/背面で幅・光量が異なり、光芯の前後を横切る。
 for(var i=0;i<2;i++){
  let phase=f32(i)*3.14159265;let angle=x*6.2-t*8.4+phase;
  let z=cos(angle);let sheetCenter=radius*.70*sin(angle);
  let sheetWidth=(1.25+1.9*max(0.,z))*releaseWidth;
  let sheet=gauss(channel-sheetCenter,sheetWidth)*profile*tubeGate*firing*(.38+.45*max(0.,z));
  light+=vec3f(2.4,1.32,.30)*sheet;
 }
 // OBS1: 体積に従う有限散乱。円柱の主輪郭の代わりにぼかしを使わない。
 light+=vec3f(.70,.24,.025)*gauss(channel,radius*1.75)*tubeGate*firing*.16;
 // 手元の源は半径に異なる光量勾配。OBSを切っても主形は成立する。
 let sr=length(q);light+=sourceGain*(vec3f(12.,9.5,5.4)*gauss(sr,3.7)+vec3f(2.4,1.25,.25)*gauss(sr,9.));
 let head=length((p-(S+(T-S)*front))/zoom);
 light+=vec3f(3.2,2.2,.65)*gauss(head,3.2+arrival*3.4)*firing*ss(.22,.32,t);
 // 到達時は光束前端が対象座標へ収束し、一度だけ横断面が圧縮・拡張する。
 let targetQ=(p-T)/zoom;let tx=dot(targetQ,axis);let ty=dot(targetQ,normal);
 light+=vec3f(3.1,1.45,.21)*gauss(tx,2.5+arrival*2.)*gauss(ty,4.+arrival*12.)*arrival;
 // OBS1 bloom/streak。全光条が同じ13度基準。世界内の輪や粒子を追加しない。
 light+=sourceGain*vec3f(1.1,.53,.12)*gauss(sr,22.);
 light+=sourceGain*vec3f(4.4,3.2,1.4)*crossLight(q,23.);
 for(var j=0;j<3;j++) {
  let a=.30+f32(j)*.22;let loc=S+(T-S)*a+normal*zoom*(select(-1.,1.,j%2==0)*5.);
  let localT=t-.28-f32(j)*.09;let sparkle=ss(0.,.07,localT)*(1.-ss(.12,.30,localT));
  light+=vec3f(2.8,1.9,.7)*crossLight((p-loc)/zoom,4.8)*sparkle;
 }
 // OBS2: 虹C/輪郭の列を廃止。異なる焦点距離の透過した結像だけを源の従属応答として描く。
 let lensAxis=normalize(C-S+vec2f(.0001,0.));let lensNormal=vec2f(-lensAxis.y,lensAxis.x);
 let offAxis=ss(4.,60.,length(C-S)/zoom);let opticalGain=sourceGain*ghostOn*offAxis;
 let ks=array<f32,4>(-.30,.11,.40,.63);let radii=array<f32,4>(12.,7.,15.,27.);
 let strengths=array<f32,4>(.021,.036,.016,.025);let focuses=array<f32,4>(5.,1.5,7.,8.);
 let colors=array<vec3f,4>(vec3f(.67,.43,.21),vec3f(.20,.63,.53),vec3f(.40,.23,.43),vec3f(.65,.43,.22));
 for(var j=0;j<4;j++){
  let center=C+ks[j]*(C-S);let rq=(p-center)/zoom;
  let qg=vec2f(dot(rq,lensAxis),dot(rq,lensNormal)/(.90-.035*f32(j)));
  let r=length(qg);let radius=radii[j];let focus=focuses[j];
  // 色の透過した面。線で外周を縁取らず、中心から外へ自然に薄くする。
  let aperture=1.-ss(radius-focus,radius+focus,r);
  let transmission=aperture*(.37+.28*gauss(r,radius*.83));
  // AR膜の収差は同じ像の内部でずれる。独立した虹環にはしない。
  let redImage=(1.-ss(radius-focus,radius+focus,length(qg-lensAxis*.6)))*.09;
  let blueImage=(1.-ss(radius-focus,radius+focus,length(qg+lensAxis*.6)))*.07;
  light+=(colors[j]*transmission+vec3f(.45,.12,.10)*redImage+vec3f(.10,.20,.48)*blueImage)*strengths[j]*opticalGain*3.8;
 }
 // 独立した棒に誤読された長いveilは使用しない。源の局所bloomはOBS1が所有する。
 // linear additive light; sRGB encode once. Background is a verification fixture only.
 let bg=select(vec3f(.006,.012,.023),vec3f(.62,.66,.70),u.settings.x>.5);
 let linear=bg+light;let rgb=select(12.92*linear,1.055*pow(max(linear,vec3f(0.)),vec3f(1./2.4))-.055,linear>vec3f(.0031308));
 return vec4f(rgb,1.);
}`;
export async function createRenderer(canvas){
 if(!navigator.gpu)throw Error('WebGPU unavailable');const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('GPU adapter unavailable');
 const device=await adapter.requestDevice();const errors=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
 const shader=device.createShaderModule({code:WGSL});const compilation=await shader.getCompilationInfo();
 if(compilation.messages.some(x=>x.type==='error'))throw Error(compilation.messages.map(x=>`${x.lineNum}:${x.linePos} ${x.message}`).join('\n'));
 const context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
 const buffer=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});let submissions=0;
 return {errors,compilation:compilation.messages.map(x=>({type:x.type,message:x.message})),adapter:{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description},
 render({time,width,height,dpr=1,zoom=1,source=[100,146],target=[530,102],center=[320,160],light=false,ghost=true,sourceVisible=true}){
  if(![time,width,height,dpr,zoom,...source,...target,...center].every(Number.isFinite)||dpr<=0||zoom<=0)throw Error('invalid finite render inputs');
  const pw=Math.round(width*dpr),ph=Math.round(height*dpr);if(canvas.width!==pw)canvas.width=pw;if(canvas.height!==ph)canvas.height=ph;
  device.queue.writeBuffer(buffer,0,new Float32Array([width,height,dpr,time,...source,...target,...center,zoom,+ghost,+light,+sourceVisible,0,0]));
  const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);submissions++;
 },get submissions(){return submissions},done(){return device.queue.onSubmittedWorkDone()},destroy(){buffer.destroy();context.unconfigure();device.destroy()}};
}
