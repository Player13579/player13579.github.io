import {profileFor} from '../src/profiles.mjs';

/**
 * 独立検証ページだけの提出追従時計。ゲームの権威時計ではない。
 * GPU準備・await・非表示の間に短いEの全寿命が消費されることを防ぐ。
 * 60Hz以上では実経過に追従、低速環境では1提出あたり最大16.667ms進む。
 * 実時間の再現・GPUの60fps達成とは区別し、clampedSteps等をUI/証拠へ残す。
 */
export class PresentationTime {
  #time; #lastWall = null;
  steps = 0; clampedSteps = 0; discardedWallMs = 0;
  constructor({startMs = 1000, maxStepMs = 1000 / 60} = {}) {
    if (!Number.isFinite(startMs) || !Number.isFinite(maxStepMs) || maxStepMs <= 0) throw new RangeError('preview time');
    this.#time = startMs; this.maxStepMs = maxStepMs;
  }
  now = () => this.#time;
  resetWall() { this.#lastWall = null; }
  advance(wallMs, {frozen = false} = {}) {
    if (!Number.isFinite(wallMs)) throw new TypeError('wallMs');
    if (this.#lastWall !== null && wallMs < this.#lastWall) throw new RangeError('preview wall clock rewind');
    const delta = this.#lastWall === null ? 0 : wallMs - this.#lastWall;
    this.#lastWall = wallMs;
    if (frozen) return 0;
    const applied = Math.min(delta, this.maxStepMs);
    if (delta > this.maxStepMs + .1) { this.clampedSteps++; this.discardedWallMs += delta - applied; }
    this.#time += applied; this.steps++;
    return applied;
  }
  snapshot() { return {mode:'presentation_bounded_not_server_clock', nowMs:this.#time,
    maxStepMs:this.maxStepMs, steps:this.steps, clampedSteps:this.clampedSteps, discardedWallMs:this.discardedWallMs}; }
}

/** 1 variant = 1活動枠。10種を独立した寿命で再発行し、2背景は同じ枠を観測する。 */
export class PreviewLoopController {
  #busy = false; #retryAt = new Map(); #observations = new Map();
  running = true; suspended = false; submittedFrames = 0; lastFrames = [];
  constructor({time, clock, host, system, variants}) {
    if (!time || !clock || !host || !system || !Array.isArray(variants) || !variants.length) throw new TypeError('preview dependencies');
    this.time=time; this.clock=clock; this.host=host; this.system=system; this.variants=[...variants];
    for (const variant of variants) this.#observations.set(variant, {
      variant, durationMs:profileFor(variant).durationMs, cycles:0, submittedFrames:0,
      positiveEnvelopeFrames:0, completedCycles:0, lastId:null, lastU:null, lastAgeMs:null,
      lastReason:'not_issued', lastCycleMaxU:0, minPositiveU:null, maxPositiveU:null,
    });
  }
  setRunning(value) { this.running=Boolean(value); if(this.running) this.#retryAt.clear(); }
  setSuspended(value) {
    this.suspended=Boolean(value); this.time.resetWall();
    if(this.suspended) { this.system.cancelAll('preview_suspended'); this.lastFrames=[]; }
    else this.#retryAt.clear();
  }
  restart() { this.system.cancelAll('preview_restart'); this.#retryAt.clear(); this.time.resetWall(); }
  async step(wallMs) {
    if (this.#busy) throw new Error('overlapping_preview_step');
    this.#busy=true;
    try {
      this.time.advance(wallMs,{frozen:this.suspended || this.clock.rate===0});
      if (this.suspended) return [];
      let frames=this.system.frame();
      if(this.running && this.clock.rate>0) {
        const present=new Set(frames.map(f=>f.event.variant));
        const now=this.clock.now();
        const missing=this.variants.filter(v=>!present.has(v) && now>=(this.#retryAt.get(v)??-Infinity));
        // accept()は非同期。必ず全発行の解決後に同一検査時刻でframe()へ進む。
        await Promise.all(missing.map(async variant=>{
          const result=await this.system.accept(this.host.issue(variant));
          const item=this.#observations.get(variant);
          item.lastReason=result.accepted?'accepted':result.reason;
          if(result.accepted) {
            if(item.lastId && item.lastCycleMaxU>=.80) item.completedCycles++;
            item.cycles++; item.lastId=result.id; item.lastCycleMaxU=0;
            this.#retryAt.delete(variant);
          } else this.#retryAt.set(variant,now+250);
        }));
        frames=this.system.frame();
      }
      return frames;
    } finally { this.#busy=false; }
  }
  /** queue完了後だけ呼ぶ。これは提出記録であり、目視評価/画素readbackではない。 */
  recordSubmitted(frames) {
    this.submittedFrames++; this.lastFrames=[...frames];
    for(const f of frames) {
      const o=this.#observations.get(f.event.variant); if(!o)continue;
      o.submittedFrames++; o.lastAgeMs=f.ageMs; o.lastU=f.envelope.u;
      o.lastCycleMaxU=Math.max(o.lastCycleMaxU,f.envelope.u);
      if(f.envelope.body>0) {
        o.positiveEnvelopeFrames++;
        o.minPositiveU=o.minPositiveU===null?f.envelope.u:Math.min(o.minPositiveU,f.envelope.u);
        o.maxPositiveU=o.maxPositiveU===null?f.envelope.u:Math.max(o.maxPositiveU,f.envelope.u);
      }
    }
  }
  snapshot() {
    return {running:this.running,suspended:this.suspended,clock:this.time.snapshot(),rate:this.clock.rate,
      submittedFrames:this.submittedFrames,active:this.lastFrames.length,
      nonzeroEnvelope:this.lastFrames.filter(f=>f.envelope.body>0).length,
      variants:[...this.#observations.values()].map(o=>({...o})),
      frames:this.lastFrames.map(f=>({variant:f.event.variant,id:f.event.id,ageMs:f.ageMs,
        durationMs:f.profile.durationMs,u:f.envelope.u,body:f.envelope.body,emission:f.envelope.emission})),
      scope:'単独fixtureの提出テレメトリー。WebGPU画素・視認性の受入とは別。'};
  }
}
