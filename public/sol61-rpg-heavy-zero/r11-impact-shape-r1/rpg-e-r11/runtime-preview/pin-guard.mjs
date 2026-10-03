export const EXPECTED_VERSION='sol-rpg-heavy-quality-r11-impact';
export const PINS=Object.freeze([
  {
    "path": "../rpg-e-r11.mjs",
    "sha256": "b892fb64e926ba1278e948bb6051dd2222fe6ba6c1815b0737db82e83c3714a9"
  },
  {
    "path": "../observer.mjs",
    "sha256": "d13ed4e47a869ec87ac6cf49babc6ce3fe25a5e292338a0cc7dd39c4e7a1a59f"
  },
  {
    "path": "../r8/rpg-e.mjs",
    "sha256": "91d45e5203ba77ccbc34b2742a730a87779eeab537c35265a9483a7b6ac6174b"
  }
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R11 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R11 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R11 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
