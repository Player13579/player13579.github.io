import {PROFILES, LIMITS} from './profiles.js';
const finite = (v,name) => { if(!Number.isFinite(v)) throw new TypeError(`${name}は有限数が必要`); };
const text = (v,name) => { if(typeof v!=='string'||v.length<1||v.length>240) throw new TypeError(`${name}は1〜240字の文字列が必要`); };
/**
 * @typedef {'handgun'|'smg'|'assault'|'sniper'|'taser'} Variant
 * @typedef {{type:'action-shoot',id:string,playerId:string,x:number,y:number,
 * targetX:number,targetY:number,variant:Variant,radius:number,occurredAt:number}} ShootEvent
 * @typedef {{roomId:string,epoch:number,muzzle:{x:number,y:number,depth:number,
 * sourceId:string,at:number},endDepth:number,pathLimitT?:number}} ShotContext
 */
/** 固定銃口offset、射手位置へのfallback、命中推定は一切行わない。 */
export function normalizeShot(event,context) {
  if (!event||event.type!=='action-shoot') throw new TypeError('type=action-shootが必要');
  text(event.id,'id');text(event.playerId,'playerId');
  for(const k of ['x','y','targetX','targetY','radius','occurredAt']) finite(event[k],k);
  if(event.radius<0||event.occurredAt<0) throw new RangeError('radius / occurredAtは非負');
  if(!Object.hasOwn(PROFILES,event.variant)) throw new TypeError('variantが不正');
  if(!context?.muzzle) throw new TypeError('ゲーム側の実muzzle world座標が必要');
  text(context.roomId,'roomId');
  if(!Number.isSafeInteger(context.epoch)||context.epoch<0) throw new TypeError('epochが不正');
  const m=context.muzzle;
  for(const k of ['x','y','depth','at']) finite(m[k],`muzzle.${k}`);
  if(m.sourceId!==event.id) throw new TypeError('muzzle.sourceIdとevent.idが不一致');
  if(Math.abs(m.at-event.occurredAt)>1e-6) throw new TypeError('muzzleは発生時刻のpose snapshotでなければならない');
  finite(context.endDepth,'endDepth');
  if(m.depth<0||m.depth>1||context.endDepth<0||context.endDepth>1) throw new RangeError('depthは0〜1（小さいほど手前）');
  if(Math.abs(context.endDepth-m.depth)>1e-6) throw new RangeError('この2.5D実装では一射線は同一depth plane。交差する深度勾配は受理しない');
  const pathLimitT=context.pathLimitT??1;
  if(!Number.isFinite(pathLimitT)||pathLimitT<0||pathLimitT>1) throw new RangeError('pathLimitTは0〜1');
  const dx=event.targetX-m.x,dy=event.targetY-m.y;
  const length=Math.hypot(dx,dy);
  if(length<1e-6) throw new RangeError('銃口と有限終点が同一。向きを捏造しない');
  if(length>1e7||Math.max(Math.abs(m.x),Math.abs(m.y),Math.abs(event.targetX),Math.abs(event.targetY))>1e9)
    throw new RangeError('描画座標の精度限界を超過');
  // radiusはゲーム権威値として保存するだけ。光の幅や命中半径に読み替えない。
  return Object.freeze({event:Object.freeze({...event}),context:Object.freeze({...context,muzzle:Object.freeze({...m}),pathLimitT}),
    id:event.id,playerId:event.playerId,variant:event.variant,occurredAt:event.occurredAt,
    start:Object.freeze({x:m.x,y:m.y}),end:Object.freeze({x:m.x+dx*pathLimitT,y:m.y+dy*pathLimitT}),
    startDepth:m.depth,endDepth:m.depth+(context.endDepth-m.depth)*pathLimitT,
    fullLength:length,length:length*pathLimitT,dir:Object.freeze({x:dx/length,y:dy/length}),
    roomId:context.roomId,epoch:context.epoch,life:PROFILES[event.variant].life});
}
/** 一セッション中のid墓標は消さない。上限時はfail-closedで新規を拒否する。 */
export class SourceLedger {
  constructor(limit=LIMITS.maxLedger) { if(!Number.isSafeInteger(limit)||limit<1)throw new RangeError('ledger limit');this.limit=limit;this.items=new Map(); }
  claim(id,fingerprint='') {
    if(this.items.has(id))return {ok:false,reason:this.items.get(id)===fingerprint?'duplicate':'id_conflict'};
    if(this.items.size>=this.limit)return {ok:false,reason:'ledger_capacity'};
    this.items.set(id,fingerprint);return {ok:true};
  }
  has(id){return this.items.has(id);}
  get size(){return this.items.size;}
}
export function shotFingerprint(s) {
  // source単位の同一性。受信順・描画frameは含めない。
  return JSON.stringify([s.playerId,s.variant,s.occurredAt,s.event.x,s.event.y,s.event.targetX,s.event.targetY,
    s.event.radius,s.start.x,s.start.y,s.startDepth,s.context.endDepth,s.context.pathLimitT,s.roomId,s.epoch]);
}
