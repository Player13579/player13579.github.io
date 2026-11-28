import {strict as a} from 'node:assert';
import {TYPE,LIFE,admit,stateAt} from './plan.mjs';
const e={type:TYPE,id:'magic_receipt',variant:'hacker-auto',mode:'download',x:12,y:34,at:1795789900000,targetId:'remote',targetX:700,targetY:400,playerId:'fixture',radius:105,durationMs:0},ctx={owner:'fixture',now:e.at};
const out=admit(e,ctx);a.deepEqual(out,{id:e.id,at:e.at,x:12,y:34,age:0});
a.deepEqual(admit({...e,mode:'upload',targetId:'other',targetX:5,targetY:11,label:'unchecked',amount:1000},ctx),out);
for(const p of [{variant:''},{variant:'manual'},{type:'instant-hack-acquired'},{type:'gain-credits'},{type:'hacker-root'},{playerId:'other'},{mode:'tool-install'},{radius:104},{durationMs:105},{id:'abc'},{x:NaN},{at:e.at-LIFE},{at:e.at+126}])a.equal(admit({...e,...p},ctx),null);
for(const reduced of [false,true])for(let t=-1;t<=LIFE;t++){
 const q=stateAt(t,{reduced});
 for(const k of ['spread','hold','alpha'])a.ok(q[k]>=0&&q[k]<=1);
 if(t<=0||t>=LIFE)a.equal(q.alpha,0);
}
console.log('13 exclusions; same display for upload/download; coordinates of station and reward stripped; 2084 bounded phases');
const {receipt,fixtureReceipt,Mesh,buildReceipt,fillSfx}=await import('./effect.mjs');
a.ok(receipt(fixtureReceipt('test')));
for(const reduced of [false,true])for(let t=0;t<=LIFE;t++){
 const m=new Mesh(),v=buildReceipt(m,{},t,{reduced});
 a.ok(v.triangles<=64);a.ok(m.data.subarray(0,m.length).every(Number.isFinite));
 if(t<=0||t>=LIFE)a.equal(v.triangles,0);
}
for(const rate of [8000,16000,22050,44100,48000,96000]){
 const {data,peak}=fillSfx(rate);a.ok(peak>.025&&peak<.15&&data.every(Number.isFinite));a.equal(Math.abs(data[0]),0);a.equal(Math.abs(data.at(-1)),0);
}
console.log('2082 finite meshes; six finite sound sample rates; span remains local');
const draw=(e,t,reduced=false)=>{const g=new Mesh();buildReceipt(g,e,t,{reduced});return [...g.data.subarray(0,g.length)]};
const xy=g=>g.filter((_,i)=>i%8<2);
const {clothFold}=await import('./effect.mjs');
const widths=t=>clothFold(stateAt(t),.5,1)[0]-clothFold(stateAt(t),.5,0)[0];
a.ok(widths(110)<widths(280)&&widths(280)>widths(660));
for(const u of [0,.25,.75,1])a.deepEqual(clothFold(stateAt(120),u,0),clothFold(stateAt(550),u,0));
a.deepEqual(xy(draw(out,150,true)),xy(draw(out,820,true)));
for(const t of [154,330,500,820])for(const reduced of [true,false]){
 const privateFields=admit({...e,mode:'upload',targetId:'sensitive',outcome:'other',amount:500,remaining:16,targetX:5252,targetY:29},ctx);
 a.deepEqual(draw(privateFields,t,reduced),draw(out,t,reduced));
}
console.log('same chest seam while one side opens and folds, reduced stationary, eight outcome/position variance checks');
