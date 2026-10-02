export const EXPECTED_VERSION="sol-rpg-heavy-quality-r7";
export const EXPECTED_SHA256="686ab41dc8c5c45a48cdd6d386a24c6fe1a96aa346b879c1479ff748468f746e";
export async function assertPinnedModule({version,url,fetcher=fetch,subtle=crypto.subtle}={}) {
  if(version!==EXPECTED_VERSION) throw new Error('R7 creative version mismatch');
  const response=await fetcher(url,{cache:'no-store'});
  if(!response?.ok) throw new Error('R7 creative module fetch failed');
  const bytes=await response.arrayBuffer();
  const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));
  const actual=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(actual!==EXPECTED_SHA256) throw new Error('R7 creative module SHA-256 mismatch');
  return true;
}
