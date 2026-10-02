import {PROFILE,smokeLobes,smokeSupport,createWebGPUKernels,conversionSourceAt} from './creative.mjs';
import {makeFramePlan,selectFrameLayers} from './teleport-smoke-height-zero-adapter.mjs';

const f32=v=>new Float32Array(v);
const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
const receiverVertex=`
struct VIn{@location(0) clip:vec2f,@location(1) world:vec3f,@location(2) normal:vec3f,@location(3) material:vec3f,@location(4) valid:f32};
struct VOut{@builtin(position) position:vec4f,@location(0) point:vec3f,@location(1) normal:vec3f,@location(2) material:vec3f,@location(3) valid:f32};
@vertex fn vs(i:VIn)->VOut{var o:VOut;o.position=vec4f(i.clip,0,1);o.point=i.world;o.normal=i.normal;o.material=i.material;o.valid=i.valid;return o;}`;
const floorFrag=`
struct FloorIn{@builtin(position) position:vec4f,@location(0) point:vec3f,@location(1) normal:vec3f,@location(2) material:vec3f,@location(3) valid:f32};
@fragment fn fs(i:FloorIn)->@location(0) vec4f{return vec4f(i.material,1.0);}`;
const shadowFrag=`
struct Shadow{radiusAlpha:vec4f};@group(0) @binding(0) var<uniform> s:Shadow;
struct ShadowIn{@builtin(position) position:vec4f,@location(0) point:vec3f,@location(1) normal:vec3f,@location(2) material:vec3f,@location(3) valid:f32};
@fragment fn fs(i:ShadowIn)->@location(0) vec4f{if(i.valid<=0.0||s.radiusAlpha.x<=0.0||s.radiusAlpha.y<=0.0){return vec4f(0);}let r=i.point.xy/s.radiusAlpha.y;let a=s.radiusAlpha.x*exp(-3.1*dot(r,r));return vec4f(0,0,0,a);}`;
const nearbyWGSL=`${receiverVertex}\n${(await import('./creative.mjs')).NEARBY_WGSL}`;
const compositeWGSL=`
@group(0) @binding(0) var scene:texture_2d<f32>;@group(0) @binding(1) var observer:texture_2d<f32>;@group(0) @binding(2) var smp:sampler;
struct VOut{@builtin(position) position:vec4f};@vertex fn vs(@builtin(vertex_index) i:u32)->VOut{var v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VOut;o.position=vec4f(v[i],0,1);return o;}
fn linearToSrgb(v:vec3f)->vec3f{return select(12.92*v,1.055*pow(max(v,vec3f(0)),vec3f(1.0/2.4))-0.055,v>vec3f(0.0031308));}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f{let uv=p.xy/vec2f(textureDimensions(scene));let a=textureSampleLevel(scene,smp,uv,0);let b=textureSampleLevel(observer,smp,uv,0);let linear=a.rgb+b.rgb;return vec4f(OUTGOING_RGB,1);}`;

function buffer(device,label,data,usage){const bytes=data instanceof ArrayBuffer?new Uint8Array(data):new Uint8Array(data.buffer,data.byteOffset,data.byteLength);const size=Math.max(4,Math.ceil(bytes.byteLength/4)*4);const b=device.createBuffer({label,size,usage,mappedAtCreation:true});new Uint8Array(b.getMappedRange()).set(bytes);b.unmap();return b;}
export function registeredActorCssHeight(worldHeight,zoom){if(!Number.isFinite(worldHeight)||worldHeight<=0||!Number.isFinite(zoom)||zoom<=0)throw new TypeError('Positive registered actor height and zoom required');return worldHeight*zoom;}
export function actorClipAffine(transform,cssW,cssH,movedTy){
  if(!Array.isArray(transform)||transform.length!==6||!transform.every(Number.isFinite)||![cssW,cssH,movedTy].every(Number.isFinite)||cssW<=0||cssH<=0)throw new TypeError('Finite CSS actor transform required');
  const [a,b,c,d,tx]=transform;return Object.freeze([2*a/cssW,-2*b/cssH,2*c/cssW,-2*d/cssH,2*tx/cssW-1,1-2*movedTy/cssH]);
}
import {packSmokeLobeRows as packR8Rows} from './pack-rows.mjs';
export function packSmokeLobeRows(lobes){return packR8Rows(lobes);}
export function visibleMaskAreaH2(pose,actorHpx,maskWidth=.38,maskHeight=.35){
  const t=pose?.transform,r=pose?.localRect;
  if(!Array.isArray(t)||t.length!==6||!t.every(Number.isFinite)||!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite)||
      ![actorHpx,maskWidth,maskHeight].every(Number.isFinite)||actorHpx<=0||r[2]<=0||r[3]<=0||maskWidth<=0||maskHeight<=0)throw new TypeError('Finite prepared sprite pose and registered screen H required');
  return Math.abs(t[0]*t[3]-t[1]*t[2])*r[2]*r[3]/(actorHpx*actorHpx)*maskWidth*maskHeight;
}
export function buildHostFrameDescriptors(plan,poseResources,settings={},actorHpx=98.4375){
  const layers=selectFrameLayers(plan),rows=plan?.status==='ready'?plan.endpointRows:[];
  const roleDescriptors=['departure','arrival'].filter(role=>!!poseResources?.[role]&&
    (plan?.status!=='ready'||rows.some(item=>item.role===role))).map(role=>{
    const row=rows.find(item=>item.role===role)||null;
    const pairedDraw=role==='departure'?plan?.pairedAuthority?.drawDeparture:plan?.pairedAuthority?.drawArrival;
    const authorizedLift=plan?.status==='ready'&&!!row&&!!row.phase.drawLiftedBody&&!!pairedDraw;
    // The event-owned optical source outlives the short body stroke while its actual
    // smoke row remains active. Body flux itself still requires an authorized lift.
    const sourceEnabled=plan?.status==='ready'&&!!row&&settings.lighting?.sourceEnabled!==false&&row.source?.sourceEnabled!==false;
    const fluxEnabled=authorizedLift&&sourceEnabled&&row.source.strength>0;
    const fluxUniform=Object.freeze({strength:fluxEnabled?row.source.strength:0,bodyCoverage:fluxEnabled?row.source.bodyCoverage:0,
      enabled:fluxEnabled?1:0,visibleMaskAreaH2:fluxEnabled?visibleMaskAreaH2(poseResources[role].pose,actorHpx,.24,.27):0});
    const smoke=row&&row.phase.smokeEnvelope>0;
    const groundedHandoff=layers.ordinary&&role==='arrival'&&!!row;
    const actions=[];
    if(smoke)actions.push('back-smoke');
    if(authorizedLift)actions.push('lifted-body');
    else if(groundedHandoff)actions.push('ordinary-grounded-body');
    if(smoke)actions.push('front-smoke');
    return Object.freeze({role,row,actorUniformMode:authorizedLift?'authorized-lift':'ordinary-grounded',
      phase:authorizedLift?row.phase:null,sourceEnabled,fluxEnabled,fluxUniform,
      nearbyEnabled:sourceEnabled&&settings.lighting?.nearbyEnabled!==false,
      observerEnabled:sourceEnabled&&settings.lighting?.observerEnabled!==false,
      shadowEnabled:authorizedLift&&row.phase.shadowAlpha>0,smokePasses:smoke?Object.freeze(['back-smoke','front-smoke']):Object.freeze([]),
      actions:Object.freeze(actions),groundedHandoff,pose:poseResources[role].pose});
  });
  const bodySourceRole=roleDescriptors.find(x=>x.fluxEnabled&&x.actorUniformMode==='authorized-lift')?.role||null;
  const conversionSources=roleDescriptors.filter(x=>x.sourceEnabled&&x.row?.lobes?.length===7&&
    conversionSourceAt(plan.ageEms,x.role,x.row.lobes,{sourceEnabled:true}).strength>0).map(x=>x.role);
  const sourceRoles=Object.freeze([...new Set([...conversionSources,...(bodySourceRole?[bodySourceRole]:[])])]);
  const sourceRole=sourceRoles[0]||null;
  const fallbackOrdinary=layers.ordinary&&!roleDescriptors.some(x=>x.role==='arrival'&&x.groundedHandoff);
  return Object.freeze({floorRoles:Object.freeze(['departure','arrival'].filter(role=>!!poseResources?.[role])),
    roleDescriptors:Object.freeze(roleDescriptors),sourceRole,sourceRoles,bodySourceRole,conversionSources:Object.freeze(conversionSources),fallbackOrdinary,authoredVisible:layers.authoredVisible,
    effectActive:plan?.status==='ready'});
}
function moduleWithMessages(device,label,code){const module=device.createShaderModule({label,code});return {module,info:module.getCompilationInfo()};}
const scalar=(value)=>typeof value==='string'||typeof value==='number'&&Number.isFinite(value)?value:null;
export async function pipeline(device,label,code,format,{vertex='vs',fragment='fs',compute=false,blendState=null,vertexBuffers=[]}={}){
  const {module,info}=moduleWithMessages(device,label,code),messages=(await info).messages.map(m=>({type:scalar(m.type),message:scalar(m.message),lineNum:scalar(m.lineNum),linePos:scalar(m.linePos),offset:scalar(m.offset),length:scalar(m.length)}));
  if(messages.some(m=>m.type==='error')){const error=new Error(`WGSL compilation failed: ${label}`);error.pipelineLabel=label;error.diagnostics=messages;throw error;}
  const p=compute?await device.createComputePipelineAsync({label,layout:'auto',compute:{module,entryPoint:fragment}}):await device.createRenderPipelineAsync({label,layout:'auto',vertex:{module,entryPoint:vertex,buffers:vertexBuffers},fragment:{module,entryPoint:fragment,targets:[{format,...(blendState?{blend:blendState}:{})}]},primitive:{topology:'triangle-list'}});
  return {pipeline:p,messages};
}
function resource(device,label,size,format,usage){
  const [width,height]=size;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw new RangeError('Positive finite GPU target dimensions required');
  return device.createTexture({label,size:{width,height,depthOrArrayLayers:1},format,usage});
}

export async function createSmokeHost({device,context,canvas,cache,format='rgba16float',presentationFormat}){
  if(!device?.createShaderModule||!device.queue||!context||!canvas||!cache?.prepareSampledResource)throw TypeError('Actual shared WebGPU device, surface, and authored pose cache required');
  const kernel=await createWebGPUKernels(device,format);
  const vertexBuffers=[{arrayStride:48,attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x3'},
    {shaderLocation:2,offset:20,format:'float32x3'},{shaderLocation:3,offset:32,format:'float32x3'},{shaderLocation:4,offset:44,format:'float32'}]}];
  const floor=await pipeline(device,'teleport-zero-fixture-ground-geometry',receiverVertex+'\n'+floorFrag,format,{vertexBuffers});
  const shadow=await pipeline(device,'teleport-zero-grounded-shadow-adapter',receiverVertex+'\n'+shadowFrag,format,{vertexBuffers,blendState:blend});
  const nearby=await pipeline(device,'teleport-zero-real-fixture-receiver',nearbyWGSL,format,{vertexBuffers,blendState:{color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}}});
  const outputFormat=presentationFormat||navigator.gpu.getPreferredCanvasFormat();
  const compositeCode=compositeWGSL.replace('OUTGOING_RGB',outputFormat.endsWith('-srgb')?'linear':'linearToSrgb(linear)');
  const composite=await pipeline(device,'teleport-zero-final-source-over-copy',compositeCode,outputFormat);
  const sampler=device.createSampler({label:'teleport-zero-linear-clamp',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',magFilter:'linear',minFilter:'linear'});
  const observed=[];let destroyed=false,targets=null,targetGeneration=0;
  function ensureTargets(){
    const w=canvas.width,h=canvas.height;
    if(targets&&targets.width===w&&targets.height===h)return targets;
    const old=targets;targets={width:w,height:h,generation:++targetGeneration,
      scene:resource(device,'teleport-zero-linear-scene',[w,h],format,GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING),
      source:resource(device,'teleport-zero-source-only-radiance',[w,h],format,GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING),
      observer:resource(device,'teleport-zero-source-bound-observer',[w,h],format,GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING)};
    if(old){const done=device.queue.onSubmittedWorkDone();void done.catch(()=>{}).then(()=>{old.scene.destroy();old.source.destroy();old.observer.destroy();});}
    return targets;
  }
  function floorVertices({groundCss,actorHpx,dpr,width,height}){
    const corners=[[-1.6,-.72],[1.6,-.72],[1.6,.72],[-1.6,-.72],[1.6,.72],[-1.6,.72]],out=[];
    for(const [x,d] of corners){const sx=(groundCss.x+x*actorHpx)*dpr,sy=(groundCss.y+d*.35*actorHpx)*dpr;
      const clipX=2*sx/width-1,clipY=1-2*sy/height;
      out.push(clipX,clipY,x,d,0,0,0,1,.22,.24,.27,1);}
    return new Float32Array(out);
  }
  function actorData(pose,cssW,cssH,dpr,phase,source,actorHpx,groundCss,nearbyEnabled,groundShiftCss=0){
    const t=pose.transform,[a,b,c,d,tx,ty]=t,rect=pose.localRect;
    const yShiftCss=phase?.drawLiftedBody?phase.heightH*actorHpx:groundShiftCss;
    const movedTy=ty-yShiftCss,affine=actorClipAffine(t,cssW,cssH,movedTy);
    const data=[...affine,
      0,0,rect[0],rect[1],rect[2],rect[3],...pose.uvRect,
      phase?.drawLiftedBody?phase.bodyAlpha:1,1,source?.strength||0,source?.bodyCoverage||0,
      .5,.52,.24,.27,groundCss.x*dpr,groundCss.y*dpr,actorHpx*dpr,nearbyEnabled?1:0];
    return new Float32Array(data);
  }
  function centerAndHeight(pose,phase,actor,groundCss,actorHpx){
    const [a,b,c,d,tx,ty]=pose.transform,r=pose.localRect;
    const px=r[0]+.5*r[2],py=r[1]+.52*r[3],x=a*px+c*py+tx;
    const screenH=Math.max(1,actorHpx);
    const y=b*px+d*py+ty-(phase?.drawLiftedBody?phase.heightH*screenH:0);
    return {xH:(x-groundCss.x)/screenH,zH:(groundCss.y-y)/screenH,dH:0,screenH};
  }
  function smokeParams({groundCss,screenH,dpr,depth,source,conversion,ageSeconds,envelope,support}){
    if(!support||!['minX','maxX','minDepth','maxDepth','minHeight','maxHeight'].every(k=>Number.isFinite(support[k])))throw new TypeError('Finite CPU-derived smoke support is required');
    return new Float32Array([groundCss.x*dpr,groundCss.y*dpr,screenH*dpr,depth,
      envelope,.45,.35,ageSeconds,source?.sourceEnabled?1:0,source?.sourceCenterHeightH??source?.heightH??0,
      source?.sourceCenterXH||0,source?.sourceCenterDH||0,
      support.minX,support.maxX,support.minDepth,support.maxDepth,
      support.minHeight,support.maxHeight,0,0,
      conversion?.strength||0,conversion?.center?.[0]||0,conversion?.center?.[1]||0,conversion?.center?.[2]||0]);
  }
  function createSourcePosition(pose,phase,groundCss,actorHpx){const c=centerAndHeight(pose,phase,null,groundCss,actorHpx);return c;}
  async function render({plan,poseResources,canvasCss,settings={}}){
    if(destroyed)throw new Error('smoke host disposed');
    const {width:cssW,height:cssH,dpr,actorHWorld:registeredActorHWorld}=canvasCss,w=canvas.width,h=canvas.height;
    const buffers=[],pins=[];let errorScopeOpen=false;
    try{
      for(const p of Object.values(poseResources)){pins.push(p.resource.ownerLease.pin(p.resource.uploadVersion));}
      device.pushErrorScope('validation');errorScopeOpen=true;
      const t=ensureTargets();
      const encoder=device.createCommandEncoder({label:'teleport ZERO smoke-height authored frame'});
      // Per-frame compute descriptors/flux storage are immutable slices. Every endpoint owns a separate buffer.
      const actorHWorld=Number.isFinite(registeredActorHWorld)&&registeredActorHWorld>0?registeredActorHWorld:98.4375;
      const fluxByRole=new Map(),actorBindings=new Map(),groundByRole=new Map();
      const zoom=canvasCss.zoom,actorHpx=actorHWorld*zoom;
      const descriptors=buildHostFrameDescriptors(plan,poseResources,settings,actorHpx);
      for(const role of ['departure','arrival']){
        const wrapped=poseResources[role];if(!wrapped)continue;
        const anchor=plan.status==='ready'?(role==='departure'?plan.receipt.from:plan.receipt.to):wrapped.actor;
        const groundCss={x:(anchor.x-canvasCss.camera.x)*zoom,y:(anchor.y-canvasCss.camera.y)*zoom};groundByRole.set(role,groundCss);
        const desc=descriptors.roleDescriptors.find(x=>x.role===role),selected=desc?.row;
        const phase=desc?.phase||null,visibleSource=selected?.source||{strength:0,bodyCoverage:0,sourceEnabled:false};
        const sourceLight={...visibleSource,strength:desc?.fluxEnabled?visibleSource.strength:0,
          bodyCoverage:desc?.fluxEnabled?visibleSource.bodyCoverage:0,sourceEnabled:!!desc?.sourceEnabled,
          nearbyEnabled:!!desc?.nearbyEnabled,observerEnabled:!!desc?.sourceEnabled&&settings.lighting?.observerEnabled!==false};
        const pose=wrapped.pose,resource=wrapped.resource;
        const fluxBuf=buffer(device,`teleport-zero-${role}-flux-output`,new Float32Array(8),GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST);buffers.push(fluxBuf);fluxByRole.set(role,fluxBuf);
        device.queue.writeBuffer(fluxBuf,0,new Float32Array(8));
        const mask=new Float32Array([.5,.52,.24,.27]);
        const flux=desc?.fluxUniform||{strength:0,bodyCoverage:0,enabled:0,visibleMaskAreaH2:0};
        const fluxUniform=new Float32Array([...pose.uvRect,...mask,flux.strength,flux.bodyCoverage,flux.enabled,flux.visibleMaskAreaH2]);
        const fluxU=buffer(device,`teleport-zero-${role}-flux-params`,fluxUniform,GPUBufferUsage.UNIFORM);buffers.push(fluxU);
        const fluxGroup=device.createBindGroup({layout:kernel.sourceFlux.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:fluxU}},
          {binding:1,resource:resource.texture.createView()},{binding:2,resource:sampler},{binding:3,resource:{buffer:fluxBuf}}]});
        const sourcePosition=createSourcePosition(pose,phase,groundCss,actorHpx);
        const source={...sourceLight,sourceCenterXH:sourcePosition.xH,sourceCenterDH:sourcePosition.dH,
          sourceCenterHeightH:sourcePosition.zH};
        if(desc?.fluxEnabled){const cpass=encoder.beginComputePass({label:`teleport-zero-${role}-same-frame-body-source-flux`});cpass.setPipeline(kernel.sourceFlux);cpass.setBindGroup(0,fluxGroup);cpass.dispatchWorkgroups(1);cpass.end();}
        let conversion={strength:0,center:[0,0,0]},lobeBuffer=null,smokeGroups={},smokeEmissionGroups={};
        if(selected&&selected.phase.smokeEnvelope>0&&selected.lobes?.length===7){
          conversion=conversionSourceAt(plan.ageEms,role,selected.lobes,{sourceEnabled:!!desc?.sourceEnabled});
          lobeBuffer=buffer(device,`teleport-r7-${role}-smoke-cross-sections`,packSmokeLobeRows(selected.lobes),GPUBufferUsage.STORAGE);buffers.push(lobeBuffer);
          for(const [label,depth] of [['back',1],['front',-1]]){
            const smokeUniform=buffer(device,`teleport-r7-${role}-${label}-smoke-uniform`,smokeParams({groundCss,screenH:actorHpx,dpr,
              depth,source,conversion,ageSeconds:plan.ageEms/1000,envelope:selected.phase.smokeEnvelope,support:selected.smokeSupport||smokeSupport(plan.ageEms,role)}),GPUBufferUsage.UNIFORM);buffers.push(smokeUniform);
            smokeGroups[label]=device.createBindGroup({layout:kernel.smoke.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:smokeUniform}},
              {binding:1,resource:{buffer:lobeBuffer}},{binding:2,resource:{buffer:fluxBuf}}]});
            smokeEmissionGroups[label]=device.createBindGroup({layout:kernel.smokeEmission.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:smokeUniform}},
              {binding:1,resource:{buffer:lobeBuffer}}]});
          }
          if(desc?.sourceEnabled&&conversion.strength>0){const cUniform=buffer(device,`teleport-r7-${role}-conversion-flux-uniform`,smokeParams({groundCss,screenH:actorHpx,dpr,
              depth:0,source,conversion,ageSeconds:plan.ageEms/1000,envelope:selected.phase.smokeEnvelope,support:selected.smokeSupport||smokeSupport(plan.ageEms,role)}),GPUBufferUsage.UNIFORM);buffers.push(cUniform);
            const cGroup=device.createBindGroup({layout:kernel.conversionFlux.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:cUniform}},
              {binding:1,resource:{buffer:lobeBuffer}},{binding:2,resource:{buffer:fluxBuf}}]});
            const cp=encoder.beginComputePass({label:`teleport-r7-${role}-conversion-radiance-flux-centroid`});cp.setPipeline(kernel.conversionFlux);cp.setBindGroup(0,cGroup);cp.dispatchWorkgroups(1);cp.end();}
        }
        const actorBuf=buffer(device,`teleport-r7-${role}-actor-uniform`,actorData(pose,cssW,cssH,dpr,phase,source,actorHpx,groundCss,
          !!desc?.nearbyEnabled),GPUBufferUsage.UNIFORM);buffers.push(actorBuf);
        const actorGroup=device.createBindGroup({layout:kernel.actor.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:actorBuf}},
          {binding:1,resource:resource.texture.createView()},{binding:2,resource:sampler},{binding:3,resource:{buffer:fluxBuf}}]});
        const emissionGroup=device.createBindGroup({layout:kernel.emission.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:actorBuf}},
          {binding:1,resource:resource.texture.createView()},{binding:2,resource:sampler}]});
        actorBindings.set(role,{buffer:actorBuf,group:actorGroup,emissionGroup,phase,source,conversion,pose,smokeGroups,smokeEmissionGroups,lobeBuffer});
      }
      const floorRows=[];
      for(const role of descriptors.floorRoles){
        const groundCss=groundByRole.get(role);if(!groundCss)continue;
        const desc=descriptors.roleDescriptors.find(x=>x.role===role),phase=desc?.phase;
        const vertices=floorVertices({groundCss,actorHpx,dpr,width:w,height:h});const vbuf=buffer(device,`teleport-zero-${role}-owned-ground-fixture-vertices`,vertices,GPUBufferUsage.VERTEX);buffers.push(vbuf);
        const shadowUniform=buffer(device,`teleport-zero-${role}-ground-shadow-params`,new Float32Array([desc?.shadowEnabled?phase.shadowAlpha:0,.28*(desc?.shadowEnabled?phase.shadowRadiusScale:1),0,0]),GPUBufferUsage.UNIFORM);buffers.push(shadowUniform);
        const shadowGroup=device.createBindGroup({layout:shadow.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:shadowUniform}}]});
        const sourcePos=actorBindings.has(role)?createSourcePosition(actorBindings.get(role).pose,phase,groundCss,actorHpx):{xH:0,zH:0,dH:0,screenH:actorHpx};
        const nearbyParams=buffer(device,`teleport-zero-${role}-fixture-receiver-params`,new Float32Array([sourcePos.xH,0,sourcePos.zH,.18,desc?.nearbyEnabled?1:0,0,0,0]),GPUBufferUsage.UNIFORM);buffers.push(nearbyParams);
        const nearbyGroup=device.createBindGroup({layout:nearby.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:nearbyParams}},
          {binding:1,resource:{buffer:fluxByRole.get(role)}}]});
        floorRows.push({role,vertices:vbuf,shadowGroup,nearbyGroup,shadowEnabled:!!desc?.shadowEnabled,nearbyEnabled:!!desc?.nearbyEnabled});
      }
      // Each new target is explicitly cleared every frame so OFF cannot retain last-frame radiance.
      const clearSource=encoder.beginRenderPass({label:'teleport-zero-clear-source-radiance',colorAttachments:[{view:t.source.createView(),loadOp:'clear',clearValue:{r:0,g:0,b:0,a:0},storeOp:'store'}]});clearSource.end();
      const scene=encoder.beginRenderPass({label:'teleport-zero-fixture-world-and-grounded-shadow',colorAttachments:[{view:t.scene.createView(),loadOp:'clear',clearValue:{r:.045,g:.052,b:.064,a:1},storeOp:'store'}]});
      for(const row of floorRows){scene.setPipeline(floor.pipeline);scene.setVertexBuffer(0,row.vertices);scene.draw(6);
        if(row.shadowEnabled){scene.setPipeline(shadow.pipeline);scene.setBindGroup(0,row.shadowGroup);scene.setVertexBuffer(0,row.vertices);scene.draw(6);}
        if(row.nearbyEnabled){scene.setPipeline(nearby.pipeline);scene.setBindGroup(0,row.nearbyGroup);scene.setVertexBuffer(0,row.vertices);scene.draw(6);}}
      scene.end();
      for(const desc of descriptors.roleDescriptors){
        const {role,row}=desc,groundCss=groundByRole.get(role),pose=poseResources[role]?.pose,flux=fluxByRole.get(role);
        if(!groundCss||!pose||!row)continue;
        const bindings=actorBindings.get(role);
        for(const action of desc.actions){
          if(action==='back-smoke'||action==='front-smoke'){
            const label=action==='back-smoke'?'back':'front',group=bindings?.smokeGroups[label];
            if(!group)continue;
            const pass=encoder.beginRenderPass({label:`teleport-r7-${role}-${label}-neutral-scatter-plus-qualified-conversion`,colorAttachments:[{view:t.scene.createView(),loadOp:'load',storeOp:'store'}]});pass.setPipeline(kernel.smoke);pass.setBindGroup(0,group);pass.draw(3);pass.end();
            // Replay the same medium/depth order into the source-only target. This keeps
            // source-alpha attenuation real: back smoke -> body -> front smoke.
            if(bindings.source.observerEnabled){const ep=encoder.beginRenderPass({label:`teleport-r7-${role}-${label}-conversion-source-only`,colorAttachments:[{view:t.source.createView(),loadOp:'load',storeOp:'store'}]});ep.setPipeline(kernel.smokeEmission);ep.setBindGroup(0,bindings.smokeEmissionGroups[label]);ep.draw(3);ep.end();}
          }else if(action==='lifted-body'||action==='ordinary-grounded-body'){
            const pass=encoder.beginRenderPass({label:`teleport-r7-${role}-${action}`,colorAttachments:[{view:t.scene.createView(),loadOp:'load',storeOp:'store'}]});pass.setPipeline(kernel.actor);pass.setBindGroup(0,bindings.group);pass.draw(6);pass.end();
            if(bindings.source.observerEnabled){const ep=encoder.beginRenderPass({label:`teleport-r7-${role}-${action}-alpha-occluder-and-body-source`,colorAttachments:[{view:t.source.createView(),loadOp:'load',storeOp:'store'}]});ep.setPipeline(kernel.emission);ep.setBindGroup(0,bindings.emissionGroup);ep.draw(6);ep.end();}
          }
        }
      }
      if(descriptors.fallbackOrdinary){const role=poseResources.arrival?'arrival':'departure',bind=actorBindings.get(role);
        if(bind){const pass=encoder.beginRenderPass({label:'teleport-zero-ordinary-body-handoff',colorAttachments:[{view:t.scene.createView(),loadOp:'load',storeOp:'store'}]});pass.setPipeline(kernel.actor);pass.setBindGroup(0,bind.group);pass.draw(6);pass.end();}}
      const observerActive=descriptors.roleDescriptors.some(x=>x.sourceEnabled&&x.observerEnabled);
      const ob=buffer(device,'teleport-zero-observer-params',new Float32Array([w,h,2*dpr,2*dpr,observerActive?1:0,0,0,0]),GPUBufferUsage.UNIFORM);buffers.push(ob);
      const observerGroup=device.createBindGroup({layout:kernel.observer.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:ob}},{binding:1,resource:t.source.createView()},{binding:2,resource:sampler}]});
      const obs=encoder.beginRenderPass({label:'teleport-zero-emission-only-observer',colorAttachments:[{view:t.observer.createView(),loadOp:'clear',clearValue:{r:0,g:0,b:0,a:0},storeOp:'store'}]});obs.setPipeline(kernel.observer);obs.setBindGroup(0,observerGroup);obs.draw(3);obs.end();
      const output=context.getCurrentTexture().createView();const bg=device.createBindGroup({layout:composite.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:t.scene.createView()},{binding:1,resource:t.observer.createView()},{binding:2,resource:sampler}]});
      const final=encoder.beginRenderPass({label:'teleport-zero-final-presentation',colorAttachments:[{view:output,loadOp:'clear',clearValue:{r:0,g:0,b:0,a:1},storeOp:'store'}]});final.setPipeline(composite.pipeline);final.setBindGroup(0,bg);final.draw(3);final.end();
      device.queue.submit([encoder.finish()]);const validation=device.popErrorScope();errorScopeOpen=false;const completion=device.queue.onSubmittedWorkDone();
      for(const pin of pins)pin.release({submitted:true,completion});
      void completion.catch(()=>{}).then(()=>{for(const b of buffers)try{b.destroy();}catch{}});
      observed.push(...kernel.diagnostics.map(x=>({label:x.label,messages:x.messages})),floor.messages,shadow.messages,nearby.messages,composite.messages);
      return Object.freeze({submitted:true,authoredVisible:descriptors.authoredVisible,descriptors,
        frameId:plan.viewport?.frameId||'',ageEms:plan.ageEms??null,authority:plan.pairedAuthority?.phase||'ordinary',validation,completion,diagnostics:Object.freeze(observed.slice(-12))});
    }catch(error){if(errorScopeOpen){try{await device.popErrorScope();}catch{}}for(const pin of pins)pin.release();for(const b of buffers)try{b.destroy();}catch{}throw error;}
  }
  async function destroy(){if(destroyed)return;destroyed=true;const done=device.queue.onSubmittedWorkDone();await done.catch(()=>{});if(targets){targets.scene.destroy();targets.source.destroy();targets.observer.destroy();targets=null;}}
  return Object.freeze({render,destroy,diagnostics:Object.freeze([...kernel.diagnostics,floor.messages,shadow.messages,nearby.messages,composite.messages]),profile:PROFILE,
    fixtureReceiver:Object.freeze({kind:'explicit-bounded-ground-plane-fixture',notGameEnvironment:true,normal:Object.freeze([0,0,1]),linearMaterial:Object.freeze([.22,.24,.27]),extentActorH:Object.freeze([3.2,1.44])})});
}
