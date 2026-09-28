import {clamp,smooth,envelope,mix} from '../math.mjs';
import {localPoint} from '../mesh.mjs';

// 独立設計1: 縦の光芯→圧縮された段状の搬送面→既存面の暖色反射。
// 他Eの輪郭・palette・時定数・音声関数を参照しない。
const amber=[1,.39,.045], gold=[1,.72,.21], ivory=[1,.94,.72], copper=[.31,.105,.036];
export const powerEffect = Object.freeze({
  id:'axial-lamella', bounds:[-43,-18,0,43,18,108], source:[0,0,13], receiverRadius:88,
  sourceColor:gold,
  lens:{threshold:.58,gain:.036,ghostScale:.025,ghostFactor:-.38,coating:[.54,.66,.32],veilAspect:1.1},
  lightAt(t) { return envelope(t,.13,.24,1.20)*(.76+.24*Math.exp(-Math.pow((t-.22)/.11,2))); },
  mediumOpticalDepthAt(t) { return .18*envelope(t,.14,.74,2.2); },
  draw(b,o,t,{reducedMotion=false,detail=1}={}) {
    if(t<0 || t>=2.2) return;
    const root=envelope(t,.085,.91,2.2), light=this.lightAt(t), motion=reducedMotion?.24:1;
    const p=(x,y,z)=>localPoint(o,x,y,z);
    // source: 光芯は閉じた実形状。post glowから輪郭を作らない。
    const core=[p(-5,0,5),p(5,0,5),p(7,0,16),p(0,0,26),p(-7,0,16)];
    b.polygon(core,copper,root*.66);
    b.polygon([p(-2.9,-.2,7),p(2.9,-.2,7),p(3.8,-.2,16),p(0,-.2,22),p(-3.8,-.2,16)],ivory,light*.88,{light:true});
    // medium: 主軸に連続する搬送幹。短い光条・粒子の一式にはしない。
    const trunk=[];
    const n=detail<.5?10:20;
    for(let i=0;i<=n;i++) { const u=i/n;trunk.push(p(1.6*Math.sin(u*Math.PI),2*u,21+73*u)); }
    b.ribbon(trunk,trunk.map((_,i)=>mix(4.4,.7,i/n)),gold,trunk.map((_,i)=>root*.34*smooth(.06,.50,t-i/n*.18)),{light:true});
    // 4枚は機能の異なる圧縮段。上段ほど遅れ・幅・深度が異なる。
    for(let k=0;k<4;k++) {
      const on=.055+k*.092, f=envelope(t-on,.19,.72-k*.035,2.2-on);
      if(f<=0) continue;
      const progress=smooth(on,on+.5,t), w=32-k*5.0;
      const z=32+k*18-(1-progress)*8*motion;
      const tilt=2.4+k*.7, y=1+k*2.8;
      const contour=[p(-w,y,z-tilt),p(-w*.71,y,z+4),p(0,y,z+8.5),p(w*.71,y,z+4),p(w,y,z-tilt)];
      const base=contour.map(a=>[a[0],a[1]+2.4,a[2]-4]);
      for(let j=0;j<contour.length-1;j++) {
        b.tri([contour[j],base[j],contour[j+1]],amber,f*.13);
        b.tri([base[j],base[j+1],contour[j+1]],copper,f*.17);
      }
      b.ribbon(contour,[.6,2.3,3.0,2.3,.6],k%2?gold:amber,f*(.33+.15*light),{light:true});
      // 対向する内縁は外縁より細く、同じblurの重複を避ける。
      b.ribbon(base,[.3,.8,1.15,.8,.3],gold,f*.14,{light:true});
    }
    // 終端は源を閉じて減衰。回復量や継続buffのゲージを描かない。
    b.disc(p(0,0,13),8.5,12,gold,light*.09,{light:true});
  },
  synthesize(sampleRate,seed) {
    const data=new Float32Array(Math.ceil(sampleRate*2.2));
    const phase=(seed%997)/997*.09;
    for(let i=0;i<data.length;i++) {
      const t=i/sampleRate;
      const gate=(1-Math.exp(-t/0.009))*Math.exp(-t/0.34)*(1-smooth(1.30,1.55,t));
      const body=Math.sin(2*Math.PI*(172*t+74*.16*(1-Math.exp(-t/.16)))+phase);
      const shoulder=.23*Math.sin(2*Math.PI*(344*t+28*t*t))*Math.exp(-t/.19);
      const u=t-.17;
      const latch=u>0 ? (1-Math.exp(-u/.004))*Math.exp(-u/.125)*(.18*Math.sin(2*Math.PI*1046.5*u)+.10*Math.sin(2*Math.PI*1568.8*u)) : 0;
      const air=.04*Math.sin(2*Math.PI*2291*t)*Math.sin(2*Math.PI*311*t)*Math.exp(-t/.06);
      data[i]=.64*(gate*(body*.61+shoulder+air)+latch);
    }
    return data;
  }
});
