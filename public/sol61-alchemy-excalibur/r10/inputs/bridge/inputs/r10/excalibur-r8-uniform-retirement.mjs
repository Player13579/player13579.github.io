// Dedicated frame allocation: no further queue writes/uses after finish begins.
export function createUniformRetirement({ device, buffer }) {
  if (!device?.queue?.onSubmittedWorkDone || !device.lost?.then || !buffer?.destroy)
    throw new TypeError('Owning queue, actual device loss promise and buffer required');
  let completion = null, destroyed = false;
  // Rejected loss promises are not evidence that GPU use ended.
  const loss = Promise.resolve(device.lost).then(() => true, () => new Promise(() => {}));
  function finish(proof) {
    if (completion) return completion;
    let done = proof?.done;
    if (!done?.then) {
      try { done = device.queue.onSubmittedWorkDone(); } catch (_) { done = null; }
    }
    const queue = done?.then ? Promise.resolve(done).then(() => true, () => loss) : loss;
    completion = Promise.race([queue, loss]).then(() => {
      if (!destroyed) { destroyed = true; buffer.destroy(); }
    });
    return completion;
  }
  return Object.freeze({ afterSubmission: finish, abandon: () => finish(),
    proofError: () => finish(), dispose: () => finish(),
    get completion() { return completion; }, get destroyed() { return destroyed; } });
}
