const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

let laws;
test('load fixture laws', async () => {
  laws = await import('../public/server-room-object-interaction-r1/fixture-laws.mjs');
});

test('input normalizes combined keyboard and clamps analog contribution', () => {
  const diagonal=laws.normalizedInput({right:true,up:true});
  assert.ok(Math.abs(diagonal[0]-Math.SQRT1_2)<1e-12&&Math.abs(diagonal[1]+Math.SQRT1_2)<1e-12);
  assert.deepEqual(laws.normalizedInput({},[3,4]), [.6,.8]);
  assert.deepEqual(laws.normalizedInput({},[NaN,Infinity]), [0,0]);
});

test('swept circle respects narrow doorway and slides along wall', () => {
  const radius=laws.PLAYER_RADIUS_IMAGE;
  assert.equal(laws.circleInsideWalkable([668,850],radius),true);
  assert.equal(laws.circleInsideWalkable([540,900],radius),false);
  const moved=laws.sweepCircleMove([668,900],[-400,0],{radius});
  assert.ok(moved.position[0]>=577+radius-0.01);
  assert.equal(laws.circleInsideWalkable(moved.position,radius),true);
});

test('registered screen homographies map exact quad corners to unit UV', () => {
  for(const quad of laws.SCREEN_FACES){
    const inverse=laws.invertHomography(laws.unitSquareToQuad(quad));
    const mapped=quad.map(point=>laws.mapQuadUv(inverse,point));
    const expected=[[0,0],[1,0],[1,1],[0,1]];
    for(let i=0;i<4;i++)for(let axis=0;axis<2;axis++)assert.ok(Math.abs(mapped[i][axis]-expected[i][axis])<1e-8);
  }
});

test('source family has finite source envelope and activation pulses', () => {
  assert.equal(laws.sourceEnvelope(-.01),0);
  assert.equal(laws.sourceEnvelope(1.45),0);
  assert.equal(laws.sourceEnvelope(.5),1);
  assert.equal(laws.consoleSweep(.5,0,.5),1);
  assert.ok(laws.rackPulse(.22,0)>.99);
  assert.equal(laws.greenPulse(1.05),1);
});

test('activation rim uses the selected whole-object contours and finite approved profile', () => {
  const consoleContour=laws.ACTIVATION_RIM.contours['gallery-server-console-1'];
  const rackContour=laws.ACTIVATION_RIM.contours['gallery-server-rack-1'];
  assert.equal(consoleContour.length,18);assert.equal(rackContour.length,8);
  assert.ok(laws.signedPolygonDistance([700,180],consoleContour)<0);
  assert.ok(laws.signedPolygonDistance([500,500],consoleContour)>0);
  assert.ok(laws.signedPolygonDistance([1150,700],rackContour)<0);
  assert.ok(laws.rimEnvelope(180)>.99);
  assert.equal(laws.rimEnvelope(0),0);assert.equal(laws.rimEnvelope(1450),0);
  assert.deepEqual(laws.rimRadianceAtSignedDistance(1,180),[0,0,0]);
  assert.deepEqual(laws.rimRadianceAtSignedDistance(-4,180),[0,0,0]);
  assert.ok(laws.rimRadianceAtSignedDistance(-1,180)[2]>0);
});

test('implemented rim law matches the exact frozen Sol design fence over representative phases/distances', async () => {
  const repo=path.resolve(__dirname,'../../../../../..');
  const design=fs.readFileSync(path.join(repo,'outputs/request-20261001/map-object-benefit-interaction/DESIGN.md'),'utf8');
  const start=design.indexOf('export const ACTIVATION_RIM');
  const end=design.indexOf('\n```',start);
  assert.ok(start>=0&&end>start,'approved activation-rim code fence is present');
  const spec=await import(`data:text/javascript;base64,${Buffer.from(design.slice(start,end)).toString('base64')}`);
  assert.deepEqual(laws.ACTIVATION_RIM.contours,spec.ACTIVATION_RIM.contours);
  for(const age of [0,1,50,100,180,360,600,780,1100,1449,1450]){
    assert.ok(Math.abs(laws.rimEnvelope(age)-spec.rimEnvelope(age))<1e-12,`envelope age ${age}`);
    for(const distance of [-4,-3,-2.5,-1,-.85,-.1,0,.01,1]){
      const actual=laws.rimRadianceAtSignedDistance(distance,age),expected=spec.rimRadianceAtSignedDistance(distance,age);
      for(let channel=0;channel<3;channel++)assert.ok(Math.abs(actual[channel]-expected[channel])<1e-12,`rim ${distance}px at ${age}ms`);
    }
  }
});

test('only successful fixture activation mutates state; duplicate source/outcome replay is harmless', () => {
  const ledger=laws.createLedger('session-a'),object=laws.OBJECTS[0];
  assert.equal(laws.grantFixture(ledger,object,10,{eligible:false}).status,'ineligible');
  assert.equal(ledger.state.luckBonus,0);
  const grant=laws.grantFixture(ledger,object,10);
  assert.equal(grant.status,'granted');
  assert.equal(grant.state.luckBonus,.15);
  assert.equal(grant.sourceCause.authoritativeGameplayReceipt,false);
  assert.equal(grant.sourceCause.benefitResult,'changed');
  assert.equal(grant.sourceCause.transactionId,grant.sourceCause.grantId.replace('grant','fixture-tx'));
  assert.equal(grant.sourceCause.durationEms,laws.ACTIVATION_RIM.durationEms);
  assert.equal(laws.admitCauseSnapshot(ledger,grant.sourceCause),false);
  assert.equal(laws.grantFixture(ledger,object,11).status,'spent-until-rearm');
  assert.equal(ledger.state.luckBonus,.15);
  laws.rearmObject(ledger,object.id);
  assert.equal(laws.grantFixture(ledger,object,12).status,'cooldown');
  assert.equal(ledger.tombstones.has(grant.sourceCause.causeId),true);
});

test('cause replay with contradictory outcome is rejected', () => {
  const ledger=laws.createLedger('session-b'),grant=laws.grantFixture(ledger,laws.OBJECTS[1],100);
  const altered={...grant.sourceCause,afterValue:999};
  assert.throws(()=>laws.admitCauseSnapshot(ledger,altered),/contradictory/);
});

test('rack outcome adds credits exactly and expiry remains finite', () => {
  const ledger=laws.createLedger('session-c'),grant=laws.grantFixture(ledger,laws.OBJECTS[1],0);
  assert.equal(grant.state.credits,3);
  assert.equal(grant.sourceExpiresAt,1450);
  assert.equal(grant.cooldownUntil,40000);
});

test('packaged adopted original, frozen r04 shader and actual actor bytes are source-pinned', () => {
  const root=path.resolve(__dirname,'..');
  const packageDir=path.join(root,'public/server-room-object-interaction-r1');
  const sourceDir=path.join(root,'public/sol61-server-room-e/r04');
  const pairs=[
    [path.join(packageDir,'assets/security-room-r01-original.png'),path.join(sourceDir,'security-room-r01-original.png'),'b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64'],
    [path.join(packageDir,'assets/security-room-r04.wgsl'),path.join(sourceDir,'security-room-r04.wgsl'),'ef98ef34b532295b694cf487ef8bd33fa548c777ff8ee12c4094869cb345da0d'],
    [path.join(packageDir,'assets/philia-front-nine-v752.png'),path.join(root,'assets/generated/philia-front-nine-v752.png'),'4f1901dfd275bfec01b6f4fd7da66f190e0b2396320de2fb36cc20a5e36490a3'],
  ];
  for(const [packaged,canonical,expected] of pairs){
    const a=fs.readFileSync(packaged),b=fs.readFileSync(canonical);
    assert.deepEqual(a,b,`${path.basename(packaged)} must be an unchanged copy`);
    assert.equal(crypto.createHash('sha256').update(a).digest('hex'),expected);
  }
});
