struct Params { viewport:vec2f, center:vec2f, height:f32, age:f32, kind:f32, source:f32, observer:f32, reduced:f32, pad:vec2f }
@group(0) @binding(0) var<uniform> u:Params;
struct Vertex { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->Vertex {
  var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return Vertex(vec4f(p[i],0,1));
}
fn box(p:vec2f,b:vec2f)->f32 { let q=abs(p)-b; return length(max(q,vec2f(0)))+min(max(q.x,q.y),0.0); }
fn ramp(a:f32,b:f32,t:f32)->f32 { return smoothstep(a,b,t); }
fn rot(p:vec2f,a:f32)->vec2f { let c=cos(a);let s=sin(a);return vec2f(c*p.x-s*p.y,s*p.x+c*p.y); }
fn poly6(p:vec2f,v:array<vec2f,6>)->f32 {
  var d=1e5; var inside=false;
  for(var i=0;i<6;i++) {
    let a=v[i];let b=v[(i+1)%6];let e=b-a;let w=p-a;
    let along=clamp(dot(w,e)/max(dot(e,e),1e-8),0.0,1.0);
    d=min(d,length(w-e*along));
    if((a.y>p.y)!=(b.y>p.y)) { if(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) { inside=!inside; } }
  }
  return select(d,-d,inside);
}
// Finite local emitter, not a reflective material or a filled glyph.
// Independent face coverage and contact/front radiance; OBS is source-bound.
fn cellLight(d:f32,colour:vec3f,activeMask:f32,energized:f32)->vec4f {
  let aa=max(0.65/u.height,0.0009);
  let coverage=1.0-smoothstep(-aa,aa,d);
  let source=coverage*activeMask;
  let edge=exp(-pow(abs(d)/max(0.009,0.55/u.height),2.0))*coverage;
  let face=colour*source*(1.15+0.70*energized);
  let core=vec3f(0.83,0.98,1.0)*edge*activeMask*energized*3.4;
  let sigma=sqrt(0.016*0.016+1.0/(12.0*u.height*u.height));
  let outside=max(d,0.0);
  let halo=select(0.0,exp(-0.5*pow(outside/sigma,2.0)),outside<sigma*5.0)*activeMask*(0.16+0.36*energized)*u.observer;
  return vec4f(face+core+colour*halo,source+halo);
}
fn contactLight(p:vec2f,at:vec2f,amount:f32,colour:vec3f)->vec4f {
  let sigma=sqrt(0.008*0.008+1.0/(12.0*u.height*u.height));
  let r=length(p-at);
  let world=exp(-0.5*pow(r/sigma,2.0))*amount;
  let halo=select(0.0,exp(-0.5*pow(r/0.026,2.0)),r<0.13)*amount*u.observer;
  return vec4f(vec3f(0.91,0.99,1.0)*world*4.2+colour*halo*0.68,world+halo*0.35);
}
// One pair of interdigitating keys per side, entirely outside the central body.
// moving is the socket; both pieces keep finite thickness and genuine gaps.
fn dockDistance(p:vec2f,moving:bool,travel:f32)->f32 {
  let shift=select(0.0,travel,moving);
  let x=select(0.35,0.61,moving)+shift;
  var d=box(p-vec2f(x,0.0),vec2f(0.035,0.25));
  if(!moving) {
    for(var j=0;j<3;j++) { let y=(f32(j)-1.0)*0.18;
      d=min(d,box(p-vec2f(0.435,y),vec2f(0.085,0.039)));
      // Broad stepped key tips are shape, not a grid texture.
      d=min(d,box(p-vec2f(0.51,y+0.014),vec2f(0.022,0.025)));
    }
  } else {
    for(var j=0;j<2;j++) { let y=(f32(j)-0.5)*0.18;
      d=min(d,box(p-vec2f(0.535+shift,y),vec2f(0.075,0.045)));
      d=min(d,box(p-vec2f(0.465+shift,y-0.012),vec2f(0.023,0.029)));
    }
  }
  return d;
}
fn worldStart(p:vec2f,t:f32)->vec4f {
  var light=vec4f(0);
  let insert=ramp(0.025,0.20,t);
  let motion=mix(1.0,0.35,u.reduced);
  let travel=0.20*(1.0-insert)*motion;
  let erase=ramp(0.44,0.65,t);
  let onset=ramp(0.0,0.035,t);
  for(var s=0;s<2;s++) {
    let side=select(-1.0,1.0,s==1);
    let q=vec2f(p.x*side,p.y);
    // Registration rises from the first mating contact, rather than a global blink.
    let arrival=0.20+(q.y+0.25)*0.20;
    let registered=ramp(arrival,arrival+0.065,t);
    // The registered cells are deleted progressively towards their outer boundary.
    let eraseDistance=(0.70-q.x)*0.55-erase*0.40;
    let eraseMask=1.0-ramp(-0.012,0.012,-eraseDistance);
    let activeMask=onset*eraseMask*(1.0-ramp(0.61,0.65,t));
    let colour=mix(vec3f(0.035,0.46,0.74),vec3f(0.055,0.84,1.0),registered);
    let front=exp(-pow((t-arrival-0.027)/0.037,2.0))*insert;
    light+=cellLight(dockDistance(q,false,travel),colour,activeMask,front+0.28*registered);
    light+=cellLight(dockDistance(q,true,travel),colour,activeMask,front+0.28*registered);
    for(var j=0;j<3;j++) {
      let at=0.20+f32(j)*0.05;
      let response=ramp(at-0.008,at+0.008,t)*(1.0-ramp(at+0.07,at+0.15,t));
      let contactY=select(select(-0.135,0.135,j==2),-0.045,j==1);
      light+=contactLight(q,vec2f(0.49,contactY),response*activeMask,colour);
    }
  }
  return light;
}
// The panel silhouette is thick and faceted. A step at each keyed inner
// boundary survives H64; no fine cracks, noise carpet or decorative cell grid.
fn panelDistance(q:vec2f,row:i32)->f32 {
  if(row==0) {
    let v=array<vec2f,6>(vec2f(0.085,0.49),vec2f(0.34,0.49),vec2f(0.47,0.26),vec2f(0.47,0.155),vec2f(0.325,0.155),vec2f(0.24,0.36));
    return poly6(q,v);
  }
  if(row==2) { return panelDistanceTop(vec2f(q.x,-q.y)); }
  var d=box(q-vec2f(0.4025,0.0),vec2f(0.0675,0.155));
  // Actual key tab and notch: the topology joins before it ruptures.
  d=min(d,box(q-vec2f(0.3175,0.054),vec2f(0.033,0.038)));
  d=max(d,-box(q-vec2f(0.347,-0.057),vec2f(0.038,0.037)));
  return d;
}
fn panelDistanceTop(q:vec2f)->f32 {
  let v=array<vec2f,6>(vec2f(0.085,0.49),vec2f(0.34,0.49),vec2f(0.47,0.26),vec2f(0.47,0.155),vec2f(0.325,0.155),vec2f(0.24,0.36));
  return poly6(q,v);
}
fn cutTime(row:i32)->f32 { return select(select(0.048,0.078,row==2),0.018,row==1); }
fn worldBreak(p:vec2f,t:f32)->vec4f {
  var light=vec4f(0);
  let motion=mix(1.0,0.35,u.reduced);
  let onset=ramp(0.0,0.009,t);
  for(var sideIndex=0;sideIndex<2;sideIndex++) {
    let side=select(-1.0,1.0,sideIndex==1);
    let mirrored=vec2f(p.x*side,p.y);
    for(var row=0;row<3;row++) {
      let cut=cutTime(row);
      let open=ramp(cut,cut+0.19,t);
      let vertical=select(select(1.0,-1.0,row==2),0.0,row==1);
      let pivot=vec2f(0.37,vertical*0.28);
      let shift=vec2f(0.22*open,vertical*0.105*open)*motion;
      let q=rot(mirrored-pivot-shift,-vertical*0.16*open*motion)+pivot;
      let d=panelDistance(q,row);
      // A stair-shaped erasure front propagates through the source support.
      // Its spacing is meso-scale rather than a repeated micro grid.
      let stepY=floor((q.y+0.60)/0.095)*0.012;
      let threshold=mix(-0.12,0.62,ramp(cut+0.18,0.48,t));
      let eraseCoordinate=q.x+stepY;
      let surviving=ramp(threshold-0.009,threshold+0.009,eraseCoordinate);
      let activeMask=onset*surviving*(1.0-ramp(0.45,0.48,t));
      let front=exp(-pow((eraseCoordinate-threshold)/0.022,2.0));
      let release=exp(-pow((t-cut-0.018)/0.033,2.0));
      let seam=exp(-pow((q.x-0.335)/0.030,2.0))*release;
      light+=cellLight(d,vec3f(1.0,0.32+0.18*surviving,0.065),activeMask,front+seam*1.3);
      // Cohesion bridge is consumed by the same causal cut before separation.
      if(row!=1) {
        let jointY=vertical*0.155;
        let intact=1.0-ramp(cut-0.007,cut+0.018,t);
        let bridge=box(mirrored-vec2f(0.393,jointY),vec2f(0.052,0.036));
        light+=cellLight(bridge,vec3f(1.0,0.55,0.10),onset*intact,release*1.4);
        light+=contactLight(mirrored,vec2f(0.393,jointY),release*intact,vec3f(1.0,0.39,0.08));
      }
    }
  }
  return light;
}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f {
  let t=u.age*0.001;
  let duration=select(0.65,0.48,u.kind>0.5);
  if(t<0.0 || t>=duration || u.source<0.5) { return vec4f(0); }
  let p=vec2f(frag.x-u.center.x,u.center.y-frag.y)/u.height;
  var light=vec4f(0);
  if(u.kind<0.5) { light=worldStart(p,t); } else { light=worldBreak(p,t); }
  // Compatibility: this E is encoded once for an additive non-sRGB surface.
  // A caller HDR composition is a separate integration contract, not claimed here.
  let mapped=vec3f(1.0)-exp(-max(light.rgb,vec3f(0)));
  return vec4f(pow(mapped,vec3f(1.0/2.2)),clamp(light.a,0.0,1.0));
}
