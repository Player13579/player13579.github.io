import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const here = new URL('../', import.meta.url);
const text = path => readFile(new URL(path, here), 'utf8');
const [html, script, css, provenance, manifest] = await Promise.all([
  text('index.html'), text('preview/main.js'), text('preview/embed.css'),
  text('provenance.json').then(JSON.parse), text('source-manifest.json').then(JSON.parse)
]);

test('r0.3 gallery embed uses a single H64 WebGPU view and keeps errors visible', () => {
  assert.match(html, /preview\/embed\.css/);
  assert.match(script, /params\.get\('embed'\)==='1'/);
  assert.match(script, /embedMode\?\[\{light:false,scale:1\}\]/);
  assert.match(script, /if\(!embedMode\)drawEnvelope\(elapsed\)/);
  assert.match(css, /body\.embed #views\s*\{[^}]*width:\s*980px;[^}]*height:\s*620px;/);
  assert.match(css, /body\.embed \.tile canvas\s*\{[^}]*width:\s*980px;[^}]*height:\s*620px;/);
  assert.match(css, /body\.embed #error:not\(\[hidden\]\)/);
  assert.match(script, /PreviewViewport\.create\(/);
});

test('verify query mutes SFX, while normal mode keeps gesture-based audio unlock', () => {
  assert.match(script, /params\.has\('verify'\)/);
  assert.match(script, /if\(verifyMode\)\{audio\.setVolume\(0\);audio\.setMuted\(true\);\}/);
  assert.match(script, /#sound'\)\.onclick=async\(\)=>\{if\(verifyMode\)return;/);
  assert.match(script, /#volume'\)\.oninput=e=>\{if\(!verifyMode\)audio\.setVolume/);
  assert.match(css, /body\.verify #sound, body\.verify #volume\s*\{\s*display:\s*none;/);
  assert.match(script, /if\(embedMode&&!verifyMode\)\{/);
  assert.match(script, /await audio\.unlock\(\)/);
});

test('Pro r0.3 source files copied by the adapter match the packaged SHA-256 manifest', async () => {
  const expected = new Map(manifest.files.map(item => [item.path, item.sha256]));
  for (const prefix of ['src/', 'shaders/', 'docs/', 'audio/']) {
    for (const item of manifest.files.filter(entry => entry.path.startsWith(prefix) && !['shaders/mana.wgsl','src/index.js','src/renderer.js'].includes(entry.path))) {
      const content = await readFile(new URL(item.path, here));
      assert.equal(createHash('sha256').update(content).digest('hex'), item.sha256, item.path);
    }
  }
  assert.ok(provenance.archiveSha256);
});

test('WGSL adapter replaces the source ternary with equivalent WGSL select and changes no other shader text', async () => {
  const sourceUrl = new URL('../../../outputs/request-20260928/pro-mana-r03/extracted/dva-mana-e-r0.3/shaders/mana.wgsl', import.meta.url);
  const [source, adapted] = await Promise.all([
    readFile(sourceUrl, 'utf8'), text('shaders/mana.wgsl')
  ]);
  const sourceExpression = 'let contactScale=(kind==4u)?vec2<f32>(15.0*it.anchor.z,19.5*it.anchor.w):vec2<f32>(13.7*it.anchor.z,18.2*it.anchor.w);';
  const wgslExpression = 'let contactScale=select(vec2<f32>(13.7*it.anchor.z,18.2*it.anchor.w),vec2<f32>(15.0*it.anchor.z,19.5*it.anchor.w),kind==4u);';
  assert.equal(source.split(sourceExpression).length, 2, 'original r0.3 contains exactly one unsupported ?: expression');
  assert.equal(adapted, source.replace(sourceExpression, wgslExpression));
  assert.doesNotMatch(adapted, /\?\s*vec2<f32>/);
});

test('corrected shader fetch and its module chain carry explicit select-v3 cache keys', async () => {
  const sourceRoot = '../../../outputs/request-20260928/pro-mana-r03/extracted/dva-mana-e-r0.3/';
  const [sourceIndex, adaptedIndex, sourceRenderer, adaptedRenderer] = await Promise.all([
    readFile(new URL(`${sourceRoot}src/index.js`, import.meta.url), 'utf8'), text('src/index.js'),
    readFile(new URL(`${sourceRoot}src/renderer.js`, import.meta.url), 'utf8'), text('src/renderer.js')
  ]);
  const adaptedMain = await text('preview/main.js');
  assert.match(html, /preview\/main\.js\?v=select-v3/);
  assert.match(adaptedMain, /\.\.\/src\/index\.js\?v=select-v3/);
  assert.equal(adaptedIndex, sourceIndex.replaceAll("from './renderer.js';", "from './renderer.js?v=select-v3';"));
  assert.equal(adaptedRenderer, sourceRenderer.replace("new URL('../shaders/mana.wgsl',import.meta.url)", "new URL('../shaders/mana.wgsl?v=select-v3',import.meta.url)"));
  assert.match(adaptedRenderer, /mana\.wgsl\?v=select-v3/);
});

test('scene module cache-bust prevents its direct renderer import from bypassing the versioned chain', async () => {
  const sourceUrl = new URL('../../../outputs/request-20260928/pro-mana-r03/extracted/dva-mana-e-r0.3/preview/scene.js', import.meta.url);
  const [source, adapted, main] = await Promise.all([
    readFile(sourceUrl, 'utf8'), text('preview/scene.js'), text('preview/main.js')
  ]);
  assert.match(main, /\.\/scene\.js\?v=select-v3/);
  assert.equal(adapted, source.replace("from '../src/renderer.js';", "from '../src/renderer.js?v=select-v3';"));
  assert.match(adapted, /\.\.\/src\/renderer\.js\?v=select-v3/);
});
