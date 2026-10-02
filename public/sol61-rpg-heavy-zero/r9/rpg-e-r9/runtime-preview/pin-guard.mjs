export const EXPECTED_VERSION='sol-rpg-heavy-quality-r9-observer';
export const PINS=Object.freeze([
 {path:'../rpg-e-r9.mjs',sha256:'d010ee0d648aedfdba96ae92d41e73ba8f174212d89a4dd8d9f7195126b0070a'},
 {path:'../observer.mjs',sha256:'d13ed4e47a869ec87ac6cf49babc6ce3fe25a5e292338a0cc7dd39c4e7a1a59f'},
 {path:'../r8/rpg-e.mjs',sha256:'f4604c3ff5ecf254a9f8050f3c350068ccd5932e86f3f632bba79d71f68385b1'}
]);
export async function assertPinnedPackage({urls,fetcher=fetch,subtle=crypto.subtle}={}){
 if(!Array.isArray(urls)||urls.length!==PINS.length)throw new Error('R9 package pin route count mismatch');
 for(let i=0;i<PINS.length;i++){const response=await fetcher(urls[i],{cache:'no-store'});if(!response?.ok)throw new Error('R9 pinned dependency fetch failed: '+PINS[i].path);const bytes=await response.arrayBuffer();const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');if(actual!==PINS[i].sha256)throw new Error('R9 pinned dependency SHA-256 mismatch: '+PINS[i].path);}
 return true;
}
