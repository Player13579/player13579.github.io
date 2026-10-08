const HEX_SHA256 = /^[a-f0-9]{64}$/i;
const closeImage = image => { try { image?.close?.(); } catch {} };

async function sha256Hex(bytes, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle?.digest) throw new Error('WebCrypto SHA-256 is required for pinned atlas loading');
  const digest = await cryptoImpl.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function asArrayBuffer(value) {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  throw new TypeError('atlas loader must return bytes');
}

export async function loadVerifiedPreviewAtlases({
  assets,
  loadBytes,
  decode,
  cryptoImpl = globalThis.crypto,
  isCurrent = () => true
} = {}) {
  if (!Array.isArray(assets) || assets.length === 0 || typeof loadBytes !== 'function' ||
      typeof decode !== 'function' || typeof isCurrent !== 'function')
    throw new TypeError('preview loader requires pinned assets, byte loader, decoder, and generation guard');
  const ids = new Set();
  for (const asset of assets) {
    if (!asset || !String(asset.id || '') || ids.has(String(asset.id)) || !asset.path ||
        !HEX_SHA256.test(String(asset.sha256 || '')) || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 ||
        !Number.isSafeInteger(asset.width) || asset.width <= 0 ||
        !Number.isSafeInteger(asset.height) || asset.height <= 0)
      throw new TypeError('each preview atlas needs a unique ID, exact SHA-256, byte count, and dimensions');
    ids.add(String(asset.id));
  }

  const decoded = [];
  const loaded = Object.create(null);
  try {
    for (const asset of assets) {
      if (!isCurrent()) throw new Error('stale-preview-load');
      const bytes = asArrayBuffer(await loadBytes(asset));
      if (bytes.byteLength !== asset.bytes) throw new Error(`atlas-byte-length:${asset.id}`);
      const actualSha256 = await sha256Hex(bytes, cryptoImpl);
      if (actualSha256.toLowerCase() !== asset.sha256.toLowerCase()) throw new Error(`atlas-sha256:${asset.id}`);
      const image = await decode(bytes, asset);
      if (!image) throw new Error(`atlas-decode-empty:${asset.id}`);
      decoded.push(image);
      if (!isCurrent()) throw new Error('stale-preview-load');
      if (image.width !== asset.width || image.height !== asset.height)
        throw new Error(`atlas-dimensions:${asset.id}`);
      loaded[asset.id] = Object.freeze({ id: asset.id, path: asset.path, sha256: actualSha256,
        bytes: bytes.byteLength, width: image.width, height: image.height, image });
    }
  } catch (error) {
    for (const image of decoded) closeImage(image);
    throw error;
  }

  let closed = false;
  return Object.freeze({
    assets: Object.freeze(loaded),
    close() {
      if (closed) return;
      closed = true;
      for (const image of decoded) closeImage(image);
    }
  });
}

export function browserPngDecoder({ ImageCtor = globalThis.Image, URLApi = globalThis.URL,
  BlobCtor = globalThis.Blob } = {}) {
  if (typeof ImageCtor !== 'function' || typeof URLApi?.createObjectURL !== 'function' ||
      typeof URLApi?.revokeObjectURL !== 'function' || typeof BlobCtor !== 'function')
    throw new TypeError('preview PNG decode requires Image, Blob, and object URL APIs');
  return (bytes, asset) => new Promise((resolve, reject) => {
    const url = URLApi.createObjectURL(new BlobCtor([bytes], { type: 'image/png' }));
    const image = new ImageCtor();
    let settled = false, closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      image.onload = null;
      image.onerror = null;
      try { image.removeAttribute('src'); } catch { image.src = ''; }
      URLApi.revokeObjectURL(url);
    };
    Object.defineProperty(image, 'close', { configurable: false, value: close });
    const fail = error => {
      if (settled) return;
      settled = true;
      close();
      reject(error instanceof Error ? error : new Error(`atlas-decode:${asset.id}`));
    };
    const finish = () => {
      if (settled) return;
      if (image.naturalWidth !== asset.width || image.naturalHeight !== asset.height) {
        fail(new Error(`atlas-decoder-dimensions:${asset.id}`));
        return;
      }
      settled = true;
      resolve(image);
    };
    image.onload = finish;
    image.onerror = () => fail(new Error(`atlas-decode:${asset.id}`));
    image.src = url;
    if (typeof image.decode === 'function') {
      try { Promise.resolve(image.decode()).then(finish, fail); }
      catch (error) { fail(error); }
    }
  });
}
