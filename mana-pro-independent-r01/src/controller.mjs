import {ManaEffectEngine} from './engine.mjs';
import {ManaWebGPURenderer} from './renderer.mjs';
/** ブラウザーのDOM・GPUと純粋なイベント/時計モデルを結ぶ。ゲーム状態へ書込みなし。 */
export class ManaEffectController {
  static async create({canvas,context,resolveActor,views,audio=null,verify=false,reducedMotion=false}) {
    const renderer=await ManaWebGPURenderer.create(canvas);
    return new ManaEffectController({renderer,context,resolveActor,views,audio,verify,reducedMotion});
  }
  constructor({renderer,context,resolveActor,views,audio,verify,reducedMotion}) {
    this.renderer=renderer;this.views=views;this.reducedMotion=reducedMotion;this.needsClear=false;
    this.requestedVisible=true;this.running=false;this.disposed=false;this.lastSuccess=performance.now();this.lastError=null;
    this.engine=new ManaEffectEngine({context,resolveActor,audio,environment:{visible:true,muted:true,verify},onInvalidate:()=>{renderer.hide();this.needsClear=true;}});
    renderer.onFailure=reason=>{this.lastError=reason;this.engine.failGPU(reason);};
    this.visibilityListener=()=>{this.engine.setEnvironment({visible:this.requestedVisible&&!document.hidden});if(!document.hidden)this.needsClear=true;};
    document.addEventListener('visibilitychange',this.visibilityListener);
    this.watchdog=setInterval(()=>{
      if(this.engine.audio?.voices.size && performance.now()-this.lastSuccess>250)this.engine.failGPU('presentation-watchdog-250ms');
    },80);
  }
  admit(e){return this.engine.admit(e);}
  setOwnerMotion(playerId,motion,nowMs=performance.now()){this.engine.setOwnerMotion(playerId,motion,nowMs);}
  setVisible(visible){this.requestedVisible=visible;this.engine.setEnvironment({visible:visible&&!document.hidden});if(visible)this.needsClear=true;}
  setMuted(muted){this.engine.setEnvironment({muted:!!muted});}
  setVerify(verify){this.engine.setEnvironment({verify:!!verify});}
  setContext(context){this.engine.setContext(context);}
  invalidatePlayer(id,reason){this.engine.invalidatePlayer(id,reason);}
  attachAudio(audio){this.engine.audio=audio;}
  async drawOnce(){
    if(this.renderer.busy||this.disposed)return null;
    if(this.needsClear){
      const generation=this.renderer.generation;await this.renderer.clear();
      if(generation!==this.renderer.generation)return null;
      this.needsClear=false;if(this.requestedVisible&&!document.hidden)this.renderer.allowPresentation();
    }
    const visible=this.requestedVisible&&!document.hidden&&this.renderer.isCanvasVisible();
    if(visible!==this.engine.environment.visible)this.engine.setEnvironment({visible});
    const frame=this.engine.prepareFrame(performance.now(),{reducedMotion:this.reducedMotion});
    const receipt=await this.renderer.render(frame,this.views(),{isCurrent:()=>this.engine.isFrameCurrent(frame),verify:this.engine.environment.verify});
    if(receipt.gpuSucceeded){this.lastSuccess=performance.now();this.engine.commitFrame(receipt,this.lastSuccess);}
    this.onFrame?.({frame,receipt});return receipt;
  }
  start(){
    if(this.running)return;this.running=true;
    const loop=async()=>{
      if(!this.running)return;
      try{await this.drawOnce();}catch(error){this.lastError=String(error);this.engine.failGPU(this.lastError);this.onError?.(error);}
      if(this.running)this.raf=requestAnimationFrame(loop);
    };this.raf=requestAnimationFrame(loop);
  }
  stop(){this.running=false;cancelAnimationFrame(this.raf);this.engine.failGPU('controller-stopped');}
  dispose(){this.stop();this.disposed=true;clearInterval(this.watchdog);document.removeEventListener('visibilitychange',this.visibilityListener);this.engine.dispose();this.renderer.dispose();}
}
