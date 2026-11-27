import {stateAt} from "./plan.mjs";
const lerp=(x,y,t)=>x+(y-x)*t;
const sat=x=>Math.max(0,Math.min(1,x));
const palette=[[.08,.44,.67],[.20,.33,.94]];
const light=[.63,1.38,1.71];
function peak(x,c,r){const v=sat(1-Math.abs(x-c)/r);return v*v*(3-2*v)}
function blend(a,b,t){return a.map((c,i)=>lerp(c,b[i],t))}
export function buildSheets(effect,t,options={}){
 const q=stateAt(t,options);
 if(!q.alpha||!effect||!Number.isFinite(effect.axis))return new Float32Array(0);
 const hp=options.reduced?.77:1, out=[];
 const d=[Math.cos(effect.axis),Math.sin(effect.axis)], n=[-d[1],d[0]];
 const push=(x,y,c,a,k)=>out.push(d[0]*x+n[0]*y,d[1]*x+n[1]*y,...c,sat(a),k,0);
 const pivot=(v,u,side)=>{
   const inner=lerp(.84,0,q.reach), width=lerp(.51,.18,q.vanish), arc=.18*v*v;
   const cut=width*q.vanish*.73;
   const h=(inner+cut+arc+(width-cut)*u)*side, y=v*(.76-.20*u)*hp;
   const sweep=peak(u,lerp(.77,.06,q.reach),.52)*(1-q.vanish);
   const melt=lerp(1,.1,q.vanish), coverage=(1-peak(v,1,.45)*.8)*(.5+.5*q.reach);
   const tone=blend(palette[side>0?1:0],light,sat(.12+.63*sweep+.15*peak(v,.1,.62)));
   return [h,y,tone,q.alpha*melt*coverage*(.23+.46*sweep)*(1-.82*peak(u,1,.34)),.08+.55*sweep];
 };
 const vx=[-1,-.78,-.52,-.26,0,.26,.52,.78,1], ux=[0,.18,.36,.58,.80,1];
 for (const side of [-1,1]){
   for(let i=0;i<vx.length-1;i++)for(let j=0;j<ux.length-1;j++){
     const a=pivot(vx[i],ux[j],side),b=pivot(vx[i+1],ux[j],side);
     const c=pivot(vx[i+1],ux[j+1],side),d=pivot(vx[i],ux[j+1],side);
     for(const p of [a,b,c,a,c,d])push(...p);
   }
 }
 // The two fronts share this thin, bilateral seam for only one contact.
 for(let i=0;i<vx.length-1;i++){
   const y=vx[i], z=vx[i+1], wa=.055*(1-y*y)*q.contact, wb=.055*(1-z*z)*q.contact;
   const a=q.contact*(1-y*y)*.72,b=q.contact*(1-z*z)*.72;
   for(const p of [[-wa,y*.64*hp,a], [wa,y*.64*hp,a], [wb,z*.64*hp,b], [-wa,y*.64*hp,a], [wb,z*.64*hp,b], [-wb,z*.64*hp,b]])
     push(p[0],p[1],light,p[2],.44*q.contact);
 }
 return new Float32Array(out);
}
