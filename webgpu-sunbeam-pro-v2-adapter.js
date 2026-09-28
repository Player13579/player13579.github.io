/* Connect the authored Sunbeam module to the game's single shared GPU frame. */
(function (root) {
  'use strict';

  async function create({ renderer, source, audio } = {}) {
    if (!renderer?.device || !renderer?.format)
      throw new TypeError('Sunbeam v2 needs the shared renderer');
    const module = source || await import('./webgpu-sunbeam-pro-v2.mjs?fix=empty-frame-backpressure-v1');
    if (typeof module?.plan !== 'function' || typeof module?.create !== 'function')
      throw new TypeError('Sunbeam v2 source is unavailable');
    let engine = await module.create({ device: renderer.device, format: renderer.format,
      ...(audio ? { audio } : {}) });
    let currentAudio = audio || null;
    let destroyed = false, nextToken = 0, lastVisibleToken = 0;
    let audioConfiguration = 0;
    const entries = new Map();
    const retired = new Set();

    function inputFor(event, viewport, roomId) {
      const { effect, hands, camera, zoom, elapsed } = event;
      if (effect?.type !== 'flora-sunbeam' || !effect.sunbeamCausalId ||
          !Array.isArray(hands) || !hands.length || hands.length > 2 ||
          !Number.isFinite(camera?.x) || !Number.isFinite(camera?.y) ||
          !(zoom > 0) || !Number.isFinite(elapsed) || !roomId)
        throw new TypeError('Sunbeam v2 needs one authoritative path and its hands');
      const dpr = viewport.pixelWidth / viewport.width;
      const actorRate = event.actorRate ?? 1;
      if (!(dpr > 0) || Math.abs(viewport.pixelHeight / viewport.height - dpr) > 0.02)
        throw new TypeError('Sunbeam v2 needs one consistent framebuffer scale');
      if (!Number.isFinite(actorRate) || actorRate < 0)
        throw new TypeError('Sunbeam v2 actor rate is invalid');
      const endpoint = [(effect.targetX - camera.x) * zoom,
        (effect.targetY - camera.y) * zoom];
      const rays = hands.map(hand => {
        if (![hand.x, hand.y].every(Number.isFinite))
          throw new TypeError('Sunbeam v2 hand coordinates are invalid');
        const palm = [(hand.x - camera.x) * zoom, (hand.y - camera.y) * zoom];
        return { palmCss: palm, endCss: endpoint,
          directionCss: [endpoint[0] - palm[0], endpoint[1] - palm[1]] };
      });
      return {
        eventId: String(effect.sunbeamCausalId), ownerId: String(effect.playerId),
        roomId: String(roomId), actorNowMs: elapsed, startActorMs: 0,
        // The authored PCM accepts at most 4x. The visual actor clock remains
        // authoritative even when game acceleration exceeds that audio bound.
        actorRate: Math.min(4, actorRate),
        characterElapsedMs: event.characterElapsedMs ?? 0,
        rangeWorld: Math.hypot(effect.targetX - effect.x, effect.targetY - effect.y),
        alive: event.alive !== false, visible: event.visible !== false,
        cancelled: Boolean(effect.cancelled), twoPalms: hands.length === 2,
        reducedMotion: Boolean(event.reducedMotion),
        camera: { zoom, cssPxPerWorld: 1 },
        viewport: { widthCss: viewport.width, heightCss: viewport.height, dpr }, rays
      };
    }

    function record({ frame, target, viewport, events = [], roomId } = {}) {
      if (destroyed || typeof frame?.addEncoder !== 'function' || !target ||
          !Number.isInteger(viewport?.pixelWidth) ||
          !Number.isInteger(viewport?.pixelHeight) || !Array.isArray(events))
        throw new TypeError('Sunbeam v2 needs an active shared frame and complete event set');
      const selected = engine;
      const plans = events.map(event => module.plan(inputFor(event, viewport, roomId)));
      if (plans.some(plan => !plan) || new Set(plans.map(plan => plan.eventId)).size !== plans.length)
        throw new Error('Sunbeam v2 plans are missing or duplicate one cause');
      const token = ++nextToken;
      const sampledAtMs = performance.now();
      const entry = { token, engine: selected, receipt: null, state: 'queued',
        visible: false, gate: null, causeIds: plans.map(plan => plan.eventId) };
      entry.completion = new Promise(resolve => { entry.settle = resolve; });
      entries.set(token, entry);
      frame.addEncoder({ label: 'sunbeam-e-v2', reads: [], writes: [target],
        encode(encoder, info) {
          if (destroyed) throw new Error('Sunbeam v2 adapter destroyed before encode');
          const size = info.size(target);
          if (size.width !== viewport.pixelWidth || size.height !== viewport.pixelHeight)
            throw new Error('Sunbeam v2 viewport changed before encode');
          entry.receipt = selected.record({ id: info.frameId, encoder,
            colorView: info.view(target), width: size.width, height: size.height,
            sampledAtMs }, plans);
          entry.state = 'recorded';
        },
        onSubmitted(proof) {
          if (!entry.receipt || entry.state !== 'recorded')
            throw new Error('Sunbeam v2 submitted without a recorded receipt');
          entry.state = 'submitted';
          void selected.driver.submitted(entry.receipt, proof).then(() => {
            entry.state = 'activated';
            entry.settle();
            acceptIfVisible(entry);
          }).catch(error => {
            entry.state = 'failed';
            entry.settle();
            entries.delete(token);
            selected.sfx?.stopAll();
            root.console?.error?.('Sunbeam v2 submission proof failed', error);
          });
        },
        onProofError({ error }) {
          entry.state = 'failed';
          entry.settle();
          entries.delete(token);
          selected.sfx?.stopAll();
          if (entry.receipt) {
            // The encoder was submitted, but frame-core could not form its
            // proof. Keep the uniform buffer alive until GPU work settles.
            void renderer.device.queue.onSubmittedWorkDone().then(() => {
              selected.driver.abandon(entry.receipt);
            }).catch(failure => root.console?.error?.(
              'Sunbeam v2 proof recovery failed', failure));
          }
          root.console?.error?.('Sunbeam v2 frame proof unavailable', error);
        },
        onAbandon() {
          if (entry.state === 'recorded') selected.driver.abandon(entry.receipt);
          entry.settle();
          entries.delete(token);
        }
      });
      return Object.freeze({ token, eventIds: Object.freeze(plans.map(plan => plan.eventId)) });
    }

    function acceptIfVisible(entry) {
      if (!entry.visible || entry.state !== 'activated') return;
      entries.delete(entry.token);
      let allowed = false;
      try { allowed = entry.gate?.() === true; } catch (_) { /* Fail closed. */ }
      if (destroyed || entry.engine !== engine || entry.token < lastVisibleToken ||
          !allowed) {
        for (const id of entry.causeIds) currentAudio?.consumedIds?.add(id);
        entry.engine.sfx?.stopAll();
        return;
      }
      try { entry.engine.sfx?.accept(entry.receipt); }
      catch (error) { root.console?.error?.('Sunbeam v2 SFX receipt rejected', error); }
    }

    function commitVisibleFrame(token, gate) {
      if (!Number.isSafeInteger(token) || token <= 0 ||
          typeof gate !== 'function' || !entries.has(token) ||
          token < lastVisibleToken) return false;
      lastVisibleToken = token;
      const entry = entries.get(token);
      entry.visible = true;
      let allowed = false;
      try { allowed = gate() === true; } catch (_) { /* Fail closed. */ }
      entry.gate = allowed ? gate : () => false;
      if (!allowed) {
        for (const id of entry.causeIds) currentAudio?.consumedIds?.add(id);
        entry.engine.sfx?.stopAll();
      }
      acceptIfVisible(entry);
      for (const [olderToken, older] of entries) {
        if (olderToken < token && older.state === 'activated') entries.delete(olderToken);
      }
      return true;
    }

    async function configureAudio(nextAudio) {
      if (destroyed) throw new Error('Sunbeam v2 adapter destroyed');
      const configuration = ++audioConfiguration;
      const replacement = await module.create({ device: renderer.device,
        format: renderer.format, audio: nextAudio });
      if (destroyed || configuration !== audioConfiguration) {
        await replacement.destroy();
        return false;
      }
      const previous = engine;
      engine = replacement;
      currentAudio = nextAudio;
      previous.sfx?.stopAll();
      const previousEntries = [...entries.values()].filter(entry => entry.engine === previous);
      const pending = Promise.all(previousEntries.map(entry => entry.completion))
        .then(() => previous.destroy());
      pending.catch(error => root.console?.error?.('Sunbeam v2 retired renderer failed', error));
      retired.add(pending);
      void pending.finally(() => retired.delete(pending)).catch(() => {});
      return true;
    }

    async function destroy() {
      if (destroyed) return;
      destroyed = true;
      audioConfiguration += 1;
      for (const entry of entries.values()) entry.engine.sfx?.stopAll();
      const results = await Promise.allSettled([engine.destroy(), ...retired]);
      entries.clear();
      const failed = results.find(result => result.status === 'rejected');
      if (failed) throw failed.reason;
    }

    return Object.freeze({ device: renderer.device, record,
      commitVisibleFrame, configureAudio,
      refreshAudioGates() { engine.sfx?.refreshGates(); },
      stopAudio() { engine.sfx?.stopAll(); }, destroy });
  }

  const api = Object.freeze({ create });
  root.DvaSunbeamProV2Adapter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
