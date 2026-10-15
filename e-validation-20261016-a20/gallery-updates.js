(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DvaGalleryUpdates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'dva-gallery-effect-versions-seen-v1';
  const SNAPSHOT_SCHEMA = 2;


  function safeSnapshot(raw) {
    if (typeof raw !== 'string') return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || (parsed.schema !== 1 && parsed.schema !== SNAPSHOT_SCHEMA) || !parsed.groups || typeof parsed.groups !== 'object' || Array.isArray(parsed.groups)) return null;
      const groups = Object.create(null);
      for (const groupId of Object.keys(parsed.groups)) {
        if (groupId === '__proto__' || groupId === 'constructor' || groupId === 'prototype') continue;
        const versions = parsed.groups[groupId];
        if (!versions || typeof versions !== 'object' || Array.isArray(versions)) return null;
        const safeVersions = Object.create(null);
        for (const versionId of Object.keys(versions)) {
          if (versionId === '__proto__' || versionId === 'constructor' || versionId === 'prototype') continue;
          if (typeof versions[versionId] !== 'string') return null;
          safeVersions[versionId] = versions[versionId];
        }
        groups[groupId] = safeVersions;
      }
      return groups;
    } catch (_) {
      return null;
    }
  }

  function createVisit(groups, storageProvider) {
    const current = Object.create(null);
    const updatedGroupIds = new Set();
    let versionCount = 0;
    let storage = null;
    let prior = null;
    let committed = false;

    try {
      storage = typeof storageProvider === 'function' ? storageProvider() : storageProvider;
      if (storage) prior = safeSnapshot(storage.getItem(STORAGE_KEY));
    } catch (_) {
      storage = null;
      prior = null;
    }

    (Array.isArray(groups) ? groups : []).forEach(function (group) {
      if (!group || typeof group.id !== 'string' || !group.id || group.id === '__proto__' || group.id === 'constructor' || group.id === 'prototype') return;
      const groupId = group.id;
      const versionMap = Object.prototype.hasOwnProperty.call(current, groupId) ? current[groupId] : Object.create(null);
      const versions = Array.isArray(group.versions) ? group.versions : [];
      versions.forEach(function (version) {
        if (!version || typeof version.id !== 'string' || !version.id || version.id === '__proto__' || version.id === 'constructor' || version.id === 'prototype') return;
        const versionId = version.id;
        if (Object.prototype.hasOwnProperty.call(versionMap, versionId)) return;
        const value = 'seen';
        versionMap[versionId] = value;
        if (prior && (!prior[groupId] || !Object.prototype.hasOwnProperty.call(prior[groupId], versionId))) {
          versionCount += 1;
          updatedGroupIds.add(groupId);
        }
      });
      current[groupId] = versionMap;
    });

    return {
      versionCount: versionCount,
      updatedGroupIds: updatedGroupIds,
      sortGroups: function (input) {
        return (Array.isArray(input) ? input : []).map(function (group, index) { return { group: group, index: index }; })
          .sort(function (a, b) {
            const aUpdated = a.group && updatedGroupIds.has(a.group.id) ? 1 : 0;
            const bUpdated = b.group && updatedGroupIds.has(b.group.id) ? 1 : 0;
            return bUpdated - aUpdated || a.index - b.index;
          }).map(function (entry) { return entry.group; });
      },
      commitSeen: function () {
        if (committed) return true;
        if (!storage || typeof storage.setItem !== 'function') return false;
        try {
          const remembered = Object.create(null);
          if (prior) {
            Object.keys(prior).forEach(function (groupId) { remembered[groupId] = Object.assign(Object.create(null), prior[groupId]); });
          }
          Object.keys(current).forEach(function (groupId) {
            const versions = remembered[groupId] || (remembered[groupId] = Object.create(null));
            Object.keys(current[groupId]).forEach(function (versionId) { versions[versionId] = 'seen'; });
          });
          storage.setItem(STORAGE_KEY, JSON.stringify({ schema: SNAPSHOT_SCHEMA, groups: remembered }));
          committed = true;
          return true;
        } catch (_) {
          return false;
        }
      }
    };
  }

  return Object.freeze({ STORAGE_KEY: STORAGE_KEY, createVisit: createVisit });
});
