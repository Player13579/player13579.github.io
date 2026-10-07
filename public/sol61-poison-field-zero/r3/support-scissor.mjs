// Only clips fragments that the unchanged R2 shaders cannot contribute to.
// Uniform values are the actual Float32Array uploaded to the GPU, not doubles.
export function supportScissors(u, width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) throw new RangeError('backing size');
  const full = {x:0,y:0,width,height};
  const empty = {x:0,y:0,width:1,height:1}; // shaders return transparent; clears remain full-target
  if (!(u instanceof Float32Array) || u.length !== 32) throw new TypeError('128-byte packed R2 uniform');
  if (u[7] < .5) return {world:empty,observer:empty,reason:'inactive-transparent'};
  const cx=u[2],cy=u[3],r=u[4];
  // Leave unusual finite Float32/extreme/off-contract states completely unoptimized.
  if (u[0]!==width || u[1]!==height || ![cx,cy,r,u[12],u[13]].every(Number.isFinite) || r<=0 ||
      Math.max(Math.abs(cx),Math.abs(cy),r,width,height)>1048576)
    return {world:full,observer:full,reason:'conservative-full-fallback'};
  // Covers threshold rounding, Float32 subtraction/division, pixel-center bounds.
  // Positive padding also preserves support at exact equality in the WGSL gate.
  const guard=2+8*Math.pow(2,-23)*(Math.abs(cx)+Math.abs(cy)+r+width+height);
  const box=[cx-1.04*r-guard,cy-r-guard,cx+1.04*r+guard,cy+.60*r+guard];
  const clip = b => {
    const left=Math.max(0,Math.floor(b[0])),top=Math.max(0,Math.floor(b[1]));
    const right=Math.min(width,Math.ceil(b[2])),bottom=Math.min(height,Math.ceil(b[3]));
    return right<=left||bottom<=top ? empty : {x:left,y:top,width:right-left,height:bottom-top};
  };
  const world=clip(box);
  // Nine offsets are {-1,0,1} times max(1.2,r*.055) backing pixels.
  // Extra two pixels cover bilinear texel support and coordinate rounding.
  const halo=u[12]>.5 ? Math.max(1.2,r*.055)+2+guard : 0;
  const observer=clip([box[0]-halo,box[1]-halo,box[2]+halo,box[3]+halo]);
  return {world,observer,reason:'unchanged-R2-finite-support',guard,halo};
}
