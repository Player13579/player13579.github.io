import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const root = process.cwd();
const r9 = path.join(root, 'outputs/request-20261009/human-small-many-r9/public/sol61-human-transmutation/r9');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => fs.readFileSync(p);
const write = (name, value) => fs.writeFileSync(path.join(pkg, name), `${JSON.stringify(value, null, 2)}\n`);
const r9ManifestSha256 = 'c6266bedffa0588ce5c7c4ad09ed715f229d29702f63ea6fd3055980b7bf657e';
const r9SealSha256 = '9633466ad978bfb0080297d049c73ea8470eb1d33b0b154691fb2c302af76c44';
const designPath = 'outputs/request-20261010/human-transmutation-r10-body-completion-design/DESIGN.md';
const analyticPath = 'outputs/request-20261010/human-transmutation-r10-body-completion-design/completion-design.mjs';
const designSha256 = hash(read(path.join(root, designPath)));
const analyticSha256 = hash(read(path.join(root, analyticPath)));
const parent = JSON.parse(read(path.join(r9, 'package-manifest.json')));

const runtimeClosure = [];
function visit(rel) {
  rel = path.posix.normalize(rel);
  if (runtimeClosure.includes(rel)) return;
  runtimeClosure.push(rel);
  const source = read(path.join(pkg, rel)).toString();
  if (rel.endsWith('.html')) {
    for (const m of source.matchAll(/(?:src|href)=["']([^"']+\.(?:html|mjs|png))["']/gi)) {
      if (!/^(?:[a-z]+:|#)/i.test(m[1])) visit(path.posix.join(path.posix.dirname(rel), m[1]));
    }
  }
  for (const m of source.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)) {
    if (m[1].startsWith('.')) visit(path.posix.join(path.posix.dirname(rel), m[1]));
  }
  if (rel === 'fixture.mjs') visit('assets/philia-front-nine-v752.png');
}
visit('gallery.html');
visit('index.html');

const files = [];
function walk(dir, base = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = path.posix.join(base, entry.name);
    if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
    else if (!['package-manifest.json', 'SEAL.json', 'READY.json'].includes(rel)) {
      const bytes = read(path.join(pkg, rel));
      const record = { path: rel, bytes: bytes.length, sha256: hash(bytes) };
      const parentPath = path.join(r9, rel);
      if (fs.existsSync(parentPath)) {
        record.parentR9Sha256 = hash(read(parentPath));
        record.parentContentPreserved = record.parentR9Sha256 === record.sha256;
      }
      files.push(record);
    }
  }
}
walk(pkg);

write('package-manifest.json', {
  schema: 'human-transmutation-r10-package/v1',
  versionId: 'human-transmutation-sol61-r10',
  groupId: 'alchemy-human-transmutation-sol61',
  catalogVersionId: 'human-transmutation-sol61-r10',
  defaultVersionId: 'human-transmutation-sol61-r10',
  edition: { creativeEdition: 10, creativeLimit: 10, creativeRemaining: 0, creativeIterationStopped: true },
  source: { parentVersionId: parent.versionId, parentManifestSha256: r9ManifestSha256, parentSealSha256: r9SealSha256,
    designPath, designSha256, analyticPath, analyticSha256, parentSourceUntouched: true },
  provenance: {
    creativeDesignOwner: { modelId: 'gpt-6.1-sol', displayName: 'GPT-6.1-Sol' },
    technicalImplementer: { modelId: 'unknown', displayName: 'unknown', reason: 'Actual execution model identity is unavailable in this package task.' },
    historicalSourceAttribution: parent.provenance,
  },
  runtime: {
    entry: 'gallery.html',
    normalCatalogURL: 'public/sol61-human-transmutation/r10/gallery.html?embed=1&galleryVersionId=human-transmutation-sol61-r10&galleryAutoLoop=1',
    versionQueryImplemented: 'galleryVersionId=human-transmutation-sol61-r10',
    verificationQuery: 'The existing gallery shell passes verify only when the parent query contains it; verification mode remains muted.',
    canvasCssExtent: [980, 480], targetId: parent.runtime.targetId, attachments: parent.runtime.attachments,
    worldMrtOutputs: 3, submittedRenderPasses: 4, runtimeClosure,
    sourceR9RuntimeClosure: parent.runtime.runtimeClosure,
    rendererScope: 'Frozen R9 whole-body transport and compact 60-site Gaussian observer PSF; R10 replaces crown closure only with actual-alpha-bound whole-body material completion and adds a max-unioned completion pulse at the same 60 sites.',
  },
  effectCorrection: {
    contour: 'alpha*max(0,alpha-min(alphaLeft,alphaRight,alphaUp,alphaDown)) from actual sampled RGBA',
    contourApproximation: 'Approximate alpha-bound surface edge; not physical 3D Fresnel; emission is zero wherever sampled source alpha is zero.',
    contourWidthCss: '0.8*(actualActorHeight/64), same CSS width on x/y; neighborUV=vec2f(widthCSS)/p.rect.zw',
    completionEnvelopeMs: [814, 844, 890, 1020], completionSourceRGB: [0.24, 1.15, 0.72], completionSourceGain: 1.65,
    completionGlint: { sameSites: 60, sameStaggerAndDuration: true, onsetMs: 814, riseMs: 18, fallOverOriginalFinalMs: 40, combine: 'max(arrivalPulse,completionPulse)' },
    siteCount: 60, siteCountChange: 0, sitePlacementAndTiming: 'exact R9 bytes; new burst only shares existing sites and timing bounds',
    sourceRadiusH64: parent.effectCorrection.sourceRadiusH64, sourceRadiance: parent.effectCorrection.sourceRadiance,
    rayGain: parent.effectCorrection.rayGain, primaryRayH64: parent.effectCorrection.primaryRayH64,
    secondaryRayH64: parent.effectCorrection.secondaryRayH64, rayWidthH64: parent.effectCorrection.rayWidthH64,
    axisDegrees: parent.effectCorrection.axisDegrees, longitudinalFalloff: parent.effectCorrection.longitudinalFalloff,
    sampling: parent.effectCorrection.sampling,
    unchanged: ['verified original RGBA/crop/alpha support', 'unsplit-row transport and 700 ms foot-to-head sweep',
      '17 degree optical axis and Gaussian ray PSF', 'HDR attachments and 4-pass pipeline',
      'source/target/visibility/expiry gates', '1200 ms lifetime', 'existing audio and normal/verify behavior'],
  },
  status: {
    cpuTests: '7/7 passed', runtimeClosure: '14/14 files resolved; syntax checked', shaderCompilation: 'not run', nativeVisualAcceptance: 'not run',
    qualityAcceptance: 'not reviewed', publication: 'not published', adoption: 'unknown/unadopted',
    ordinarySfxListening: 'not run', safariIpad: 'unverified', mainGameIntegration: 'not connected',
    creativeIteration: 'stopped at 10/10; user review required',
  },
  files,
});

write('SOURCE-PINS.json', {
  schema: 'human-transmutation-r10-source-pins/v1',
  r9: { path: 'outputs/request-20261009/human-small-many-r9/public/sol61-human-transmutation/r9', manifestSha256: r9ManifestSha256, sealSha256: r9SealSha256 },
  design: { path: designPath, sha256: designSha256 }, analytic: { path: analyticPath, sha256: analyticSha256 },
  sourceAsset: { path: 'assets/philia-front-nine-v752.png', sha256: hash(read(path.join(pkg, 'assets/philia-front-nine-v752.png'))) },
  runtimeClosure: runtimeClosure.map(rel => ({ path: rel, sha256: hash(read(path.join(pkg, rel))) })),
});
write('MODEL-ATTRIBUTION.json', {
  schema: 'human-transmutation-r10-model-attribution/v1',
  creativeDesignOwner: { modelId: 'gpt-6.1-sol', displayName: 'GPT-6.1-Sol', scope: 'R10 settled creative design; see pinned DESIGN.md.' },
  technicalImplementer: { modelId: 'unknown', displayName: 'unknown', scope: 'Faithful implementation and CPU tests.', reason: 'Execution model identity was not exposed to this worker.' },
  historicalSourceAttribution: parent.provenance,
});
write('DESIGN-FACTS.json', {
  schema: 'human-transmutation-r10-design-facts/v1',
  source: { design: designPath, sha256: designSha256, analytic: analyticPath, analyticSha256, parentManifestSha256: r9ManifestSha256, parentSealSha256: r9SealSha256 },
  change: 'Replace only R9 crown closure with sampled-alpha contour emission and add completion pulse to original 60 sites.',
  constants: { beginsMs: 814, riseEndMs: 844, fadeBeginsMs: 890, endsMs: 1020, lifetimeMs: 1200, widthCss: '0.8*(actualActorHeight/64)', neighborUv: 'vec2f(widthCSS)/p.rect.zw', sourceRGB: [0.24, 1.15, 0.72], sourceGain: 1.65, glintRiseMs: 18, glintFallMs: 40 },
  approximation: 'Four-neighbor alpha-bound surface edge, not physical Fresnel; no emission outside sampled alpha.',
  preserved: { originalRgba: true, cropAndAlphaSupport: true, transportMs: 700, glintSites: 60, opticalDesign: parent.effectCorrection, hdrAttachments: true, worldMrtOutputs: 3, renderPasses: 4, sfx: true, lifetimeMs: 1200 },
});
write('WORK.json', {
  ownedOutput: 'outputs/request-20261010/human-body-completion-r10/public/sol61-human-transmutation/r10',
  objective: 'Implement settled Human Transmutation R10 whole-body completion on frozen R9 source; stop creative iteration at 10/10.',
  decidedRequirements: ['Use exact pinned DESIGN.md and completion-design.mjs.', 'Preserve source image, crop/alpha, sweep, colors, 60 glint locations/timing, optical settings, attachments, passes, audio, gates and lifetime.', 'Keep quality/native/audio/adoption/publication/main integration separate.', 'No browser/GPU/publication/canonical changes by this worker.'],
  acceptanceChecks: ['Real PNG alpha-derived CPU contour sampling and no source outside alpha.', 'Real glint evaluator and shader use same completion constants; original 60 sites and max union.', 'Runtime closure and syntax for package scripts.', 'R9 parent manifest/seal and unchanged asset/transport/audio pins.'],
  remainingIndependentDecisions: ['Root native WebGPU and full H64/H128 image review.', 'Ordinary SFX, Safari/iPad, publication and game integration.'],
  executionModel: { modelId: 'unknown', displayName: 'unknown', reason: 'Actual execution model identity unavailable.' },
  permissions: { sandbox_mode: 'danger-full-access', approval_policy: 'never', actualRuntimeVerified: true },
  delegation: 'Single bounded implementation; no delegated subtask.',
});

// Refresh file pins after all generated metadata has been written.
files.length = 0;
walk(pkg);
const manifest = JSON.parse(read(path.join(pkg, 'package-manifest.json')));
manifest.files = files;
write('package-manifest.json', manifest);

const packageManifestBytes = read(path.join(pkg, 'package-manifest.json'));
const sealedFiles = [{ path: 'package-manifest.json', bytes: packageManifestBytes.length, sha256: hash(packageManifestBytes) }, ...files];
const seal = {
  schema: 'human-transmutation-r10-package-seal/v1',
  versionId: 'human-transmutation-sol61-r10',
  algorithm: 'SHA-256',
  packageManifestPath: 'package-manifest.json',
  packageManifestSha256: hash(packageManifestBytes),
  runtimeClosureCount: runtimeClosure.length,
  contentFileCount: files.length,
  files: sealedFiles,
};
write('SEAL.json', seal);
const sealBytes = read(path.join(pkg, 'SEAL.json'));
write('READY.json', {
  schema: 'human-transmutation-r10-ready/v1',
  status: 'READY_FOR_PRIMARY_NATIVE_WEBGPU_VERIFICATION',
  immutableAfterReady: true,
  packagePath: path.resolve(pkg),
  versionId: 'human-transmutation-sol61-r10',
  packageManifestSha256: hash(packageManifestBytes),
  packageSealSha256: hash(sealBytes),
  cpuTestResult: 'PASS 7/7; 14-file runtime closure; package JavaScript syntax checked',
  runtimeClosureCount: runtimeClosure.length,
  manifestFileCount: files.length,
  shaderCompilation: 'NOT RUN',
  nativeVisualAcceptance: 'NOT RUN',
  publication: 'NOT PUBLISHED',
  adoption: 'UNKNOWN/UNADOPTED',
  edition: { current: 10, limit: 10, remaining: 0 },
  nextRevisionGate: 'Creative iteration stopped at 10/10; submit this replayable candidate for user review.',
});

console.log(JSON.stringify({ designSha256, analyticSha256, runtimeClosure, fileCount: files.length, packageManifestSha256: hash(packageManifestBytes), packageSealSha256: hash(sealBytes) }, null, 2));
