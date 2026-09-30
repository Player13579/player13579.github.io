export const OPTICS=Object.freeze({annulusLambda:.64,roundLambda:-.75,hexLambda:-.30,apertureAngle:15*Math.PI/180,radialPlateau:3.5,radialOuter:5.2});
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function annularSupport(radial,radius){return 1-smooth((Math.abs(radial-radius)-OPTICS.radialPlateau)/(OPTICS.radialOuter-OPTICS.radialPlateau));}
export function opticalGeometry(source,centre,scale=1){
 if(!Array.isArray(source)||!Array.isArray(centre)||source.length!==2||centre.length!==2||![...source,...centre,scale].every(Number.isFinite)||scale<=0)throw TypeError('actual source/observer projection required');
 const offset=source.map((x,i)=>(x-centre[i])/scale),distance=Math.hypot(...offset),inward=distance>.0001?offset.map(x=>-x/distance):[1,0],side=[-inward[1],inward[0]],at=lambda=>centre.map((x,i)=>x+offset[i]*lambda*scale);
 return{offset,distance,inward,side,annulus:at(OPTICS.annulusLambda),round:at(OPTICS.roundLambda),hex:at(OPTICS.hexLambda),annulusRadius:18+distance*.08,annulusAxisRatio:1+.20*Math.min(1,distance/350),roundRadius:5+distance*.025,hexRadius:5.5+distance*.025,hexForeshorten:1+.12*Math.min(1,distance/350),centre:[...centre],source:[...source]};
}
export function ringPoint(geometry,theta,scale=1){const r=geometry.annulusRadius,a=geometry.inward,b=geometry.side;return geometry.annulus.map((x,i)=>x+(a[i]*Math.cos(theta)*r*geometry.annulusAxisRatio+b[i]*Math.sin(theta)*r)*scale);}
export const opticalWGSL=/*wgsl*/`
fn annularRadialSupport(radial:f32,radius:f32)->f32{
 let d=abs(radial-radius);return 1.-smoothstep(3.5,5.2,d);
}
fn sixBlade(p:vec2f,r:f32)->f32{
 var edge=-10000.;
 for(var i=0u;i<6u;i++){let a=.261799388+f32(i)*1.047197551;edge=max(edge,dot(p,vec2f(cos(a),sin(a)))-r);}
 return 1.-smoothstep(-1.7,1.7,edge);
}
`;
