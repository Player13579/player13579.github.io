// Local lexical/ABI/source inventory lint. NEVER called a WGSL compiler.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import crypto from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url));
const collect=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?collect(path.join(p,e.name)):[path.join(p,e.name)]);
const checks=[],check=(id,ok,detail)=>checks.push({id,status:ok?'pass':'fail',detail});
const reserved=new Set(`NULL Self abstract active alignas alignof as asm asm_fragment async attribute auto await become cast catch class co_await co_return co_yield coherent column_major common compile compile_fragment concept const_cast consteval constexpr constinit crate debugger decltype delete demote demote_to_helper do dynamic_cast enum explicit export extends extern external fallthrough filter final finally friend from fxgroup get goto groupshared highp impl implements import inline instanceof interface layout lowp macro macro_rules match mediump meta mod module move mut mutable namespace new nil noexcept noinline nointerpolation non_coherent noncoherent noperspective null nullptr of operator package packoffset partition pass patch pixelfragment precise precision premerge priv protected pub public readonly ref regardless register reinterpret_cast require resource restrict self set shared sizeof smooth snorm static static_assert static_cast std subroutine super target template this thread_local throw trait try type typedef typeid typename typeof union unless unorm unsafe unsized use using varying virtual volatile wgsl where with writeonly yield`.split(' '));
const shaders=[];
for(const file of collect(root).filter(f=>/\.(mjs|js|wgsl)$/.test(f))){
 const rel=path.relative(root,file),code=fs.readFileSync(file,'utf8');
 if(!file.endsWith('.wgsl')){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});check(`${rel}:JS-parse`,r.status===0,r.stderr||'Node parse only');continue;}
 const text=code.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 check(`${rel}:no-ternary`,!text.includes('?'),'Original source contains no question-mark conditional. No source rewrite performed.');
 check(`${rel}:no-GLSL`,!/#version|\bgl_|\b(?:float|vec[234]|mat[234])\s+\w+\s*[;=(]/.test(text),'WGSL attributes/types used; no GLSL declaration syntax.');
 const bad=[...new Set((text.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)??[]).filter(t=>reserved.has(t)))];check(`${rel}:reserved-words`,bad.length===0,bad.length?bad:'W3C reserved-word list checked lexically');
 const stack=[];let balanced=true;const closing={')':'(',']':'[','}':'{'};
 for(const c of text){if('([{'.includes(c))stack.push(c);else if(')]}'.includes(c)&&stack.pop()!==closing[c])balanced=false;}
 check(`${rel}:delimiters`,balanced&&stack.length===0,'Balanced (), [] and {}. Type checking/uniformity/driver compilation are NOT performed by this lint.');
 check(`${rel}:entrypoints`,/@vertex\s+fn\s+vs/.test(text)&&/@fragment\s+fn\s+fs/.test(text),'Expected entry points exist');
 shaders.push({file:rel,bytes:Buffer.byteLength(code),sha256:crypto.createHash('sha256').update(code).digest('hex'),compiler:'not_run'});
}
const shape=fs.readFileSync(path.join(root,'shaders/mana.wgsl'),'utf8');
check('mesh-MRT',shape.includes('@location(1) radiance: vec4<f32>'),'Separate surface/radiance output');
for(const [file,forbidden] of [['src/sampler.js',/background|Math\.random|performance\.now/],['src/index.js',/from ['"]\.\.\/preview/]]){
 // Inspect executable lines, not explanatory comments which mention forbidden dependencies.
 const text=fs.readFileSync(path.join(root,file),'utf8').replace(/\/\/[^\n]*/g,'');check(`${file}:isolation`,!forbidden.test(text),'No background/random/wall-clock sampling or preview import in public entry.');
}
for(const rel of ['src/events.js','src/sampler.js','src/gpu.js','src/sfx.js','src/voice-engine.js']){
 const text=fs.readFileSync(path.join(root,rel),'utf8');check(`${rel}:no-image-assets`,!/createImageBitmap|copyExternalImageToTexture|new Image\(/.test(text),'No external image texture path');
}
const report={release:'r0.4',scope:'Local source syntax, lexical WGSL, entry point and ABI sanity lint only',WGSL_compiler:'not_run',GPU_execution:'not_run',passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,shaders,checks};
if(process.argv.includes('--record'))fs.writeFileSync(path.join(root,'qa/static.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,WGSL_compiler:report.WGSL_compiler,failures:checks.filter(c=>c.status==='fail')},null,2));if(report.failed)process.exitCode=1;
