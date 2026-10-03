/* V797 Ninjutsu focus WebGPU pass. The source event owns its anchor and 1200 ms
 * life; the pass draws a converging reticle and separately composites OBS bloom. */
(function (root) {
  'use strict';
  const TYPE = 'action-ninjutsu-focus', DURATION_MS = 1200;
  const MAX_EVENTS = 1, MAX_RECTS_PER_EVENT = 64, MAX_SHAPES_PER_EVENT = 24;
  const POST_TARGET = 'ninjutsu-focus-r1-observer-mask';
  const TAU = Math.PI * 2, finite = Number.isFinite;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const RED = Object.freeze([1, 0.12, 0.18]), WHITE = Object.freeze([1, 0.96, 0.93]);
  const POST_WGSL = `
struct VOut { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@group(0) @binding(0) var sourceSampler: sampler;
@group(0) @binding(1) var sourceMask: texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) vertex: u32) -> VOut {
  let positions = array<vec2f, 3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
  let p = positions[vertex]; var out: VOut;
  out.position=vec4f(p,0.0,1.0); out.uv=vec2f((p.x+1.0)*0.5,(1.0-p.y)*0.5); return out;
}
@fragment fn fs(input: VOut) -> @location(0) vec4f {
  let d=1.0/vec2f(textureDimensions(sourceMask)); let uv=input.uv;
  var c=textureSampleLevel(sourceMask,sourceSampler,uv,0.0)*0.20;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv+vec2f(d.x,0.0),0.0)*0.12;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv-vec2f(d.x,0.0),0.0)*0.12;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv+vec2f(0.0,d.y),0.0)*0.12;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv-vec2f(0.0,d.y),0.0)*0.12;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv+vec2f(2.0*d.x,0.0),0.0)*0.05;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv-vec2f(2.0*d.x,0.0),0.0)*0.05;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv+vec2f(0.0,2.0*d.y),0.0)*0.05;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv-vec2f(0.0,2.0*d.y),0.0)*0.05;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv+vec2f(d.x,d.y),0.0)*0.03;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv+vec2f(d.x,-d.y),0.0)*0.03;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv+vec2f(-d.x,d.y),0.0)*0.03;
  c+=textureSampleLevel(sourceMask,sourceSampler,uv-vec2f(d.x,d.y),0.0)*0.03;
  return c;
}`;
  function validateInput({ scene, camera, zoom, viewport } = {}) {
    if (!scene || !Array.isArray(scene.effects) || !Array.isArray(scene.players) ||
        !finite(scene.nowMs) || !camera || ![camera.x, camera.y, zoom].every(finite) || zoom <= 0 ||
        !viewport || ![viewport.width, viewport.height].every(finite) ||
        viewport.width <= 0 || viewport.height <= 0 ||
        (viewport.kind !== undefined && viewport.kind !== 'main'))
      throw new TypeError('Ninjutsu focus E needs the live source, camera, zoom and logical viewport');
    if ((viewport.pixelWidth !== undefined || viewport.pixelHeight !== undefined) &&
        (!Number.isInteger(viewport.pixelWidth) || viewport.pixelWidth < 1 ||
         !Number.isInteger(viewport.pixelHeight) || viewport.pixelHeight < 1))
      throw new TypeError('Ninjutsu focus E needs actual physical viewport dimensions');
  }
  function plan({ effect, sourceFields, viewerId, phase, scene, camera, zoom, viewport } = {}) {
    validateInput({ scene, camera, zoom, viewport });
    if (phase !== 'playing' || scene.phase !== 'playing')
      throw new TypeError('Ninjutsu focus E is only valid in the playing phase');
    if (!String(viewerId || '') || scene.effects.length !== MAX_EVENTS || scene.effects[0] !== effect ||
        effect?.type !== TYPE || typeof effect.id !== 'string' || !effect.id.trim() ||
        !sourceFields || typeof sourceFields !== 'object' || Array.isArray(sourceFields) ||
        !Object.keys(sourceFields).length || Object.keys(sourceFields).some(key =>
          !Object.is(sourceFields[key], effect[key])))
      throw new TypeError('Ninjutsu focus E requires one exact captured source event');
    const actorId = String(effect.playerId || '');
    const actor = scene.players.find(player => String(player?.id || '') === actorId);
    if (!actor || !actorId || !actor.alive || actor.ejected || actor.inVent ||
        ![effect.x, effect.y, effect.radius, effect.startedAt, effect.duration,
          scene.nowMs, actor.x, actor.y].every(finite) || effect.radius <= 0 ||
        effect.duration !== DURATION_MS || String(actor.id) !== actorId)
      throw new TypeError('Ninjutsu focus E needs its live, finite, source-owned caster and 1200 ms lifetime');
    if (actor.invisible && actorId !== String(viewerId))
      return { owned: [], omitted: [{ id: effect.id, reason: 'caster-invisible-to-this-viewer' }] };
    const age = scene.nowMs - effect.startedAt;
    if (age < 0) throw new TypeError('Ninjutsu focus E source has not started');
    if (age >= DURATION_MS) return { owned: [], omitted: [{ id: effect.id, reason: 'source-lifetime-ended' }] };
    const center = { x: (effect.x - camera.x) * zoom, y: (effect.y - camera.y) * zoom };
    if (![center.x, center.y].every(finite)) throw new TypeError('Ninjutsu focus E anchor projection is invalid');
    return { owned: [{ id: effect.id, type: TYPE, playerId: actorId, center,
      radius: effect.radius * zoom, age, duration: DURATION_MS, progress: age / DURATION_MS,
      reducedMotion: Boolean(scene.reducedMotion), viewerId: String(viewerId),
      anchor: Object.freeze({ x: effect.x, y: effect.y }), resultClaim: 'focus-attempt-only' }], omitted: [] };
  }
  function rgba(rgb, alpha) { return [rgb[0], rgb[1], rgb[2], clamp(alpha)]; }
  function rect(x, y, w, h, color, rotation = 0) {
    const c=Math.cos(rotation),s=Math.sin(rotation);
    return { x:x-w/2,y:y-h/2,w,h,transform:[c,s,-s,c,x,y],color,mode:'additive' };
  }
  function line(a,b,width,color) {
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
    if (!finite(length)||length<0.01) return null;
    const c=dx/length,s=dy/length;
    return {x:-length/2,y:-width/2,w:length,h:width,
      transform:[c,s,-s,c,(a.x+b.x)/2,(a.y+b.y)/2],color,mode:'additive'};
  }
  function visualsFor(item) {
    const {center:c,radius,progress:p,reducedMotion:reduced}=item;
    // These are the accepted V797 acquisition and release envelopes; keep the
    // frame fixed upright and use the acquisition envelope for radial convergence.
    const enter=smooth(clamp(p/0.10));
    const settle=smooth(clamp((p-0.04)/0.25));
    const release=smooth(clamp((p-0.72)/0.28));
    const lock=Math.sin(Math.PI*clamp((p-0.22)/0.26))**2;
    const size=radius*1.82*(reduced?1:1.14-settle*0.14+release*0.025);
    const alpha=enter*(1-release);
    const ringCenter={x:c.x-size*0.028,y:c.y+size*0.020};
    const targetCenter={x:c.x+size*0.285,y:c.y-size*0.285};
    const ringRadius=size*0.166, targetRadius=size*0.040;
    const width=Math.max(1.15,size*0.0105), commands=[], shapeCommands=[], postCommands=[];
    const arc=(where,r,start,sweep,lineWidth,color,strength)=>shapeCommands.push({kind:'arc',
      x:where.x,y:where.y,radius:r,start,sweep,lineWidth,
      color:rgba(color,alpha*strength),mode:'additive'});
    const glow=(where,r,color,strength)=>postCommands.push({kind:'glow',x:where.x,y:where.y,
      radius:r,color:rgba(color,alpha*strength),mode:'additive'});
    // PH: one stable source ring and one smaller fixed-offset reticle, matching
    // the V797 authored material silhouette without consulting targetId.
    arc(ringCenter,ringRadius,0,TAU,width*1.15,RED,0.90);
    arc(ringCenter,ringRadius*0.88,0.24,2.05,width*1.22,WHITE,0.92);
    arc(ringCenter,ringRadius*0.88,Math.PI+0.24,2.05,width*1.22,WHITE,0.92);
    arc(targetCenter,targetRadius,0,TAU,width*0.9,RED,0.96);
    arc(targetCenter,targetRadius*0.42,0,TAU,width*0.8,WHITE,0.98);
    // Fixed cardinal source marks, with no animated rotation.
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const from={x:ringCenter.x+dx*ringRadius*1.10,y:ringCenter.y+dy*ringRadius*1.10};
      const to={x:ringCenter.x+dx*ringRadius*1.28,y:ringCenter.y+dy*ringRadius*1.28};
      const mark=line(from,to,width*1.1,rgba(RED,alpha*0.88));if(mark)commands.push(mark);
    }
    // Parallel sight beams stop at the target ring. The bright traveling band
    // remains on the central ray, the exact analogue of V797's masked sweep.
    const dx=targetCenter.x-ringCenter.x,dy=targetCenter.y-ringCenter.y,len=Math.hypot(dx,dy);
    const ux=dx/len,uy=dy/len,nx=-uy,ny=ux;
    const start={x:ringCenter.x+ux*ringRadius*0.96,y:ringCenter.y+uy*ringRadius*0.96};
    const end={x:targetCenter.x-ux*targetRadius*1.15,y:targetCenter.y-uy*targetRadius*1.15};
    const offsets=[-size*0.032,-size*0.014,0,size*0.014,size*0.032];
    for (let i=0;i<offsets.length;i++) {
      const offset=offsets[i],a={x:start.x+nx*offset,y:start.y+ny*offset},b={x:end.x+nx*offset,y:end.y+ny*offset};
      const c=i===2?WHITE:RED,opacity=i===2?0.82:0.52;
      const beam=line(a,b,i===2?width*0.82:width*0.50,rgba(c,alpha*opacity));if(beam)commands.push(beam);
    }
    let highlight=null;
    if (!reduced && p>0.10 && p<0.72) {
      const t=smooth((p-0.10)/0.62);highlight={x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t};
      const dot=rect(highlight.x,highlight.y,width*2.25,width*2.25,rgba(WHITE,alpha*(0.72+0.28*lock)),Math.atan2(uy,ux));
      commands.push(dot);
    }
    // OBS: source emission is a separate transparent mask, blurred and
    // additively composed over the current scene in an encoder-level pass.
    const postStrength=reduced?0.54:0.42+0.16*lock;
    glow(ringCenter,ringRadius*1.18,RED,postStrength);
    glow(targetCenter,targetRadius*1.55,WHITE,postStrength*0.62);
    return {commands,shapeCommands,postCommands,sourceGeometry:{size,ringCenter,targetCenter,
      ringRadius,targetRadius,settle,release,lock,rayStart:start,rayEnd:end,highlight}};
  }
  function makePostPipeline(device,format,sourceTexture) {
    const module=device.createShaderModule({label:'Ninjutsu focus V797 observer bloom',code:POST_WGSL});
    const layout=device.createBindGroupLayout({entries:[
      {binding:0,visibility:root.GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},
      {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float',viewDimension:'2d'}}]});
    const pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});
    const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
    const ready=Promise.resolve(module.getCompilationInfo?.()).then(info=>{
      const errors=(info?.messages||[]).filter(m=>m.type==='error');
      if(errors.length)throw new Error('Ninjutsu focus observer WGSL failed: '+JSON.stringify(errors));
      return device.createRenderPipelineAsync({label:'Ninjutsu focus OBS additive bloom',layout:pipelineLayout,
        vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{
          color:{srcFactor:'one',dstFactor:'one',operation:'add'},
          alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}}}]},
        primitive:{topology:'triangle-list'}});
    }).then(value=>value);
    return {layout,sampler,ready};
  }
  function create({renderer,observerPostEffects=true}={}) {
    let destroyed=false,texture=null,textureTarget=null,pipelineInfo=null,pipeline=null;
    let ready=Promise.resolve();
    if (renderer) {
      const device=renderer.device,format=renderer.format,usage=root.GPUTextureUsage;
      if(!device||typeof renderer.registerTextureTarget!=='function'||!usage)
        throw new TypeError('Ninjutsu focus observer needs the shared WebGPU renderer and texture usages');
      texture=device.createTexture({label:'Ninjutsu focus observer source mask',size:{width:980,height:620,depthOrArrayLayers:1},
        format,usage:usage.RENDER_ATTACHMENT|usage.TEXTURE_BINDING});
      textureTarget=renderer.registerTextureTarget(POST_TARGET,texture,{width:980,height:620,logicalWidth:980,logicalHeight:620,format});
      pipelineInfo=makePostPipeline(device,format,texture);
      ready=pipelineInfo.ready.then(value=>{pipeline=value;});
      ready.catch(()=>{});
    }
    function record({frame,target,shapes,viewport,observerPostEffects:observerOverride,...input}={}) {
      if(destroyed)throw new Error('Ninjutsu focus E pass is destroyed');
      if(typeof frame?.stage!=='function'||typeof frame?.rect!=='function'||typeof target!=='string'||!target)
        throw new TypeError('Ninjutsu focus E needs the shared WebGPU frame and target');
      const result=plan({...input,viewport});
      const visuals=result.owned.map(visualsFor),commands=visuals.flatMap(v=>v.commands),
        shapeCommands=visuals.flatMap(v=>v.shapeCommands),postCommands=visuals.flatMap(v=>v.postCommands);
      if(commands.length>MAX_RECTS_PER_EVENT||shapeCommands.length+postCommands.length>MAX_SHAPES_PER_EVENT||
        commands.some(c=>![c.x,c.y,c.w,c.h,...c.color,...(c.transform||[])].every(finite))||
        [...shapeCommands,...postCommands].some(c=>![c.x,c.y,c.radius,c.start??0,c.sweep??0,c.lineWidth??0,...c.color].every(finite)))
        throw new RangeError('Ninjutsu focus E generated non-finite or over-budget geometry');
      if(result.owned.length&&typeof shapes?.enqueue!=='function')
        throw new TypeError('Ninjutsu focus E needs the shared WebGPU effect-shapes pass');
      const observerOn=observerOverride!==false&&observerPostEffects;
      const shapeLeases=[];
      let leasesDisposed=false,postComposited=false;
      const destroyShapeLeases=()=>{
        if(leasesDisposed)return;leasesDisposed=true;let failure=null;
        for(const lease of shapeLeases)try{lease.destroy();}catch(error){failure ||= error;}
        if(failure)throw failure;
      };
      const keepShapeLease=lease=>{
        if(!lease||typeof lease.destroy!=='function')
          throw new TypeError('Ninjutsu focus requires the shared effect-shapes batch destroy lease');
        shapeLeases.push(lease);
      };
      try{
        if(result.owned.length){
          frame.stage('world:ninjutsu-focus-e');
          if(shapeCommands.length)keepShapeLease(shapes.enqueue(frame,{target,width:viewport.width,height:viewport.height,
            pixelWidth:viewport.pixelWidth??viewport.width,pixelHeight:viewport.pixelHeight??viewport.height,
            commands:shapeCommands,label:'V797 Ninjutsu focus PH reticle'}));
          for(const command of commands)frame.rect(target,command);
          if(observerOn&&postCommands.length){
            if(!renderer||!pipeline||!textureTarget)throw new Error('Ninjutsu focus OBS post pipeline is not ready');
            if(viewport.width!==980||viewport.height!==620)
              throw new Error('Ninjutsu focus OBS mask requires the main logical 980x620 viewport');
            frame.clear(POST_TARGET,[0,0,0,0]);
            keepShapeLease(shapes.enqueue(frame,{target:POST_TARGET,width:980,height:620,pixelWidth:980,pixelHeight:620,
              commands:postCommands,label:'V797 Ninjutsu focus OBS emission mask'}));
            frame.addEncoder({label:'V797 Ninjutsu focus observer bloom',reads:[POST_TARGET],writes:[target],
              encode(encoder,context){
                const bind=deviceBindGroup(context.device,pipelineInfo.layout,pipelineInfo.sampler,context.view(POST_TARGET));
                const pass=encoder.beginRenderPass({label:'Ninjutsu focus OBS additive composite',colorAttachments:[{
                  view:context.view(target),loadOp:'load',storeOp:'store'}]});
                try{pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3,1,0,0);}finally{pass.end();}
              }});
            postComposited=true;
          }
        }
      }catch(error){try{destroyShapeLeases();}catch(cleanupError){error.cleanupError=cleanupError;}throw error;}
      const batch=shapeLeases.length?Object.freeze({destroy:destroyShapeLeases}):null;
      const actuallyDrawn=result.owned.length===1&&commands.length>0&&commands.some(c=>c.color[3]>0);
      return {owned:result.owned,omitted:result.omitted,drawn:actuallyDrawn,
        commands,shapeCommands,postCommands,postComposited,observerPostEffects:observerOn,
        batch,sourceEffectId:input.effect?.id??null,resultClaim:'focus-attempt-only',
        sourceGeometry:visuals[0]?.sourceGeometry??null};
    }
    function deviceBindGroup(device,layout,sampler,view){
      return device.createBindGroup({layout,entries:[{binding:0,resource:sampler},{binding:1,resource:view}]});
    }
    return Object.freeze({record,ready,get postTarget(){return textureTarget;},destroy(){
      if(destroyed)return;destroyed=true;
      try{textureTarget?.unregister?.();}catch(_){} try{texture?.destroy?.();}catch(_){}
    }});
  }
  const api=Object.freeze({TYPE,DURATION_MS,MAX_EVENTS,MAX_RECTS_PER_EVENT,MAX_SHAPES_PER_EVENT,
    POST_WGSL,plan,visualsFor,create});
  root.DvaWebGPUNinjutsuFocusE=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

