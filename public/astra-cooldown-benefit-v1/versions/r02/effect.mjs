// Original Astra creation. Coordinates: recipient ground origin; +x right, +y up; H = alpha-visible body height.
export const VERSION = 'astra-cooldown-benefit-r0.2';
export const LIFE_MS = 1480;
export class CooldownEvents {
  constructor({sound=()=>{}}={}){this.seen=new Set();this.active=[];this.sound=sound;}
  receive(e,now){
    if(!e||e.type!=='gain-cooldownReduction'||!e.id||!e.playerId||![e.x,e.y,e.at,now].every(Number.isFinite))return false;
    if(this.seen.has(e.id)||now<e.at||now-e.at>=LIFE_MS)return false;
    if(e.benefitOutcomeV1){const o=e.benefitOutcomeV1;if(o.recipientId!==e.playerId||o.result!=='changed'||!(o.actualDelta>0))return false;}
    this.seen.add(e.id);this.active.push({...e});
    // Old receipts may be replayed visually in-phase, but never sound as new transactions.
    if(now-e.at<180)this.sound(e.id);return true;
  }
  sample(now,resolve){this.active=this.active.filter(e=>now>=e.at&&now-e.at<LIFE_MS);return this.active.map(e=>{
    const p=resolve?.(e.playerId); return {...e,x:p&&Number.isFinite(p.x)?p.x:e.x,y:p&&Number.isFinite(p.y)?p.y:e.y,phase:(now-e.at)/LIFE_MS};
  });}
  resetSession(){this.seen.clear();this.active=[];}
}
// Three original timbres: inward glass coil, short warm release, clean high resonance.
// Deterministic PCM avoids oscillator scheduling differences and is reproducible offline.
export function synthesizeSfx(sampleRate=48000){
  const duration=1.22,data=new Float32Array(Math.round(sampleRate*duration));
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate;let a=0;
    if(t<.75){const env=Math.sin(Math.PI*t/.75)**1.35;const phase=2*Math.PI*(540*t-185*t*t);a+=.14*env*(Math.sin(phase)+.18*Math.sin(phase*2.003));}
    if(t>=.71){const u=t-.71,env=(1-Math.exp(-u*150))*Math.exp(-u*9);a+=.24*env*(Math.sin(2*Math.PI*864*u)+.30*Math.sin(2*Math.PI*1296*u)+.14*Math.sin(2*Math.PI*1728*u));}
    if(t>=.73){const u=t-.73;a+=.1*Math.exp(-u*27)*Math.sin(2*Math.PI*(180*u-95*u*u));}
    data[i]=a*Math.min(1,(duration-t)/.035);
  }return data;
}
export class CooldownSound {
  constructor({verify=false}={}){this.verify=verify;this.seen=new Set();this.triggers=0;this.played=0;this.enabled=false;}
  async enable(){if(this.verify)return false;this.context??=new AudioContext();await this.context.resume();this.enabled=true;return true;}
  trigger(id){if(this.seen.has(id))return false;this.seen.add(id);this.triggers++;if(this.verify||!this.enabled)return false;
    const c=this.context,a=synthesizeSfx(c.sampleRate),b=c.createBuffer(1,a.length,c.sampleRate);b.copyToChannel(a,0);const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.value=.7;s.connect(g).connect(c.destination);s.start();s.onended=()=>{s.disconnect();g.disconnect()};this.played++;return true;
  }
  async dispose(){await this.context?.close();}
}
export const shader = /* wgsl */`
struct U { screen:vec4f, body:vec4f, state:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct V { @builtin(position) p:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {var v:V;let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));v.p=vec4f(p[i],0,1);return v;}
fn gate(t:f32,a:f32,b:f32)->f32{return smoothstep(a,a+.08,t)*(1-smoothstep(b-.16,b,t));}
fn paint(base:vec3f,c:vec3f,a:f32)->vec3f{return mix(base,c,clamp(a,0,1));}
fn aa(d:f32,w:f32)->f32{return 1-smoothstep(w,w+1.1/u.body.z,abs(d));}
// Three folded time leaves: a broad crescent-shaped transverse surface, never a closed ring.
fn lamina(p:vec2f,t:f32,index:f32,front:bool)->vec4f{
 let delay=index*.036;let v=clamp((t-delay)/.57,0,1);let travel=pow(v,1.85);
 let converge=select(travel,.18,u.state.y>.5);
 let cx=sin(index*2.1+converge*2.6)*(.09-converge*.055);
 let cy=mix(.12+index*.35,.48,converge);
 let radius=.58-converge*.37;let q=(p.x-cx)/radius;
 let taper=max(0.,1-q*q);let crest=cy+.19*q*q+.055*q*sin(index*1.7+converge*3.);
 let thickness=.11*pow(taper,.65)+.006;
 let d=p.y-crest;let fill=smoothstep(-thickness-.012,-thickness+.012,d)*(1-smoothstep(.004,.015,d));
 let edge=aa(d,.008)*pow(taper,.35);let inner=aa(d+thickness,.005)*taper;
 let bounds=1-smoothstep(.93,1.,abs(q));let envelope=gate(t,delay,.65)*bounds;
 let depth=q+.27*sin(index*2.1+converge*2.7);let visibility=select(select(1.,0.,depth>0.),select(0.,1.,depth>0.),front);
 let fold=clamp((d+thickness)/max(thickness,.001),0,1);
 let col=mix(vec3f(.035,.19,.32),vec3f(.13,.68,.75),fold*fold);
 let rim=mix(vec3f(.10,.76,.94),vec3f(.77,1.,.86),smoothstep(.6,1.,fold));
 return vec4f(col+rim*edge*.75+vec3f(.15,.32,.39)*inner,(fill*.78+edge*.85+inner*.18)*envelope*visibility);
}
@fragment fn fs(v:V)->@location(0) vec4f {
 let px=v.p.xy/u.screen.z;let p=vec2f(px.x-u.body.x,u.body.y-px.y)/u.body.z;
 let t=u.state.x;let light=u.state.z;let bg=mix(vec3f(.035,.061,.102),vec3f(.77,.81,.79),light);
 let radial=exp(-dot(p-vec2f(0,.45),p-vec2f(0,.45))*.8);var c=bg+vec3f(.008,.014,.02)*radial*(1-light);
 let live=select(0.,1.,t>=0.&&t<1.);let snap=exp(-pow((t-.51)/.075,2.))*live;
 // Floor response remains under the recipient and shares its visible contact plane.
 let ground=exp(-pow(p.x/.54,2.)-pow((p.y-.015)/.08,2.));c+=vec3f(.04,.18,.15)*ground*(.3*gate(t,.05,.88)+snap*.55);
 let shadow=exp(-pow(p.x/.20,2.)-pow(p.y/.025,2.));c*=1-shadow*.25;
 for(var i=0;i<3;i++){let z=lamina(p,t,f32(i),false);c=paint(c,z.rgb,z.a*live*.85);}
 // Original adopted Sophia idle sprite: source x 0..256 / sheet, foot origin (128,240).
 let source=vec2f(128.+p.x*222.,240.-p.y*222.);let uv=source/vec2f(textureDimensions(actor));
 let inside=source.x>=0&&source.x<256&&source.y>=0&&source.y<256;
 let tex=textureSampleLevel(actor,samp,uv,0);let alpha=select(0.,tex.a,inside)*u.state.w;
 let sweep=exp(-pow((p.y-(.08+smoothstep(.36,.80,t)*1.04))/.11,2.))*gate(t,.34,.90);
 let illumination=vec3f(.09,.28,.19)*(snap*.35+sweep*.28);
 c=paint(c,tex.rgb+illumination,alpha);
 for(var i=0;i<3;i++){let z=lamina(p,t,f32(i),true);c=paint(c,z.rgb,z.a*live);}
 // Collapse is released through two rising fins, not a full-screen flash or an icon.
 let release=select(clamp((t-.48)/.48,0,1),.35,u.state.y>.5);let wingGate=gate(t,.46,.99)*live;
 let yy=clamp((p.y-.16)/.95,0,1);let side=.11+sin(yy*3.14159)*(.19+release*.16);
 let d=abs(p.x)-side;let taper=pow(max(0.,sin(yy*3.14159)),.7);let edge=aa(d,.012)*taper;
 let interior=smoothstep(-.08,-.045,d)*(1-smoothstep(-.025,.015,d))*taper;
 let tipMask=smoothstep(.11,.20,p.y)*(1-smoothstep(.93,1.12,p.y));
 let wingColor=mix(vec3f(.05,.38,.50),vec3f(.63,1.,.80),yy);
 c=paint(c,wingColor,interior*wingGate*.7*tipMask);c+=vec3f(.54,.96,.82)*edge*wingGate*.7*tipMask;
 // Thin, finite compression seam with a 110ms warm crest and immediate causal body response.
 let seam=exp(-pow(p.x/.31,6.)-pow((p.y-.47)/.028,2.))*snap;
 c+=vec3f(.90,.96,.71)*seam*.85;
 return vec4f(c,1);
}`;
