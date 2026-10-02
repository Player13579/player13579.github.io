// All attack/outcome/light3D values below are hypothetical preview inputs.
// Approved physical source hashes/anchors are factual; no game receipt asserted.
import fs from 'node:fs';
export const physical = JSON.parse(fs.readFileSync(new URL('../motion-male-left/playback-fixture.json',import.meta.url),'utf8'));
export function makePreview() {
  return {
    receipt:{schema:'preview-rpg-use-r1',provenance:'hypothetical-preview-only',causeId:'preview-rpg-cast-1',
      roomId:'preview-room',sessionGeneration:1,actorId:'preview-male-bot',soundId:'preview-linked-sound-1',
      localDurationMs:1200,eClockRoomId:'preview-room',eClockStartedAt:1000,
      source:{id:'preview-magic-rpg-1',type:'gunner-rpg',variant:'normal',radius:300,durationMs:0,
        playerId:'preview-male-bot',x:500,y:700,at:1_800_000_000_000,targetX:200,targetY:700},
      attempts:[{id:'preview-attempt-1',causeId:'preview-rpg-cast-1',position:{x:260,y:650},outcome:'preview-physical-impact',visible:true},
        {id:'preview-attempt-2',causeId:'preview-rpg-cast-1',position:{x:490,y:530},outcome:'preview-defended',visible:true}],
      lightPositions:{'preview-magic-rpg-1':{x:457,y:624,z:45},'preview-attempt-1':{x:260,y:650,z:20}}},
    poseLease:{identity:'male-bot',direction:'left',motionId:'gunner-rpg',actorId:'preview-male-bot',
      sourceEffectId:'preview-magic-rpg-1',causeId:'preview-rpg-cast-1',ground:{x:500,y:700},scale:112/1180,
      poseHashes:physical.frames.map(frame=>frame.sha256)},
    rawActorClock:1020,motionAgeMs:20,
    context:{roomId:'preview-room',sessionGeneration:1,phase:'playing',hidden:false,sensoryBlocked:false,sourceVisible:true}
  };
}
