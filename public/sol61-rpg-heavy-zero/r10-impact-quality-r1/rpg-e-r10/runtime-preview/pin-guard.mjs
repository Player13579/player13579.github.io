export const EXPECTED_VERSION='sol-rpg-heavy-quality-r10-impact';
export const PINS=Object.freeze([
  {
    "path": "../rpg-e-r10.mjs",
    "sha256": "264066988ab9c748f97b022a9186519a97eaf6b166a1947df46ee9fa936079c4"
  },
  {
    "path": "../observer.mjs",
    "sha256": "d13ed4e47a869ec87ac6cf49babc6ce3fe25a5e292338a0cc7dd39c4e7a1a59f"
  },
  {
    "path": "../r8/rpg-e.mjs",
    "sha256": "314f42670a45b543021cd7c4ee65b0db9b7d9edc31a725393b0aa7dc12ce80f9"
  }
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R10 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R10 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R10 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
