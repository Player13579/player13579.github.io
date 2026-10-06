// 金色の有限放射密度。物質の板、温度、命中は推論しない。
export const GOLD=Object.freeze({body:[1,.93,.22],core:[1,.99,.85],outer:[1,.85,.10]});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function packetField(along,across){
 const lead=.64-.62*across*across,behind=lead-along;
 const envelope=(1-smooth(.86,1.12,Math.abs(across)))*smooth(-1.04,-.76,along)*(1-smooth(.94,1.12,along));
 const ridge=Math.exp(-(((along-lead)/.068)**2))*envelope;
 // 中央が抜け、上下で厚みが違う粒状放射前線。単純な面充填をしない。
 const cavity=smooth(.10,.32,Math.abs(across)+behind*.12);
 const upper=Math.exp(-(((across-.36)/.20)**2)),lower=.74*Math.exp(-(((across+.42)/.26)**2));
 const body=smooth(-.04,.12,behind)*(1-smooth(.42,.95,behind))*envelope*cavity*(upper+lower);
 const grains=.60+.40*Math.pow(Math.cos(across*19+behind*11),2);
 const rgb=GOLD.body.map((x,i)=>x*body*grains*27+GOLD.core[i]*ridge*65+GOLD.outer[i]*body*8);
 return{rgb,coverage:Math.max(body*.78,ridge*.93),body,ridge,cavity};
}
export const FIELD_WGSL=String.raw`
fn packetField(along:f32,across:f32)->vec4f{
 let lead=0.64-0.62*across*across;let behind=lead-along;
 let envelope=(1.0-smoothstep(0.86,1.12,abs(across)))*smoothstep(-1.04,-0.76,along)*(1.0-smoothstep(0.94,1.12,along));
 let ridge=exp(-pow((along-lead)/0.068,2.0))*envelope;
 let cavity=smoothstep(0.10,0.32,abs(across)+behind*0.12);
 let upper=exp(-pow((across-0.36)/0.20,2.0));let lower=0.74*exp(-pow((across+0.42)/0.26,2.0));
 let body=smoothstep(-0.04,0.12,behind)*(1.0-smoothstep(0.42,0.95,behind))*envelope*cavity*(upper+lower);
 let grains=0.60+0.40*pow(cos(across*19.0+behind*11.0),2.0);
 let light=vec3f(1.0,0.93,0.22)*body*grains*27.0+vec3f(1.0,0.99,0.85)*ridge*65.0+vec3f(1.0,0.85,0.10)*body*8.0;
 return vec4f(light,max(body*0.78,ridge*0.93));
}
`;
