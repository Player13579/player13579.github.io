/** 描画境界の検査のみ。クールダウン、MP、対象有効性、命中を判定しない。 */
export const EFFECTS = Object.freeze({
  'action-rational-free': Object.freeze({kind: 0, radius: 145, lifetimeActorMs: 1200, label: '支払い拘束の解除'}),
  'action-ninjutsu-focus': Object.freeze({kind: 1, radius: 115, lifetimeActorMs: 1200, label: '術者局所の張力収束'})
});
const idOK = (id, empty=false) => (typeof id === 'string' && (empty || id.length>0)) || (Number.isSafeInteger(id) && id >= 0);
export function validateEvent(raw) {
  if (!raw || typeof raw !== 'object' || !Object.hasOwn(EFFECTS, raw.eventId)) throw new TypeError('非対応のeventId');
  if (typeof raw.causeId !== 'string' || !raw.causeId.length) throw new TypeError('一原因を識別するcauseIdが必要');
  if (!idOK(raw.playerId)) throw new TypeError('playerIdを空にできない');
  for (const key of ['x','y','actorStartMs']) if (!Number.isFinite(raw[key])) throw new TypeError(`${key}は有限数`);
  if (raw.actorStartMs<0) throw new RangeError('actorStartMsは非負');
  const spec=EFFECTS[raw.eventId];
  if (raw.radius!==spec.radius) throw new RangeError('radiusの契約不一致。勝手に補正しない');
  if (raw.lifetimeActorMs!==undefined && raw.lifetimeActorMs!==1200) throw new RangeError('E寿命は1200 actor-ms');
  if (raw.eventId==='action-ninjutsu-focus' && !idOK(raw.targetId,true)) throw new TypeError('targetIdは上流IDまたは空文字');
  const cloned=structuredClone(raw);
  // 未知fieldも不変な受信記録として保持。ただし描画や権威判定には使わない。
  return deepFreeze(cloned);
}
export function deepFreeze(value) {
  if (value && typeof value==='object') {Object.freeze(value); for (const x of Object.values(value)) deepFreeze(x);}
  return value;
}
export function stableJSON(v) {
  if (Array.isArray(v)) return '['+v.map(stableJSON).join(',')+']';
  if (v && typeof v==='object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stableJSON(v[k])).join(',')+'}';
  return JSON.stringify(v);
}
export class EventLedger {
  constructor({capacity=4096, simultaneous=32}={}) {this.records=new Map();this.capacity=capacity;this.simultaneous=simultaneous;}
  accept(raw, actorNowMs) {
    if (!Number.isFinite(actorNowMs)) throw new TypeError('actorNowMsは有限数');
    const event=validateEvent(raw), old=this.records.get(event.causeId), fingerprint=stableJSON(event);
    if (old) {
      if (old.fingerprint!==fingerprint) throw new Error('causeId衝突。受信値の変更を拒否');
      return {accepted:false,reason:'duplicate',event:old.event};
    }
    if (this.records.size>=this.capacity) throw new RangeError('ledger満杯。明示的な新セッションが必要');
    // 未来イベントも予約区間を検査。同じplayerのactor時計内だけを比較する。
    // 他playerの時計を一つの時刻として比較しない。GPU全体上限はreadSnapshotで検査する。
    if (actorNowMs < event.actorStartMs+1200) {
      const start=Math.max(actorNowMs,event.actorStartMs), end=event.actorStartMs+1200;
      const points=[[start,1],[end,-1]];
      for(const {event:e} of this.records.values())if(e.playerId===event.playerId){
        const a=Math.max(start,e.actorStartMs),b=Math.min(end,e.actorStartMs+1200);
        if(a<b)points.push([a,1],[b,-1]);
      }
      points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let count=0;
      for(const [,delta] of points){count+=delta;if(count>this.simultaneous)throw new RangeError('同時発生上限。未来予約も含め明示拒否');}
    }
    this.records.set(event.causeId,{event,fingerprint});
    return {accepted:true,reason:actorNowMs>=event.actorStartMs+1200?'expired_on_arrival':'accepted',event};
  }
  active(now) {
    if (typeof now!=='function'&&!Number.isFinite(now)) throw new TypeError('actor timeは有限数またはplayer別resolver');
    return [...this.records.values()].map(r=>r.event).filter(e=>{const t=typeof now==='function'?now(e.playerId):now;return t>=e.actorStartMs && t<e.actorStartMs+1200;});
  }
  all() {return [...this.records.values()].map(r=>r.event);}
}
