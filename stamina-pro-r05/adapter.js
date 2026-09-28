import { StaminaRenderer } from './src/renderer.mjs';
import { StaminaRuntime } from './src/runtime.mjs';
import { StaminaAudio } from './src/audio.mjs';
import { projectFixture, makeEvent } from './preview/fixture.mjs';

export const STAMINA_PRO_R05 = Object.freeze({
  id: 'stamina-pro-r05',
  title: 'ChatGPT Pro Stamina r0.5',
  width: 980,
  height: 620,
  actorHeightPx: 64,
  durationMs: 1500,
  quality: '技術再生確認待ち・品質未受入',
  provenance: 'ChatGPT Pro 独立設計',
  integration: '本編未接続',
  audio: 'ユーザー操作で解放・未聴取'
});

const PANEL_WIDTH = 490;
const PANEL_HEIGHT = 620;
const LOOP_GAP_MS = 180;

/** Mounts the source design as a controls-free, continuously replaying WebGPU gallery preview. */
export async function mountStaminaProR05(host) {
  if (!(host instanceof Element)) throw new TypeError('A host element is required');
  const canvases = ['dark', 'light'].map((background) => {
    const canvas = document.createElement('canvas');
    canvas.width = PANEL_WIDTH;
    canvas.height = PANEL_HEIGHT;
    canvas.dataset.background = background;
    canvas.setAttribute('aria-label', `ChatGPT Pro Stamina r0.5 ${background} background WebGPU preview`);
    canvas.style.cssText = 'display:block;width:50%;height:100%;';
    return canvas;
  });
  host.replaceChildren(...canvases);

  const verificationMode = new URLSearchParams(location.search).has('verify');
  const actor = {
    playerId: 'gallery-beneficiary', clockEpoch: 'gallery-session', world: [0, 0, 0],
    heightWorld: 1.7, clockMs: 0, visible: true, occluded: false
  };
  const startedAt = performance.now();
  const now = () => performance.now() - startedAt;
  const audio = new StaminaAudio({ verify: verificationMode });
  const runtime = new StaminaRuntime({
    resolveActor: (id) => id === actor.playerId ? actor : null,
    projectActor: (target) => projectFixture(target, { width: PANEL_WIDTH, height: PANEL_HEIGHT, scale: 64 }),
    nowReal: now,
    audio,
    verify: verificationMode
  });
  const renderers = [];
  let frameId = 0;
  let sequence = 0;
  let nextEventAt = 0;
  let disposed = false;
  const unlockAudio = (event) => { if (!verificationMode) void audio.unlockFromGesture(event); };
  host.addEventListener('pointerdown', unlockAudio);

  try {
    for (const canvas of canvases) renderers.push(await StaminaRenderer.create(canvas));
  } catch (error) {
    runtime.dispose();
    renderers.forEach((renderer) => renderer.dispose());
    host.removeEventListener('pointerdown', unlockAudio);
    await audio.dispose();
    canvases.forEach((canvas) => canvas.remove());
    throw error;
  }

  function frame() {
    if (disposed) return;
    const elapsed = now();
    actor.clockMs = elapsed;
    if (elapsed >= nextEventAt) {
      runtime.accept(makeEvent({
        id: `gallery-gain-${++sequence}`,
        playerId: actor.playerId,
        actorMs: elapsed,
        realMs: elapsed,
        epoch: actor.clockEpoch,
        actualDelta: 25,
        delivery: 'live'
      }));
      nextEventAt = elapsed + STAMINA_PRO_R05.durationMs + LOOP_GAP_MS;
    }

    const effects = runtime.frame({ documentVisible: !document.hidden });
    const body = { ...projectFixture(actor, { width: PANEL_WIDTH, height: PANEL_HEIGHT, scale: 64 }), phase: 0, lane: 0 };
    renderers.forEach((renderer, index) => {
      const fixtureBackground = index === 0 ? 0 : 1;
      const clear = index === 0 ? [0.028, 0.036, 0.053, 1] : [0.88, 0.89, 0.90, 1];
      renderer.draw([{ ...body, fixtureBackground }], { clear, passKind: 1 });
      renderer.draw(effects.map((item) => ({ ...item, fixtureBackground })), { load: true });
    });
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);
  return Object.freeze({
    canvases,
    verificationMode,
    get technical() { return renderers.map((renderer) => ({ submissions: renderer.submissions, errors: [...renderer.errors] })); },
    async dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frameId);
      runtime.dispose();
      renderers.forEach((renderer) => renderer.dispose());
      host.removeEventListener('pointerdown', unlockAudio);
      await audio.dispose();
      canvases.forEach((canvas) => canvas.remove());
    }
  });
}
