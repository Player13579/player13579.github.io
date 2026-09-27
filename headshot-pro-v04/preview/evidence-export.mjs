// 外部CDN不要のZIP STORE書き出し。PNG/JSONの実行記録だけを梱包する。
const encoder=new TextEncoder();
const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
export function createStoredZip(entries){
  if(!Array.isArray(entries)||entries.length>65535)throw new TypeError('ZIP entries');
  let offset=0;const chunks=[],central=[],names=new Set();
  const u16=(v,o,n)=>v.setUint16(o,n,true),u32=(v,o,n)=>v.setUint32(o,n,true);
  for(const entry of entries){
    if(!entry||typeof entry.name!=='string'||entry.name.startsWith('/')||entry.name.split('/').includes('..')||names.has(entry.name))throw new TypeError('unsafe/duplicate ZIP name');
    names.add(entry.name);const name=encoder.encode(entry.name),bytes=typeof entry.data==='string'?encoder.encode(entry.data):entry.data;
    if(!(bytes instanceof Uint8Array)||name.length>65535)throw new TypeError('ZIP bytes');
    const crc=crc32(bytes);const local=new Uint8Array(30+name.length),l=new DataView(local.buffer);
    u32(l,0,0x04034b50);u16(l,4,20);u16(l,6,0x800);u16(l,12,0x21);u32(l,14,crc);u32(l,18,bytes.length);u32(l,22,bytes.length);u16(l,26,name.length);local.set(name,30);
    const directory=new Uint8Array(46+name.length),d=new DataView(directory.buffer);
    u32(d,0,0x02014b50);u16(d,4,20);u16(d,6,20);u16(d,8,0x800);u16(d,14,0x21);u32(d,16,crc);u32(d,20,bytes.length);u32(d,24,bytes.length);u16(d,28,name.length);u32(d,42,offset);directory.set(name,46);
    chunks.push(local,bytes);central.push(directory);offset+=local.length+bytes.length;
  }
  const centralBytes=central.reduce((n,b)=>n+b.length,0);const end=new Uint8Array(22),e=new DataView(end.buffer);
  u32(e,0,0x06054b50);u16(e,8,entries.length);u16(e,10,entries.length);u32(e,12,centralBytes);u32(e,16,offset);
  const output=new Uint8Array(offset+centralBytes+22);let pos=0;for(const b of [...chunks,...central,end]){output.set(b,pos);pos+=b.length;}return output;
}
export function downloadBytes(bytes,name,type='application/zip'){
  const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export async function canvasPNG(canvas){
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG encoding')),'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}
export function toBase64(bytes){let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(out);}
