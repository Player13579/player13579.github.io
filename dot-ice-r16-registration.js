(() => {
  'use strict';
  const marker = '__dotIceR16Registration';
  if (window[marker]) return;
  const original = window.mergeEGalleryHistory;
  if (typeof original !== 'function') throw new Error('R16 registration requires gallery history');
  const version = Object.freeze({"id":"dot-ice-impact-r16-cloud","title":"氷結水の着弾 · dot R16 層氷の剥離","page":"/public/dot-ice-impact/r16-cloud/index.html?embed=1&galleryAutoLoop=1&galleryVersionId=dot-ice-impact-r16-cloud&viewScale=5","source":"/public/dot-ice-impact/r16-cloud/MANIFEST.json","anchor":"effect-H64","zoom":1,"previewKind":"webgpu","replayable":true,"previewOnly":true,"galleryListingEligible":true,"publicationEligible":false,"creatorModelId":"not-exposed","creatorDisplayName":"dot","originalCreatorDisplayName":"dot","designAuthorDisplayName":"dot","runtimeAuthorDisplayName":"dot","adoption":"unknown","userAdopted":false,"qualityReviewStatus":"not-accepted","qualityAccepted":false,"technicalReplayStatus":"pass-offscreen-native-limited","parentGalleryReplayStatus":"not_run","sfxListeningStatus":"not_run","normalAudioListening":"not_run","safariReplayStatus":"unverified","gameIntegrationStatus":"not_connected","qualityEvidence":"/public/dot-ice-impact/r16-cloud/EVIDENCE.json","status":"比較試作／最終品質未達／本編未接続","detail":"H64の同条件比較で、幅広い氷の上層がめくれ、下の塊が床を滑る形と動きを確認。GPU検証はソフトウェアのオフスクリーン描画。実時間再生、聴感、実機性能、本編接続の合格を示さない。","currentPublicParentReplayStatus":"not_run","qualityStatus":"not-accepted","qualityReviewerDisplayName":"独立比較レビュー","creativeEdition":16,"creativeEditionLimit":null,"remainingCreativeEditions":null});
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
