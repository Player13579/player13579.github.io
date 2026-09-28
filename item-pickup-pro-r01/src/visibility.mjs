import { phase } from './timeline.mjs';
const evidenceObjects = new WeakSet();

/** 同じbyte列をGPUへ提出し、CPUの可視witnessにも使う。別々のmaskを推測しない。 */
export function uploadVisibilityMask(device, { width, height, values, revision = 0 }) {
  if (!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||!(values instanceof Uint8Array)||values.length!==width*height) throw new TypeError('visibility mask size/data');
  const copy=new Uint8Array(values);
  const texture=device.createTexture({label:'authoritative visibility mask',size:[width,height],format:'r8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});
  device.queue.writeTexture({texture},copy,{bytesPerRow:width,rowsPerImage:height},[width,height]);
  const view=texture.createView();
  const evidence=Object.freeze({view,revision,width,height,sample(pixelX,pixelY,viewportWidth,viewportHeight){
    if(pixelX<0||pixelY<0||pixelX>=viewportWidth||pixelY>=viewportHeight)return false;
    const x=Math.floor(pixelX*width/viewportWidth),y=Math.floor(pixelY*height/viewportHeight);
    return copy[y*width+x]>=128;
  }});
  evidenceObjects.add(evidence);
  return {view,evidence,dispose(){texture.destroy();evidenceObjects.delete(evidence);}};
}
export function isBoundVisibilityEvidence(evidence, view) { return Boolean(evidence&&evidenceObjects.has(evidence)&&evidence.view===view); }

/**
 * H64の放射源/膜が少なくとも一つの実sample位置を覆うという保守的なwitness。
 * GPU readbackや完了promiseを待たない。確認できなければ音だけ永久skipする。
 */
export function visibleFieldWitness(draw, viewportWidth, viewportHeight, sampleMask) {
  const state=phase(draw.ageMs,draw.reducedMotion);
  if(state.body<=0.002)return null;
  const [ax,ay]=draw.axisX,[bx,by]=draw.axisY;const det=ax*by-ay*bx;
  if(!Number.isFinite(det)||Math.abs(det)<1e-9)return null;
  const aa=Math.max(.002,.70*Math.max((Math.abs(by)+Math.abs(bx))/Math.abs(det),(Math.abs(ay)+Math.abs(ax))/Math.abs(det)));
  const h=.86-.045*state.closure;
  const shape=(x,y)=>{const v=y/h,k=Math.max(0,1-v*v),outer=.565*k**.63+.045*k,bend=.060*v*k*(1-.72*state.closure),gap=(.130-.077*state.closure)*k+.018;
    return {outer,bend,gap,distance:Math.min(outer-Math.abs(x-bend),Math.abs(x-bend)-gap,h-Math.abs(y))};};
  for(const y of [-.45,-.20,.15,.45]) {
    const s=shape(0,y);
    for(const sign of [-1,1]) {
      const x=s.bend+sign*(s.gap+(s.outer-s.gap)*.5);
      const px=Math.floor(draw.origin[0]+ax*x+bx*y)+.5,py=Math.floor(draw.origin[1]+ay*x+by*y)+.5;
      if(px<draw.clip[0]||py<draw.clip[1]||px>=draw.clip[2]||py>=draw.clip[3]||px<0||py<0||px>=viewportWidth||py>=viewportHeight)continue;
      const dx=px-draw.origin[0],dy=py-draw.origin[1];
      const qx=(by*dx-bx*dy)/det,qy=(-ay*dx+ax*dy)/det;
      if(qx*qx+qy*qy>=.94*.94||shape(qx,qy).distance<=aa*.5)continue;
      if(sampleMask(px,py,viewportWidth,viewportHeight)===true)return {pixel:[px,py],local:[qx,qy]};
    }
  }
  return null;
}
