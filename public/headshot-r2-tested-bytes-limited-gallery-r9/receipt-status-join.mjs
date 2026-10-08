// Join the source's serialized #status observation back to its retained snapshot
// receipt. JSON.parse creates a new object, so identity applies only to the
// snapshot/native observer join performed by buildActiveProof.
export function receiptStatusMatchesSnapshot(parsed, snapshotReceipt, sourceVersion) {
  if (!parsed || parsed.version !== sourceVersion || !snapshotReceipt ||
      !parsed.receipt || typeof parsed.receipt !== 'object') return false;
  const stated = parsed.receipt;
  return [
    'submitSerial', 'eventId', 'targetId', 'targetSurfaceId', 'generation',
    'ageMs', 'active', 'clear', 'backingWidth', 'backingHeight'
  ].every(key => stated[key] === snapshotReceipt[key]);
}
