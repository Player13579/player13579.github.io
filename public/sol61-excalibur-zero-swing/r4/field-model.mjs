// Authored finite fantasy radiance sheet; no world temperature/mass/collision inference.
// Constants feed actual WGSL and CPU probes. Probe output is not GPU/native evidence.
export const FIELD=Object.freeze({front:.58,bow:.50,ridgeWidth:.095,bodyPower:8,ridgePower:38,channelPower:13,channelSpread:38});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function packetField(along,across){
 const side=1-smooth(.78,1.02,Math.abs(across));
 const lead=FIELD.front-FIELD.bow*across*across;
 const behind=lead-along;
 const tail=smooth(-1.0,-.62,along);
 const body=side*tail*smooth(-.08,.12,behind);
 const ridge=Math.exp(-Math.pow((along-lead)/FIELD.ridgeWidth,2))*side*tail*(1-smooth(.90,1.02,along));
 // Two transport lobes converge into one bowed front; the negative space is transport geometry, not engraved motifs.
 const offset=.10+.28*Math.max(0,Math.min(1,behind));
 const channels=(Math.exp(-Math.pow(across-offset,2)*FIELD.channelSpread)+Math.exp(-Math.pow(across+offset,2)*FIELD.channelSpread))*body;
 const depth=body*(.23+.77*Math.sqrt(Math.max(0,1-across*across)));
 const rgb=[1,.51,.14].map((x,i)=>x*depth*FIELD.bodyPower+[1,.98,.91][i]*ridge*FIELD.ridgePower+[1,.88,.58][i]*channels*FIELD.channelPower);
 return {rgb,coverage:Math.max(body,ridge*.90),body,ridge,channels,depth};
}
export const FIELD_WGSL=String.raw`
fn packetField(along:f32,across:f32)->vec4f{
 let side=1.0-smoothstep(0.78,1.02,abs(across));
 let lead=${FIELD.front}- ${FIELD.bow}*across*across;let behind=lead-along;
 let tail=smoothstep(-1.0,-0.62,along);let body=side*tail*smoothstep(-0.08,0.12,behind);
 let ridge=exp(-pow((along-lead)/${FIELD.ridgeWidth},2.0))*side*tail*(1.0-smoothstep(0.90,1.02,along));
 let offset=0.10+0.28*clamp(behind,0.0,1.0);
 let channels=(exp(-pow(across-offset,2.0)*${FIELD.channelSpread}.0)+exp(-pow(across+offset,2.0)*${FIELD.channelSpread}.0))*body;
 let depth=body*(0.23+0.77*sqrt(max(0.0,1.0-across*across)));
 let light=vec3f(1.0,0.51,0.14)*depth*${FIELD.bodyPower}.0+vec3f(1.0,0.98,0.91)*ridge*${FIELD.ridgePower}.0+vec3f(1.0,0.88,0.58)*channels*${FIELD.channelPower}.0;
 return vec4f(light,max(body,ridge*0.90));
}
`;
export function crossedPSF(dx,dy,L){const sigma=Math.max(.65,L*.011),lx=Math.max(4,L*.38),ly=Math.max(4,L*.27);const finite=1-smooth(3.5,4,Math.max(Math.abs(dx)/lx,Math.abs(dy)/ly));return .18*(.6*Math.exp(-Math.abs(dx)/lx-(dy/sigma)**2)/(2*lx*sigma*Math.sqrt(Math.PI))+.4*Math.exp(-Math.abs(dy)/ly-(dx/sigma)**2)/(2*ly*sigma*Math.sqrt(Math.PI)))*finite;}
export function ghostKernel(dx,dy,L,offaxis=0){const R=Math.max(3,L*.08),r=Math.hypot(dx,dy)/R;return .03/(1+offaxis*offaxis*5)*Math.exp(-r*r*2.3)*(1-smooth(.78,1.2,r))/(Math.PI*R*R/2.3);}
