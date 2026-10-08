export function snapshotBustSubmission(value) {
  const required = ['submissionId', 'causeId', 'ageMs', 'variant', 'targetId', 'viewportWidth', 'viewportHeight', 'lifecycleEpoch'];
  if (!value || required.some((key) => value[key] === undefined)) throw new TypeError('incomplete Bust submission snapshot');
  return Object.freeze({ ...value });
}

export function bustFirstFrameFromSubmission(submission, { sourceVersion, canvasConnected }) {
  if (!submission || !sourceVersion) throw new TypeError('missing Bust first-frame source');
  return Object.freeze({
    recorded: true,
    submitted: true,
    completed: true,
    canvasConnected: Boolean(canvasConnected),
    passes: 2,
    viewportWidth: submission.viewportWidth,
    viewportHeight: submission.viewportHeight,
    sourcePasses: Object.freeze(['bust-actor-fixture', sourceVersion]),
    submissionId: submission.submissionId,
    causeId: submission.causeId,
    ageMs: submission.ageMs,
    variant: submission.variant,
    targetId: submission.targetId,
    lifecycleEpoch: submission.lifecycleEpoch,
  });
}

export function groupPhaseRuns(writes) {
  const runs = [];
  for (const write of writes) {
    const previous = runs.at(-1);
    if (!previous || previous.variant !== write.variant) {
      runs.push({ variant: write.variant, writes: [write] });
    } else {
      previous.writes.push(write);
    }
  }
  return runs.map((run) => {
    const first = run.writes[0], last = run.writes.at(-1);
    const completed = [...new Set(run.writes.filter((w) => w.completed === true).map((w) => w.submissionId))];
    return {
      variant: run.variant,
      writes: run.writes,
      firstAt: first.at,
      lastAt: last.at,
      firstAgeMs: first.ageMs,
      lastAgeMs: last.ageMs,
      elapsedMs: last.at - first.at,
      ageAdvanceMs: last.ageMs - first.ageMs,
      completedSubmissionIds: completed,
    };
  });
}

export function findCompletedStartBreakStart(writes, { start = 'timed-bust-start', broken = 'timed-bust-break' } = {}) {
  const runs = [];
  for (const write of writes) {
    const previous = runs.at(-1);
    if (!previous || previous.variant !== write.variant) runs.push({ variant: write.variant, writes: [write] });
    else previous.writes.push(write);
  }
  for (let i = 0; i + 2 < runs.length; i++) {
    const cycle = runs.slice(i, i + 3);
    if (cycle[0].variant !== start || cycle[1].variant !== broken || cycle[2].variant !== start) continue;
    const advanced = cycle.every((run) => {
      const first = run.writes[0], last = run.writes.at(-1);
      const completed = new Set(run.writes.filter((w) => w.completed === true).map((w) => w.submissionId));
      return run.writes.length >= 2 && last.at > first.at && last.ageMs > first.ageMs && completed.size >= 2;
    });
    if (!advanced) continue;
    return cycle.map((run) => {
      const first = run.writes[0], last = run.writes.at(-1);
      return { variant: run.variant, writes: run.writes, firstAt: first.at, lastAt: last.at, firstAgeMs: first.ageMs, lastAgeMs: last.ageMs, elapsedMs: last.at - first.at, ageAdvanceMs: last.ageMs - first.ageMs, completedSubmissionIds: [...new Set(run.writes.filter((w) => w.completed === true).map((w) => w.submissionId))] };
    });
  }
  return null;
}
