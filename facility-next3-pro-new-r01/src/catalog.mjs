/** メタデータは識別・監査用。利益付与、クールダウン開始、使用判定には使わない。 */
export const VERSION = '1.0.0';
export const LIFETIME_MS = 2200;
const definitions = [
  { objectId: 'v302-power-recharge-3', type: 'recharge', area: 'power', origin: {x:290,y:1907}, serverStaminaDelta:200, serverCooldownMs:15000, design:'axial-lamella', index:0 },
  { objectId: 'v302-atrium-hydration-2', type: 'mineralWaterBar', area: 'atrium', origin: {x:2838,y:1314}, serverStaminaDelta:100, serverCooldownMs:15000, design:'meniscus-fold', index:1 },
  { objectId: 'v302-engineering-coolingUnit-3', type: 'coolingUnit', area: 'engineering', origin: {x:3632,y:1631}, serverStaminaDelta:120, serverCooldownMs:36000, design:'transverse-vanes', index:2 }
];
export const FACILITIES = Object.freeze(definitions.map(d => Object.freeze({...d, origin:Object.freeze(d.origin)})));
export function facilityById(id) { return FACILITIES.find(d => d.objectId === id) ?? null; }
