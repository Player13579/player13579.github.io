export const EXPECTED_VERSION='sol-rpg-heavy-quality-r12-observer';
export const PINS=Object.freeze([
 {path:'../rpg-e-r12.mjs',sha256:'b3aa632d4be46d495c3c33e5b79281ef51bcdeec8e7575d1a2108cb2ea8a16f0'},
 {path:'../observer.mjs',sha256:'fb6b2c6ae6569c9514659aa97a0555b5d50b8febd271e6b7a9029326d6dec9b2'},
 {path:'../physical/rpg-e.mjs',sha256:'910b8fa1946125d454db83e66dd2b4a9b6525fad8e79df153a5a7a20ef3df501'}
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R12 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R12 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R12 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
