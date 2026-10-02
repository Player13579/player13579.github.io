// Authored from zero by GPT-6.1-Sol. No old Donation creative input.
export const VERSION = 'donation-card-zero-sol61-r1';
export const DURATION_MS = 2800;
export const SETTLEMENT_MS = 900;
export const COIN_STARTS = Object.freeze([1050, 1300, 1550]);
export const COIN_TRAVEL_MS = 760;
export const COIN_RADIUS = 7;
export function smooth(x) { const a=Math.max(0,Math.min(1,x)); return a*a*(3-2*a); }
export function coinState(index, ms) {
  const u=(ms-COIN_STARTS[index])/COIN_TRAVEL_MS;
  return { visible:u>=0&&u<1, u, x:132+110*smooth(u), y:82-20*Math.sin(Math.PI*Math.max(0,Math.min(1,u))),
    width:COIN_RADIUS*(.36+.64*Math.abs(Math.cos(u*Math.PI*2))), arrivalMs:COIN_STARTS[index]+COIN_TRAVEL_MS };
}
export function phase(ms) { return ms<0||ms>=DURATION_MS?'idle':ms<600?'present-card':ms<SETTLEMENT_MS?'read-card':ms<1050?'settled':ms<2310?'transfer-gold':'receipt-close'; }
// Amount and recipient are facts supplied by a caller, never inferred from luck delta.
export function validateReceipt(r) {
  return !!(r && r.kind==='donation-settled' && r.success===true && typeof r.id==='string' && !!r.id.trim()
    && Number.isFinite(r.amount) && r.amount>0 && typeof r.recipientId==='string' && !!r.recipientId.trim()
    && r.source && r.recipient && ['x','y'].every(k=>Number.isFinite(r.source[k])&&Number.isFinite(r.recipient[k]))
    && Math.hypot(r.recipient.x-r.source.x,r.recipient.y-r.source.y)>1 && Number.isFinite(r.settledAt));
}
export class ReceiptGate {
  constructor(){this.ids=new Set();}
  accept(r){if(!validateReceipt(r)||this.ids.has(r.id))return null; this.ids.add(r.id); return Object.freeze({...r,source:Object.freeze({...r.source}),recipient:Object.freeze({...r.recipient})});}
}
export const AUDIO_CUES = Object.freeze([
  {ms:130,hz:210,to:170,duration:.10,gain:.09,type:'triangle',role:'card-present'},
  {ms:640,hz:870,to:920,duration:.07,gain:.08,type:'sine',role:'reader'},
  {ms:900,hz:1175,to:1568,duration:.16,gain:.12,type:'sine',role:'settlement-success'},
  ...COIN_STARTS.map((ms,i)=>({ms,hz:760+i*110,to:1120+i*90,duration:.12,gain:.08,type:'triangle',role:'coin-departure'})),
  ...COIN_STARTS.map((ms,i)=>({ms:ms+COIN_TRAVEL_MS,hz:1890+i*160,to:1400+i*90,duration:.17,gain:.075,type:'sine',role:'coin-arrival'}))
]);
export class DonationSound {
  constructor({verify=false}={}){this.verify=verify;this.context=null;this.nodes=new Set();this.generation=0;}
  async play(){
    this.stop();if(this.verify)return false;
    const token=this.generation;
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return false;
    this.context??=new Context();await this.context.resume();if(token!==this.generation)return false;
    const at=this.context.currentTime+.015;
    for(const c of AUDIO_CUES){const o=this.context.createOscillator(),g=this.context.createGain();o.type=c.type;
      o.frequency.setValueAtTime(c.hz,at+c.ms/1000);o.frequency.exponentialRampToValueAtTime(c.to,at+c.ms/1000+c.duration);
      g.gain.setValueAtTime(0,at+c.ms/1000);g.gain.linearRampToValueAtTime(c.gain,at+c.ms/1000+.006);g.gain.exponentialRampToValueAtTime(.0001,at+c.ms/1000+c.duration);
      o.connect(g);g.connect(this.context.destination);this.nodes.add(o);o.onended=()=>{o.disconnect();g.disconnect();this.nodes.delete(o);};o.start(at+c.ms/1000);o.stop(at+c.ms/1000+c.duration+.01);
    }return true;
  }
  stop(){this.generation++;for(const o of this.nodes){try{o.stop();}catch{}o.disconnect();}this.nodes.clear();}
  async dispose(){this.stop();await this.context?.close();this.context=null;}
}
export const WORLD_WGSL = /* wgsl */`
struct Params { viewport:vec2f, ms:f32, source:f32, obs:f32, pad:f32, origin:vec2f, recipientPoint:vec2f, spare:vec2f }
@group(0) @binding(0) var<uniform> p:Params;
struct Vertex { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->Vertex {
  let points=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var v:Vertex;v.position=vec4f(points[i],0,1);return v;
}
fn box(q:vec2f,b:vec2f,r:f32)->f32 { let d=abs(q)-b+vec2f(r);return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.)-r; }
fn line(q:vec2f,a:vec2f,b:vec2f)->f32 {let v=b-a;return length(q-a-v*clamp(dot(q-a,v)/dot(v,v),0.,1.));}
fn coverage(d:f32)->f32 {return 1.-smoothstep(-.6,.6,d);}
fn edge(d:f32,w:f32)->f32 {return 1.-smoothstep(w,w+.7,abs(d));}
fn ease(v:f32)->f32 {let u=clamp(v,0.,1.);return u*u*(3.-2.*u);}
fn pulse(t:f32,at:f32,width:f32)->f32 {return max(0.,1.-abs(t-at)/width);}
@fragment fn fs(v:Vertex)->@location(0) vec4f {
  let t=p.ms;
  if(t<0.||t>=2800.||p.source<.5){return vec4f(0);}
  // All geometry is in the same logical pixel basis; no background-dependent change.
  let screen=v.position.xy/p.viewport*vec2f(320,160);
  let travel=p.recipientPoint-p.origin;let axis=normalize(travel);let ortho=vec2f(-axis.y,axis.x);
  let relative=screen-p.origin;let q=vec2f(dot(relative,axis),dot(relative,ortho))+vec2f(82,82);
  let fade=ease(t/110.)*(1.-ease((t-2490.)/310.));
  var color=vec3f(0);var opacity=0.;
  // Card approaches contact reader, holds during reading, then withdraws.
  let present=ease(t/600.);let withdraw=ease((t-970.)/370.);
  let cc=vec2f(66.+25.*present-11.*withdraw,78.-9.*withdraw);
  let cp=q-cc;
  let card=box(cp,vec2f(20.2,12.5),2.8);
  let cardMask=coverage(card)*(1.-withdraw);
  let scan=ease((t-600.)/260.);
  let stripe=coverage(box(cp-vec2f(0,-6),vec2f(18,1.25),.2));
  let chip=coverage(box(cp-vec2f(-10,1),vec2f(3.8,3.2),.7));
  color+=cardMask*(vec3f(.045,.19,.32)+vec3f(.07,.42,.6)*(.6+.4*cp.x/20.));
  color+=cardMask*(edge(card,.85)*vec3f(.18,1.4,2.0)+stripe*vec3f(.07,.31,.42)+chip*vec3f(1.9,1.12,.27));
  // Three broad chip divisions only, not micro-text or fake card credentials.
  color+=cardMask*chip*edge(line(cp,vec2f(-10,-2),vec2f(-10,4)),.25)*vec3f(.12,.06,.01);
  opacity=max(opacity,cardMask*.88);
  // Reader body has an intake slot; a travelling read stripe terminates at contact.
  let terminal=box(q-vec2f(116,84),vec2f(14,20),3.);
  let tm=coverage(terminal);
  color+=tm*vec3f(.04,.18,.21)+edge(terminal,.75)*vec3f(.09,.6,.75);
  let slot=line(q,vec2f(104,77),vec2f(128,77));color+=edge(slot,.6)*vec3f(.12,.9,1.2);
  let stripeY=66.+30.*scan;
  let reading=select(0.,1.,t>=600.&&t<900.);
  color+=tm*edge(q.y-stripeY,.65)*reading*vec3f(.3,2.7,3.2);
  opacity=max(opacity,tm*.88);
  let settled=ease((t-900.)/80.);
  // A check emerges only on the completed reading, before any gold moves.
  let tick=min(line(q,vec2f(110,90),vec2f(114,94)),line(q,vec2f(114,94),vec2f(122,85)));
  color+=edge(tick,.8)*settled*vec3f(.17,2.4,1.3);
  // Digital receiving bracket: finite payment intake, not another gameplay character.
  let receiverX=82.+length(travel);
  let bracket=min(min(line(q,vec2f(receiverX-11.,66),vec2f(receiverX+11.,66)),line(q,vec2f(receiverX+11.,66),vec2f(receiverX+11.,101))),line(q,vec2f(receiverX+11.,101),vec2f(receiverX-11.,101)));
  color+=edge(bracket,.8)*settled*vec3f(.18,.75,.92);
  var arrivals=0.;
  for(var i:u32=0u;i<3u;i++) {
    let start=1050.+f32(i)*250.;let u=(t-start)/760.;let progress=ease(u);
    let cx=mix(132.,receiverX,progress);let cy=82.-20.*sin(3.14159265*clamp(u,0.,1.));
    let arrival=start+760.;let moving=select(0.,1.,u>=0.&&u<1.);
    let coin=q-vec2f(cx,cy);let width=7.*(.36+.64*abs(cos(u*6.2831853)));
    let ellipse=length(coin/vec2f(width,7.))-1.;
    let disk=coverage(ellipse*min(width,7.))*moving;
    let inner=edge((length(coin/vec2f(max(1.,width-1.6),5.4))-1.)*min(width,5.4),.5)*moving;
    // Spatial material gradient and broad bevel follow the rotating projected coin.
    let gold=mix(vec3f(.95,.35,.025),vec3f(2.7,1.8,.24),clamp(.5-.06*coin.y+.03*coin.x,0.,1.));
    color+=disk*gold+inner*vec3f(.75,.36,.035);opacity=max(opacity,disk);
    // Fixed 0-degree sparkle angle, bound to coin arrival rather than arbitrary particles.
    let light=pulse(t,arrival,125.);arrivals+=light;
    let local=q-vec2f(receiverX,82);
    let spark=min(line(local,vec2f(-6,0),vec2f(6,0)),line(local,vec2f(0,-4),vec2f(0,4)));
    color+=edge(spark,.55)*light*vec3f(3.0,1.8,.35);
    // OBS: source-bound finite glow + horizontal display streak at successful contact.
    if(p.obs>.5){color+=light*vec3f(1.15,.58,.13)*exp(-dot(local,local)/70.);
      color+=light*vec3f(1.7,.8,.18)*exp(-abs(local.y)*2.2-abs(local.x)/13.);}
  }
  // Three receiving cells fill once each coin has reached the endpoint.
  for(var i:u32=0u;i<3u;i++) {
    let received=ease((t-(1810.+f32(i)*250.))/85.);
    let cell=box(q-vec2f(receiverX-6.+f32(i)*6.,96),vec2f(1.8,2.5),.4);
    color+=coverage(cell)*received*vec3f(2.1,1.15,.13);
  }
  let localSource=q-vec2f(116,77);let success=pulse(t,900.,150.);
  if(p.obs>.5){color+=success*vec3f(.1,1.0,1.1)*exp(-dot(localSource,localSource)/85.);}
  return vec4f(color*fade,opacity*fade);
}`;
export const PRESENT_WGSL = /* wgsl */`
@group(0) @binding(0) var image:texture_2d<f32>;
struct V { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->V {let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var v:V;v.position=vec4f(a[i],0,1);return v;}
@fragment fn fs(v:V)->@location(0) vec4f {let c=textureLoad(image,vec2i(v.position.xy),0);let rgb=1.-exp(-max(c.rgb,vec3f(0)));return vec4f(rgb,max(c.a,max(rgb.r,max(rgb.g,rgb.b))));}
`;
