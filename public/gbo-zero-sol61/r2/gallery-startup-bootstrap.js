(() => {
  const query = new URLSearchParams(location.search);
  const versionId = query.get('galleryVersionId');
  const token = query.get('galleryStartupToken');
  const attemptEpoch = Number(query.get('galleryAttemptEpoch'));
  if (versionId !== 'gbo-zero-sol61-r2' || !token || !Number.isSafeInteger(attemptEpoch) || attemptEpoch < 1) return;
  window.__dvaGalleryStartupContext = {
    schema: 'dva-gallery-startup-context/v1', token, versionId, attemptEpoch,
    sequence: 0, rank: -1, retired: false, current: null
  };
})();
