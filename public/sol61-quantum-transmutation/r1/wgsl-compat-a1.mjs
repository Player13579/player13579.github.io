// WGSL reserves `diagnostic` for a directive, so the frozen shader's struct
// member cannot parse in Chrome's actual WGSL frontend. This compatibility
// adapter changes that identifier token only; shader math/order/literals stay
// byte-for-byte identical after reversing the rename.
export function normalizeQuantumR1Shader(source) {
  if (typeof source !== 'string' || !source.length) throw new TypeError('Quantum WGSL source required');
  const occurrences = source.match(/\bdiagnostic\b/g) ?? [];
  if (occurrences.length !== 9 || !/\bdiagnostic\s*:\s*vec4f\b/.test(source) ||
      !/p\.diagnostic\.w/.test(source) || !/p\.diagnostic\.x/.test(source) ||
      !/p\.diagnostic\.y/.test(source) || !/p\.diagnostic\.z/.test(source)) {
    throw new Error(`Unexpected frozen Quantum WGSL diagnostic identifier topology (${occurrences.length})`);
  }
  const normalized = source.replace(/\bdiagnostic\b/g, 'diagFlags');
  if (normalized.replace(/\bdiagFlags\b/g, 'diagnostic') !== source ||
      (normalized.match(/\bdiagFlags\b/g) ?? []).length !== occurrences.length) {
    throw new Error('Quantum WGSL adapter changed tokens beyond the reserved identifier');
  }
  return Object.freeze({ source: normalized, record: Object.freeze({
    schema: 'dva-quantum-wgsl-compat-adapter-a1/v1',
    repair: 'WGSL-reserved struct member identifier rename only',
    identifier: 'diagnostic', replacement: 'diagFlags', replacementCount: occurrences.length,
    reversibleExact: normalized.replace(/\bdiagFlags\b/g, 'diagnostic') === source,
    designChanged: false
  }) });
}

export function createQuantumDeviceAdapter(device, source, recordSink = null) {
  const normalized = normalizeQuantumR1Shader(source);
  const adapted = new Proxy(device, {
    get(target, property) {
      if (property === 'createShaderModule') return descriptor => {
        if (!descriptor || descriptor.code !== source) return target.createShaderModule(descriptor);
        recordSink?.(normalized.record);
        return target.createShaderModule({ ...descriptor, code: normalized.source });
      };
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
  return Object.freeze({ device: adapted, normalization: normalized.record });
}
