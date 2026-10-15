(function (root) {
  'use strict';
  // Archived records remain preserved but are not ordinary replay entries.
  function accepted(version) {
    const gate = version.galleryAcceptance;
    return version.publicationEligible === true && version.replayable === true &&
      version.historyOnly === false && version.listingExcluded !== true &&
      gate && ["entry", "closure", "nativeGpu", "normalSfx", "parentDisplay"].every(key => gate[key] === "pass");
  }
  function mergeHistory(base, additions) {
    const remaining = new Map();
    for (const row of additions) {
      if (!row || !row.groupId || !row.version?.id) throw new Error('Invalid E history record');
      if (!accepted(row.version)) continue;
      if (!remaining.has(row.groupId)) remaining.set(row.groupId, []);
      remaining.get(row.groupId).push(row);
    }
    const append = (group, rows) => {
      const versions = group.versions.filter(Boolean);
      const ids = new Set(versions.map(item => item.id));
      for (const row of rows) {
        if (ids.has(row.version.id)) throw new Error('Duplicate E history version: ' + row.version.id);
        ids.add(row.version.id);
        versions.push(Object.freeze({ ...row.version }));
      }
      return Object.freeze({ ...group, versions: Object.freeze(versions) });
    };
    const result = base.map(group => {
      const rows = remaining.get(group.id) || [];
      remaining.delete(group.id);
      return append(group, rows);
    });
    for (const [id, rows] of remaining) {
      result.push(append({ id, title: rows[0].groupTitle || id,
        defaultVersionId: rows[0].version.id, integration: 'not-integrated', versions: [] }, rows));
    }
    return Object.freeze(result);
  }
  root.mergeEGalleryHistory = mergeHistory;
  if (typeof module !== 'undefined' && module.exports) module.exports = { mergeHistory };
})(typeof window === 'undefined' ? globalThis : window);
