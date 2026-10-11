export const VERSION='headshot-zero-sol61-r2';
export const DURATION_MS=1250;
export const DEFAULTS=Object.freeze({source:true,observer:true,fixture:true,fixtureH:64,zoom:1,anchorX:490,anchorY:350,reducedMotion:false});
export const smooth=(a,b,x)=>{const u=Math.min(1,Math.max(0,(x-a)/(b-a)));return u*u*(3-2*u);};
export function skullState(ageMs,reducedMotion=false){
 const t=ageMs/1000;
 if(!Number.isFinite(t)||t<0||t>=1.05)return {active:false,flux:0,y:.22};
 const envelope=smooth(.035,.11,t)*(1-smooth(.72,1.05,t));
 return {active:envelope>0,flux:4.2*envelope,y:.22+(reducedMotion?0:.055*smooth(.08,.65,t)),envelope};
}
export function contactState(ageMs){
 const t=ageMs/1000;
 if(!Number.isFinite(t)||t<0||t>=.18)return {active:false,flux:0,radius:0};
 return {active:true,flux:8*smooth(0,.012,t)*(1-smooth(.025,.18,t)),radius:.018+.142*smooth(0,.18,t)};
}
// Analytic glyph coverage. Positive-y is up; matching WGSL is the rendering authority.
export function skullDistance(x,y){
 const crown=(Math.hypot(x/.17,(y-.038)/.145)-1)*.145;
 const jaw=Math.max(Math.abs(x)-.112,Math.abs(y+.124)-.062)-.006;
 const body=Math.min(crown,jaw);
 const eyes=Math.min((Math.hypot((x-.064)/.044,(y-.023)/.039)-1)*.039,(Math.hypot((x+.064)/.044,(y-.023)/.039)-1)*.039);
 const nose=Math.max(Math.abs(x)-(.022-.35*(y+.048)),Math.abs(y+.048)-.025);
 const teeth=Math.max(Math.min(Math.abs(x-.034),Math.abs(x+.034))-.005,Math.abs(y+.15)-.04);
 return Math.max(body,-eyes,-nose,-teeth);
}
export function scatterKernel(zoom=1){
 const result=[];let total=0;const pitch=Math.max(.55,.7*zoom);
 for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){const weight=Math.exp(-(x*x+y*y)/2);total+=weight;result.push({x:x*pitch,y:y*pitch,weight});}
 return result.map(s=>({...s,weight:s.weight/total}));
}
export function validateOptions(patch,current=DEFAULTS){
 const next={...current,...patch};
 for(const key of ['fixtureH','zoom','anchorX','anchorY'])if(!Number.isFinite(next[key]))throw new RangeError(key);
 if(next.fixtureH<=0||next.fixtureH>512||next.zoom<.25||next.zoom>6)throw new RangeError('scale');
 for(const key of ['source','observer','fixture','reducedMotion'])if(typeof next[key]!=='boolean')throw new TypeError(key);
 return next;
}
// Integration helper only. Event.x/y is a target world position, never a head point.
export class HeadshotEventGate{
 constructor(){this.seen=new Set();}
 accept(event,resolvedHeadAnchor){
  if(event?.type!=='action-gunner-headshot')return null;
  const id=event.id;
  if(!((typeof id==='string'&&id.length>0)||(typeof id==='number'&&Number.isSafeInteger(id))))return null;
  if(!resolvedHeadAnchor||!Number.isFinite(resolvedHeadAnchor.x)||!Number.isFinite(resolvedHeadAnchor.y))throw new TypeError('canonical caller-resolved head anchor required');
  if(this.seen.has(id))return null;
  this.seen.add(id);return {id,headAnchor:{x:resolvedHeadAnchor.x,y:resolvedHeadAnchor.y},targetId:event.targetId,playerId:event.playerId,variant:event.variant};
 }
 dispose(){this.seen.clear();}
}
// Generic clock contract retained; visual equations above are new.
export class Playback{
 constructor(now=()=>performance.now()){this.now=now;this.generation=0;this.cause=0;this.mode='stopped';this.heldAge=0;this.origin=0;}
 replay(){this.generation++;this.cause++;this.origin=this.now();this.mode='playing';this.heldAge=0;return this.cause;}
 age(){return this.mode==='playing'?this.now()-this.origin:this.heldAge;}
 hold(age){if(!Number.isFinite(age)||age<0)throw new RangeError('age');this.generation++;this.mode='held';this.heldAge=age;}
 resume(){if(this.mode!=='held')return false;this.generation++;this.origin=this.now()-this.heldAge;this.mode='playing';return true;}
 stop(){this.generation++;this.mode='stopped';this.heldAge=DURATION_MS;}
}

// R2: contact deposits the shared information field at its lower jaw.
export function transferState(ageMs,reducedMotion=false){
 const t=ageMs/1000;
 if(!Number.isFinite(t)||t<0||t>=.145)return {active:false,flux:0,tip:0};
 const flux=6.5*smooth(.012,.035,t)*(1-smooth(.075,.145,t));
 const tip=(skullState(ageMs,reducedMotion).y-.184)*smooth(.012,.065,t);
 return {active:flux>0,flux,tip};
}
// CPU oracle for the creative WGSL radiant glyph; no CPU presentation path.
export function glyphRadiance(x,y,ageMs,reducedMotion=false){
 const st=skullState(ageMs,reducedMotion);if(!st.active||skullDistance(x,y)>0)return [0,0,0];
 const d=skullDistance(x,y),edge=Math.exp(-Math.pow(d/.012,2));
 const crown=Math.exp(-Math.pow((y-.105)/.065,2)-Math.pow(x/.15,2));
 const energy=smooth(.035,.11,ageMs/1000);
 const face=1-.22*smooth(-.15,.13,y);
 const amber=[1,.36,.075],rim=[1,.78,.45],crest=[1,.91,.71];
 return amber.map((a,i)=>st.flux*(a*.72*face+rim[i]*.55*edge+crest[i]*.25*crown*energy));
}
export function wideScatterKernel(zoom=1){
 const out=[];let total=0;const pitch=Math.max(.75,1.15*zoom);
 for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){const weight=Math.exp(-(x*x+y*y)/3.2);total+=weight;out.push({x:x*pitch,y:y*pitch,weight});}
 return out.map(s=>({...s,weight:s.weight/total}));
}
