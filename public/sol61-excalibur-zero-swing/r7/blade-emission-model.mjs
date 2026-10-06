// R7 surface-bound magical radiance; these authored colors are not gold's material reflectance.
export const BLADE_EMISSION=Object.freeze({gold:[1,.88,.14],hot:[1,.99,.83],face:[1,.93,.22],edgeGoldGain:18,edgeHotGain:8,spineGain:6,faceGain:.65,spineFraction:.09,pixelFraction:.45});
export function evaluateBladeEmission({acrossSourcePx,halfWidthSourcePx,pixelAcrossSourcePx,material,edge,field}){
 if(![acrossSourcePx,halfWidthSourcePx,pixelAcrossSourcePx,material,edge,field].every(Number.isFinite)||halfWidthSourcePx<=0||pixelAcrossSourcePx<0||field<0)throw new TypeError('finite blade radiance input required');
 const w=Math.max(halfWidthSourcePx*.09,pixelAcrossSourcePx*.45,.001),ridge=material*Math.exp(-((acrossSourcePx/w)**2));
 const rimGold=field*edge*18,rimHot=field*edge*edge*8,spine=field*ridge*6,face=field*material*(1-ridge)*.65;
 return {ridge,rimGold,rimHot,spine,face,rgb:BLADE_EMISSION.gold.map((c,i)=>c*rimGold+BLADE_EMISSION.hot[i]*(rimHot+spine)+BLADE_EMISSION.face[i]*face)};
}
export const BLADE_EMISSION_WGSL=String.raw`
fn bladeEmission(across:f32,halfWidth:f32,pixelAcross:f32,material:f32,edge:f32,field:f32)->vec3f{
 let ridgeWidth=max(0.001,max(halfWidth*0.09,pixelAcross*0.45));
 let ridge=material*exp(-pow(across/ridgeWidth,2.0));
 let rimGold=field*edge*18.0;let rimHot=field*edge*edge*8.0;
 let spine=field*ridge*6.0;let face=field*material*(1.0-ridge)*0.65;
 return vec3f(1.0,0.88,0.14)*rimGold+vec3f(1.0,0.99,0.83)*(rimHot+spine)+vec3f(1.0,0.93,0.22)*face;
}
`;
