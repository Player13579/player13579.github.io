import {PHASE} from './contract.mjs';
export function assembleShader(source) {
  const constants=Object.entries(PHASE).map(([k,v])=>`const P_${k}:f32=${Number(v).toFixed(8)};`).join('\n');
  return `${constants}\n${source}`;
}
export async function loadShaderSource() {
  const paths=[new URL('../shaders/mana.wgsl',import.meta.url),new URL('../shaders/present.wgsl',import.meta.url)];
  const texts=await Promise.all(paths.map(async url=>{const r=await fetch(url);if(!r.ok)throw new Error(`shader取得失敗: ${url}`);return r.text();}));
  return {world:assembleShader(texts[0]),present:texts[1]};
}
