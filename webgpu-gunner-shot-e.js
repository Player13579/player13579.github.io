/* Textureless per-round gunner shot E on the shared ordered WebGPU frame.
 * Character pose/facing and the existing gunshot SFX remain separately owned. */
(function (root) {
  'use strict';
  const VARIANTS = Object.freeze({ handgun: 0, smg: 1, assault: 2, sniper: 3, taser: 4 });
  const MUZZLE_FORWARD = Object.freeze({ handgun: 29, smg: 37, assault: 43, sniper: 57, taser: 31 });
  const MUZZLE_HEIGHT = Object.freeze({ handgun: -32, smg: -34, assault: -36, sniper: -37, taser: -32 });
  const finite = Number.isFinite;
  // Shared with the legacy authored muzzle effect in app.js. Keep its cardinal
  // tie-break and weapon-specific offsets as the sole coordinate recipe.
  function cardinalMuzzle(effect) {
    const variant = effect?.variant;
    if (!Object.prototype.hasOwnProperty.call(MUZZLE_FORWARD, variant) ||
        ![effect?.x, effect?.y, effect?.targetX, effect?.targetY].every(finite)) return null;
    const dx = effect.targetX - effect.x, dy = effect.targetY - effect.y;
    if (Math.hypot(dx, dy) <= .001) return null;
    const direction = Math.abs(dx) >= Math.abs(dy)
      ? { dx: dx < 0 ? -1 : 1, dy: 0 }
      : { dx: 0, dy: dy < 0 ? -1 : 1 };
    const horizontal = direction.dx !== 0;
    const source = Object.freeze({
      x: effect.x + (horizontal ? 0 : direction.dy < 0 ? 8 : -8) + direction.dx * MUZZLE_FORWARD[variant],
      y: effect.y + (horizontal ? MUZZLE_HEIGHT[variant] : direction.dy < 0 ? -43 : -10) + direction.dy * MUZZLE_FORWARD[variant]
    });
    return Object.freeze({ ...direction, source });
  }
  const shader = /* wgsl */ `
struct Params { viewport: vec4f, points: vec4f, state: vec4f, detail: vec4f };
@group(0) @binding(0) var<uniform> p: Params;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let corners=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(corners[i],0,1);
}
fn segmentDistance(q:vec2f,a:vec2f,b:vec2f)->f32 {
  let d=b-a;let t=clamp(dot(q-a,d)/max(dot(d,d),.0001),0.0,1.0);
  return length(q-(a+d*t));
}
fn bell(x:f32,w:f32)->f32{return exp(-x*x/max(w*w,.0001));}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f {
  let pixel=pos.xy;let source=p.viewport.zw;let target=p.points.xy;
  let direction=target-source;let distance=max(length(direction),.001);
  let axis=direction/distance;let side=vec2f(-axis.y,axis.x);
  let t=clamp(p.points.z,0.0,1.0);let variant=p.points.w;
  let reduced=p.state.y>.5;let flight=select(clamp(t/.42,0.0,1.0),1.0,reduced);
  let head=source+direction*flight;
  let q=pixel-head;let along=dot(q,axis);let across=dot(q,side);
  let tail=select(82.0,118.0,variant>2.5);
  let lane=abs(across + select(0.0,sin(along*.11+variant)*2.1,variant>0.5&&variant<2.5));
  let shaft=bell(lane,select(2.7,1.5,variant>2.5)) *
    smoothstep(-tail,-tail+9.0,along)*(1.0-smoothstep(2.0,9.0,along));
  let slug=bell(segmentDistance(pixel,head-axis*7.0,head+axis*7.0),select(3.8,2.6,variant>2.5));
  let muzzleDistance=length(pixel-source);
  let flashRadius=select(18.0,24.0,variant==2.0||variant==3.0);
  let muzzle=bell(muzzleDistance,flashRadius)*.88 +
    bell(abs(dot(pixel-source,side)),2.8)*bell(dot(pixel-source,axis)-10.0,17.0)*.44;
  let hitAge=t-.34;let hitOn=smoothstep(-.035,.025,hitAge);
  let impactRadius=select(12.0,21.0,variant==3.0);
  let radial=length(pixel-target);
  let impactRing=bell(radial-(impactRadius+clamp(hitAge,0.0,.32)*32.0),2.4)*hitOn;
  let sparks=bell(radial,4.2)*hitOn*.76;
  let fork=select(0.0, bell(segmentDistance(pixel,target+side*3.0,target+side*25.0),2.0)+
    bell(segmentDistance(pixel,target-side*3.0,target-side*21.0),2.0),variant>3.5);
  let palette=select(select(select(vec3f(1.0,.57,.18),vec3f(1.0,.32,.08),variant>0.5),
      vec3f(1.0,.7,.24),variant>1.5),
      select(vec3f(.72,.91,1.0),vec3f(.23,.87,1.0),variant>3.5),variant>2.5);
  let hot=select(vec3f(1.0,.98,.84),vec3f(.9,.99,1.0),variant>3.5);
  let flightGlow=clamp(shaft*.8+slug*.96,0.0,.96);
  let muzzleGlow=clamp(muzzle,0.0,.96);
  let impactGlow=clamp(impactRing*.74+sparks*.84+fork*.8,0.0,.96);
  let temporal=select(1.0,1.0-smoothstep(.82,1.0,t),reduced);
  let gain=p.state.x*temporal;
  let rgb=palette*(flightGlow*.78+muzzleGlow*.38+impactGlow*.58)+hot*(slug*.42+muzzleGlow*.5+sparks*.26);
  let a=clamp((flightGlow*.76+muzzleGlow*.7+impactGlow*.8)*gain,0.0,.96);
  return vec4f(rgb*gain,a);
}`;

  function eligibleActor(actor, actorVisible, playerId, viewerId) {
    return Boolean(actor && actorVisible === true && String(actor.id ?? '') === String(playerId) &&
      actor.alive === true && !actor.ejected && !actor.inVent &&
      (!actor.invisible || String(actor.id ?? '') === String(viewerId || '')));
  }
  function plan({ effect, actor, actorVisible, actionOwner, playerCommand,
    viewerId, now, phase, camera, zoom, viewport, reducedMotion = false, alpha = 1 } = {}) {
    const variant = VARIANTS[effect?.variant];
    const eventId = effect?.id;
    const ownerId = actionOwner?.sourceEffectId ?? actionOwner?.effectId ?? actionOwner?.id;
    if (effect?.type !== 'action-shoot' || variant === undefined ||
        typeof eventId !== 'string' || !eventId ||
        !['playing', 'meeting'].includes(phase) ||
        !eligibleActor(actor, actorVisible, effect.playerId, viewerId) ||
        (ownerId !== undefined && String(ownerId) !== eventId) ||
        (actionOwner?.playerId !== undefined && String(actionOwner.playerId) !== String(effect.playerId)) ||
        (playerCommand && String(playerCommand.playerId) !== String(effect.playerId))) return null;
    const duration = effect.duration === undefined ? 1200 : effect.duration;
    if (![effect.x, effect.y, effect.targetX, effect.targetY, effect.radius,
      effect.startedAt, duration, now, camera?.x, camera?.y, zoom, alpha,
      viewport?.width, viewport?.height, viewport?.pixelWidth, viewport?.pixelHeight].every(finite) ||
      duration <= 0 || duration > 1200 || effect.radius <= 0 || zoom <= 0 ||
      alpha <= 0 || alpha > 1 || viewport?.kind !== 'main' ||
      viewport.width <= 0 || viewport.height <= 0 ||
      !Number.isInteger(viewport.pixelWidth) || !Number.isInteger(viewport.pixelHeight) ||
      viewport.pixelWidth <= 0 || viewport.pixelHeight <= 0) return null;
    const progress = (now - effect.startedAt) / duration;
    if (progress <= 0 || progress >= 1) return null;
    const dx = effect.targetX - effect.x, dy = effect.targetY - effect.y;
    const length = Math.hypot(dx, dy);
    if (!finite(length) || length <= .001) return null;
    const muzzle = cardinalMuzzle(effect);
    if (!muzzle) return null;
    const sourceX = muzzle.source.x, sourceY = muzzle.source.y;
    const dprX = viewport.pixelWidth / viewport.width, dprY = viewport.pixelHeight / viewport.height;
    const toPixel = (x, y) => [(x - camera.x) * zoom * dprX, (y - camera.y) * zoom * dprY];
    const [sx, sy] = toPixel(sourceX, sourceY), [tx, ty] = toPixel(effect.targetX, effect.targetY);
    const margin = Math.max(150, effect.radius * zoom) * Math.max(dprX, dprY);
    const minX = Math.min(sx, tx) - margin, maxX = Math.max(sx, tx) + margin;
    const minY = Math.min(sy, ty) - margin, maxY = Math.max(sy, ty) + margin;
    if (maxX < 0 || maxY < 0 || minX > viewport.pixelWidth || minY > viewport.pixelHeight) return null;
    const visualProgress = reducedMotion ? 1 : progress;
    const values = new Float32Array([viewport.pixelWidth, viewport.pixelHeight, sx, sy,
      tx, ty, visualProgress, variant,
      alpha, reducedMotion ? 1 : 0, effect.radius * zoom * Math.max(dprX, dprY),
      length * zoom * Math.max(dprX, dprY), 0, 0, 0, 0]);
    if (!values.every(finite)) return null;
    return Object.freeze({ eventId, effectId: eventId, playerId: effect.playerId,
      type: effect.type, variant: effect.variant, progress, duration,
      source: Object.freeze({ x: sourceX, y: sourceY }),
      target: Object.freeze({ x: effect.targetX, y: effect.targetY }),
      reducedMotion: Boolean(reducedMotion), values });
  }

  function create({ frameOwner } = {}) {
    if (frameOwner?.state !== 'ready' || !frameOwner.device?.createShaderModule ||
        !frameOwner.device?.queue?.writeBuffer || typeof frameOwner.own !== 'function' ||
        typeof frameOwner.release !== 'function')
      throw new TypeError('Gunner shot E requires one ready shared WebGPU frame owner');
    const device = frameOwner.device, format = frameOwner.format;
    const module = device.createShaderModule({ label: 'DVA gunner shot E WGSL', code: shader });
    const pipeline = device.createRenderPipeline({ label: 'DVA ordered gunner shot E', layout: 'auto',
      vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format,
        blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } }
      }] }, primitive: { topology: 'triangle-list' } });
    const slots = [], frameIndices = new WeakMap(), frameIds = new WeakMap();
    let destroyed = false;
    function slot(index) {
      if (slots[index]) return slots[index];
      const buffer = frameOwner.own(device.createBuffer({ label: `DVA gunner shot E ${index}`,
        size: 64, usage: 0x40 | 0x08 }));
      const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer } }] });
      return (slots[index] = { buffer, group });
    }
    function record({ frame, target, viewport, planned } = {}) {
      if (destroyed || frameOwner.state !== 'ready') throw new Error('Gunner shot E pass unavailable');
      if (typeof frame?.add !== 'function' || typeof frame?.stage !== 'function' ||
          typeof target !== 'string' || !target || !planned?.eventId ||
          planned.values?.length !== 16 || viewport?.pixelWidth !== planned.values[0] ||
          viewport?.pixelHeight !== planned.values[1])
        throw new TypeError('Gunner shot E needs open shared frame, target, viewport and plan');
      let ids = frameIds.get(frame);
      if (!ids) { ids = new Set(); frameIds.set(frame, ids); }
      if (ids.has(planned.eventId)) throw new Error(`Gunner shot E already recorded: ${planned.eventId}`);
      const index = frameIndices.get(frame) || 0;
      const { buffer, group } = slot(index);
      device.queue.writeBuffer(buffer, 0, planned.values);
      frame.stage(`world:action-shoot:${planned.eventId}`);
      frame.add({ target, label: `DVA gunner shot E ${planned.eventId}`,
        encode(pass, info) {
          if (info.device !== device || info.format !== format ||
              info.width !== viewport.pixelWidth || info.height !== viewport.pixelHeight)
            throw new Error('Gunner shot E target device, format or backing size mismatch');
          pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.draw(3);
        } });
      ids.add(planned.eventId); frameIndices.set(frame, index + 1);
      return planned.eventId;
    }
    return Object.freeze({ device, plan, record, shader,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        for (const item of slots) if (frameOwner.release(item.buffer)) item.buffer.destroy();
        slots.length = 0;
      } });
  }
  const api = Object.freeze({ VARIANTS, MUZZLE_FORWARD, MUZZLE_HEIGHT, cardinalMuzzle, shader, plan, create });
  root.DvaWebGPUGunnerShotE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
