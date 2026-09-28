import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEvent,EventLedger} from '../src/contract.mjs';
import {ActorClock,ActorClockBank,LatestSubmissionGate} from '../src/actor-clock.mjs';
import {sampleEffect,packedSamples,sampleLocalLightAt,sourcePositions} from '../src/sampler.mjs';
import {voiceCursor,OneCauseVoices,playerClockKey} from '../src/voice-kernel.mjs';
import {synthesizeSFX,encodeWAV} from '../src/sfx-synth.mjs';
import {EPlayer} from '../src/e-player.mjs';
const make=(kind=0,extra={})=>({eventId:kind?'action-ninjutsu-focus':'action-rational-free',causeId:'cause-1',playerId:'P1',x:72.125,y:-41.25,radius:kind?115:145,actorStartMs:1000,lifetimeActorMs:1200,...(kind?{targetId:''}:{}),...extra});
const geometry=s=>Object.fromEntries(Object.entries(s).filter(([k])=>!['sourceEvent','causeId','playerId'].includes(k)));

test('正規ID・playerIdの型・座標・時刻と未知の上流fieldを保持',()=>{
 const raw=make(1,{playerId:0,targetId:41,metadata:{authoritative:true}}),e=validateEvent(raw);
 assert.deepEqual(e,raw);assert.notEqual(e,raw);assert(Object.isFrozen(e.metadata));
});
test('不正イベントを勝手に修復・正規化しない',()=>{
 for(const patch of [{eventId:'rational'},{radius:144},{x:NaN},{actorStartMs:-1},{lifetimeActorMs:4000},{playerId:''}])assert.throws(()=>validateEvent(make(0,patch)));
 assert.throws(()=>validateEvent(make(1,{targetId:null})));
});
test('1200 actor-msの半開区間。未来も終了後も描かない',()=>{
 for(const kind of [0,1]){const e=make(kind);for(const t of [999,2200,5000])assert.equal(sampleEffect(e,t).active,false);for(const t of [1000,1001,2199.999])assert.equal(sampleEffect(e,t).active,true);}
});
test('targetIdが空でも有効IDでも全寿命の画素入力が同一',()=>{
 for(let age=0;age<=1200;age++){
  const a=sampleEffect(make(1,{targetId:''}),1000+age),b=sampleEffect(make(1,{targetId:'enemy-123'}),1000+age);
  assert.deepEqual(geometry(a),geometry(b));if(a.active)assert.deepEqual(packedSamples([a]),packedSamples([b]));
 }
});
test('回復量・MP残量・4秒期限がEの形・寿命に介入しない',()=>{
 for(const kind of [0,1])assert.deepEqual(geometry(sampleEffect(make(kind),1600)),geometry(sampleEffect(make(kind,{mp:999,preparationDeadlineActorMs:5000,kill:true}),1600)));
});
test('同原因再送は全寿命後でも一件。同IDの内容差は拒否',()=>{
 const l=new EventLedger(),e=make();assert(l.accept(e,1000).accepted);assert.equal(l.accept(e,1100).reason,'duplicate');assert.equal(l.accept(e,8000).reason,'duplicate');assert.throws(()=>l.accept({...e,x:73},1000));assert.equal(l.all().length,1);
});
test('900 ms遅着は900 ms相へ。寿命を受信時から再起動しない',()=>{
 const l=new EventLedger(),e=make();assert.equal(l.accept(e,1900).reason,'accepted');assert.equal(sampleEffect(e,1900).ageActorMs,900);assert.equal(l.active(2200).length,0);
 assert.equal(new EventLedger().accept(e,2400).reason,'expired_on_arrival');
});
test('未来イベントの同時枠を予約。境界時刻で終了と開始が重複しない',()=>{
 const l=new EventLedger({simultaneous:2});l.accept(make(0,{causeId:'a',actorStartMs:5000}),0);l.accept(make(0,{causeId:'b',actorStartMs:5000}),0);
 assert.throws(()=>l.accept(make(0,{causeId:'c',actorStartMs:5001}),0));assert(l.accept(make(0,{causeId:'d',actorStartMs:6200}),0).accepted);
});
test('actor速度変更・停止で時刻連続。二つのplayer時計を分離',()=>{
 let wall=0;const a=new ActorClock({wallNow:()=>wall}),b=new ActorClock({wallNow:()=>wall});const bank=new ActorClockBank().add('P1',a).add('P2',b);
 wall=300;a.setRate(0);b.setRate(.5);wall=900;assert.equal(bank.now('P1'),300);assert.equal(bank.now('P2'),600);
 a.setRate(2);wall=1000;assert.equal(bank.now('P1'),500);assert.equal(bank.now('P2'),650);assert.throws(()=>bank.now('unknown'));
});
test('playerIdの数値1と文字列1を混同しない',()=>assert.notEqual(playerClockKey(1),playerClockKey('1')));
test('遅いGPU提出では待機後に最新時刻を読む',async()=>{
 let release,now=140,seen=[];const g=new LatestSubmissionGate({delay:()=>new Promise(r=>release=r),submit:async f=>seen.push(f),onError:e=>{throw e;}});
 const promise=g.request(()=>sampleEffect(make(0,{actorStartMs:0}),now));now=1100;g.request(()=>sampleEffect(make(0,{actorStartMs:0}),now));release();await promise;
 assert.equal(seen.length,1);assert.equal(seen[0].ageActorMs,1100);
});
test('GPU待機中に寿命が尽きたEを0 msで復活させない',async()=>{
 let release,now=10,seen;const g=new LatestSubmissionGate({delay:()=>new Promise(r=>release=r),submit:async f=>seen=f});
 const p=g.request(()=>sampleEffect(make(0,{actorStartMs:0}),now));now=1400;release();await p;assert.equal(seen.active,false);
});
test('EPlayerは各playerの時計をサンプルし、原因を音声へ一回だけ送る',()=>{
 const times={P1:1150,P2:1700},voiced=[];const player=new EPlayer({clockProvider:{now:id=>times[id]},renderer:{draw:()=>{}},audio:{accept:e=>voiced.push(e.causeId),sync:()=>{}}});
 const a=make(),b=make(1,{playerId:'P2',causeId:'cause-2'});player.receive(a);player.receive(b);player.receive(a);
 assert.deepEqual(player.readSnapshot().samples.map(s=>s.ageActorMs),[150,700]);assert.equal(voiced.length,2);
});
test('二つの主時間構造は同一曲線の色替えではない',()=>{
 const r=sampleEffect(make(),1156),n=sampleEffect(make(1),1156);
 assert(r.peak>.99);assert(n.peak<.01);assert.equal(r.phase,'release');assert.equal(sampleEffect(make(1),1610).phase,'tension_gather');
});
test('全寿命のsource位置・field値は有限でradius内',()=>{
 for(const kind of [0,1])for(let age=0;age<1200;age++){
   const s=sampleEffect(make(kind),1000+age);for(const f of [s.gate,s.shape,s.peak,s.glare,s.stress])assert(Number.isFinite(f)&&f>=0);
   for(const p of sourcePositions(s))assert(Math.hypot(p.x-s.x,p.y-s.y)<s.radius);
   const light=sampleLocalLightAt(s,s.x,s.y);assert(light.every(v=>Number.isFinite(v)&&v>=0));
 }
});
test('reduced motionは寿命・IDを保ち、指定した変位だけを変更',()=>{
 const e=make(1),a=sampleEffect(e,1150),b=sampleEffect(e,1150,{reducedMotion:true});assert.equal(a.ageActorMs,b.ageActorMs);assert.equal(a.causeId,b.causeId);assert.equal(a.gate,b.gate);assert.notEqual(a.shape,b.shape);
});
test('音声カーソルはactor基準でseek・停止・再開、1200で終端',()=>{
 const e=make();assert.equal(voiceCursor(e,{actorMs:1900,audioSec:10,rate:1},10,48000),43200);assert.equal(voiceCursor(e,{actorMs:1400,audioSec:10,rate:0},20,48000),19200);assert.equal(voiceCursor(e,{actorMs:2000,audioSec:10,rate:2},10.1,48000),null);
});
test('一原因一声。終了済み原因も再発音しない',()=>{
 const p=new OneCauseVoices(),e=make(),pcm=synthesizeSFX(e.eventId);assert(p.add(e,pcm));assert.equal(p.add(e,pcm),false);p.prune(2200);assert.equal(p.voices.size,0);assert.equal(p.add(e,pcm),false);
});
test('PCMは両E固有・決定的・stereo 48k/1.2秒・無クリップ',()=>{
 const p=synthesizeSFX('action-rational-free'),q=synthesizeSFX('action-ninjutsu-focus');assert.equal(p.left.length,57600);assert.equal(q.left.length,57600);assert.deepEqual(p.left,synthesizeSFX(p.eventId).left);assert.notDeepEqual(p.left,q.left);
 for(const pcm of [p,q]){for(const channel of [pcm.left,pcm.right]){let peak=0;for(const n of channel){assert(Number.isFinite(n));peak=Math.max(peak,Math.abs(n));}assert(peak<.681);assert.equal(channel[0],0);assert.equal(channel.at(-1),0);}assert.equal(encodeWAV(pcm).length,230444);}
});
test('WGSLの符号付き二乗をpowへ渡さず、明示的なx*xで評価',async()=>{
 const {readFile}=await import('node:fs/promises');const shader=await readFile(new URL('../shaders/effects.wgsl',import.meta.url),'utf8');
 assert(shader.includes('fn sq(x:f32)->f32 {return x*x;}'));
 assert(shader.includes('sq(-.10/.66)'));assert(shader.includes('sq((d-.027)/.013)'));
 assert(!shader.includes('pow(-.10/.66,2)')); // 字句上の回帰検査でありshader compilerではない。
});
