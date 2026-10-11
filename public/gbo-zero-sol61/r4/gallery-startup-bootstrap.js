(() => {
  const query = new URLSearchParams(location.search);
  const versionId = query.get('galleryVersionId');
  const token = query.get('galleryStartupToken');
  const attemptEpoch = Number(query.get('galleryAttemptEpoch'));
  if (versionId !== 'gbo-zero-sol61-r4' || !token || !Number.isSafeInteger(attemptEpoch) || attemptEpoch < 1) return;
  window.__dvaGalleryStartupContext = {
    schema: 'dva-gallery-startup-context/v1', token, versionId, attemptEpoch,
    sequence: 0, rank: -1, retired: false, current: { schema:'dva-gallery-startup/v1', token, versionId, attemptEpoch, sequence:0, stage:'child-document', status:'pending' }
  };
  Object.defineProperty(window, '__dvaGalleryStartupSnapshot', { value:() => window.__dvaGalleryStartupContext.current, configurable:false });
  if (window.parent !== window) window.parent.postMessage(window.__dvaGalleryStartupContext.current, location.origin);
})();
