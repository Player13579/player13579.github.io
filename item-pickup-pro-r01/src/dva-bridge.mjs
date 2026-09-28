import { PickupController, SeenLedger } from './receipt-controller.mjs';
import { PickupSound } from './sfx.mjs';

/**
 * DVA用の明示接続境界。未知のapp globals、socket payload field、成功判定を捏造しない。
 * subscribe/getFrameは実ホストが渡す。receiptとroom/session envelopeを別々に受ける。
 */
export class DvaPickupBridge {
  constructor({ renderer, readFrame, readGPUInputs, ledger = new SeenLedger(), sound = new PickupSound(), readMonotonicNow = () => performance.now() }) {
    if (!renderer || typeof readFrame!=='function' || typeof readGPUInputs!=='function') throw new TypeError('renderer/readFrame/readGPUInputs required');
    this.readMonotonicNow=readMonotonicNow;
    this.renderer=renderer; this.readFrame=readFrame; this.readGPUInputs=readGPUInputs;
    this.controller=new PickupController({ledger}); this.sound=sound; this.lastFrame=null; this.disposed=false;
    this.onFault=()=>{this.controller.cancelAll('gpu_fault');this.sound.stopAll();};
    renderer.faultListeners?.add(this.onFault);
    this.onVisibility=()=>{if(globalThis.document?.hidden){this.controller.cancelAll('document_hidden');this.sound.stopAll();}};
    globalThis.document?.addEventListener('visibilitychange',this.onVisibility);
  }
  frameSnapshot() {
    const frame={...this.readFrame()};
    if(globalThis.document?.hidden)frame.documentVisible=false;
    const canvas=this.renderer.canvas;
    if(canvas && typeof getComputedStyle==='function') {
      const style=getComputedStyle(canvas);
      const box=canvas.getBoundingClientRect?.();
      if(box && (box.right<=0 || box.bottom<=0 || box.left>=globalThis.innerWidth || box.top>=globalThis.innerHeight)) frame.canvasVisible=false;
      if(!canvas.isConnected || canvas.clientWidth<=0 || canvas.clientHeight<=0 || style.visibility==='hidden' || style.display==='none' || Number(style.opacity)===0) frame.canvasVisible=false;
    }
    return frame;
  }
  acceptAuthoritativeReceipt(receipt,envelope) {
    if(this.disposed)return {accepted:false,reason:'disposed'};
    return this.controller.ingest(receipt,envelope,this.frameSnapshot());
  }
  drawFrame() {
    if(this.disposed)return {submitted:false,reason:'disposed'};
    try {
    const frame=this.frameSnapshot(); this.lastFrame=frame;
    const draws=this.controller.collect(frame);
    this.sound.stopExcept(draws.map(d=>d.id));
    const inputs=this.readGPUInputs(frame);
    const submission=this.renderer.render(draws,{...inputs,roomClip:frame.roomClip});
    this.sound.stopExcept(submission.audioEligibleIds || []);
    // 可視submitの直後に同じframeのcauseを消費する。完了promiseや遅延timerは使わない。
    const sounds=this.controller.commitVisibleSubmission(submission,{...frame,monotonicNowMs:this.readMonotonicNow()});
    const soundResults=sounds.map(event=>this.sound.consume(event,{nowMonoMs:this.readMonotonicNow(),documentVisible:frame.documentVisible===true&&frame.canvasVisible===true}));
    if(!submission.submitted){this.controller.cancelAll('submission_unavailable');this.sound.stopAll();}
    return { ...submission, active:draws.length, soundResults };
    } catch (error) { this.controller.cancelAll('host_or_submit_exception'); this.sound.stopAll(); return { submitted:false, reason:'host_or_submit_exception', error:String(error) }; }
  }
  /** 実ゲームのsubscribeの返す解除関数を保持する。schema変換/成功判定はこの層に入れない。 */
  attach(subscribePickupReceipts) {
    if(typeof subscribePickupReceipts!=='function')throw new TypeError('subscribePickupReceipts');
    if(this.unsubscribe)throw new Error('already attached');
    const unsubscribe=subscribePickupReceipts((receipt,envelope)=>this.acceptAuthoritativeReceipt(receipt,envelope));
    if(typeof unsubscribe!=='function')throw new TypeError('subscribe must return unsubscribe function');
    this.unsubscribe=unsubscribe;
    return ()=>{this.unsubscribe?.();this.unsubscribe=null;};
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;
    this.unsubscribe?.();this.unsubscribe=null;this.controller.dispose();this.sound.dispose();
    this.renderer.faultListeners?.delete(this.onFault);
    globalThis.document?.removeEventListener('visibilitychange',this.onVisibility);
  }
}
