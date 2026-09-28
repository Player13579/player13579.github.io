/** 新規の連続膜の形態。個別飛散物でなく、一つの境界場の滑らかな起伏。 */
export const FORM=Object.freeze({baseRadius:.39,aspectY:.86,lobes:Object.freeze([
  [8,.18,10],[62,.115,12],[130,.25,9],[197,.14,12],[250,.205,10],[307,.11,14]
].map(([deg,height,power])=>Object.freeze([Math.cos(deg*Math.PI/180),Math.sin(deg*Math.PI/180),height,power])))});
// 各vec4のXYZW: 方向2成分、境界の隆起幅、角方向の広がり指数。GPUも同一bufferを読む。
export function packForm(){return new Float32Array([FORM.baseRadius,FORM.aspectY,FORM.lobes.length,0,...FORM.lobes.flat()]);}
/** 境界のCPU数値参照。材質・OBS・GPU画素・目視品質の代用ではない。 */
export function boundaryAt(x,y,envelope){
  const growth=.25+.75*envelope.spread;
  const qx=x/growth,qy=y/(FORM.aspectY*growth);
  const radius=Math.hypot(qx,qy),dx=qx/Math.max(radius,.00001),dy=qy/Math.max(radius,.00001);
  let rim=FORM.baseRadius;
  for(const [lx,ly,height,power] of FORM.lobes)rim+=height*Math.pow(Math.max(0,dx*lx+dy*ly),power);
  return {distance:(radius-rim)*growth,radius,normalized:radius/Math.max(.01,rim),rim,growth};
}
export function formCoverage(size,envelope){
  if(![32,64,128].includes(size))throw new RangeError('reference size');
  const mask=new Uint8Array(size*size);
  if(envelope.body>0)for(let y=0;y<size;y++)for(let x=0;x<size;x++)mask[y*size+x]=Number(boundaryAt(2*(x+.5)/size-1,1-2*(y+.5)/size,envelope).distance<0);
  return mask;
}
