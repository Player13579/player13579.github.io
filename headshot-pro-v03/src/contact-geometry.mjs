import {clamp,smoothstep,profileFor,sampleProfile,reactionPhase} from './profiles.mjs';
/** 凸面の頂点が形の単一正本。CPUの数値検査もGPUもこの同じ凸面を使う。テクスチャ無し。 */
export const GEOMETRY_LAYOUT=Object.freeze({maxPieces:12,maxEdges:8,floatsPerPiece:36,bytesPerPiece:144});
const PI=Math.PI;
const regular=(rx,ry,n=8,phase=PI/8)=>Array.from({length:n},(_,i)=>[rx*Math.cos(phase+i*2*PI/n),ry*Math.sin(phase+i*2*PI/n)]);
const polygon=(vertices,tone=.72,kind='reaction_face')=>({vertices,tone,kind});
// 反応面の包絡は、指定した頂点候補の凸包そのもの。凹状の全体は複数の面で構成する。
function convexHull(points){
  const pts=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const half=list=>{const h=[];for(const p of list){while(h.length>=2&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};
  const lo=half(pts),hi=half([...pts].reverse());return lo.slice(0,-1).concat(hi.slice(0,-1));
}
function area(v){return v.reduce((s,p,i)=>{const q=v[(i+1)%v.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;}
function oriented(vertices){return area(vertices)<0?[...vertices].reverse():vertices;}
function transform(v,{x=0,y=0,sx=1,sy=1,angle=0}={}) {const c=Math.cos(angle),s=Math.sin(angle);return v.map(([px,py])=>[x+px*sx*c-py*sy*s,y+px*sx*s+py*sy*c]);}
// 根元が核へ重なる肉厚の反応面。外端だけが動き、世界内の飛翔片にはならない。
function radialFace(angle,reach,halfWidth,{base=.065,root=.17,tone=.72,tip=.77}={}){
  return polygon(transform(convexHull([[base,-root],[reach*.54,-halfWidth],[reach*.90,-halfWidth*.85],[reach,-halfWidth*.30],
    [reach,halfWidth*.30],[reach*tip,halfWidth],[reach*.44,halfWidth*.88],[base,root]]),{angle}),tone);
}
function chamferBox(cx,cy,hx,hy,bevel=.045,tone=.72,kind='reaction_face'){
  const b=Math.min(bevel,hx*.5,hy*.5);return polygon([[cx-hx+b,cy-hy],[cx+hx-b,cy-hy],[cx+hx,cy-hy+b],[cx+hx,cy+hy-b],
    [cx+hx-b,cy+hy],[cx-hx+b,cy+hy],[cx-hx,cy+hy-b],[cx-hx,cy-hy+b]],tone,kind);
}
/** 形態の向きはE自身の基底。射手位置/撃った時刻から入射方位を推定しない。 */
export function buildContactGeometry(profile,envelope,reducedMotion=false){
  const p=profile,u=clamp(envelope.u),r=reactionPhase(p,u,reducedMotion),aim=p.aim;
  const pieces=[];
  const move=r.spread,lag=r.lag;
  // reducedでは寸法/位置/面配分が寿命中に不変。包絡だけは同じ接触因果で一回変化する。
  const press=r.pressure;
  switch(p.weapon){
    case 'handgun': {
      // 中心を覆う一枚の広い座。細い二条ではなく、面積を持つ圧縮の広がり。
      const rx=(aim?.49:.64)+.055*move,ry=(aim?.415:.33)+.075*move;
      const seat=regular(rx,ry,8,PI/8);
      const shaped=seat.map(([x,y])=>[x*(aim?1:x<0?1.10:.80),y+(aim?0:.075*(x/rx))*move]);
      pieces.push(polygon(shaped,.64,'pressure_seat'));
      // 核へ向く広い二つの面取り。面の一部であり、独立した飛散物ではない。
      pieces.push(radialFace(PI,rx*.78,ry*.63,{root:.14,tone:.80,base:.045}));
      pieces.push(radialFace(0,rx*(aim?.78:.59),ry*.71,{root:.16,tone:.94,base:.03}));
      break;
    }
    case 'smg': {
      // 三方向の幅ある短い葉。HIPは扇が開きながら順に着座、AIMは狭い三角包囲で同時に戻る。
      const angles=aim?[90,210,330]:[78,182,302];
      const scale=aim?[1,1,1]:[.70,1.18,.92];
      for(let i=0;i<3;i++){
        const response=aim?move:clamp(move*(i===1?1.10:1-.34*lag*(i===0?1:.55)));
        const reach=(aim?.455:.48)*scale[i]+.13*response;
        const breadth=(aim?.195:.21)*(aim?1:[.80,1.13,.94][i]);
        pieces.push(radialFace(angles[i]*PI/180,reach,breadth,{root:.12,base:.02,tone:[.65,.80,.93][i]}));
      }
      break;
    }
    case 'assault': {
      // 四つの角張った肩。内側で一つの接触核を受け、外側の段差で荷重の受け渡しを読む。
      const angles=[45,135,225,315];
      for(let i=0;i<4;i++){
        const spread=move*(aim?1:(i<2?1.07:.64+.20*(1-lag)));
        const reach=(aim?.47:[.56,.53,.34,.42][i])+.15*spread;
        const width=(aim?.205:[.24,.23,.19,.21][i]);
        pieces.push(polygon(transform(convexHull([[.025,-.14],[reach*.54,-width],[reach*.92,-width],[reach,-width*.65],
          [reach,width*.65],[reach*.92,width],[reach*.54,width],[.025,.14]]),{angle:angles[i]*PI/180}),[.94,.70,.58,.82][i]));
      }
      pieces.push(chamferBox(0,0,aim?.22:.25,aim?.22:.18,.05,.74,'pressure_seat'));
      break;
    }
    case 'sniper': {
      // 上下二つの幅ある返り面と狭い腰。長い一線・貫通孔・死体を描かない。
      for(let i=0;i<2;i++){
        const k=aim?1:(i===0?1.02:.64+.12*(1-lag));
        const reach=(.54+.20*move)*k;
        const breadth=(aim?.31:i===0?.34:.235)*(1-.09*press);
        // 段付きの返り面は二つの凸面へ分ける。凹形を凸half-planeに偽装しない。
        pieces.push(radialFace(i===0?PI/2:-PI/2,reach*.76,.15,{base:0,root:.12,tone:i===0?.72:.59}));
        pieces.push(polygon(transform([[reach*.48,-breadth*.67],[reach*.63,-breadth],[reach*.93,-breadth*.82],[reach,breadth*.18],
          [reach*.88,breadth],[reach*.62,breadth*.86]],{angle:i===0?PI/2:-PI/2}),i===0?.93:.76));
      }
      break;
    }
    case 'taser': {
      // 二顎が保持する局所ブリッジ。周期点滅・連射・スタン状態を意味しない。
      const jawX=(aim?.545:.565)-.14*move;
      for(let i=0;i<2;i++){
        const sign=i===0?-1:1,offset=aim?0:(i===0?.105:-.11);
        const top=aim?.315:i===0?.405:.26;
        const cx=sign*jawX;
        pieces.push(chamferBox(cx,offset,.105,top,.045,i===0?.68:.91));
        pieces.push(chamferBox(cx-sign*.10,offset+top-.06,.185,.075,.025,i===0?.79:.96));
        pieces.push(chamferBox(cx-sign*.10,offset-top+.06,.185,.075,.025,i===0?.62:.83));
        // 根元の短い太い導入面。均一な管にせず、核側を厚くし折面を持たせる。
        pieces.push(polygon([[0,-.115],[cx,-.075+offset],[cx,.075+offset],[0,.115]],i===0?.77:.86,'bridge'));
      }
      break;
    }
    default: throw new TypeError('unknown contact mechanism');
  }
  // 最初に核が成立し、その場を起点に面が広がる。既にある核まで一緒に移動/拡大しない。
  // taserは顎の閉鎖そのものが反応なので、全体の外向き拡大を強制しない。
  const front=reducedMotion||p.weapon==='taser'?1:.46+.54*smoothstep(.015,p.weapon==='sniper'?.20:.145,u);
  for(const piece of pieces)piece.vertices=piece.vertices.map(([x,y])=>[x*front,y*front]);
  // 全てのvariantで正確な接触座標を覆う核。HIPも核の位置は変えない。
  const core=(aim?.174:.186)*(reducedMotion?1:.96+.08*press);
  pieces.push(polygon(regular(core,core*(p.weapon==='sniper'?.86:1),8,PI/8),1,'contact_core'));
  if(pieces.length>GEOMETRY_LAYOUT.maxPieces)throw new RangeError('geometry capacity');
  for(const piece of pieces)piece.vertices=oriented(piece.vertices);
  return Object.freeze({version:3,variant:p.variant,mechanism:p.mechanism,contact:[0,0],pieces,
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
      // 凸性を実際に検査。ラベルだけの形状検証にはしない。
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
