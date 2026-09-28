// Astra独立設計。画像テクスチャなし。PH1=手元射出光、OBS1=源に束縛したレンズ応答。
export const VERSION='astra-sunbeam-lens-ghost-v3';
export const DURATION=1.72;
export const SPARKLE_ANGLE=13*Math.PI/180;
export const GHOSTS=[[-.32,13,.045],[.51,40,.13],[.72,22,.085]];
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
 let profile=pow(max(0.,sin(x*3.14159265)),.58);
 let radius=3.5+9.8*profile;let channel=across-1.5*sin(x*6.2-t*3.5)*profile;
 // PH1a: 柱の断面を解析的に積分。長い外形・中空でない厚み・中心輸送を分離。
 let radial=abs(channel)/radius;
 let chord=sqrt(max(0.,1.-radial*radial));
 let density=chord*(1.-ss(.84,1.05,radial));
 let axialEnvelope=.92-.37*x;
 let volume=density*tubeGate*firing*axialEnvelope;
 let boundary=gauss(abs(channel)-radius*.78,1.5)*profile*tubeGate*firing;
 let core=gauss(channel,1.15+1.2*profile)*tubeGate*firing;
 var light=vec3f(6.2,4.6,2.25)*core+vec3f(1.48,.43,.037)*volume+vec3f(.38,.17,.025)*boundary;
 // PH1b: 螺旋面の投影。前面/背面で幅・光量が異なり、光芯の前後を横切る。
 for(var i=0;i<2;i++){
  let phase=f32(i)*3.14159265;let angle=x*8.8-t*4.8+phase;
  let z=cos(angle);let sheetCenter=radius*.70*sin(angle);
  let sheetWidth=1.25+1.9*max(0.,z);
  let sheet=gauss(channel-sheetCenter,sheetWidth)*profile*tubeGate*firing*(.38+.45*max(0.,z));
  light+=vec3f(2.4,1.32,.30)*sheet;
 }
 // OBS1: 体積に従う有限散乱。円柱の主輪郭の代わりにぼかしを使わない。
 light+=vec3f(.70,.24,.025)*gauss(channel,radius*1.75)*tubeGate*firing*.16;
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
 // OBS2: 内部反射に起因する虹色円弧と非結像ghost。源の光学応答として一体化。
 let lensAxis=normalize(C-S+vec2f(.0001,0.));let lensNormal=vec2f(-lensAxis.y,lensAxis.x);
 let offAxis=ss(4.,60.,length(C-S)/zoom);let opticalGain=sourceGain*ghostOn*offAxis;
 let ghostC=C+.51*(C-S);let raw=(p-ghostC)/zoom;
 let gp=vec2f(dot(raw,lensAxis)/1.03,dot(raw,lensNormal)/.91);let rr=length(gp);
 let ringRadius=40.*(1.+.025*charge-.03*ss(.19,.4,t));let band=rr-ringRadius;
 // 開いた約220度の虹色像。方位ゲインと焦点差で均一な括弧を避ける。
 let directional=ss(-.56,.40,-gp.x/max(rr,.001));
 let sector=directional*(.38+.62*ss(-.85,.80,gp.y/max(rr,.001)));
 let rainbow=vec3f(.50,.12,.64)*gauss(band+2.8,1.5)+vec3f(.10,.28,.82)*gauss(band+1.1,1.45)
  +vec3f(.15,.68,.39)*gauss(band-.5,1.5)+vec3f(.95,.52,.08)*gauss(band-2.0,1.5)+vec3f(.82,.15,.045)*gauss(band-3.3,1.6);
 light+=rainbow*sector*opticalGain*.44;
 // レンズ面の焦点外像は柔らかい透過分布。外周だけを線で囲まない。
 let deep=(p-(C+.72*(C-S)))/zoom;let deepR=length(vec2f(dot(deep,lensAxis),dot(deep,lensNormal)/.84));
 light+=opticalGain*vec3f(.16,.50,.39)*gauss(deepR,18.)*.15;
 light+=opticalGain*vec3f(.37,.16,.40)*gauss(deepR-20.,4.)*.075;
 let near=(p-(C-.32*(C-S)))/zoom;
 light+=opticalGain*vec3f(.55,.32,.10)*gauss(length(near),10.)*.095;
 // 源からghost域へ連続するstray-lightの薄い局所veil。新しい世界内の棒ではない。
 let veilQ=(p-(S+(C-S)*.53))/zoom;let vx=dot(veilQ,lensAxis);let vy=dot(veilQ,lensNormal);
 light+=vec3f(.39,.24,.085)*gauss(vx,111.)*gauss(vy,14.)*opticalGain*.11;
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
 render({time,width,height,dpr=1,zoom=1,source=[100,146],target=[530,102],center=[320,160],light=false,ghost=true}){
  if(![time,width,height,dpr,zoom,...source,...target,...center].every(Number.isFinite)||dpr<=0||zoom<=0)throw Error('invalid finite render inputs');
  const pw=Math.round(width*dpr),ph=Math.round(height*dpr);if(canvas.width!==pw)canvas.width=pw;if(canvas.height!==ph)canvas.height=ph;
  device.queue.writeBuffer(buffer,0,new Float32Array([width,height,dpr,time,...source,...target,...center,zoom,+ghost,+light,0,0,0]));
  const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);submissions++;
 },get submissions(){return submissions},done(){return device.queue.onSubmittedWorkDone()},destroy(){buffer.destroy();context.unconfigure();device.destroy()}};
}
