import { CONTRACT as C, clamp01, smoother, smootherDerivative, lerp, hash32 } from './contract.js';

/** Pure state sampler; no wall clock, randomness, images, audio nodes or GPU calls. */
export function sampleCharge(p) {
  if (!Number.isFinite(p)) throw new TypeError('phase must be finite');
  const transfer = C.transport.map(route => {
    const t = clamp01((p - route.begin) / (route.end - route.begin));
    const arrivalCoordinate = (t - 0.5) * 2;
    const delivered = smoother(arrivalCoordinate);
    return { progress: smoother(t), delivered, remaining: 1 - delivered,
      flux: smootherDerivative(arrivalCoordinate) * 2 / (route.end - route.begin),
      appearance: smoother((p - route.begin) / 0.027) };
  });
  const charge = transfer.reduce((sum, s, i) => sum + C.transport[i].weight * s.delivered, 0);
  const flux = transfer.reduce((sum, s, i) => sum + C.transport[i].weight * s.flux, 0);
  const visibility = p <= 0 || p >= 1 ? 0 : smoother(p / 0.027) * (1 - smoother((p - C.fadeStarts) / (1 - C.fadeStarts)));
  const receipt = clamp01(flux / 8.8);
  // One finite tightening movement; identically constant from holdStarts onward.
  const settleT = clamp01((p - 0.52) / (C.holdStarts - 0.52));
  const compression = p < 0.52 ? 1 : 1 + 0.105 * Math.sin(Math.PI * settleT) * (1 - settleT);
  return { p, charge, outside: 1 - charge, flux, receipt, visibility, compression,
    hold: p >= C.holdStarts && p < 1, transfer,
    emission: 0.72 + 1.65 * receipt + 0.18 * charge,
    phaseName: p < 0 ? 'pending' : p >= 1 ? 'ended' : p < 0.04 ? 'establish' : p < 0.52 ? 'receive' : p < 0.74 ? 'settle' : p < 0.89 ? 'hold' : 'release' };
}

export function normalizedPhase(event, actorNowMs) {
  return (actorNowMs - event.startedAt) / event.duration;
}

/** Renderable analytic ellipsoids. Radius affects the supply footprint, NOT body height. */
export function sampleEffect(event, actor, options = {}) {
  const p = options.phase ?? normalizedPhase(event, actor.nowMs);
  const state = sampleCharge(p);
  const position = actor.position ?? [0, 0, 0];
  const lane = options.lane ?? 0;
  // Independent gains share a body but do not share phases. A bounded 1.25px depth offset
  // prevents identical surface coincidences; never extend or reset an older event.
  const laneDepth = (lane % 3) * 1.25;
  const footprint = event.radius / C.referenceRadius;
  const widthScale = Math.sqrt(footprint);
  const volumes = [];
  const positionOf = v => v.map((value, i) => value + position[i]);
  if (state.visibility > 0) {
    C.transport.forEach((route, i) => {
      const t = state.transfer[i];
      if (t.appearance < 1e-6 || t.remaining < 0.002) return;
      const initial = [route.start[0] * footprint, 32 + (route.start[1] - 32) * footprint, route.start[2] * widthScale];
      const endpoint = route.endPoint;
      const center = initial.map((value, j) => lerp(value, endpoint[j], t.progress) + Math.sin(Math.PI * t.progress) * route.bend[j]);
      center[2] += laneDepth;
      const size = Math.cbrt(t.remaining);
      const angle = Math.atan2(endpoint[1] - initial[1], endpoint[0] - initial[0]);
      volumes.push({ kind: 0, center: positionOf(center), radii: route.radii.map(v => v * size * widthScale),
        rotation: angle, opacity: state.visibility * t.appearance,
        emission: 1.2 + 0.65 * t.progress, charge: t.remaining, receipt: state.receipt,
        owner: actor.playerId, eventKey: event.key, logicalLayer: 'L1' });
    });
    C.reserve.forEach((chamber, i) => {
      const fill = clamp01((state.charge - chamber.threshold) / chamber.capacity);
      if (fill <= 1e-6) return;
      const roundFill = smoother(fill);
      const center = chamber.center.slice();
      center[1] += 0.7 * (state.compression - 1) * (1 - i);
      center[2] += laneDepth;
      volumes.push({ kind: 1, center: positionOf(center),
        radii: [chamber.radii[0] * (0.72 + 0.28 * roundFill) / state.compression,
          chamber.radii[1] * (0.65 + 0.35 * roundFill) * state.compression,
          chamber.radii[2] * (0.8 + 0.2 * roundFill)],
        rotation: 0, opacity: state.visibility * smoother(fill / 0.26),
        emission: state.emission * (0.88 + 0.12 * roundFill), charge: fill, receipt: state.receipt,
        owner: actor.playerId, eventKey: event.key, logicalLayer: 'L2' });
    });
  }
  return { ...state, eventKey: event.key, playerId: actor.playerId, volumes };
}

export function audioEnvelope(p) {
  const state = sampleCharge(p);
  if (p <= 0 || p >= 1) return { onset: 0, flow: 0, reserve: 0, phase: p, charge: state.charge };
  return {
    onset: smoother(p / 0.012) * Math.exp(-p * 54),
    flow: state.visibility * (0.14 * (1 - state.charge) * smoother(p / 0.04) + 0.34 * state.receipt),
    reserve: state.visibility * Math.sqrt(state.charge) * (0.17 + 0.22 * state.receipt) * (1 - 0.32 * smoother((p - 0.6) / 0.22)),
    phase: p, charge: state.charge
  };
}
export function eventSeed(event) { return hash32(event.key ?? event.eventId ?? `${event.playerId}|${event.startedAt}`) || 1; }
