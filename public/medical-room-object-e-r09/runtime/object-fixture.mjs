export const ROOM_ID = 'medical';
export const ROOM_GENERATION = 8;
export const ACTOR_ID = 'gallery-actor';
export const ACTOR_RADIUS_PX = 18;
export const ACTOR_SPEED_PX_PER_SECOND = 210;
export const USE_RADIUS_PX = 70;
export const OBJECT_COOLDOWN_MS = 3500;
export const BASIS_HASH = '9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e';
export const START_PX = Object.freeze([700, 1070]);
export const FLOOR_PX = Object.freeze([180, 180, 980, 1250]);

// Coordinates and masks are copied verbatim from the accepted object-E contract.
export const OBJECTS = Object.freeze([
  Object.freeze({
    id: 'medical-r7-stretcher-01', label: '診察ストレッチャー', anchorPx: Object.freeze([612, 725]),
    footprintPolygonPx: Object.freeze([[336,420],[578,420],[590,445],[590,591],[579,603],[579,899],[593,899],[593,947],[580,959],[580,1036],[569,1051],[552,1052],[549,1023],[369,1023],[367,1052],[348,1052],[344,1037],[344,959],[332,947],[332,899],[344,899],[344,603],[332,593],[332,514],[340,514],[340,445]].map(Object.freeze)),
    rimOutlinePx: Object.freeze([[354,418],[566,418],[578,430],[578,994],[572,1012],[560,1019],[359,1019],[345,1006],[344,432]].map(Object.freeze)),
    materialMask: Object.freeze({ rectPx: Object.freeze([354,564,565,995]), roundRadiusPx: 14, insetBoundaryFadePx: 12 }),
    actionKind: 'supported-cushion-compression-and-release', durationMs: 1800, peakDisplacementPx: 6,
    formula: 'q=6*(1-exp(-age/90))*exp(-max(0,age-220)/430)*(0.75+0.25*cos(2*pi*max(0,age-220)/520)); q=0 at age>=1800; warp original sample y by q*sin(pi*u)^2*sin(pi*v)^2 inside material mask',
  }),
  Object.freeze({
    id: 'medical-r7-supply-cart-01', label: '医療用品トレー付き引き出し', anchorPx: Object.freeze([550,282]),
    footprintPolygonPx: Object.freeze([[205,109],[480,109],[487,122],[487,257],[478,268],[478,321],[475,335],[462,336],[457,322],[239,322],[235,338],[222,338],[214,323],[211,266],[202,255]].map(Object.freeze)),
    rimOutlinePx: Object.freeze([[208,113],[479,113],[484,123],[484,250],[474,263],[474,317],[217,317],[214,265],[203,253],[203,123]].map(Object.freeze)),
    materialMask: Object.freeze({ rectPx: Object.freeze([254,156,312,229]), roundRadiusPx: 2, insetBoundaryFadePx: 4 }),
    actionKind: 'supported-fold-edge-lift-and-settle', durationMs: 1500, peakDisplacementPx: 6,
    formula: 'q=6*sin(pi*min(age/420,1))*exp(-max(0,age-420)/260) for age<420; thereafter q=3*exp(-(age-420)/260)*sin(2*pi*(age-420)/360); q=0 at age>=1500; use q*sin(pi*u)^2*v^2 warp original sample y; upper edge is supported, lower fold moves',
  }),
  Object.freeze({
    id: 'medical-r7-sink-01', label: '手洗いシンク', anchorPx: Object.freeze([725,270]),
    footprintPolygonPx: Object.freeze([[782,109],[978,109],[991,124],[991,286],[981,309],[968,349],[955,357],[789,356],[775,346],[775,126]].map(Object.freeze)),
    rimOutlinePx: Object.freeze([[788,112],[977,112],[990,128],[990,277],[982,296],[965,305],[799,305],[784,296],[779,278],[779,128]].map(Object.freeze)),
    materialMask: Object.freeze({ rectPx: Object.freeze([811,190,967,273]), roundRadiusPx: 22, insetBoundaryFadePx: 6 }),
    actionKind: 'finite-basin-contact-ripple', durationMs: 1800, peakDisplacementPx: 2.6,
    formula: 'age seconds a; radius=8+45*a; displacement=2.6*exp(-a/0.55)*sin(2*pi*(length(p-contact)-45*a)/18)*exp(-((length(p-contact)-radius)/12)^2); multiply basin edge fade; exactly zero at age>=1800',
  }),
]);

const finite = Number.isFinite;
const sq = (x) => x * x;
export const distancePx = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if (((yi > point[1]) !== (yj > point[1])) &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointSegmentDistance(point, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point[0] - (a[0] + t * dx), point[1] - (a[1] + t * dy));
}

export function collidesWithObject(point, object, radius = ACTOR_RADIUS_PX) {
  const polygon = object.footprintPolygonPx;
  if (pointInPolygon(point, polygon)) return true;
  return polygon.some((a, i) => pointSegmentDistance(point, a, polygon[(i + 1) % polygon.length]) < radius - 1e-6);
}

export function validActorPoint(point) {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(finite)) return false;
  const [x0, y0, x1, y1] = FLOOR_PX;
  if (point[0] < x0 + ACTOR_RADIUS_PX || point[0] > x1 - ACTOR_RADIUS_PX ||
    point[1] < y0 + ACTOR_RADIUS_PX || point[1] > y1 - ACTOR_RADIUS_PX) return false;
  return !OBJECTS.some((object) => collidesWithObject(point, object));
}

export function moveActor(actor, dx, dy) {
  if (!validActorPoint(actor) || ![dx, dy].every(finite)) throw new TypeError('finite current actor point and movement required');
  const next = [...actor];
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 3));
  for (let i = 0; i < steps; i++) {
    const sx = dx / steps, sy = dy / steps;
    if (validActorPoint([next[0] + sx, next[1]])) next[0] += sx;
    if (validActorPoint([next[0], next[1] + sy])) next[1] += sy;
  }
  return next;
}

export function imageToScreen([x, y], rect) {
  const [left, top, width, height] = rect;
  const scale = width / 1164;
  if (!finite(scale) || scale <= 0 || Math.abs(height / 1351 - scale) > 1e-5) throw new TypeError('uniform original-image fit required');
  return [left + x * scale, top + y * scale];
}

export function screenToImage([x, y], rect) {
  const [left, top, width, height] = rect;
  const scale = width / 1164;
  if (!finite(scale) || scale <= 0 || Math.abs(height / 1351 - scale) > 1e-5) throw new TypeError('uniform original-image fit required');
  return [(x - left) / scale, (y - top) / scale];
}

function makeCauseId() {
  if (typeof globalThis.crypto?.randomUUID !== 'function') throw new Error('secure randomUUID is required for fixture causes');
  return globalThis.crypto.randomUUID();
}

/**
 * Local gallery fixture. Its only benefit is a local successful-use counter.
 * A receipt exists only after a fresh physical approach entry and the count
 * commit; the cause ID remains deduplicated for the whole manual-reset session.
 */
export class MedicalObjectFixture {
  constructor({ sessionId = makeCauseId(), causeIdFactory = makeCauseId, commitUse } = {}) {
    if (typeof sessionId !== 'string' || !sessionId || typeof causeIdFactory !== 'function') throw new TypeError('fixture session identity required');
    this.sessionId = sessionId;
    this.causeIdFactory = causeIdFactory;
    this.commitUse = commitUse || ((receipt) => ({ success: true, delta: 1, localOnly: true }));
    this.actorPx = [...START_PX];
    this.pointerTargetPx = null;
    this.localUseCount = 0;
    this.lastNowMs = 0;
    this.lastUseAt = new Map();
    this.inside = new Set();
    this.causeIds = new Set();
    this.receipts = [];
    this.context = { visible: true, roomId: ROOM_ID, basisHash: BASIS_HASH, originalOnly: false, disposed: false };
    this.priming = true;
    this.eventLog = [];
  }

  setPointerTarget(point) {
    if (!Array.isArray(point) || point.length !== 2 || !point.every(finite)) return false;
    this.pointerTargetPx = [...point];
    return true;
  }

  clearPointerTarget() { this.pointerTargetPx = null; }

  setContext(next) {
    const wasUsable = this.usable();
    this.context = { ...this.context, ...next };
    const nowUsable = this.usable();
    if (!nowUsable) {
      this.cancelReceipts();
      this.inside.clear();
      this.priming = true;
      this.pointerTargetPx = null;
    } else if (!wasUsable) {
      this.priming = true;
      this.syncInsideWithoutEvents();
    }
  }

  usable() {
    const c = this.context;
    return c.visible === true && c.roomId === ROOM_ID && c.basisHash === BASIS_HASH &&
      c.originalOnly !== true && c.disposed !== true;
  }

  cancelReceipts() { this.receipts.length = 0; }

  reset({ sessionId = makeCauseId() } = {}) {
    if (typeof sessionId !== 'string' || !sessionId) throw new TypeError('new session ID required');
    this.cancelReceipts();
    this.sessionId = sessionId;
    this.localUseCount = 0;
    this.lastUseAt.clear();
    this.causeIds.clear();
    this.inside.clear();
    this.actorPx = [...START_PX];
    this.pointerTargetPx = null;
    this.lastNowMs = 0;
    this.priming = true;
    this.eventLog.push({ type: 'manual-reset', sessionId });
  }

  syncInsideWithoutEvents() {
    this.inside.clear();
    for (const object of OBJECTS) if (distancePx(this.actorPx, object.anchorPx) <= USE_RADIUS_PX) this.inside.add(object.id);
  }

  advance({ deltaMs, nowMs, keys = new Set(), basisHash = this.context.basisHash } = {}) {
    if (!finite(deltaMs) || deltaMs < 0 || !finite(nowMs) || nowMs < 0 || nowMs < this.lastNowMs) {
      this.cancelReceipts();
      throw new TypeError('visible current gallery monotonic milliseconds required');
    }
    if (basisHash !== BASIS_HASH) {
      this.setContext({ basisHash });
      this.lastNowMs = nowMs;
      return { actorPx: [...this.actorPx], receipts: [], granted: [] };
    }
    this.lastNowMs = nowMs;
    this.expire(nowMs);
    if (!this.usable()) return { actorPx: [...this.actorPx], receipts: [], granted: [] };
    if (this.priming) {
      this.syncInsideWithoutEvents();
      this.priming = false;
    }
    if (keys && typeof keys.has === 'function') {
      let dx = Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a'));
      let dy = Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w'));
      if (dx || dy) {
        const n = Math.hypot(dx, dy), step = ACTOR_SPEED_PX_PER_SECOND * deltaMs / 1000;
        this.actorPx = moveActor(this.actorPx, dx / n * step, dy / n * step);
        this.pointerTargetPx = null;
      }
    }
    if (this.pointerTargetPx) {
      const d = distancePx(this.actorPx, this.pointerTargetPx);
      const step = ACTOR_SPEED_PX_PER_SECOND * deltaMs / 1000;
      if (d > 0) {
        const travel = Math.min(d, step);
        this.actorPx = moveActor(this.actorPx,
          (this.pointerTargetPx[0] - this.actorPx[0]) * travel / d,
          (this.pointerTargetPx[1] - this.actorPx[1]) * travel / d);
        if (travel >= d) this.pointerTargetPx = null;
      }
    }
    const granted = this.updateApproachEdges(nowMs);
    return { actorPx: [...this.actorPx], receipts: [...this.receipts], granted };
  }

  updateApproachEdges(nowMs) {
    const granted = [];
    for (const object of OBJECTS) {
      const isInside = distancePx(this.actorPx, object.anchorPx) <= USE_RADIUS_PX;
      const wasInside = this.inside.has(object.id);
      if (isInside && !wasInside) {
        this.inside.add(object.id);
        const last = this.lastUseAt.get(object.id) ?? -Infinity;
        if (nowMs - last >= OBJECT_COOLDOWN_MS) {
          const receipt = this.commitFreshUse(object, nowMs);
          if (receipt) { granted.push(receipt); this.receipts.push(receipt); }
        }
      } else if (!isInside && wasInside) this.inside.delete(object.id);
    }
    return granted;
  }

  commitFreshUse(object, acceptedAtMs) {
    const causeId = this.causeIdFactory();
    if (typeof causeId !== 'string' || !causeId || this.causeIds.has(causeId)) return null;
    const anchorDistancePx = distancePx(this.actorPx, object.anchorPx);
    if (!this.usable() || anchorDistancePx > USE_RADIUS_PX || !validActorPoint(this.actorPx)) return null;
    const operation = { roomId: ROOM_ID, basisHash: BASIS_HASH, objectId: object.id,
      actorId: ACTOR_ID, sessionId: this.sessionId, causeId, acceptedAtMs, anchorDistancePx,
      actorPositionPx: Object.freeze([...this.actorPx]) };
    this.localUseCount += 1;
    this.eventLog.push({ type: 'count-committed', causeId, count: this.localUseCount });
    const result = this.commitUse(Object.freeze({ ...operation }));
    if (!result || result.success !== true || !finite(result.delta) || result.delta < 0 || result.localOnly !== true) {
      this.localUseCount -= 1;
      this.eventLog.push({ type: 'count-rolled-back', causeId, count: this.localUseCount });
      return null;
    }
    const receipt = Object.freeze({
      ...operation, generation: ROOM_GENERATION, success: true, benefitKind: 'preview-successful-use-count',
      benefitDelta: result.delta, benefitScope: 'local fixture counter only', localOnly: true,
      lifetimeMs: 1800, actionDurationMs: object.durationMs, actionKind: object.actionKind,
    });
    if (!this.validateReceipt(receipt, { nowMs: acceptedAtMs, causeIds: this.causeIds })) {
      this.localUseCount -= 1;
      this.eventLog.push({ type: 'count-rolled-back-invalid-receipt', causeId, count: this.localUseCount });
      return null;
    }
    this.causeIds.add(causeId);
    this.lastUseAt.set(object.id, acceptedAtMs);
    this.eventLog.push({ type: 'receipt-emitted', causeId, objectId: object.id });
    return receipt;
  }

  validateReceipt(receipt, { nowMs = this.lastNowMs, causeIds = this.causeIds } = {}) {
    const object = OBJECTS.find((item) => item.id === receipt?.objectId);
    if (!object || receipt.roomId !== ROOM_ID || receipt.basisHash !== BASIS_HASH ||
      receipt.generation !== ROOM_GENERATION || receipt.actorId !== ACTOR_ID ||
      receipt.sessionId !== this.sessionId || receipt.success !== true || receipt.localOnly !== true ||
      receipt.benefitKind !== 'preview-successful-use-count' || receipt.benefitScope !== 'local fixture counter only' ||
      typeof receipt.causeId !== 'string' || !receipt.causeId || causeIds.has(receipt.causeId) ||
      !finite(receipt.acceptedAtMs) || receipt.acceptedAtMs < 0 || !finite(receipt.benefitDelta) || receipt.benefitDelta < 0 ||
      receipt.lifetimeMs !== 1800 || receipt.actionDurationMs !== object.durationMs || receipt.actionKind !== object.actionKind ||
      !finite(receipt.anchorDistancePx) || receipt.anchorDistancePx < 0 || receipt.anchorDistancePx > USE_RADIUS_PX ||
      !Array.isArray(receipt.actorPositionPx) || receipt.actorPositionPx.length !== 2 ||
      !receipt.actorPositionPx.every(finite) ||
      !finite(nowMs) || nowMs < receipt.acceptedAtMs || nowMs - receipt.acceptedAtMs >= receipt.lifetimeMs) return false;
    if (Math.abs(distancePx(receipt.actorPositionPx, object.anchorPx) - receipt.anchorDistancePx) > 0.02 ||
      !validActorPoint(receipt.actorPositionPx)) return false;
    return true;
  }

  expire(nowMs) {
    this.receipts = this.receipts.filter((receipt) => nowMs - receipt.acceptedAtMs < receipt.lifetimeMs);
  }

  visibleReceipts(nowMs = this.lastNowMs) {
    if (!this.usable() || !finite(nowMs) || nowMs < 0) return [];
    this.expire(nowMs);
    const seen = new Set();
    return this.receipts.filter((receipt) => {
      if (!this.validateReceipt(receipt, { nowMs, causeIds: seen })) return false;
      seen.add(receipt.causeId);
      return true;
    });
  }
}
