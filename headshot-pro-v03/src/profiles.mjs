/** v3: 接触核→圧縮座→形態別の反応。数値はゲームEの演出値で、実弾の測定値ではない。 */
export const EVENT_TYPE = 'action-gunner-headshot';
export const WEAPONS = Object.freeze(['handgun', 'smg', 'assault', 'sniper', 'taser']);
export const VARIANTS = Object.freeze(WEAPONS.flatMap(w => [`hip:${w}`, `aim:${w}`]));
export const LIMITS = Object.freeze({
  radius: 150, maxActive: 16, maxSeen: 4096, maxPending: 64,
  arrivalTTLms: 420, futureToleranceMs: 8, wallLifetimeMs: 2000,
  audioOnsetLimitMs: 85, maxVoices: 8, maskSize: 128,
  maxCoordinate: 1e9, maxRate: 4,
});
export const OBSERVATION_BUDGET = Object.freeze({
  bloom: 0.13, nearLight: 0.30, maxAddedLuminance: 1.5,
  sourceThreshold: 0.52, maxBloomRadiusNativePx: 1.6,
  voiceGain: 0.20, masterGain: 0.72,
});
// 音源パラメータと一回限りの発音契約はv2と同値。形の違いを音程/色だけで代用しない。
const DATA = {
  handgun: {durationMs:300, aimDurationMs:335, length:.68, width:.38, spread:.11, decay:4.6, frequency:1680, soundMs:126, damping:28, weight:.54,
    reactionStart:.035, reactionEnd:.28, relaxStart:.54, relaxEnd:.94, pressureHold:.15, releaseHold:.37, label:'面圧の接触座', mechanism:'broad_seat'},
  smg:     {durationMs:230, aimDurationMs:270, length:.62, width:.30, spread:.16, decay:6.3, frequency:2180, soundMs:88, damping:43, weight:.36,
    reactionStart:.025, reactionEnd:.20, relaxStart:.31, relaxEnd:.79, pressureHold:.10, releaseHold:.20, label:'三葉の短い反応', mechanism:'three_lobe'},
  assault: {durationMs:360, aimDurationMs:415, length:.66, width:.35, spread:.13, decay:4.1, frequency:1450, soundMs:146, damping:25, weight:.67,
    reactionStart:.065, reactionEnd:.40, relaxStart:.64, relaxEnd:.98, pressureHold:.19, releaseHold:.46, label:'四肩の段階圧縮', mechanism:'four_buttress'},
  sniper:  {durationMs:470, aimDurationMs:540, length:.77, width:.32, spread:.09, decay:3.7, frequency:1130, soundMs:190, damping:20, weight:.77,
    reactionStart:.12, reactionEnd:.38, relaxStart:.61, relaxEnd:.98, pressureHold:.26, releaseHold:.54, label:'上下の折返し座', mechanism:'axial_foldback'},
  taser:   {durationMs:440, aimDurationMs:520, length:.66, width:.41, spread:.10, decay:3.8, frequency:1890, soundMs:171, damping:24, weight:.41,
    reactionStart:.015, reactionEnd:.15, relaxStart:.62, relaxEnd:.96, pressureHold:.48, releaseHold:.62, label:'二顎の局所保持', mechanism:'jaw_bridge'},
};
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export function smoothstep(a,b,x) { const t=clamp((x-a)/(b-a)); return t*t*(3-2*t); }
export function profileFor(variant) {
  if(!VARIANTS.includes(variant)) throw new TypeError(`未対応variant: ${String(variant)}`);
  const [mode,weapon]=variant.split(':');const aim=mode==='aim',d=DATA[weapon];
  return Object.freeze({...d,variant,weapon,weaponIndex:WEAPONS.indexOf(weapon),aim,
    durationMs:aim?d.aimDurationMs:d.durationMs,
    // AIMは中央の同時圧縮、HIPは広い非対称応答。入射方向/命中位置の推定ではない。
    width:d.width*(aim?.91:1.08),spread:d.spread*(aim?.42:1),skew:aim?0:.30,
    frequency:d.frequency*(aim?1.075:.97),
  });
}
/** 同じuから全てを導出。遅れは肩の反応であり、追加の命中/二発目ではない。 */
export function reactionPhase(profile,u,reducedMotion=false) {
  if(reducedMotion) return {spread:.64,pressure:.72,lag:0,settle:.34};
  const p=profile;
  const open=smoothstep(p.reactionStart,p.reactionEnd,u);
  const returnToSeat=smoothstep(p.relaxStart,p.relaxEnd,u);
  const spread=open*(1-.62*returnToSeat);
  const pressure=(1-.60*smoothstep(p.pressureHold,p.releaseHold+.12,u));
  // AIMは同時。HIPは同一接触内で圧縮面の受け渡しが一度だけ起こる。
  const lag=p.aim?0:(1-smoothstep(.20,.62,u))*.78;
  return {spread,pressure,lag,settle:returnToSeat};
}
/** LDM: 核は早い圧縮、taserだけ非周期の保持。形の回復より先に源とそのOBSが消える。 */
export function sampleProfile(profile,ageMs,reducedMotion=false) {
  const u=ageMs/profile.durationMs;
  const silent={u:clamp(Number.isFinite(u)?u:1),body:0,emission:0,release:0,width:profile.width,length:profile.length,
    pressure:0,lag:0,settle:0,phase:'absent'};
  if(!Number.isFinite(u)||u<=0||u>=1)return silent;
  const reaction=reactionPhase(profile,u,reducedMotion);
  const attack=smoothstep(0,Math.min(.055,14/profile.durationMs),u);
  // 後半にも主形を残し、単なる光条のフェードではなく形の着座→有限終了を見せる。
  const fadeStart=profile.weapon==='smg'?.42:profile.weapon==='taser'?.69:.58;
  const body=attack*(1-smoothstep(fadeStart,1,u));
  let emission;
  if(profile.weapon==='taser') {
    const hold=(1-.30*smoothstep(.14,.50,u));
    emission=2.05*attack*hold*(1-smoothstep(.47,.88,u));
  } else {
    const denseHold=profile.weapon==='sniper'?.16:profile.weapon==='assault'?.085:.035;
    const decay=Math.exp(-profile.decay*Math.max(0,u-denseHold));
    emission=2.8*attack*decay*(1-smoothstep(.61,.89,u));
  }
  const phase=u<.065?'contact':u<profile.reactionEnd?'compression':u<profile.relaxStart?'reaction':'settling';
  return {u,body,emission:emission*(reducedMotion?.78:1),release:reaction.spread,
    width:profile.width,length:profile.length,pressure:reaction.pressure,lag:reaction.lag,settle:reaction.settle,phase};
}
