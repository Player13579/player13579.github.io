// r12新規設計。旧E moduleへのimportはない。数学の値はworld.wgslと一対一。
export const SPEC=Object.freeze({id:'sol61-stamina-e-r12',author:'GPT-6.1-Sol',quality:'hypothesis-only',adoption:'unadopted',B:{repo:'player13579/B',branch:'Codex-honoo',commit:'37eb4bdfe59f0dc075f9b4333b7d6af76b784a88',base:'8a908495ae1f9b7175e00384ab88c50e5c78bd43',extensions:'0eda016558e426ff4142d850d26200b40fafd834'},bodyMetres:1.65,defaultDurationMs:1500,minimumDurationMs:900,previewGapMs:600,domain:{bottom:-.70,top:.34,maximumHalfWidth:.56,depthCentre:.035},palette:{body:[.06,1.05,.24],white:[1.07,1.10,.98],carrier:[.015,.06,.025]},sparkle:{angleDegrees:14,secondaryAngleDegrees:104,longRayPixels:8,shortRayPixels:4.5},samplesPerHalf:30});
export function ease(lo,hi,value){const t=Math.max(0,Math.min(1,(value-lo)/(hi-lo)));return t*t*(3-2*t);}
export function stateAt(ageMs,durationMs=SPEC.defaultDurationMs){const u=ageMs/durationMs,live=Number.isFinite(u)&&Number.isFinite(durationMs)&&durationMs>=900&&u>=0&&u<1;return {u,live,establish:ease(0,.09,u),fill:.12+.88*ease(.06,.48,u),settle:ease(.48,.78,u),carrier:1-ease(.82,.94,u),supply:1-ease(.92,1,u),receiver:1-ease(.78,.90,u)};}
export function widthAt(v){return .16+.40*ease(.12,.66,v)*(1-.35*ease(.82,1,v));}
const bell=(distance,width)=>Math.exp(-((distance/width)**2));
export function evaluateField(p,ageMs,durationMs=1500,{emit=true,coverage=true}={}){
 const s=stateAt(ageMs,durationMs);if(!s.live)return {density:0,coverage:0,radiance:[0,0,0],source:[0,0,0],occupied:0};
 const v=(p[1]+.70)/1.04;if(v<=0||v>=1)return {density:0,coverage:0,radiance:[0,0,0],source:[0,0,0],occupied:0};
 const w=widthAt(v),cx=.05*(v-.5),dz=.30-.10*v,q=((p[0]-cx)/w)**2+((p[2]-.035)/dz)**2;
 const shape=(1-ease(.42,1,q))*ease(0,.065,v)*(1-ease(.91,1,v));
 const occupied=1-ease(s.fill-.025,s.fill+.025,v),active=shape*occupied*s.establish;
 const working=(1-s.settle)*bell(v-s.fill,.18)+s.settle*(.40+.60*bell(v-.68,.26));
 const currentV=(1-s.settle)*s.fill+s.settle*.68,hx=widthAt(currentV)*.60,hy=-.70+1.04*currentV;
 const extrema=(bell(p[0]-hx,.065)+bell(p[0]+hx,.065))*bell(p[1]-hy,.065)*bell(p[2]-.13,.12);
 const energy=active*s.supply*(2.4+1.6*s.settle),white=active*s.supply*(4*working+18*extrema);
 const source=SPEC.palette.body.map((c,k)=>emit?(c*energy+SPEC.palette.white[k]*white):0);
 const density=active*s.carrier,alphaRate=coverage?density*1.20:0;
 return {density,coverage:alphaRate,radiance:source,source,occupied:active,working,extrema};
}
export function localIncident(p,ageMs,durationMs=1500,emit=true){const s=stateAt(ageMs,durationMs);if(!s.live||!emit)return [0,0,0];const offsets=[[-.11,0,.17],[.11,0,.17],[0,-.09,.17],[0,.09,.17]],sum=[0,0,0];for(const d of offsets){const f=evaluateField(p.map((x,i)=>x+d[i]),ageMs,durationMs);for(let i=0;i<3;i++)sum[i]+=f.source[i]*.009*s.receiver;}return sum;}
export function resolveReceipt(event,actor,seen=new Set()){
 const b=event?.benefitOutcomeV1;
 if(!event||!actor||[event.id,event.playerId,event.transactionId,b?.transactionId,b?.outcomeId,b?.sourceOwner].some(x=>typeof x!=='string'||x.trim().length===0))return null;
 if(event?.type!=='gain-stamina'||event?.effectKind!=='stamina'||!event.id||!event.playerId||actor?.id!==event.playerId||!b||b.recipientId!==actor.id||b.semantic!=='stamina-gain'||b.result!=='changed'||!Number.isFinite(b.actualDelta)||b.actualDelta<=0||!b.transactionId||b.transactionId!==event.transactionId||!b.outcomeId||!b.sourceOwner||!Number.isFinite(event.at)||!Number.isFinite(event.durationMs)||event.durationMs<900||seen.has('event:'+event.id)||seen.has('outcome:'+b.outcomeId))return null;
 seen.add('event:'+event.id);seen.add('outcome:'+b.outcomeId);
 return Object.freeze({eventId:event.id,outcomeId:b.outcomeId,actorId:actor.id,at:event.at,durationMs:event.durationMs,actualDelta:b.actualDelta,sourceOwner:b.sourceOwner});
}
export const actorVisible=actor=>Boolean(actor?.alive&&!actor.ejected&&!actor.inVent&&actor.visible!==false);
