import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createThrowSfx as createFrozenSfx } from '../../../../request-20261010/ordinary-item-throw-runtime-r1/sfx.mjs';
import { createThrowSfx as createRepairedSfx } from '../sfx.mjs';

function captureFactory() {
  const state = { samples: null, filters: [], automation: [], starts: [], stops: [] };
  class Context {
    constructor() { this.sampleRate = 48000; this.currentTime = 4.25; this.destination = {}; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createBuffer(_channels, length) { state.samples = new Float32Array(length); return { getChannelData: () => state.samples }; }
    createBufferSource() { return { buffer:null, connect(){}, disconnect(){}, addEventListener(){}, start:t=>state.starts.push(t), stop:t=>state.stops.push(t) }; }
    createBiquadFilter() { const n={ type:'', frequency:{value:0}, Q:{value:0}, connect(){}, disconnect(){} }; state.filters.push(n); return n; }
    createGain() {
      const n={ connect(){}, disconnect(){}, gain:{
        setValueAtTime:(value,time)=>state.automation.push(['set',value,time]),
        linearRampToValueAtTime:(value,time)=>state.automation.push(['linear',value,time]),
        exponentialRampToValueAtTime:(value,time)=>state.automation.push(['exponential',value,time]) } };
      return n;
    }
  }
  return { AudioContextClass:Context, state };
}

async function run(generator) {
  const f=captureFactory(), sfx=generator({AudioContextClass:f.AudioContextClass});
  const result=sfx.play({causeId:'preservation-cause',speedWorldPerMs:.31,durationMs:420,visibleFrameComplete:true});
  const digest=createHash('sha256').update(Buffer.from(f.state.samples.buffer)).digest('hex');
  const graph={filters:f.state.filters.map(n=>({type:n.type,frequency:n.frequency.value,Q:n.Q.value})),
    automation:f.state.automation,starts:f.state.starts,stops:f.state.stops};
  await sfx.dispose();
  return {result,digest,sampleCount:f.state.samples.length,graph};
}

test('technical repair preserves exact frozen R1 PCM bytes and WebAudio parameter schedule on successful playback',async()=>{
  const originalRandom=Math.random;
  async function deterministic(generator) {
    let i=0; Math.random=()=>((i++%4093)+.5)/4093;
    try { return await run(generator); } finally { Math.random=originalRandom; }
  }
  const baseline=await deterministic(createFrozenSfx);
  const repaired=await deterministic(createRepairedSfx);
  assert.deepEqual(repaired,baseline);
});
