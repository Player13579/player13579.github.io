/* Late kill-animation pass for the shared WebGPU frame. All positions are
 * logical viewport coordinates; texture objects are owned/uploaded by caller.
 * No Canvas 2D preprocessing or GPU-to-2D transfer occurs here. */
(function (root) {
  'use strict';
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const finite = Number.isFinite;
  const filamentCells = Object.freeze([null,
    [0,0,373,388,70,56],[373,0,373,388,70,56],[746,0,373,388,70,56],
    [1119,0,373,388,70,56],[1492,0,373,388,70,56],[0,388,373,388,70,56],
    [373,388,373,388,70,56],[746,388,373,388,70,56],[1119,388,373,388,70,56],
    [1492,388,373,388,70,56],[0,776,373,388,70,56],[373,776,373,388,70,56],
    [746,776,373,388,70,56],[1119,776,373,388,70,56],[1492,776,373,388,70,56],
    [0,1164,373,388,70,56],[373,1164,373,388,70,56],[746,1164,373,388,70,56],
    [1119,1164,373,383,70,56],[1492,1164,301,324,92,86],
    [1793,1164,186,324,176,82],[0,1552,186,301,176,78],
    [186,1552,186,265,176,74],[372,1552,171,226,176,74],
    [543,1552,149,192,181,70],[692,1552,131,164,191,70],
    [823,1552,90,136,215,70],[913,1552,57,104,229,74],
    [970,1552,38,72,237,78],[1008,1552,15,18,253,98],null,null,
    [1023,1552,373,388,70,56]]);
  const humanPhases = [.12, .27, .43, .61, .82];
  const botPhases = [0, 4, 1, 2, 1, 4, 0, 3];
  function color(hex, alpha = 1) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >>> 16 & 255) / 255, (n >>> 8 & 255) / 255, (n & 255) / 255, alpha];
  }
  function asset(assets, key, width, height) {
    const entry = assets?.[key];
    return entry?.texture && entry.width === width && entry.height === height ? entry : null;
  }
  function residualAsset(assets) {
    const entry = assets?.residual;
    return entry?.texture && finite(entry.width) && finite(entry.height) &&
      entry.width > 0 && entry.height > 0 ? entry : null;
  }
  function ease(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function needsBloom({ effects = [], now, assets = {} } = {}) {
    return !asset(assets, 'filament', 2048, 1940) && Array.isArray(effects) && finite(now) &&
      effects.some(effect => finite(effect?.startedAt) && finite(effect?.duration) &&
        effect.duration > 0 && finite(effect.x) && finite(effect.y) &&
        now - effect.startedAt > 0 && now - effect.startedAt < effect.duration);
  }
  function sprite(commands, texture, source, size, x, y, w, h, alpha = 1, mode = 'source-over', extra = {}) {
    if (!(alpha > 0)) return;
    const [sx, sy, sw, sh] = source;
    commands.push({ kind: 'sprite', texture, x, y, w, h,
      uv: [sx / size[0], sy / size[1], sw / size[0], sh / size[1]],
      color: [1, 1, 1, clamp(alpha, 0, 1)], mode, ...extra });
  }
  function rect(commands, x, y, w, h, fill) {
    commands.push({ kind: 'rect', x, y, w, h, color: fill, mode: 'source-over' });
  }
  function phaseAt(age, duration, reduced) {
    if (reduced) return 2;
    const p = clamp(age / duration, 0, 1);
    for (let i = 0; i < humanPhases.length; i++) if (p < humanPhases[i]) return i;
    return 0;
  }
  function plan({ effects = [], now, camera, zoom, viewport, reducedMotion = false, assets = {} } = {}) {
    if (!Array.isArray(effects) || !finite(now) || !camera ||
        ![camera.x, camera.y, zoom, viewport?.width, viewport?.height].every(finite) ||
        zoom <= 0 || viewport.width <= 0 || viewport.height <= 0) {
      throw new TypeError('Kill animation needs effects, clock, camera, zoom and logical viewport');
    }
    const live = effects.filter(effect => finite(effect?.startedAt) && finite(effect?.duration) &&
      effect.duration > 0 && now - effect.startedAt < effect.duration);
    const commands = [], text = [], unsupported = [];
    if (!live.length) return { drawn: false, commands, text, unsupported, liveCount: 0 };
    const filament = asset(assets, 'filament', 2048, 1940);
    for (const effect of live) {
      const age = now - effect.startedAt;
      if (!(age > 0) || !finite(effect.x) || !finite(effect.y)) continue;
      if (!filament) {
        const residual = residualAsset(assets);
        const bloom = asset(assets, 'residualBloom', 128, 128);
        if (!residual || !bloom) {
          throw new Error('World kill residual requires prepared same-device GPU source and bloom');
        }
        const progress = age / effect.duration;
        const arrival = ease(progress / .075);
        const convergence = ease((progress - .075) / .325);
        const release = ease((progress - .4) / .6);
        const compression = Math.sin(Math.PI * clamp((progress - .075) / .325, 0, 1)) ** 2;
        const size = 156 * (reducedMotion ? .72 : 1 - .28 * convergence);
        const alpha = arrival * (1 - release);
        const x = (effect.x - camera.x) * zoom - size / 2;
        const y = (effect.y - camera.y) * zoom - size / 2;
        sprite(commands, bloom.texture, [0, 0, 128, 128], [128, 128],
          x, y, size, size, alpha * (.65 + compression * .35), 'additive');
        sprite(commands, residual.texture, [0, 0, residual.width, residual.height],
          [residual.width, residual.height], x, y, size, size,
          alpha * (.84 + compression * .16), 'additive');
        continue;
      }
      const progress = clamp(age / effect.duration, 0, 1);
      const frame = reducedMotion ? 33 : Math.min(32, progress * 32);
      const low = Math.floor(frame), high = Math.min(32, low + 1), blend = frame - low;
      const releaseProgress = clamp((progress - .4) / .6, 0, 1);
      const release = releaseProgress * releaseProgress * (3 - 2 * releaseProgress);
      const onset = clamp(progress / .075, 0, 1);
      const envelope = reducedMotion ? onset * onset * (3 - 2 * onset) * (1 - release) : 1;
      for (const [index, weight] of reducedMotion ? [[33, 1]] : [[low, 1 - blend], [high, blend]]) {
        const cell = filamentCells[index];
        if (!cell || !(weight > 0)) continue;
        const [sx, sy, sw, sh, ox, oy] = cell, scale = 156 / 512;
        sprite(commands, filament.texture, [sx, sy, sw, sh], [2048, 1940],
          (effect.x - camera.x) * zoom + (ox - 256) * scale,
          (effect.y - camera.y) * zoom + (oy - 256) * scale,
          sw * scale, sh * scale, envelope * weight, 'additive');
      }
    }
    const effect = live[live.length - 1], age = now - effect.startedAt;
    if (age < 0 || age >= effect.duration) return { drawn: commands.length > 0, commands, text,
      unsupported, liveCount: live.length,
      bloomTexture: filament ? null : assets.residualBloom?.texture || null };
    const w = viewport.width, h = viewport.height, progress = clamp(age / effect.duration, 0, 1);
    const alpha = Math.min(clamp(age / 150, 0, 1), clamp((effect.duration - age) / 230, 0, 1));
    const human = !(effect.killerIsBot || effect.killerSkinId === 'operator');
    const blue = human && effect.killerSkinId === 'blue-dress';
    const panel = blue ? color('#141f2d', .8 * alpha) : human ? color('#161b22', .8 * alpha) : color('#180a0c', .74 * alpha);
    const material = asset(assets, 'material', 1963, 439);
    if (material) {
      const x = 12, y = h * .16, mw = w - 24, mh = h * .34;
      rect(commands, x + mw * .035, y + mh * .13, mw * .93, mh * .74, panel);
      sprite(commands, material.texture, [0, 0, 1963, 439], [1963, 439], x, y, mw, mh, alpha);
      if (!reducedMotion) {
        const easeInput = clamp((progress - .08) / .55, 0, 1);
        const q = easeInput * easeInput * (3 - 2 * easeInput);
        const pulse = Math.sin(Math.PI * q), head = -320 + 2603 * q;
        for (let band = 0; band < 48; band++) {
          const left = clamp(head - 320 + band * (320 / 48), 0, 1963);
          const right = clamp(head - 320 + (band + 1) * (320 / 48), 0, 1963);
          if (right <= left) continue;
          const shine = alpha * pulse * .74 * Math.sin(Math.PI * (band + .5) / 48) ** 2;
          sprite(commands, material.texture, [left, 0, right - left, 439], [1963, 439],
            x + left / 1963 * mw, y, (right - left) / 1963 * mw, mh, shine, 'additive');
        }
      }
    } else {
      rect(commands, 0, h * .16, w, h * .34, panel);
      const rule = blue ? color('#93c5fd', .94 * alpha) : human ? color('#e2e8f0', .94 * alpha) : color('#ef4444', .92 * alpha);
      rect(commands, 0, h * .16, w, 5, rule);
      rect(commands, 0, h * .50 - 5, w, 5, rule);
    }
    const slide = reducedMotion ? 0 : (1 - Math.min(1, progress * 4)) * 120;
    if (human) {
      const x = 12 - slide, y = h * .16 - 2;
      const key = blue ? 'bluePose' : 'whitePose';
      const cw = blue ? 180 : 220, ch = blue ? 236 : 240, feet = blue ? 228 : 230;
      const pose = asset(assets, key, cw * 5, ch);
      if (pose) {
        const phase = phaseAt(age, effect.duration, reducedMotion);
        sprite(commands, pose.texture, [phase * cw, 0, cw, ch], [cw * 5, ch],
          x + 110 - cw / 2, y + 220 - feet, cw, ch, alpha);
      } else {
        const fallback = blue ? assets.blueCutin : assets.whiteCutin;
        if (fallback?.texture && fallback.width > 0 && fallback.height > 0) {
          const frame = clamp(Math.floor(age / (1000 / 60)), 0, 59), p = frame / 59;
          const impact = Math.sin(Math.min(1, p * 1.7) * Math.PI / 2);
          const pulse = blue ? 0 : Math.sin(p * Math.PI * 8) * (1 - p) * .018;
          const scale = Math.min(220 / fallback.width, 220 / fallback.height) * (.9 + impact * .1 + pulse);
          const sw = fallback.width * scale, sh = fallback.height * scale;
          sprite(commands, fallback.texture, [0, 0, fallback.width, fallback.height],
            [fallback.width, fallback.height], x + 110 - sw / 2, y + 220 - sh,
            sw, sh, alpha, 'source-over', { rotation: (1 - impact) * -.035, pivot: [.5, 1] });
        } else {
          const legacy = assets.legacyHumanAtlas;
          if (legacy?.texture && legacy.width > 0 && legacy.height > 0) {
            const frame = clamp(Math.floor(age / (1000 / 60)), 0, 59);
            const cw = legacy.width / 10, ch = legacy.height / 6;
            sprite(commands, legacy.texture, [(frame % 10) * cw, Math.floor(frame / 10) * ch, cw, ch],
              [legacy.width, legacy.height], x, y, 220, 220, alpha);
          } else unsupported.push('human-cutin-sprite-unavailable');
        }
      }
    } else {
      const x = 98 - slide, y = h * .45;
      const bot = asset(assets, 'botPose', 640, 200);
      if (bot) {
        const phase = reducedMotion ? 2 : botPhases[clamp(Math.floor(age / (effect.duration / 8)), 0, 7)];
        sprite(commands, bot.texture, [phase * 128, 0, 128, 200], [640, 200],
          x + 3, y - 160, 128, 200, alpha);
      } else {
        const idle = assets.botIdle;
        if (idle?.texture && idle.width >= 177 && idle.height >= 240) {
          const scale = 184 / 224;
          sprite(commands, idle.texture, [79, 16, 98, 224], [idle.width, idle.height],
            x + 67 - 98 * scale / 2, y + 32 - 224 * scale, 98 * scale, 224 * scale, alpha);
        } else unsupported.push('bot-cutin-sprite-unavailable');
      }
    }
    text.push({ value: 'キル', x: 260 - slide * .35, centerY: h * .31, size: 52,
      color: blue ? color('#eff6ff', alpha) : human ? color('#f8fafc', alpha) : color('#fff1f2', alpha) });
    text.push({ value: effect.name ? `${effect.name} 撃破` : '対象を撃破',
      x: 264 - slide * .35, centerY: h * .38, size: 22,
      color: blue ? color('#bfdbfe', alpha) : human ? color('#cbd5e1', alpha) : color('#fca5a5', alpha) });
    return { drawn: true, commands, text, unsupported, liveCount: live.length,
      bloomTexture: filament ? null : assets.residualBloom?.texture || null };
  }
  function create({ textAtlas, bloom } = {}) {
    if (!textAtlas || typeof textAtlas.layout !== 'function' ||
        typeof textAtlas.ensure !== 'function' || !Array.isArray(textAtlas.textures)) {
      throw new TypeError('Shared WebGPU text atlas required');
    }
    const preparedPlans = new WeakSet();
    const submittedBloomTextures = new WeakSet();
    let ownedBloom = null;
    const deviceWatches = new WeakMap();
    const staleOwnedBloom = () => Object.assign(new Error('Owned kill bloom became stale'),
      { code: 'DVA_WEBGPU_STALE_SCENE' });
    function dropOwnedProof(entry) {
      const proof = entry.proof;
      entry.proof = null;
      if (entry.timer !== null) clearTimeout(entry.timer);
      entry.timer = null;
      proof?.destroy();
    }
    function releaseOwnedBloom(reason = staleOwnedBloom()) {
      const previous = ownedBloom;
      ownedBloom = null;
      if (!previous) return;
      previous.revoke?.(reason);
      try { dropOwnedProof(previous); }
      finally { bloom.release(); }
    }
    function discardOwnedBloom(entry, reason) {
      if (ownedBloom !== entry) return;
      try { releaseOwnedBloom(reason); } catch (_) { /* Preserve the frame error. */ }
    }
    function revokePendingOwnedBloom() {
      if (ownedBloom && !ownedBloom.ready) discardOwnedBloom(ownedBloom, staleOwnedBloom());
    }
    function checkBloomDevice(device) {
      let watch = deviceWatches.get(device);
      if (!watch) {
        watch = { error: null };
        deviceWatches.set(device, watch);
        const fail = (info) => {
          watch.error = new Error(`Owned kill bloom device lost: ${info?.message || info?.reason || 'unknown'}`);
          if (ownedBloom?.device === device) discardOwnedBloom(ownedBloom, watch.error);
        };
        device.lost.then(fail, fail);
      }
      if (watch.error) throw watch.error;
      return watch;
    }
    function prepareOwnedBloom(residual, revision, device, assertCurrent) {
      if (!residual || residual.device !== device || typeof device.createCommandEncoder !== 'function' ||
          typeof device.createBuffer !== 'function' || typeof device.lost?.then !== 'function' ||
          typeof device.queue?.submit !== 'function' || typeof device.pushErrorScope !== 'function' ||
          typeof device.popErrorScope !== 'function' || typeof assertCurrent !== 'function' ||
          typeof bloom?.prepare !== 'function' || typeof bloom.release !== 'function')
        throw new Error('Owned kill residual bloom needs its shared WebGPU device');
      const watch = checkBloomDevice(device);
      assertCurrent();
      let entry = ownedBloom;
      if (entry?.source !== residual.texture || entry.revision !== revision || entry.device !== device) {
        // Revoke before freeing any old target, even if the new record fails.
        releaseOwnedBloom();
        entry = { source: residual.texture, revision, device, asset: null, proof: null,
          timer: null, revoke: null, ready: false, checked: null };
        try {
          // Externally prepared legacy results must not become owned results.
          bloom.release();
          ownedBloom = entry;
          const scopeKinds = ['internal', 'out-of-memory', 'validation'];
          const scopes = [];
          let pushed = 0, recordingFailed = false, recordError;
          try {
            for (const kind of scopeKinds) {
              device.pushErrorScope(kind);
              pushed += 1;
            }
            const encoder = device.createCommandEncoder({ label: 'DVA kill residual bloom' });
            entry.proof = device.createBuffer({ label: 'DVA kill residual submission proof',
              size: 4, usage: 0x01 | 0x08, mappedAtCreation: true }); // MAP_READ | COPY_DST
            // An unused WebGPU buffer is already zero. Mark it nonzero so a
            // mappable but dropped command cannot pass the readback check.
            new Uint8Array(entry.proof.getMappedRange(0, 4)).fill(0xa5);
            entry.proof.unmap();
            entry.asset = bloom.prepare({ sourceTexture: residual.texture, revision, encoder });
            encoder.clearBuffer(entry.proof, 0, 4);
            device.queue.submit([encoder.finish()]);
          } catch (error) {
            recordingFailed = true;
            recordError = error;
          } finally {
            // Pop all pushed scopes in reverse order before yielding.
            while (pushed > 0) {
              const kind = scopeKinds[--pushed];
              try {
                scopes.push(Promise.resolve(device.popErrorScope()).then(error => ({ kind, error })));
              } catch (error) { scopes.push(Promise.reject(error)); }
            }
          }
          const checked = Promise.all(scopes).then(results => {
            if (recordingFailed) throw recordError;
            const failed = results.find(result => result.error);
            if (failed)
              throw new Error(`Owned kill bloom submission ${failed.kind} failed: ${failed.error.message || failed.error}`);
          });
          const proof = entry.proof;
          const reachedQueue = recordingFailed ? Promise.resolve() : Promise.resolve().then(async () => {
            if (ownedBloom !== entry) throw staleOwnedBloom();
            await proof.mapAsync(0x01); // GPUMapMode.READ
            if (ownedBloom !== entry) throw staleOwnedBloom();
            const bytes = new Uint8Array(proof.getMappedRange(0, 4));
            if (bytes.length !== 4 || bytes.some(value => value !== 0))
              throw new Error('Owned kill bloom submission did not clear its GPU proof buffer');
          });
          const revokedOrTimedOut = new Promise((_, reject) => {
            entry.revoke = reject;
            entry.timer = setTimeout(() => reject(new Error('Owned kill bloom GPU validation timed out')), 3000);
          });
          entry.checked = Promise.race([Promise.all([checked, reachedQueue]), revokedOrTimedOut]);
        } catch (error) {
          discardOwnedBloom(entry, error);
          throw error;
        }
      }
      if (entry.ready) return entry.asset;
      return entry.checked.then(() => {
        if (ownedBloom !== entry) throw staleOwnedBloom();
        if (watch.error) throw watch.error;
        assertCurrent();
        if (!entry.ready) {
          dropOwnedProof(entry);
          submittedBloomTextures.add(entry.asset.texture);
          entry.ready = true;
        }
        return entry.asset;
      }).catch(error => {
        discardOwnedBloom(entry, error);
        throw error;
      });
    }
    async function prepare(input = {}) {
      let assets = input.assets || {};
      if (needsBloom(input)) {
        const residual = residualAsset(assets);
        const revision = input.residualRevision ?? 0;
        let residualBloom;
        if (input.ownedBloomDevice) {
          residualBloom = prepareOwnedBloom(residual, revision, input.ownedBloomDevice, input.assertOwnedBloomCurrent);
          if (typeof residualBloom.then === 'function') residualBloom = await residualBloom;
        } else {
          if (!residual || typeof residual.texture.createView !== 'function' ||
              typeof bloom?.prepare !== 'function' ||
              typeof input.bloomEncoder?.beginRenderPass !== 'function') {
            throw new Error('Atlas-missing kill animation needs shared-device bloom and preparation encoder');
          }
          residualBloom = bloom.prepare({ sourceTexture: residual.texture,
            revision, encoder: input.bloomEncoder });
        }
        assets = { ...assets, residualBloom };
      }
      const prepared = plan({ ...input, assets });
      if (prepared.text.length) await textAtlas.ensure(prepared.text.map(item => item.value).join('\n'));
      preparedPlans.add(prepared);
      return prepared;
    }
    // Call only after queue.submit([bloomEncoder.finish()]) on the shared device.
    // Same-queue submission order then makes the bloom readable by the frame.
    function acknowledgeBloomSubmission(preparedPlan) {
      if (!preparedPlans.has(preparedPlan) || !preparedPlan.bloomTexture) {
        throw new TypeError('A prepared bloom plan is required');
      }
      submittedBloomTextures.add(preparedPlan.bloomTexture);
    }
    function record({ frame, target, preparedPlan } = {}) {
      if (!preparedPlans.has(preparedPlan)) {
        throw new TypeError('Prepared kill animation plan required');
      }
      if (preparedPlan.bloomTexture && !submittedBloomTextures.has(preparedPlan.bloomTexture)) {
        throw new Error('Submit prepared GPU bloom before recording the main frame');
      }
      if (!preparedPlan.drawn) return { drawn: false, commandCount: 0 };
      if (!frame || typeof frame.stage !== 'function' || typeof frame.rect !== 'function' ||
          typeof frame.sprite !== 'function' || typeof target !== 'string' || !target) {
        throw new TypeError('Shared WebGPU frame and target required');
      }
      const layouts = preparedPlan.text.map(item => {
        const layout = textAtlas.layout(item.value, { size: item.size, missing: 'replace' });
        for (const glyph of layout.quads) if (!textAtlas.textures[glyph.page]) {
          throw new Error('Kill cutin glyph page not uploaded; call prepare first');
        }
        return layout;
      });
      frame.stage('kill-animation');
      for (const command of preparedPlan.commands) {
        if (command.kind === 'rect') frame.rect(target, command);
        else frame.sprite(target, command);
      }
      preparedPlan.text.forEach((item, index) => {
        const layout = layouts[index], quads = layout.quads;
        const top = quads.length ? Math.min(...quads.map(q => q.y)) : 0;
        const bottom = quads.length ? Math.max(...quads.map(q => q.y + q.h)) : layout.height;
        for (const glyph of quads) frame.sprite(target, {
          x: item.x + glyph.x, y: item.centerY - (top + bottom) / 2 + glyph.y,
          w: glyph.w, h: glyph.h, uv: glyph.uv,
          texture: textAtlas.textures[glyph.page], color: item.color, mode: 'source-over'
        });
      });
      return { drawn: true, commandCount: preparedPlan.commands.length + layouts.reduce((n, l) => n + l.quads.length, 0),
        unsupported: preparedPlan.unsupported };
    }
    return Object.freeze({ plan, prepare, acknowledgeBloomSubmission,
      releaseOwnedBloom, revokePendingOwnedBloom, record });
  }
  const api = Object.freeze({ create, plan, filamentCells });
  root.DvaWebGPUKillAnimation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
