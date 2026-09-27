/** GPU buffer metrics. These are rejection signals, never an artistic approval. */
import {srgbToLinear,displayLinear} from './barrier-pro-sampler.mjs';
export const BACKGROUNDS=Object.freeze([
 {id:'dark',name:'暗背景 #10141c',linear:[16,20,28].map(v=>srgbToLinear(v/255))},
 {id:'gray',name:'中灰 #777777',linear:[119,119,119].map(v=>srgbToLinear(v/255))},
 {id:'light',name:'淡灰 #eeeeee',linear:[238,238,238].map(v=>srgbToLinear(v/255))},
 {id:'white',name:'白 #ffffff',linear:[1,1,1]},
 {id:'blue',name:'青 #234ad0',linear:[35,74,208].map(v=>srgbToLinear(v/255))},
 {id:'checker',name:'4px明暗パターン（透過検査）',linear:[0,0,0]},
]);
export function backgroundAt(index,x,y){return index===5?Array(3).fill(((Math.floor(x/4)+Math.floor(y/4))%2)===0?.65:.025):BACKGROUNDS[index].linear;}
export function halfToNumber(h){const s=(h&0x8000)?-1:1,e=h>>10&31,m=h&1023;return e===0?s*2**(-14)*m/1024:e===31?(m?NaN:s*Infinity):s*2**(e-15)*(1+m/1024);}
export function decodeHalf(bytes,row,width,height){const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out=new Float32Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<4;c++)out[(y*width+x)*4+c]=halfToNumber(d.getUint16(y*row+x*8+c*2,true));return out;}
const Y=(r,g,b)=>.2126*r+.7152*g+.0722*b;
function component(mask,width,height){const seen=new Uint8Array(mask.length);let largest=0;for(let i=0;i<mask.length;i++){if(!mask[i]||seen[i])continue;const queue=[i];seen[i]=1;for(let j=0;j<queue.length;j++){const k=queue[j],x=k%width,y=Math.floor(k/width);for(const [xx,yy]of[[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){if(xx<0||yy<0||xx>=width||yy>=height)continue;const n=yy*width+xx;if(mask[n]&&!seen[n]){seen[n]=1;queue.push(n);}}}largest=Math.max(largest,queue.length);}return largest;}
export function measureFrame(rgba,{width=256,height=192,hPx=64,branch='create',ageMs=0,background=0,coreEnabled=true,diagnostic=0}={}){
 if(rgba.length!==width*height*4)throw new RangeError('rgba dimensions');
 let visibleArea=0,brightColoredArea=0,white=0,invalid=0,invalidAlpha=0,alphaZeroLight=0,maxL=0,sumL=0,sumA=0,minX=width,maxX=-1,minY=height,maxY=-1,centralCovered=0,centralBright=0,centralTotal=0,transparentFace=0,peak=0;
 const whites=new Uint8Array(width*height),runs=[];
 for(let y=0;y<height;y++){let rowRun=0,rowMax=0;for(let x=0;x<width;x++){
  const n=(y*width+x)*4,[r,g,b,a]=rgba.subarray(n,n+4);const l=Y(r,g,b);
  if(![r,g,b,a].every(Number.isFinite))invalid++;
  if(a<-.002||a>1.002||Math.min(r,g,b)<-.002)invalidAlpha++;
  if(a<.00001&&Math.max(r,g,b)>.004)alphaZeroLight++;
  peak=Math.max(peak,r,g,b);maxL=Math.max(maxL,l);sumL+=l;sumA+=a;
  const visible=a>=.045&&l>=.035; // joint coverage AND energy; isolated glow cannot fill the test
  if(visible){visibleArea++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);rowRun++;rowMax=Math.max(rowMax,rowRun);}else rowRun=0;
  const chroma=Math.max(r,g,b)-Math.min(r,g,b),colored=visible&&l>=.16&&chroma>=.085;
  if(colored)brightColoredArea++;
  if(visible&&a>=.12&&a<=.60)transparentFace++;
  const inside=Math.abs(x+.5-width/2)<=.30*hPx&&Math.abs(y+.5-height/2)<=.30*hPx;
  if(inside){centralTotal++;if(visible)centralCovered++;if(colored)centralBright++;}
  const bg=backgroundAt(background,x,y),out=displayLinear([r+(1-a)*bg[0],g+(1-a)*bg[1],b+(1-a)*bg[2]]);
  if(visible&&Y(...out)>=.90&&Math.max(...out)-Math.min(...out)<=.09){white++;whites[y*width+x]=1;}
 }runs.push(rowMax);}
 const longestBroadSpan=Math.max(...runs),broadRows=runs.filter(x=>x>=.42*hPx).length;
 const box=maxX>=minX?[minX,minY,maxX-minX+1,maxY-minY+1]:null;
 const result={visibleArea,brightColoredArea,whiteArea:white,largestWhiteComponent:component(whites,width,height),whiteFraction:white/Math.max(1,visibleArea),invalid,invalidAlpha,alphaZeroLight,peakPremultipliedChannel:peak,maxLinearLuminance:maxL,totalLinearLuminance:sumL,alphaIntegral:sumA,box,longestBroadSpan,broadRows,centralCoverage:centralCovered/Math.max(1,centralTotal),centralBrightFraction:centralBright/Math.max(1,centralTotal),transparentFaceFraction:transparentFace/Math.max(1,visibleArea)};
 const r=ageMs/(branch==='fracture'||branch==='bust'?480:650),during=branch!=='idle'&&r>=0&&r<1,scale=(hPx/64)**2;
 const rejects=[];
 if(invalid||invalidAlpha||alphaZeroLight)rejects.push('invalid_float_alpha_or_unbound_emission');
 if(diagnostic===0){
  if(result.whiteFraction>.03||result.largestWhiteComponent>24*scale)rejects.push('large_white_area');
  // Phase-dependent minima: disappearance is spatial, not permission to become ribs.
  if(during){
   const minArea=branch==='fracture'?(r<.68?1600:420):branch==='bust'?(r<.65?1500:350):2200;
   if(visibleArea<minArea*scale)rejects.push('insufficient_projected_face_area');
   if(longestBroadSpan<(branch==='fracture'&&r>.68?.30:.46)*hPx)rejects.push('rib_like_residual_width');
   if((branch==='create'||branch==='absorb')&&result.centralCoverage<.80)rejects.push('missing_protective_center');
   if(background===0&&brightColoredArea<(branch==='fracture'&&r>.68?170:branch==='bust'&&r>.65?180:700)*scale)rejects.push('dark_background_color_plane_missing');
  }
 }
 return {measurement:'GPU linear-radiance buffer; thresholds are r0.2 design gates, NOT calibrated perceptual scores',settings:{width,height,hPx,branch,ageMs,background,coreEnabled,diagnostic},stats:result,automaticHardReject:rejects.length>0,rejectReasons:rejects,qualityApproval:false,humanReview:'not_run'};
}
