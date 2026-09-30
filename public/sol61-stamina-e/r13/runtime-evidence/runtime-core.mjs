import { resolveReceipt, visibleOwner } from '../artist.mjs';

export const FLAGS_ON = Object.freeze({ actor: true, source: true, coverage: true, incident: true,
  front: true, rear: true, points: true, near: true, cross: true, ghost: true });

export const FLAGS_MAIN_ONLY = Object.freeze({ ...FLAGS_ON, incident: false, points: false,
  near: false, cross: false, ghost: false });

export function fixtureLayout(width, height, dpr = 1) {
  if (![width, height, dpr].every(Number.isFinite) || width <= 0 || height <= 0 || dpr <= 0) throw new Error('invalid fixture viewport');
  return [
    { id: 'dark', side: 'dark', panel: [0, 0, Math.floor(width / 2), height], background: [0.012, 0.016, 0.024, 1],
      anchor: [width * 0.25, height * 0.5, 1], imageCenter: [width * 0.25, height * 0.5], dpr },
    { id: 'light', side: 'light', panel: [Math.floor(width / 2), 0, width - Math.floor(width / 2), height], background: [0.62, 0.65, 0.70, 1],
      anchor: [width * 0.75, height * 0.5, 1], imageCenter: [width * 0.75, height * 0.5], dpr },
  ];
}

export function makeReceiptEvent(fixtureId, cycle, at, durationMs = 1500) {
  const actorId = `r13-preview-${fixtureId}`;
  const eventId = `stamina-r13-preview:${fixtureId}:${cycle}`;
  const transactionId = `txn:${eventId}`;
  return {
    id: eventId, type: 'gain-stamina', effectKind: 'stamina', playerId: actorId,
    transactionId, at, durationMs,
    benefitOutcomeV1: { recipientId: actorId, semantic: 'stamina-gain', result: 'changed', actualDelta: 1,
      transactionId, outcomeId: `outcome:${eventId}`, sourceOwner: 'r13-gallery-preview' },
  };
}

export function acceptReceipt(event, actor, seen) {
  if (!visibleOwner(actor)) return null;
  return resolveReceipt(event, actor, seen);
}

export function eventAge(receipt, now) {
  if (!receipt || !Number.isFinite(now) || now < receipt.at) return 0;
  return now - receipt.at;
}

export function resetFixture(fixture, width, height) {
  const [x0, y0, width0, height0] = fixture.panel;
  return {
    ...fixture,
    anchor: [x0 + width0 / 2, y0 + height0 / 2, 1],
    imageCenter: [x0 + width0 / 2, y0 + height0 / 2],
    dpr: fixture.dpr,
    resetExtent: [width, height],
  };
}

export function makeUniformPair({ fixture, width, height, ageMs, durationMs, receiptLive, flags = FLAGS_ON }) {
  if (!fixture || !Number.isFinite(ageMs) || !Number.isFinite(durationMs) || durationMs < 900) throw new Error('invalid uniform inputs');
  const dpr = fixture.dpr;
  const viewport = [width, height, 64 * dpr, dpr];
  const anchor = [fixture.anchor[0], fixture.anchor[1], fixture.anchor[2], 0];
  const clock = [ageMs / 1000, durationMs / 1000, receiptLive ? 1 : 0, flags.source ? 1 : 0];
  const features = [flags.coverage ? 1 : 0, flags.incident ? 1 : 0, flags.front ? 1 : 0, flags.rear ? 1 : 0];
  const debug = [flags.actor ? 1 : 0, flags.points ? 1 : 0, 0, 0];
  const world = new Float32Array(20);
  world.set(viewport, 0); world.set(anchor, 4); world.set(clock, 8); world.set(features, 12); world.set(debug, 16);
  const controls = [flags.near ? 1 : 0, flags.cross ? 1 : 0, flags.ghost ? 1 : 0, flags.points ? 1 : 0];
  if (controls[3] !== debug[1]) throw new Error('world points and observer points must match');
  const optical = [fixture.imageCenter[0], fixture.imageCenter[1], 0, 0];
  const observe = new Float32Array(20);
  observe.set(viewport, 0); observe.set(anchor, 4); observe.set(clock, 8); observe.set(controls, 12); observe.set(optical, 16);
  return { world, observe };
}

export function assertOnMeasurementGate({ flags, receiptLive, actorVisible, firstSubmit, gpuReady }) {
  const off = Object.keys(FLAGS_ON).filter(key => flags?.[key] !== true);
  if (off.length || receiptLive !== true || actorVisible !== true || firstSubmit !== true || gpuReady !== true) {
    throw new Error(`ON measurement gate closed: off=${off.join(',') || 'none'} receipt=${receiptLive} actor=${actorVisible} firstSubmit=${firstSubmit} gpuReady=${gpuReady}`);
  }
  return true;
}
