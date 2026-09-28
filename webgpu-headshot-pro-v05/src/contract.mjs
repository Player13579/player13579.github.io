/** v1–v4から参照するのはここに列挙する入場・寿命管理の技術契約だけ。 */
export const EVENT_TYPE='action-gunner-headshot';
export const WEAPONS=Object.freeze(['handgun','smg','assault','sniper','taser']);
export const VARIANTS=Object.freeze(WEAPONS.flatMap(w=>[`hip:${w}`,`aim:${w}`]));
export const LIMITS=Object.freeze({radius:150,maxActive:16,maxSeen:4096,maxPending:64,
  arrivalTTLms:420,futureToleranceMs:8,wallLifetimeMs:2000,audioOnsetLimitMs:85,
  maxVoices:8,maskSize:128,maxCoordinate:1e9,maxRate:4});
// VARIANTSはpayload検証専用。renderer、形態、時間包絡、音色には渡さない。
export const LAYERS=Object.freeze({body:1,source:2,receiver:4,bloom:8,all:15});
