/**
 * CPU倍精度でcamera-relativeへ移してからf32へ送る。
 * 大きなworld座標でもevent時位置の局所差が丸めで消えない。
 * ホストの+y下が明示された場合のみyAxis='down'。元イベントは変更しない。
 */
export function projectEvent(event, camera, width, height) {
  for(const value of [event.world.x,event.world.y,event.radius,camera.x,camera.y,camera.pixelsPerWorldUnit,width,height]) {
    if(!Number.isFinite(value))throw new TypeError('投影入力は有限値が必要です');
  }
  const yAxis=camera.yAxis??'up';
  if(!['up','down'].includes(yAxis))throw new RangeError('camera.yAxis');
  if(event.radius<=0||camera.pixelsPerWorldUnit<=0||width<1||height<1)throw new RangeError('投影寸法');
  const dx=event.world.x-camera.x;
  const dy=(event.world.y-camera.y)*(yAxis==='down'?-1:1);
  const radiusPx=event.radius*camera.pixelsPerWorldUnit;
  const x=width/2+dx*camera.pixelsPerWorldUnit;
  const y=height/2-dy*camera.pixelsPerWorldUnit;
  if (![dx,dy,x,y,radiusPx].every(Number.isFinite)) throw new RangeError('投影結果が有限範囲を超えています');
  return {dx,dy,x,y,radiusPx,visible:!(x+radiusPx<0||x-radiusPx>width||y+radiusPx<0||y-radiusPx>height)};
}
