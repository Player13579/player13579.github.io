import { CONTRACT as C } from './contract.js';
export const GPU_CONTRACT = Object.freeze({
  uniformBytes: 64, volumeStrideBytes: 64, bodyStrideBytes: 64,
  volumeCapacity: C.maxVolumes, bodyCapacity: C.maxBodyParts,
  intermediateFormat: 'rgba16float', samples: 1,
  passes: Object.freeze([
    { name:'scene', shader:'scene.wgsl', vertex:'fullscreenVertex', fragment:'sceneFragment', outputs:[0,1], format:'rgba16float',
      bindings:[{binding:0,kind:'uniform',minBytes:64},{binding:1,kind:'read-only-storage',minBytes:64},{binding:2,kind:'read-only-storage',minBytes:64}] },
    { name:'blur', shader:'blur.wgsl', vertex:'fullscreenVertex', fragment:'blurFragment', outputs:[0], format:'rgba16float',
      bindings:[{binding:0,kind:'texture'},{binding:1,kind:'sampler'},{binding:2,kind:'uniform',minBytes:16}] },
    { name:'composite', shader:'composite.wgsl', vertex:'fullscreenVertex', fragment:'compositeFragment', outputs:[0], format:'canvas-preferred',
      bindings:[{binding:0,kind:'texture'},{binding:1,kind:'texture'},{binding:2,kind:'sampler'},{binding:3,kind:'uniform',minBytes:16}] }
  ])
});
export function packVolumes(volumes) {
  if (volumes.length > C.maxVolumes) throw new RangeError('volume capacity exceeded; do not silently truncate');
  const output = new Float32Array(C.maxVolumes * 16);
  volumes.forEach((v, i) => {
    const record = [
      ...v.center, v.opacity,
      ...v.radii, v.kind,
      Math.cos(v.rotation), Math.sin(v.rotation), v.emission, v.charge,
      v.receipt ?? 0, v.chargeGlobal ?? 0, v.outsideGlobal ?? 0, v.phaseTag ?? 0
    ];
    if (!record.every(Number.isFinite) || v.radii.some(r => r <= 0)) throw new TypeError('invalid analytic volume');
    output.set(record, i * 16);
  });
  return output;
}
export function packBody(parts) {
  if (parts.length > C.maxBodyParts) throw new RangeError('body capacity exceeded');
  const output = new Float32Array(C.maxBodyParts * 16);
  parts.forEach((b, i) => {
    const record = [...b.center, b.protected, ...b.radii, b.kind, Math.cos(b.rotation), Math.sin(b.rotation), 0, 0, ...b.color, 1];
    if (!record.every(Number.isFinite)) throw new TypeError('invalid body part');
    output.set(record, i * 16);
  });
  return output;
}
