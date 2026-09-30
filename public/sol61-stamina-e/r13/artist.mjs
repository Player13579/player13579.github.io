// GPT-6.1-Sol: r13 new replenishment-front expression; no creative imports.
export const SPEC=Object.freeze({id:'sol61-stamina-e-r13',author:'GPT-6.1-Sol',quality:'hypothesis-only',adoption:'unadopted',bodyH:64,bodyAspect:136/225,defaultDurationMs:1500,minDurationMs:900,previewGapMs:650,bounds:[-40,-29,28,32],depthHalf:12,samplesPerHalf:24,palette:{supply:[2.8,1.02,.12],received:[.78,1.55,.34],working:[6.5,5.9,3.8],point:[16,16,14]},sparkle:{angleDegrees:24,longHalf:10,shortHalf:5},pointPositions:[[-22,-13.5,5],[22,-16,5]],pointPeaks:[.62,.71],pointWidths:[.055,.065],ghost:{k:.32,halfWidth:6,halfHeight:3.2,focus:1.8,gain:.018}});
export const smooth=(a,b,x)=>{const q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q);};
const square=x=>x*x,quartic=x=>square(square(x));
export function state(ageMs,durationMs=1500){const u=ageMs/durationMs,live=Number.isFinite(u)&&Number.isFinite(durationMs)&&durationMs>=900&&u>=0&&u<1;const formed=live?smooth(0,.085,u):0,advance=smooth(.10,.66,u);return {u,live,formed,advance,frontY:24-40*advance,settle:smooth(.57,.78,u),end:live?1-smooth(.84,1,u):0};}
export function point(i,ageMs,durationMs=1500,enabled=true){const s=state(ageMs,durationMs),p=SPEC.pointPositions[i];if(!p)return {position:[0,0,0],gain:0};const t=(s.u-SPEC.pointPeaks[i])/SPEC.pointWidths[i];return {position:p,gain:s.live&&enabled&&Math.abs(t)<1?s.formed*s.end*square(1-t*t):0};}
export function field(p,ageMs,durationMs=1500,{source=true,points=true}={}){
 const [x,y,z]=p,s=state(ageMs,durationMs);if(!s.live||!source||![x,y,z].every(Number.isFinite)||x<=-40||x>=28||y<=-29||y>=32||Math.abs(z)>=12)return {density:0,radiance:[0,0,0],supply:0,crest:0,received:0};
 const tailX=(x+25)/10,tailZ=(z+1)/8;
 const tail=(1-smooth(.50,1,quartic(tailX)+quartic(tailZ)))*smooth(-9,-5,y)*(1-smooth(26,29,y))*(1-smooth(s.frontY-2,s.frontY+2,y));
 const centre=-4+4*s.advance,front=s.frontY+.075*(x+4),wx=(x-centre)/24,wy=(y-front)/5.5,wz=(z-2)/8;
 const crest=(1-smooth(.45,1,quartic(wx)+quartic(wz)))*Math.exp(-quartic(wy))*smooth(.065,.14,s.u)*(1-smooth(.68,.82,s.u));
 const ry=(y+12)/40,rx=(x-(1.8-3.6*ry))/(17+5*Math.sin(Math.PI*Math.max(0,Math.min(1,ry)))),rz=(z-2.5)/8.5;
 const receiver=(1-smooth(.45,1,quartic(rx)+quartic(rz)))*smooth(-15,-10,y)*(1-smooth(26,30,y))*smooth(front-4,front+4,y)*smooth(.16,.33,s.u);
 const density=(tail*.58+crest*.72+receiver*.42)*s.formed*s.end;
 const radiance=SPEC.palette.supply.map((v,i)=>(v*tail*.80+SPEC.palette.working[i]*crest*(.78+.45*s.advance)+SPEC.palette.received[i]*receiver*(.85+.55*s.settle))*s.formed*s.end);
 if(points)for(let i=0;i<2;i++){const f=point(i,ageMs,durationMs,true),d=SPEC.pointPositions[i].map((v,j)=>(p[j]-v)/(j===2?2.5:1.15)),peak=Math.exp(-d.reduce((sum,v)=>sum+v*v,0))*f.gain;for(let c=0;c<3;c++)radiance[c]+=SPEC.palette.point[c]*peak;}
 return {density,radiance,supply:tail*s.formed*s.end,crest:crest*s.formed*s.end,received:receiver*s.formed*s.end};
}
export function integrate(x,y,ageMs,durationMs=1500,front=true,options={}){const dz=12/24;let transmission=1,rgb=[0,0,0],emission=[0,0,0];for(let i=0;i<24;i++){const z=front?12-(i+.5)*dz:-(i+.5)*dz,f=field([x,y,z],ageMs,durationMs,options),a=1-Math.exp(-f.density*dz*.075);for(let c=0;c<3;c++){const light=f.radiance[c]*dz*.11;rgb[c]+=transmission*([.035,.030,.014][c]*a+light);emission[c]+=transmission*light;}transmission*=1-a;}return {rgb,emission,alpha:1-transmission};}
export function incident(p,ageMs,durationMs=1500,enabled=true){if(!enabled)return [0,0,0];const d=[[-3,0,2],[3,0,2],[0,-3,2],[0,3,2]],sum=[0,0,0];for(const v of d){const f=field(p.map((q,j)=>q+v[j]),ageMs,durationMs);for(let c=0;c<3;c++)sum[c]+=f.radiance[c]*.018;}return sum;}
export function ghostPosition(sourceScreen,imageCenter){return imageCenter.map((c,j)=>c+SPEC.ghost.k*(c-sourceScreen[j]));}
export function resolveReceipt(event,actor,seen=new Set()){
 const b=event?.benefitOutcomeV1,ids=[event?.id,event?.playerId,event?.transactionId,b?.transactionId,b?.outcomeId,b?.sourceOwner];
 if(ids.some(v=>typeof v!=='string'||!v.trim())||event.type!=='gain-stamina'||event.effectKind!=='stamina'||!actor||actor.id!==event.playerId||b.recipientId!==actor.id||b.semantic!=='stamina-gain'||b.result!=='changed'||b.transactionId!==event.transactionId||!Number.isFinite(b.actualDelta)||b.actualDelta<=0||!Number.isFinite(event.at)||!Number.isFinite(event.durationMs)||event.durationMs<900||seen.has('event:'+event.id)||seen.has('outcome:'+b.outcomeId))return null;
 seen.add('event:'+event.id);seen.add('outcome:'+b.outcomeId);return Object.freeze({eventId:event.id,outcomeId:b.outcomeId,actorId:actor.id,at:event.at,durationMs:event.durationMs,actualDelta:b.actualDelta,sourceOwner:b.sourceOwner});
}
export const visibleOwner=actor=>Boolean(actor?.alive&&!actor.ejected&&!actor.inVent&&actor.visible!==false);
