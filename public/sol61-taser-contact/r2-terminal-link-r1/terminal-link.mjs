// Technical lineage only. Expired causes are never active admissions.
export function terminalLinkTransport(expiry, submission, receipt, current, invalidReason = null) {
  const sameExpiry = expiry && submission?.expiredCauseRef?.previewSessionId === expiry.previewSessionId &&
    submission.expiredCauseRef.causeId === expiry.causeId && submission.expiredCauseRef.causeOrdinal === expiry.causeOrdinal &&
    submission.expiredCauseRef.expiryId === expiry.expiryId;
  const sameSubmission = receipt?.submissionId === submission?.submissionId &&
    receipt?.rendererGenerationId === submission?.rendererGenerationId && receipt?.deviceGenerationId === submission?.deviceGenerationId;
  return Boolean(!invalidReason && sameExpiry && sameSubmission && submission.terminalKind === 'expired-boundary' &&
    submission.admitted === false && submission.activeCauseRef === null && submission.eventCauseId === null &&
    submission.eventCauseOrdinal === null && submission.submittedAgeMs === 480 && receipt.completed === true &&
    receipt.queueWorkDone === true && receipt.ageMs === 480 && current.previewSessionId === submission.previewSessionId && current.activeCauseRef === null &&
    current.lifecycleGeneration === submission.lifecycleGeneration && current.causeEpoch === submission.causeEpoch &&
    current.controlRevision === submission.controlRevision && current.sourceEnabled === submission.sourceEnabled &&
    current.observerEnabled === submission.observerEnabled && current.disposed !== true && current.failed !== true &&
    current.held !== true && current.running === true);
}

export function assessTerminalCompletion(...args) {
  return terminalLinkTransport(...args);
}

export function createTerminalLinkTracker(identity) {
  if (!identity?.previewSessionId || !identity?.rendererGenerationId || !identity?.deviceGenerationId) throw new TypeError('complete runtime identity required');
  const pendingExpiries = [], invalidatedHistory = [];
  let fallbackSubmission = 0, lastSubmissionOrdinal = 0;
  const saveInvalidation = (item, reason) => {
    invalidatedHistory.push(Object.freeze({ status:'invalidated', expiredCauseRef:Object.freeze({
      previewSessionId:item.record.previewSessionId,causeId:item.record.causeId,
      causeOrdinal:item.record.causeOrdinal,expiryId:item.record.expiryId }),
      terminalSubmissionId:null,expiredCauseLinkMatchedAtCompletion:false,rejectReason:reason }));
    if(invalidatedHistory.length>16) invalidatedHistory.shift();
  };
  return Object.freeze({
    get pending() { return [...pendingExpiries].reverse().find(item => !item.result) ?? null; },
    get pendingRecords() { return pendingExpiries.filter(item => !item.result).map(item => item.record); },
    get invalidatedHistory() { return invalidatedHistory.slice(); },
    expire(cause, observed, uuid = () => crypto.randomUUID()) {
      if (pendingExpiries.length >= 2) throw new Error('terminal expiry references exceeded one inflight plus one current boundary');
      const record = Object.freeze({ previewSessionId: identity.previewSessionId,
        causeId: cause.id, causeOrdinal: cause.ordinal,
        startedAtSimMs: cause.startedAtSimMs, authoredDurationMs: 480,
        authoredExpiresAtSimMs: cause.startedAtSimMs + 480,
        expiryObservedAtSimMs: observed.simMs, expiryObservedAtWallMs: observed.wallMs,
        expiryId: uuid(), lifecycleGeneration: observed.lifecycleGeneration,
        causeEpoch: observed.causeEpoch, activeAfterExpiry: false });
      pendingExpiries.push({ record, invalidReason: null, submission: null, result: null });
      return record;
    },
    invalidate(reason) {
      for (const item of [...pendingExpiries]) {
        if (item.result) continue;
        if (item.submission) item.invalidReason ??= reason;
        else {
          saveInvalidation(item, reason);
          pendingExpiries.splice(pendingExpiries.indexOf(item), 1);
        }
      }
    },
    reserve({ ageMs, controlRevision, sourceEnabled, observerEnabled, lifecycleGeneration, causeEpoch, submissionId }) {
      if (pendingExpiries.some(candidate => candidate.submission && !candidate.result)) return null;
      const item = [...pendingExpiries].reverse().find(candidate => !candidate.submission && !candidate.result && !candidate.invalidReason &&
        candidate.record.lifecycleGeneration === lifecycleGeneration && candidate.record.causeEpoch === causeEpoch);
      if (!item || item.submission || item.result || item.invalidReason || ageMs !== 480) return null;
      const expiredCauseRef = Object.freeze({ previewSessionId: item.record.previewSessionId,
        causeId: item.record.causeId, causeOrdinal: item.record.causeOrdinal, expiryId: item.record.expiryId });
      const generatedOrdinal = Math.max(fallbackSubmission,lastSubmissionOrdinal)+1;
      const actualSubmissionId = submissionId ?? `${identity.rendererGenerationId}:${generatedOrdinal}`;
      const prefix = `${identity.rendererGenerationId}:`;
      const suffix = typeof actualSubmissionId === 'string' && actualSubmissionId.startsWith(prefix) ? actualSubmissionId.slice(prefix.length) : '';
      const ordinal = /^(?:0|[1-9]\d*)$/.test(suffix) ? Number(suffix) : NaN;
      if (!Number.isSafeInteger(ordinal) || ordinal <= lastSubmissionOrdinal) throw new TypeError('submissionId must be rendererGenerationId:monotonic-counter');
      lastSubmissionOrdinal = ordinal; fallbackSubmission = Math.max(fallbackSubmission,ordinal);
      const submission = Object.freeze({ terminalKind: 'expired-boundary', submissionId: actualSubmissionId,
        previewSessionId: identity.previewSessionId, rendererGenerationId: identity.rendererGenerationId,
        deviceGenerationId: identity.deviceGenerationId, lifecycleGeneration, causeEpoch,
        activeCauseRef: null, expiredCauseRef, admitted: false, eventCauseId: null, eventCauseOrdinal: null,
        submittedAgeMs: 480, controlRevision, sourceEnabled, observerEnabled });
      item.submission = submission;
      return submission;
    },
    complete(submission, receipt, current) {
      const item = pendingExpiries.find(candidate => candidate.submission === submission);
      const valid = item && item.submission === submission &&
        assessTerminalCompletion(item.record, submission, receipt, current, item.invalidReason);
      const result = Object.freeze({ status: valid ? 'linked' : 'rejected', expiredCauseRef: submission?.expiredCauseRef ?? null,
        terminalSubmissionId: submission?.submissionId ?? null, rendererGenerationId: receipt?.rendererGenerationId ?? null,
        deviceGenerationId: receipt?.deviceGenerationId ?? null, queueWorkDone: receipt?.queueWorkDone === true,
        completed: receipt?.completed === true, submittedAgeMs: submission?.submittedAgeMs ?? null,
        receiptAgeMs: receipt?.ageMs ?? null, expiredCauseLinkMatchedAtCompletion: valid,
        rejectReason: valid ? null : item?.invalidReason ?? 'identity-state-or-completion-mismatch' });
      if (item && item.submission === submission) { item.result = result; pendingExpiries.splice(pendingExpiries.indexOf(item), 1); }
      return result;
    },
    failed(submission, reason) {
      const item = pendingExpiries.find(candidate => candidate.submission === submission);
      if (!item || item.submission !== submission || item.result) return null;
      const result = Object.freeze({ status: 'failed', expiredCauseRef: submission.expiredCauseRef,
        terminalSubmissionId: submission.submissionId, rendererGenerationId: submission.rendererGenerationId,
        deviceGenerationId: submission.deviceGenerationId, expiredCauseLinkMatchedAtCompletion: false,
        rejectReason: String(reason || 'gpu-submit-failed') });
      item.result = result; pendingExpiries.splice(pendingExpiries.indexOf(item), 1); return result;
    },
    dispose() {
      const rows = pendingExpiries.map(item => Object.freeze({ status: 'failed', expiredCauseRef: Object.freeze({
        previewSessionId: item.record.previewSessionId, causeId: item.record.causeId,
        causeOrdinal: item.record.causeOrdinal, expiryId: item.record.expiryId }),
        terminalSubmissionId: item.submission?.submissionId ?? null,
        rendererGenerationId: identity.rendererGenerationId, deviceGenerationId: identity.deviceGenerationId,
        expiredCauseLinkMatchedAtCompletion: false, rejectReason: 'disposed-before-terminal-link-completion' }));
      pendingExpiries.length = 0; return rows;
    }
  });
}

// Shared transport predicate used by the runtime and CPU callback fixtures.
export async function awaitQueueReceipt(queue, submit, identity, submissionId, ageMs, segments) {
  submit();
  await queue.onSubmittedWorkDone();
  return Object.freeze({ submissionId, rendererGenerationId: identity.rendererGenerationId,
    deviceGenerationId: identity.deviceGenerationId, ageMs, completed: true, queueWorkDone: true, segments });
}
