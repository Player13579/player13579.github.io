(() => {
  'use strict';
  const marker = '__dotIceR11Registration';
  if (window[marker]) return;
  const original = window.mergeEGalleryHistory;
  if (typeof original !== 'function') throw new Error('R11 registration requires gallery history');
  const version = Object.freeze({"id":"dot-ice-impact-r11-cloud","title":"氷結水の着弾 · dot R11 cloud","page":"/public/dot-ice-impact/r11-cloud/index.html?embed=1&galleryAutoLoop=1&galleryVersionId=dot-ice-impact-r11-cloud&viewScale=5","source":"/public/dot-ice-impact/r11-cloud/MANIFEST.json","anchor":"effect-H64","zoom":1,"previewKind":"webgpu","replayable":true,"previewOnly":true,"galleryListingEligible":true,"publicationEligible":false,"creatorModelId":"not-exposed","creatorDisplayName":"dot","originalCreatorDisplayName":"dot","designAuthorDisplayName":"dot","runtimeAuthorDisplayName":"dot","adoption":"unknown","userAdopted":false,"qualityReviewStatus":"not-accepted","qualityAccepted":false,"technicalReplayStatus":"pass-offscreen-native-limited","parentGalleryReplayStatus":"not_run","sfxListeningStatus":"not_run","normalAudioListening":"not_run","safariReplayStatus":"unverified","gameIntegrationStatus":"not_connected","qualityEvidence":"/public/dot-ice-impact/r11-cloud/EVIDENCE.json","status":"未採用・品質未受入・実ブラウザ未確認","detail":"右奥相補片の床面速度を調整し、右組の幅と離開を比較。56描画のCPU-native GPU検証合格。右組の床隙間は未達。 暗床の氷材質Cは未達。実ブラウザ・実時間連続再生・聴感・Safari・本編は未確認。dotのみ版上限なし。","currentPublicParentReplayStatus":"not_run","qualityStatus":"not-accepted","qualityReviewerDisplayName":"GPT-6.2-Astra","creativeEdition":11,"creativeEditionLimit":null,"remainingCreativeEditions":null});
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
