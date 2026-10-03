export const EXPECTED_VERSION='sol-rpg-heavy-quality-r13-impact';
export const PINS=Object.freeze([
  {
    "path": "../rpg-e-r13.mjs",
    "sha256": "e77794867da4a71cf2261469079d886da07b06bf923056cc5b1eb2f655bee2a9"
  },
  {
    "path": "../observer.mjs",
    "sha256": "d13ed4e47a869ec87ac6cf49babc6ce3fe25a5e292338a0cc7dd39c4e7a1a59f"
  },
  {
    "path": "../r8/rpg-e.mjs",
    "sha256": "5f50b3a6a81e9e992f23b359d005135de83025c622b2ff24ed7fd2752eb92e9e"
  }
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R13 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R13 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R13 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
