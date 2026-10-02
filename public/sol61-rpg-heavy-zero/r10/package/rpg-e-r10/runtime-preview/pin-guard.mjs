export const EXPECTED_VERSION='sol-rpg-heavy-quality-r10-observer';
export const PINS=Object.freeze([
 {path:'../rpg-e-r10.mjs',sha256:'12f5d31b945594f8601ac09902fb19213bb5359f6afcf9371fc06f4c16d31252'},
 {path:'../observer.mjs',sha256:'9edd6187f692f22b417cae58732a56cce5795afeeaeaed530db10a271a877dd5'},
 {path:'../physical/rpg-e.mjs',sha256:'0b1591b8cbd76dfd7fc4719d7812faa0ab176299988933e96ca1eccc330a329a'},
 {path:'./preview-host.mjs',sha256:'70f53f5dc9146ad95bc15d37bd6833396043bffcc825aed351bff2d424d6614e'}
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R10 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R10 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R10 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
