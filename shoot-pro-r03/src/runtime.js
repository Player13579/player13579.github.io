import {ShotRenderer} from './renderer.js';
import {ShotEngine} from './engine.js';
import {ShotAudio} from './audio.js';
/** 一体の寿命管理。ゲームへの購読・公開登録は行わない。 */
export class ShootERuntime {
  static async create({canvas,device,adapterInfo,worldUnitsPerMeter,roomId,epoch,now=0,audioOwner='legacy',claimAudioSource=null}={}){
    if(!Number.isFinite(worldUnitsPerMeter)||worldUnitsPerMeter<=0)throw new TypeError('ゲームworld座標とmの対応worldUnitsPerMeterが必要');
    const renderer=await ShotRenderer.create(canvas,{device,adapterInfo,worldUnitsPerMeter});
    const audio=new ShotAudio({owner:audioOwner,claimSource:claimAudioSource});
    return new ShootERuntime({renderer,audio,roomId,epoch,now});
  }
  constructor({renderer,audio,roomId='preview',epoch=1,now=0}){
    this.renderer=renderer;this.audio=audio;this.disposed=false;
    this.engine=new ShotEngine({roomId,epoch,now,onStart:(s,age)=>audio.play(s,age),onRoomChange:()=>audio.stopAll()});
  }
  ingest(event,context){if(this.disposed)throw new Error('runtime disposed');return this.engine.enqueue(event,context);}
  frame({gameTime,rate=1,camera,scene,options}){
    if(this.disposed)throw new Error('runtime disposed');this.audio.setRate(rate);
    if(scene)this.renderer.uploadScene(scene);
    return this.renderer.render(this.engine.tick(gameTime),camera,options);
  }
  setRoom(room){this.engine.setRoom(room);}
  async unlockAudio(){return this.audio.unlock();}
  async dispose(){if(this.disposed)return;this.disposed=true;this.engine.dispose();this.renderer.dispose();await this.audio.dispose();}
}
