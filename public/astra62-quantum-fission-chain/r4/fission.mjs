export const version = 'quantum-fission-chain-astra62-r4';
export const lifetimeMs = 1470;

const variants = Object.freeze({committed:{}, waiting:{endgame:false,committed:false},
  missing:{consumed:false,committed:false}, fusion:{kind:'quantum-nuclear-fusion'},
  transmute:{kind:'quantum-transmutation'}, hidden:{visible:false}, stale:{current:false}});

export function fixtureEvent(mode, id) {
  if (!Object.hasOwn(variants,mode)) return null;
  return {kind:'quantum-nuclear', variant:'uranium', owner:'self', current:true,
    visible:true, permitted:true, endgame:true, consumed:true, committed:true, id,
    ...variants[mode]};
}

// The viewer gets a synthetic local presentation only. No world target is projected.
export function makeGate() {
  let newest = 0;
  return event => {
    if (!event || event.owner!=='self' || event.current!==true || event.visible!==true ||
        event.permitted!==true || event.kind!=='quantum-nuclear' ||
        event.endgame!==true || event.consumed!==true || event.committed!==true ||
        !['uranium','plutonium'].includes(event.variant)) return null;
    const id = event.id;
    if (!Number.isSafeInteger(id) || id<=newest) return null;
    newest = id;
    return {id};
  };
}

export function makeCue(rate) {
  if (!Number.isFinite(rate) || rate<8000 || rate>192000) throw new RangeError('sample rate');
  const pcm = new Float32Array(Math.ceil(rate*1.19));
  const tau=2*Math.PI;
  let seed=840196, smooth=0;
  const lowPass=1-Math.exp(-tau*1700/rate);
  function fracture(t, pitch, noise) {
    if (t<0 || t>.40) return 0;
    const edge=(1-Math.exp(-t*2600))*(1-Math.exp(-(.40-t)*60));
    const tap=noise*Math.exp(-t*102)*.17;
    const modes=.072*Math.exp(-t*19)*Math.sin(tau*pitch*t)+
      .046*Math.exp(-t*25)*Math.sin(tau*pitch*2.71*t)+
      .024*Math.exp(-t*36)*Math.sin(tau*pitch*3.95*t);
    return edge*(tap+modes);
  }
  for (let i=0;i<pcm.length;i++) {
    const t=i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    smooth+=lowPass*(noise-smooth);
    const grain=noise-smooth;
    // Stress under load, followed by three brittle releases with shorter resonators.
    const u=(t-.10)/.19;
    const strain=u>0&&u<1 ? .023*Math.sin(Math.PI*u)**2*smooth : 0;
    pcm[i]=strain+fracture(t-.29,440,grain)+.77*fracture(t-.59,612,grain)+
      .66*fracture(t-.67,710,grain);
  }
  return pcm;
}
