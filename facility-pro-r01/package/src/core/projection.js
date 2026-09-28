/** map-unit原点→局所tile。ゲームの距離判定や効果範囲には利用しない。 */
export function projectReceiptTile(receipt,{originX=0,originY=0,pixelsPerMapUnit=1}={}){
 if(!Number.isSafeInteger(receipt?.x)||!Number.isSafeInteger(receipt?.y))throw new TypeError('canonical integer origin required');
 if(![originX,originY,pixelsPerMapUnit].every(Number.isFinite)||pixelsPerMapUnit<=0)throw new RangeError('camera scale');
 const centerX=(receipt.x-originX)*pixelsPerMapUnit,centerY=(receipt.y-originY)*pixelsPerMapUnit;
 const width=110*pixelsPerMapUnit,height=76*pixelsPerMapUnit;
 return Object.freeze({centerX,centerY,left:centerX-width/2,top:centerY-height/2,width,height,originMap:Object.freeze([receipt.x,receipt.y]),semantic:'render-footprint-not-gameplay-range'});
}
