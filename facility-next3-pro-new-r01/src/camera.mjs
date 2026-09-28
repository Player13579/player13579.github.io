/**
 * 既存2D game-world→clipを保持して、Eの局所elevation軸を接続する。
 * z=0の全アンカーは入力matrixと厳密に同じ射影。独立カメラやscreen固定座標を作らない。
 * 3Dホストはこの補助を使わず、既存の完全なworldToClipを渡す。
 */
export function liftPlanarWorldToClip(matrix,{elevationToWorldX=0,elevationToWorldY=-1}={}) {
  if(!matrix || matrix.length!==16 || !Array.from(matrix).every(Number.isFinite) || ![elevationToWorldX,elevationToWorldY].every(Number.isFinite)) throw new TypeError('planar matrix / elevation mapping');
  const result=new Float32Array(matrix);
  for(let row=0;row<4;row++)result[8+row]=matrix[row]*elevationToWorldX+matrix[4+row]*elevationToWorldY;
  return result;
}
