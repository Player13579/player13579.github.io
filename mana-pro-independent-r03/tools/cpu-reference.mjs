import {mkdir,writeFile} from 'node:fs/promises';
import {composePixel} from '../src/field.mjs';
import {pngRGBA} from './png.mjs';
const phases=[0,.10,.20,.25,.35,.50,.65,.75,.85,.95,.999,1];
const tw=96,th=112,w=tw*phases.length,h=th*2,rgba=new Uint8Array(w*h*4);
for(let row=0;row<2;row++)for(let i=0;i<phases.length;i++)for(let y=0;y<th;y++)for(let x=0;x<tw;x++){
  const c=composePixel((x+.5-48)/.5,(y+.5-90)/.5,phases[i],{background:row?'light':'dark',aa:1});
  const o=((row*th+y)*w+i*tw+x)*4;for(let k=0;k<3;k++)rgba[o+k]=Math.round(c[k]*255);rgba[o+3]=255;
}
const dir=new URL('../evidence/cpu-reference/',import.meta.url);await mkdir(dir,{recursive:true});
await writeFile(new URL('r03-native-lifetime.png',dir),pngRGBA(w,h,rgba));
await writeFile(new URL('index.json',dir),JSON.stringify({kind:'CPU_analytic_reference_NOT_GPU',phases,columns:phases.length,rows:['dark','light'],scaleCSSPerWorld:.5,nativeTile:[tw,th],note:'Node上の独立参照計算。GPU shader/実画素/動き/無説明読解の合格根拠ではない。'},null,2));
console.log('CPU reference written; not GPU evidence');
