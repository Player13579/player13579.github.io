export const EXPECTED_VERSION='sol-rpg-heavy-quality-r16-impact';
export const PINS=Object.freeze([
  {
    "path": "../rpg-e-r16.mjs",
    "sha256": "c5bfcd1c742e0e882aa38da721559d4b2ae3a0a5a185460b66a0d6e4ac193bcc"
  },
  {
    "path": "../observer.mjs",
    "sha256": "d13ed4e47a869ec87ac6cf49babc6ce3fe25a5e292338a0cc7dd39c4e7a1a59f"
  },
  {
    "path": "../r8/rpg-e.mjs",
    "sha256": "0b1470ad9c7c8810b695d849d99e18ea03411370a4a9c1854efdd22a97dd12a1"
  }
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R16 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R16 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R16 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
