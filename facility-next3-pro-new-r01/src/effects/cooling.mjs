import {smooth,envelope,mix} from '../math.mjs';
import {localPoint} from '../mesh.mjs';

// 独立設計3: 低いスリット源→左右に有限輸送される3段の薄膜→既存面の冷色応答。
// 霜、煙、破片、追加fanや設備本体を作らない。媒体は使用通知の有限光学場。
const steel=[.055,.12,.21], blue=[.19,.43,.85], ice=[.62,.83,1], white=[.88,.97,1];
export const coolingEffect=Object.freeze({
  id:'transverse-vanes',bounds:[-96,-26,0,96,26,58],source:[0,0,10],receiverRadius:104,
  sourceColor:ice,
  lens:{threshold:.55,gain:.026,ghostScale:.038,ghostFactor:-.21,coating:[.37,.56,.73],veilAspect:1.65},
  lightAt(t) { return envelope(t,.12,.17,1.12)*(.72+.28*Math.exp(-Math.pow((t-.18)/.07,2))); },
  mediumOpticalDepthAt(t) { return .25*envelope(t-.06,.23,.83,2.14); },
  draw(b,o,t,{reducedMotion=false,detail=1}={}) {
    if(t<0 || t>=2.2) return;
    const light=this.lightAt(t), motion=reducedMotion?.20:1;
    const p=(x,y,z)=>localPoint(o,x,y,z);
    // source slit: 横長で低い一枚の源。
    b.polygon([p(-14,0,6),p(14,0,6),p(17,0,11),p(10,0,15),p(-10,0,15),p(-17,0,11)],steel,envelope(t,.07,.58,1.7)*.61);
    b.ribbon([p(-13,0,10),p(0,0,11),p(13,0,10)],[1,3.3,1],white,light*.9,{light:true});
    const n=detail<.5?14:28;
    for(let layer=0;layer<3;layer++) {
      const on=.06+layer*.115, e=envelope(t-on,.23,.65+layer*.06,2.2-on);
      if(e<=0) continue;
      const transport=smooth(on,on+.80,t), span=(51+layer*13)*(1-(1-transport)*.48*motion);
      // 薄膜は正面の色違いコピーではなく、深さ・厚さ・反りを分ける。
      for(const side of [-1,1]) {
        const top=[],bottom=[];
        for(let i=0;i<=n;i++) {
          const u=i/n;
          const z=16+layer*10+Math.sin(Math.PI*u)*5.5-(u*u)*(7+layer*2);
          const x=side*(10+span*u);
          const y=layer*4.1+Math.sin(Math.PI*u)*side*5;
          top.push(p(x,y,z));bottom.push(p(x,y+3+layer,z-(4.5-2*u)));
        }
        for(let i=0;i<n;i++) {
          const fade=Math.pow(1-i/n,.6)*e;
          b.tri([top[i],bottom[i],top[i+1]],blue,fade*.07);
          b.tri([bottom[i],bottom[i+1],top[i+1]],steel,fade*.15);
        }
        const edgeAlpha=top.map((_,i)=>e*(.33+.13*light)*Math.pow(1-i/n,.55));
        b.ribbon(top,top.map((_,i)=>mix(2.1,.35,i/n)),ice,edgeAlpha,{light:true});
        b.ribbon(bottom,.75,blue,edgeAlpha.map(a=>a*.46),{light:true});
        // 搬送部の一つの幅広い圧縮区間。点滅や高周波sparkleではない。
        const crest=[];
        for(let i=0;i<=n;i++) {
          const u=i/n, v=.20+.65*transport;
          const spread=Math.exp(-Math.pow((u-v)/.17,2));
          crest.push(spread*e*.17);
        }
        b.ribbon(top,4,white,crest,{light:true});
      }
    }
    b.disc(p(0,0,10),21,6,ice,light*.08,{light:true});
  },
  synthesize(sampleRate,seed) {
    const data=new Float32Array(Math.ceil(sampleRate*2.2));
    let rng=(seed^0x729cbaf1)>>>0,low=0,slow=0;
    for(let i=0;i<data.length;i++) {
      const t=i/sampleRate;
      rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
      const noise=(rng>>>0)/2147483648-1;
      const cutoff=2100*Math.exp(-t/.36)+290;
      const a=1-Math.exp(-2*Math.PI*cutoff/sampleRate),h=1-Math.exp(-2*Math.PI*150/sampleRate);
      low+=a*(noise-low);slow+=h*(low-slow);
      const pressure=(low-slow)*(1-Math.exp(-t/.018))*Math.exp(-t/.29)*(1-smooth(.83,1.14,t));
      const phase=2*Math.PI*(108*t+155*.13*(1-Math.exp(-t/.13)));
      const weight=Math.sin(phase)*.19*(1-Math.exp(-t/.006))*Math.exp(-t/.24);
      const u=t-.57;
      const settle=u>0 ? Math.sin(2*Math.PI*382*u)*.10*(1-Math.exp(-u/.002))*Math.exp(-u/.052):0;
      data[i]=.70*(pressure*.76+weight+settle)*(1-smooth(1.35,1.65,t));
    }
    return data;
  }
});
