import * as pinnedSfx from '../inputs/r1620-sfx.mjs';

export async function resolveCauseBoundMonoBuffer(context, { source }, sfxModule = pinnedSfx) {
  if (!context || typeof context.createBuffer !== 'function' || !Number.isFinite(context.sampleRate)) throw new TypeError('an unlocked AudioContext with a sampleRate is required');
  if (!source || typeof source.causeId !== 'string' || !source.causeId) throw new TypeError('validated source causeId is required');
  if (typeof sfxModule?.seedFor !== 'function' || typeof sfxModule?.synthesize !== 'function' || !Number.isFinite(sfxModule.DURATION_MS)) throw new TypeError('the pinned SFX module exports are required');

  const sampleRate = context.sampleRate;
  const seed = sfxModule.seedFor(source.causeId);
  const pcm = sfxModule.synthesize({ sampleRate, seed });
  if (!pcm || pcm.synthetic !== true || pcm.durationMs !== sfxModule.DURATION_MS || pcm.sampleRate !== sampleRate || !(pcm.data instanceof Float32Array)) {
    throw new Error('the SFX producer returned a buffer outside its declared mono PCM contract');
  }
  const expectedLength = Math.ceil(sampleRate * (sfxModule.DURATION_MS / 1000));
  if (pcm.data.length !== expectedLength) throw new Error('the SFX producer sample count does not match its declared duration');
  for (let i = 0; i < pcm.data.length; i++) {
    if (!Number.isFinite(pcm.data[i]) || Math.abs(pcm.data[i]) >= 0.9) throw new Error(`SFX PCM sample ${i} is outside the finite unclipped design bound`);
  }

  const buffer = context.createBuffer(1, pcm.data.length, sampleRate);
  if (buffer.numberOfChannels !== 1 || buffer.length !== pcm.data.length || buffer.sampleRate !== sampleRate || !Number.isFinite(buffer.duration) || Math.abs(buffer.duration * 1000 - sfxModule.DURATION_MS) > 1000 / sampleRate) {
    throw new Error('AudioBuffer creation changed the SFX format or sample clock');
  }
  const target = buffer.getChannelData(0);
  if (typeof buffer.copyToChannel === 'function') buffer.copyToChannel(pcm.data, 0);
  else target.set(pcm.data);
  if (target.length !== pcm.data.length) throw new Error('AudioBuffer copy changed sample count');
  for (let i = 0; i < target.length; i++) {
    if (!Object.is(target[i], pcm.data[i])) throw new Error(`AudioBuffer copy changed PCM phase/sample at ${i}`);
  }
  return buffer;
}

