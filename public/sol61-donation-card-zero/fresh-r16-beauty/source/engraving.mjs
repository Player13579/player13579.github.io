// R14: six-lobed flower inside a closed regular hexagon, carved into both caps.
// Larger lobe excursion and a clean land between paths carry the motif at the
// observed 20–25×27 px coin size. Broad floors and eased shoulders are geometry.
export const ENGRAVING=Object.freeze({hexApothem:5.0,flowerRadius:2.65,flowerAmplitude:.82,petals:6,hexHalfWidth:.48,flowerHalfWidth:.45,hexDepth:.42,flowerDepth:.40,floorFraction:.28,flowerMetricLimit:1.7,marchSafety:4.8,shoulderRadius:6.5,shoulderWidth:.55,shoulderHeight:.16});
const smooth=(a,b,x)=>{const q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q);};
const groove=(distance,depth,width)=>depth*(1-smooth(ENGRAVING.floorFraction,1,Math.abs(distance)/width));
export function engravingPaths(x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))throw new TypeError('finite coin-local position');
 const radial=Math.hypot(x,y);
 const hex=Math.max(Math.abs(x),Math.abs(.5*x+.8660254037844386*y),Math.abs(-.5*x+.8660254037844386*y))-ENGRAVING.hexApothem;
 let flower=Infinity;
 if(radial>.95&&radial<4.25){
  const xx=x/radial,yy=y/radial,x2=xx*xx,y2=yy*yy;
  const cosine6=x2*x2*x2-15*x2*x2*y2+15*x2*y2*y2-y2*y2*y2;
  const sine6=6*xx*yy*(x2*x2+y2*y2)-20*xx*yy*x2*y2;
  // First-order normal-distance correction gives petal flanks useful width;
  // the bounded metric keeps the six inward valleys open and paths separated.
  const slope=6*ENGRAVING.flowerAmplitude*sine6/radial;
  const metric=Math.min(ENGRAVING.flowerMetricLimit,Math.sqrt(1+slope*slope));
  flower=(radial-(ENGRAVING.flowerRadius+ENGRAVING.flowerAmplitude*cosine6))/metric;
 }
 return {hex:groove(hex,ENGRAVING.hexDepth,ENGRAVING.hexHalfWidth),flower:groove(flower,ENGRAVING.flowerDepth,ENGRAVING.flowerHalfWidth)};
}
export function engravingDepth(x,y){const p=engravingPaths(x,y);return Math.max(p.hex,p.flower);}
export function capHeight(x,y,radius=8,halfDepth=1.6){const r=Math.hypot(x,y);return halfDepth+.68*Math.max(0,1-(r/radius)**2)+ENGRAVING.shoulderHeight*Math.exp(-(((r-ENGRAVING.shoulderRadius)/ENGRAVING.shoulderWidth)**2))-engravingDepth(x,y);}
export function capNormal(x,y,side=1){if(side!==1&&side!==-1)throw new RangeError('cap side ±1');const e=.01,dx=(capHeight(x+e,y)-capHeight(x-e,y))/(2*e),dy=(capHeight(x,y+e)-capHeight(x,y-e))/(2*e),m=Math.hypot(dx,dy,1);return [-side*dx/m,-side*dy/m,side/m];}
export const ENGRAVING_WGSL=/* wgsl */ `
fn engravedGroove(distance:f32,depth:f32,width:f32)->f32 {
 return depth*(1.0-smoothstep(0.28,1.0,abs(distance)/width));
}
fn engravingDepth(p:vec2f)->f32 {
 let radial=length(p);
 let hex=max(abs(p.x),max(abs(0.5*p.x+0.8660254037844386*p.y),abs(-0.5*p.x+0.8660254037844386*p.y)))-5.0;
 var flower=0.0;
 // Polynomial harmonics avoid an atan seam and singular center.
 if(radial>0.95 && radial<4.25){
  let v=p/radial;let x2=v.x*v.x;let y2=v.y*v.y;
  let cosine6=x2*x2*x2-15.0*x2*x2*y2+15.0*x2*y2*y2-y2*y2*y2;
  let sine6=6.0*v.x*v.y*(x2*x2+y2*y2)-20.0*v.x*v.y*x2*y2;
  let slope=4.92*sine6/radial;let metric=min(1.7,sqrt(1.0+slope*slope));
  flower=engravedGroove((radial-(2.65+0.82*cosine6))/metric,0.40,0.45);
 }
 return max(engravedGroove(hex,0.42,0.48),flower);
}
`;
