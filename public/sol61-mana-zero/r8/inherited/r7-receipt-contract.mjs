export const DESIGN={id:'sol61-mana-zero-r7',author:'GPT-6.1-Sol',parentVersion:'sol61-mana-zero-r6',zeroDesign:false,adoption:'unadopted',quality:'not_run',
 source:{repository:'player13579/B',branch:'Codex-honoo',commit:'37eb4bdfe59f0dc075f9b4333b7d6af76b784a88',baseBlob:'8a908495ae1f9b7175e00384ab88c50e5c78bd43',extensionBlob:'0eda016558e426ff4142d850d26200b40fafd834'},
 lifetimeMs:1700,previewCycleMs:2400,units:'recipient-local H64 design pixels, +X image right +Y down +Z toward camera',
 geometry:{sourceBounds:[-26,-19,22,17],depthBounds:[-9,9],samplesPerHalf:16,bodyHeight:64,crop:[62,15,136,225],atlas:[768,512],bodyHash:'cf3df51d88129ad51e175dd894ef2c269626a2d60fec912289789e099d8fcb8f',
  crossSection:'L4 plateau in Y/Z, wide asymmetric curved receiving field, lower palm-side optically open, not a shell or actor mask',
  maximumHalfWidth:13,depthHalfWidth:6,registration:'front16→-28px; result keeps full same geometry rather than a tiny residual dot'},
 phases:{formation:[0,.12],intake:[.12,.90],retention:[.90,1.37],extinction:[1.37,1.70]},
 optics:{coverageCoefficient:.027,pathRadiancePerDesignPixel:.16,mainRadianceGain:.48,incidentGain:.045,nearGain:.30,nearRadiusScreenPixels:7,whitePeak:[7.2,7.2,7.0],sparkleAngleDegrees:31,sparkleCoreHalfPixels:2.2,sparkleLongPixels:7,sparkleShortPixels:4},
 sources:[{position:[16,3,2],peak:.22,width:.115},{position:[0,-7,3],peak:.64,width:.14},{position:[-16,-10,2],peak:1.16,width:.18}],
 retainedSFX:'r6 own zero-family synthesis unchanged, 1700ms/48k/81600; intake→settled chord at.80 aligns broad registration completion; source inheritance recorded',
 acceptance:'H64 main-only without cores/OBS/stars shows broad intake then retained receiving volume and spatial body response; reject aura/cloth/band/held orb/container/cloud/small shoulder glow/late star-only. CPU support or radiance values are not quality proof'};

export const smooth=(a,b,x)=>{const q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q);};
export function state(t){return {live:Number.isFinite(t)&&t>=0&&t<1.7,life:smooth(0,.09,t)*(1-smooth(1.37,1.7,t)),front:16-44*smooth(.12,.90,t),retained:smooth(.46,.96,t)};}
export function normalizedReceipt(e){
 if(!e||e.kind!=='gain-mana'||e.confirmed!==true||e.failed===true||e.success===false||e.outcome==='failed'||e.outcome==='rejected')return null;
 if(!['id','sessionId','causeId','playerId','sourceKind'].every(k=>typeof e[k]==='string'&&e[k].trim().length>0))return null;
 if(['natural-tick','initial-seed','snapshot'].includes(e.sourceKind)||!Number.isFinite(e.actualDelta)||e.actualDelta<=0||!Number.isFinite(e.elapsedMs)||e.elapsedMs<0||e.elapsedMs>=1700)return null;
 if(e.outcome!==undefined&&!['success','committed'].includes(e.outcome))return null;
 return {...e,ownerId:e.playerId};
}
export class ReceiptGate{constructor(){this.seen=new Set();}accept(e){const q=normalizedReceipt(e);if(!q)return null;const key=JSON.stringify([q.sessionId,q.causeId,q.playerId]);if(this.seen.has(key))return null;this.seen.add(key);return q;}reset(){this.seen.clear();}}
