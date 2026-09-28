const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const game=require('../webgpu-status-recovery-r29-game.js');
const sfx=require('../webgpu-status-recovery-r29-sfx.js');
const viewport={kind:'main',width:640,height:360,pixelWidth:1280,pixelHeight:720};
const effect={type:'gain-statusRecovery',effectKind:'statusRecovery',id:'gain-17',playerId:'p1',startedAt:100};
const player={id:'p1',alive:true};
const command={playerId:'p1',sprite:{x:-32,y:-64,w:64,h:64,crop:[0,0,128,128],
  sourceSize:[128,128],transform:[1,0,0,1,320,180]}};

test('only the authoritative gain and visible owner enter a full 1740ms plan',()=>{
  assert.equal(game.plan({effect,player,now:1839,phase:'playing',viewport}).phase,1739/1740);
  assert.equal(game.plan({effect,player,now:1840,phase:'playing',viewport}),null);
  assert.equal(game.plan({effect:{...effect,type:'hacker-status-recover'},player,now:100,phase:'playing',viewport}),null);
  assert.equal(game.plan({effect,player:{...player,invisible:true},now:100,phase:'playing',viewport}),null);
  assert.equal(game.plan({effect,player:{...player,id:'p2'},now:100,phase:'playing',viewport}),null);
});

test('projected quad uses the submitted sprite affine and backing pixels',()=>{
  const g=game.geometry(command,viewport);
  assert.equal(g.centerX,640);assert.equal(g.centerY,296);assert.equal(g.height,128);
  assert.equal(g.dprX,2);
  assert.equal(game.geometry({...command,sprite:{...command.sprite,transform:[0,0,0,0,0,0]}},viewport),null);
});

test('r0.29 optical functions remain frozen and the game output has no opaque background',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../public/astra-status-cleanse-v1/versions/r29/field-r29.mjs'),'utf8')
    .replace(/\r\n/g,'\n');
  for(const name of ['window','gaussian','star','packet','pointOn','distribution']) {
    const start=source.indexOf(`fn ${name}(`);
    const nextFn=source.indexOf('\nfn ',start+1),fragment=source.indexOf('\n@fragment',start+1);
    const end=nextFn>=0?nextFn:fragment;
    assert.ok(start>=0 && end>start,name);
    assert.ok(game.shader.includes(source.slice(start,end)),name);
  }
  assert.ok(game.shader.includes('textureSampleLevel(actor,samp'));
  assert.ok(game.shader.includes('return vec4f(c,0.)'));
  assert.ok(!game.shader.includes('var c=mix(background,a.rgb,a.a)'));
});

test('same-frame back and front return distinct owned receipts',()=>{
  const recorded=[],buffers=[];
  const device={queue:{writeBuffer:(buffer,offset,values)=>buffers.push(values)},
    createShaderModule:()=>({}),createRenderPipeline:()=>({getBindGroupLayout:()=>({})}),
    createBuffer:()=>({destroy(){}}),createSampler:()=>({}),createBindGroup:()=>({})};
  const owner={state:'ready',device,format:'rgba8unorm',own:x=>x,release:()=>true};
  const pass=game.create({frameOwner:owner});
  const frame={stage:x=>recorded.push(x),add:x=>recorded.push(x)};
  const planned=game.plan({effect,player,now:500,phase:'playing',viewport});
  const texture={createView:()=>({})};
  const back=pass.record({frame,target:'main',viewport,planned,command,texture,side:'back'});
  const front=pass.record({frame,target:'main',viewport,planned,command,texture,side:'front'});
  assert.equal(back.side,'back');assert.equal(back.frameToken,null);
  assert.equal(front.side,'front');assert.equal(front.frameToken,1);
  assert.equal(front.id,effect.id);assert.equal(recorded.length,4);
  assert.equal(buffers[0].length,32);
  pass.destroy();
});

test('r0.29 PCM is finite, and visible receipts dedupe by cause and owner',()=>{
  const wave=sfx.synthesize(48000,1740);
  assert.equal(wave.length,83520);assert.ok(wave.peak>0 && wave.peak<1);
  assert.ok(wave.channels.every(ch=>ch.every(Number.isFinite)));
  let starts=0;
  const context={sampleRate:48000,currentTime:0,state:'running',destination:{},
    createBuffer:()=>({copyToChannel(){}}),createGain:()=>({gain:{value:0},connect(){},disconnect(){}}),
    createStereoPanner:()=>({pan:{value:0},connect(){},disconnect(){}}),
    createBufferSource:()=>({connect(){},disconnect(){},start(){starts++},stop(){}})};
  const sound=new sfx.CleanseSound({context,sessionId:'room:1'});
  const receipt={submitted:true,visible:true,effectKind:'statusRecovery',sessionId:'room:1',
    causeId:'gain-17',ownerId:'p1',frameToken:1,elapsedMs:100,durationMs:1740};
  assert.equal(sound.start(receipt),true);assert.equal(sound.start({...receipt,frameToken:2}),false);
  assert.equal(starts,1);
  const muted=new sfx.CleanseSound({context,sessionId:'room:1',verify:true});
  assert.equal(muted.start(receipt),false);
  sound.enterSession('room:2');
  assert.equal(sound.start({...receipt,sessionId:'room:2'}),true);
  assert.equal(starts,2);
  sound.stop();
});
