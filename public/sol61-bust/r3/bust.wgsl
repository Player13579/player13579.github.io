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

// R2 keyed topology with R3 exact mating contact and finite-depth optical model.
fn dockDistance(p:vec2f,moving:bool,travel:f32)->f32 {
  let shift=select(0.0,travel,moving);
  let x=select(0.35,0.61,moving)+shift;
  var d=box(p-vec2f(x,0.0),vec2f(0.035,0.25));
  if(!moving) {
    for(var j=0;j<3;j++) { let y=(f32(j)-1.0)*0.18;
      d=min(d,box(p-vec2f(0.435,y),vec2f(0.085,0.045)));
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

// R3 creative medium: finite depth, self-extinction and emissive state transport.
struct Medium { extinction:vec3f, emission:vec3f, observation:vec3f }
fn emptyMedium()->Medium { return Medium(vec3f(0),vec3f(0),vec3f(0)); }
fn plusMedium(a:Medium,b:Medium)->Medium {
  return Medium(a.extinction+b.extinction,a.emission+b.emission,a.observation+b.observation);
}
fn rotateY(p:vec3f,a:f32)->vec3f { let c=cos(a);let s=sin(a);return vec3f(c*p.x+s*p.z,p.y,-s*p.x+c*p.z); }
fn rotateX(p:vec3f,a:f32)->vec3f { let c=cos(a);let s=sin(a);return vec3f(p.x,c*p.y-s*p.z,s*p.y+c*p.z); }
fn extrusion(d:f32,z:f32,halfDepth:f32)->f32 {
  let q=vec2f(d,abs(z)-halfDepth);
  return min(max(q.x,q.y),0.0)+length(max(q,vec2f(0)));
}
// x = received material state, y = transport front. Distinct from density.
fn registrationState(p:vec3f,t:f32)->vec2f {
  var received=0.0;var front=0.0;
  for(var j=0;j<3;j++) {
    let at=0.20+f32(j)*0.05;
    let contactY=select(select(-0.135,0.135,j==2),-0.045,j==1);
    let elapsed=max(t-at,0.0);
    let radius=elapsed*2.70;
    let path=length((p-vec3f(0.505,contactY,-0.018))*vec3f(0.85,1.0,1.6));
    let onset=ramp(at,at+0.012,t);
    received=max(received,(1.0-ramp(radius-0.026,radius+0.026,path))*onset);
    front=max(front,exp(-0.5*pow((path-radius)/0.036,2.0))*onset);
  }
  return vec2f(received,front);
}
fn releaseState(p:vec3f,t:f32,cut:f32,row:i32)->vec2f {
  let jointY=select(select(0.155,-0.155,row==2),0.0,row==1);
  let path=length((p-vec3f(0.413,jointY,-0.018))*vec3f(1.0,0.90,1.5));
  let radius=max(t-cut,0.0)*2.90;
  let onset=ramp(cut,cut+0.009,t);
  let released=(1.0-ramp(radius-0.030,radius+0.030,path))*onset;
  let front=exp(-0.5*pow((path-radius)/0.052,2.0))*onset;
  return vec2f(released,front);
}
// Only this function maps material/source state to optical coefficients.
// The activeMask gates the source AND its near-source observation.
fn opticalMedium(d:f32,activeMask:f32,extinction:vec3f,emission:vec3f)->Medium {
  let aa=max(0.006,0.65/u.height);
  let density=1.0-ramp(-aa,aa,d);
  let sigma=sqrt(0.016*0.016+1.0/(12.0*u.height*u.height));
  let outside=max(d,0.0);
  let psf=select(0.0,exp(-0.5*pow(outside/sigma,2.0)),outside<5.0*sigma);
  // Finite Gaussian distance-field approximation to projected local scattering.
  // Not a camera lens/ghost model and not part of the material support.
  let observation=emission*activeMask*psf*0.11*u.observer;
  return Medium(extinction*density*activeMask,emission*density*activeMask,observation);
}
fn startMedium(p:vec3f,t:f32)->Medium {
  var medium=emptyMedium();
  let insert=ramp(0.025,0.20,t);
  let motion=mix(1.0,0.35,u.reduced);
  let travel=0.20*(1.0-insert)*motion;
  let erase=ramp(0.44,0.65,t);
  let onset=ramp(0.0,0.035,t);
  for(var s=0;s<2;s++) {
    let side=select(-1.0,1.0,s==1);
    let mirrored=vec3f(p.x*side,p.y,p.z);
    // A view-relative tilt reveals the finite cross section. It settles only
    // with insertion, rather than an unrelated periodic rotation.
    let q=rotateX(rotateY(mirrored-vec3f(0.505,0,0),0.24+0.04*(1.0-insert)),0.10)+vec3f(0.505,0,0);
    let state=registrationState(q,t);
    // Spines carry a thick source volume; meeting teeth have a thinner throat.
    // This is actual support thickness, not a constant painted highlight.
    let halfDepth=0.025+0.035*clamp(abs(q.x-0.505)/0.16,0.0,1.0);
    let eraseDistance=(0.715-q.x)*0.55-erase*0.40+q.z*0.11;
    let surviving=1.0-ramp(-0.012,0.012,-eraseDistance);
    let activeMask=onset*surviving*(1.0-ramp(0.61,0.65,t));
    let colour=vec3f(0.035,0.78,1.0);
    let emission=colour*(21.0+24.0*state.x)+vec3f(0.86,0.99,1.0)*state.y*82.0;
    let inner=extrusion(dockDistance(q.xy-vec2f(0.015,0),false,travel),q.z,halfDepth);
    // The outer socket approaches through a short depth offset as well as x.
    let socketDepth=0.050*(1.0-insert)*motion;
    let outer=extrusion(dockDistance(q.xy-vec2f(0.015,0),true,travel),q.z-socketDepth,halfDepth);
    medium=plusMedium(medium,opticalMedium(inner,activeMask,vec3f(18,10,7),emission));
    medium=plusMedium(medium,opticalMedium(outer,activeMask,vec3f(18,10,7),emission));
  }
  return medium;
}
fn breakMedium(p:vec3f,t:f32)->Medium {
  var medium=emptyMedium();
  let motion=mix(1.0,0.35,u.reduced);
  let onset=ramp(0.0,0.009,t);
  for(var sideIndex=0;sideIndex<2;sideIndex++) {
    let side=select(-1.0,1.0,sideIndex==1);
    let mirrored=vec3f(p.x*side,p.y,p.z);
    for(var row=0;row<3;row++) {
      let cut=cutTime(row);
      let open=ramp(cut,cut+0.19,t);
      let vertical=select(select(1.0,-1.0,row==2),0.0,row==1);
      let pivot=vec2f(0.39,vertical*0.28);
      let shift=vec2f(0.22*open,vertical*0.105*open)*motion;
      let xy=rot(mirrored.xy-pivot-shift,-vertical*0.16*open*motion);
      let depthShift=vertical*0.040*open*motion;
      let local=rotateY(vec3f(xy,mirrored.z-depthShift),0.14+0.29*open*motion);
      let q=local+vec3f(pivot,0);
      let state=releaseState(q,t,cut,row);
      // The outer load-bearing portion is thicker than the keyed inner lip.
      let halfDepth=0.025+0.036*ramp(0.28,0.49,q.x);
      let d=extrusion(panelDistance(q.xy-vec2f(0.020,0),row),q.z,halfDepth);
      let stepY=floor((q.y+0.60)/0.095)*0.012;
      let threshold=mix(-0.12,0.64,ramp(cut+0.18,0.48,t));
      // The loss front traverses the depth too; it is not a clipped flat mask.
      let eraseCoordinate=q.x+stepY+q.z*0.26;
      let surviving=ramp(threshold-0.012,threshold+0.012,eraseCoordinate);
      let activeMask=onset*surviving*(1.0-ramp(0.45,0.48,t));
      let erasureFront=exp(-0.5*pow((eraseCoordinate-threshold)/0.023,2.0));
      let emission=vec3f(1.0,0.48,0.065)*(29.0-16.0*state.x)
        +vec3f(1.0,0.95,0.80)*(98.0*state.y+58.0*erasureFront);
      medium=plusMedium(medium,opticalMedium(d,activeMask,vec3f(6,12,24),emission));
      if(row!=1) {
        let jointY=vertical*0.155;
        let intact=1.0-ramp(cut-0.007,cut+0.018,t);
        let bridge=extrusion(box(mirrored.xy-vec2f(0.413,jointY),vec2f(0.052,0.036)),mirrored.z,0.032);
        let release=exp(-0.5*pow((t-cut-0.006)/0.020,2.0));
        let bridgeEmission=vec3f(1.0,0.52,0.10)*32.0+vec3f(1.0,0.98,0.89)*release*90.0;
        medium=plusMedium(medium,opticalMedium(bridge,onset*intact,vec3f(6,12,24),bridgeEmission));
      }
    }
  }
  return medium;
}
// Fixed deterministic depth quadrature. The original body is caller-owned.
// Internal transmittance self-occludes source depth; no image readback/2D pass.
fn integrateMedium(p:vec2f,t:f32)->vec4f {
  let sigma=sqrt(0.016*0.016+1.0/(12.0*u.height*u.height));
  let depthSource=select(0.24,0.22,u.kind>0.5);
  // Same interval for observer ON/OFF, so the world quadrature is identical.
  let depthBound=depthSource+5.0*sigma;
  let dz=(2.0*depthBound)/48.0;
  var transmittance=vec3f(1);
  var radiance=vec3f(0);
  var observation=vec3f(0);
  for(var slice=0;slice<48;slice++) {
    let z=-depthBound+(f32(slice)+0.5)*dz;
    let point=vec3f(p,z);
    var medium=emptyMedium();
    if(u.kind<0.5) { medium=startMedium(point,t); } else { medium=breakMedium(point,t); }
    let attenuation=exp(-medium.extinction*dz);
    // The stable integral also has the correct emission*dz limit at sigma=0.
    let finiteIntegral=(vec3f(1)-attenuation)/max(medium.extinction,vec3f(1e-5));
    let smallSigmaIntegral=vec3f(dz)*(vec3f(1)-0.5*medium.extinction*dz);
    let integral=select(smallSigmaIntegral,finiteIntegral,medium.extinction>vec3f(1e-3));
    radiance+=transmittance*medium.emission*integral;
    observation+=transmittance*medium.observation*dz;
    transmittance*=attenuation;
  }
  let alpha=1.0-min(min(transmittance.x,transmittance.y),transmittance.z);
  return vec4f(radiance+observation,clamp(alpha,0.0,1.0));
}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f {
  let t=u.age*0.001;
  let duration=select(0.65,0.48,u.kind>0.5);
  if(t<0.0 || t>=duration || u.source<0.5) { return vec4f(0); }
  let p=vec2f(frag.x-u.center.x,u.center.y-frag.y)/u.height;
  // Finite broad bound avoids integrating empty screen pixels. This does not
  // use the background or change the phenomenon's geometry.
  let sourceBounds=select(vec2f(0.90,0.27),vec2f(0.80,0.66),u.kind>0.5);
  let sigma=sqrt(0.016*0.016+1.0/(12.0*u.height*u.height));
  let supportBounds=sourceBounds+vec2f(5.0*sigma);
  if(any(abs(p)>supportBounds)) { return vec4f(0); }
  let light=integrateMedium(p,t);
  let mapped=vec3f(1.0)-exp(-max(light.rgb,vec3f(0)));
  return vec4f(pow(mapped,vec3f(1.0/2.2)),light.a);
}
