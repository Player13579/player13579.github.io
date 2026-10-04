// GPT-6.1-Sol R5 optical-ray derivative of exact public R4 startup-idle repair.
// Existing card, three coin trajectories, receipt, 2800ms and SFX are retained.
import {POST_WGSL} from "./observer.mjs";
export const VERSION = 'donation-card-zero-sol61-r6-outward-glow';
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
  constructor({verify=false}={}){this.verify=verify;this.context=null;this.nodes=new Set();this.generation=0;this.enabled=false;this.errors=[];this.disposed=false;}
  async activateFromGesture(){
    if(this.verify||this.disposed)return false;const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return false;
    // Construct synchronously while the invoking gallery gesture is live.
    const token=this.generation;this.context??=new Context();try{await this.context.resume();this.enabled=!this.disposed&&token===this.generation&&this.context.state==='running';}catch(e){this.errors.push(e.message);this.enabled=false;}return this.enabled;
  }
  setMuted(muted){if(this.verify||muted){this.enabled=false;this.stop();}return !this.verify&&this.enabled;}
  snapshot(){return {verify:this.verify,enabled:this.enabled,audioGain:this.verify||!this.enabled?0:.12,contexts:this.context?1:0,audioState:this.context?.state??'not-created',nodes:this.nodes.size,errors:[...this.errors]};}
  async play(){
    this.stop();if(this.verify||!this.enabled)return false;
    const token=this.generation;
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return false;
    if(this.context.state!=='running'||token!==this.generation)return false;
    const at=this.context.currentTime+.015;
    for(const c of AUDIO_CUES){const o=this.context.createOscillator(),g=this.context.createGain();o.type=c.type;
      o.frequency.setValueAtTime(c.hz,at+c.ms/1000);o.frequency.exponentialRampToValueAtTime(c.to,at+c.ms/1000+c.duration);
      g.gain.setValueAtTime(0,at+c.ms/1000);g.gain.linearRampToValueAtTime(c.gain,at+c.ms/1000+.006);g.gain.exponentialRampToValueAtTime(.0001,at+c.ms/1000+c.duration);
      o.connect(g);g.connect(this.context.destination);this.nodes.add(o);o.onended=()=>{o.disconnect();g.disconnect();this.nodes.delete(o);};o.start(at+c.ms/1000);o.stop(at+c.ms/1000+c.duration+.01);
    }return true;
  }
  stop(){this.generation++;for(const o of this.nodes){try{o.stop();}catch{}o.disconnect();}this.nodes.clear();}
  async dispose(){this.disposed=true;this.enabled=false;this.stop();await this.context?.close();this.context=null;}
}
export function createGallerySfxHook(sound,restart,isDisposed=()=>false){return Object.freeze({
  activateFromGesture:async()=>{const enabled=await sound.activateFromGesture();if(enabled&&!isDisposed())restart();return {enabled:enabled&&!isDisposed(),settled:!isDisposed()};},
  setMuted:muted=>sound.setMuted(muted),snapshot:()=>sound.snapshot()
});}
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
// Compact incoherent light sources; cross arms are generated only by the observer PSF.
fn compactSource(q:vec2f)->f32 { return exp(-dot(q,q)/(.70*.70)); }
struct WorldOutput { @location(0) material:vec4f, @location(1) opticalSource:vec4f }
@fragment fn fs(v:Vertex)->WorldOutput {
  let t=p.ms;
  if(t<0.||t>=2800.||p.source<.5){return WorldOutput(vec4f(0),vec4f(0));}
  // All geometry is in the same logical pixel basis; no background-dependent change.
  let screen=v.position.xy/p.viewport*vec2f(320,160);
  let travel=p.recipientPoint-p.origin;let axis=normalize(travel);let ortho=vec2f(-axis.y,axis.x);
  let relative=screen-p.origin;let q=vec2f(dot(relative,axis),dot(relative,ortho))+vec2f(82,82);
  let fade=ease(t/110.)*(1.-ease((t-2490.)/310.));
  var color=vec3f(0);var opacity=0.;var optical=vec4f(0); // RGB qualified radiance, A compact white-gold source radiance for PSF; not opacity
  // Card approaches contact reader, holds during reading, then withdraws.
  let present=ease(t/600.);let withdraw=ease((t-970.)/370.);
  let cc=vec2f(66.+25.*present-11.*withdraw,78.-9.*withdraw);
  let rawCard=q-cc;
  let cp=vec2f(rawCard.x+.17*rawCard.y,rawCard.y/.88);
  let card=box(cp,vec2f(20.2,12.5),2.8);
  let cardMask=coverage(card)*(1.-withdraw);
  let scan=ease((t-600.)/260.);
  let stripe=coverage(box(cp-vec2f(0,-6),vec2f(18,1.25),.2));
  let chip=coverage(box(cp-vec2f(-10,1),vec2f(3.8,3.2),.7));
  // Reader has a coherent inclined face, dark side thickness and a recessed read bed.
  let readerRaw=q-vec2f(116,84);
  let readerCoord=vec2f(readerRaw.x+.16*readerRaw.y,readerRaw.y);
  let terminal=box(readerCoord,vec2f(14,20),3.);
  let tm=coverage(terminal);
  let readerSide=coverage(box(readerCoord-vec2f(2.6,3.1),vec2f(14,20),3.));
  color+=readerSide*vec3f(.025,.07,.10);
  let readerFace=mix(vec3f(.035,.13,.17),vec3f(.10,.34,.40),clamp(.6-.022*readerCoord.y,0.,1.));
  color=mix(color,readerFace,tm);
  color+=edge(terminal,.75)*vec3f(.09,.48,.67);
  let readBed=coverage(box(readerCoord-vec2f(0,-8),vec2f(10,6.5),1.5));
  color=mix(color,vec3f(.025,.11,.14),readBed*.72);
  let faceFacet=coverage(box(readerCoord-vec2f(-10,-4),vec2f(1.,12.),.8));
  color+=faceFacet*vec3f(.12,.75,.88);
  let slot=line(q,vec2f(104,77),vec2f(128,77));color+=edge(slot,.6)*vec3f(.12,.9,1.2);
  let stripeY=66.+30.*scan;
  let reading=select(0.,1.,t>=600.&&t<900.);
  color+=readBed*edge(q.y-stripeY,.65)*reading*vec3f(.3,2.7,3.2);
  optical+=vec4f(readBed*edge(q.y-stripeY,.65)*reading*vec3f(.3,2.7,3.2),0.);
  opacity=max(opacity,tm*.88);
  // Card's front/side boundary is separate from its receiving read-light response.
  let cardSide=coverage(box(cp-vec2f(1.7,2.6),vec2f(20.2,12.5),2.8))*(1.-withdraw);
  color=mix(color,vec3f(.025,.11,.22),cardSide*.84);
  optical*=1.-cardSide*.84;
  let faceBase=mix(vec3f(.045,.18,.34),vec3f(.18,.58,.78),clamp(.65-.025*cp.y+.008*cp.x,0.,1.));
  color=mix(color,faceBase,cardMask*.93);
  optical*=1.-cardMask*.93;
  let edgeField=edge(card,.8);
  let sweepRadiance=reading*exp(-pow((q.y-stripeY)/2.8,2.));
  let chipGroove=edge(line(cp,vec2f(-10,-2),vec2f(-10,4)),.25);
  color+=cardMask*(edgeField*vec3f(.20,1.30,1.85)+stripe*vec3f(.07,.26,.4)+chip*(vec3f(1.1,.63,.14)+vec3f(.9,.70,.22)*clamp(.5-.13*cp.y,0.,1.)));
  color+=cardMask*sweepRadiance*vec3f(.15,1.55,2.35);
  optical+=vec4f(cardMask*sweepRadiance*vec3f(.15,1.55,2.35),0.);
  color-=cardMask*chip*chipGroove*vec3f(.13,.07,.02);
  // Broad source-bound surface glint shifts with card incidence, not with background.
  let cardGlint=exp(-pow((cp.x+.45*cp.y-7.+9.*present)/3.8,2.))*cardMask;
  color+=cardGlint*vec3f(.14,.36,.52);
  opacity=max(opacity,max(cardMask*.93,cardSide*.84));
  let settled=ease((t-900.)/80.);
  // A check emerges only on the completed reading, before any gold moves.
  let tick=min(line(q,vec2f(110,90),vec2f(114,94)),line(q,vec2f(114,94),vec2f(122,85)));
  color+=edge(tick,.8)*settled*vec3f(.17,2.4,1.3);
  optical+=vec4f(edge(tick,.8)*settled*pulse(t,900.,150.)*vec3f(.17,2.4,1.3),0.);
  // Receiving intake has its own face and side; no new gameplay character or machinery.
  let receiverX=82.+length(travel);
  let bracket=min(min(line(q,vec2f(receiverX-11.,66),vec2f(receiverX+11.,66)),line(q,vec2f(receiverX+11.,66),vec2f(receiverX+11.,101))),line(q,vec2f(receiverX+11.,101),vec2f(receiverX-11.,101)));
  color+=edge(bracket,.8)*settled*vec3f(.18,.75,.92);
  let receiverFace=coverage(box(q-vec2f(receiverX+1.,89),vec2f(11.,12.),2.))*settled;
  color+=receiverFace*vec3f(.035,.09,.12);
  let intakeLip=coverage(box(q-vec2f(receiverX,99),vec2f(11.,2.),.8))*settled;
  color+=intakeLip*vec3f(.12,.32,.4);
  opacity=max(opacity,receiverFace*.76);
  var arrivals=0.;
  for(var i:u32=0u;i<3u;i++) {
    let start=1050.+f32(i)*250.;let u=(t-start)/760.;let progress=ease(u);
    let cx=mix(132.,receiverX,progress);let cy=82.-20.*sin(3.14159265*clamp(u,0.,1.));
    let arrival=start+760.;let moving=select(0.,1.,u>=0.&&u<1.);
    let coin=q-vec2f(cx,cy);let width=7.*(.36+.64*abs(cos(u*6.2831853)));
    let ellipse=length(coin/vec2f(width,7.))-1.;
    // A 90ms face reveal belongs to coin departure, not decorative pixel noise.
    let reveal=coverage(coin.x-(min(width,7.)*(2.*ease((t-start)/90.)-1.)));
    let disk=coverage(ellipse*min(width,7.))*moving*reveal;
    let inner=edge((length(coin/vec2f(max(1.,width-1.6),5.4))-1.)*min(width,5.4),.5)*moving;
    let coinPlane=coin/vec2f(width,7.);
    let frontNormal=normalize(vec3f(coinPlane.x*.72,coinPlane.y*.72,sqrt(max(.02,1.-dot(coinPlane,coinPlane)*.65))));
    let boundReaderLight=normalize(vec3f(116.-cx,68.-cy,32.));
    let halfVector=normalize(boundReaderLight+vec3f(0.,0.,1.));
    let incidence=max(0.,dot(frontNormal,boundReaderLight));
    let specular=pow(max(0.,dot(frontNormal,halfVector)),18.);
    let gold=mix(vec3f(.75,.24,.018),vec3f(2.3,1.22,.15),clamp(.4-.052*coin.y+incidence*.44,0.,1.));
    let thickness=1.3+1.2*abs(sin(u*6.2831853));
    let coinSide=coverage((length((coin-vec2f(1.1,thickness))/vec2f(width,7.))-1.)*min(width,7.))*moving*reveal;
    color=mix(color,vec3f(.39,.14,.014),coinSide);
    optical*=1.-coinSide;
    color=mix(color,gold+specular*vec3f(2.3,1.75,.6),disk);
    optical=mix(optical,vec4f(specular*vec3f(2.3,1.75,.6),0.),disk);
    color+=inner*reveal*vec3f(.70,.30,.025);
    // The projected bevel responds at the rim; the whole disk is not uniformly haloed.
    let rim=edge(ellipse*min(width,7.),.65)*moving*reveal;
    color+=rim*vec3f(1.05,.65,.13)*(.4+.6*incidence);opacity=max(opacity,max(disk,coinSide));
    optical+=vec4f(rim*vec3f(1.05,.65,.13)*(.4+.6*incidence),0.);
    // Gold now emits from its face and bevel, independently of reader reflection.
    // The gold hue, thickness and projected inner face remain the main material.
    let emissionEnvelope=ease(u/.10)*(1.-ease((u-.87)/.13));
    let coinEmission=disk*vec3f(.95,.48,.065)*(.55+.45*frontNormal.z)*emissionEnvelope
      +rim*vec3f(1.25,.75,.17)*emissionEnvelope;
    color+=coinEmission;
    optical+=vec4f(coinEmission,0.);
    // Three optical sites travel with each projected face. Their local source
    // gates obey the 90ms authored reveal and the exact moving-coin lifetime.
    for(var siteIndex:u32=0u;siteIndex<3u;siteIndex++) {
      let sites=array<vec2f,3>(vec2f(-.34,-.42),vec2f(.38,.12),vec2f(-.10,.43));
      let site=sites[siteIndex]*vec2f(width,7.);
      let siteReveal=coverage(site.x-(min(width,7.)*(2.*ease((t-start)/90.)-1.)));
      // A site's radiance follows the declared emissive coin and its projected normal.
      // No independent decorative beat changes the optical source energy.
      let siteNormalZ=sqrt(max(.02,1.-dot(sites[siteIndex],sites[siteIndex])*.65));
      let siteEnergy=(.55+.45*siteNormalZ)*moving*siteReveal*emissionEnvelope;
      let siteLocal=coin-site;
      // Compact source footprint foreshortens with the same rotating coin face.
      let sourceProfile=compactSource(siteLocal/vec2f(width/7.,1.))*siteEnergy;
      let sourceRadiance=sourceProfile*vec3f(42.,32.,12.);
      // 82% direct compact core, 18% redistributed by the normalized observer PSF.
      color+=sourceRadiance*.82;
      optical+=vec4f(sourceRadiance,sourceProfile);
    }
    // Real local receiver surface response follows the approaching coin location.
    let distanceToIntake=length(vec2f(receiverX,88)-vec2f(cx,cy));
    let receivingLight=moving/(1.+distanceToIntake*distanceToIntake/130.);
    color+=receiverFace*receivingLight*vec3f(.7,.36,.04)*(.3+.7*clamp((q.y-77.)/24.,0.,1.));
    // Arrival has a compact source at the actual intake. The observer supplies the rays.
    let light=pulse(t,arrival,125.);arrivals+=light;
    let local=q-vec2f(receiverX,82);
    let arrivalSource=compactSource(local)*light;
    let arrivalRadiance=arrivalSource*vec3f(42.,32.,12.);
    color+=arrivalRadiance*.82;
    optical+=vec4f(arrivalRadiance,arrivalSource);
    // Observer response is recorded in the distinct source-fed postpass.
  }
  // Three receiving cells fill once each coin has reached the endpoint.
  for(var i:u32=0u;i<3u;i++) {
    let received=ease((t-(1810.+f32(i)*250.))/85.);
    let cell=box(q-vec2f(receiverX-6.+f32(i)*6.,96),vec2f(1.8,2.5),.4);
    color+=coverage(cell)*received*vec3f(2.1,1.15,.13);
  }
  let localSource=q-vec2f(116,77);let success=pulse(t,900.,150.);
  // Success observation is fed by the actual gated tick source below.
  return WorldOutput(vec4f(color*fade,opacity*fade),optical*fade);
}`;
export const PRESENT_WGSL = POST_WGSL;
