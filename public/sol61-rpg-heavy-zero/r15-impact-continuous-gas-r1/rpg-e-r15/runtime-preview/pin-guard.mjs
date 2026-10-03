export const EXPECTED_VERSION='sol-rpg-heavy-quality-r15-impact';
export const PINS=Object.freeze([
  {
    "path": "../rpg-e-r15.mjs",
    "sha256": "94530ed856d652c9f0946cbca4830c99070c151280c8f2f0e7a80e65c7814b21"
  },
  {
    "path": "../observer.mjs",
    "sha256": "d13ed4e47a869ec87ac6cf49babc6ce3fe25a5e292338a0cc7dd39c4e7a1a59f"
  },
  {
    "path": "../r8/rpg-e.mjs",
    "sha256": "cedd6022b03403f5159e7cf6c72738efdb8c2e82c10d13fa706f3ac5d5ab2063"
  }
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R15 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R15 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R15 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
