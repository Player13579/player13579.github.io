(() => {
  'use strict';
  const marker = '__dotIceR20Registration';
  if (window[marker]) return;
  const original = window.mergeEGalleryHistory;
  if (typeof original !== 'function') throw new Error('R20 registration requires gallery history');
  const version = Object.freeze({"id":"dot-ice-impact-r20-cloud","title":"氷結水の着弾 · dot R20 圧氷レンズの斜断と乗り上げ","page":"/public/dot-ice-impact/r20-cloud/index.html?embed=1&galleryAutoLoop=1&galleryVersionId=dot-ice-impact-r20-cloud&viewScale=5","source":"/public/dot-ice-impact/r20-cloud/MANIFEST.json","anchor":"effect-H64","zoom":1,"previewKind":"webgpu","replayable":true,"previewOnly":true,"galleryListingEligible":true,"publicationEligible":false,"creatorModelId":"not-exposed","creatorDisplayName":"dot","originalCreatorDisplayName":"dot","designAuthorDisplayName":"dot","runtimeAuthorDisplayName":"dot","adoption":"unknown","userAdopted":false,"qualityReviewStatus":"not-accepted","qualityAccepted":false,"technicalReplayStatus":"pass-offscreen-native-limited","parentGalleryReplayStatus":"not_run","sfxListeningStatus":"not_run","normalAudioListening":"not_run","safariReplayStatus":"unverified","gameIntegrationStatus":"not_connected","qualityEvidence":"/public/dot-ice-impact/r20-cloud/EVIDENCE.json","status":"比較試作／最終品質未達／本編未接続","detail":"一つの塊が斜めに割れ、片側が割れ面を滑って乗り上げたあと、傾いて床に落ちる。原寸H64・通常速度でR19との形と動きの違いを確認。離れたあとに長く揃った縁がカットガラスにも見え、氷の質感は最終品質未達。実ブラウザー描画・聴感・本編接続は未確認。","currentPublicParentReplayStatus":"not_run","qualityStatus":"not-accepted","qualityReviewerDisplayName":"独立比較レビュー","creativeEdition":20,"creativeEditionLimit":null,"remainingCreativeEditions":null});
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
