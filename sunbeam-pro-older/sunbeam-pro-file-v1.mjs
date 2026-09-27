/* Sunbeam E: 外部依存なし。入力例=testInput()。座標は毎フレームのホスト投影済みCSS px。
判定950/52・寿命1200 actor ms・姿勢820 character msは不変。ヒールEには触れない。
B基底=連続面+軸方向輸送+動く輪郭+透明域。extensions=trueで spill→B→radiance、falseでBだけ。
0-90ms伸長、90-1000ms供給、1000-1165ms掌から終端へ供給低下、1165-1200ms同じ太い形を消す。
550msは全長供給、1150msは掌側を接続したまま最後の圧縮が終端へ進む。背景色の入力なし。
reducedMotionは伸長と輪郭振動を除き輸送速度12%。粒子なし。1/3パス・原因毎1/3draw。
create({device,format,audio?})。formatはbgra8unorm/rgba8unorm。共有ターゲットは不透明・single sample。
世界を毎フレーム描き直し、Eの後に前景/UIを描く。GPU→CPU/2D転送なし。
frame={id,encoder,colorView,width,height,sampledAtMs}。サイズは実px、idは増加する整数。
sampledAtMsはホストが時刻/掌を採取したperformance.now()。plansはシーン全件、最大64、空なら[]。
receipt=fx.record(frame,inputs.map(plan)) は未認可。driverだけがencoderをfinishし一度submitする。
その後 await fx.driver.submitted(receipt,{frameId,encoder,validation,done}); fx.sfx?.accept(receipt);
validationはdriverのfinish/submitのエラースコープ結果Promise<null|GPUError>、doneは提出後の
queue.onSubmittedWorkDone()。信頼するdriverの通知であり、物理表示完了の証明ではない。
未提出ならfx.driver.abandon(receipt)。破棄したencoderを後から提出しない。
audio={context,destination?,gates,consumedIds,volume?}。contextの作成/解錠はホストが担当。
gates.owner/room/verify/unlock(meta)は全てtrueなら許可。verify=trueは検証音を許可する意味。
consumedIdsはホスト所有のセッションSetで、再生成時も保持。無音URL・ループ・後追い再生なし。
状態変更時はsfx.refreshGates()/stopAll()。通知途絶160msで無音。最大6音、6実秒。
未提出encoderを提出しない状態にしてawait fx.destroy()。所有device/contextは破棄しない。
仕様: https://www.w3.org/TR/webgpu/ https://www.w3.org/TR/webaudio/
*/
export const CONTRACT=Object.freeze({rangeWorld:950,hitWidthWorld:52,lifetimeActorMs:1200,poseCharacterMs:820});
const $0=Symbol(),$1t=new WeakMap();
const $f=(x,a,b)=>Math.max(a,Math.min(b,x));
const $26=(a,b,x)=>{const u=$f((x-a)/(b-a),0,1);
return u*u*(3-2*u);
};
function $1b(v,s){if(!v)throw new TypeError('Sunbeam E: '+s);
}function num(v,s,a=-1e12,b=1e12){$1b(Number.isFinite(v)&&v>=a&&v<=b,s);
return v;
}function $a(v,s){$1b(typeof v==='boolean',s);
return v;
}function str(v,s){$1b(typeof v==='string'&&v.length>0&&v.length<=256,s);
return v;
}function $1m(v){$1b(Array.isArray(v)&&v.length===2,'point');
return v.map(x=>num(x,'coordinate',-1e7,1e7));
}function $w(o){if(o&&typeof o==='object'){Object.values(o).forEach($w);
Object.freeze(o);
}return o;
}function $z(s){let n=2166136261;
for(let i=0;
i<s.length;
i++)n=Math.imul(n^s.charCodeAt(i),16777619);
return(n>>>0)/4294967296*6.283185;
}export function timeProfile(ms,u=0){num(ms,'age');
num(u,'axis fraction',0,1);
return{gain:(.4+.6*$26(0,70,ms))*(1-$26(1165,1200,ms)),supply:1-.62*$26(1000+150*u,1100+85*u,ms)};
}function $i(a,b,w,h){let lo=0,hi=1;
for(let k=0;
k<2;
k++){const d=b[k]-a[k],$18=k?h:w;
if(Math.abs(d)<1e-8){if(a[k]<0||a[k]>$18)return false;
}else{const x=-a[k]/d,y=($18-a[k])/d;
lo=Math.max(lo,Math.min(x,y));
hi=Math.min(hi,Math.max(x,y));
}}return hi>lo;
}export function plan(i){$1b(i&&i.camera&&i.viewport,'input/camera/viewport');
const $s=str(i.eventId,'eventId'),$1f=str(i.ownerId,'ownerId'),$21=str(i.roomId,'roomId');
const age=num(num(i.actorNowMs,'actorNowMs')-num(i.startActorMs,'startActorMs'),'age');
const $1q=num(i.actorRate??1,'actorRate',0,4),$1p=num(i.rangeWorld,'rangeWorld',0,950);
const $e=num(i.characterElapsedMs??0,'characterElapsedMs',0);
const $3=$a(i.alive,'alive'),$2f=$a(i.visible,'visible'),$d=$a(i.cancelled??false,'cancelled');
const two=$a(i.twoPalms,'twoPalms'),$1v=$a(i.reducedMotion??false,'reducedMotion');
const $t=$a(i.extensions??true,'extensions');
const dpr=num(i.viewport.dpr,'dpr',.25,8);
const w=Math.round(num(i.viewport.widthCss,'widthCss',1,32768)*dpr);
const h=Math.round(num(i.viewport.heightCss,'heightCss',1,32768)*dpr);
$1b(w>0&&h>0,'rounded viewport size');
const css=num(i.camera.zoom,'zoom',.01,100)*num(i.camera.cssPxPerWorld??1,'cssPxPerWorld',.01,100);
const $23=css*dpr;
$1b(Array.isArray(i.rays)&&i.rays.length===(two?2:1),'rays/twoPalms');
const $1r=i.rays.map(r=>{$1b(r,'ray');
const a=$1m(r.palmCss),b=$1m(r.endCss),d=$1m(r.directionCss);
const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),dn=Math.hypot(...d);
$1b(dn>1e-8,'direction');
if(len>1e-6)$1b((dx*d[0]+dy*d[1])/(len*dn)>.9999,'direction/endpoint');
const L=len/css,H=Math.min(24,L*.23),E=$1v?L:Math.min(L,22)+(L-Math.min(L,22))*$26(0,90,age);
return{segment:[a[0]*dpr,a[1]*dpr,b[0]*dpr,b[1]*dpr],dir:len>1e-6?[dx/len,dy/len]:d.map(x=>x/dn),shape:[L,H,E,$f(L/.36,200,2400)]};
});
const $8=$1r[0].dir,n=[-$8[1],$8[0]];
let lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];
for(const r of $1r){const pad=($t?2.8:1.1)*r.shape[1]*$23+2;
for(const x of[0,r.shape[2]]){const p=[r.segment[0]+x*r.dir[0]*$23,r.segment[1]+x*r.dir[1]*$23];
[$8,n].forEach((d,k)=>{const q=p[0]*d[0]+p[1]*d[1];
lo[k]=Math.min(lo[k],q-pad);
hi[k]=Math.max(hi[k],q+pad);
});
}}const $h=[lo,[lo[0],hi[1]],hi,[hi[0],lo[1]]].map(p=>[p[0]*$8[0]+p[1]*n[0],p[0]*$8[1]+p[1]*n[1]]);
const $17=$f(Math.floor(Math.min(...$h.map(p=>p[0]))),0,w),top=$f(Math.floor(Math.min(...$h.map(p=>p[1]))),0,h);
const $20=$f(Math.ceil(Math.max(...$h.map(p=>p[0]))),0,w),$b=$f(Math.ceil(Math.max(...$h.map(p=>p[1]))),0,h);
const $o=$3&&$2f&&!$d&&age>=0&&age<1200&&$20>$17&&$b>top&&$1r.some(r=>r.shape[0]*$23>.01);
const $5=$o&&$1r.some(r=>r.shape[0]*$23>.01&&$i(r.segment.slice(0,2),[r.segment[0]+r.dir[0]*r.shape[2]*$23,r.segment[1]+r.dir[1]*r.shape[2]*$23],w,h));
const a=$1r[0],b=$1r[1]??a;
return $w({[$0]:true,eventId:$s,ownerId:$1f,roomId:$21,age,rate:$1q,rangeWorld:$1p,characterMs:$e,width:w,height:h,drawable:$o,audible:$5,extensions:$t,scissor:[$17,top,$20-$17,$b-top],data:[w,h,age/1000,$23,...lo,...hi,...$8,$z($s),+$1v,$1r.length,0,0,0,...a.segment,...b.segment,...a.shape,...b.shape]});
}export const WGSL=`
struct P { view:vec4f, box:vec4f, axis:vec4f, counts:vec4f,
a:vec4f, b:vec4f, sa:vec4f, sb:vec4f, }
@group(0) @binding(0) var<uniform> p:P;
override PASS:u32=1u;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
let c=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
let q=mix(p.box.xy,p.box.zw,c[i]);
let v=q.x*p.axis.xy+q.y*vec2f(-p.axis.y,p.axis.x);
return vec4f(2*v.x/p.view.x-1,1-2*v.y/p.view.y,0,1);
}
fn bell(x:f32)->f32{return exp(-x*x);}
fn pulse(q:f32,k:f32)->f32{
let a=max(0.,sin(34.9*q+k+p.axis.z));
let b=.5+.5*sin(21.7*q-k*.7+p.axis.z*1.3);
return .78*a*a+.22*b*b;
}
fn beam(v:vec2f,r:vec4f,s:vec4f)->vec4f{
if(s.x<.00001){return vec4f(0);}
let d=normalize(r.zw-r.xy);let rel=(v-r.xy)/p.view.w;
let x=dot(rel,d);let y=dot(rel,vec2f(-d.y,d.x));
let h=max(s.y,.00001);let aa=.8/p.view.w;let t=p.view.z;
if(x < -h*2.8-aa || x>s.z+h*2.8+aa || abs(y)>h*2.8+aa){return vec4f(0);}
let u=clamp(x/s.x,0.,1.);let motion=1-p.axis.w;
let q=mix(.37+t*.12,t,motion)-max(x,0.)/s.w;
let open=.28+.72*smoothstep(0.,max(min(65.,s.x*.35),.00001),x);
let feed=1-.62*mix(smoothstep(1.,1.185,t),smoothstep(1.+.15*u,1.1+.085*u,t),motion);
let last=motion*bell((t-(1.025+.135*u))/.027)*smoothstep(.98,1.,t);
let env=(.4+.6*smoothstep(0.,.07,t))*(1-smoothstep(1.165,1.2,t));
let center=motion*.10*h*open*sin(28.*q+p.axis.z)*smoothstep(0.,.12,u);
let k=select(-.9,.7,y>center);
let radius=h*open*mix(.87,.66+.27*pulse(q,k)+.07*last,motion);
let e=(y-center)/max(radius,.00001);
let side=1-smoothstep(max(0.,radius*.80),radius+aa,abs(y-center));
let cap=max(min(17.,s.z*.20),.00001);
let cut=s.z-cap*.35*e*e;
let body=side*smoothstep(-aa,aa,x)*(1-smoothstep(cut-cap*.22,cut+aa*.2,x));
let band=pulse(q,e*1.6);
let lane=bell((e-.40*sin(27.*q+p.axis.z))/.30);
let trans=1-.65*lane*(.3+.7*pulse(q+.045,0.));
let core=exp(-pow(abs(e)/.79,4.));
let source=bell(x/max(min(19.,s.x*.23),.00001))*bell(e/.72);
let tip=bell((x-(cut-cap*.65))/max(cap*.5,.00001))*(.25+.75*band);
if(PASS==0u){
let along=smoothstep(-h,h*.2,x)*(1-smoothstep(s.z-h*.2,s.z+h,x));
let energy=env*(.11*bell(y/(h*1.1))*along*feed+.12*bell(length(rel)/(h*.75))*feed);
return vec4f(vec3f(.92,.95,.73)*energy,0);
}
if(PASS==1u){
let a=body*env*sqrt(feed)*trans*(.25+.24*core+.18*band);
let heat=clamp(.16+.65*band+.28*source+.18*last,0.,1.);
let color=mix(vec3f(.49,.62,.42),vec3f(1.,.99,.86),heat);
return vec4f(color*a,a);
}
let energy=body*env*(feed*((.16+.98*band)*core*trans+1.2*source+.55*tip)+.78*last*core);
let bright=1-exp(-1.7*energy);
let color=mix(vec3f(.84,.95,.61),vec3f(1.,.99,.96),clamp(band+source+last*.3,0.,1.));
return vec4f(color*bright,0);
}
@fragment fn fs(@builtin(position) v:vec4f)->@location(0) vec4f {
let a=beam(v.xy,p.a,p.sa);
if(p.counts.x<1.5){return a;}
return max(a,beam(v.xy,p.b,p.sb));
}`;
function $25(d){['out-of-memory','internal','validation'].forEach(s=>d.pushErrorScope(s));
}function $r(d){return Promise.all([d.popErrorScope(),d.popErrorScope(),d.popErrorScope()]).then(a=>a.find(Boolean)??null,e=>e);
}export async function create({device:d,format:$v,audio:$6}){$1b(d?.queue&&typeof d.createRenderPipelineAsync==='function','WebGPU device');
$1b(['bgra8unorm','rgba8unorm'].includes($v),'format');
const $1e={live:true},$1i=new Map(),$2c=Math.ceil(128/d.limits.minUniformBufferOffsetAlignment)*d.limits.minUniformBufferOffsetAlignment;
let $16,$1k,$11=[],$u;
$25(d);
try{const $1a=d.createShaderModule({code:WGSL,label:'Sunbeam E'});
$16=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform',hasDynamicOffset:true,minBindingSize:128}}]});
const pl=d.createPipelineLayout({bindGroupLayouts:[$16]});
$11=[0,1,2].map($1g=>d.createRenderPipelineAsync({layout:pl,vertex:{module:$1a,entryPoint:'vs'},fragment:{module:$1a,entryPoint:'fs',constants:{PASS:$1g},targets:[{format:$v,blend:{color:{srcFactor:'one',dstFactor:$1g===1?'one-minus-src-alpha':'one-minus-src',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}}}]},primitive:{topology:'triangle-list'}}));
}catch(e){$u=e;
}const $24=$r(d),$1z=await Promise.allSettled($11),$q=await $24;
if($u||$q||$1z.some(r=>r.status==='rejected'))throw $u??$q??$1z.find(r=>r.status==='rejected').reason;
$1k=$1z.map(r=>r.value);
const sfx=$6?$7($6,$1e):null;
let $13=-1,$14=-1;
d.lost.then(()=>{$1e.live=false;
sfx?.stopAll();
for(const s of $1i.values())s.buffer?.destroy();
$1i.clear();
});
function $1u(f,$1l){$1b($1e.live&&$1i.size<8,'disposed or too many unacknowledged frames');
$1b(f&&Number.isSafeInteger(f.id)&&f.id>$13&&f.encoder&&f.colorView,'frame/id/encoder/view');
num(f.sampledAtMs,'sampledAtMs',0,performance.now()+4);
$1b(Array.isArray($1l)&&$1l.length<=64,'max 64 plans');
$1b(Number.isInteger(f.width)&&Number.isInteger(f.height)&&f.width>0&&f.height>0&&Math.max(f.width,f.height)<=d.limits.maxTextureDimension2D,'frame size');
const ids=new Set();
for(const p of $1l){$1b(p?.[$0]&&Object.isFrozen(p)&&p.width===f.width&&p.height===f.height,'plan/size');
$1b(!ids.has(p.eventId),'duplicate cause ID');
ids.add(p.eventId);
}const $p=$1l.filter(p=>p.drawable);
let $c,$9;
$25(d);
try{if($p.length){$c=d.createBuffer({size:$2c*$p.length,usage:GPUBufferUsage.UNIFORM,mappedAtCreation:true});
const mem=$c.getMappedRange();
$p.forEach((p,i)=>new Float32Array(mem,i*$2c,32).set(p.data));
$c.unmap();
$9=d.createBindGroup({layout:$16,entries:[{binding:0,resource:{buffer:$c,size:128}}]});
for(let $15=0;
$15<3;
$15++){if($15!==1&&!$p.some(p=>p.extensions))continue;
const $1g=f.encoder.beginRenderPass({label:['E/spill','E/B','E/radiance'][$15],colorAttachments:[{view:f.colorView,loadOp:'load',storeOp:'store'}]});
try{$1g.setPipeline($1k[$15]);
$p.forEach((p,i)=>{if($15!==1&&!p.extensions)return;
$1g.setBindGroup(0,$9,[i*$2c]);
$1g.setScissorRect(...p.scissor);
$1g.draw(6);
});
}finally{$1g.end();
}}}}catch(e){$c?.destroy();
void $r(d);
throw e;
}const $1s=Object.freeze({frameId:f.id});
const $28={owner:$1e,id:f.id,encoder:f.encoder,at:f.sampledAtMs,plans:[...$1l],buffer:$c,check:$r(d),phase:0};
$1t.set($1s,$28);
$1i.set($1s,$28);
$13=f.id;
return $1s;
}async function $2d(r,$1o){const s=$1i.get(r);
$1b($1e.live&&s?.phase===0&&s.id>$14,'unrecorded/reused/out-of-order receipt');
$1b($1o?.frameId===s.id&&$1o.encoder===s.encoder&&typeof $1o.validation?.then==='function'&&typeof $1o.done?.then==='function','driver proof');
s.phase=1;
$14=s.id;
s.work=Promise.allSettled([s.check,$1o.validation,$1o.done]);
try{const out=await s.work;
const bad=out.find(v=>v.status==='rejected');
if(bad)throw bad.reason;
if(out[0].value!==null||out[1].value!==null)throw new Error('Sunbeam E: GPU validation failed');
$1b($1e.live,'disposed/device lost');
s.phase=2;
return r;
}finally{s.buffer?.destroy();
$1i.delete(r);
if(s.phase!==2)$1t.delete(r);
}}function $1(r){const s=$1i.get(r);
$1b(s?.phase===0,'cannot abandon submitted frame');
s.buffer?.destroy();
$1i.delete(r);
$1t.delete(r);
}async function $n(){$1e.live=false;
sfx?.destroy();
const $2i=[];
for(const[r,s]of $1i){if(s.phase===0)$1(r);
else $2i.push(s.work);
}await Promise.allSettled($2i);
$1k=[];
$16=null;
}return Object.freeze({record:$1u,driver:Object.freeze({submitted:$2d,abandon:$1}),sfx,destroy:$n});
}export function synthesizeSFX($22=48000){num($22,'sampleRate',8000,192000);
const pcm=new Float32Array(Math.ceil($22*1.2));
let rng=1234567,lo=0,hi=0,$1j=0,$1h=0;
const a=1-Math.exp(-2*Math.PI*280/$22),b=1-Math.exp(-2*Math.PI*2200/$22);
for(let n=0;
n<pcm.length;
n++){const t=n/$22;
rng^=rng<<13;
rng^=rng>>>17;
rng^=rng<<5;
const $1c=(rng>>>0)/2147483648-1;
lo+=a*($1c-lo);
hi+=b*($1c-hi);
$1j+=2*Math.PI*(154+48*$26(0,.12,t)-26*$26(1.0,1.2,t))/$22;
const $1x=$26(.012,.05,t)*(1-$26(.085,.18,t));
const e=$26(0,.01,t)*(1-.45*$26(1,1.15,t))*(1-$26(1.15,1.2,t));
const v=e*((.25*Math.sin($1j)+.08*Math.sin(2*$1j)+.025*Math.sin(3*$1j))*(.9+.07*Math.sin(t*34.9))+(hi-lo)*(.12+.42*$1x));
pcm[n]=v;
$1h=Math.max($1h,Math.abs(v));
}for(let i=0;
i<pcm.length;
i++)pcm[i]*=.4/Math.max($1h,1e-9);
pcm[0]=pcm[pcm.length-1]=0;
return pcm;
}function $7({context:c,destination:$m=c?.destination,gates:$y,consumedIds:$g,volume:$2h=.8},$1e){$1b(c&&$m&&$g instanceof Set,'AudioContext/destination/session consumedIds Set');
for(const k of['owner','room','verify','unlock'])$1b(typeof $y?.[k]==='function','gate '+k);
num($2h,'volume',0,1);
let $c=c.createBuffer(1,Math.ceil(c.sampleRate*1.2),c.sampleRate);
$c.copyToChannel(synthesizeSFX(c.sampleRate),0);
const lp=c.createBiquadFilter(),$19=c.createGain();
lp.type='lowpass';
lp.frequency.value=3900;
lp.Q.value=.5;
$19.gain.value=.18*$2h;
lp.connect($19);
$19.connect($m);
const $2g=new Map(),all=new Set();
let $j=false,$12=-1;
const $10=(p,t)=>p.cancelAndHoldAtTime(t);
function $4(p){try{return $1e.live&&!$j&&c.state==='running'&&['owner','room','verify','unlock'].every(k=>$y[k](p)===true);
}catch{return false;
}}function $2a(id){const v=$2g.get(id);
if(!v)return;
$2g.delete(id);
const t=c.currentTime;
$10(v.gain.gain,t);
v.gain.gain.linearRampToValueAtTime(0,t+.015);
try{v.source.stop(t+.022);
}catch{}}function $2b(){for(const id of[...$2g.keys()])$2a(id);
}function $1w(){for(const[id,v]of $2g)if(!$4(v.meta))$2a(id);
}function $1y(v,p,t,$1d){const $1n=v.position+(t-v.updated)*v.rate,$l=$1d-$1n;
if(p.ownerId!==v.meta.ownerId||p.roomId!==v.meta.roomId||t>=v.deadline||t-v.born>6||p.age+2<v.meta.age||Math.abs($l)>.13)return false;
v.rate=$f(p.rate+$f($l/.15,-.12,.12),.05,4);
v.position=$1n;
v.updated=t;
v.meta=p;
v.source.playbackRate.setValueAtTime(v.rate,t);
const g=v.gain.gain;
$10(g,t);
g.linearRampToValueAtTime(1,t+.01);
g.setValueAtTime(1,t+.10);
g.linearRampToValueAtTime(0,t+.16);
v.deadline=Math.min(t+.18,v.born+6);
v.source.stop(v.deadline);
return true;
}function $2(r){const s=$1t.get(r);
$1b(s?.owner===$1e&&s.phase===2,'receipt not activated by driver');
$1t.delete(r);
if($j||!$1e.live||s.id<=$12)return false;
$12=s.id;
const $k=(performance.now()-s.at)/1000,t=c.currentTime;
const $1l=s.plans.filter(p=>p.audible),ids=new Set($1l.map(p=>p.eventId));
for(const id of $2g.keys())if(!ids.has(id))$2a(id);
for(const p of $1l){const $1d=p.age/1000+$k*p.rate;
const ok=$k>=0&&$k<=.16&&p.rate>=.05&&$1d<1.2&&$4(p);
let v=$2g.get(p.eventId);
if(v){if(!ok||!$1y(v,p,t,$1d))$2a(p.eventId);
continue;
}if($g.has(p.eventId))continue;
$g.add(p.eventId);
if(!ok||$1d>=1.12||all.size>=6)continue;
const $27=c.createBufferSource(),$x=c.createGain();
$27.buffer=$c;
$27.loop=false;
$x.gain.value=0;
$27.connect($x);
$x.connect(lp);
v={source:$27,gain:$x,meta:p,position:$1d,updated:t,rate:p.rate,born:t,deadline:t+.18};
all.add(v);
$2g.set(p.eventId,v);
$27.onended=()=>{if($2g.get(p.eventId)===v)$2g.delete(p.eventId);
all.delete(v);
$27.disconnect();
$x.disconnect();
};
$27.playbackRate.value=p.rate;
$27.start(t,$1d);
$1y(v,p,t,$1d);
}return true;
}const $29=()=>{if(c.state!=='running'){$2g.clear();
for(const v of all){$10(v.gain.gain,c.currentTime);
v.gain.gain.setValueAtTime(0,c.currentTime);
try{v.source.stop(c.currentTime);
}catch{}}}};
c.addEventListener('statechange',$29);
function $n(){if($j)return;
$j=true;
$2b();
c.removeEventListener('statechange',$29);
setTimeout(()=>{for(const v of all){try{v.source.stop();
}catch{}v.source.onended=null;
v.source.disconnect();
v.gain.disconnect();
}all.clear();
$c=null;
lp.disconnect();
$19.disconnect();
},60);
}return Object.freeze({accept:$2,refreshGates:$1w,stopAll:$2b,destroy:$n});
}export const TEST_TIMES=Object.freeze([0,16,45,90,180,550,819,820,1000,1080,1150,1180,1199,1200]);
export function testInput(age=550,$2e=true){return{eventId:'test/cause-1',ownerId:'flora',roomId:'test-room',actorNowMs:age,startActorMs:0,actorRate:1,characterElapsedMs:Math.min(age,820),rangeWorld:450,alive:true,visible:true,twoPalms:$2e,camera:{zoom:1.65,cssPxPerWorld:1},viewport:{widthCss:980,heightCss:620,dpr:1},rays:($2e?[280,314]:[297]).map(y=>({palmCss:[110,y],endCss:[852.5,y],directionCss:[1,0]}))};
}
