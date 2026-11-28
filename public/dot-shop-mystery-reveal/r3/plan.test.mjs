import {strict as a} from 'node:assert';
import {TYPE,LIFE,admit,stateAt} from './plan.mjs';
const x={type:TYPE,id:'magic_fixture',variant:'',x:12,y:34,at:1795789300000,targetId:'',targetX:null,targetY:null,playerId:'fixture',radius:145,durationMs:0},ctx={owner:'fixture',now:x.at};
a.deepEqual(admit(x,ctx),{id:x.id,at:x.at,x:12,y:34,age:0});
a.deepEqual(admit({...x,result:'任意',amount:999},ctx),admit(x,ctx));
for(const p of [{type:'mystery-box'},{type:'instant-mystery-acquired'},{type:'action-vending'},{type:'gain-credits'},{type:'action-vibe-coding'},{variant:'jackpot'},{variant:undefined},{radius:90},{durationMs:2200},{targetX:0},{targetId:'b'},{playerId:'other'},{at:x.at-LIFE},{at:x.at+126}])a.equal(admit({...x,...p},ctx),null);
const {receipt,fixtureReceipt,Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
a.ok(receipt(fixtureReceipt('test')));
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(),v=buildReceipt(m,{},t,{reduced}),r=stateAt(t,{reduced});for(const k of ['alpha','opening','mark'])a.ok(r[k]>=0&&r[k]<=1);
 a.ok(v.triangles<=190);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));
 if(t<=0||t>=LIFE)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('14 excluded source cases; 2082 finite meshes; six audio rates');
const shape=(e,t,reduced)=>{const m=new Mesh(),q=buildReceipt(m,e,t,{reduced});return [q,Array.from(m.data.subarray(0,m.length))];};
const spread=(t,reduced)=>{const ys=shape({},t,reduced)[1].filter((_,i)=>i%8===1);return Math.max(...ys)-Math.min(...ys);};
a.ok(spread(155,false)>spread(392,false)+.18);
a.ok(Math.abs(spread(155,true)-spread(392,true))<1e-7);
for(const extra of [{result:'win',price:400,amount:29},{result:'lose',price:0,amount:0,itemId:'rare-fixture'}])
 for(const t of [44,154,291,392,650,1039])
 for(const m of [false,true])a.deepEqual(shape(admit({...x,...extra},ctx),t,m),shape(admit(x,ctx),t,m));
console.log('24 exact outcome/price/amount invariants; motion reduces to fixed stroke');
