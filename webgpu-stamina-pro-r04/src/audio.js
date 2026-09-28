import { eventSeed } from './sampler.js';

/** One controller, never one audio graph per preview panel. User gesture required. */
export class StaminaAudio {
  constructor(onStats = () => {}) { this.context = null; this.node = null; this.sent = new Set(); this.onStats = onStats; this.enabled = false; }
  async enable() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      await this.context.audioWorklet.addModule(new URL('./audio-worklet.js', import.meta.url));
      this.node = new AudioWorkletNode(this.context, 'stamina-confluence-r04', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
      this.node.port.onmessage = e => { if (e.data.type === 'stats') this.onStats(e.data); };
      this.node.connect(this.context.destination);
    }
    await this.context.resume(); this.enabled = true;
    return { state: this.context.state, sampleRate: this.context.sampleRate, catchup: false };
  }
  start(event, actor, phase) {
    if (this.sent.has(event.key)) return false;
    this.sent.add(event.key);
    if (!this.enabled || !this.node || this.context.state !== 'running') return false;
    this.node.port.postMessage({ type: 'start', key: event.key, duration: event.duration, phase, rate: actor.rate,
      seed: eventSeed(event), audioTime: this.context.currentTime, pan: Math.max(-.45, Math.min(.45, (actor.position?.[0] ?? 0) / 100)) });
    return true;
  }
  update(event, actor, phase) {
    if (!this.enabled || !this.node || !this.sent.has(event.key)) return;
    this.node.port.postMessage({ type: 'update', key: event.key, phase, rate: actor.rate, audioTime: this.context.currentTime });
  }
  stop(event) { this.node?.port.postMessage({ type: 'stop', key: event.key }); }
  stopAll() { this.node?.port.postMessage({ type: 'stopAll' }); }
  async disable() { this.stopAll(); this.enabled = false; }
  async dispose() { this.stopAll(); await this.context?.close(); this.context = null; this.node = null; }
}
