export const EXPECTED_VERSION='sol-rpg-heavy-quality-r11-observer';
export const PINS=Object.freeze([
 {path:'../rpg-e-r11.mjs',sha256:'6d388f5b91f885ee5177ae40e3e0885ca9be6fef1df94a1dee522b1d442b5caa'},
 {path:'../observer.mjs',sha256:'fb6b2c6ae6569c9514659aa97a0555b5d50b8febd271e6b7a9029326d6dec9b2'},
 {path:'../physical/rpg-e.mjs',sha256:'fb33eea4108937c876b5c77b3d765aa643b5249ca296af2232e250c87abbde7e'}
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R11 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R11 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R11 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
