import {stateAt} from './plan.mjs';
const TAU=2*Math.PI;
const interp=(a,b,t)=>a+(b-a)*t;
const low=[.019,.23,.32], cool=[.06,.53,.62], high=[.34,1.02,1.15], edge=[.048,.37,.49];
const color=(a,b,t)=>a.map((v,i)=>interp(v,b[i],t));
const clamp=x=>Math.max(0,Math.min(1,x));
const bell=(u,c,w)=>{const x=clamp(1-Math.abs(u-c)/w);return x*x*(3-2*x);};

// One radial sheet on the field plane. Coordinates stay in the authored
// footprint; sample returns linear-RGB, coverage, and separate emission.
export function buildWaterSheet(field, now, {reduced=false}={}){
 const s=stateAt(field,now,{reduced});
 const empty=new Float32Array(0);
 if(!s.opacity||!s.front||!Number.isFinite(field?.radius)||field.radius<40)return empty;
 const ringCount=8, sides=48, data=new Float32Array(sides*(3+6*(ringCount-1))*8);
 let offset=0;
 const point=(ring,i)=>{
   const u=[0,.19,.38,.58,.76,.89,.943,.979,1][ring], theta=(i%sides)*TAU/sides;
   const x=Math.cos(theta),y=Math.sin(theta);
   const r=Math.min(1,s.front*(.945+.027*Math.cos(3*theta+.58)+.022*Math.sin(5*theta+.21))*u);
   const planeSpecular=bell(y*u+.34*x*u,.17,.49)*(.42+.58*bell(u,.64,.67));
   const wavePos=.26+.67*s.front;
   const traveling=bell(u,wavePos,.23)*s.caustic*(.56+.44*bell(y+.24*x,.32,.79));
   const wetCore=.18+.57*planeSpecular+.28*traveling;
   const interior=u<.969?1:clamp((1-u)/.031);
   const retreat=1-.44*bell(u,.84,.51)*(1-s.settled);
   const opacity=s.opacity*interior*retreat*(.16+.42*wetCore);
   const chroma=color(low,cool,clamp(wetCore*interior));
   const tint=color(chroma,high,clamp(planeSpecular*.48+traveling*.52));
   const meniscus=bell(u,.955,.065);
   const lipLight=meniscus*(.22+.78*bell(x-.45*y,.64,1.02));
   const lipShadow=meniscus*bell(x+.35*y,-.67,.88);
   const reflectionLine=bell(y*u+.41*x*u+.13*x*x*u,.10,.23)*
     bell(u,.62,.43)*(.34+.66*bell(x,-.10,1.04));
   const band=color(tint,[.57,1.22,1.31],clamp(.54*lipLight+.53*reflectionLine));
   const rgb=color(band,edge,.48*lipShadow);
   const emission=s.opacity*interior*(.015+.20*planeSpecular+.28*traveling+.28*lipLight+.28*reflectionLine);
   return [x*r*field.radius,y*r*field.radius,...rgb,clamp(opacity+s.opacity*interior*.16*lipLight),emission,0];
 };
 for(let i=0;i<sides;i++){
   const write=(...vs)=>{for(const v of vs){data.set(v,offset);offset+=8;}};
   write(point(0,0),point(1,i),point(1,i+1));
   for(let j=1;j<ringCount;j++) {
     const a=point(j,i),b=point(j+1,i),c=point(j+1,i+1),d=point(j,i+1);
     write(a,b,c,a,c,d);
   }
 }
 return data;
}
