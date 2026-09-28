import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {SHAPE,TIME,PALETTE} from '../src/shape-data.mjs';
const scalar=n=>Number.isInteger(n)?`${n}.0`:`${n}`;
const poly=(name,pts)=>`const ${name}_COUNT:u32=${pts.length}u;\nconst ${name}_POINTS:array<vec2f,12> = array<vec2f,12>(${Array.from({length:12},(_,i)=>{const p=pts[i]||pts[0];return `vec2f(${scalar(p[0])},${scalar(p[1])})`;}).join(',')});\n`;
export function shaderHeader(){
  let h='// Generated from src/shape-data.mjs; rebuild: node tools/build-shader.mjs\n';
  h+=poly('SOURCE',SHAPE.source)+poly('TRANSPORT',SHAPE.transport)+poly('RECEIVER',SHAPE.receiver);
  for(const [key,name]of Object.entries({emitStart:'EMIT_START',emitEnd:'EMIT_END',transitDelay:'TRANSIT_DELAY',settleStart:'SETTLE_START',settleEnd:'SETTLE_END'}))h+=`const ${name}:f32=${scalar(TIME[key])};\n`;
  h+=`const RECEIVER_FLOOR:f32=${scalar(SHAPE.receiverFloor)};\nconst RECEIVER_CEILING:f32=${scalar(SHAPE.receiverCeiling)};\n`;
  for(const[k,c]of Object.entries(PALETTE))h+=`const C_${k.toUpperCase()}:vec3f=vec3f(${c.map(scalar).join(',')});\n`;
  return h;
}
export async function buildShader(){return shaderHeader()+await readFile(new URL('../shaders/field-body.wgsl',import.meta.url),'utf8');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){await writeFile(new URL('../shaders/mana.wgsl',import.meta.url),await buildShader());console.log('WGSL source generated. Compilation not implied.');}
