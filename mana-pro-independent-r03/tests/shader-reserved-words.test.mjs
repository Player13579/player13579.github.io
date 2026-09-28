import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../shaders/',import.meta.url);
const sources=['field-body.wgsl','mana.wgsl'].map(name=>[name,fs.readFileSync(fileURLToPath(new URL(name,root)),'utf8')] );
const compilerReserved=['meta'];

test('WGSL identifiers exclude the compiler-rejected reserved meta word',()=>{
  for(const [name,source] of sources){
    const code=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
    for(const word of compilerReserved)assert.doesNotMatch(code,new RegExp(`\\b${word}\\b`),name);
    assert.match(code,/attributes:\s*vec4u/,name);
    assert.equal((code.match(/e\.attributes\.y/g)||[]).length,2,name);
  }
});
