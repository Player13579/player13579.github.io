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

// R4: swept finite cells, distinct carrier/core support and path-bound release.
// Fantasy field coefficients are chosen design values, not measured matter.
struct Medium { extinction:vec3f, emission:vec3f, observation:vec3f }
struct Cell { d:f32, path:f32, across:f32, depth:f32 }
fn emptyMedium()->Medium { return Medium(vec3f(0),vec3f(0),vec3f(0)); }
fn plusMedium(a:Medium,b:Medium)->Medium { return Medium(a.extinction+b.extinction,a.emission+b.emission,a.observation+b.observation); }
fn rotateY(p:vec3f,a:f32)->vec3f { let c=cos(a);let s=sin(a);return vec3f(c*p.x+s*p.z,p.y,-s*p.x+c*p.z); }
fn rotateX(p:vec3f,a:f32)->vec3f { let c=cos(a);let s=sin(a);return vec3f(p.x,c*p.y-s*p.z,s*p.y+c*p.z); }
// A genuinely varying three-dimensional cross section. It is not extrusion of
// a flat filled polygon. Slightly faceted superellipse retains a broad keel.
fn sweptCell(p:vec3f,a:vec3f,b:vec3f,width:f32,depth:f32)->Cell {
  let e=b.xy-a.xy;let len=length(e);let axis=e/len;
  let along=dot(p.xy-a.xy,axis);let h=clamp(along/len,0.0,1.0);
  let center=mix(a,b,h);let delta=p-center;
  let across=dot(delta.xy,vec2f(-axis.y,axis.x));
  let taper=0.74+0.26*sin(3.14159265*h);
  let w=width*taper;let z=delta.z*w/depth;
  let roundDistance=length(vec3f(delta.xy,z));
  let facetDistance=(abs(dot(delta.xy,axis))+abs(across)+abs(z))*0.73;
  let d=mix(roundDistance,facetDistance,0.32)-w;
  return Cell(d,h*len,across,delta.z);
}
fn chooseCell(a:Cell,b:Cell,offset:f32)->Cell {
  if(a.d<b.d) { return a; }
  return Cell(b.d,b.path+offset,b.across,b.depth);
}
fn cutTime(row:i32)->f32 { return select(select(0.048,0.078,row==2),0.018,row==1); }
fn registrationState(path:f32,t:f32,row:i32)->vec2f {
  let at=0.20+f32(row)*0.05;let radius=max(t-at,0.0)*2.70;
  let onset=ramp(at,at+0.012,t);
  return vec2f((1.0-ramp(radius-0.026,radius+0.026,path))*onset,exp(-0.5*pow((path-radius)/0.022,2.0))*onset);
}
fn releaseState(path:f32,t:f32,cut:f32)->vec2f {
  let radius=max(t-cut,0.0)*2.90;let onset=ramp(cut,cut+0.009,t);
  return vec2f((1.0-ramp(radius-0.030,radius+0.030,path))*onset,exp(-0.5*pow((path-radius)/0.028,2.0))*onset);
}
fn opticalMedium(d:f32,activeMask:f32,extinction:vec3f,emission:vec3f)->Medium {
  let aa=max(0.0045,0.52/u.height);
  let density=1.0-ramp(-aa,aa,d);
  let sigma=sqrt(0.016*0.016+1.0/(12.0*u.height*u.height));
  let outside=max(d,0.0);
  let psf=select(0.0,exp(-0.5*pow(outside/sigma,2.0)),outside<5.0*sigma);
  // Same source coefficient and active support; this local PSF approximation
  // has no independent flash or lens ghost. Observer OFF leaves world intact.
  return Medium(extinction*density*activeMask,emission*density*activeMask,emission*activeMask*psf*0.11*u.observer);
}
fn startMedium(p:vec3f,t:f32)->Medium {
  var medium=emptyMedium();let insert=ramp(0.025,0.20,t);
  let motion=mix(1.0,0.35,u.reduced);let travel=0.20*(1.0-insert)*motion;
  let erase=ramp(0.44,0.65,t);let onset=ramp(0.0,0.035,t);
  for(var sideIndex=0;sideIndex<2;sideIndex++) {
    let side=select(-1.0,1.0,sideIndex==1);let mirrored=vec3f(p.x*side,p.y,p.z);
    for(var row=0;row<3;row++) {
      let y=(f32(row)-1.0)*0.18;let pivot=vec3f(0.5335989492,y,0);
      let q=rotateX(rotateY(mirrored-pivot,0.38+0.06*(1.0-insert)),0.12)+pivot;
      let offset=0.055*(1.0-insert)*motion;
      let a=vec3f(0.414,y,0.004);let b=vec3f(0.485,y,0);
      let c=vec3f(0.5862478109+travel,y,offset);let d=vec3f(0.705+travel,y,offset-0.004);
      let inner=sweptCell(q,a,b,0.060,0.075);
      let outer=sweptCell(q,c,d,0.065,0.080);
      // Interruption between rows is structural negative space, no pillar.
      let cell=chooseCell(inner,outer,0.0);
      let path=abs(q.x-0.5335989492);
      let state=registrationState(path,t,row);
      let threshold=mix(1.08,0.30,erase);
      let coordinate=q.x+0.18*q.z+0.07*(q.y-y);
      let surviving=1.0-ramp(threshold-0.013,threshold+0.013,coordinate);
      let activeMask=onset*surviving*(1.0-ramp(0.63,0.65,t));
      // Carrier and internal channel are different volumes, not one emissive
      // slab whose Euclidean wave paints the entire lower face white.
      let colour=vec3f(0.018,0.68,1.0);
      let shellEmission=colour*(7.0+5.0*state.x);
      medium=plusMedium(medium,opticalMedium(cell.d,activeMask,vec3f(14,8,5),shellEmission));
      let coreInner=sweptCell(q,a,b,0.025,0.030);
      let coreOuter=sweptCell(q,c,d,0.025,0.030);
      let coreDistance=chooseCell(coreInner,coreOuter,0.0).d;
      let at=0.20+f32(row)*0.05;
      let transportPulse=max(exp(-0.5*pow((t-at-0.040)/0.010,2.0)),exp(-0.5*pow((t-at-0.062)/0.010,2.0)));
      let sourceEmission=colour*(24.0+62.0*state.x)+vec3f(0.86,0.98,1.0)*(60.0+210.0*transportPulse)*state.y;
      medium=plusMedium(medium,opticalMedium(coreDistance,activeMask,vec3f(5,3,2),sourceEmission));
      // Only actual mating support receives this finite contact light. It is
      // short, depth-bound and row-bound; never the character or a white plate.
      let contact=ramp(0.19,0.20,t)*exp(-0.5*pow((t-(0.20+f32(row)*0.05)-0.012)/0.024,2.0));
      let joint=length((q-vec3f(0.5335989492,y,0))*vec3f(1.0,1.0,1.25))-0.027;
      medium=plusMedium(medium,opticalMedium(joint,activeMask*contact,vec3f(4,3,2),vec3f(0.82,0.98,1.0)*160.0));
    }
  }
  return medium;
}
fn ruptureCell(q:vec3f,row:i32,width:f32,depth:f32)->Cell {
  if(row==1) {
    // Path zero is the actual central rupture site, branching up and down.
    let a=vec3f(0.435,0,0);let b=vec3f(0.435,0.112,0.018);
    let qp=vec3f(q.x,abs(q.y),q.z);
    return sweptCell(qp,a,b,width,depth);
  }
  let signY=select(1.0,-1.0,row==2);let qp=vec3f(q.x,q.y*signY,q.z);
  let a=vec3f(0.435,0.175,-0.018);let b=vec3f(0.398,0.345,0.025);let c=vec3f(0.267,0.530,-0.014);
  return chooseCell(sweptCell(qp,a,b,width,depth),sweptCell(qp,b,c,width*0.88,depth*0.90),length(b.xy-a.xy));
}
fn breakMedium(p:vec3f,t:f32)->Medium {
  var medium=emptyMedium();let motion=mix(1.0,0.35,u.reduced);let onset=ramp(0.0,0.009,t);
  for(var sideIndex=0;sideIndex<2;sideIndex++) {
    let side=select(-1.0,1.0,sideIndex==1);let mirrored=vec3f(p.x*side,p.y,p.z);
    for(var row=0;row<3;row++) {
      let cut=cutTime(row);let open=ramp(cut,cut+0.19,t);
      let vertical=select(select(1.0,-1.0,row==2),0.0,row==1);let pivot=vec2f(0.39,vertical*0.28);
      let shift=vec2f(0.22*open,vertical*0.105*open)*motion;
      let xy=rot(mirrored.xy-pivot-shift,-vertical*0.16*open*motion);
      let local=rotateY(vec3f(xy,mirrored.z-vertical*0.040*open*motion),0.14+0.29*open*motion);
      let q=local+vec3f(pivot,0);
      let cell=ruptureCell(q,row,0.066,0.080);let state=releaseState(cell.path,t,cut);
      // The propagating rupture opens real negative space behind its front.
      // The banks remain finite glowing field domains, not spawned debris.
      let gap=0.025*state.x*ramp(cut+0.015,cut+0.090,t);
      let splitDistance=max(cell.d,gap-abs(cell.across));
      let endPath=select(0.402,0.112,row==1);
      let erase=ramp(cut+0.18,0.48,t);let threshold=mix(-0.080,endPath+0.10,erase);
      let eraseCoordinate=cell.path+0.14*cell.depth;
      let surviving=ramp(threshold-0.018,threshold+0.018,eraseCoordinate);
      let activeMask=onset*surviving*(1.0-ramp(0.46,0.48,t));
      let colour=vec3f(1.0,0.34,0.025);
      let shellEmission=colour*(12.0-5.0*state.x);
      medium=plusMedium(medium,opticalMedium(splitDistance,activeMask,vec3f(5,9,18),shellEmission));
      // Light is tied to two newly released banks. It propagates inside the
      // same cross section and is absorbed through the remaining carrier.
      let bankDistance=max(cell.d,length(vec2f(abs(cell.across)-(gap+0.010),cell.depth*0.70))-0.020);
      let sinceArrival=max(t-cut-cell.path/2.90,0.0);
      let releasedEnergy=state.x*exp(-sinceArrival/0.055);
      let erasureFront=exp(-0.5*pow((eraseCoordinate-threshold)/0.019,2.0));
      let emission=colour*(22.0+125.0*releasedEnergy)+vec3f(1.0,0.93,0.72)*(230.0*state.y+95.0*erasureFront);
      medium=plusMedium(medium,opticalMedium(bankDistance,activeMask,vec3f(2,3,5),emission));
      // The two short initial necks use the same finite field, disappearing
      // with their local cut. No persistent connector is left behind.
      if(row!=1) {
        let intact=1.0-ramp(cut-0.004,cut+0.009,t);
        let neck=sweptCell(mirrored,vec3f(0.435,vertical*0.112,0),vec3f(0.435,vertical*0.175,0),0.039,0.048);
        let impulse=exp(-0.5*pow((t-cut-0.003)/0.012,2.0));
        medium=plusMedium(medium,opticalMedium(neck.d,onset*intact,vec3f(5,9,18),colour*18.0+vec3f(1.0,0.93,0.72)*180.0*impulse));
      }
    }
  }
  return medium;
}
fn integrateMedium(p:vec2f,t:f32)->vec4f {
  let sigma=sqrt(0.016*0.016+1.0/(12.0*u.height*u.height));
  let depthSource=select(0.35,0.30,u.kind>0.5);let depthBound=depthSource+5.0*sigma;let dz=2.0*depthBound/48.0;
  var transmittance=vec3f(1);var radiance=vec3f(0);var observation=vec3f(0);
  for(var slice=0;slice<48;slice++) {
    let z=-depthBound+(f32(slice)+0.5)*dz;let point=vec3f(p,z);var medium=emptyMedium();
    if(u.kind<0.5) { medium=startMedium(point,t); } else { medium=breakMedium(point,t); }
    let attenuation=exp(-medium.extinction*dz);
    let finiteIntegral=(vec3f(1)-attenuation)/max(medium.extinction,vec3f(1e-5));
    let smallSigmaIntegral=vec3f(dz)*(vec3f(1)-0.5*medium.extinction*dz);
    let integral=select(smallSigmaIntegral,finiteIntegral,medium.extinction>vec3f(1e-3));
    radiance+=transmittance*medium.emission*integral;observation+=transmittance*medium.observation*dz;transmittance*=attenuation;
  }
  return vec4f(radiance+observation,clamp(1.0-min(min(transmittance.x,transmittance.y),transmittance.z),0.0,1.0));
}
// Source-bound optical sparkle, fixed cross-axis angle for this E. Continuous
// PSF radiance with finite tails; no filled star, triangle or polygon arms.
fn sparklePSF(delta:vec2f,extent:f32)->f32 {
  if(length(delta)>0.17) { return 0.0; }
  let v=rot(delta,-0.36);let width=sqrt(0.007*0.007+0.45*0.45/(u.height*u.height));
  let first=exp(-0.5*pow(v.y/width,2.0)-abs(v.x)/extent);
  let second=exp(-0.5*pow(v.x/width,2.0)-abs(v.y)/(extent*0.76));
  return (first+second)*(1.0-ramp(0.145,0.17,length(delta)));
}
fn startSparkle(p:vec2f,t:f32)->vec3f {
  if(u.observer<0.5) { return vec3f(0); }
  let insert=ramp(0.025,0.20,t);var response=vec3f(0);
  for(var row=0;row<3;row++) {
    let at=0.20+f32(row)*0.05;let y=(f32(row)-1.0)*0.18;
    for(var peak=0;peak<3;peak++) {
      let delay=select(select(0.012,0.062,peak==2),0.040,peak==1);
      let width=select(0.010,0.024,peak==0);
      let phase=(t-at-delay)/width;
      if(abs(phase)>3.0) { continue; }
      let pulse=exp(-0.5*phase*phase)*ramp(at,at+0.012,t);
      // Contact impulse is stationary. The next two pulses ride the same
      // propagating channel front that emits in the world volume.
      let direction=select(-1.0,1.0,peak==2);
      let distance=select(max(t-at,0.0)*2.70,0.0,peak==0);
      let sourceX=0.5335989492+direction*distance;
      // Never invent a source outside the actual core's material interval.
      if(peak==1 && (sourceX<0.394 || sourceX>0.506)) { continue; }
      if(peak==2 && (sourceX<0.566 || sourceX>0.726)) { continue; }
      let sourceZ=select(select(0.004*(0.485-sourceX)/(0.485-0.414),-0.004*(sourceX-0.5862478109)/(0.705-0.5862478109),peak==2),0.0,peak==0);
      let local=rotateY(rotateX(vec3f(sourceX-0.5335989492,0,sourceZ),-0.12),-(0.38+0.06*(1.0-insert)));
      for(var sideIndex=0;sideIndex<2;sideIndex++) {
        let side=select(-1.0,1.0,sideIndex==1);let projected=vec2f((local.x+0.5335989492)*side,local.y+y);
        let strength=select(select(0.64,0.60,peak==2),0.48,peak==1);
        response+=vec3f(0.70,0.95,1.0)*pulse*strength*sparklePSF(p-projected,select(0.038,0.046,peak==0));
      }
    }
  }
  return response;
}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f {
  let t=u.age*0.001;let duration=select(0.65,0.48,u.kind>0.5);
  if(t<0.0 || t>=duration || u.source<0.5) { return vec4f(0); }
  let p=vec2f(frag.x-u.center.x,u.center.y-frag.y)/u.height;
  let sourceBounds=select(vec2f(1.00,0.29),vec2f(0.85,0.78),u.kind>0.5);
  let sigma=sqrt(0.016*0.016+1.0/(12.0*u.height*u.height));let spread=select(max(5.0*sigma,0.17),5.0*sigma,u.kind>0.5);let supportBounds=sourceBounds+vec2f(spread);
  if(any(abs(p)>supportBounds)) { return vec4f(0); }
  let light=integrateMedium(p,t);var radiance=light.rgb;
  if(u.kind<0.5) { radiance+=startSparkle(p,t); }
  let mapped=vec3f(1.0)-exp(-max(radiance,vec3f(0)));
  return vec4f(pow(mapped,vec3f(1.0/2.2)),light.a);
}
