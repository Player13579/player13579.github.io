// Shared by the runtime and CPU ordering tests. Retirement owns each stage and
// never infers GPU completion from a counter or a disposed flag.
export function createOwnedTaskTracker(onError = () => {}) {
  const tasks = new Set();
  function track(value, label) {
    const task = Promise.resolve(value);
    tasks.add(task);
    task.catch(error => onError(error, label));
    task.finally(() => tasks.delete(task)).catch(() => {});
    return task;
  }
  async function drain() {
    while (tasks.size) await Promise.allSettled([...tasks]);
  }
  return { track, drain, get size() { return tasks.size; } };
}

export function classifyOwnedDeviceLoss(info, { expectedDestroyDevice, ownedDevice }) {
  const expected = expectedDestroyDevice === ownedDevice && info?.reason === 'destroyed';
  return { reason: info?.reason ?? null, message: String(info?.message ?? ''), expected, owned: Boolean(ownedDevice) };
}

export function createOwnedRetirementController({
  closeAdmission, stopPlayback, disposeSound, drainOwnedTasks, queueFence,
  destroyResources, awaitOwnedDeviceLost, complete, snapshot, onError = () => {}
}) {
  let retirementPromise = null;
  async function step(label, action) {
    try { await action(); }
    catch (error) { onError(error, label); }
  }
  function dispose() {
    if (retirementPromise) return retirementPromise;
    closeAdmission();
    stopPlayback();
    // Install the shared promise before the first asynchronous cleanup stage.
    retirementPromise = Promise.resolve().then(async () => {
      await step('sound-dispose', disposeSound);
      await step('owned-task-drain', drainOwnedTasks);
      await step('queue-fence', queueFence);
      await step('gpu-resource-destroy', destroyResources);
      await step('owned-device-lost', awaitOwnedDeviceLost);
      await step('retirement-complete', complete);
      return snapshot();
    });
    return retirementPromise;
  }
  async function fence() {
    if (retirementPromise) await retirementPromise;
    return snapshot();
  }
  return { dispose, fence, get promise() { return retirementPromise; } };
}
