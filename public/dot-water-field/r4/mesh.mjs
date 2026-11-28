import {stateAt} from './plan.mjs';
const N=64, rings=[0,.075,.145,.215,.285,.350,.417,.488,.558,.629,.700,.769,.837,.899,.951,1],TAU=Math.PI*2;
const limit=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const h=limit((x-a)/(b-a));return h*h*(3-2*h)};
const g=(x,w)=>Math.exp(-((x/w)**2));
const mix=(a,b,t)=>a+(b-a)*t;
// R3's exact continuous shoreline envelope. R4 changes sampling density
// and the material only, never the geometric law or canonical field bounds.
const nodes=rings.flatMap(u=>Array.from({length:N},(_,k)=>{
 const a=k*TAU/N,c=Math.cos(a),n=Math.sin(a),bound=.83+.067*Math.cos(3*a+.62)+.036*Math.cos(5*a+1.02);
 const x=bound*u*c,y=bound*u*n*.77;
 const shade=limit(1.16-Math.hypot((x-.105)*1.49,(y+.082)*1.45));
 const edge=limit((1-u)/.062);
 return [.942*x+.334*y,-.334*x+.942*y,x,y,shade,edge,c,n,u];
}));
const triangles=[];
const idx=(j,k)=>j*N+k%N;
for(let i=0;i<N;i++){
 triangles.push(0,idx(1,i),idx(1,i+1));
 for(let j=1;j<rings.length-1;j++){
  const a=idx(j,i),b=idx(j+1,i),c=idx(j+1,i+1),d=idx(j,i+1);
  triangles.push(a,b,c,a,c,d);
 }
}
const loci=[
 [-.420,-.09,.44,.066,.89,.34],
 [-.242,.075,.48,.047,.92,.16],
 [-.061,-.166,.385,.046,1.00,.09],
 [ .135,.196,.43,.053,.96,.06],
 [ .338,-.105,.37,.055,.77,-.13],
 [ .465,.138,.34,.038,.68,-.14]
];
const colorDeep=[.016,.104,.143],colorBank=[.093,.332,.365],colorShadow=[.023,.126,.145];
const sky=[.397,.944,1.04],clear=[.656,1.04,.946];
function optics(data,settled,transient,reduced){
 const [,,x,y,shade,edge,c,n,u]=data;
 const move=reduced?0:(1-settled);
 let luminous=0,shadow=0,secondary=0;
 for(const [band,middle,len,width,weight,bow] of loci){
   const xc=x-middle+move*(band*.25+.088);
   // Short overlapping optical ribbons cut by smooth reflections of the
   // same plane; no geometry rises above or splits the wetted area.
   const xSupport=1-smooth(.55,1,Math.abs(xc/len));
   const mod=.60+.40*Math.cos(xc*9.1+band*4.0)**2;
   const d=y-band-(.146*x+bow*xc*xc)-move*.064*Math.sin(x*4.3+band*5.);
   const peak=weight*xSupport*mod;
   luminous+=g(d,width)*peak;
   shadow+=g(d+.048,width*1.22)*peak;
   secondary+=g(d+.034,width*.73)*peak*(.22+transient*.38);
 }
 const margin=g(u-.932,.054)*limit(.22+.28*c-.28*n);
 const spec=limit(luminous*.61+secondary*.19+margin*.12);
 const basin=limit(.76*shade+.31*shadow);
 const level=limit(1.12-basin);
 const out=[];
 for(let k=0;k<3;k++){
   const coat=mix(colorDeep[k],colorBank[k],level);
   const transmitted=mix(coat,colorShadow[k],limit(shadow*.64)*(1-spec*.77));
   const reflected=mix(sky[k],clear[k],limit(spec*.53+transient*.26));
   out.push(mix(transmitted,reflected,limit(spec+.12*secondary+transient*.10*luminous)));
 }
 const rim=margin*.045;
 const coverage=edge*limit(.35+.29*shade+.28*spec+rim);
 // Low localized optical response. Material reflection itself survives OBS OFF.
 const observer=edge*(.042+.25*spec+.15*transient*limit(luminous));
 return [...out,coverage,observer];
}
const calm=nodes.map(n=>optics(n,1,0,true));
export const VERTEX_COUNT=triangles.length;
export function buildWaterSheet(f,t,opt={}){
 const q=stateAt(f,t,opt);
 if(!q.opacity||!Number.isFinite(f?.radius)||f.radius<40)return new Float32Array();
 const stable=opt.reduced||q.settled===1&&q.caustic===0;
 const materials=stable?calm:nodes.map(n=>optics(n,q.settled,q.caustic,false));
 const out=new Float32Array(VERTEX_COUNT*8);let off=0;
 for(const i of triangles){
  const d=nodes[i],v=materials[i];
  out[off++]=d[0]*f.radius;
  out[off++]=d[1]*f.radius;
  out[off++]=v[0];out[off++]=v[1];out[off++]=v[2];out[off++]=v[3]*q.opacity;out[off++]=v[4]*q.opacity;out[off++]=0;
 }
 return out;
}
