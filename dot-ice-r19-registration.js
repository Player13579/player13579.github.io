(() => {
  'use strict';
  const marker = '__dotIceR19Registration';
  if (window[marker]) return;
  const original = window.mergeEGalleryHistory;
  if (typeof original !== 'function') throw new Error('R19 registration requires gallery history');
  const version = Object.freeze({"id":"dot-ice-impact-r19-cloud","title":"氷結水の着弾 · dot R19 圧氷棚の横ずれと陥没","page":"/public/dot-ice-impact/r19-cloud/index.html?embed=1&galleryAutoLoop=1&galleryVersionId=dot-ice-impact-r19-cloud&viewScale=5","source":"/public/dot-ice-impact/r19-cloud/MANIFEST.json","anchor":"effect-H64","zoom":1,"previewKind":"webgpu","replayable":true,"previewOnly":true,"galleryListingEligible":true,"publicationEligible":false,"creatorModelId":"not-exposed","creatorDisplayName":"dot","originalCreatorDisplayName":"dot","designAuthorDisplayName":"dot","runtimeAuthorDisplayName":"dot","adoption":"unknown","userAdopted":false,"qualityReviewStatus":"not-accepted","qualityAccepted":false,"technicalReplayStatus":"pass-offscreen-native-limited","parentGalleryReplayStatus":"not_run","sfxListeningStatus":"not_run","normalAudioListening":"not_run","safariReplayStatus":"unverified","gameIntegrationStatus":"not_connected","qualityEvidence":"/public/dot-ice-impact/r19-cloud/EVIDENCE.json","status":"比較試作／最終品質未達／本編未接続","detail":"前側の氷棚が横に滑り、底氷が奥へ抜けると、支えを失った中央部が一拍遅れて沈む。H64・通常速度で前版との差を確認。割れる前の塊が積み石、割れた後の面が鉱石やガラスにも見え、最終品質は未達。実ブラウザー描画・聴感・本編接続は未確認。","currentPublicParentReplayStatus":"not_run","qualityStatus":"not-accepted","qualityReviewerDisplayName":"独立比較レビュー","creativeEdition":19,"creativeEditionLimit":null,"remainingCreativeEditions":null});
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
