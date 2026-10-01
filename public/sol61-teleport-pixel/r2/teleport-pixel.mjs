import {validateOwningClock} from './e-clock.mjs';
// GPT-6.1-Sol teleport pixel r1. New procedural design; no legacy teleport code.
// This prototype requires an approved causal receipt and borrowed authored atlas.
export const VERSION = 'sol61-teleport-pixel-r2';
export const TIMING = Object.freeze({ endMs:640, departureEndMs:280, arrivalStartMs:160 });
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
  const cellPx=viewport.reducedMotion ? 6 : 4;
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
 // One coherent column/row pattern, seeded only by stable cell index. Cells
 // keep their original UV identity; the destination reverses the same topology.
 let address=cell.x*17.+cell.y*31.; let lane=fract(address*.61803398875);
 let offset=vec2f((lane-.5)*28.,-10.-centre.y*12.);
 let age=p.clock.x; let arrival=p.clock.y>0.5;
 let progress=select(clamp(age/280.,0.,1.),clamp((age-160.)/480.,0.,1.),arrival);
 let order=.16*select(centre.y,1.-centre.y,arrival)+.10*lane;
 let release=ease(order,order+.58,progress);
 let displacement=select(release,1.-release,arrival)*p.clock.z;
 let visible=select(1.-ease(.64,1.,progress),ease(0.,.20,progress),arrival);
 // Cells open finite gaps only while leaving/rejoining; the original UV identity stays fixed.
 let gap=.12*4.*release*(1.-release);
 let separated=(cell+.5+(corners[vertex]-.5)*(1.-gap))/grid;
 let world=p.anchorCamera.xy+p.rect.xy+separated*p.rect.zw+offset*displacement/p.viewport.z;
 let logical=(world-p.anchorCamera.zw)*p.viewport.z;
 var o:Out;o.position=vec4f(logical.x/p.viewport.x*2.-1.,1.-logical.y/p.viewport.y*2.,0.,1.);
 o.uv=local;o.cell=centre;o.visibility=visible;
 o.quantize=select(ease(.06,.32,progress),1.-ease(.65,.95,progress),arrival);
 o.emission=2.4*ease(.025,.20,progress)*(1.-ease(.70,.99,progress))*p.clock.w;
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
 // Exact existing premultiplied encoded atlas -> linear radiance, without recoloring.
 let color=decode(source.rgb/max(source.a,1e-6))*alpha;
 var o:PixelOutput;o.scene=vec4f(color*(1.+i.emission),alpha);o.source=vec4f(color*i.emission,alpha);return o;
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
      const values=new Float32Array([v.width,v.height,v.zoom,0,endpoint.anchor.x,endpoint.anchor.y,v.camera.x,v.camera.y,...r,...c,...s,plan.columns,plan.rows,plan.ageMs,endpoint.phase,v.reducedMotion?0.25:1,plan.sourceOn===false?0:1]);
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
