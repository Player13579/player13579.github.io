// R7 GPT-6.1-Sol: white smoke remains passive; qualified teleport conversion emits locally.
import {smokeDensityAt} from './gust-design.mjs';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export const RADIANCE=Object.freeze({departurePeak:24,arrivalPeak:27,radiusH:Object.freeze([.42,.24,.38]),bodyMaskInCrop:Object.freeze([.24,.27]),integrationCells:8,softSourceRadiusH:.22,observerGain:.09});
export function conversionSourceAt(age,role,rows,{sourceEnabled=true}={}){
 if(!Number.isFinite(age)||!['departure','arrival'].includes(role)||typeof sourceEnabled!=='boolean')throw TypeError('Qualified finite role age and control required');
 const t=age-(role==='arrival'?180:0);
 const strength=sourceEnabled&&t>=0&&rows.length===7?(role==='departure'?24*smooth(t/28)*(1-smooth((t-110)/85)):27*smooth(t/24)*(1-smooth((t-95)/125))):0;
 const center=rows.length===7?rows[2].center.map((v,i)=>(v+rows[3].center[i])*.5):[0,0,0];center[1]-=.03;
 return Object.freeze({strength,center:Object.freeze(center),radiusH:RADIANCE.radiusH});
}
export function emissionAt(q,rows,source){const rho=smokeDensityAt(q,rows);if(!(rho>0)||!(source.strength>0))return 0;const r2=q.reduce((s,v,i)=>s+((v-source.center[i])/source.radiusH[i])**2,0);return rho*source.strength*Math.exp(-2.6*r2);}
export function conversionFlux(rows,source,support){
 const lo=[support.minX,support.minDepth,Math.max(0,support.minHeight)],hi=[support.maxX,support.maxDepth,support.maxHeight];
 const step=hi.map((v,i)=>(v-lo[i])/8),voxel=step.reduce((a,b)=>a*b,1);let sum=0,centroid=[0,0,0];
 for(let z=0;z<8;z++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){const q=[x,y,z].map((v,i)=>lo[i]+(v+.5)*step[i]);const e=emissionAt(q,rows,source);sum+=e;centroid=centroid.map((v,i)=>v+q[i]*e);}
 return Object.freeze({flux:4*Math.PI*sum*voxel,center:Object.freeze(sum>0?centroid.map(v=>v/sum):source.center.slice()),voxel,samples:512});
}
export function receivedConversion({flux,center},point,normal,{enabled=true,visibility=1,albedo=.52}={}){
 if(!enabled||!(flux>0)||!(visibility>0))return 0;const d=center.map((v,i)=>v-point[i]),d2=d.reduce((s,v)=>s+v*v,0),r=Math.sqrt(d2),fade=1-smooth((r-1)/.6);
 const cosine=Math.max(0,d.reduce((s,v,i)=>s+v*normal[i],0)/Math.max(.00001,r));return flux/(4*Math.PI*(d2+.22**2))*cosine*fade*visibility*albedo/Math.PI;
}
