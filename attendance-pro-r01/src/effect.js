import { AttendanceController } from './controller.js';
import { AttendanceRenderer } from './renderer.js';
import { AttendanceAudio } from './sfx.js';
import { adaptAttendance } from './contract.js';

/**
 * 版別ゲーム接続用の小さなfacade。ネットワーク受信・陣営判定・タスク更新は行わない。
 * 通常参加と偽参加を同じ表示経路へ接続する。別の見た目へ分岐する引数は持たない。
 * deviceと最終targetはホストが所有。1 renderer = 1 view / submit区間。
 */
export async function createAttendanceE({
  device, outputFormat = 'rgba16float', nowGameMs,
  listenerProvider = () => null, audioContext = null,
  reducedMotion = false, postEffects = true, onError = () => {},
} = {}) {
  if(typeof nowGameMs!=='function')throw new TypeError('hostのnowGameMs関数が必要です');
  if(typeof listenerProvider!=='function')throw new TypeError('listenerProvider');
  const audio=new AttendanceAudio({context:audioContext});
  const controller=new AttendanceController({audio});
  const renderer=await AttendanceRenderer.create({device,outputFormat});
  let stopped=false;
  function alive(){if(stopped)throw new Error('Attendance Eは停止しています');}
  const loss=device.lost.then(info=>{
    if(!stopped){stopped=true;controller.dispose();renderer.dispose();void audio.dispose();onError(new Error(`GPUDevice lost: ${info.reason} ${info.message}`));}
  });
  void loss;
  return Object.freeze({
    /** 正規化前の権威イベントをそのまま検査。type等が異なれば例外で返す。 */
    receive(event,{eventAtGameMs}={}) {
      alive();const receivedAtGameMs=nowGameMs();
      return controller.ingest(event,{receivedAtGameMs,eventAtGameMs:eventAtGameMs??receivedAtGameMs});
    },
    /** sourceId / playerId / actorPosition / radius / lifetimeMs等を受ける版別adapter。 */
    receiveSnapshot(snapshot,{eventAtGameMs}={}) {
      alive();const event=adaptAttendance(snapshot);const receivedAtGameMs=nowGameMs();
      return controller.ingest(event,{receivedAtGameMs,eventAtGameMs:eventAtGameMs??receivedAtGameMs});
    },
    /** 既存ゲームの線形render targetへ直接合成。呼出し後、ホストがencoderをsubmitする。 */
    encode({encoder,targetView,width,height,camera}) {
      alive();const events=controller.update(nowGameMs(),{listener:listenerProvider()});
      return renderer.encode({encoder,targetView,width,height,camera,events,
        background:'transparent',loadOp:'load',postEffects,reducedMotion});
    },
    /** ゲームを描かないフレームでも時刻を進める場合に使用。未来の音は予約しない。 */
    update(){alive();return controller.update(nowGameMs(),{listener:listenerProvider()});},
    enableAudio(){alive();return audio.enable();},
    mute(){audio.setEnabled(false);},
    setReducedMotion(value){reducedMotion=Boolean(value);},
    setPostEffects(value){postEffects=Boolean(value);},
    resetSession(){alive();controller.resetSession();},
    getDiagnostics(){return {stats:{...controller.stats},render:renderer.lastStats,compilation:renderer.compilation,audioEnabled:audio.enabled};},
    async dispose(){if(stopped)return;stopped=true;controller.dispose();renderer.dispose();await audio.dispose();},
  });
}
