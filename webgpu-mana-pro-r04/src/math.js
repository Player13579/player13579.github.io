// Independent r0.4 numeric/geometry utilities. Coordinates in game px, +y downward.
export const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
export const mix = (a, b, t) => a + (b - a) * t;
export function ease(a, b, x) { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); }
export const vecMix = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
export const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export function signedArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
export function convexPolygon(p) {
  if (!Array.isArray(p) || p.length < 3 || p.length > 32 || !p.every(q => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite))) return false;
  if (Math.abs(signedArea(p)) < 1e-5 || p.some((a,i) => p.some((b,j) => i !== j && Math.hypot(a[0]-b[0],a[1]-b[1]) < 1e-6))) return false;
  let sign = 0;
  for (let i = 0; i < p.length; i++) { const c = cross(p[i], p[(i + 1) % p.length], p[(i + 2) % p.length]); if (Math.abs(c) < 1e-6) continue; if (sign && Math.sign(c) !== sign) return false; sign = Math.sign(c); }
  return true;
}
export function bounds(p) { return {left:Math.min(...p.map(q => q[0])), right:Math.max(...p.map(q => q[0])), top:Math.min(...p.map(q => q[1])), bottom:Math.max(...p.map(q => q[1]))}; }
// Polygon clipped to nx*x + ny*y >= level. Used for physically shared intake/fill boundary.
export function halfPlane(p, nx, ny, level) {
  if (!p.length) return [];
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const da = nx * a[0] + ny * a[1] - level, db = nx * b[0] + ny * b[1] - level;
    if (da >= -1e-7) out.push([...a]);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) out.push(vecMix(a, b, da / (da - db)));
  }
  return out;
}
export function clipConvex(subject, mask) {
  let out = subject; const sign = Math.sign(signedArea(mask));
  for (let i = 0; i < mask.length; i++) { const a = mask[i], b = mask[(i + 1) % mask.length], nx = -(b[1] - a[1]) * sign, ny = (b[0] - a[0]) * sign; out = halfPlane(out, nx, ny, nx * a[0] + ny * a[1]); if (!out.length) break; }
  return out;
}
export function horizontalEdges(p, y) {
  const xs = [];
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(mix(a[0], b[0], (y - a[1]) / (b[1] - a[1]))); }
  if (xs.length < 2) throw new RangeError('Receiving polygon has no horizontal interval at inlet height');
  return [Math.min(...xs), Math.max(...xs)];
}
export function rotateTranslate(p, body) {
  const a = body.angleRad ?? 0, c = Math.cos(a), s = Math.sin(a);
  return [body.x + c * p[0] - s * p[1], body.y + s * p[0] + c * p[1]];
}
export function bezier(a, b, c, t) { const u = 1 - t; return [u*u*a[0]+2*u*t*b[0]+t*t*c[0], u*u*a[1]+2*u*t*b[1]+t*t*c[1]]; }
export function tangent(a, b, c, t) { const x = 2*((1-t)*(b[0]-a[0])+t*(c[0]-b[0])), y = 2*((1-t)*(b[1]-a[1])+t*(c[1]-b[1])), m = Math.hypot(x,y) || 1; return [x/m,y/m]; }
// Difference of a convex subject and a convex mask, returned as disjoint convex pieces.
export function outsideConvex(subject, mask) {
  let remainder = subject; const pieces = [], sign = Math.sign(signedArea(mask));
  for (let i = 0; i < mask.length && remainder.length; i++) {
    const a = mask[i], b = mask[(i+1)%mask.length], nx = -(b[1]-a[1])*sign, ny = (b[0]-a[0])*sign, level = nx*a[0]+ny*a[1];
    const outside = halfPlane(remainder,-nx,-ny,-level);
    if (outside.length >= 3 && Math.abs(signedArea(outside)) > 1e-5) pieces.push(outside);
    remainder = halfPlane(remainder,nx,ny,level);
  }
  return pieces;
}
