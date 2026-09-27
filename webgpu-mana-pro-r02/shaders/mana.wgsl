// r0.2 — procedural coverage and finite-volume shading. No image texture, light sprites, particles or rings.
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
fn shapeDistance(p0:vec2<f32>,h:vec2<f32>)->f32 {
  // Compact asymmetric lens; a rounded volume, not a card, blade, tube, limb or glyph.
  let nx=p0.x/h.x;
  let localHeight=h.y*(0.88-0.16*clamp(nx,-1.0,1.0));
  let q=vec2<f32>(nx,(p0.y+0.09*h.y*nx)/localHeight);
  return (length(q)-1.0)*min(h.x,localHeight);
}
fn srgbToLinear(c:vec3<f32>)->vec3<f32> {
  let low=c/12.92;let high=pow((c+vec3<f32>(0.055))/1.055,vec3<f32>(2.4));
  return select(high,low,c<=vec3<f32>(0.04045));
}
@fragment fn fs(v:VertexOut)->@location(0) vec4<f32> {
  let it=instances[v.index];let kind=u32(it.control.y+0.5);let h=it.pose.zw;let p=v.local;
  let d=shapeDistance(p,h);
  let aa=max(fwidth(d),0.18); // screen-space derivative; no fixed pixel claims at unknown DPR
  let coverage=1.0-smoothstep(-aa,aa,d);
  let insideEdge=1.0-smoothstep(0.45,2.10,-d);
  let darkRim=1.0-smoothstep(0.05,0.45,-d);
  let normal=vec2<f32>((p.x+0.16*p.y)/h.x,p.y/h.y);
  var axis=normal.x;
  if(kind==2u){axis=-normal.y;}
  let converted=1.0-smoothstep(it.control.z-0.12,it.control.z+0.12,axis);
  let frontDistance=abs(axis-it.control.z+0.22*normal.y*normal.y);
  let leading=1.0-smoothstep(0.035,0.21,frontDistance);
  let topFacet=clamp(0.45-normal.y*0.38+normal.x*0.17,0.0,1.0);
  let core=vec3<f32>(0.027,0.104,0.148);
  let volume=vec3<f32>(0.075,0.44,0.43);
  let edge=vec3<f32>(0.30,0.87,0.68);
  let interfaceColor=vec3<f32>(0.98,0.76,0.40);
  let keyline=vec3<f32>(0.012,0.036,0.057);
  let depthShade=clamp(0.50+0.24*normal.y+0.18*normal.x,0.0,1.0);
  var color=mix(core,volume,(0.16+0.72*converted)*depthShade);
  // A finite bright upper face and a darker lower interior communicate thickness at H64.
  color=mix(color,edge,converted*0.36*topFacet);
  color=mix(color,edge,insideEdge*(0.59+0.38*topFacet));
  color=mix(color,interfaceColor,leading*0.96);
  color=mix(color,keyline,darkRim*0.64);
  if(kind==2u){
    // The receiving volume loses its enclosing edge as it becomes body-bound, not a persistent badge.
    let seated=smoothstep(0.66,0.86,it.tone.y);
    color=mix(color,mix(volume,edge,0.55+0.25*topFacet),seated*converted*0.34);
  }
  // A single broad contact patch, not a blurred white halo.
  if(kind==3u){color=mix(volume,interfaceColor,0.28);}
  let contactP=(v.world-it.anchor.xy)/vec2<f32>(13.5*it.anchor.z,18.0*it.anchor.w);
  let contactD=length(contactP)-1.0;
  let contactAA=max(fwidth(contactD),0.006);
  let contactMask=1.0-smoothstep(-contactAA,contactAA,contactD);
  var alpha=coverage*it.control.w;
  if(kind==1u||kind==2u||kind==3u){alpha*=contactMask;}
  if(kind==3u){alpha*=clamp(1.0-length(normal)*0.62,0.0,1.0);}
  // Energy AND coverage fall independently in the last 16%. The dim tail cannot become a white fleck.
  color=mix(core*0.28,color,it.tone.x);
  if(globals.options.x>0.5){color=srgbToLinear(color);}
  return vec4<f32>(color*alpha,alpha);
}
