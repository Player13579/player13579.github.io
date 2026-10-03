export const EXPECTED_VERSION='sol-rpg-heavy-quality-r14-impact';
export const PINS=Object.freeze([
  {
    "path": "../rpg-e-r14.mjs",
    "sha256": "2902f40d9e495a3fd19cd2857b8c096a58ae724e1aa49956840cfebb7c1f3b70"
  },
  {
    "path": "../observer.mjs",
    "sha256": "d13ed4e47a869ec87ac6cf49babc6ce3fe25a5e292338a0cc7dd39c4e7a1a59f"
  },
  {
    "path": "../r8/rpg-e.mjs",
    "sha256": "95c12f2b64724d6a39fa4a3c5be8e729aaac39a7df66f1af529aa7688e7ac19f"
  }
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R14 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R14 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R14 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
