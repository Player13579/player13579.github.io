// R13 geometry improves the existing R12 author’s subtractive minted relief; both patterns remain
// in coin-local coordinates, on front/back caps; never emissive ink or icons.
export const ENGRAVING=Object.freeze({hexApothem:4.2,flowerRadius:2.6,flowerAmplitude:.55,petals:6,halfWidth:.56,hexDepth:.28,flowerDepth:.25,marchSafety:2.8});
const groove=(distance,depth)=>{const q=Math.abs(distance)/ENGRAVING.halfWidth;if(q>=1)return 0;return depth*(1-q*q)**2;};
export function engravingDepth(x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))throw new TypeError('finite coin-local position');
 const radial=Math.hypot(x,y);
 // Closed regular hexagon: max of three pairs of half planes. A shallow
 // squared shoulder rounds the groove cross-section, retaining straight edges.
 const hex=Math.max(Math.abs(x),Math.abs(.5*x+.8660254037844386*y),Math.abs(-.5*x+.8660254037844386*y))-ENGRAVING.hexApothem;
 let flower=0;
 if(radial>1.5&&radial<3.8){
  const xx=x/radial,yy=y/radial;
  const cosine6=xx**6-15*xx**4*yy**2+15*xx**2*yy**4-yy**6;
  flower=groove(radial-(ENGRAVING.flowerRadius+ENGRAVING.flowerAmplitude*cosine6),ENGRAVING.flowerDepth);
 }
 // Union of two carved paths. Their compact supports do not overlap.
 return Math.max(groove(hex,ENGRAVING.hexDepth),flower);
}
export function capHeight(x,y,radius=8,halfDepth=1.6){const r=Math.hypot(x,y);return halfDepth+.68*Math.max(0,1-(r/radius)**2)+.22*Math.exp(-(((r-5.2)/.90)**2))-engravingDepth(x,y);}
export function capNormal(x,y,side=1){if(side!==1&&side!==-1)throw new RangeError('cap side ±1');const e=.01,dx=(capHeight(x+e,y)-capHeight(x-e,y))/(2*e),dy=(capHeight(x,y+e)-capHeight(x,y-e))/(2*e),m=Math.hypot(dx,dy,1);return [-dx/m,-dy/m,side/m];}
export const ENGRAVING_WGSL=/* wgsl */ `
fn engravedGroove(distance:f32,depth:f32)->f32 {
 let q=abs(distance)/0.56;
 if(q>=1.0){return 0.0;}
 let bowl=1.0-q*q;return depth*bowl*bowl;
}
fn engravingDepth(p:vec2f)->f32 {
 let radial=length(p);
 let hex=max(abs(p.x),max(abs(0.5*p.x+0.8660254037844386*p.y),abs(-0.5*p.x+0.8660254037844386*p.y)))-4.2;
 var flower=0.0;
 // No atan seam or singular center; six-fold harmonic in the local coin face.
 // The bounded annulus skips angular arithmetic on rim, side and center.
 if(radial>1.5 && radial<3.8){
  let v=p/radial;let x2=v.x*v.x;let y2=v.y*v.y;
  let cosine6=x2*x2*x2-15.0*x2*x2*y2+15.0*x2*y2*y2-y2*y2*y2;
  flower=engravedGroove(radial-(2.6+0.55*cosine6),0.25);
 }
 return max(engravedGroove(hex,0.28),flower);
}
`;
