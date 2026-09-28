import { audioEnvelope } from './sampler.js';
import { CONTRACT as C, lerp } from './contract.js';
const TAU = 2 * Math.PI;

/** Stateful oscillator/noise kernel. The same kernel serves AudioWorklet and WAV tests.
 * Only envelopes follow actor time; oscillator phase advances in DAC time (no 2x pitch).
 */
export class VoiceDSP {
  constructor(seed = 1) {
    this.phase = [0, 0, 0, 0, 0]; this.noise = seed >>> 0 || 1; this.lowA = 0; this.lowB = 0; this.sheen = 0;
    this.fade = 0; this.lastP = 0; this.lastOutput = 0; this.samples = 0;
  }
  renderInto(left, right, { offset = 0, frames = left.length - offset, sampleRate = 48000,
    phaseStart = 0, phaseStep = 0, playing = true, cancelled = false, pan = 0 } = {}) {
    const begin = audioEnvelope(phaseStart);
    const finish = audioEnvelope(phaseStart + Math.max(0, frames - 1) * phaseStep);
    const aFast = 1 - Math.exp(-TAU * 2400 / sampleRate);
    const aSlow = 1 - Math.exp(-TAU * 420 / sampleRate);
    const aSheen = 1 - Math.exp(-TAU * 1350 / sampleRate);
    const fadeStep = 1 / (C.audioReleaseMs * 0.001 * sampleRate);
    const gainL = Math.sqrt((1 - Math.max(-1, Math.min(1, pan))) * 0.5);
    const gainR = Math.sqrt((1 + Math.max(-1, Math.min(1, pan))) * 0.5);
    for (let i = 0; i < frames; i++) {
      const a = frames <= 1 ? 0 : i / (frames - 1);
      const phase = phaseStart + phaseStep * i;
      const enabled = playing && !cancelled && phase >= 0 && phase < 1;
      this.fade = Math.max(0, Math.min(1, this.fade + (enabled ? fadeStep : -fadeStep)));
      let x = this.noise; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.noise = x >>> 0;
      const noise = (this.noise / 2147483648) - 1;
      this.lowA += aFast * (noise - this.lowA); this.lowB += aSlow * (noise - this.lowB); this.sheen += aSheen * (noise - this.sheen);
      const band = this.lowA - this.lowB;
      const bright = this.lowA - this.sheen;
      const q = lerp(begin.charge, finish.charge, a);
      const onset = lerp(begin.onset, finish.onset, a);
      const flow = lerp(begin.flow, finish.flow, a);
      const reserve = lerp(begin.reserve, finish.reserve, a);
      const settle = lerp(begin.settle, finish.settle, a);
      const tail = lerp(begin.tail, finish.tail, a);
      const root = 166 + 22 * (1 - q);
      const frequencies = [root, root * 1.50, root * 1.99, 338, 684];
      for (let j = 0; j < frequencies.length; j++) this.phase[j] = (this.phase[j] + TAU * frequencies[j] / sampleRate) % TAU;
      const body = 0.72 * Math.sin(this.phase[0]) + 0.18 * Math.sin(this.phase[1]) + 0.10 * Math.sin(this.phase[2]);
      const click = 0.18 * Math.sin(this.phase[3]) + 0.10 * bright;
      const shimmer = 0.22 * Math.sin(this.phase[4]) * Math.sin(this.phase[0] * 0.5) + 0.15 * band;
      let value = (
        onset * (0.16 * click + 0.09 * bright) +
        flow * (0.34 * band + 0.12 * shimmer) +
        reserve * (0.24 * body + 0.06 * Math.sin(this.phase[1])) +
        settle * 0.18 * Math.sin(this.phase[0] * 0.5 + this.phase[2] * 0.25) +
        tail * 0.08 * shimmer
      ) * this.fade;
      if (cancelled || (!playing && this.fade > 0)) {
        value = (reserve * (0.20 * body) + tail * 0.06 * shimmer) * this.fade;
      }
      left[offset + i] += value * gainL;
      right[offset + i] += value * gainR;
      this.lastOutput = value; this.lastP = phase; this.samples++;
    }
    return this.fade;
  }
}
export function limitSample(value) { return Math.tanh(value * C.audioMaster); }

export function renderReference({ durationMs = 1500, actorRate = 1, seed = 4217, sampleRate = 48000,
  gains = [{ actorOffsetMs: 0 }], cancelAtActorMs = null } = {}) {
  if (!(durationMs >= C.minimumDurationMs && actorRate > 0 && Number.isFinite(actorRate))) throw new RangeError('invalid audio reference timing');
  const lastStart = Math.max(0, ...gains.map(g => g.actorOffsetMs));
  const seconds = (lastStart + durationMs) / actorRate / 1000 + 0.03;
  const frames = Math.ceil(seconds * sampleRate);
  const left = new Float32Array(frames), right = new Float32Array(frames);
  gains.forEach((gain, index) => {
    const voice = new VoiceDSP((seed + index * 7919) >>> 0);
    const first = Math.round(gain.actorOffsetMs / actorRate / 1000 * sampleRate);
    let frozen = null;
    for (let start = first; start < frames; start += 128) {
      const absoluteActorMs = start / sampleRate * 1000 * actorRate;
      const cancelled = cancelAtActorMs !== null && absoluteActorMs >= cancelAtActorMs;
      if (cancelled && frozen === null) frozen = (cancelAtActorMs - gain.actorOffsetMs) / durationMs;
      const p = frozen ?? (absoluteActorMs - gain.actorOffsetMs) / durationMs;
      voice.renderInto(left, right, {
        offset: start,
        frames: Math.min(128, frames - start),
        sampleRate,
        phaseStart: p,
        phaseStep: cancelled ? 0 : actorRate * 1000 / durationMs / sampleRate,
        playing: true,
        cancelled,
        pan: gain.pan ?? 0
      });
    }
  });
  for (let i = 0; i < frames; i++) { left[i] = limitSample(left[i]); right[i] = limitSample(right[i]); }
  return { left, right, sampleRate, durationMs, actorRate, voiceCount: gains.length };
}
