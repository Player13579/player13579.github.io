import {unproject} from '../src/geometry.js';
/** 検証用に明示した受光板・遮蔽板。製品Eにscene作成処理を混ぜない。 */
export function makeScene(width,height,camera,{wall=false,flat=false,receive=true,protectedRegion=false,bright=false}={}){
  const color=new Uint8Array(width*height*4),depth=new Float32Array(width*height).fill(0.90),receiverMask=new Uint8Array(width*height),protectedMask=new Uint8Array(width*height);
  const wallRect={x0:-8,y0:-40,x1:8,y1:40,blocksLight:true};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,p=unproject({x:x+0.5,y:y+0.5},camera,width,height);
    const band=!flat&&Math.floor((p.x+160)/40)%2===0;
    let rgb=bright?[210,214,219]:(band?[24,30,36]:[19,25,31]);
    // 目盛りは検証面のalbedo。Eの線や放射ではない。
    if(!flat&&(Math.abs(p.y)>26&&Math.abs(p.y)<26.4))rgb=[43,52,61];
    receiverMask[i]=receive?190:0;
    if(wall&&p.x>=wallRect.x0&&p.x<=wallRect.x1&&p.y>=wallRect.y0&&p.y<=wallRect.y1){rgb=[61,71,82];depth[i]=0.28;receiverMask[i]=0;protectedMask[i]=255;}
    if(protectedRegion&&p.x<-95){protectedMask[i]=255;}
    color.set([...rgb,255],i*4);
  }
  return {color,depth,receiverMask,protectedMask,occluders:wall?[wallRect]:[]};
}
export function fixtureEvent({id,variant,occurredAt,roomId='preview',epoch=1,x=-126,y=0,targetX=132,targetY=0,depth=0.5,pathLimitT=1}){
  // 実キャラクターを描かない検証fixtureの既知source。射手からの固定offsetではない。
  return [{type:'action-shoot',id,playerId:'fixture-emitter',x,y,targetX,targetY,variant,radius:3,occurredAt},
    {roomId,epoch,muzzle:{x,y,depth,sourceId:id,at:occurredAt},endDepth:depth,pathLimitT}];
}
