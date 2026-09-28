import {EVENT_TYPE,LIMITS,VARIANTS,makeVisibilityMask} from '../src/index.mjs';
/** 認証済み配送の代用品ではなく、独立ページ内だけの故障注入台帳。 */
export class FixtureHost {
  #issued=new WeakMap();#serial=0;
  constructor(clock){this.clock=clock;this.roomId='local-v5';this.epoch=1;this.targetGeneration='target-1';this.visible=true;this.present=true;this.occlusion=false;this.protect=false;this.receiver=true;this.targetAlive=true;this.shooterAlive=true;}
  issue(variant=VARIANTS[0],overrides={}){
    const event={type:EVENT_TYPE,id:`v5-${this.epoch}-${++this.#serial}`,playerId:'fixture-shooter',targetId:'fixture-target',x:420,y:310,radius:150,variant,atMs:this.clock.now(),...overrides};
    const packet=Object.freeze({fixtureReceipt:this.#serial});this.#issued.set(packet,{event:Object.freeze(event),roomId:this.roomId,epoch:this.epoch});return packet;
  }
  verifyCanonical=async packet=>this.#issued.get(packet)??null;
  getPermission=()=>({targetVisible:this.visible,contactVisible:this.visible,targetPresent:this.present,targetGeneration:this.targetGeneration,pan:0,targetAlive:this.targetAlive,shooterAlive:this.shooterAlive});
  nextRoom(){this.epoch++;this.roomId=`local-v5-${this.epoch}`;this.#issued=new WeakMap();}
  respawn(){this.targetGeneration=`target-${this.epoch}-${++this.#serial}`;}
  mask(){return makeVisibilityMask(([x,y])=>{
    const inPatch=x*x+(y+.16)*(y+.16)<.34*.34;
    const visible=this.visible&&this.present&&!(this.occlusion&&x>.24);
    return {visible,protected:this.protect&&x<-.25,surface:this.receiver&&inPatch?{present:true,visible,lightPathClear:true,normal:[0,0,1],toSource:[-x,-y,1],diffuseReflectance:.65}:null};
  });}
}
export function fixtureScene(size,light=false){
  const bytes=new Uint8Array(size*size*4),bg=light?[226,229,234]:[13,19,29];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=2*(x+.5)/size-1,py=1-2*(y+.5)/size,inPatch=px*px+(py+.16)*(py+.16)<.34*.34;
    const c=inPatch?(light?[149,159,174]:[51,62,80]):bg,i=(y*size+x)*4;
    bytes.set([...c,255],i);
  }
  return bytes;
}
export const projection=size=>({center:[size/2,size/2],axisX:[size/2,0],axisY:[0,-size/2]});
export class PresentationClock {
  value=1000;lastWall=null;clampedSteps=0;discardedWallMs=0;
  now=()=>this.value;
  advance(wall){if(!Number.isFinite(wall)||this.lastWall!==null&&wall<this.lastWall)throw new RangeError('presentation wall');const dt=this.lastWall===null?0:wall-this.lastWall;this.lastWall=wall;const step=Math.min(1000/60,dt);if(dt-step>1e-6){this.clampedSteps++;this.discardedWallMs+=dt-step;}this.value+=step;return step;}
  rebase(){this.lastWall=null;}
}
