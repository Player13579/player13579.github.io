export const EXPECTED_VERSION='sol-rpg-heavy-quality-r17-impact';
export const PINS=Object.freeze([
  {
    "path": "../rpg-e-r17.mjs",
    "sha256": "c29f27781af7d40964909742d678b9183d2d2b6946ae6cfbca87b67e1a0875d0"
  },
  {
    "path": "../observer.mjs",
    "sha256": "d13ed4e47a869ec87ac6cf49babc6ce3fe25a5e292338a0cc7dd39c4e7a1a59f"
  },
  {
    "path": "../r8/rpg-e.mjs",
    "sha256": "d50625b8b4a694adede9b89fc22f4ec30fc1c80abb15fbe56a0dc7a3d8500000"
  }
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R17 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R17 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R17 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
