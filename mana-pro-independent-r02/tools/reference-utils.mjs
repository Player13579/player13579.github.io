import {sampleReference,sampleFields,linearToSRGB} from '../src/geometry.mjs';
export const WIDTH=256,HEIGHT=112;
export const BACKGROUNDS=[[.006,.010,.016,1],[.76,.80,.78,1]];
export function renderReference(u,options={}) {
  const data=new Uint8Array(WIDTH*HEIGHT*4);
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
    const p=x<128?0:1,cx=p?192:64;
    const color=sampleReference((x+.5-cx)/.5,(y+.5-92)/.5,u,BACKGROUNDS[p],options).rgba;
    const at=(y*WIDTH+x)*4;for(let c=0;c<4;c++)data[at+c]=Math.round(color[c]*255);
  }
  return data;
}
export function fieldMasks(u,threshold=.22) {
  const masks={source:new Uint8Array(128*112),transport:new Uint8Array(128*112),receive:new Uint8Array(128*112)};
  for(let y=0;y<112;y++)for(let x=0;x<128;x++){
    const f=sampleFields((x+.5-64)/.5,(y+.5-92)/.5,u);
    for(const n of Object.keys(masks))masks[n][y*128+x]=f[n].opacity>threshold?1:0;
  }
  return masks;
}
export function connectedComponentSizes(mask,width=128) {
  const seen=new Uint8Array(mask.length),sizes=[];
  for(let i=0;i<mask.length;i++)if(mask[i]&&!seen[i]){
    const q=[i];seen[i]=1;let at=0;
    while(at<q.length){const j=q[at++],x=j%width;const near=[j-width,j+width];if(x>0)near.push(j-1);if(x<width-1)near.push(j+1);
      for(const n of near)if(n>=0&&n<mask.length&&mask[n]&&!seen[n]){seen[n]=1;q.push(n);}}
    sizes.push(q.length);
  }
  return sizes.sort((a,b)=>b-a);
}
