/** GPT-6.1-Sol new design; immutable r1. No historical E design input. */
export const VERSION = 'sol61-rational-free-r1';
export const EVENT_TYPE = 'action-rational-free';
export const LIFETIME_MS = 1200;
export const CONTRACT = Object.freeze({version: VERSION, eventType: EVENT_TYPE,
  clock: 'client-receive-presentation-ms', durationMs: 1200, serverDurationMs: 0,
  gameplayIntervalMs: 30000, sourceRadius: 145, manaMeaning: 'cost-waived-not-gain',
  actorHeightReferencePx: 64, author: 'GPT-6.1-Sol', adopted: false, quality: 'not_run'});
const clamp = (v, a=0, b=1) => Math.min(b, Math.max(a, v));
export function smooth(a,b,x) { const q=clamp((x-a)/(b-a)); return q*q*(3-2*q); }
/** Exact one receipt, one lifetime. Identity is supplied by the authoritative localizer. */
export function createReceiptStore() {
  const receipts = new Map();
  return {
    receive(event, receiveNowMs, receiptKey) {
      if (event?.type !== EVENT_TYPE) return {status:'ignored-type'};
      if (!Number.isFinite(receiveNowMs) || !Number.isFinite(event.x) || !Number.isFinite(event.y)
        || !event.playerId || typeof receiptKey !== 'string' || !receiptKey) return {status:'invalid-receipt'};
      if (receipts.has(receiptKey)) return {status:'duplicate', record:receipts.get(receiptKey)};
      const record = Object.freeze({version:VERSION, receiptKey, eventId:event.id ?? null,
        causeId:event.causeId ?? event.id ?? receiptKey, playerId:event.playerId, x:event.x,y:event.y,
        radius:145, receivedAtMs:receiveNowMs, durationMs:LIFETIME_MS, sourceType:EVENT_TYPE,
        semantic:'ability-cost-waived', serverAt:event.at ?? null});
      receipts.set(receiptKey,record); return {status:'accepted',record};
    },
    // Keep tombstones through the session. Explicit reset only on session replacement.
    resetSession(){receipts.clear();}, get size(){return receipts.size;}
  };
}
export function phaseAt(record, nowMs) {
  if (!Number.isFinite(nowMs)) throw new TypeError('finite presentation time required');
  const ageMs=nowMs-record.receivedAtMs;
  const alive=ageMs>=0 && ageMs<LIFETIME_MS;
  const t=clamp(ageMs/LIFETIME_MS);
  return {ageMs,t,alive, // Time scales never enter this formula.
    gate:alive ? smooth(0,.045,t)*(1-smooth(.88,1,t)) : 0,
    opening:smooth(.055,.36,t)*(1-.25*smooth(.72,.88,t)),
    reception:smooth(.27,.49,t)*(1-smooth(.82,1,t)),
    source:alive ? smooth(0,.035,t)*(1-.60*smooth(.40,.76,t))*(1-smooth(.88,1,t)) : 0,
    stage: ageMs<0?'not-started':ageMs>=1200?'finished':t<.16?'source':t<.42?'opening':t<.82?'permitted-path':'closure'};
}
/** Field values are shared mathematical evidence, not proof of rendered pixels. */
export function sampleField(p,t) {
  if (!(t>=0 && t<1)) return {main:0,fold:0,source:0,receive:0,star:0};
  const phase=phaseAt({receivedAtMs:0},t*1200), u=clamp((p[1]+.82)/.66);
  const a=Math.sin(Math.PI*u), open=phase.opening;
  const center=.13+.29*a*(.34+.66*open)-.025*u;
  const width=.035+.115*a*(.25+.75*open);
  const edge=Math.abs(p[0]-center)-width;
  const band=(1-smooth(-.005,.012,edge))*smooth(-.84,-.80,p[1])*(1-smooth(-.18,-.14,p[1]));
  const ridge=Math.exp(-Math.pow((p[0]-center-width*.36)/.024,2));
  const progress=smooth(0,.36,t);
  const lead=smooth(u-.08,u+.06,progress);
  const main=band*lead*phase.gate;
  const source=Math.exp(-(((p[0]-.13)/.042)**2+((p[1]+.79)/.042)**2))*phase.source;
  const receive=Math.exp(-(((p[0]-.17)/.17)**2+((p[1]+.45)/.24)**2))*phase.reception;
  let star=0;
  for(let i=0;i<3;i++){
    const sy=[-.77,-.50,-.29][i], sx=[.15,.40,.29][i], onset=[.045,.30,.51][i];
    const e=smooth(onset,onset+.025,t)*(1-smooth(onset+.11,onset+.18,t))*phase.gate;
    const dx=p[0]-sx,dy=p[1]-sy,c=Math.cos(.3926990817),s=Math.sin(.3926990817);
    const x=c*dx+s*dy,y=-s*dx+c*dy;
    star+=e*(Math.exp(-((x/.042)**2)-((y/.007)**2))+Math.exp(-((y/.032)**2)-((x/.007)**2)));
  }
  return {main,fold:ridge*main,source,receive,star};
}
/** 48 float uniform contract; all offsets in actual projected actor H, feet origin. */
export function uniforms(record, nowMs, view) {
  const q=phaseAt(record,nowMs), out=new Float32Array(48);
  const {viewportPx,anchorPx,actorHeightPx,actorRectH,atlasUv=[0,0,1,1],sourceVisibility=1,
    pass=1,mainEnabled=1,receiveEnabled=1,starsEnabled=1,postEnabled=1,reducedMotion=false}=view;
  if(![...viewportPx,...anchorPx,actorHeightPx,...actorRectH,...atlasUv].every(Number.isFinite)
    || actorHeightPx<=0 || viewportPx.some(v=>v<=0))throw new TypeError('registered view required');
  out.set([viewportPx[0],viewportPx[1],anchorPx[0],anchorPx[1]],0);
  out.set([actorHeightPx,q.t,q.alive?1:0,reducedMotion?1:0],4);
  out.set(actorRectH,8);out.set(atlasUv,12);
  out.set([clamp(sourceVisibility),pass,mainEnabled,receiveEnabled],16);
  out.set([starsEnabled,postEnabled,0,0],20);
  return out;
}
export const SFX_SCORE = Object.freeze([
  {onsetMs:0,durationMs:165,startHz:740,endHz:920,amplitude:.105,pan:.06,partials:[[1,1],[2,.18],[3.7,.06]],role:'認識の立上り'},
  {onsetMs:165,durationMs:455,startHz:920,endHz:1380,amplitude:.072,pan:.16,partials:[[1,1],[1.5,.23],[2.25,.10]],role:'開く通路'},
  {onsetMs:485,durationMs:515,startHz:1380,endHz:1320,amplitude:.075,pan:.06,partials:[[1,1],[1.25,.22],[2,.075]],role:'免除成立の澄んだ定着'},
  {onsetMs:850,durationMs:350,startHz:1320,endHz:1100,amplitude:.029,pan:0,partials:[[1,1],[2,.12]],role:'身体側への有限収束'}
]);
/** Deterministic finite score renderer for AudioBuffer, offline PCM and CPU proof. */
export function synthesizeSfx(sampleRate=48000) {
  if(!Number.isInteger(sampleRate)||sampleRate<8000)throw new TypeError('sample rate');
  const count=Math.round(sampleRate*1.2),left=new Float32Array(count),right=new Float32Array(count);
  for(const voice of SFX_SCORE){
    const begin=Math.round(voice.onsetMs*sampleRate/1000),n=Math.round(voice.durationMs*sampleRate/1000);
    for(let j=0;j<n && begin+j<count;j++){
      const q=j/n,sec=j/sampleRate,duration=voice.durationMs/1000;
      const env=smooth(0,.035,q)*(1-smooth(.40,1,q));
      const cycles=voice.startHz*sec+.5*(voice.endHz-voice.startHz)*sec*sec/duration;
      let v=0;for(const [ratio,weight]of voice.partials)v+=Math.sin(2*Math.PI*cycles*ratio)*weight;
      v*=env*voice.amplitude;
      left[begin+j]+=v*Math.sqrt((1-voice.pan)/2);right[begin+j]+=v*Math.sqrt((1+voice.pan)/2);
    }
  }
  // End boundary is exactly zero; no loop, reverb node or oscillator can survive the record.
  left[count-1]=0;right[count-1]=0;return {sampleRate,left,right,durationMs:1200};
}
/** Returns cleanup; muted/verify receipts are consumed and never replayed on unlock. */
export function createSfxPlayer(audioContext,{verify=false}={}) {
  const fired=new Set(),nodes=new Set();let cached=null;
  return {play(record,{muted=false,nowMs=record.receivedAtMs}={}){
    if(fired.has(record.receiptKey))return 'duplicate';fired.add(record.receiptKey);
    if(verify||muted)return 'muted';
    if(audioContext.state!=='running')return 'gesture-required-consumed';
    const q=phaseAt(record,nowMs);if(!q.alive)return 'expired';
    if(!cached){const pcm=synthesizeSfx(audioContext.sampleRate);cached=audioContext.createBuffer(2,pcm.left.length,pcm.sampleRate);cached.copyToChannel(pcm.left,0);cached.copyToChannel(pcm.right,1);}
    const node=audioContext.createBufferSource();node.buffer=cached;node.connect(audioContext.destination);
    nodes.add(node);node.onended=()=>{nodes.delete(node);node.disconnect();};
    node.start(audioContext.currentTime,q.ageMs/1000);node.stop(audioContext.currentTime+(1200-q.ageMs)/1000);return 'started';
  },stop(){for(const n of nodes){try{n.stop();}catch{}n.disconnect();}nodes.clear();},resetSession(){this.stop();fired.clear();}};
}
