/**
 * Thin gallery host for ChatGPT Pro Stamina r0.1.
 * Uses the supplied package renderer and event sampler without changing its design.
 * The host page should provide a 980x620 container and may add its own diagnostics.
 */
import { createGPU, StaminaRenderer } from './stamina-pro-r01/renderer.mjs';
import { GainStaminaSystem } from './stamina-pro-r01/events.mjs';
import { StaminaAudio } from './stamina-pro-r01/audio.mjs';

export const STAMINA_PRO_GALLERY = Object.freeze({
  id: 'stamina-pro-r01',
  title: 'GPT Pro r0.1',
  width: 980,
  height: 620,
  durationMs: 1500,
  quality: '品質未受入・評価未了',
  provenance: 'ChatGPT Pro 独立設計',
  integration: '未接続',
  audio: '未聴取'
});

/** Mount one continuously replaying, actual WebGPU preview into `host`. */
export async function mountStaminaProGallery(host) {
  if (!(host instanceof Element)) throw new TypeError('A host element is required');
  const canvas = document.createElement('canvas');
  canvas.width = STAMINA_PRO_GALLERY.width;
  canvas.height = STAMINA_PRO_GALLERY.height;
  canvas.setAttribute('aria-label', 'GPT Pro Stamina r0.1 WebGPU effect');
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  host.querySelector('canvas')?.remove();
  host.prepend(canvas);

  const system = new GainStaminaSystem();
  const actor = { playerId: 'gallery-player', timeMs: 0, x: 0, y: 0,
    timeScale: 1, paused: false, alive: true, present: true, visible: true };
  const actors = new Map([[actor.playerId, actor]]);
  const verificationMode = new URLSearchParams(location.search).has('verify');
  const audio = verificationMode ? null : new StaminaAudio();
  const gpu = await createGPU();
  const renderer = await StaminaRenderer.create(gpu, canvas);
  const startedAt = performance.now();
  let nextStart = 0;
  let sequence = 0;
  let frameId = 0;
  let disposed = false;

  function frame(now) {
    if (disposed) return;
    actor.timeMs = now - startedAt;
    if (actor.timeMs >= nextStart) {
      const durationMs = STAMINA_PRO_GALLERY.durationMs;
      const event = { type: 'gain-stamina', eventId: `gallery-${++sequence}`,
        playerId: actor.playerId, amount: 20, startedAt: actor.timeMs,
        durationMs, radius: 82, source: 'gallery' };
      system.ingest(event, actor);
      nextStart = actor.timeMs + durationMs + 450;
    }
    const samples = system.update(actors);
    audio?.sync(samples);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    renderer.resize(width, height);
    renderer.render({ sample: samples.at(-1) ?? null, showActor: true,
      scale: dpr, origin: [width / 2, height * 0.80] });
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);
  return Object.freeze({
    canvas,
    gpu: Object.freeze({ metadata: gpu.metadata, messages: gpu.messages, errors: gpu.errors }),
    audioForcedOff: verificationMode,
    get audioEnabled() { return audio?.enabled === true; },
    async toggleSound() {
      if (disposed || verificationMode || !audio) return false;
      if (audio.enabled) await audio.mute();
      else await audio.enable();
      return audio.enabled;
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frameId);
      system.resetEpoch();
      renderer.destroy();
      gpu.device.destroy();
      await audio?.dispose();
      canvas.remove();
    }
  });
}
