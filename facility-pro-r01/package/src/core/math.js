export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
export const pulse=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
export const mix=(a,b,t)=>a+(b-a)*t;
export function seeded(seed=1){let s=seed>>>0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
export function rgbaLut(sample,n=256){const a=new Uint8Array(n*4);for(let i=0;i<n;i++){const s=sample(i/(n-1)*2200);a[i*4]=Math.round(clamp(s.source)*255);a[i*4+1]=Math.round(clamp(s.body)*255);a[i*4+2]=Math.round(clamp(s.localLight)*255);a[i*4+3]=Math.round(clamp(s.bloom)*255);}return a;}
