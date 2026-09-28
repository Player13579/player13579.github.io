// 依存不要のSTORE ZIP。PNG/JSON/WAVの実バイトを同梱する。描画や音を代替生成しない。
const encoder=new TextEncoder();
export function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let j=0;j<8;j++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return (c^0xffffffff)>>>0;}
export function makeZip(files){
  const locals=[],centrals=[],names=new Set();let offset=0;
  for(const file of files){
    if(typeof file.name!=='string'||file.name.startsWith('/')||file.name.split('/').includes('..')||names.has(file.name))throw new TypeError('ZIP path');names.add(file.name);
    const name=encoder.encode(file.name),data=typeof file.data==='string'?encoder.encode(file.data):file.data;if(!(data instanceof Uint8Array))throw new TypeError('ZIP bytes');
    const crc=crc32(data),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);
    const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);
    locals.push(local,data);centrals.push(central);offset+=local.length+data.length;
  }
  const centerSize=centrals.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centerSize,true);v.setUint32(16,offset,true);
  const result=new Uint8Array(offset+centerSize+22);let p=0;for(const a of [...locals,...centrals,end]){result.set(a,p);p+=a.length;}return result;
}
export function download(data,name,type='application/zip'){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function pngFromPixels({pixels,width,height}){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),width,height),0,0);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error('PNG encoding');return new Uint8Array(await blob.arrayBuffer());}
