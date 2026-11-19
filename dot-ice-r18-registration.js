(() => {
  'use strict';
  const marker = '__dotIceR18Registration';
  if (window[marker]) return;
  const original = window.mergeEGalleryHistory;
  if (typeof original !== 'function') throw new Error('R18 registration requires gallery history');
  const version = Object.freeze({"id":"dot-ice-impact-r18-cloud","title":"氷結水の着弾 · dot R18 凍り芯の層割れ","page":"/public/dot-ice-impact/r18-cloud/index.html?embed=1&galleryAutoLoop=1&galleryVersionId=dot-ice-impact-r18-cloud&viewScale=5","source":"/public/dot-ice-impact/r18-cloud/MANIFEST.json","anchor":"effect-H64","zoom":1,"previewKind":"webgpu","replayable":true,"previewOnly":true,"galleryListingEligible":true,"publicationEligible":false,"creatorModelId":"not-exposed","creatorDisplayName":"dot","originalCreatorDisplayName":"dot","designAuthorDisplayName":"dot","runtimeAuthorDisplayName":"dot","adoption":"unknown","userAdopted":false,"qualityReviewStatus":"not-accepted","qualityAccepted":false,"technicalReplayStatus":"pass-offscreen-native-limited","parentGalleryReplayStatus":"not_run","sfxListeningStatus":"not_run","normalAudioListening":"not_run","safariReplayStatus":"unverified","gameIntegrationStatus":"not_connected","qualityEvidence":"/public/dot-ice-impact/r18-cloud/EVIDENCE.json","status":"比較試作／最終品質未達／本編未接続","detail":"厚みのある塊から上の三片が順にめくれ、薄い片が低く滑る。H64・通常速度の比較でR17との違いを確認。初期の形が石けんや樹脂にも見え、氷の材質は最終品質未達。音の実機での聴感、ブラウザー描画、本編接続は未確認。","currentPublicParentReplayStatus":"not_run","qualityStatus":"not-accepted","qualityReviewerDisplayName":"独立比較レビュー","creativeEdition":18,"creativeEditionLimit":null,"remainingCreativeEditions":null});
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
