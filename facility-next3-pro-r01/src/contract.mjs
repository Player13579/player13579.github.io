/** 正規イベント以外の施設をtype一致だけで置換しない。 */
const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
export const LIFE_MS = 2200;
export const MAX_EVENTS = 32;
export const MAX_CAUSES = 65536; // tombstoneは消去しない。上限時は新規演出のみ拒否。
export const MASK_SIZE = 128;
export const FACILITIES = freeze([
  {objectId:'v302-security-cameraTripod-2',type:'cameraTripod',area:'security',x:1802,y:691,kind:'object-cameraTripod',effectKind:'luckBoost',benefit:{amount:0.15,durationMs:20000},cooldownMs:36000,interactive:true,useRange:128,footprint:[110,76],index:0,name:'焦点契約'},
  {objectId:'v302-observatory-holoProjector-1',type:'holoProjector',area:'observatory',x:2230,y:330,kind:'object-holoProjector',effectKind:'luckBoost',benefit:{amount:0.20,durationMs:20000},cooldownMs:38000,interactive:true,useRange:128,footprint:[110,76],index:1,name:'視差架構'},
  {objectId:'v302-observatory-readingLamp-2',type:'readingLamp',area:'observatory',x:2760,y:330,kind:'object-readingLamp',effectKind:'mana',benefit:{amount:1,durationMs:0},cooldownMs:26000,interactive:true,useRange:128,footprint:[110,76],index:2,name:'一滴の充填'}
]);
export const byId = id => FACILITIES.find(f=>f.objectId===id);
export const validId = x => typeof x==='string' && x.length>0 && x.length<=192 && !/[\x00-\x1f]/u.test(x);
export const causeKey = (scope,cause) => JSON.stringify([scope.roomId,scope.matchId,cause]);
export function validScope(s) {return s && validId(s.roomId)&&validId(s.matchId)&&Number.isSafeInteger(s.epoch)&&s.epoch>=0;}
export function validateMagic(r) {
  if (!r || typeof r!=='object') return {ok:false,reason:'invalid_receipt'};
  const f=byId(r.objectId);
  if (!f) return {ok:false,reason:'unmanaged_object'};
  if(r.type!=='magicEffect'||r.kind!==f.kind||r.effectKind!==f.effectKind) return {ok:false,reason:'kind_mismatch'};
  if(r.x!==f.x||r.y!==f.y||!Number.isSafeInteger(r.x)||!Number.isSafeInteger(r.y)) return {ok:false,reason:'source_mismatch'};
  if(!validId(r.playerId)||!validId(r.objectCausalId)) return {ok:false,reason:'invalid_identity'};
  if(r.durationMs!==undefined) return {ok:false,reason:'unexpected_duration'};
  const radius=r.radius===undefined?100:r.radius;
  if(!Number.isFinite(radius)||radius<=0||radius>4096) return {ok:false,reason:'radius_outside_supported_range'};
  return {ok:true,facility:f,radius};
}
export function validateSound(r) {
  const f=byId(r?.objectId);
  if(!f)return {ok:false,reason:'unmanaged_object'};
  if(r.type!=='sound'||r.kind!=='object'||r.maxDistance!==720||r.volume!==0.7||!validId(r.ownerId)||!validId(r.objectCausalId)) return {ok:false,reason:'sound_contract_mismatch'};
  return {ok:true,facility:f};
}
export function worldToScreen(x,y,view) {
  return [(x-view.cameraX)*view.zoom+view.width/2,(y-view.cameraY)*view.zoom+view.height/2];
}
export function intersectsView(e,view) {
  if(!validView(view))return false;
  const [x,y]=worldToScreen(e.x,e.y,view), r=e.radius*view.zoom;
  return x+r>=0&&x-r<=view.width&&y+r>=0&&y-r<=view.height;
}
export function validView(v) {
  return v && [v.cameraX,v.cameraY,v.width,v.height,v.zoom].every(Number.isFinite)&&v.width>0&&v.height>0&&v.zoom>0;
}
export function stableSeed(id){ let h=2166136261;for(const c of id){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296; }
