export const EXPECTED_VERSION='sol-rpg-heavy-quality-r12-impact';
export const PINS=Object.freeze([
  {
    "path": "../rpg-e-r12.mjs",
    "sha256": "7de562c4256b8f1ca48dc05a34910db7ca2cee45d6e3cd86a25363469a269343"
  },
  {
    "path": "../observer.mjs",
    "sha256": "d13ed4e47a869ec87ac6cf49babc6ce3fe25a5e292338a0cc7dd39c4e7a1a59f"
  },
  {
    "path": "../r8/rpg-e.mjs",
    "sha256": "ae09efb8f4a7ebba750d73f8f17033ae20604b9017d2ec13d37a041c0b073946"
  }
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R12 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R12 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R12 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
