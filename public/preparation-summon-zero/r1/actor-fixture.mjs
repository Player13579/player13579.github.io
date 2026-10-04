// Existing non-Bot actor art, copied byte-for-byte from the prior gallery's
// pinned production fixture. This is the only raster input; it is not E art.
export const ACTOR_FIXTURE = Object.freeze({
  sourcePackage: 'outputs/request-20261004/preparation-summon-gallery-luna-r1/package',
  sourceManifest: 'PACKAGE-MANIFEST.json',
  sourceManifestSha256: '42f6d7330fed152bcffc8f6bdc6366489124c6cfad84f225924d7ff77783152d',
  sourcePath: 'assets/generated/philia-front-nine-v752.png',
  sourceBytes: 399216,
  sourceSha256: '4f1901dfd275bfec01b6f4fd7da66f190e0b2396320de2fb36cc20a5e36490a3',
  imageWidth: 768,
  imageHeight: 768,
  idleCell: Object.freeze({ x: 0, y: 0, width: 256, height: 256 }),
  alphaBoundsExclusive: Object.freeze([57, 16, 198, 241]),
  visibleAlphaHeightWorld: 64,
  anchorOrigin: Object.freeze([128, 240]),
  sourceOffsetBelowFootWorld: 30,
  actorKind: 'human-front-idle',
  bot: false
});

export const ACTOR_ALPHA_HEIGHT = ACTOR_FIXTURE.alphaBoundsExclusive[3] - ACTOR_FIXTURE.alphaBoundsExclusive[1];
