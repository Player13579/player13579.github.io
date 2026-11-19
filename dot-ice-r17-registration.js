(() => {
  'use strict';
  const marker = '__dotIceR17Registration';
  if (window[marker]) return;
  const original = window.mergeEGalleryHistory;
  if (typeof original !== 'function') throw new Error('R17 registration requires gallery history');
  const version = Object.freeze({"id":"dot-ice-impact-r17-cloud","title":"氷結水の着弾 · dot R17 割れ走りと食い止まり","page":"/public/dot-ice-impact/r17-cloud/index.html?embed=1&galleryAutoLoop=1&galleryVersionId=dot-ice-impact-r17-cloud&viewScale=5","source":"/public/dot-ice-impact/r17-cloud/MANIFEST.json","anchor":"effect-H64","zoom":1,"previewKind":"webgpu","replayable":true,"previewOnly":true,"galleryListingEligible":true,"publicationEligible":false,"creatorModelId":"not-exposed","creatorDisplayName":"dot","originalCreatorDisplayName":"dot","designAuthorDisplayName":"dot","runtimeAuthorDisplayName":"dot","adoption":"unknown","userAdopted":false,"qualityReviewStatus":"not-accepted","qualityAccepted":false,"technicalReplayStatus":"pass-offscreen-native-limited","parentGalleryReplayStatus":"not_run","sfxListeningStatus":"not_run","normalAudioListening":"not_run","safariReplayStatus":"unverified","gameIntegrationStatus":"not_connected","qualityEvidence":"/public/dot-ice-impact/r17-cloud/EVIDENCE.json","status":"比較試作／最終品質未達／本編未接続","detail":"氷結水の塊の表面を割れが走ってから、五つの破片が順に外れる。H64・通常速度でR16と輪郭と着地の動きが異なる比較試作。音は同じ接触と破断の計画から生成。最終品質未達。実ブラウザー描画・通常音の聴感・本編接続は未確認。","currentPublicParentReplayStatus":"not_run","qualityStatus":"not-accepted","qualityReviewerDisplayName":"独立比較レビュー","creativeEdition":17,"creativeEditionLimit":null,"remainingCreativeEditions":null});
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
