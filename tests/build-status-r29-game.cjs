const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const frozen=fs.readFileSync(path.join(root,'public/astra-status-cleanse-v1/versions/r29/field-r29.mjs'),'utf8');
const original=frozen.match(/export const shader=\/\*wgsl\*\/`([\s\S]*?)`;/)?.[1]?.replace(/\r\n/g,'\n');
if(!original)throw Error('Frozen Astra r0.29 shader unavailable');
let shader=original;
function replace(a,b){if(!shader.includes(a))throw Error('Frozen shader signature changed: '+a.slice(0,60));shader=shader.replace(a,b);}
replace('struct U{viewport:vec4f,state:vec4f};','struct U{viewport:vec4f,state:vec4f,crop:vec4f,affine0:vec4f,affine1:vec4f,rect:vec4f,scale:vec4f,pad:vec4f};');
const spriteStart=shader.indexOf('fn sprite(p:vec2f)->vec4f{');
const spriteEnd=shader.indexOf('\nfn window(',spriteStart);
if(spriteStart<0||spriteEnd<0)throw Error('Frozen sprite function unavailable');
shader=shader.slice(0,spriteStart)+`fn sprite(p:vec2f)->vec4f{
 let pixel=vec2f(u.viewport.z+p.x*u.state.x,u.viewport.w-p.y*u.state.x);
 let logical=pixel/u.scale.xy;
 let delta=logical-u.affine1.xy;
 let determinant=u.affine0.x*u.affine0.w-u.affine0.y*u.affine0.z;
 let local=vec2f((delta.x*u.affine0.w-delta.y*u.affine0.z)/determinant,
                 (delta.y*u.affine0.x-delta.x*u.affine0.y)/determinant);
 let uv=(local-u.rect.xy)/u.rect.zw;
 if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(0.);}
 let texel=u.crop.xy+uv*u.crop.zw;
 return vec4f(0.,0.,0.,textureSampleLevel(actor,samp,texel/vec2f(textureDimensions(actor)),0.).a*u.scale.z);
}`+shader.slice(spriteEnd);
replace('let a=sprite(p);let background=mix(vec3f(.019,.033,.057),vec3f(.79,.825,.85),u.state.z);\n var c=mix(background,a.rgb,a.a);if(t<=0.||t>=1.){return vec4f(c,1.);}',
  'let a=sprite(p); var c=vec3f(0.);if(t<=0.||t>=1.){return vec4f(0.);}');
replace('c+=packet(p,t)*(1.-a.a*.42)*(1.-face);',
  'if(u.state.w<.5){return vec4f(packet(p,t)*(1.-face),0.);}\n c+=packet(p,t)*(a.a*.58)*(1.-face);');
replace('return vec4f(c,1.);','return vec4f(c,0.);');
const dest=path.join(root,'webgpu-status-recovery-r29-game.js');
let adapter=fs.readFileSync(dest,'utf8').replace(/\r\n/g,'\n');
const start='  // __ASTRA_R29_SHADER__\n  const shader = null;';
const embedded='  // __ASTRA_R29_SHADER__\n  const shader = /* wgsl */ `'+shader+'`;';
if(adapter.includes(start)) adapter=adapter.replace(start,embedded);
else {
 const range=adapter.match(/  \/\/ __ASTRA_R29_SHADER__\n  const shader = \/\* wgsl \*\/ `[\s\S]*?`;\n/);
 if(!range)throw Error('Adapter shader slot unavailable');
 adapter=adapter.replace(range[0],embedded+'\n');
}
fs.writeFileSync(dest,adapter);
const sfx=fs.readFileSync(path.join(root,'public/astra-status-cleanse-v1/versions/r29/sfx.mjs'),'utf8')
  .replace(/\r\n/g,'\n').replace('export function synthesize','function synthesize')
  .replace('export class CleanseSound','class CleanseSound')
  .replace('constructor({context,sessionId,verify=false})','constructor({context,destination=context.destination,sessionId,verify=false})')
  .replace('this.context=context;this.sessionId=sessionId;','this.context=context;this.destination=destination;this.sessionId=sessionId;')
  .replace('start(r){','start(r,{volume=1,pan=0}={}){')
  .replace('if(this.verify||!r?.submitted','if(this.verify||!Number.isFinite(volume)||volume<=0||!r?.submitted')
  .replace('const node=this.context.createBufferSource();node.buffer=buffer;node.connect(this.context.destination);node.onended=()=>{node.disconnect();this.nodes.delete(node);};',
    'const node=this.context.createBufferSource();node.buffer=buffer;const gain=this.context.createGain();gain.gain.value=Math.min(1,volume);const stereo=typeof this.context.createStereoPanner===\'function\'?this.context.createStereoPanner():null;if(stereo){stereo.pan.value=Math.max(-1,Math.min(1,pan));node.connect(gain);gain.connect(stereo);stereo.connect(this.destination);}else{node.connect(gain);gain.connect(this.destination);}node.onended=()=>{node.disconnect();gain.disconnect();stereo?.disconnect();this.nodes.delete(node);};');
if(sfx.includes('export ')||!sfx.includes('gain.connect(this.destination)'))throw Error('Frozen SFX adapter transform failed');
fs.writeFileSync(path.join(root,'webgpu-status-recovery-r29-sfx.js'),
  '(function(root){\'use strict\';\n'+sfx+'\n'+
  'const api=Object.freeze({synthesize,CleanseSound});root.DvaStatusRecoveryR29Sfx=api;'+
  "if(typeof module!=='undefined'&&module.exports)module.exports=api;"+
  "})(typeof globalThis!=='undefined'?globalThis:window);\n");
