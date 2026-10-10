/* Public gunner-only standalone fixtures; no game entrypoint is loaded. */
(function (root) {
  'use strict';
  const WIDTH = 980, HEIGHT = 620;
  const VARIANTS = Object.freeze(['handgun', 'smg', 'assault', 'sniper', 'taser']);
  function fixture({ elapsedMs = 450, variant = 'handgun', reducedMotion = false,
    pixelWidth = WIDTH, pixelHeight = HEIGHT } = {}) {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || !VARIANTS.includes(variant) ||
        !Number.isInteger(pixelWidth) || pixelWidth <= 0 ||
        !Number.isInteger(pixelHeight) || pixelHeight <= 0) throw new TypeError('Invalid gunner fixture');
    const effect = Object.freeze({ id: 'gallery-shot-fixture-1', type: 'action-shoot',
      playerId: 'gallery-gunner', variant, x: 320, y: 350, targetX: 670, targetY: 318,
      radius: 90, startedAt: 0, duration: 1200 });
    return Object.freeze({ effect, now: elapsedMs,
      actor: Object.freeze({ id: effect.playerId, alive: true, visible: true }),
      actorVisible: true, viewerId: effect.playerId, phase: 'playing', alpha: 1,
      camera: Object.freeze({ x: 0, y: 0 }), zoom: 1, reducedMotion: Boolean(reducedMotion),
      viewport: Object.freeze({ kind: 'main', width: WIDTH, height: HEIGHT, pixelWidth, pixelHeight }),
      anchor: Object.freeze({ x: effect.x, y: effect.y }) });
  }
  function createOwner(device, format) {
    const resources = new Set();
    return { device, format, state: 'ready',
      own(value) { if (this.state !== 'ready') throw new Error('Preview disposed'); resources.add(value); return value; },
      release(value) { return resources.delete(value); },
      get ownedCount() { return resources.size; },
      dispose() { if (this.state === 'disposed') return; this.state = 'disposed';
        for (const value of resources) value.destroy?.(); resources.clear(); }
    };
  }
  function createFrame() {
    const commands = [], stages = [];
    return { commands, stages, stage(name) { stages.push(name); },
      add(command) { if (command.target !== 'preview' || typeof command.encode !== 'function')
        throw new TypeError('Invalid preview draw'); commands.push(command); },
      encode(pass, info) { for (const command of commands) {
        pass.setScissorRect(0, 0, info.width, info.height); command.encode(pass, info);
      } }
    };
  }
  function record(api, effectPass, input, frame) {
    const planned = api.plan(input);
    if (!planned) return { drawn: 0, plan: null };
    effectPass.record({ frame, target: 'preview', viewport: input.viewport, planned });
    return { drawn: 1, plan: planned };
  }
  function options(search = '') {
    const query = new URLSearchParams(search), rawTime = query.get('t');
    const time = rawTime === null ? 450 : Number(rawTime);
    const held = rawTime !== null && Number.isFinite(time) && time >= 0;
    return Object.freeze({ verify: query.has('verify'), muted: true,
      elapsedMs: held ? time : 450, autoplay: query.get('autoplay') === '1' && !held,
      reducedMotion: query.get('reduced') === '1',
      variant: VARIANTS.includes(query.get('variant')) ? query.get('variant') : 'handgun' });
  }
  const api = Object.freeze({ WIDTH, HEIGHT, VARIANTS, fixture, createOwner, createFrame, record, options });
  root.DvaPublicGunnerPreviewAdapter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
