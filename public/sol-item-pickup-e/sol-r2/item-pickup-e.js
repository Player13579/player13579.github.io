export const EFFECT_ID = 'action-item-pickup';
export const VERSION = 'sol-r2';
export const DURATION_MS = 950;

const SHADER = /* wgsl */ `
struct Uniforms {
  phase: f32, reduced: f32, height: f32, preview: f32,
  centerX: f32, centerY: f32, scale: f32, light: f32,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

fn box(p: vec2f, b: vec2f) -> f32 {
  let q = abs(p)-b;
  return length(max(q,vec2f(0.0)))+min(max(q.x,q.y),0.0);
}
fn segment(p: vec2f,a: vec2f,b: vec2f) -> f32 {
  let h=clamp(dot(p-a,b-a)/max(dot(b-a,b-a),0.0001),0.0,1.0);
  return length(p-a-(b-a)*h);
}
fn aa(d: f32,w: f32) -> f32 {return 1.0-smoothstep(w-0.65,w+0.65,d);}
fn over(bg: vec4f,fg: vec4f) -> vec4f {
  let a=fg.a+bg.a*(1.0-fg.a);
  return vec4f((fg.rgb*fg.a+bg.rgb*bg.a*(1.0-fg.a))/max(a,0.00001),a);
}
fn ink(d: f32,w: f32,c: vec3f,a: f32) -> vec4f {return vec4f(c,aa(d,w)*a);}
fn bloom(d: f32,r: f32,c: vec3f,a: f32) -> vec4f {
  return vec4f(c,exp(-max(d,0.0)*max(d,0.0)/(r*r))*a);
}
fn curve(s: f32) -> vec2f {
  let v=clamp(s,0.0,1.0);let k=1.0-v;
  return k*k*vec2f(0.0,28.0)+2.0*k*v*vec2f(-11.0,5.0)+v*v*vec2f(19.0,-4.0);
}
fn tangent(s: f32) -> vec2f {
  let v=clamp(s,0.0,1.0);
  return normalize(2.0*(1.0-v)*(vec2f(-11.0,5.0)-vec2f(0.0,28.0))+2.0*v*(vec2f(19.0,-4.0)-vec2f(-11.0,5.0)));
}
struct RibbonHit {distance:f32,side:f32,at:f32};
fn ribbonHit(p:vec2f,limit:f32)->RibbonHit {
  var best=1e5;var side=0.0;var at=0.0;
  for(var i:u32=0u;i<=32u;i=i+1u){
    let s=limit*f32(i)/32.0;let c=curve(s);let delta=p-c;let d=length(delta);
    if(d<best){best=d;let axis=tangent(s);side=dot(delta,vec2f(-axis.y,axis.x));at=s;}
  }
  return RibbonHit(best,side,at);
}
@vertex fn vertex(@builtin(vertex_index)i:u32)->@builtin(position)vec4f {
  let tri=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
  return vec4f(tri[i],0.0,1.0);
}
@fragment fn fragment(@builtin(position) position:vec4f)->@location(0)vec4f {
  let p=(position.xy-vec2f(u.centerX,u.centerY))/max(u.scale,0.001);
  let t=clamp(u.phase,0.0,1.0);
  var out=vec4f(0.0);
  if(u.preview>0.5){
    let base=select(vec3f(0.055,0.075,0.11),vec3f(0.82,0.85,0.87),u.light>0.5);
    out=vec4f(base,1.0);
    out=over(out,ink(abs(p.y-33.0),0.45,vec3f(0.42,0.48,0.52),0.16));
    let torso=box(p-vec2f(0.0,3.0),vec2f(12.0,17.0));
    let legs=min(box(p-vec2f(-5.5,23.0),vec2f(4.5,10.0)),box(p-vec2f(5.5,23.0),vec2f(4.5,10.0)));
    let arms=min(box(p-vec2f(-15.0,0.0),vec2f(3.7,13.0)),box(p-vec2f(15.0,0.0),vec2f(3.7,13.0)));
    let person=min(min(torso,legs),min(arms,length(p-vec2f(0.0,-23.0))-8.0));
    out=over(out,ink(person,0.0,select(vec3f(0.24,0.31,0.38),vec3f(0.45,0.51,0.55),u.light>0.5),0.9));
    out=over(out,ink(abs(person)-0.45,0.45,vec3f(0.64,0.74,0.79),0.29));
  }

  // Floor plane: a broad receiving footprint leaves a visible vacant pocket.
  let q=p-vec2f(0.0,28.0);
  let skew=vec2f(q.x+q.y*0.55,q.y);
  let plate=box(skew,vec2f(18.0,5.2));
  let pocket=box(skew,vec2f(10.5,2.4));
  let floorPresence=smoothstep(0.0,0.10,t)*(1.0-smoothstep(0.76,0.86,t));
  let opening=1.0-smoothstep(0.16,0.32,t);
  out=over(out,bloom(plate,6.0,vec3f(1.0,0.38,0.10),0.25*floorPresence));
  out=over(out,ink(plate,0.0,vec3f(0.28,0.23,0.16),0.75*floorPresence));
  out=over(out,ink(max(plate,-pocket),0.0,vec3f(0.90,0.42,0.12),0.42*opening));
  out=over(out,ink(abs(plate)-1.0,0.9,vec3f(1.0,0.68,0.25),0.95*floorPresence));
  let lip=segment(p,vec2f(-16.0,32.6),vec2f(16.0,32.6));
  out=over(out,ink(lip,1.1,vec3f(1.0,0.85,0.40),0.65*floorPresence));
  // The dark centre after extraction remains a causal vacancy, not a drawn item.
  let vacant=smoothstep(0.23,0.42,t)*(1.0-smoothstep(0.72,0.83,t));
  out=over(out,ink(pocket,0.0,vec3f(0.04,0.13,0.18),0.58*vacant));

  // Two separated world planes form a continuous lifted volume from floor to body.
  let carrier=smoothstep(0.13,0.23,t)*(1.0-smoothstep(0.77,0.89,t));
  if(carrier>0.001&&p.x>-30.0&&p.x<40.0&&p.y>-20.0&&p.y<40.0){
  let ordinaryHead=pow(smoothstep(0.07,0.66,t),0.70);
  let reducedHead=mix(0.55,1.0,smoothstep(0.16,0.36,t));
  let headProgress=select(ordinaryHead,reducedHead,u.reduced>0.5);
  let back=ribbonHit(p+vec2f(4.0,2.7),headProgress);
  let front=ribbonHit(p,headProgress);
  let backWidth=6.9+1.0*(1.0-back.at);
  let frontWidth=7.0+1.5*(1.0-front.at);
  let head=curve(headProgress);let ax=tangent(headProgress);let normal=vec2f(-ax.y,ax.x);
  let root=vec2f(0.0,28.0);let rootAxis=tangent(0.0);
  let backShape=max(max(back.distance-backWidth,dot(p-(head-vec2f(4.0,2.7)),ax)),-dot(p-(root-vec2f(4.0,2.7)),rootAxis));
  let frontShape=max(max(front.distance-frontWidth,dot(p-head,ax)),-dot(p-root,rootAxis));
  out=over(out,bloom(backShape,6.0,vec3f(0.08,0.35,0.72),0.18*carrier));
  out=over(out,ink(backShape,0.0,vec3f(0.07,0.22,0.44),0.63*carrier));
  out=over(out,ink(abs(backShape)-1.2,0.8,vec3f(0.16,0.53,0.87),0.52*carrier));
  out=over(out,bloom(frontShape,7.0,vec3f(0.05,0.74,0.87),0.26*carrier));
  out=over(out,ink(frontShape,0.0,vec3f(0.05,0.48,0.62),0.85*carrier));
  let broadFacet=max(frontShape,front.side-0.7);
  out=over(out,ink(broadFacet,0.0,vec3f(0.14,0.69,0.75),0.29*carrier));
  let seam=abs(front.side+2.7);
  out=over(out,ink(max(frontShape,seam-0.6),0.0,vec3f(0.02,0.25,0.35),0.34*carrier));
  out=over(out,ink(abs(frontShape)-1.2,0.8,vec3f(0.51,0.96,1.0),0.54*carrier));
  let leading=segment(p,head-normal*frontWidth-ax*1.3,head+normal*frontWidth-ax*1.3);
  out=over(out,bloom(leading,5.0,vec3f(0.24,0.88,1.0),0.30*carrier));
  out=over(out,ink(leading,2.2,vec3f(0.87,1.0,1.0),0.95*carrier));
  }

  // Spatial receiving chamber: rear wall, two closing faces, then a bright contained result.
  let closing=smoothstep(0.67,0.87,t);
  let goal=vec2f(19.0-13.0*closing,-4.0+3.0*closing);let g=p-goal;
  let receive=smoothstep(0.48,0.60,t)*(1.0-smoothstep(0.82,0.94,t));
  let gate=16.0-8.0*closing;
  let rear=box(vec2f(g.x+4.0+(g.y+3.0)*0.35,g.y+3.0),vec2f(11.5,12.0));
  out=over(out,bloom(rear,7.0,vec3f(0.16,0.55,0.74),0.24*receive));
  out=over(out,ink(rear,0.0,vec3f(0.10,0.31,0.42),0.46*receive));
  let left=box(vec2f(g.x+gate+g.y*0.38,g.y),vec2f(4.3,12.0-4.0*closing));
  let right=box(vec2f(g.x-gate+g.y*0.38,g.y),vec2f(4.3,12.0-4.0*closing));
  out=over(out,ink(left,0.0,vec3f(0.54,0.61,0.29),0.82*receive));
  out=over(out,ink(right,0.0,vec3f(0.94,0.58,0.18),0.84*receive));
  out=over(out,ink(min(abs(left)-1.0,abs(right)-1.0),0.8,vec3f(1.0,0.88,0.45),0.65*receive));
  let catchPeak=exp(-pow((t-0.72)/0.105,2.0));
  let contained=box(vec2f(g.x+g.y*0.46,g.y),vec2f(7.2-1.8*closing,8.0-2.0*closing));
  out=over(out,bloom(contained,8.0,vec3f(1.0,0.67,0.19),0.42*receive));
  out=over(out,ink(contained,0.0,vec3f(1.0,0.78,0.38),0.78*receive));
  let hinge=segment(p,goal+vec2f(-3.8,-8.0),goal+vec2f(3.8,8.0));
  out=over(out,ink(max(contained,hinge-1.2),0.0,vec3f(1.0,0.98,0.70),0.68*receive));
  let core=length(g/vec2f(4.0,5.0))-1.0;
  out=over(out,bloom(core,8.0,vec3f(1.0,0.81,0.40),0.36*catchPeak));
  out=over(out,ink(core,0.0,vec3f(1.0,1.0,0.94),0.94*catchPeak));
  // A short observer flare is bound to the same catch point and instant.
  let flare=segment(p,goal+vec2f(-13.0,7.0),goal+vec2f(12.0,-6.0));
  out=over(out,bloom(flare,4.3,vec3f(1.0,0.79,0.38),0.25*catchPeak));
  return out;
}`;

export function createItemPickupEffect(device, format = 'bgra8unorm') {
  const module = device.createShaderModule({ code: SHADER, label: 'item-pickup-sol-r2' });
  const pipeline = device.createRenderPipeline({
    label: 'item-pickup-sol-r2', layout: 'auto',
    vertex: { module, entryPoint: 'vertex' },
    fragment: { module, entryPoint: 'fragment', targets: [{ format, blend: {
      color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }
    } }] }, primitive: { topology: 'triangle-list' }
  });
  const uniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:'item-pickup-sol-r2-uniform'});
  const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
  let disposed=false;
  return {
    draw(pass,{elapsedMs,width,height,centerX=width/2,centerY=height/2,scale=1,preview=false,light=false,reducedMotion=false}) {
      if(disposed)throw new Error('Item pickup renderer disposed');
      if(!preview&&(elapsedMs<0||elapsedMs>DURATION_MS))return false;
      const phase=Math.max(0,Math.min(1,Number(elapsedMs)/DURATION_MS));
      device.queue.writeBuffer(uniform,0,new Float32Array([phase,reducedMotion?1:0,height,preview?1:0,centerX,centerY,scale,light?1:0]));
      pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);return true;
    },dispose(){if(!disposed){uniform.destroy();disposed=true;}}
  };
}

const playedEvents=new Set();
export function playItemPickupSfx({eventId,audioContext,verify=false,gain=0.26}={}) {
  if(verify||typeof location!=='undefined'&&new URLSearchParams(location.search).has('verify'))return false;
  if(!audioContext||audioContext.state!=='running')return false;
  const key=String(eventId||'');if(!key||playedEvents.has(key))return false;
  playedEvents.add(key);if(playedEvents.size>256)playedEvents.delete(playedEvents.values().next().value);
  const start=audioContext.currentTime;const bus=audioContext.createGain();
  bus.gain.value=Math.max(0,Math.min(0.38,gain));bus.connect(audioContext.destination);
  const tone=(offset,f0,f1,duration,level,type)=>{
    const osc=audioContext.createOscillator(),amp=audioContext.createGain();osc.type=type;
    osc.frequency.setValueAtTime(f0,start+offset);
    osc.frequency.exponentialRampToValueAtTime(f1,start+offset+duration);
    amp.gain.setValueAtTime(0.0001,start+offset);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002,level),start+offset+0.024);
    amp.gain.exponentialRampToValueAtTime(0.0001,start+offset+duration);
    osc.connect(amp).connect(bus);osc.start(start+offset);osc.stop(start+offset+duration+0.015);
  };
  tone(0.00,250,180,0.21,0.30,'sine');
  tone(0.14,360,790,0.47,0.20,'triangle');
  tone(0.53,690,420,0.29,0.27,'sine');
  return true;
}
