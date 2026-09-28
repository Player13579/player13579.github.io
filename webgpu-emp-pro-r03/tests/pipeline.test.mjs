import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const renderer=read('../src/renderer.js'),mesh=read('../shaders/mesh.wgsl'),post=read('../shaders/composite.wgsl');
test('post sampler and texture descriptor agree statically; actual GPU compilation is not tested',()=>{
 for(const t of["sampleType:'float'","multisampled:false","sampler:{type:'filtering'}","magFilter:'linear'","minFilter:'linear'","mipmapFilter:'nearest'","addressModeU:'clamp-to-edge'","lodMinClamp:0,lodMaxClamp:0"])assert.ok(renderer.includes(t),t);
 assert.match(post,/@binding\(0\) var source:texture_2d<f32>/);assert.match(post,/@binding\(1\) var linearClamp:sampler/);assert.match(post,/textureSampleLevel\(source,linearClamp/);assert.doesNotMatch(post,/texture_multisampled/);
});
test('uniform byte contracts and vertex stride locations are explicitly aligned',()=>{
 assert.ok(renderer.includes('minBindingSize:32'));assert.ok(renderer.includes('minBindingSize:48'));
 for(const [loc,off,format]of[[0,0,'float32x3'],[1,12,'float32x3'],[2,24,'float32x3'],[3,36,'float32x3'],[4,48,'float32x2']])assert.ok(renderer.includes(`shaderLocation:${loc},offset:${off},format:'${format}'`));
 assert.match(mesh,/struct Camera \{ viewport:vec2f, center:vec2f, scale:f32, actorTime:f32, reserved:vec2f \}/);
 assert.match(post,/struct Settings \{ resolution:vec2f, bloom:f32, exposure:f32, background:vec4f, control:vec4f \}/);
});
test('MSAA is resolved before filtering and alpha is premultiplied',()=>{
 for(const t of['for(const sampleCount of[1,4])',"format:'rgba16float'",'resolveTarget:resolved',"alphaMode:'premultiplied'","srcFactor:'one',dstFactor:'one-minus-src-alpha'"])assert.ok(renderer.includes(t),t);
 assert.ok(mesh.includes('radiance*alpha,alpha'));assert.ok(post.includes('energy/max(cover,0.0001)'));assert.ok(post.includes('))*cover'));
});
test('information state is upstream of mesh; shader does not add a grid, scanline or noise mask',()=>{
 const sampler=read('../src/sampler.js'),geo=read('../src/geometry.js');assert.ok(sampler.includes('sample.information=informationState(sample)'));
 for(const operation of['info.rows','info.head','info.tail','info.routes','info.nullFrontY'])assert.ok(geo.includes(operation));
 assert.doesNotMatch(mesh+post,/\b(?:sin|cos|fract|noise)\s*\(/);assert.doesNotMatch(geo,/Math\.random/);
});
test('external import graph excludes preview, archive and P0; no server branch selection helpers',()=>{
 const visited=new Set();function scan(url){const text=fs.readFileSync(url,'utf8');visited.add(url.href);for(const m of text.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)){assert.doesNotMatch(m[1],/preview|archive|gallery/);const u=new URL(m[1],url);if(!visited.has(u.href))scan(u);}}
 scan(new URL('../src/emp-e.js',import.meta.url));const api=read('../src/emp-e.js'),contract=read('../src/contract.js');assert.doesNotMatch(api+contract,/function (pairResult|classifyResonance|normalHit)/);
});
test('current UI and exports never promise hardware or listening approval',()=>{
 const html=read('../index.html'),main=read('../preview/main.js');assert.ok(html.includes('本編接続未承認'));assert.ok(main.includes("artisticQuality:'not_run'"));assert.ok(main.includes("hardwareRenderAcceptance:'not_assigned'"));assert.ok(html.includes('P0は凍結試作'));
});
