// Sol R3: pixel-cell integral of the same finite positive Gaussian aperture.
export const KERNEL_BYTES=192;
export const OPERATOR_VERSION='finite-pixel-cell-gaussian-r3';
const nodes=[-.9602898564975363,-.7966664774136267,-.525532409916329,-.1834346424956498,.1834346424956498,.525532409916329,.7966664774136267,.9602898564975363];
const weights=[.1012285362903763,.2223810344533745,.3137066458778873,.362683783378362,.362683783378362,.3137066458778873,.2223810344533745,.1012285362903763];
export function gaussianCellIntegral(a,b,step){if(b<=a)return 0;const mid=(a+b)/2,half=(b-a)/2;let sum=0;for(let i=0;i<8;i++){const x=mid+half*nodes[i];sum+=weights[i]*Math.exp(-(x*x)/(2.5*step*step));}return half*sum;}
export function kernelForUniforms(u){
 if(!(u instanceof Float32Array)||u.length!==40||!Number.isFinite(u[32])||u[32]!==Math.fround(2.4)||!Number.isFinite(u[35])||u[35]<=0||u[35]>4)throw Error('ACTUAL_40F32_PSF_PROJECTION_REQUIRED');
 const projectionScale=u[35],stepPx=Math.fround(u[32]*projectionScale),radiusPx=stepPx*2,maxOffset=Math.ceil(radiusPx),tapCount=maxOffset*2+1;
 if(tapCount>41)throw Error('FINITE_GAUSSIAN_TAP_BUDGET');
 const cells=[];for(let k=-maxOffset;k<=maxOffset;k++)cells.push(gaussianCellIntegral(Math.max(-radiusPx,k-.5),Math.min(radiusPx,k+.5),stepPx));const total=cells.reduce((a,b)=>a+b,0);if(!(total>0&&Number.isFinite(total)))throw Error('FINITE_POSITIVE_PSF_NORMALIZATION');
 const values=new Float32Array(48);values[0]=maxOffset;values[1]=tapCount;values[3]=projectionScale;let sumF32=0;for(let i=0;i<tapCount;i++){values[4+i]=cells[i]/total;sumF32=Math.fround(sumF32+values[4+i]);}values[2]=sumF32;
 const bytes=new Uint8Array(values.buffer.slice(0)),key=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return {values,bytes,key,spec:Object.freeze({operatorVersion:OPERATOR_VERSION,maxOffset,tapCount,projectionScale,sigmaCss:u[32]*Math.sqrt(1.25),radiusCss:u[32]*2,normalizationF32:sumF32,quadrature:'8-point positive Gauss-Legendre per physical-pixel cell',samplerSpacingBackingPx:1,textureLoadBudgetPerFrame:2*tapCount})};
}
