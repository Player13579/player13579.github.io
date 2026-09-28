import { CONTRACT as C, clamp01, smoother, smootherDerivative, lerp, hash32 } from './contract.js';

/** Pure state sampler; no wall clock, randomness, images, audio nodes or GPU calls. */
export function sampleCharge(p) {
  if (!Number.isFinite(p)) throw new TypeError('phase must be finite');
  const transfer = C.transport.map(route => {
    const u = clamp01((p - route.begin) / (route.end - route.begin));
    const delivered = smoother(u);
    return {
      progress: u,
      delivered,
      remaining: 1 - delivered,
      flux: smootherDerivative(u) / (route.end - route.begin),
      appearance: smoother((p - route.begin) / 0.028),
      done: p >= route.end
    };
  });
  const charge = transfer.reduce((sum, s, i) => sum + C.transport[i].weight * s.delivered, 0);
  const flux = transfer.reduce((sum, s, i) => sum + C.transport[i].weight * s.flux, 0);
  const outside = 1 - charge;
  const visibility = p <= 0 || p >= 1 ? 0 : smoother(p / 0.025) * (1 - smoother((p - C.fadeStarts) / (1 - C.fadeStarts)));
  const receipt = clamp01(flux / 6.6);
  const settleIn = smoother((p - 0.52) / 0.16);
  const held = smoother((p - C.holdStarts) / 0.08);
  const compression = 1 + 0.095 * Math.sin(Math.PI * settleIn) * (1 - held);
  const latch = clamp01((charge - 0.12) / 0.88);
  return {
    p,
    charge,
    outside,
    flux,
    receipt,
    visibility,
    compression,
    latch,
    hold: p >= C.holdStarts && p < 1,
    transfer,
    emission: 0.55 + 1.75 * receipt + 0.36 * charge,
    phaseName: p < 0 ? 'pending' : p >= 1 ? 'ended' : p < 0.08 ? 'establish' : p < 0.52 ? 'deliver' : p < 0.70 ? 'fill' : p < 0.90 ? 'hold' : 'release'
  };
}

export function normalizedPhase(event, actorNowMs) {
  return (actorNowMs - event.startedAt) / event.duration;
}

function midpoint(a, b) { return a.map((v, i) => (v + b[i]) * 0.5); }
function distance2(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; return Math.hypot(dx, dy); }

/** Renderable analytic ellipsoids. Radius affects gameplay scope, NOT body height. */
export function sampleEffect(event, actor, options = {}) {
  const p = options.phase ?? normalizedPhase(event, actor.nowMs);
  const state = sampleCharge(p);
  const position = actor.position ?? [0, 0, 0];
  const lane = options.lane ?? 0;
  const laneDepth = (lane % 3) * 1.25;
  const volumes = [];
  const positionOf = v => v.map((value, i) => value + position[i]);
  if (state.visibility > 0) {
    const outerOpacity = state.visibility * smoother((state.outside - 0.015) / 0.985);
    if (outerOpacity > 1e-5) {
      C.scaffold.forEach((shell, i) => {
        const q = clamp01(state.outside / Math.max(0.001, shell.weight * 2.25));
        if (q < 1e-4) return;
        const amount = Math.sqrt(q);
        const center = shell.center.map((v, j) => v + shell.drift[j] * (1 - amount));
        center[2] += laneDepth;
        const scale = 0.76 + 0.24 * amount;
        volumes.push({
          kind: 0,
          center: positionOf(center),
          radii: [shell.radii[0] * scale, shell.radii[1] * (0.82 + 0.18 * amount), shell.radii[2] * (0.85 + 0.15 * amount)],
          rotation: i === 4 ? 0 : shell.center[0] < 0 ? -0.12 : shell.center[0] > 0 ? 0.12 : 0,
          opacity: outerOpacity * (0.28 + 0.72 * q),
          emission: 0.55 + 0.32 * state.receipt,
          charge: q,
          receipt: state.receipt,
          chargeGlobal: state.charge,
          outsideGlobal: state.outside,
          phaseTag: 0,
          owner: actor.playerId,
          eventKey: event.key,
          logicalLayer: 'L1-reservoir'
        });
      });
    }

    C.transport.forEach((route, i) => {
      const t = state.transfer[i];
      const active = Math.max(t.appearance, t.remaining * 0.92);
      if (active < 0.004) return;
      const front = route.start.map((value, j) => lerp(value, route.target[j], t.progress) + Math.sin(Math.PI * t.progress) * route.bend[j]);
      const center = midpoint(route.start, front);
      center[2] += laneDepth;
      const spanXY = distance2(route.start, front);
      const localScale = 0.80 + 0.20 * Math.sqrt(Math.max(0, t.remaining));
      const radii = [Math.max(5.2, spanXY * 0.54 + 4.4), route.thickness * localScale, route.depth * (0.76 + 0.24 * localScale)];
      const angle = Math.atan2(front[1] - route.start[1], front[0] - route.start[0]);
      volumes.push({
        kind: 1,
        center: positionOf(center),
        radii,
        rotation: angle,
        opacity: state.visibility * active,
        emission: 0.92 + 1.45 * state.receipt,
        charge: t.remaining,
        receipt: t.flux / Math.max(0.001, Math.max(...state.transfer.map(x => x.flux))),
        chargeGlobal: state.charge,
        outsideGlobal: state.outside,
        phaseTag: t.progress,
        owner: actor.playerId,
        eventKey: event.key,
        logicalLayer: 'L2-delivery'
      });
    });

    const coreFill = clamp01((state.charge - 0.08) / 0.92);
    if (coreFill > 1e-5) {
      const core = C.reserveCore;
      const center = core.center.slice();
      center[1] += 0.6 * (state.compression - 1);
      center[2] += laneDepth;
      volumes.push({
        kind: 3,
        center: positionOf(center),
        radii: [core.radii[0] * (0.86 + 0.14 * coreFill), core.radii[1] * (0.68 + 0.32 * coreFill) * state.compression, core.radii[2] * (0.78 + 0.22 * coreFill)],
        rotation: 0,
        opacity: state.visibility * smoother(coreFill / 0.14) * 0.82,
        emission: 0.72 + 1.10 * state.receipt + 0.24 * coreFill,
        charge: coreFill,
        receipt: state.receipt,
        chargeGlobal: state.charge,
        outsideGlobal: state.outside,
        phaseTag: state.hold ? 1 : 0,
        owner: actor.playerId,
        eventKey: event.key,
        logicalLayer: 'L3-core-column'
      });
    }

    C.reserve.forEach((chamber, i) => {
      const fill = clamp01((state.charge - chamber.threshold) / chamber.capacity);
      if (fill <= 1e-6) return;
      const rounded = smoother(fill);
      const center = chamber.center.slice();
      center[1] += (0.85 - i * 0.22) * (state.compression - 1);
      center[2] += laneDepth;
      volumes.push({
        kind: 2,
        center: positionOf(center),
        radii: [chamber.radii[0] * (0.74 + 0.26 * rounded), chamber.radii[1] * (0.64 + 0.36 * rounded) * state.compression, chamber.radii[2] * (0.78 + 0.22 * rounded)],
        rotation: 0,
        opacity: state.visibility * smoother(fill / 0.18),
        emission: state.emission * (0.82 + 0.18 * rounded),
        charge: fill,
        receipt: state.receipt,
        chargeGlobal: state.charge,
        outsideGlobal: state.outside,
        phaseTag: i / (C.reserve.length - 1),
        owner: actor.playerId,
        eventKey: event.key,
        logicalLayer: 'L4-reserve'
      });
    });
  }
  return { ...state, eventKey: event.key, playerId: actor.playerId, volumes };
}

export function audioEnvelope(p) {
  const state = sampleCharge(p);
  if (p <= 0 || p >= 1) return { onset: 0, flow: 0, reserve: 0, settle: 0, tail: 0, phase: p, charge: state.charge };
  return {
    onset: smoother(p / 0.010) * Math.exp(-p * 60),
    flow: state.visibility * (0.06 + 0.48 * state.receipt) * Math.pow(Math.max(0, state.outside), 0.52),
    reserve: state.visibility * Math.sqrt(state.charge) * (0.08 + 0.36 * state.latch),
    settle: state.visibility * smoother((p - 0.42) / 0.20) * (1 - smoother((p - 0.82) / 0.08)) * (0.10 + 0.16 * state.charge),
    tail: state.visibility * smoother((p - 0.72) / 0.16) * (1 - smoother((p - 0.96) / 0.04)) * 0.08,
    phase: p,
    charge: state.charge
  };
}
export function eventSeed(event) { return hash32(event.key ?? event.eventId ?? `${event.playerId}|${event.startedAt}`) || 1; }
