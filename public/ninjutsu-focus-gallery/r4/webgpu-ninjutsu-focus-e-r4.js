/* Ninjutsu focus visual R4, GPT-6.1-Sol. Derivative of the V797 composition:
 * four clamping hollow crescents, transported convergence front and source-contour OBS.
 * Original event/1200ms/attempt semantics and R2 batch leases are retained. */
(function (root) {
  'use strict';
  const TYPE = 'action-ninjutsu-focus', DURATION_MS = 1200;
  const MAX_EVENTS = 1, MAX_RECTS_PER_EVENT = 64, MAX_SHAPES_PER_EVENT = 224;
  const POST_TARGET = 'ninjutsu-focus-r4-observer-mask';
  const TAU = Math.PI * 2, finite = Number.isFinite;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const RED = Object.freeze([1, 0.075, 0.14]), WHITE = Object.freeze([1, 0.96, 0.93]);
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
  // The mask contains emission contours, not filled source-radius circles.
  // This compact observation blur spreads local light without filling the eye.
  let d=2.0/vec2f(textureDimensions(sourceMask)); let uv=input.uv;
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
    return { x:-w/2,y:-h/2,w,h,transform:[c,s,-s,c,x,y],color,mode:'additive' };
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
    // Preserve the accepted acquisition, locking and release time envelopes.
    const enter=smooth(clamp(p/0.10));
    const settle=smooth(clamp((p-0.04)/0.25));
    const release=smooth(clamp((p-0.72)/0.28));
    const lock=Math.sin(Math.PI*clamp((p-0.22)/0.26))**2;
    const size=radius*1.82*(reduced?1:1.20-settle*0.20-lock*0.055+release*0.045);
    const alpha=enter*(1-release);
    const ringCenter={x:c.x-size*0.028,y:c.y+size*0.020};
    const targetCenter={x:c.x+size*0.335,y:c.y-size*0.335};
    const ringRadius=size*0.208, targetRadius=size*0.045;
    const width=Math.max(1.15,size*0.0145), commands=[], shapeCommands=[];
    const arc=(where,r,start,sweep,lineWidth,color,strength)=>shapeCommands.push({kind:'arc',
      x:where.x,y:where.y,radius:r,start,sweep,lineWidth,
      color:rgba(color,alpha*strength),mode:'additive'});
    // Four tapered material crescents carry the primary silhouette. Rounded
    // analytic sub-arcs share one radius; their width varies over each quadrant.
    // A fine red circumference supports the crescent tips, never a filled disc.
    arc(ringCenter,ringRadius*1.025,0,TAU,width*0.55,RED,0.62);
    const crescentSegments=10, crescentSweep=1.18, crescents=[];
    for(let quadrant=0;quadrant<4;quadrant++) {
      const start=quadrant*Math.PI/2+0.195+(reduced?0:(1-settle)*0.16);
      crescents.push({start,sweep:crescentSweep,segments:crescentSegments});
      for(let i=0;i<crescentSegments;i++) {
        const u=(i+0.5)/crescentSegments;
        const taper=Math.sin(Math.PI*u)**0.72;
        const angle=start+i*crescentSweep/crescentSegments;
        const sweep=crescentSweep/crescentSegments*1.025;
        arc(ringCenter,ringRadius,angle,sweep,width*(0.34+2.50*taper),RED,0.86);
        arc(ringCenter,ringRadius-width*0.30,angle,sweep,
          width*(0.15+1.46*taper),WHITE,0.96);
      }
    }
    arc(targetCenter,targetRadius,0,TAU,width*(0.65+lock*.45),RED,0.92);
    arc(targetCenter,targetRadius*0.70,0,TAU,width*.36,WHITE,0.40+lock*.56);
    shapeCommands.push({kind:'circle',x:targetCenter.x,y:targetCenter.y,
      radius:width*(1.18+lock*.65),color:rgba(WHITE,alpha*0.98),mode:'additive'});
    // Compact cardinal material marks retain the empty source aperture.
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      commands.push(rect(ringCenter.x+dx*ringRadius*(1.11+(reduced?0:(1-settle)*.10)),
        ringCenter.y+dy*ringRadius*(1.11+(reduced?0:(1-settle)*.10)),width*1.15,width*.70,
        rgba(RED,alpha*0.78),Math.PI/4));
    }
    // A fan opens over the source arc and converges at one focal point. It is
    // optical composition inside this attempt, not an actual target trajectory.
    const dx=targetCenter.x-ringCenter.x,dy=targetCenter.y-ringCenter.y,len=Math.hypot(dx,dy);
    const ux=dx/len,uy=dy/len;
    const start={x:ringCenter.x+ux*ringRadius*0.96,y:ringCenter.y+uy*ringRadius*0.96};
    const end={x:targetCenter.x-ux*width*1.32,y:targetCenter.y-uy*width*1.32};
    const direction=Math.atan2(uy,ux), fan=[];
    for (const offset of [-0.35,-0.17,0,0.17,0.35]) {
      const a=offset===0?start:{x:ringCenter.x+Math.cos(direction+offset)*ringRadius*0.96,
        y:ringCenter.y+Math.sin(direction+offset)*ringRadius*0.96};
      const b=end, central=offset===0;
      fan.push({start:a,end:b,offset});
      const beam=line(a,b,width*(central?0.65:0.40),
        rgba(central?WHITE:RED,alpha*(central?0.78:0.65)));
      if(beam)commands.push(beam);
    }
    let highlight=null;
    if (!reduced && p>0.10 && p<0.72) {
      const travel=clamp((p-0.10)/0.38),t=smooth(travel);
      highlight={x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t};
      // Light is clipped geometrically to every actual sight connection: a
      // short band along its support, not a detached square traveling on air.
      for(const ray of fan) {
        const lo=clamp(t-0.11),hi=clamp(t+0.11);
        const at=u=>({x:ray.start.x+(ray.end.x-ray.start.x)*u,
          y:ray.start.y+(ray.end.y-ray.start.y)*u});
        const band=line(at(lo),at(hi),width*(ray.offset===0?1.55:0.88),
          rgba(WHITE,alpha*(travel<1?Math.sin(Math.PI*travel)*0.94:0)));
        if(band)commands.push(band);
      }
    }
    // OBS source mask uses the exact emissive supports and their current alpha.
    // All source material contributes local red light; nothing fills the hollow
    // eye before blur. Thin fan/marks and the moving band share the same mask.
    const postStrength=reduced?0.78:0.68+0.24*lock;
    const emissionColor=color=>rgba(RED,color[3]*postStrength);
    const postCommands=shapeCommands.map(s=>({...s,color:emissionColor(s.color)}));
    const postRects=commands.map(s=>({...s,color:emissionColor(s.color)}));
    return {commands,shapeCommands,postCommands,postRects,sourceGeometry:{size,ringCenter,targetCenter,
      ringRadius,targetRadius,settle,release,lock,rayStart:start,rayEnd:end,highlight,
      crescents,fan,maskContract:'exact-current-PH-support-no-filled-aperture'}};
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
        shapeCommands=visuals.flatMap(v=>v.shapeCommands),postCommands=visuals.flatMap(v=>v.postCommands),
        postRects=visuals.flatMap(v=>v.postRects);
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
            commands:shapeCommands,label:'R4 Ninjutsu focus PH reticle'}));
          for(const command of commands)frame.rect(target,command);
          if(observerOn&&postCommands.length){
            if(!renderer||!pipeline||!textureTarget)throw new Error('Ninjutsu focus OBS post pipeline is not ready');
            if(viewport.width!==980||viewport.height!==620)
              throw new Error('Ninjutsu focus OBS mask requires the main logical 980x620 viewport');
            frame.clear(POST_TARGET,[0,0,0,0]);
            keepShapeLease(shapes.enqueue(frame,{target:POST_TARGET,width:980,height:620,pixelWidth:980,pixelHeight:620,
              commands:postCommands,label:'R4 Ninjutsu focus OBS emission mask'}));
            for(const command of postRects)frame.rect(POST_TARGET,command);
            frame.addEncoder({label:'R4 Ninjutsu focus observer bloom',reads:[POST_TARGET],writes:[target],
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
        commands,shapeCommands,postCommands,postRects,postComposited,observerPostEffects:observerOn,
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
  const api=Object.freeze({VERSION:'ninjutsu-focus-quality-upgrade-sol61-r4',TYPE,DURATION_MS,MAX_EVENTS,MAX_RECTS_PER_EVENT,MAX_SHAPES_PER_EVENT,
    POST_WGSL,plan,visualsFor,create});
  root.DvaWebGPUNinjutsuFocusE=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

