/* Textureless weak/shock/penetrate special-ammo E on the ordered shared WebGPU frame.
 * Semantic sound events remain outside this renderer. */
(function (root) {
  'use strict';
  const TYPES = Object.freeze({
    'action-special-ammo-load': 0,
    'action-special-ammo-shot': 1,
    'action-special-ammo-impact': 2
  });
  const VARIANTS = Object.freeze({ weak: 0, shock: 1, penetrate: 2 });
  const finite = Number.isFinite;
  const smooth = t => t * t * (3 - 2 * t);
  const shader = /* wgsl */ `
struct Params { viewport: vec4f, geometry: vec4f, state: vec4f, hue: vec4f };
@group(0) @binding(0) var<uniform> p: Params;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let corners=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(corners[i],0,1);
}
fn bell(x:f32,w:f32)->f32{return exp(-x*x/max(w*w,.0001));}
fn ring(r:f32,center:f32,width:f32)->f32{return bell(r-center,width);}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f {
  let delta=(pos.xy-p.viewport.zw)/max(p.geometry.xy,vec2f(.001));
  let ca=cos(p.geometry.z);let sa=sin(p.geometry.z);
  let q=vec2f(delta.x*ca+delta.y*sa,-delta.x*sa+delta.y*ca);
  let r=length(q); let t=clamp(p.state.x,0.0,1.0);
  let phase=p.state.y;let shock=p.state.z>.5&&p.state.z<1.5;
  let penetrate=p.state.z>1.5;let reduced=p.hue.w>.5;
  let pulse=sin(t*3.14159265);
  let penetrateTime=select(t,.5,reduced);
  let penetratePulse=select(pulse,.65,reduced);
  var source=0.0;var halo=0.0;
  if(phase<.5){
    if(penetrate){
      let inner=.31-.13*penetrateTime;let outer=.52-.23*penetrateTime;
      source=ring(r,outer,.018)*(.52+.22*penetratePulse);
      source+=ring(r,inner,.015)*(.48+.2*penetratePulse);
      let axis=smoothstep(-.08,.06,q.x)*(1.0-smoothstep(.65,.78,q.x));
      source+=bell(q.y,.018)*axis*.68;
      halo=bell(q.y,.13)*bell(q.x-.35,.47)*.16;
    }else if(shock){
      let lane=abs(q.y-sin(q.x*21.0+select(t*31.0,0.0,reduced)+p.geometry.w*6.0)*.055);
      source=bell(lane,.026)*(1.0-smoothstep(.16,.85,abs(q.x)))*(.55+.25*pulse);
      source+=ring(r,.32+.08*pulse,.022)*.48;
      halo=bell(r,.53)*.22;
    }else{
      source=ring(r,.48-.17*t,.024)*(.5+.3*pulse);
      source+=bell(q.x,.036)*bell(q.y,.43)*(.3+.3*pulse);
      halo=bell(r,.48)*.2;
    }
  }else if(phase<1.5){
    if(penetrate){
      let shaft=smoothstep(-.71,-.59,q.x)*(1.0-smoothstep(.71,.85,q.x));
      source=bell(q.y,.013)*shaft*.98;
      source+=bell(q.x-.74,.068)*bell(q.y,.037)*.55;
      halo=bell(q.y,.105)*bell(q.x,.68)*.15;
    }else if(shock){
      let zig=abs(q.y-sin(q.x*23.0+select(t*38.0,0.0,reduced)+p.geometry.w*6.0)*.045);
      source=bell(zig,.021)*(1.0-smoothstep(.05,.78,abs(q.x)))*.92;
      source+=bell(r,.19)*.5;
      halo=bell(q.y,.16)*bell(q.x,.64)*.21;
    }else{
      let tip=smoothstep(-.7,-.54,q.x)*(1.0-smoothstep(.56,.7,q.x));
      source=bell(q.y,.026)*tip*.9;
      source+=ring(r,.34,.035)*.21;
      halo=bell(q.y,.18)*bell(q.x,.61)*.24;
    }
  }else{
    if(penetrate){
      source=bell(r,.075)*(.85-.35*t);
      let axis=smoothstep(.08,.16,abs(q.x))*(1.0-smoothstep(.43,.59,abs(q.x)));
      source+=bell(q.y,.017)*axis*(.61+.13*penetratePulse);
      source+=ring(r,.19+.3*penetrateTime,.019)*(.38+.24*penetratePulse);
      halo=bell(r,.37)*.16;
    }else if(shock){
      let angle=atan2(q.y,q.x);
      let forks=pow(abs(cos(angle*3.0+select(t*8.0,0.0,reduced))),15.0);
      source=ring(r,.2+.24*t,.026)*(.36+.56*forks);
      source+=bell(q.x,.023)*bell(q.y,.55)*.55;
      source+=bell(q.y,.023)*bell(q.x,.55)*.55;
      halo=bell(r,.48)*.26;
    }else{
      source=ring(r,.19+.47*t,.036)*(.65+.25*pulse);
      source+=bell(r,.16)*(.65-.45*t);
      halo=bell(r,.56)*.25;
    }
  }
  let fade=1.0-smoothstep(.72,1.0,t);
  let gain=p.state.w*fade;
  let bright=clamp(source*gain,0.0,.94);
  let glow=clamp(halo*gain,0.0,.32);
  let tint=select(select(vec3f(.78,.13,.40),vec3f(.16,.72,1.0),shock),
    vec3f(.37,.28,.96),penetrate);
  let hot=select(select(vec3f(1.0,.87,.97),vec3f(.9,.99,1.0),shock),
    vec3f(.81,.84,1.0),penetrate);
  return vec4f(hot*bright+tint*glow,clamp(bright+glow,0.0,.98));
}`;
  function plan({ effect, now, phase, camera, zoom, viewport,
    reducedMotion = false, alpha = 1 } = {}) {
    const mode = TYPES[effect?.type];
    const variantName = String(effect?.variant || '').split(':')[0];
    const variant = VARIANTS[variantName];
    if (mode === undefined || variant === undefined || !effect?.id ||
        !['playing', 'meeting'].includes(phase) || viewport?.kind !== 'main') return null;
    if (![effect.x, effect.y, effect.startedAt, effect.duration,
      now, camera?.x, camera?.y, zoom, alpha,
      viewport.width, viewport.height, viewport.pixelWidth,
      viewport.pixelHeight].every(finite) || effect.duration <= 0 ||
      zoom <= 0 || alpha <= 0 || alpha > 1 ||
      viewport.width <= 0 || viewport.height <= 0 ||
      !Number.isInteger(viewport.pixelWidth) ||
      !Number.isInteger(viewport.pixelHeight) ||
      viewport.pixelWidth <= 0 || viewport.pixelHeight <= 0) return null;
    const progress = (now - effect.startedAt) / effect.duration;
    if (progress <= 0 || progress >= 1) return null;
    const targetX = finite(Number(effect.targetX)) ? Number(effect.targetX) : effect.x;
    const targetY = finite(Number(effect.targetY)) ? Number(effect.targetY) : effect.y;
    if (![targetX, targetY].every(finite)) return null;
    const pulse = Math.sin(progress * Math.PI);
    let x = effect.x, y = effect.y, width = mode === 0 ? 245 : 205;
    let height = mode === 0 ? 150 : 118, angle = 0;
    let opacity = Math.max(.1, 1 - progress * .82);
    if (mode === 1) {
      const dx = targetX - x, dy = targetY - y;
      const length = Math.hypot(dx, dy) || 1;
      const travel = variant === 1 ? progress : smooth(progress);
      const offset = variant === 1 && !reducedMotion
        ? Math.sin(progress * Math.PI * 18) * (1 - progress) * 7 : 0;
      x += dx * travel - dy / length * offset;
      y += dy * travel + dx / length * offset;
      angle = Math.atan2(dy, dx);
      width = variant === 2 ? 240 : variant === 1 ? 205 : 220;
      height = variant === 2 ? 90 : 120;
      opacity = Math.max(.2, 1 - progress * .5);
    } else if (mode === 0) {
      y -= 34;
      if (variant === 2) {
        width = 220 * (.9 + (reducedMotion ? .06 : pulse * .12));
        height = 125 * (.98 + (reducedMotion ? .04 : pulse * .08));
      } else if (variant === 0) {
        width *= .84 + pulse * .22;
        height *= 1.08 - pulse * .1;
      } else {
        if (!reducedMotion) {
          x += Math.sin(progress * Math.PI * 14) * (1 - progress) * 8;
          y += Math.cos(progress * Math.PI * 11) * (1 - progress) * 4;
        }
        width *= .9 + pulse * .12;
      }
    } else if (variant === 2) {
      width = 235 * (.9 + (reducedMotion ? .06 : pulse * .12));
      height = 128 * (.92 + (reducedMotion ? .06 : pulse * .12));
    } else if (variant === 0) {
      width = 250 * (.82 + pulse * .38);
      height = 145 * (1.08 - pulse * .16);
    } else {
      if (!reducedMotion) {
        x += Math.sin(progress * Math.PI * 22) * (1 - progress) * 9;
        y += Math.cos(progress * Math.PI * 17) * (1 - progress) * 5;
      }
      width = 225 * (.88 + pulse * .2);
      height = 135 * (.92 + pulse * .16);
    }
    const dprX = viewport.pixelWidth / viewport.width;
    const dprY = viewport.pixelHeight / viewport.height;
    const centerX = (x - camera.x) * zoom * dprX;
    const centerY = (y - camera.y) * zoom * dprY;
    const values = new Float32Array([
      viewport.pixelWidth, viewport.pixelHeight, centerX, centerY,
      width * zoom * dprX, height * zoom * dprY, angle,
      String(effect.id).length % 17 / 17,
      progress, mode, variant, opacity * alpha,
      0, 0, 0, reducedMotion ? 1 : 0
    ]);
    if (!values.every(finite)) return null;
    return Object.freeze({ effectId: String(effect.id), type: effect.type,
      variant: variantName, sourceX: effect.x, sourceY: effect.y,
      targetX, targetY, x, y, progress, duration: effect.duration,
      reducedMotion: Boolean(reducedMotion), values });
  }
  function create({ frameOwner } = {}) {
    if (frameOwner?.state !== 'ready' ||
        !frameOwner.device?.createShaderModule ||
        !frameOwner.device?.queue?.writeBuffer ||
        typeof frameOwner.own !== 'function' ||
        typeof frameOwner.release !== 'function')
      throw new TypeError('Special ammo effect requires one shared WebGPU frame owner');
    const device = frameOwner.device, format = frameOwner.format;
    const module = device.createShaderModule({ label: 'DVA special ammo WGSL', code: shader });
    const pipeline = device.createRenderPipeline({ label: 'DVA ordered special ammo E',
      layout: 'auto', vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format,
        blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha',
            operation: 'add' } } }] },
      primitive: { topology: 'triangle-list' } });
    const slots = [], indices = new WeakMap();
    let destroyed = false;
    function slot(index) {
      if (slots[index]) return slots[index];
      const buffer = frameOwner.own(device.createBuffer({ label: `DVA special ammo ${index}`,
        size: 64, usage: 0x40 | 0x08 }));
      const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer } }] });
      return (slots[index] = { buffer, group });
    }
    function record({ frame, target, viewport, planned } = {}) {
      if (destroyed || frameOwner.state !== 'ready')
        throw new Error('Special ammo effect pass unavailable');
      if (typeof frame?.add !== 'function' || typeof frame?.stage !== 'function' ||
          typeof target !== 'string' || !target || !planned ||
          planned.values?.length !== 16 ||
          viewport?.pixelWidth !== planned.values[0] ||
          viewport?.pixelHeight !== planned.values[1])
        throw new TypeError('Special ammo E needs current shared frame, target, viewport and plan');
      const index = indices.get(frame) || 0;
      const { buffer, group } = slot(index);
      device.queue.writeBuffer(buffer, 0, planned.values);
      frame.stage(`world:special-ammo:${planned.effectId}`);
      frame.add({ target, label: `DVA special ammo ${planned.effectId}`,
        encode(pass, info) {
          if (info.device !== device || info.format !== format ||
              info.width !== viewport.pixelWidth ||
              info.height !== viewport.pixelHeight)
            throw new Error('Special ammo target device, format or backing size mismatch');
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, group);
          pass.draw(3);
        } });
      indices.set(frame, index + 1);
      return Object.freeze({ effectId: planned.effectId, type: planned.type,
        variant: planned.variant, drawn: true });
    }
    return Object.freeze({ device, plan, record, shader,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        for (const item of slots) {
          if (frameOwner.release(item.buffer)) item.buffer.destroy();
        }
        slots.length = 0;
      } });
  }
  const api = Object.freeze({ TYPES, VARIANTS, shader, plan, create });
  root.DvaWebGPUSpecialAmmoEffect = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
