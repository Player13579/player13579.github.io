/** r0.3独立造形。旧版のGEOMETRY/PHASE/shaderを移植しない。値はworld unitsの設計仮定。 */
export const SHAPE=Object.freeze({
  source:[[-51,6],[-53,-3],[-37,-15],[-19,-19],[0,-13],[19,-19],[37,-15],[53,-3],[51,6],[0,10]],
  receiver:[[-47,-109],[47,-109],[38,-76],[23,-61],[0,-53],[-23,-61],[-38,-76]],
  transport:[[-18,-10],[-13,-63],[13,-63],[18,-10]],
  receiverFloor:-55, receiverCeiling:-105, sourceSurface:-4,
  conduitBottom:-10,conduitTop:-63,edgeWidth:2.2,bevelWidth:4.8,
});
export const TIME=Object.freeze({emitStart:.055,emitEnd:.625,transitDelay:.18,settleStart:.83,settleEnd:.96});
export const PALETTE=Object.freeze({
  source:[.012,.10,.52],sourceLit:[.08,.46,1.02],
  transport:[.012,.31,.44],transportLit:[.06,.73,.98],
  receiver:[.073,.025,.18],rim:[.29,.11,.56],stored:[.34,.10,.67],fresh:[.19,.66,1.04],
  dark:[.006,.009,.016],light:[.74,.78,.83]
});
