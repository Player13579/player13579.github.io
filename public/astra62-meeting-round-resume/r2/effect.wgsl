struct View {
  size: vec2f, ageMs: f32, scale: f32,
  reduced: f32, activeFlag: f32, digits: f32, pad: f32,
  oldDigits: array<vec4f,4>,
  newDigits: array<vec4f,4>,
}
@group(0) @binding(0) var<uniform> view: View;

@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  if (i == 1u) { return vec4f(3,-1,0,1); }
  if (i == 2u) { return vec4f(-1,3,0,1); }
  return vec4f(-1,-1,0,1);
}

fn srgb(c:vec3f)->vec3f {
  let x=clamp(c,vec3f(0),vec3f(1));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));
}
fn cover(d:f32,w:f32)->f32 { return 1.0-smoothstep(-w,w,d); }
fn boxDist(p:vec2f,h:vec2f,r:f32)->f32 {
  let v=abs(p)-h+vec2f(r);
  return length(max(v,vec2f(0)))+min(max(v.x,v.y),0.0)-r;
}

// Dark die-cut marks. The two half-plane tests get their own pixel footprints;
// in particular the upright strokes do not grow sideways as the leaf turns.
fn cutBar(q:vec2f,w:vec2f)->f32 {
  return cover(abs(q.y)-1.85,w.y)*cover(abs(q.x)+abs(q.y)-5.8,w.x+w.y);
}
fn stencil(p:vec2f,w:vec2f,n:i32,pitch:f32,isNext:bool)->f32 {
  let c=i32(floor(p.x/pitch+0.5*f32(n)));
  if (c<0 || c>=n) { return 0.0; }
  let slot=min(15u,u32(16-n+c));
  let d=select(view.oldDigits[slot/4u][slot%4u],view.newDigits[slot/4u][slot%4u],isNext);
  if (!(d>=0.0 && d<=9.0)) { return 0.0; }
  var codes=array<u32,10>(63u,6u,91u,79u,102u,109u,125u,7u,127u,111u);
  let bits=codes[min(9u,u32(d))];
  let sx=20.0/pitch;
  let q=vec2f((p.x-(f32(c)+0.5-0.5*f32(n))*pitch)*sx,p.y);
  let fw=w*vec2f(sx,1);
  var m=0.0;
  if ((bits & 1u)!=0u) { m=max(m,cutBar(q-vec2f(0,-12),fw)); }
  if ((bits & 2u)!=0u) { m=max(m,cutBar((q-vec2f(6,-6)).yx,fw.yx)); }
  if ((bits & 4u)!=0u) { m=max(m,cutBar((q-vec2f(6,6)).yx,fw.yx)); }
  if ((bits & 8u)!=0u) { m=max(m,cutBar(q-vec2f(0,12),fw)); }
  if ((bits & 16u)!=0u) { m=max(m,cutBar((q-vec2f(-6,6)).yx,fw.yx)); }
  if ((bits & 32u)!=0u) { m=max(m,cutBar((q-vec2f(-6,-6)).yx,fw.yx)); }
  if ((bits & 64u)!=0u) { m=max(m,cutBar(q,fw)); }
  return m;
}

const UPPER_RGB=vec3f(0.66,0.98,0.84);
const LOWER_RGB=vec3f(0.40,0.85,0.78);
const SPREAD_PART=0.135;
fn plate(p:vec2f,w:vec2f,hw:f32,n:i32,pitch:f32,isNext:bool)->vec3f {
  let x=clamp(p.x/hw,-1.0,1.0);
  let y=clamp(abs(p.y)/19.0,0.0,1.0);
  let field=select(UPPER_RGB,LOWER_RGB,p.y>0.0)*(0.74+0.18*y+0.08*(1.0-x*x));
  return mix(field,vec3f(0.008,0.025,0.032),stencil(p,w,n,pitch,isNext));
}

// Integral of a unit-area tent, in units of its support radius.
fn tentCdf(v:f32)->f32 {
  let k=max(0.0,1.0-abs(v));
  let tail=0.5*k*k;
  return select(tail,1.0-tail,v>=0.0);
}
fn spreadBand(p:f32,lo:f32,hi:f32,r:f32)->f32 {
  return tentCdf((p-lo)/r)-tentCdf((p-hi)/r);
}
fn stripCoverage(y:f32,lo:f32,hi:f32,w:f32)->f32 {
  return clamp((min(y+w,hi)-max(y-w,lo))/(2.0*w),0.0,1.0);
}

@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f {
  let bg=vec3f(0.014,0.023,0.032);
  let clearColor=vec4f(srgb(bg),1);
  let t=view.ageMs;
  if (!(view.activeFlag>=0.5 && t>0.0 && t<1160.0)) { return clearColor; }
  if (!(all(view.size>=vec2f(1)) && all(view.size<=vec2f(65536)) && view.scale>0.0 && view.digits>=1.0 && view.digits<=16.0)) { return clearColor; }
  let n=i32(view.digits);
  let s=min(clamp(view.scale,0.015625,256.0),min(view.size.x/84.0,view.size.y/57.0));
  let p=(screen.xy-0.5*view.size)/s;
  let aa=0.66/s;
  let hw=min(max(31.0,8.0+10.0*f32(n)),0.5*view.size.x/s-8.0);
  let pitch=min(20.0,(2.0*hw-10.0)/f32(n));
  if (abs(p.x)>hw+24.0+aa || abs(p.y)>41.0+aa) { return clearColor; }

  let faceMask=cover(boxDist(p,vec2f(hw,19),2.8),aa);
  let rimD=boxDist(p,vec2f(hw+3.4,22.4),4.7);
  let rimMask=cover(rimD,aa);
  let shoulder=1.0-smoothstep(0.0,2.8,-rimD);
  var shell=mix(bg,vec3f(0.025,0.055,0.063)+shoulder*vec3f(0.052,0.085,0.084),rimMask);
  let pin=cover(boxDist(vec2f(abs(p.x)-(hw+1.6),p.y),vec2f(1.45,2.15),1.0),aa)*rimMask;
  shell=mix(shell,vec3f(0.18,0.28,0.29),pin);

  let f=smoothstep(220.0,580.0,t);
  let reach=cos(3.14159265*f);
  let k=abs(reach);
  let tipY=-19.0*reach;
  let lo=min(0.0,tipY);
  let hi=max(0.0,tipY);
  let gain=0.42+0.58*k;
  let turning=(view.reduced<=0.5 && t>220.0 && t<580.0);
  var direct=shell;
  if (faceMask>0.0) {
    var paint:vec3f;
    if (t<=220.0 || t>=580.0) {
      paint=plate(p,vec2f(aa),hw,n,pitch,t>=580.0);
    } else if (!turning) {
      paint=mix(plate(p,vec2f(aa),hw,n,pitch,false),plate(p,vec2f(aa),hw,n,pitch,true),f);
    } else {
      // Behind the turning leaf: new upper half, old lower half.
      paint=plate(p,vec2f(aa),hw,n,pitch,p.y<=0.0);
      let occ=stripCoverage(p.y,lo,hi,aa);
      if (occ>0.0) {
        let ky=max(k,0.00390625);
        let q=vec2f(p.x,clamp(p.y/ky,-19.0,19.0));
        let leaf=plate(q,vec2f(aa,aa/ky),hw,n,pitch,reach<0.0);
        paint=mix(paint,leaf*gain,occ);
      }
    }
    let joint=cover(abs(p.y)-0.60,aa);
    direct=mix(shell,paint*((1.0-SPREAD_PART)*(1.0-0.42*joint)),faceMask);
  }

  // Low-frequency source proxy, NOT a blur of this fragment's output. Replace
  // the covered strip, do not add a second source behind the turning leaf.
  let wx=spreadBand(p.x,-hw,hw,24.0);
  var flux=UPPER_RGB*spreadBand(p.y,-19.0,0.0,22.0)+LOWER_RGB*spreadBand(p.y,0.0,19.0,22.0);
  if (turning) {
    let side=select(UPPER_RGB,LOWER_RGB,tipY>0.0);
    flux=flux-side*((1.0-gain)*spreadBand(p.y,lo,hi,22.0));
  }
  let skirt=(SPREAD_PART*0.84*wx)*max(flux,vec3f(0));
  let drive=smoothstep(0.0,78.0,t)*(1.0-smoothstep(946.0,1160.0,t));
  return vec4f(srgb(mix(bg,direct+skirt,drive)),1);
}
