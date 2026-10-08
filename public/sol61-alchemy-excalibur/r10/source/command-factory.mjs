import {ATLAS} from '../inputs/bridge/source/excalibur-preview-bridge.mjs';
import {SOURCE_SUPPORT} from '../inputs/bridge/inputs/r10/excalibur-r8-creative-plan.mjs';
import {physicalMotionAffineForExcaliburR10,excaliburR10PoseIndex} from '../inputs/motion/excalibur-r10-motion.mjs';

export function releaseBoundaryFor(edition,legacy=globalThis){
  if(edition==='r10')return .52;
  if(edition==='r9'&&typeof legacy.physicalMotionSignature==='function')return legacy.physicalMotionSignature('alchemy-excalibur','slash').release;
  throw new TypeError('Exact edition and canonical R9 motion helpers required');
}
export function createPreviewCommand({edition,identity,image,source,viewport,progress,facing=1,motionScale=1,
  player={id:source?.playerId,x:viewport?.width/2,y:viewport?.height/2},spriteApi=globalThis.DvaWebGPUPlayerSprite,legacy=globalThis}={}){
  if(!['r9','r10'].includes(edition)||!ATLAS[identity]||source?.previewOnly!==true||!Number.isFinite(progress)||progress<0||progress>=1||![-1,1].includes(facing)||
    typeof spriteApi?.createCommand!=='function')throw new TypeError('Pinned edition, atlas, preview source and actual sprite producer required');
  const pose=edition==='r10'?excaliburR10PoseIndex(progress):Math.min(2,Math.max(0,Math.round(legacy.physicalActionFramePosition('slash',progress,'alchemy-excalibur'))));
  const affine=edition==='r10'?physicalMotionAffineForExcaliburR10(progress,facing,motionScale):legacy.physicalMotionAffineForExcalibur(progress,facing,motionScale);
  const [x,y,width,height]=SOURCE_SUPPORT[identity].crops[pose],pin=ATLAS[identity];
  // Exact gameplay display-size and ground registration from sealed app.js.
  const scale=Math.min(98/width,98/height)*.72;
  const assetPath=`assets/generated/physical-motion-${identity}-slash-${pin.version}-webgpu-alpha-v1.png`;
  const base=spriteApi.createCommand({player,identity,direction:facing<0?'left':'right',mode:'alchemy-excalibur-slash',
    entry:{assetPath,layout:{sourceOrigin:{x:width/2,y:height},ground:{x:0,y:31},scale}},
    image,frame:{x,y,width,height},body:{affine},camera:{x:0,y:0},zoom:1,alpha:1,order:0});
  if(!base)throw new Error('Actual registered sprite command rejected');
  const sprite=Object.freeze({...base.sprite,crop:Object.freeze([...base.sprite.crop]),sourceSize:Object.freeze([...base.sprite.sourceSize]),
    transform:Object.freeze(base.sprite.transform.map((v,i)=>facing<0&&i<2?-v:v)),color:Object.freeze([...base.sprite.color])});
  const extensions=[];
  if(pose===1){const patch=SOURCE_SUPPORT[identity].patch;
    extensions.push(Object.freeze({...base,image,sourceEffectId:source.id,playerId:source.playerId,movementMode:'alchemy-excalibur-slash',bladePatch:true,
      sprite:Object.freeze({...sprite,crop:Object.freeze([...patch]),x:(patch[0]-x-width/2)*scale,y:(patch[1]-y-height)*scale,w:patch[2]*scale,h:patch[3]*scale})}));}
  const action=Object.freeze({kind:'slash',motionId:'alchemy-excalibur',sourceEffectId:source.id,progress,poseIndex:pose,poseScale:scale,
    roomId:source.roomId,generation:source.localGeneration,targetGeneration:viewport.targetGeneration,facing:facing<0?'left':'right'});
  return Object.freeze({...base,sprite,extensions:Object.freeze(extensions),sourceEffectId:source.id,playerId:source.playerId,excaliburRoomId:source.roomId,
    excaliburPoseIndex:pose,excaliburPoseScale:scale,excaliburPoseOrigin:Object.freeze({x:width/2,y:height}),assetSha256:pin.sha256,
    movementMode:'alchemy-excalibur-slash',exAction:action,previewOnly:true});
}
