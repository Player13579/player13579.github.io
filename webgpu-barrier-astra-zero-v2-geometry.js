// Barrier 第2案の数値設計。描画器・GPU受入の代用品ではない。
export const eventContracts = Object.freeze({
  'action-stand/durability-created': { branch: 'grant', durationMs: 650, receiverField: 'targetId' },
  'preparation-barrier-hit/durability-hit': { branch: 'hit', durationMs: 650, receiverField: 'playerId' },
  'preparation-barrier-hit/durability-broken': { branch: 'broken', durationMs: 480, receiverField: 'playerId' },
  'action-push/timed-bust-break': { branch: 'bust', durationMs: 480, receiverField: 'targetId' }
});
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const phase = (t, a, b) => smooth((t - a) / (b - a));
function envelope(t, points) {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; ++i) {
    const [b, y] = points[i], [a, x] = points[i - 1];
    if (t <= b) return x + (y - x) * phase(t, a, b);
  }
  return points.at(-1)[1];
}
export function sampleBarrier({ type, variant, ageMs, height = 64, reducedMotion = false }) {
  const event = eventContracts[`${type}/${variant}`];
  if (!event) throw new RangeError('未許可のBarrierイベント対');
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(ageMs)) throw new RangeError('寸法と時刻は有限値');
  if (ageMs < 0 || ageMs >= event.durationMs) return null;
  const b = event.branch, t = ageMs;
  const light = b === 'grant' ? envelope(t, [[0,0],[90,.5],[230,1],[310,.62],[520,.62],[650,0]])
    : b === 'hit' ? envelope(t, [[0,.35],[110,1],[230,.60],[490,.52],[650,0]])
    : b === 'broken' ? envelope(t, [[0,.55],[70,1],[210,.65],[370,.36],[480,0]])
    : envelope(t, [[0,.55],[80,1],[190,.7],[360,.4],[480,0]]);
  const viewFade = b === 'grant' ? phase(t,0,60)*(1-phase(t,520,650))
    : b === 'hit' ? phase(t,0,35)*(1-phase(t,490,650))
    : 1-phase(t,370,480);
  const closure = b === 'grant' ? phase(t,90,280) : 1;
  const pressure = b === 'hit' ? envelope(t,[[0,0],[65,.15],[150,1],[200,.8],[490,0]]) : 0;
  const collapse = b === 'broken' ? phase(t,45,370) : 0;
  const separation = b === 'bust' ? phase(t,45,190) : 0;
  const bandCenter = b === 'grant' ? .1+.8*phase(t,90,280)
    : b === 'broken' || b === 'bust' ? .95-.85*phase(t,45,210) : .5;
  const meshes = [];
  for (const [name, theta0, theta1, v0, v1, side] of [
    ['right',-50,50,0,1,1], ['left',130,230,0,1,-1], ['rear-shoulder',0,180,.72,1,0]
  ]) {
    const cols = name === 'rear-shoulder' ? 24 : 12, rows = 18;
    const vertices = [], indices = [];
    for(let j=0;j<=rows;j++) for(let i=0;i<=cols;i++) {
      const v=v0+(v1-v0)*j/rows, theta=(theta0+(theta1-theta0)*i/cols)*Math.PI/180;
      const radius=height*(.30+.17*Math.sin(Math.PI*v));
      let x=radius*Math.cos(theta), y=height*(1.13*v-.565), z=.24*height*Math.sin(theta);
      const load=Math.sin(Math.PI*v)**2;
      x-=Math.sign(x)*height*(reducedMotion?.025:.06)*pressure*load;
      if(side) x+=side*height*(reducedMotion?.035:.11)*(1-closure);
      if(collapse>0) {
        const fold=collapse*(reducedMotion?.5:1)*phase(v,.30,1);
        y-=height*.40*fold;
        z-=height*.16*fold;
      }
      if(separation>0 && side) {
        const yaw=side*separation*(reducedMotion?12:30)*Math.PI/180;
        const pivot=side*.30*height, dx=x-pivot;
        x=pivot+dx*Math.cos(yaw)+z*Math.sin(yaw)+side*height*(reducedMotion?.07:.18)*separation;
        z=-dx*Math.sin(yaw)+z*Math.cos(yaw);
      }
      // 消失は細粒noiseではなく、面を大きく欠落させる単調な境界。
      const support=b==='broken' ? 1-smooth((v-(1-.92*collapse))/.10) : 1;
      const crown=b==='bust' && !side ? 1-phase(t,45,145) : 1;
      const endCut=b==='bust' ? 1-phase(t,360,480) : 1;
      vertices.push({position:[x,y,z], uv:[i/cols,v], coverage:viewFade*support*crown*endCut});
    }
    for(let j=0;j<rows;j++) for(let i=0;i<cols;i++) {
      const a=j*(cols+1)+i,c=a+cols+1;
      indices.push(a,c,a+1,a+1,c,c+1);
    }
    meshes.push({name,vertices,indices});
  }
  return {branch:b,receiverField:event.receiverField,height,ageMs:t,durationMs:event.durationMs,
    phase:{closure,pressure,collapse,separation,bandCenter,light,viewFade},meshes,
    material:{baseLinear:[.035,.25,.31],emissionLinear:[.12,.75,.88],coreLinear:[.85,.98,1],
      opacityInterior:.12,opacityEdge:.30,bodyRadiance:.22,bandRadiance:1.6*light,coreRadiance:3*light,
      bandWidth:.12*height,coreWidth:.035*height,glowRadius:1.4*height/64,glowWeight:.20},
    // 局所screen変換の設計値。最終位置は実キャラの提出フレームへ束縛する。
    projection:{screenX:'x',screenY:'-y + 0.20*z',depthAxis:'z',rear:'z > 0'}};
}
