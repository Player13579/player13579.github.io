// 新規造形。過去の転移 E ソース・画素を創作入力にしない。
export const TELEPORT_R1 = Object.freeze({
  id: 'sol61-action-teleport-zero-r1', author: 'GPT-6.1-Sol',
  type: 'action-teleport', durationEms: 760, referenceBodyH: 64,
  targetFormat: 'rgba16float', colorSpace: 'linear-srgb', alpha: 'premultiplied',
  variants: Object.freeze(['departure', 'arrival']),
  palette: Object.freeze({ base: [0.022, 0.075, 0.17], secondary: [0.08, 0.56, 0.95],
    accent: [0.55, 0.95, 1.0], neutral: [0.86, 0.96, 1.0] }),
});
export const saturate = x => Math.max(0, Math.min(1, x));
export const smooth = (a,b,x) => { const t=saturate((x-a)/(b-a)); return t*t*(3-2*t); };
export const pulse = (a,b,c,d,t) => smooth(a,b,t)*(1-smooth(c,d,t));

// 単一イベントの E 時計。wall time を受け取らない。未来/終了は厳密に無信号。
export function sampleArtist(ageEms, variant='departure', reducedMotion=false) {
  if (!Number.isFinite(ageEms) || !TELEPORT_R1.variants.includes(variant)) throw new TypeError('artist-input');
  const t=ageEms/760, active=ageEms>=0 && ageEms<760;
  const motion=smooth(.08,.46,t), arrival=variant==='arrival';
  const open=arrival ? motion : 1-motion;
  const gateAlpha=active ? .72*pulse(0,.07,.63,1,t) : 0;
  const core=active ? 5.6*pulse(.05,.16,.39,.66,t) : 0;
  const seam=active ? 8.4*pulse(.30,.40,.44,.60,t) : 0;
  const receiver=arrival && active ? 1.65*pulse(.14,.25,.44,.71,t) : 0;
  return Object.freeze({ ageEms, t, active, variant, reducedMotion,
    halfOpeningH: reducedMotion ? (arrival ? .29 : .035) : .035+.32*open,
    skewH: reducedMotion ? .075 : .075+.025*(1-open),
    gateAlpha, core, seam, receiver,
    footEnergy: active ? 2.1*pulse(.11,.21,.48,.79,t) : 0,
    bloomGain: active ? .16 : 0, ghostGain: active ? .027 : 0,
    fringePx: reducedMotion ? 0 : .55*pulse(.22,.31,.47,.65,t),
    sourceYH: -.48, heightH: 1.12, spineWidthH: .055,
  });
}

// 固定 field の内側だけへの入射量。身体 UV をこの関数へ入力しない。
export function receiverIrradiance(localXH, localYH, state) {
  if (!state.active || state.variant!=='arrival') return [0,0,0];
  const m=(1-smooth(.28,.52,Math.abs(localXH)))*
    smooth(-1.13,-.98,localYH)*(1-smooth(.07,.18,localYH));
  const asym=.55+.45*saturate(.5-localXH);
  return TELEPORT_R1.palette.secondary.map(v=>v*state.receiver*m*asym);
}

// 実在する近傍床のdiffuse受光専用。mapRGBはlinear diffuseとしてhostが確定済みの時だけ使用。
export function surfaceIrradiance(localXH, localYH, state) {
  if (!state.active) return [0,0,0];
  const m=(1-smooth(.20,.68,Math.abs(localXH)))*(1-smooth(.10,.29,Math.abs(localYH-.10)));
  return TELEPORT_R1.palette.secondary.map(v=>v*state.footEnergy*.20*m);
}

export function normalizedVariant(wire) {
  if (wire?.type !== 'action-teleport') return null;
  if (wire.variant === 'arrival') return 'arrival';
  return wire.variant === '' || wire.variant == null ? 'departure' : null;
}
// ownerId は時計/visibility専用。rawPlayerId の術者 attribution を変更しない。
export function receiptSpec(wire, { roomSession, ownerClockEms, viewerId }) {
  const variant=normalizedVariant(wire);
  if (!variant || typeof wire.id!=='string' || !wire.id.trim() || !roomSession || !Number.isFinite(wire.at) || !Number.isFinite(ownerClockEms) ||
      !Number.isFinite(wire.x) || !Number.isFinite(wire.y)) return null;
  const ownerId=String(variant==='arrival' ? wire.playerId||'' : wire.targetId||'');
  if (!ownerId || !String(wire.playerId||'') || wire.viewerId && wire.viewerId!==viewerId) return null;
  return Object.freeze({ id:String(wire.id), roomSession:String(roomSession), variant,
    rawPlayerId:String(wire.playerId||''), ownerId,
    anchor:Object.freeze({x:wire.x,y:wire.y}), clockStartEms:ownerClockEms,
    durationEms:760, referenceBodyH:64, wireAt:wire.at,
    wireDurationMs:wire.durationMs, wireRadius:wire.radius,
    // targetX/Y を描画へ伝播しない。対になる端点は推測しない。
  });
}
export function visibilityCurrent(actor, {phase, roomSession, receipt, viewerId, caster=null, sensoryBlocked=false, hidden=false}) {
  const casterAllowed=receipt.variant==='arrival' || caster?.id===receipt.rawPlayerId &&
    (!caster.invisible || caster.id===viewerId);
  return Boolean(casterAllowed && phase==='playing' && roomSession===receipt.roomSession && !sensoryBlocked && !hidden &&
    actor?.id===receipt.ownerId && actor.alive===true && !actor.ejected && !actor.inVent &&
    (!actor.invisible || actor.id===viewerId) && Number.isFinite(actor.x) && Number.isFinite(actor.y));
}
export function receiptState(receipt, currentClockEms, options={}) {
  if (!Number.isFinite(currentClockEms) || currentClockEms<receipt.clockStartEms) return null;
  return sampleArtist(currentClockEms-receipt.clockStartEms, receipt.variant, Boolean(options.reducedMotion));
}

// 短い wire 保持とは独立。roomSession 内 tombstone は終了/取消後も消さない。
export class ReceiptLedger {
  constructor(roomSession) { this.roomSession=String(roomSession); this.seen=new Set(); this.live=new Map(); }
  admit(wire, context) {
    if (context.roomSession!==this.roomSession || !wire?.id || this.seen.has(String(wire.id))) return null;
    this.seen.add(String(wire.id)); // 無効初回/履歴も復活させない。
    if (context.historical || context.suppressed) return null;
    const receipt=receiptSpec(wire,context);
    if (receipt) this.live.set(receipt.id,receipt);
    return receipt;
  }
  cancel(id) { this.live.delete(String(id)); }
  expire(id, ageEms) { if (!Number.isFinite(ageEms) || ageEms>=760) this.cancel(id); }
  cancelAll() { this.live.clear(); }
}

// 音も E 時間の位相。rate=0 は無声/停止、>12 は無声としVFX時計は真のrateを維持。
// 0<rate<=12 はPCM再標本化/playbackRate。同一causeの再発音禁止。
export function audioPlan(ageEms, rate, {muted=false, verify=false}={}) {
  if (!Number.isFinite(rate) || rate<0 || !Number.isFinite(ageEms) || ageEms<0 || ageEms>=760 ||
      muted || verify || rate===0 || rate>12) return Object.freeze({audible:false, reason:'suppressed-or-unsupported-rate'});
  return Object.freeze({audible:true, canonicalOffsetSeconds:ageEms/1000, playbackRate:rate,
    remainingWallSeconds:(760-ageEms)/1000/rate});
}
