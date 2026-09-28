// r0.3 — body-owned mana acquisition. No image texture, no particle atlas, no rings, no white glow sprite.
struct Instance { pose:vec4<f32>, control:vec4<f32>, tone:vec4<f32>, anchor:vec4<f32>, extra:vec4<f32> };
struct Globals { viewport:vec4<f32>, camera:vec4<f32>, options:vec4<f32> };
@group(0) @binding(0) var<storage,read> instances:array<Instance>;
@group(0) @binding(1) var<uniform> globals:Globals;
struct VertexOut { @builtin(position) position:vec4<f32>, @location(0) local:vec2<f32>, @location(1) world:vec2<f32>, @location(2) @interpolate(flat) index:u32 };
fn rotate2(p:vec2<f32>,a:f32)->vec2<f32>{let c=cos(a);let s=sin(a);return vec2<f32>(c*p.x-s*p.y,s*p.x+c*p.y);}
@vertex fn vs(@builtin(vertex_index) vid:u32,@builtin(instance_index) iid:u32)->VertexOut {
  let corners=array<vec2<f32>,6>(vec2<f32>(-1,-1),vec2<f32>(1,-1),vec2<f32>(-1,1),vec2<f32>(-1,1),vec2<f32>(1,-1),vec2<f32>(1,1));
  let item=instances[iid]; let local=corners[vid]*(item.pose.zw+vec2<f32>(4.0));
  let world=item.pose.xy+rotate2(local,item.control.x);
  let css=(world-globals.camera.xy)*globals.viewport.z+globals.camera.zw;
  var out:VertexOut;out.position=vec4<f32>(css.x/globals.viewport.x*2.0-1.0,1.0-css.y/globals.viewport.y*2.0,0.0,1.0);
  out.local=local;out.world=world;out.index=iid;return out;
}
fn ellipseSdf(p:vec2<f32>,h:vec2<f32>)->f32 {
  let q=vec2<f32>(p.x/h.x,p.y/h.y);
  return (length(q)-1.0)*min(h.x,h.y);
}
fn roundBoxSdf(p:vec2<f32>,b:vec2<f32>,r:f32)->f32{
  let q=abs(p)-b+vec2<f32>(r);
  return length(max(q,vec2<f32>(0.0)))+min(max(q.x,q.y),0.0)-r;
}
fn leafSdf(p:vec2<f32>,h:vec2<f32>)->f32 {
  let py=clamp(abs(p.y)/max(h.y,0.001),0.0,1.0);
  let hx=max(0.65,h.x*(0.70+0.22*(1.0-py)));
  let q=vec2<f32>(p.x/hx,p.y/h.y);
  return (length(q)-1.0)*min(hx,h.y);
}
fn crescentSdf(p:vec2<f32>,h:vec2<f32>)->f32 {
  let outer=ellipseSdf(vec2<f32>(p.x,p.y+0.03*h.y),h);
  let inner=ellipseSdf(p-vec2<f32>(0.30*h.x,-0.02*h.y),vec2<f32>(max(0.75,h.x*0.77),max(0.75,h.y*0.72)));
  return max(outer,-inner);
}
fn srgbToLinear(c:vec3<f32>)->vec3<f32> {
  let low=c/12.92;let high=pow((c+vec3<f32>(0.055))/1.055,vec3<f32>(2.4));
  return select(high,low,c<=vec3<f32>(0.04045));
}
@fragment fn fs(v:VertexOut)->@location(0) vec4<f32> {
  let it=instances[v.index];let kind=u32(it.control.y+0.5);let h=it.pose.zw;let p=v.local;
  var d=ellipseSdf(p,h);
  if(kind==0u||kind==1u){d=crescentSdf(p,h);}          // exterior shroud and transfer seam
  else if(kind==2u||kind==6u){d=leafSdf(p,h);}         // reservoir and compact seed
  else if(kind==4u){d=ellipseSdf(p,h);}                // interface veil
  else if(kind==5u){d=roundBoxSdf(p,h, min(h.y*0.95,h.x*0.45));} // settlement bands
  let aa=max(fwidth(d),0.18);
  let coverage=1.0-smoothstep(-aa,aa,d);
  let insideEdge=1.0-smoothstep(0.42,2.05,-d);
  let darkRim=1.0-smoothstep(0.06,0.42,-d);
  let normal=vec2<f32>(p.x/max(h.x,0.001),p.y/max(h.y,0.001));
  var axis=normal.x;
  if(kind==2u||kind==6u){axis=-normal.y;}
  let converted=1.0-smoothstep(it.control.z-0.12,it.control.z+0.12,axis);
  let frontDistance=abs(axis-it.control.z+0.16*normal.y*normal.y);
  let leading=1.0-smoothstep(0.03,0.19,frontDistance);
  let topFacet=clamp(0.44-normal.y*0.36+normal.x*0.14,0.0,1.0);
  let core=vec3<f32>(0.026,0.093,0.137);
  let volume=vec3<f32>(0.080,0.455,0.442);
  let edge=vec3<f32>(0.35,0.90,0.73);
  let interfaceColor=vec3<f32>(0.98,0.79,0.42);
  let keyline=vec3<f32>(0.014,0.034,0.052);
  let tailTint=vec3<f32>(0.082,0.17,0.19);
  var color=core;

  if(kind==0u){
    let depth=clamp(0.52+0.18*normal.y+0.22*normal.x,0.0,1.0);
    color=mix(core,volume,(0.18+0.54*converted)*depth);
    color=mix(color,edge,insideEdge*(0.40+0.28*topFacet));
    color=mix(color,interfaceColor,leading*0.60);
    color=mix(color,keyline,darkRim*0.58);
  } else if(kind==1u){
    color=mix(volume,edge,0.34+0.30*insideEdge);
    color=mix(color,interfaceColor,0.40+0.60*leading);
    color=mix(color,keyline,darkRim*0.28);
  } else if(kind==2u){
    let depth=clamp(0.50+0.28*topFacet,0.0,1.0);
    let lodged=smoothstep(0.24,0.84,it.tone.y);
    color=mix(core,volume,(0.26+0.56*converted)*depth);
    color=mix(color,edge,insideEdge*(0.44+0.24*topFacet));
    let hotCore=1.0-smoothstep(0.05,0.24,abs(axis-it.control.z*0.36));
    color=mix(color,interfaceColor,hotCore*(0.18+0.16*(1.0-lodged)));
    color=mix(color,edge,lodged*converted*0.18);
    color=mix(color,keyline,darkRim*0.46);
  } else if(kind==4u){
    color=mix(volume,interfaceColor,0.18+0.08*leading);
    color=mix(color,edge,insideEdge*0.10);
  } else if(kind==5u){
    color=mix(core,edge,0.42+0.24*converted);
    color=mix(color,interfaceColor,leading*0.24);
    color=mix(color,keyline,darkRim*0.18);
  } else if(kind==6u){
    color=mix(core,edge,0.24+0.12*topFacet);
    color=mix(color,interfaceColor,leading*0.14);
    color=mix(color,keyline,darkRim*0.34);
  }

  let contactScale=select(vec2<f32>(13.7*it.anchor.z,18.2*it.anchor.w),vec2<f32>(15.0*it.anchor.z,19.5*it.anchor.w),kind==4u);
  let contactP=(v.world-it.anchor.xy)/contactScale;
  let contactD=length(contactP)-1.0;
  let contactAA=max(fwidth(contactD),0.006);
  let contactMask=1.0-smoothstep(-contactAA,contactAA,contactD);
  var alpha=coverage*it.control.w;
  if(kind==1u||kind==2u||kind==4u||kind==5u||kind==6u){alpha*=contactMask;}
  if(kind==1u){alpha*=0.28+0.72*leading;}
  if(kind==4u){alpha*=clamp(1.0-length(normal)*0.60,0.0,1.0);}
  if(kind==5u){alpha*=0.72+0.28*insideEdge;}

  // Energy and coverage fall independently during the tail so the finish reads as a settled low-luma state, not a white fleck.
  color=mix(tailTint,color,it.tone.x);
  if(globals.options.x>0.5){color=srgbToLinear(color);}
  return vec4<f32>(color*alpha,alpha);
}
