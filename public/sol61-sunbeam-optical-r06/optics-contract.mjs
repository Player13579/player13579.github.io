export const OPTICS=Object.freeze({arcHalfAngle:65*Math.PI/180,arcFeather:9*Math.PI/180,arcLambda:.64,roundLambda:-.75,hexLambda:-.30,apertureAngle:15*Math.PI/180});
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function arcSupport(theta){const a=Math.abs(theta);if(a>=OPTICS.arcHalfAngle)return 0;return 1-smooth((a-(OPTICS.arcHalfAngle-OPTICS.arcFeather))/OPTICS.arcFeather);}
export function opticalGeometry(source,centre,scale=1){
 if(!Array.isArray(source)||!Array.isArray(centre)||source.length!==2||centre.length!==2||![...source,...centre,scale].every(Number.isFinite)||scale<=0)throw TypeError('actual source/observer projection required');
 const offset=source.map((x,i)=>(x-centre[i])/scale),distance=Math.hypot(...offset),inward=distance>.0001?offset.map(x=>-x/distance):[1,0],side=[-inward[1],inward[0]];
 const at=lambda=>centre.map((x,i)=>x+offset[i]*lambda*scale);
 return {offset,distance,inward,side,arc:at(OPTICS.arcLambda),round:at(OPTICS.roundLambda),hex:at(OPTICS.hexLambda),arcRadius:14+distance*.12,roundRadius:5+distance*.025,hexRadius:5.5+distance*.025,hexForeshorten:1+.12*Math.min(1,distance/350),centre:[...centre],source:[...source]};
}
export const opticalWGSL=/*wgsl*/`
fn arcAngularSupport(theta:f32)->f32{
 let a=abs(theta);let halfAngle=1.134464014;let feather=.157079633;
 if(a>=halfAngle){return 0.;}
 return 1.-smoothstep(halfAngle-feather,halfAngle,a);
}
fn sixBlade(p:vec2f,r:f32)->f32{
 var edge=-10000.;
 for(var i=0u;i<6u;i++){let a=.261799388+f32(i)*1.047197551;edge=max(edge,dot(p,vec2f(cos(a),sin(a)))-r);}
 return 1.-smoothstep(-1.7,1.7,edge);
}
`;
