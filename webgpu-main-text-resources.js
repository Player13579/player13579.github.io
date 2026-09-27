/* Text resource owner for the shared main WebGPU device. No canvas or adapter
 * is created here; all glyph pages are uploaded by DvaWebGPUText. */
(function (root) {
  'use strict';
  const defaultText = root.DvaWebGPUText ||
    (typeof require === 'function' ? require('./webgpu-text.js') : null);
  const scriptUrl = root.document?.currentScript?.src || root.location?.href;
  const defaultBaseUrl = scriptUrl
    ? new URL('assets/generated/webgpu-text/', scriptUrl).href : null;

  function normalizeBaseUrl(atlasBaseUrl) {
    if (!atlasBaseUrl) return null;
    return new URL(atlasBaseUrl, root.location?.href || 'https://invalid.local/').href;
  }

  function validateManifest(manifest) {
    if (manifest?.schema !== 'dva-webgpu-text-atlas-v1' ||
        !Number.isFinite(manifest.ascent) ||
        !Number.isFinite(manifest.pixelSize) || manifest.pixelSize <= 0 ||
        !Array.isArray(manifest.pages) || !manifest.pages.length)
      throw new Error('Main WebGPU text atlas manifest invalid');
    return manifest;
  }

  function preloadManifest({ atlasBaseUrl = defaultBaseUrl,
    fetcher = root.fetch, signal } = {}) {
    const baseUrl = normalizeBaseUrl(atlasBaseUrl);
    if (!baseUrl || typeof fetcher !== 'function')
      throw new TypeError('Text atlas manifest URL and fetcher required');
    let responsePromise;
    try {
      responsePromise = Promise.resolve(fetcher(new URL('atlas.json', baseUrl).href,
        signal ? { signal } : undefined));
    } catch (error) {
      responsePromise = Promise.reject(error);
    }
    const promise = responsePromise.then(async response => {
      if (!response?.ok || typeof response.json !== 'function')
        throw new Error('Main WebGPU text atlas manifest unavailable');
      return validateManifest(await response.json());
    });
    // Keep a request started speculatively from becoming an unhandled rejection
    // before the renderer is ready to consume it.
    promise.catch(() => {});
    return Object.freeze({ baseUrl, promise });
  }

  async function create({ device, atlasBaseUrl = defaultBaseUrl,
    manifestRequest = null, fetcher = root.fetch, decode = root.createImageBitmap,
    textApi = defaultText } = {}) {
    if (!device?.createTexture || !device.queue?.copyExternalImageToTexture ||
        !atlasBaseUrl || typeof fetcher !== 'function' ||
        typeof decode !== 'function' || typeof textApi?.upload !== 'function')
      throw new TypeError('Shared WebGPU device and text atlas loader required');
    const baseUrl = normalizeBaseUrl(atlasBaseUrl);
    if (manifestRequest && (manifestRequest.baseUrl !== baseUrl ||
        !manifestRequest.promise || typeof manifestRequest.promise.then !== 'function'))
      throw new Error('Main WebGPU text atlas manifest request URL differs');
    const manifest = validateManifest(await (manifestRequest
      ? manifestRequest.promise
      : preloadManifest({ atlasBaseUrl: baseUrl, fetcher }).promise));
    const textAtlas = await textApi.upload({ device, manifest, baseUrl,
      fetcher, decode });
    if (!textAtlas?.ensure || !textAtlas?.layout ||
        !Array.isArray(textAtlas.textures) ||
        typeof textAtlas.destroy !== 'function') {
      textAtlas?.destroy?.();
      throw new Error('Main WebGPU text atlas upload invalid');
    }
    let destroyed = false;
    return Object.freeze({
      get device() { return device; },
      get textAtlas() {
        if (destroyed) throw new Error('Main WebGPU text resources destroyed');
        return textAtlas;
      },
      atlasMetrics: Object.freeze({ ascent: manifest.ascent,
        pixelSize: manifest.pixelSize }),
      destroy() {
        if (destroyed) return;
        destroyed = true;
        textAtlas.destroy();
      }
    });
  }

  const api = Object.freeze({ create, preloadManifest });
  root.DvaWebGPUMainTextResources = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
