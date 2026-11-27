// A single finite onset: thin moving water and two soft surface resonances.
// Interpolation by real seconds keeps the physical timing unchanged at
// different hardware sample rates; no continuous bubbling during the field.
export function fillSfx(rate) {
 if(!Number.isFinite(rate)||rate<8000||rate>192000)throw RangeError('audio rate');
 const data=new Float32Array(Math.round(rate*.72));let peak=0;
 const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t)};
 for(let i=0;i<data.length;i++){
  const t=i/rate;
  const rush=smooth(t/.095)*(1-smooth((t-.14)/.50));
  const edge=smooth((t-.19)/.12)*(1-smooth((t-.34)/.30));
  const surface=Math.sin(2*Math.PI*(547*t-215*t*t)+1.14*Math.sin(2*Math.PI*97*t));
  const backing=Math.sin(2*Math.PI*(302*t-142*t*t))*.68+Math.sin(2*Math.PI*(445*t-179*t*t))*.32;
  const granular=.48*Math.sin(2*Math.PI*697*t+1.3*Math.sin(2*Math.PI*181*t))+
    .52*Math.sin(2*Math.PI*1139*t+.7*Math.sin(2*Math.PI*263*t));
  data[i]=(rush||edge) ? .048*granular*rush+.029*surface*edge+.027*backing*edge : 0;
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
