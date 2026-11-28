import {VERSION,LIFE,stateAt,admit} from './plan.mjs';
export {VERSION,LIFE};
export const TYPE='local-match-finalized-preview', HEIGHT=1.70,CSS_PX_PER_M=64/HEIGHT;
const FIXTURE_START=Date.now()-60000;
const OWNER='fixture-self', cap=x=>Math.max(0,Math.min(1,x));
export const RAIL=Object.freeze({left:-1.16,right:-.62,top:-1.50,bottom:-.32});
export const UI=Object.freeze({left:-.29,right:1.55,top:-1.48,bottom:-.32});
export function receipt(raw,now=Date.now()){
 const o=admit(raw);if(!o||raw.after.selfId!==OWNER||now-o.at< -125||now-o.at>=LIFE)return null;
 return Object.freeze({...o,x:0,y:0,age:now-o.at,dx:0,tier:'final',playerId:OWNER});
}
export function fixtureReceipt(serial){
 const roomId='fixture-room',selfId=OWNER, start=FIXTURE_START,common={roomId,selfId,round:5,start,generation:1+Math.max(0,Number(serial)||0)};
 const sequence=typeof serial==='number'&&serial>0?serial:1_000_000;
 return {source:'same-session-state',stale:false,sequence,currentSequence:sequence,
 before:{...common,phase:'playing'},after:{...common,phase:'ended',winner:'defenders'},observedAt:Date.now()};
}
export function basis(){return {floor:[0,0],p:[-.89,-.90]}}
export class Mesh{
 constructor(){this.data=new Float32Array(2048);this.length=0}
 vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
 quad(x1,y1,x2,y2,ca,cb,cc,cd,aa,ab,ac,ad){
  const a=[x1,y1],b=[x2,y1],c=[x2,y2],d=[x1,y2];
  this.vertex(a,ca,aa);this.vertex(b,cb,ab);this.vertex(c,cc,ac);
  this.vertex(a,ca,aa);this.vertex(c,cc,ac);this.vertex(d,cd,ad);
 }
}
export function drawFixture(g){
 // The same result enclosure remains before, during and after the event. DOM labels/controls are on the right.
 const line=[.071,.117,.16], pane=[.028,.043,.065], clear=[.038,.057,.08];
 const block=(x,y,X,Y,c,a)=>g.quad(x,y,X,Y,c,c,c,c,a,a,a,a);
 block(-1.35,-1.67,1.69,-.19,line,.73);
 block(-1.32,-1.64,1.66,-.22,pane,.87);
 block(-1.20,-1.54,-.55,-.28,clear,.89);
 block(-.40,-1.51,-.37,-.30,line,.65);
}
export function buildReceipt(g,_ev,t,{reduced=false}={}){
 const q=stateAt(t,{reduced}),from=g.length,p=basis().p;
 if(q.alpha<=0||q.top>=1)return {p,contact:p,lum:0,stage:q.phase,triangles:0};
 const {left,right,top,bottom}=RAIL;
 const u=[0,.17,.54,.84,1], v=[0,.08,.22,.44,.64,.84,1];
 const xs=x=>left+(right-left)*x,ys=y=>top+(bottom-top)*y;
 function at(x,y){
   const tint=(1-Math.abs((x-.47)*1.85))*(.58+.42*y);
   const ramp=cap((y-q.top)/.095);
   const a=q.alpha*ramp*(1-Math.abs(x-.51)**2)*.83;
   return {c:[.17+.31*tint,.26+.45*tint,.37+.49*tint],a};
 }
 for(let i=0;i<u.length-1;i++)for(let j=0;j<v.length-1;j++){
  const y=Math.max(v[j],q.top),Y=v[j+1];
  if(y>=Y)continue;
  const x=u[i],X=u[i+1],p=[at(x,y),at(X,y),at(X,Y),at(x,Y)];
  g.quad(xs(x),ys(y),xs(X),ys(Y),...p.map(e=>e.c),...p.map(e=>e.a));
 }
 return {p,contact:p,lum:0,stage:q.phase,progress:q.top,triangles:(g.length-from)/24,branches:[]};
}
export function fillSfx(rate){
 const data=new Float32Array(Math.round(rate*.57)); let peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate, env=Math.sin(Math.PI*cap(t/.52))**2*(t<.52?1:0);
  data[i]=env*(.031*Math.sin(2*Math.PI*(306*t-62*t*t))+.011*Math.sin(2*Math.PI*477*t));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
