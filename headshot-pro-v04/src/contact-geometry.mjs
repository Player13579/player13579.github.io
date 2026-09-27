import {clamp,smoothstep,profileFor,sampleProfile,reactionPhase} from './profiles.mjs';
/** v4: 接触核 + 武器系統ごとの面反応。CPU検査もGPUも同じ凸面列だけを用いる。 */
export const GEOMETRY_LAYOUT=Object.freeze({maxPieces:12,maxEdges:8,floatsPerPiece:36,bytesPerPiece:144});
const PI=Math.PI;
const regular=(rx,ry,n=8,phase=PI/8)=>Array.from({length:n},(_,i)=>[rx*Math.cos(phase+i*2*PI/n),ry*Math.sin(phase+i*2*PI/n)]);
const polygon=(vertices,tone=.72,kind='reaction_face')=>({vertices,tone,kind});
function convexHull(points){
  const pts=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const half=list=>{const h=[];for(const p of list){while(h.length>=2&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};
  const lo=half(pts),hi=half([...pts].reverse());return lo.slice(0,-1).concat(hi.slice(0,-1));
}
function area(v){return v.reduce((s,p,i)=>{const q=v[(i+1)%v.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;}
function oriented(vertices){return area(vertices)<0?[...vertices].reverse():vertices;}
function transform(v,{x=0,y=0,sx=1,sy=1,angle=0}={}) {const c=Math.cos(angle),s=Math.sin(angle);return v.map(([px,py])=>[x+px*sx*c-py*sy*s,y+px*sx*s+py*sy*c]);}
function radialFace(angle,reach,halfWidth,{base=.055,root=.16,tone=.72,tip=.80,flare=1}={}){
  return polygon(transform(convexHull([[base,-root],[reach*.42,-halfWidth*.85*flare],[reach*.80,-halfWidth],[reach,-halfWidth*.24],
    [reach,halfWidth*.24],[reach*tip,halfWidth],[reach*.38,halfWidth*.88*flare],[base,root]]),{angle}),tone);
}
function chamferBox(cx,cy,hx,hy,bevel=.045,tone=.72,kind='reaction_face'){
  const b=Math.min(bevel,hx*.5,hy*.5);return polygon([[cx-hx+b,cy-hy],[cx+hx-b,cy-hy],[cx+hx,cy-hy+b],[cx+hx,cy+hy-b],
    [cx+hx-b,cy+hy],[cx-hx+b,cy+hy],[cx-hx,cy+hy-b],[cx-hx,cy-hy+b]],tone,kind);
}
function hull(points,tone=.72,kind='reaction_face'){return polygon(oriented(convexHull(points)),tone,kind);}
function seatOval(rx,ry,{skew=0,xBias=0,tone=.68}={}){
  const base=regular(rx,ry,8,PI/8).map(([x,y])=>[x*(1+skew*(y/Math.max(ry,.001)))+xBias*(1-Math.abs(y/Math.max(ry,.001))),y]);
  return polygon(oriented(base),tone,'pressure_seat');
}
/** 形態の向きはE自身の基底。射手位置/撃った時刻から入射方位を推定しない。 */
export function buildContactGeometry(profile,envelope,reducedMotion=false){
  const p=profile,u=clamp(envelope.u),r=reactionPhase(p,u,reducedMotion),aim=p.aim;
  const pieces=[];
  const move=r.spread,lag=r.lag,press=r.pressure,settle=r.settle;
  switch(p.weapon){
    case 'handgun': {
      if(aim){
        // AIM: 両側の支柱と上棚で中央を囲う「門型」。HIPの広い座とは別記号にする。
        pieces.push(chamferBox(0,.255,.34+.03*move,.115,.05,.84));
        pieces.push(chamferBox(-.285,.01,.11,.285-.03*settle,.05,.68));
        pieces.push(chamferBox(.285,.01,.11,.285-.03*settle,.05,.93));
        pieces.push(chamferBox(0,-.17,.17,.11,.045,.74,'pressure_seat'));
      }else{
        // HIP: 偏った幅広の受け皿と片寄った肩。門型にはせず、着座面が主役。
        pieces.push(seatOval(.40+.04*move,.26+.03*move,{skew:.18,xBias:-.03,tone:.66}));
        pieces.push(chamferBox(-.25,.02,.20,.17,.045,.80));
        pieces.push(radialFace(.06,.28+.05*move,.12,{root:.15,base:.03,tone:.95,tip:.72}));
      }
      break;
    }
    case 'smg': {
      if(aim){
        // AIM: 三角の抱え込み。3葉だが閉じた三辺読みにし、HIPの開いた扇と分ける。
        pieces.push(radialFace(PI/2,.38+.07*move,.15,{root:.14,base:.02,tone:.68}));
        pieces.push(radialFace(7*PI/6,.34+.05*move,.16,{root:.13,base:.02,tone:.82}));
        pieces.push(radialFace(-PI/6,.34+.05*move,.16,{root:.13,base:.02,tone:.94}));
        pieces.push(hull([[-.18,-.12],[0,.18],[.18,-.12],[0,-.03]],.74,'pressure_seat'));
      }else{
        // HIP: 一方向へ流れる扇状三葉。主葉が長く、残りが順に受け渡す。
        pieces.push(radialFace(2.45,.47+.08*move*(1-.20*lag),.17,{root:.14,base:.02,tone:.92,flare:1.05}));
        pieces.push(radialFace(-1.25,.38+.05*move*(1-.50*lag),.14,{root:.12,base:.02,tone:.72}));
        pieces.push(radialFace(.10,.30+.04*move*(1-.75*lag),.11,{root:.11,base:.025,tone:.60}));
        pieces.push(chamferBox(-.06,.03,.11,.10,.03,.79,'pressure_seat'));
      }
      break;
    }
    case 'assault': {
      if(aim){
        // AIM: 四辺が均等に包む十字/角座。HIPの段付き片寄りと分離。
        pieces.push(chamferBox(0,.27,.19,.13,.045,.92));
        pieces.push(chamferBox(0,-.27,.19,.13,.045,.70));
        pieces.push(chamferBox(-.27,0,.13,.19,.045,.60));
        pieces.push(chamferBox(.27,0,.13,.19,.045,.84));
        pieces.push(chamferBox(0,0,.20,.20,.045,.74,'pressure_seat'));
      }else{
        // HIP: 上棚と下スパーを持つ段付き反応。十字にせず、上下非対称の受け渡しを残す。
        pieces.push(chamferBox(0,.285,.31+.03*move,.11,.045,.92));
        pieces.push(chamferBox(-.27,.03,.15,.22,.045,.76));
        pieces.push(chamferBox(.17,-.05,.11,.17,.04,.62));
        pieces.push(radialFace(-PI/2,.34+.06*move*(1-.35*lag),.12,{root:.14,base:.03,tone:.84,tip:.70}));
        pieces.push(chamferBox(-.02,.05,.14,.12,.035,.70,'pressure_seat'));
      }
      break;
    }
    case 'sniper': {
      if(aim){
        // AIM: 対向する上下の返り面を細い腰で接続した「縦I型」。
        pieces.push(chamferBox(0,.305,.31,.10,.04,.90));
        pieces.push(chamferBox(0,-.305,.31,.10,.04,.73));
        pieces.push(chamferBox(0,0,.115,.28,.04,.66,'pressure_seat'));
      }else{
        // HIP: 上バー + 偏心ステムの「槌頭型」。対称のI字とは異なる。
        pieces.push(chamferBox(0,.29,.37+.04*move,.10,.04,.91));
        pieces.push(chamferBox(.05,-.03,.12,.31,.04,.68,'pressure_seat'));
        pieces.push(chamferBox(-.18,-.24,.13,.085,.03,.79));
      }
      break;
    }
    case 'taser': {
      if(aim){
        // AIM: 左右が揃って閉じるクランプ/H型。保持相でも左右差を作らない。
        pieces.push(chamferBox(-.29,0,.10,.29,.045,.70));
        pieces.push(chamferBox(.29,0,.10,.29,.045,.92));
        pieces.push(chamferBox(0,0,.21,.11,.035,.80,'bridge'));
      }else{
        // HIP: 高さがずれた二顎と斜めの短橋。AIMのH型と異なる「ずれたクランプ」。
        pieces.push(chamferBox(-.30,.17,.11,.21,.045,.72));
        pieces.push(chamferBox(.30,-.17,.11,.21,.045,.94));
        pieces.push(chamferBox(-.14,-.08,.17,.08,.03,.81));
        pieces.push(chamferBox(.14,.08,.17,.08,.03,.66));
        pieces.push(hull([[-.06,.12],[.20,.22],[.08,-.02],[-.18,-.16]],.78,'bridge'));
      }
      break;
    }
    default: throw new TypeError('unknown contact mechanism');
  }
  // 最初に核が成立し、その場を起点に面が出る。核を一緒に走らせず、接触x/yを固定する。
  const front=reducedMotion||p.weapon==='taser'?1:.50+.50*smoothstep(.015,p.weapon==='sniper'?.22:.14,u);
  for(const piece of pieces)piece.vertices=piece.vertices.map(([x,y])=>[x*front,y*front]);
  // 全variant共通の正確な接触核。有色本体であり、発光に潰される白穴ではない。
  const core=(aim?.174:.186)*(reducedMotion?1:.97+.06*press);
  pieces.push(polygon(regular(core,core*(p.weapon==='sniper'?.88:1),8,PI/8),1,'contact_core'));
  if(pieces.length>GEOMETRY_LAYOUT.maxPieces)throw new RangeError('geometry capacity');
  for(const piece of pieces)piece.vertices=oriented(piece.vertices);
  return Object.freeze({version:4,variant:p.variant,mechanism:p.mechanism,contact:[0,0],pieces,
    response:{...r},coreRadius:core,sourceRadius:aim?.075:.088,
    scope:'ゲームEの様式化された接触面。受け手の変形・傷・入射角を計測したものではない。'});
}
/** 正規化済み凸半平面。GPUとCPU数値検査の共通入力で、独立したラスタ絵を作らない。 */
export function encodeContactGeometry(geometry){
  const {maxPieces,maxEdges,floatsPerPiece}=GEOMETRY_LAYOUT;
  const out=new Float32Array(maxPieces*floatsPerPiece);
  geometry.pieces.forEach((piece,i)=>{
    const v=piece.vertices;if(v.length<3||v.length>maxEdges)throw new RangeError('polygon edge count');
    const b=i*floatsPerPiece;out.set([v.length,piece.tone,piece.kind==='contact_core'?1:0,0],b);
    for(let j=0;j<v.length;j++){
      const [x,y]=v[j],[nx,ny]=v[(j+1)%v.length],dx=nx-x,dy=ny-y,len=Math.hypot(dx,dy);
      if(len<1e-8)throw new RangeError('degenerate edge');
      const a=dy/len,c=-dx/len,k=a*x+c*y;
      if(v.some(([px,py])=>a*px+c*py-k>1e-5))throw new RangeError(`non-convex polygon: ${geometry.variant} / ${i}`);
      out.set([a,c,k,0],b+4+j*4);
    }
  });
  return out;
}
/** mask/光/OBSを含まない幾何の数値照合。GPU画素/視認性の検査とは明示して分離する。 */
export function signedBodyDistance(encoded,x,y){
  let distance=Infinity;
  for(let i=0;i<GEOMETRY_LAYOUT.maxPieces;i++){
    const b=i*GEOMETRY_LAYOUT.floatsPerPiece,n=encoded[b];if(n<3)continue;
    let d=-Infinity;for(let j=0;j<n;j++){const k=b+4+j*4;d=Math.max(d,encoded[k]*x+encoded[k+1]*y-encoded[k+2]);}
    distance=Math.min(distance,d);
  }
  return distance;
}
export function geometryAt(variant,u,reducedMotion=false){const p=profileFor(variant);return buildContactGeometry(p,sampleProfile(p,p.durationMs*u,reducedMotion),reducedMotion);}
