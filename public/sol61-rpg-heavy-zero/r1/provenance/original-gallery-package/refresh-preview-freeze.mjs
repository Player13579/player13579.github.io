import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('rpg-e-r1');
const preview = path.join(root, 'runtime-preview');
const hash = relative => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(preview, relative))).digest('hex');
const relativeHash = file => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, file))).digest('hex');
const doc = {
  name: 'sol-rpg-heavy-zero-r1-runtime-preview-host-gallery-package',
  scope: 'hypothetical-preview-only',
  authoring: 'faithful standalone preview host plus embed loop/audio bridge; no E shader/audio creative edits',
  implementationModel: 'GPT-6-Luna (bounded host/package implementation; parent confirms catalog display mapping)',
  runtime: {
    entry: 'index.html',
    localCodeDependencies: [
      { path: 'index.html', sha256: hash('index.html') },
      { path: 'preview.css', sha256: hash('preview.css') },
      { path: 'preview-host.mjs', sha256: hash('preview-host.mjs') },
      { path: '../rpg-e.mjs', sha256: hash('../rpg-e.mjs') }
    ],
    externalPackages: [], browserFeatures: ['WebGPU', 'Web Audio API', 'ResizeObserver']
  },
  provenanceAndTests: [
    { path: '../preview-fixture.mjs', purpose: 'fixed hypothetical-input provenance; unit parity', sha256: relativeHash('preview-fixture.mjs') },
    { path: '../../motion-male-left/playback-fixture.json', purpose: 'approved male-left r5/r6 pose identity and physical anchors', sha256: relativeHash('../motion-male-left/playback-fixture.json') },
    { path: '../../motion-male-left/rpg-male-left-ready-source-r5.png', purpose: 'approved ready pose; checked against fixture SHA by contract test', sha256: relativeHash('../motion-male-left/rpg-male-left-ready-source-r5.png') },
    { path: '../../motion-male-left/rpg-male-left-recoil-source-r6.png', purpose: 'approved recoil pose; checked against fixture SHA by contract test', sha256: relativeHash('../motion-male-left/rpg-male-left-recoil-source-r6.png') },
    { path: '../DESIGN-AND-ADAPTER.md', purpose: 'frozen design/submission contract', sha256: relativeHash('DESIGN-AND-ADAPTER.md') },
    { path: '../source-freeze.json', purpose: 'frozen creative identity', sha256: relativeHash('source-freeze.json') },
    { path: 'host-ownership.test.mjs', purpose: 'host, local-cycle and finite SFX behavior checks', sha256: hash('host-ownership.test.mjs') },
    { path: '../contract.test.mjs', purpose: '41 frozen module contract checks and physical source byte tests', sha256: relativeHash('contract.test.mjs') }
  ],
  validation: {
    node: process.version, hostSyntax: 'pass', hostOwnershipChecks: 'pass', frozenModuleContractChecks: 41,
    embedCycle: 'local preview clock, 1200 E-ms plus 300 ms pause, fresh cause/source/attempt/sound IDs',
    normalPlayback: 'embed auto-loop is silent until gallery gesture; authored finite PCM follows only exact module submission receipts',
    verifyAudio: 'hard-zero; verify bridge returns silent and creates no AudioContext',
    hostBrowserLoad: 'pending-primary-post-repair-native-review', actualWgslCompilation: 'pending-native-browser',
    actualGpuPixels: 'pending-native-browser', fullLifetimeVisualReview: 'pending-primary-review', audioListening: 'not-run',
    qualityAcceptance: 'pending-primary-review', gameIntegration: 'unimplemented', adoption: false
  },
  packagingOnlyChanges: [
    'HTML and CSS add embed=1 presentation sizing and hide standalone-only UI while retaining visible #error',
    'host adds local fixture cycle identity, pause gap, submitted-frame telemetry, and __gallerySfx gesture bridge',
    'default standalone page controls and one-shot play behavior remain'
  ]
};
fs.writeFileSync(path.join(preview, 'preview-freeze.json'), JSON.stringify(doc, null, 2) + '\n');
console.log('refreshed package-local preview freeze');
