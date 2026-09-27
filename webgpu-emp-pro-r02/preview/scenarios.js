/** Synthetic preview authority only. Never imported by the external effect API. */
const P=(x,y=0)=>({x,y});
const emit=(kind,spec)=>({at:spec.atMs,op:'emit',kind,spec});
const resolve=(eventId,atMs,tag='resolved')=>({at:atMs,op:'resolve',spec:{commandId:`${eventId}:resolve`,eventId,atMs,outcome:tag}});
const charge=(id,owner,atMs,origin,phase=1)=>emit('charge',{id,cause:`cast:${id}`,owner,phase,pair:null,atMs,origin,authorityDeadlineMs:null});
const normal=(id,atMs,origin,position)=>emit('normal',{id,cause:`release:${id}`,owner:'actor-a',phase:1,pair:null,atMs,origin,targets:[{id:'target',position}],authorityDeadlineMs:null});
const pair=(kind,id,atMs,a,b)=>emit(kind,{id,cause:`pair-result:${id}`,owner:['actor-a','actor-b'],phase:kind==='resonance'?[1,1]:[1,-1],pair:{id:`authority:${id}`,members:[`${id}:a`,`${id}:b`],opaqueServerRevision:1},atMs,origin:P((a.x+b.x)/2,(a.y+b.y)/2),a,b,authorityDeadlineMs:atMs+1600});
const lock=(id,atMs,pos,end)=>emit('suppression',{id,cause:`hit:${id}`,owner:'actor-a',phase:1,pair:null,atMs,origin:pos,targetId:'target',authorityDeadlineMs:end,revision:0});
function prepared(kind,id,at,a=P(-150),b=P(150)){return[charge(`${id}:a`,'actor-a',at-1400,a),charge(`${id}:b`,'actor-b',at-1240,b,kind==='resonance'?1:-1),resolve(`${id}:a`,at),resolve(`${id}:b`,at),pair(kind,id,at,a,b)];}
const basicActors=[{id:'actor-a',...P(-120)},{id:'target',...P(100)}];
const pairActors=[{id:'actor-a',...P(-150)},{id:'actor-b',...P(150)},{id:'occlusion-probe',...P(0)}];
const chargeCmd=charge('held-charge','actor-a',200,P(0));
const lockCmd=lock('extended-lock',200,P(0),7200);
const extend={at:4000,op:'extend',spec:{commandId:'lock-extension-r1',eventId:'extended-lock',atMs:4000,authorityDeadlineMs:8600,revision:1}};
export const SCENARIOS={
 all:{label:'全5枝 / 原因 → 結果 → 消去',duration:10000,actors:[{id:'actor-a',...P(-120)},{id:'actor-b',...P(120)},{id:'target',...P(100,92)}],markers:{start:0,middle:4050,terminal:9440,cleared:9800},commands:[
  charge('all-first','actor-a',0,P(-120)),resolve('all-first',1400),normal('all-normal',1400,P(-120),P(100,92)),lock('all-lock',1580,P(100,92),8580),
  ...prepared('resonance','all-res',3500,P(-120),P(120)),...prepared('cancellation','all-cancel',6400,P(-120),P(120)),
  {at:4900,op:'extend',spec:{commandId:'all-lock-r1',eventId:'all-lock',atMs:4900,authorityDeadlineMs:9300,revision:1}}
 ]},
 charge:{label:'チャージ / 準備保持・権威終端',duration:4200,actors:[{id:'actor-a',...P(0)}],markers:{start:210,middle:1800,terminal:2710,cleared:3100},commands:[chargeCmd,{...chargeCmd,at:220},resolve('held-charge',2600),{...resolve('held-charge',2600),at:2640}]},
 normal:{label:'通常放出 / 有限長の転送列',duration:3000,actors:basicActors,markers:{start:1430,middle:1530,terminal:1850,cleared:2100},commands:[charge('normal-charge','actor-a',0,P(-120)),resolve('normal-charge',1400),normal('release',1400,P(-120),P(100))]},
 resonance:{label:'同位相 / 中点の状態転換',duration:4000,actors:pairActors,markers:{start:1450,middle:2090,terminal:2880,cleared:3350},commands:prepared('resonance','res',1400)},
 cancellation:{label:'逆位相 / 対向消去前線',duration:4000,actors:pairActors,markers:{start:1500,middle:2160,terminal:2860,cleared:3350},commands:prepared('cancellation','cancel',1400)},
 suppression:{label:'対象ストレージ / 継続・延長・終了',duration:10000,actors:[{id:'target',...P(0)}],motion:true,markers:{start:230,middle:7200,terminal:8740,cleared:9300},commands:[lockCmd,{...lockCmd,at:260},extend,{...extend,at:4020}]},

 'lock-resolved':{label:'ロック / 延長後の権威解決と重複',duration:5200,actors:[{id:'target',...P(0)}],motion:true,markers:{start:210,middle:2600,terminal:3330,cleared:3700},commands:[
  lock('resolved-lock',200,P(0),7200),{at:1800,op:'extend',spec:{commandId:'resolved-lock-extension',eventId:'resolved-lock',atMs:1800,authorityDeadlineMs:8800,revision:1}},
  resolve('resolved-lock',3200),{...resolve('resolved-lock',3200),at:3240}
 ]},
 'normal-resolved':{label:'通常放出 / 転送中の権威解決',duration:2800,actors:basicActors,markers:{start:1420,middle:1480,terminal:1560,cleared:1750},commands:[charge('cut-charge','actor-a',0,P(-120)),resolve('cut-charge',1400),normal('cut-normal',1400,P(-120),P(100)),resolve('cut-normal',1470)]},
 'charge-expired':{label:'チャージ / 権威期限による中止',duration:2400,actors:[{id:'actor-a',...P(0)}],markers:{start:30,middle:520,terminal:850,cleared:1200},commands:[emit('charge',{id:'expired-charge',cause:'expired-cause',owner:'actor-a',phase:1,pair:null,origin:P(0),atMs:0,authorityDeadlineMs:760})]},
 'order-forward':{label:'順序 / 共鳴 → 相殺',duration:6800,actors:pairActors,markers:{start:1400,middle:3400,terminal:5500,cleared:6200},commands:[...prepared('resonance','order-res',1400),...prepared('cancellation','order-cancel',4100)]},
 'order-reverse':{label:'順序 / 相殺 → 共鳴',duration:6800,actors:pairActors,markers:{start:1400,middle:3400,terminal:5500,cleared:6200},commands:[...prepared('cancellation','reverse-cancel',1400),...prepared('resonance','reverse-res',4100)]},
 overlap:{label:'重なり / 独立pair・早期解決',duration:4800,actors:pairActors,markers:{start:1450,middle:2050,terminal:2640,cleared:3300},commands:[...prepared('resonance','over-res',1400),pair('cancellation','over-cancel',1900,P(-150),P(150)),resolve('over-res',2100,'authority-resolved'),{...resolve('over-res',2100,'authority-resolved'),at:2120},resolve('over-cancel',2500,'authority-resolved')]},
 d0:{label:'d = 0 / 同位置の境界',duration:10000,actors:[{id:'target',...P(0)}],markers:{start:1430,middle:2940,terminal:8840,cleared:9500},commands:[charge('zero-charge','actor-a',0,P(0)),resolve('zero-charge',1400),normal('zero-normal',1400,P(0),P(0)),pair('resonance','zero-res',2300,P(0),P(0)),pair('cancellation','zero-cancel',4300,P(0),P(0)),lock('zero-lock',1580,P(0),8580)]},
 continuous:{label:'連続イベント / 重複通知・発音数',duration:10000,actors:pairActors,markers:{start:100,middle:4700,terminal:8580,cleared:9500},commands:[]}
};
for(let i=0;i<4;i++){const at=i*1950;const n=normal(`burst-${i}`,at+150,P(-120),P(100));SCENARIOS.continuous.commands.push(n,{...n,at:at+180},pair(i%2?'cancellation':'resonance',`burst-pair-${i}`,at+540,P(-150),P(150)));}
for(const s of Object.values(SCENARIOS))s.commands.sort((a,b)=>a.at-b.at);
export function dispatch(fx,c){return c.op==='emit'?fx.emit(c.kind,c.spec):c.op==='extend'?fx.extendLock(c.spec):fx.resolve(c.spec);}
export function actorsAt(scene,actorMs){return scene.actors.map(a=>scene.motion?{...a,x:a.x+Math.sin(actorMs/1900)*18,y:a.y+Math.sin(actorMs/2600)*7}:a);}
export const MATRIX_BRANCHES=['charge','normal','resonance','cancellation','suppression','order-forward','order-reverse','overlap','lock-resolved','normal-resolved','charge-expired','d0','continuous'];

/** Expected unique causes after a complete synthetic scenario. Mechanical count, not listening. */
export function expectedAudio(scene){
 const signatures=new Set(),ids=new Set();let emits=0,duplicates=0;
 for(const c of scene.commands){if(c.op!=='emit')continue;const s=c.spec;if(ids.has(s.id)){duplicates++;continue;}ids.add(s.id);if(s.sound===false)continue;emits++;
  signatures.add(JSON.stringify([c.kind,s.cause,s.owner,s.pair]));
 }
 return {uniqueCausalVoices:signatures.size,acceptedEmits:emits,duplicateEventNotifications:duplicates,resolveCreatesVoices:0,extensionCreatesVoices:0,conditions:'audio enabled before restart; no voice-capacity drop; full lifetime traversed without large frame gaps'};
}
