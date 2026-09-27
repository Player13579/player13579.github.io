import {EVENT_TYPE,WEAPONS,makeReceiverMask,LIMITS} from '../src/index.mjs';
export const DISPLAY_VARIANTS=['hip','aim'].flatMap(mode=>WEAPONS.map(w=>`${mode}:${w}`));
/** 単独ページ専用の模擬authority。本番認証ではなくゲームへimportしない。 */
export class FixtureHost {
  #receipts=new WeakMap();#seq=0;
  roomId='fixture-A';epoch=1;hidden=false;occluded=false;present=true;targetGeneration='fixture-body-1';
  targetAlive=true;shooterAlive=true;
  constructor(clock){this.clock=clock;}
  issue(variant,{atMs=this.clock.now(),id=null,position=null}={}){
    const idx=DISPLAY_VARIANTS.indexOf(variant);const x=(idx%5)*600,y=-Math.floor(idx/5)*600;
    const event=Object.freeze({type:EVENT_TYPE,id:id??`fixture-${this.epoch}-${++this.#seq}`,playerId:'fixture-shooter',targetId:`fixture-target-${variant}`,x:position?.x??x,y:position?.y??y,radius:150,variant,atMs});
    const packet=Object.freeze({fixtureReceipt:this.#seq});this.#receipts.set(packet,Object.freeze({event,roomId:this.roomId,epoch:this.epoch}));return packet;
  }
  verifyCanonical=async packet=>this.#receipts.get(packet)??null;
  getPermission=()=>({targetVisible:!this.hidden,contactVisible:!this.hidden,targetPresent:this.present,targetGeneration:this.targetGeneration,pan:0});
  nextRoom(){this.roomId=this.roomId==='fixture-A'?'fixture-B':'fixture-A';this.epoch++;}
  respawn(){this.targetGeneration=`fixture-body-${++this.#seq}`;}
  projection(frame,{hero=false,stack=false}={}){
    return hero?{center:[192,192],axisX:[128,0],axisY:[0,-128]}:{center:[64+frame.event.x*32/150,64-frame.event.y*32/150],axisX:[32,0],axisY:[0,-32]};
  }
  mask(){
    const hidden=this.hidden||!this.present;const occluded=this.occluded;
    return makeReceiverMask({authorizePixel:(u)=>!hidden&&!(occluded&&u>.52&&u<.72),
      sampleReceiver:(u,v)=>{const x=u*2-1,y=1-v*2;
        if(Math.abs(x)>.77||Math.abs(y)>.64||x+y>1.03)return null;
        return {coverage:1,normal:[0,0,1],view:[0,0,1],light:[-x,-y,.28],roughness:.67,f0:.04,albedo:.58,occlusion:1};}});
  }
}
/** 検査用無人物・無文字の受光面。実ゲーム背景ではなく、本番に同梱参照しない。 */
export function fixtureScene(width,height,{hero=false,single=false,light=false,occluded=false,stress=false}={}){
  const out=new Uint8Array(width*height*4);
  const centers=single?[[width/2,height/2,Math.min(width,height)/2]]:hero?[[192,192,128]]:DISPLAY_VARIANTS.map((_,i)=>[64+i%5*128,64+Math.floor(i/5)*128,32]);
  if(stress&&!hero)centers.push([320,128,32]);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;let rgb=light?[201,205,208]:[20,24,31];
    for(const [cx,cy,s]of centers){const qx=(x+.5-cx)/s,qy=(cy-y-.5)/s;
      if(Math.abs(qx)<=.77&&Math.abs(qy)<=.64&&qx+qy<=1.03){const shade=Math.round((light?146:54)+7*qy+3*qx);rgb=[shade,shade+5,shade+10];}
      if(occluded&&qx>.04&&qx<.44&&Math.abs(qy)<1.06)rgb=light?[87,92,98]:[11,15,21];
    }
    out[i]=rgb[0];out[i+1]=rgb[1];out[i+2]=rgb[2];out[i+3]=255;
  }
  return out;
}
