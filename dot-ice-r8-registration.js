(() => {
  'use strict';
  const marker = '__dotIceR8Registration';
  if (window[marker]) return;
  const original = window.mergeEGalleryHistory;
  if (typeof original !== 'function') throw new Error('R8 registration requires gallery history');
  const version = Object.freeze({"id":"dot-ice-impact-r8-cloud","title":"氷結水の着弾 · dot R8 cloud","page":"/public/dot-ice-impact/r8-cloud/index.html?embed=1&galleryAutoLoop=1&galleryVersionId=dot-ice-impact-r8-cloud&viewScale=5","source":"/public/dot-ice-impact/r8-cloud/MANIFEST.json","anchor":"effect-H64","zoom":1,"previewKind":"webgpu","replayable":true,"previewOnly":true,"galleryListingEligible":true,"publicationEligible":false,"creatorModelId":"not-exposed","creatorDisplayName":"dot","originalCreatorDisplayName":"dot","designAuthorDisplayName":"dot","runtimeAuthorDisplayName":"dot","adoption":"unknown","userAdopted":false,"qualityReviewStatus":"not-accepted","qualityAccepted":false,"technicalReplayStatus":"pass-offscreen-native-limited","parentGalleryReplayStatus":"not_run","sfxListeningStatus":"not_run","normalAudioListening":"not_run","safariReplayStatus":"unverified","gameIntegrationStatus":"not_connected","qualityEvidence":"/public/dot-ice-impact/r8-cloud/EVIDENCE.json","status":"未採用・品質未受入・実ブラウザ未確認","detail":"R7の形状・運動・実床テクスチャ透過を保持し、物体固定の乳白散乱域と透過窓を追加。CPU-native WebGPUの112描画はエラーなし。独立審査は局所目標達成、暗床の氷材質は未達。実ブラウザ・実時間再生・聴感・Safari・本編は未確認。dotのみ版上限なし。","currentPublicParentReplayStatus":"not_run","qualityStatus":"not-accepted","qualityReviewerDisplayName":"GPT-6.2-Astra","creativeEdition":8,"creativeEditionLimit":null,"remainingCreativeEditions":null});
  window.mergeEGalleryHistory = function (base, additions) {
    const patched = base.map(group => {
      if (group.id !== 'dot-ice-impact') return group;
      if (group.versions.some(item => item.id === version.id)) return group;
      return { ...group, defaultVersionId: version.id, latestVersionId: version.id,
        versions: [version, ...group.versions] };
    });
    return original.call(this, patched, additions);
  };
  window[marker] = version.id;
})();
