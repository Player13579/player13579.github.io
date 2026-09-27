/** Numeric vetoes, never a visual-quality certificate. Applies to actual native output pixels. */
export const BACKGROUNDS=Object.freeze([
 {name:'dark',linear:[0.005181516702338386,0.006995410187265387,0.011612245179743885]}, {name:'light',linear:[.85,.85,.85]},
 {name:'black',linear:[0,0,0]}, {name:'white',linear:[1,1,1]},
 {name:'neutral',linear:[.18,.18,.18]}, {name:'checker4px',linear:[.025,.025,.025]}
]);
export function halfToNumber(h){const s=(h&0x8000)?-1:1,e=(h>>>10)&31,m=h&1023;return e===0?s*2**-14*(m/1024):e===31?(m?NaN:s*Infinity):s*2**(e-15)*(1+m/1024);}
export function decodeHalf(bytes,row,width,height){const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),f=new Float32Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width*4;x++)f[y*width*4+x]=halfToNumber(v.getUint16(y*row+x*2,true));return f;}
const yOf=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
export function measureFrame(f,settings,info=null){
 const {width:w,height:h,hPx,branch,ageMs,background=0}=settings,nominal=BACKGROUNDS[background].linear;let nan=0,invalidAlpha=0,colored=0,footprint=0,white=0,clip=0,overflow=0,maxLayers=0;
 let xmin=w,ymin=h,xmax=-1,ymax=-1,windowPixels=0,transmission=0,clear=0,source=0;
 const normalFixture=(settings.diagnostic??0)===0&&(settings.bandMask??31)===31;
 const activeEnd=['fracture','bust'].includes(branch)?480:650,visible=ageMs<activeEnd||['create','absorb','idle'].includes(branch);
 const nearWhiteMask=new Uint8Array(w*h),windowTs=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const n=(y*w+x)*4,a=f[n+3],rgb=[f[n],f[n+1],f[n+2]];if([...rgb,a].some(v=>!Number.isFinite(v)))nan++;if(a<-.0001||a>1.0001)invalidAlpha++;
  const bg=background===5?((Math.floor(x/4)+Math.floor(y/4))%2===0?[.85,.85,.85]:[.025,.025,.025]):nominal;
  const c=rgb.map((v,j)=>v+(1-a)*bg[j]),delta=Math.max(...c.map((v,j)=>Math.abs(v-bg[j]))),peak=Math.max(1,...c),out=c.map(v=>v/peak);
  if(delta>=.035){colored++;xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}if(a>.001)footprint++;
  // Exclude merely transmitted white background. White effects require source radiance >.12 Y.
  if(yOf(rgb)>.12&&out.every(v=>v>.87)){white++;nearWhiteMask[y*w+x]=1;}
  if(yOf(rgb)>.12&&c.every(v=>v>=1.0))clip++;
  if(Math.abs(x+.5-w/2)<.27*hPx&&Math.abs(y+.5-h/2)<.49*hPx){windowPixels++;transmission+=1-a;windowTs.push(1-a);source+=yOf(rgb);if(1-a>=.78&&yOf(rgb)<=.065)clear++;}
  if(info){maxLayers=Math.max(maxLayers,info[n]);if(info[n+3]>.5)overflow++;}
 }
 let largestWhite=0;const seen=new Uint8Array(w*h);for(let n=0;n<seen.length;n++)if(nearWhiteMask[n]&&!seen[n]){const stack=[n];seen[n]=1;let count=0;while(stack.length){const q=stack.pop();count++;const x=q%w,y=Math.floor(q/w);for(const t of [x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1])if(t>=0&&!seen[t]&&nearWhiteMask[t]){seen[t]=1;stack.push(t);}}largestWhite=Math.max(largestWhite,count);}
 windowTs.sort((a,b)=>a-b);const scale=(hPx/64)**2,failures=[];
 if(nan)failures.push('nonfinite_pixel');if(invalidAlpha)failures.push('invalid_alpha');if(overflow)failures.push('depth_peel_overflow');
 if(largestWhite>28*scale||white>Math.max(1,footprint)*.018)failures.push('source_whitening_over_budget');
 if(clip>Math.max(1,footprint)*.003)failures.push('source_clipping_over_budget');
 if(visible&&footprint>0&&(xmin<2||xmax>w-3||ymin<2||ymax>h-3))failures.push('viewport_crop');
 if(normalFixture&&visible&&['create','absorb','idle'].includes(branch)){
  if(colored<6000*scale)failures.push('broad_faces_under_area_floor');
  if(transmission/windowPixels<.84||clear/windowPixels<.82)failures.push('receiver_airspace_filled');
 }
 if(!visible&&footprint)failures.push('residue_survives_event_end');
 return {nan,invalidAlpha,coloredPixels:colored,footprintPixels:footprint,bbox:xmax<0?null:[xmin,ymin,xmax-xmin+1,ymax-ymin+1],windowPixels,
 windowMeanTransmission:transmission/windowPixels,windowP10Transmission:windowTs[Math.floor(windowTs.length*.1)],windowClearFraction:clear/windowPixels,windowMeanSourceY:source/windowPixels,
 nearWhiteSourcePixels:white,largestNearWhiteSourceComponent:largestWhite,allChannelSourceClipPixels:clip,maxLayers,overflowPixels:overflow,
 normalFixture,automaticHardReject:failures.length>0,failures,qualityApproval:false,humanG1:'not_run'};
}
