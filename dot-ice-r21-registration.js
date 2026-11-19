(() => {
  'use strict';
  const marker = '__dotIceR21Registration';
  if (window[marker]) return;
  const original = window.mergeEGalleryHistory;
  if (typeof original !== 'function') throw new Error('R21 registration requires gallery history');
  const version = Object.freeze({"id":"dot-ice-impact-r21-cloud","title":"氷結水の着弾 · dot R21 層氷の座屈・折れ落ち","page":"/public/dot-ice-impact/r21-cloud/index.html?embed=1&galleryAutoLoop=1&galleryVersionId=dot-ice-impact-r21-cloud&viewScale=5","source":"/public/dot-ice-impact/r21-cloud/MANIFEST.json","anchor":"effect-H64","zoom":1,"previewKind":"webgpu","replayable":true,"previewOnly":true,"galleryListingEligible":true,"publicationEligible":false,"creatorModelId":"not-exposed","creatorDisplayName":"dot","originalCreatorDisplayName":"dot","designAuthorDisplayName":"dot","runtimeAuthorDisplayName":"dot","adoption":"unknown","userAdopted":false,"qualityReviewStatus":"not-accepted","qualityAccepted":false,"technicalReplayStatus":"pass-offscreen-native-limited","parentGalleryReplayStatus":"not_run","sfxListeningStatus":"not_run","normalAudioListening":"not_run","safariReplayStatus":"unverified","gameIntegrationStatus":"not_connected","qualityEvidence":"/public/dot-ice-impact/r21-cloud/EVIDENCE.json","status":"比較試作／最終品質未達／本編未接続","detail":"床の両端で押された氷の層が折れ曲がり、長い側が持ち上がって一度止まる。先端を床につけたまま回転して落ち、短い側が遅れて着地する。H64・通常速度でR20との輪郭と動きの違いを確認。途中で蝶番付きの板のように見え、断面の平らさも残る。氷の最終品質、実ブラウザー描画と実機の聴感は未確認。本編未接続。","currentPublicParentReplayStatus":"not_run","qualityStatus":"not-accepted","qualityReviewerDisplayName":"独立比較レビュー","creativeEdition":21,"creativeEditionLimit":null,"remainingCreativeEditions":null});
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
