import { VoiceDSP, limitSample } from './synthesis.js';
import { CONTRACT as C } from './contract.js';

class StaminaProcessor extends AudioWorkletProcessor {
  constructor() {
    super(); this.voices = new Map(); this.seen = new Set(); this.tick = 0;
    this.stats = { starts: 0, rejectedDuplicate: 0, finishes: 0, maxConcurrent: 0 };
    this.port.onmessage = event => this.message(event.data);
  }
  message(m) {
    if (m.type === 'start') {
      if (this.seen.has(m.key)) { this.stats.rejectedDuplicate++; return; }
      this.seen.add(m.key);
      this.voices.set(m.key, { ...m, dsp: new VoiceDSP(m.seed), cancelled: false, lastReceived: currentTime });
      this.stats.starts++; this.stats.maxConcurrent = Math.max(this.stats.maxConcurrent, this.voices.size);
    } else if (m.type === 'update') {
      const v = this.voices.get(m.key);
      if (v && !v.cancelled) { v.phase = m.phase; v.rate = m.rate; v.audioTime = m.audioTime; v.lastReceived = currentTime; }
    } else if (m.type === 'stop') {
      const v = this.voices.get(m.key);
      if (v && !v.cancelled) {
        const dt = Math.max(0, currentTime - v.audioTime);
        v.phase += Math.min(dt, C.audioMaxPredictionMs / 1000) * v.rate * 1000 / v.duration;
        v.cancelled = true; v.rate = 0; v.audioTime = currentTime;
      }
    } else if (m.type === 'stopAll') {
      for (const v of this.voices.values()) { v.cancelled = true; v.rate = 0; }
    } else if (m.type === 'stats') this.report();
  }
  report() { this.port.postMessage({ type: 'stats', ...this.stats, active: this.voices.size }); }
  process(_inputs, outputs) {
    const output = outputs[0]; if (!output || output.length < 2) return true;
    const left = output[0], right = output[1]; left.fill(0); right.fill(0);
    for (const [key, v] of this.voices) {
      const stale = currentTime - v.lastReceived > C.audioMaxPredictionMs / 1000;
      const dt = Math.max(0, currentTime - v.audioTime);
      const p = v.phase + Math.min(dt, C.audioMaxPredictionMs / 1000) * v.rate * 1000 / v.duration;
      const playing = v.rate > 0 && !stale;
      const fade = v.dsp.renderInto(left, right, { sampleRate, phaseStart: p,
        phaseStep: playing && !v.cancelled ? v.rate * 1000 / v.duration / sampleRate : 0,
        playing, cancelled: v.cancelled, pan: v.pan });
      if (fade <= 0 && (v.cancelled || p >= 1)) { this.voices.delete(key); this.stats.finishes++; }
    }
    for (let i = 0; i < left.length; i++) { left[i] = limitSample(left[i]); right[i] = limitSample(right[i]); }
    if (++this.tick % 96 === 0) this.report();
    return true;
  }
}
registerProcessor('stamina-confluence-r04', StaminaProcessor);
