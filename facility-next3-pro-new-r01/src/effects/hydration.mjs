import {smooth,envelope,mix} from '../math.mjs';
import {localPoint} from '../mesh.mjs';

// 独立設計2: 下端の広い源→滴状の滑らかな光学搬送域→同じ施設面の青緑応答。
// 液体の新規供給、飲用動作、プレイヤーへの実液体移送は描写しない。
const deep=[.012,.19,.17], water=[.025,.65,.55], pearl=[.71,1,.88], caustic=[.24,.87,.71];
export const hydrationEffect=Object.freeze({
  id:'meniscus-fold', bounds:[-39,-17,0,39,17,84], source:[0,0,8],receiverRadius:76,
  sourceColor:caustic,
  lens:{threshold:.60,gain:.028,ghostScale:.032,ghostFactor:-.62,coating:[.49,.64,.82],veilAspect:.85},
  lightAt(t) { return envelope(t,.235,.35,1.45)*(.88+.12*Math.exp(-Math.pow((t-.34)/.15,2))); },
  mediumOpticalDepthAt(t) { return .37*envelope(t-.07,.28,.95,2.13); },
  draw(b,o,t,{reducedMotion=false,detail=1}={}) {
    if(t<0 || t>=2.2) return;
    const light=this.lightAt(t), env=envelope(t-.07,.28,.95,2.13), motion=reducedMotion?.22:1;
    const p=(x,y,z)=>localPoint(o,x,y,z);
    const n=detail<.5?24:48;
    // source meniscus: 下端の浅い弧。全周ringではなく源の開口断面。
    const source=[];
    for(let i=0;i<=18;i++){const x=-16+32*i/18;source.push(p(x,0,8-3*(1-(x/16)**2)));}
    b.ribbon(source,source.map((_,i)=>1.3+1.2*Math.sin(Math.PI*i/18)),pearl,light*.76,{light:true});
    // 主形: 内部を持つ滴状領域。透明度と放射量を別に制御。
    const perimeter=[];
    const grow=.91+.09*smooth(.07,.58,t), zoff=(1-smooth(.07,.7,t))*5*motion;
    for(let i=0;i<n;i++) {
      const theta=2*Math.PI*i/n;
      const z=35+29*Math.cos(theta)-zoff;
      const x=24*Math.sin(theta)*(1-.42*Math.cos(theta))*grow;
      perimeter.push(p(x,Math.sin(theta)*3,z));
    }
    const center=p(0,0,31-zoff);
    for(let i=0;i<n;i++) {
      const a=perimeter[i],d=perimeter[(i+1)%n];
      b.tri([center,a,d],[water,deep,water],[env*.055,env*.14,env*.095]);
    }
    b.ribbon([...perimeter,perimeter[0]],1.4,caustic,env*.39,{light:true});
    // sourceに束縛された2つの内部経路。逆向きの流れではなく異なる断面の見え。
    for(let lane=0;lane<2;lane++) {
      const curve=[],alphas=[];
      const on=lane===0?.14:.29, e=envelope(t-on,.35,.86,2.2-on);
      for(let i=0;i<=n/2;i++) {
        const u=i/(n/2), shift=(1-smooth(on,on+.65,t))*motion*.22;
        curve.push(p((lane?1:-1)*(4+13*Math.sin(Math.PI*u))*(1-u*.43),lane?2:-2,10+49*u+Math.sin(Math.PI*u)*shift*6));
        alphas.push(e*(.11+.28*Math.sin(Math.PI*u)));
      }
      b.ribbon(curve,curve.map((_,i)=>.8+2*Math.sin(Math.PI*i/(n/2))),lane?pearl:water,alphas,{light:true});
    }
    // ふくらみの底でのみ幅のある透過光。画面全体の色変更・背景屈折は行わない。
    b.disc(p(0,0,12),17,7,water,light*.12,{light:true});
  },
  synthesize(sampleRate,seed) {
    const data=new Float32Array(Math.ceil(sampleRate*2.2));
    const tint=((seed>>>8)%101)/101;
    const taps=[{at:.025,f:714,amp:.42,decay:.22},{at:.285,f:1068,amp:.28,decay:.27},{at:.645,f:1426,amp:.17,decay:.31}];
    for(let i=0;i<data.length;i++) {
      const t=i/sampleRate;let sample=0;
      for(const tap of taps) {
        const u=t-tap.at;if(u<0) continue;
        const env=(1-Math.exp(-u/.0028))*Math.exp(-u/tap.decay)*(1-smooth(1.40,1.72,t));
        const phase=2*Math.PI*(tap.f*u+38*.034*(1-Math.exp(-u/.034)));
        sample+=tap.amp*env*(Math.sin(phase)+.19*Math.sin(phase*2.071)+.055*Math.sin(phase*3.83+tint*.04));
      }
      data[i]=sample*.75;
    }
    return data;
  }
});
