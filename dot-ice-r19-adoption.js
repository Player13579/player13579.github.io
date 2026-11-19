(() => {
  'use strict';
  const marker = '__dotIceR19UserAdoption';
  if (window[marker]) return;
  const merge = window.mergeEGalleryHistory;
  if (typeof merge !== 'function') throw new Error('R19 adoption requires gallery history');
  const id = 'dot-ice-impact-r19-cloud';
  window.mergeEGalleryHistory = function (base, history) {
    const groups = merge.call(this, base, history);
    return Object.freeze(groups.map(group => {
      if (group.id !== 'dot-ice-impact' || !group.versions.some(item => item.id === id)) return group;
      const versions = group.versions.map(item => {
        if (item.id !== id) return item;
        const adoptionHistory = Object.freeze([...(item.adoptionHistory || []), Object.freeze({status:'adopted', date:'2026-11-19', scope:'gallery'})]);
        return Object.freeze({...item, adoption:'adopted', userAdopted:true, adoptionHistory,
          qualityReviewRelation:'before-adoption', status:'ユーザー採用済み／採用前の最終品質未達／本編未接続'});
      });
      return Object.freeze({...group, adoption:'adopted', defaultVersionId:id, versions:Object.freeze(versions)});
    }));
  };
  window[marker] = id;
})();
