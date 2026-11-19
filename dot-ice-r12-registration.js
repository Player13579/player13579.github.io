(() => {
  'use strict';
  const marker = '__dotIceR12Registration';
  if (window[marker]) return;
  const original = window.mergeEGalleryHistory;
  if (typeof original !== 'function') throw new Error('R12 registration requires gallery history');
  const version = Object.freeze({"id":"dot-ice-impact-r12-cloud","title":"氷結水の着弾 · dot R12 cloud","page":"/public/dot-ice-impact/r12-cloud/index.html?embed=1&galleryAutoLoop=1&galleryVersionId=dot-ice-impact-r12-cloud&viewScale=5","source":"/public/dot-ice-impact/r12-cloud/MANIFEST.json","anchor":"effect-H64","zoom":1,"previewKind":"webgpu","replayable":true,"previewOnly":true,"galleryListingEligible":true,"publicationEligible":false,"creatorModelId":"not-exposed","creatorDisplayName":"dot","originalCreatorDisplayName":"dot","designAuthorDisplayName":"dot","runtimeAuthorDisplayName":"dot","adoption":"unknown","userAdopted":false,"qualityReviewStatus":"not-accepted","qualityAccepted":false,"technicalReplayStatus":"pass-offscreen-native-limited","parentGalleryReplayStatus":"not_run","sfxListeningStatus":"not_run","normalAudioListening":"not_run","safariReplayStatus":"unverified","gameIntegrationStatus":"not_connected","qualityEvidence":"/public/dot-ice-impact/r12-cloud/EVIDENCE.json","status":"未採用・品質未受入・実ブラウザ未確認","detail":"右奥相補片の離開速度を増し、実寸で3〜4pxの床隙間を確保。56描画のCPU-native GPU検証合格。離開の局所目標は達成。 暗床の氷材質Cは未達。実ブラウザ・実時間連続再生・聴感・Safari・本編は未確認。dotのみ版上限なし。","currentPublicParentReplayStatus":"not_run","qualityStatus":"not-accepted","qualityReviewerDisplayName":"GPT-6.2-Astra","creativeEdition":12,"creativeEditionLimit":null,"remainingCreativeEditions":null});
  window.mergeEGalleryHistory = function (base, additions) {
    const merged = original.call(this, base, additions);
    return Object.freeze(merged.map(group => {
      if (group.id !== 'dot-ice-impact' || group.versions.some(item => item.id === version.id)) return group;
      return Object.freeze({ ...group, defaultVersionId: version.id, latestVersionId: version.id,
        versions: Object.freeze([version, ...group.versions]) });
    }));
  };
  window[marker] = version.id;
})();
