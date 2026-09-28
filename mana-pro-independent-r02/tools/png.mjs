/** 検査像のファイル出力のみ。Canvas/画像素材もランタイム代替も使わない。 */
import {deflateSync} from 'node:zlib';
const table=new Uint32Array(256);
for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;table[i]=c>>>0;}
function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function chunk(type,bytes){const t=Buffer.from(type);const n=Buffer.alloc(4);n.writeUInt32BE(bytes.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,bytes])));return Buffer.concat([n,t,bytes,crc]);}
export function encodePNG(width,height,rgba){
  if(rgba.length!==width*height*4)throw new RangeError('RGBA size');
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
  const scan=Buffer.alloc(height*(width*4+1));
  for(let y=0;y<height;y++)Buffer.from(rgba.buffer,rgba.byteOffset+y*width*4,width*4).copy(scan,y*(width*4+1)+1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
}
