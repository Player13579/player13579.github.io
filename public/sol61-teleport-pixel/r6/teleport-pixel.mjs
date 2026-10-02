import {validateOwningClock} from './e-clock.mjs';
// GPT-6.1-Sol teleport pixel r6 compact-cell derivative; no legacy teleport code.
// This prototype requires an approved causal receipt and borrowed authored atlas.
export const VERSION = 'sol61-teleport-pixel-r6';
export const RADIANCE = Object.freeze({color:Object.freeze([.03,.52,1]),frontPeak:2.15,packetGain:.72,sceneGain:.5,receiverGain:.23,observerGain:.18,receiverRadiusCss:2.8,observerRadiusCss:1.3});
export const TIMING = Object.freeze({ endMs:640, departureEndMs:280, arrivalStartMs:160 });
// One shared declaration feeds both WGSL and the deterministic CPU contract probe.
export const CONVERSION = Object.freeze({
  departureFrontStartMs:35, departureFrontEndMs:220, departureFrontWidthMs:12,
  departureVariationMs:4, departureFadeStartMs:245, departureOffsetHeights:.2,
  arrivalFrontStartMs:220, arrivalFrontEndMs:500, arrivalFrontWidthMs:14,
  arrivalVariationMs:4, arrivalOffsetHeights:.16, arrivalFadeStartMs:160,
  arrivalFadeEndMs:190, normalCellCssPx:3.25, reducedCellCssPx:5.5,
  reducedOffsetScale:.3, emissionFrontWidth:.055, maxPacketGap:.38
});
const finite=Number.isFinite;
const id=x=>typeof x==='string'&&x.length>0;
const point=p=>p&&finite(p.x)&&finite(p.y);
const frozenArray=(x,n)=>Array.isArray(x)&&x.length===n&&x.every(finite)&&Object.isFrozen(x);
export function bindAuthoredPose({sampledResource:resource,receipt,authoredAsset}) {
  const actor=resource?.actor,sprite=actor?.sprite,t=sprite?.transform,a=actor?.footAnchorTransform;
  if(resource?.kind!=='externalSample' || actor?.playerId!==receipt?.transportedActorId ||
      !id(actor?.frameId) && !(Number.isFinite(actor?.frameId)&&actor.frameId>0) ||
      !['white-hood','blue-dress','male-bot'].includes(actor?.identity) ||
      !['front','back','left','right'].includes(actor?.direction) ||
      authoredAsset?.assetPath!==actor?.assetIdentity ||
      !id(authoredAsset?.author) || !/^[a-f0-9]{64}$/i.test(authoredAsset?.sha256||'') ||
      !frozenArray(actor?.crop,4) || !frozenArray(actor?.sourceSize,2) ||
      !frozenArray(t,6) || !frozenArray(a,6) || t[0]<=0 || t[0]!==t[3] ||
      t[1]!==0 || t[2]!==0 || a[1]!==0 || a[2]!==0 || a[0]!==t[0] || a[3]!==t[3] ||
      ![sprite?.x,sprite?.y,sprite?.w,sprite?.h].every(finite) ||
      sprite.w<=0 || sprite.h<=0)throw TypeError('exact axis-aligned authored body resource required');
  // Preserve source-origin and the actual renderer's ground offset. Do not
  // substitute a guessed 256px crop or a generic foot anchor.
  return Object.freeze({actorId:actor.playerId,identity:actor.identity,direction:actor.direction,
    baseFrameId:actor.frameId,sourceAuthor:authoredAsset.author,
    causalId:receipt.causalId,roomId:receipt.roomId,generation:receipt.generation,
    assetPath:actor.assetIdentity,assetSha256:authoredAsset.sha256,
    texture:resource.texture,deviceIdentity:resource.deviceIdentity,uploadVersion:resource.uploadVersion,
    ownerLease:resource.ownerLease,ready:resource.ready,alphaMode:resource.alphaMode,
    colorEncoding:resource.colorEncoding,crop:actor.crop,sourceSize:actor.sourceSize,
    localRect:Object.freeze([sprite.x+(t[4]-a[4])/t[0],sprite.y+(t[5]-a[5])/t[3],sprite.w,sprite.h])});
}
export function admit({receipt,scope,pose,clock,viewport,privacy,actor}) {
  const blocked=reason=>Object.freeze({status:'blocked',reason});
  if (!receipt || !Object.isFrozen(receipt) || !id(receipt.causalId) ||
      !id(receipt.departureId) || !id(receipt.arrivalId) || receipt.departureId===receipt.arrivalId ||
      !id(receipt.transportedActorId) || !id(receipt.casterId) ||
      !point(receipt.from) || !point(receipt.to) || !Object.isFrozen(receipt.from) ||
      !Object.isFrozen(receipt.to) || receipt.type!=='action-teleport' ||
      receipt.roomId!==scope?.roomId || receipt.generation!==scope?.generation ||
      !Number.isInteger(receipt.generation) || receipt.generation<0 ||
      !finite(receipt.startedAtEms) || receipt.startedAtEms<0 ||
      !validateOwningClock(clock,{actorId:receipt.transportedActorId,causalId:receipt.causalId,roomId:receipt.roomId,generation:receipt.generation,revision:receipt.revisionAfter,sourceIds:[receipt.departureId,receipt.arrivalId]}) || receipt.durationEms!==TIMING.endMs ||
      receipt.timeBasis!=='actor-e-clock' || clock.atEms<receipt.startedAtEms)
    return blocked('invalid-causal-receipt');
  // The trusted adapter supplies both exact producer sources. This module never
  // pairs arrivals by proximity, time, caster identity or receipt absence.
  if (receipt.sourceProof?.departureId!==receipt.departureId ||
      receipt.sourceProof?.arrivalId!==receipt.arrivalId ||
      receipt.sourceProof?.causalId!==receipt.causalId ||
      receipt.sourceProof?.transportedActorId!==receipt.transportedActorId ||
      !Object.isFrozen(receipt.sourceProof)) return blocked('invalid-source-proof');
  const departure=receipt.sourceProof.departure,arrival=receipt.sourceProof.arrival;
  if(!departure || !arrival || !Object.isFrozen(departure) || !Object.isFrozen(arrival) ||
      departure.id!==receipt.departureId || arrival.id!==receipt.arrivalId ||
      departure.type!=='action-teleport' || arrival.type!=='action-teleport' ||
      departure.causalId!==receipt.causalId || arrival.causalId!==receipt.causalId ||
      departure.playerId!==receipt.casterId || departure.targetId!==receipt.transportedActorId ||
      arrival.playerId!==receipt.transportedActorId || departure.variant!=='' ||
      arrival.variant!=='arrival' || departure.x!==Math.round(receipt.from.x) ||
      departure.y!==Math.round(receipt.from.y) || departure.targetX!==Math.round(receipt.to.x) ||
      departure.targetY!==Math.round(receipt.to.y) || arrival.x!==Math.round(receipt.to.x) ||
      arrival.y!==Math.round(receipt.to.y) ||
      !finite(departure.at) || departure.at<0 || !finite(arrival.at) || arrival.at<0)
    return blocked('causal-endpoint-mismatch');
  if (!pose || !Object.isFrozen(pose) || pose.actorId!==receipt.transportedActorId ||
      pose.causalId!==receipt.causalId || pose.roomId!==receipt.roomId ||
      pose.generation!==receipt.generation || !id(pose.assetPath) || !id(pose.sourceAuthor) ||
      !['white-hood','blue-dress','male-bot'].includes(pose.identity) ||
      !['front','back','left','right'].includes(pose.direction) ||
      !/^[a-f0-9]{64}$/i.test(pose.assetSha256||'') || !pose.texture ||
      !pose.ownerLease || !pose.deviceIdentity || pose.ready!==true ||
      !Number.isInteger(pose.uploadVersion) || pose.uploadVersion<1 ||
      pose.ownerLease.deviceIdentity!==pose.deviceIdentity ||
      pose.ownerLease.uploadVersion!==pose.uploadVersion ||
      pose.ownerLease.ready!==true || pose.ownerLease.current!==true ||
      pose.alphaMode!=='premultiplied' || pose.colorEncoding!=='legacy-encoded' ||
      !frozenArray(pose.crop,4) || !frozenArray(pose.sourceSize,2) ||
      !frozenArray(pose.localRect,4) || pose.crop[0]<0 || pose.crop[1]<0 ||
      pose.crop[2]<=0 || pose.crop[3]<=0 || pose.sourceSize.some(x=>x<=0) ||
      pose.crop[0]+pose.crop[2]>pose.sourceSize[0] ||
      pose.crop[1]+pose.crop[3]>pose.sourceSize[1] || pose.localRect[2]<=0 ||
      pose.localRect[3]<=0) return blocked('unproven-authored-pose');
  if (!viewport || ![viewport.width,viewport.height,viewport.zoom,
      viewport.camera?.x,viewport.camera?.y].every(finite) ||
      viewport.width<=0 || viewport.height<=0 || viewport.zoom<=0 ||
      !Number.isInteger(viewport.generation)) return blocked('invalid-viewport');
  if (!privacy || typeof privacy.departureVisible!=='boolean' ||
      typeof privacy.arrivalVisible!=='boolean' || !actor ||
      actor.id!==receipt.transportedActorId || !point(actor) ||
      [actor.alive,actor.ejected,actor.inVent].some(x=>typeof x!=='boolean'))
    return blocked('invalid-visibility-or-actor');
  if(actor.relocationRevision!==receipt.revisionAfter)return Object.freeze({status:'cancelled',reason:'actor-revision-mismatch'});
  const age=clock.atEms-receipt.startedAtEms;
  if (age<0) return Object.freeze({status:'omitted',reason:'not-started'});
  if (age>=TIMING.endMs) return Object.freeze({status:'omitted',reason:'expired'});
  if (!actor.alive || actor.ejected || actor.inVent ||
      actor.x!==receipt.to.x || actor.y!==receipt.to.y)
    return Object.freeze({status:'cancelled',reason:'actor-lifecycle-or-movement'});
  if (!privacy.departureVisible && !privacy.arrivalVisible)
    return Object.freeze({status:'omitted',reason:'private-endpoints'});
  const cellPx=viewport.reducedMotion ? CONVERSION.reducedCellCssPx : CONVERSION.normalCellCssPx;
  const columns=Math.min(32,Math.max(1,Math.ceil(pose.localRect[2]*viewport.zoom/cellPx)));
  const rows=Math.min(40,Math.max(1,Math.ceil(pose.localRect[3]*viewport.zoom/cellPx)));
  const endpoints=[];
  if(privacy.departureVisible && age<TIMING.departureEndMs)
    endpoints.push(Object.freeze({phase:0,anchor:receipt.from}));
  if(privacy.arrivalVisible && age>=TIMING.arrivalStartMs)
    endpoints.push(Object.freeze({phase:1,anchor:receipt.to}));
  return Object.freeze({status:'ready',causalId:receipt.causalId,actorId:actor.id,
    departureId:receipt.departureId,arrivalId:receipt.arrivalId,ageMs:age,
    viewportGeneration:viewport.generation,columns,rows,pose,viewport,
    endpoints:Object.freeze(endpoints),
    bodyLease:Object.freeze({actorId:actor.id,causalId:receipt.causalId,
      suppressAt:receipt.to,untilEms:receipt.startedAtEms+TIMING.endMs})});
}
const C=CONVERSION;
const clamp01=x=>Math.max(0,Math.min(1,x));
const ease01=(a,b,x)=>{const u=clamp01((x-a)/(b-a));return u*u*(3-2*u);};
const fract=x=>x-Math.floor(x);
// Deterministic CPU mirror of the per-cell vertex decisions for contract tests.
// `x`/`y` are normalized cell centers; pass the admitted grid dimensions to mirror WGSL indices.
export function sampleConversionCell({ageMs,phase,x,y,columns=32,rows=40,reducedMotion=false}) {
  if(!finite(ageMs)||![0,1].includes(phase)||![x,y].every(finite)||x<0||x>1||y<0||y>1||
      !Number.isInteger(columns)||columns<1||columns>32||!Number.isInteger(rows)||rows<1||rows>40)
    throw TypeError('finite normalized conversion sample required');
  const col=Math.floor(x*columns),row=Math.floor(y*rows);
  const laneX=fract((col*17+row*31)*.61803398875);
  const laneY=fract((col*29+row*13+.5)*.7548776662);
  const variation=fract((col*13+row*7)*.7548776662)-.5;
  const sourceStart=C.departureFrontStartMs+y*(C.departureFrontEndMs-C.departureFrontStartMs)+variation*C.departureVariationMs;
  const sourceRelease=ease01(sourceStart,sourceStart+C.departureFrontWidthMs,ageMs);
  const arrivalStart=C.arrivalFrontStartMs+(1-y)*(C.arrivalFrontEndMs-C.arrivalFrontStartMs)+variation*C.arrivalVariationMs;
  const resolved=ease01(arrivalStart,arrivalStart+C.arrivalFrontWidthMs,ageMs);
  const front=phase===0?clamp01((ageMs-C.departureFrontStartMs)/(C.departureFrontEndMs-C.departureFrontStartMs)):
    clamp01((ageMs-C.arrivalFrontStartMs)/(C.arrivalFrontEndMs-C.arrivalFrontStartMs));
  const reduced=reducedMotion?C.reducedOffsetScale:1;
  const side=x>=.5?1:-1;
  const packetAmount=phase===0?sourceRelease:1-resolved;
  const offset=packetAmount===0?[0,0]:phase===0?
    [side*(.065+(laneX-.5)*.05)*packetAmount*reduced,-(.105+(laneY-.5)*.03)*packetAmount*reduced]:
    [side*(.045+(laneX-.5)*.04)*packetAmount*reduced,-(.075+(laneY-.5)*.024)*packetAmount*reduced];
  const quantize=phase===0?sourceRelease:1-resolved;
  const fade=phase===0?1-ease01(C.departureFadeStartMs,TIMING.departureEndMs,ageMs):
    ease01(C.arrivalFadeStartMs,C.arrivalFadeEndMs,ageMs);
  const visibility=phase===0?(sourceRelease>.001?fade:1):fade;
  const geometryScale=1-C.maxPacketGap*packetAmount;
  const transition=phase===0?sourceRelease:resolved;
  const crossing=4*transition*(1-transition);
  const crossingWindow=phase===0?
    ease01(C.departureFrontStartMs,C.departureFrontStartMs+35,ageMs)*(1-ease01(C.departureFrontEndMs,C.departureFrontEndMs+C.departureFrontWidthMs,ageMs)):
    ease01(C.arrivalFrontStartMs,C.arrivalFrontStartMs+40,ageMs)*(1-ease01(C.arrivalFrontEndMs,C.arrivalFrontEndMs+C.arrivalFrontWidthMs,ageMs));
  const peak=RADIANCE.frontPeak*crossing*crossingWindow;
  const transfer=phase===0?sourceRelease*(1-ease01(C.departureFadeStartMs,TIMING.departureEndMs,ageMs)):1-resolved;
  return Object.freeze({front,sourceRelease,resolved,quantize,visibility,
    geometryScale,offset:Object.freeze(offset),laneX,laneY,transition,crossing,
    emission:peak+RADIANCE.packetGain*transfer});
}
export const WGSL = /* wgsl */`
struct Params { viewport:vec4f, anchorCamera:vec4f, rect:vec4f, crop:vec4f,
  sourceGrid:vec4f, clock:vec4f };
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var atlas:texture_2d<f32>;
struct Out { @builtin(position) position:vec4f, @location(0) uv:vec2f,
 @location(1) cell:vec2f, @location(2) visibility:f32, @location(3) quantize:f32, @location(4) emission:f32 };
fn ease(a:f32,b:f32,x:f32)->f32 { let u=clamp((x-a)/(b-a),0.,1.);return u*u*(3.-2.*u); }
@vertex fn vs(@builtin(vertex_index) vertex:u32,@builtin(instance_index) instance:u32)->Out {
 let corners=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));
 let grid=p.sourceGrid.zw; let cell=vec2f(f32(instance%u32(grid.x)),floor(f32(instance)/grid.x));
 let local=(cell+corners[vertex])/grid; let centre=(cell+.5)/grid;
 // Stable individual-row packet lanes; no random or wall-clock state.
 let laneX=fract((cell.x*17.+cell.y*31.)*.61803398875);
 let laneY=fract((cell.x*29.+cell.y*13.+.5)*.7548776662);
 let variation=fract((cell.x*13.+cell.y*7.)*.7548776662)-.5;
 let age=p.clock.x; let arrival=p.clock.y>0.5;
 let reduced=select(1.,${C.reducedOffsetScale},p.clock.z<.5);
 let sourceStart=${C.departureFrontStartMs}+centre.y*(${C.departureFrontEndMs}-${C.departureFrontStartMs})+variation*${C.departureVariationMs};
 let sourceRelease=ease(sourceStart,sourceStart+${C.departureFrontWidthMs},age);
 let sourceFront=clamp((age-${C.departureFrontStartMs})/(${C.departureFrontEndMs}-${C.departureFrontStartMs}),0.,1.);
 let arriveStart=${C.arrivalFrontStartMs}+(1.-centre.y)*(${C.arrivalFrontEndMs}-${C.arrivalFrontStartMs})+variation*${C.arrivalVariationMs};
 let resolved=ease(arriveStart,arriveStart+${C.arrivalFrontWidthMs},age);
 let arrivalFront=clamp((age-${C.arrivalFrontStartMs})/(${C.arrivalFrontEndMs}-${C.arrivalFrontStartMs}),0.,1.);
 let departureFade=1.-ease(${C.departureFadeStartMs},${TIMING.departureEndMs},age);
 let arrivalFade=ease(${C.arrivalFadeStartMs},${C.arrivalFadeEndMs},age);
 let sourceSide=select(-1.,1.,centre.x>=.5);
 let sourceOffset=vec2f(sourceSide*(.065+(laneX-.5)*.05),-(.105+(laneY-.5)*.03));
 let arrivalOffset=vec2f(sourceSide*(.045+(laneX-.5)*.04),-(.075+(laneY-.5)*.024));
 let displacement=select(sourceOffset*sourceRelease,arrivalOffset*(1.-resolved),arrival)*reduced;
 let visible=select(select(1.,departureFade,sourceRelease>.001),arrivalFade,arrival);
 // Only released cells open gaps; untouched source geometry remains exact.
 let gap=${C.maxPacketGap}*select(sourceRelease,1.-resolved,arrival);
 let separated=(cell+.5+(corners[vertex]-.5)*(1.-gap))/grid;
 let world=p.anchorCamera.xy+p.rect.xy+separated*p.rect.zw+displacement*p.rect.zw;
 let logical=(world-p.anchorCamera.zw)*p.viewport.z;
 var o:Out;o.position=vec4f(logical.x/p.viewport.x*2.-1.,1.-logical.y/p.viewport.y*2.,0.,1.);
 o.uv=local;o.cell=centre;o.visibility=visible;
 o.quantize=select(sourceRelease,1.-resolved,arrival);
 let transition=select(sourceRelease,resolved,arrival);
 let crossing=4.*transition*(1.-transition);
 let crossingWindow=select(ease(${C.departureFrontStartMs},${C.departureFrontStartMs+35},age)*(1.-ease(${C.departureFrontEndMs},${C.departureFrontEndMs+C.departureFrontWidthMs},age)),ease(${C.arrivalFrontStartMs},${C.arrivalFrontStartMs+40},age)*(1.-ease(${C.arrivalFrontEndMs},${C.arrivalFrontEndMs+C.arrivalFrontWidthMs},age)),arrival);
 let transfer=select(sourceRelease*(1.-ease(${C.departureFadeStartMs},${TIMING.departureEndMs},age)),1.-resolved,arrival);
 let peak=crossing*crossingWindow*${RADIANCE.frontPeak};
 o.emission=(peak+${RADIANCE.packetGain}*transfer)*p.clock.w;
 return o;
}
fn decode(c:vec3f)->vec3f {
 return select(c/12.92,pow((c+vec3f(.055))/1.055,vec3f(2.4)),c>vec3f(.04045));
}
struct PixelOutput { @location(0) scene:vec4f,@location(1) source:vec4f };
@fragment fn fs(i:Out)->PixelOutput {
 let coord=mix(i.uv,i.cell,i.quantize);
 let texel=vec2i(clamp(p.crop.xy+coord*p.crop.zw,p.crop.xy,p.crop.xy+p.crop.zw-1.));
 let source=textureLoad(atlas,texel,0);let alpha=source.a*i.visibility;
 // Existing premultiplied encoded atlas remains the body material. Cyan is a
 // separate fantasy conversion-source radiance, bounded by this exact alpha.
 let color=decode(source.rgb/max(source.a,1e-6))*alpha;
 let emission=vec3f(${RADIANCE.color.join(",")})*i.emission*alpha;
 let materialVisibility=1.-max(.75*clamp(i.emission/${RADIANCE.frontPeak},0.,1.),.65*i.quantize*p.clock.w);
 var o:PixelOutput;o.scene=vec4f(color*materialVisibility+emission*${RADIANCE.sceneGain},alpha);o.source=vec4f(emission,alpha);return o;
}`;
export function createPass({device,format='rgba16float',deviceIdentity=device}) {
  if(format!=='rgba16float')throw TypeError('r2 requires linear rgba16float scene/source MRT');
  if(!device?.createShaderModule || !device?.createRenderPipeline)throw TypeError('borrowed WebGPU device required');
  const shader=device.createShaderModule({code:WGSL,label:VERSION});
  const pipeline=device.createRenderPipeline({label:VERSION,layout:'auto',
    vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}},{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  return Object.freeze({shader,pipeline,prepare(plan){
    if(plan?.status!=='ready'||plan.pose.deviceIdentity!==deviceIdentity)throw TypeError('valid same-device plan required');
    const lease=plan.pose.ownerLease;
    if(typeof lease.pin!=='function')throw TypeError('authored atlas pin contract required');
    const pin=lease.pin(plan.pose.uploadVersion);const buffers=[]; let released=false;
    try { const draws=plan.endpoints.map(endpoint=>{
      const v=plan.viewport,r=plan.pose.localRect,c=plan.pose.crop,s=plan.pose.sourceSize;
      const values=new Float32Array([v.width,v.height,v.zoom,0,endpoint.anchor.x,endpoint.anchor.y,v.camera.x,v.camera.y,...r,...c,...s,plan.columns,plan.rows,plan.ageMs,endpoint.phase,v.reducedMotion?CONVERSION.reducedOffsetScale:1,plan.sourceOn===false?0:1]);
      const buffer=device.createBuffer({size:values.byteLength,usage:0x40|0x08});buffers.push(buffer);device.queue.writeBuffer(buffer,0,values);
      const bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:plan.pose.texture.createView()}]});
      return {bindGroup,phase:endpoint.phase};
    });return Object.freeze({causalId:plan.causalId,actorId:plan.actorId,
      record(renderPass){if(released)throw Error('released pixel plan');renderPass.setPipeline(pipeline);for(const d of draws){renderPass.setBindGroup(0,d.bindGroup);renderPass.draw(6,plan.columns*plan.rows);}
        return Object.freeze({causalId:plan.causalId,actorId:plan.actorId,
          phases:Object.freeze(draws.filter(d=>d.phase===0 || plan.ageMs>TIMING.arrivalStartMs).map(d=>d.phase)),ageMs:plan.ageMs});},
      release({submitted=false,completion=null}={}){if(submitted && typeof completion?.then!=='function')
        throw TypeError('submitted pixels require actual GPU completion promise');
        if(!released){released=true;
        pin.release({submitted,completion});
        const destroy=()=>{for(const b of buffers)b.destroy();};
        if(submitted)return Promise.resolve(completion).catch(()=>{}).then(destroy);
        destroy();}}});
    }catch(error){for(const b of buffers)b.destroy();pin.release();throw error;}
  }});
}
export function synthesizePCM(phase,sampleRate=48000) {
  if(![0,1].includes(phase)||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>96000)throw TypeError('finite audio configuration required');
  const seconds=phase===0?.22:.34,samples=new Float32Array(Math.ceil(seconds*sampleRate));
  for(let n=0;n<samples.length;n++){const t=n/sampleRate,u=t/seconds,env=Math.sin(Math.PI*u)**2;
    const frequency=phase===0?900-540*u:280+620*u;
    // Sparse step-lock accent; deterministic finite PCM, no orphan oscillators.
    const step=Math.floor(u*7),tone=Math.sin(2*Math.PI*(frequency*t+step*.08));
    samples[n]=.085*env*tone*(.8+.2*Math.sin(Math.PI*u*7)**2);
  }return Object.freeze({phase,sampleRate,samples,durationSeconds:seconds,peakBound:.085});
}
