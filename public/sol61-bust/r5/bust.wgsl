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

// R5: body-rooted delivery trunk and unequal curved branches. All length is H.
// This is an authored finite fantasy field, not metal, plasma or body anatomy.
struct Medium { extinction:vec3f, emission:vec3f, observation:vec3f }
struct Channel { d:f32, path:f32, across:f32, depth:f32, width:f32 }
fn emptyMedium()->Medium { return Medium(vec3f(0),vec3f(0),vec3f(0)); }
fn plusMedium(a:Medium,b:Medium)->Medium { return Medium(a.extinction+b.extinction,a.emission+b.emission,a.observation+b.observation); }
fn branchPoint(s:f32,branch:i32,travel:f32)->vec3f {
  let root=vec3f(0.29,0.04,0.0);
  let control=select(vec3f(0.54,-0.12,-0.060),vec3f(0.53,0.11,0.070),branch==1);
  let tip=select(vec3f(0.34,-0.38,0.020),vec3f(0.35,0.39,0.030),branch==1);
  let point=(1.0-s)*(1.0-s)*root+2.0*(1.0-s)*s*control+s*s*tip;
  return point+vec3f(travel*s,0.0,travel*0.18*sin(3.14159265*s));
}
fn channelSegment(p:vec3f,a:vec3f,b:vec3f,w0:f32,w1:f32,depth:f32,offset:f32)->Channel {
  let e=b.xy-a.xy;let len=length(e);let axis=e/len;
  let along=dot(p.xy-a.xy,axis);let h=clamp(along/len,0.0,1.0);
  let delta=p-mix(a,b,h);let across=dot(delta.xy,vec2f(-axis.y,axis.x));
  let width=mix(w0,w1,h);
  // Independent depth and width; finite rounded end rather than extruded fill.
  let d=length(vec3f(dot(delta.xy,axis),across,delta.z*width/depth))-width;
  return Channel(d,offset+h*len,across,delta.z,width);
}
fn channelAt(p:vec3f,branch:i32,travel:f32)->Channel {
  if(branch==0) { return channelSegment(p,vec3f(0.16,0.04,0),vec3f(0.29,0.04,0),0.026,0.043,0.055,0.0); }
  var closest=Channel(10.0,0.0,0.0,0.0,0.0);var offset=0.0;
  for(var segment=0;segment<5;segment++) {
    let s=f32(segment)/5.0;let next=f32(segment+1)/5.0;
    let a=branchPoint(s,branch,travel);let b=branchPoint(next,branch,travel);
    // Broad middle transports a readable front; the free end is genuinely tapered.
    let w0=0.043+0.018*sin(3.14159265*s)-0.025*s*s;
    let w1=0.043+0.018*sin(3.14159265*next)-0.025*next*next;
    let cell=channelSegment(p,a,b,w0,w1,0.075-0.030*s,offset);
    if(cell.d<closest.d) { closest=cell; }
    offset+=length(b.xy-a.xy);
  }
  return closest;
}
fn admissionTime(branch:i32)->f32 { return 0.20+f32(branch)*0.05; }
fn cutTime(branch:i32)->f32 { return select(select(0.048,0.078,branch==2),0.018,branch==0); }
fn frontState(path:f32,t:f32,at:f32,speed:f32)->vec2f {
  let radius=max(t-at,0.0)*speed;let onset=ramp(at,at+0.012,t);
  return vec2f((1.0-ramp(radius-0.021,radius+0.021,path))*onset,exp(-0.5*pow((path-radius)/0.028,2.0))*onset);
}
fn opticalMedium(d:f32,mask:f32,extinction:vec3f,emission:vec3f)->Medium {
  let aa=max(0.0035,0.48/u.height);let density=1.0-ramp(-aa,aa,d);
  let sigma=sqrt(0.011*0.011+1.0/(12.0*u.height*u.height));let outside=max(d,0.0);
  // Only source radiance spreads; unlike R4 this does not add another uniformly
  // bright volume throughout the coloured carrier. Observer OFF preserves PH.
  let psf=select(0.0,exp(-0.5*pow(outside/sigma,2.0))*(1.0-density),outside<5.0*sigma);
  return Medium(extinction*density*mask,emission*density*mask,emission*mask*psf*0.075*u.observer);
}
fn localEnergy(cell:Channel,t:f32,branch:i32)->Medium {
  let state=frontState(cell.path,t,admissionTime(branch),2.70);
  let sinceArrival=max(t-admissionTime(branch)-cell.path/2.70,0.0);
  // A steep luminous leading front and a finite, slower registered wake.
  // Thickness is NOT correlated with emission; the carrier keeps its darker rind.
  let stored=state.x*(0.26+0.74*exp(-sinceArrival/0.105));
  let rind=vec3f(0.010,0.21,0.43)*(2.0+3.5*stored);
  var material=opticalMedium(cell.d,1.0,vec3f(17,8,3.5),rind);
  let normalizedAcross=cell.across/max(cell.width,0.001);
  let bore=length(vec2f(normalizedAcross*cell.width/0.42,cell.depth*cell.width/0.032))-cell.width;
  let coreDistance=max(cell.d,bore);
  let emission=vec3f(0.018,0.62,1.0)*(16.0*stored)+vec3f(0.78,0.96,1.0)*(265.0*state.y);
  material=plusMedium(material,opticalMedium(coreDistance,1.0,vec3f(4,2,1),emission));
  return material;
}
fn scaleMedium(m:Medium,mask:f32)->Medium { return Medium(m.extinction*mask,m.emission*mask,m.observation*mask); }
fn startMedium(p:vec3f,t:f32)->Medium {
  var medium=emptyMedium();let insertion=ramp(0.025,0.20,t);let motion=mix(1.0,0.35,u.reduced);
  let travel=0.20*(1.0-insertion)*motion;let onset=ramp(0.0,0.035,t);let erase=ramp(0.44,0.65,t);
  for(var sideIndex=0;sideIndex<2;sideIndex++) {
    let side=select(-1.0,1.0,sideIndex==1);let q=vec3f(p.x*side,p.y,p.z);
    for(var branch=0;branch<3;branch++) {
      let cell=channelAt(q,branch,travel);let fullPath=cell.path+select(0.13,0.0,branch==0);
      // Erasure advances FROM the receiving root through the same network.
      let survive=ramp(0.64*erase-0.015,0.64*erase+0.015,fullPath+0.035);
      let mask=onset*survive*(1.0-ramp(0.63,0.65,t));
      medium=plusMedium(medium,scaleMedium(localEnergy(cell,t,branch),mask));
    }
  }
  return medium;
}
fn breakMedium(p:vec3f,t:f32)->Medium {
  var medium=emptyMedium();let motion=mix(1.0,0.35,u.reduced);let onset=ramp(0.0,0.009,t);
  for(var sideIndex=0;sideIndex<2;sideIndex++) {
    let side=select(-1.0,1.0,sideIndex==1);let mirrored=vec3f(p.x*side,p.y,p.z);
    for(var branch=0;branch<3;branch++) {
      let cut=cutTime(branch);let open=ramp(cut,cut+0.19,t);
      let signY=select(select(1.0,-1.0,branch==2),0.0,branch==0);
      // The root first disconnects; only the admitted branch then recoils.
      let q=mirrored-vec3f(0.12*open,signY*0.052*open,signY*0.040*open)*motion;
      let cell=channelAt(q,branch,0.0);let site=select(0.120,0.065,branch==0);
      let distance=abs(cell.path-site);let state=frontState(distance,t,cut,2.90);
      let gap=0.047*open;
      // Transverse missing support: true severing, not two coloured parallel lines.
      let severedDistance=max(cell.d,gap-abs(cell.path-site));
      let sinceArrival=max(t-cut-distance/2.90,0.0);let energy=state.x*exp(-sinceArrival/0.070);
      let erase=ramp(cut+0.18,0.48,t);let maxPath=select(0.56,0.13,branch==0);
      let survive=ramp(erase*(maxPath+0.09)-0.045,erase*(maxPath+0.09)-0.015,cell.path);
      let mask=onset*survive*(1.0-ramp(0.46,0.48,t));
      // State colour changes only AFTER local loss arrives; no instant amber repaint.
      let cool=vec3f(0.010,0.25,0.52);let released=vec3f(1.0,0.25,0.015);
      let rind=mix(cool,released,state.x)*(3.0+7.0*energy);
      medium=plusMedium(medium,opticalMedium(severedDistance,mask,vec3f(17,8,3.5),rind));
      let bore=length(vec2f(cell.across/0.42,cell.depth*cell.width/0.032))-cell.width;
      let coreDistance=max(severedDistance,bore);
      let cutEdge=exp(-0.5*pow((abs(cell.path-site)-gap)/0.018,2.0))*open*exp(-max(t-cut,0.0)/0.11);
      let light=released*(58.0*energy)+vec3f(1.0,0.94,0.78)*(275.0*state.y+130.0*cutEdge);
      medium=plusMedium(medium,opticalMedium(coreDistance,mask,vec3f(4,2,1),light));
    }
  }
  return medium;
}
fn integrateMedium(p:vec2f,t:f32)->vec4f {
  let sigma=sqrt(0.011*0.011+1.0/(12.0*u.height*u.height));let bound=0.25+5.0*sigma;let dz=2.0*bound/48.0;
  var transmission=vec3f(1);var radiance=vec3f(0);var observation=vec3f(0);
  for(var slice=0;slice<48;slice++) {
    let point=vec3f(p,-bound+(f32(slice)+0.5)*dz);var material=emptyMedium();
    if(u.kind<0.5) { material=startMedium(point,t); } else { material=breakMedium(point,t); }
    let attenuation=exp(-material.extinction*dz);
    let finiteIntegral=(vec3f(1)-attenuation)/max(material.extinction,vec3f(1e-5));
    let smallIntegral=vec3f(dz)*(vec3f(1)-0.5*material.extinction*dz);
    let integral=select(smallIntegral,finiteIntegral,material.extinction>vec3f(1e-3));
    radiance+=transmission*material.emission*integral;observation+=transmission*material.observation*dz;transmission*=attenuation;
  }
  return vec4f(radiance+observation,clamp(1.0-min(min(transmission.x,transmission.y),transmission.z),0.0,1.0));
}
fn sparklePSF(delta:vec2f,extent:f32)->f32 {
  if(length(delta)>0.12) { return 0.0; }
  let v=rot(delta,-0.36);let width=sqrt(0.0045*0.0045+0.42*0.42/(u.height*u.height));
  return (exp(-0.5*pow(v.y/width,2.0)-abs(v.x)/extent)+exp(-0.5*pow(v.x/width,2.0)-abs(v.y)/(extent*0.76)))*(1.0-ramp(0.10,0.12,length(delta)));
}
fn startSparkle(p:vec2f,t:f32)->vec3f {
  if(u.observer<0.5) { return vec3f(0); }
  var response=vec3f(0);
  for(var branch=0;branch<3;branch++) {
    for(var pulseIndex=0;pulseIndex<2;pulseIndex++) {
      // Source lies ON the same piecewise curve and its actual travelling front.
      let s=select(0.30,0.68,pulseIndex==1);var source=vec3f(0);var path=0.0;
      if(branch==0) { source=vec3f(0.16+0.13*s,0.04,0);path=0.13*s; }
      else {
        let piece=min(i32(floor(s*5.0)),4);let h=s*5.0-f32(piece);
        for(var segment=0;segment<5;segment++) {
          let a=branchPoint(f32(segment)/5.0,branch,0.0);let b=branchPoint(f32(segment+1)/5.0,branch,0.0);
          if(segment<piece) { path+=length(b.xy-a.xy); }
          if(segment==piece) { source=mix(a,b,h);path+=h*length(b.xy-a.xy); }
        }
      }
      let at=admissionTime(branch)+path/2.70;let phase=(t-at)/0.020;
      if(abs(phase)>3.0) { continue; }
      let pulse=exp(-0.5*phase*phase)*ramp(admissionTime(branch),admissionTime(branch)+0.012,t);
      for(var sideIndex=0;sideIndex<2;sideIndex++) {
        let side=select(-1.0,1.0,sideIndex==1);
        response+=vec3f(0.70,0.95,1.0)*pulse*0.92*sparklePSF(p-vec2f(source.x*side,source.y),0.029);
      }
    }
  }
  return response;
}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f {
  let t=u.age*0.001;let duration=select(0.65,0.48,u.kind>0.5);
  if(t<0.0 || t>=duration || u.source<0.5) { return vec4f(0); }
  let p=vec2f(frag.x-u.center.x,u.center.y-frag.y)/u.height;
  let sourceBounds=select(vec2f(0.72,0.50),vec2f(0.67,0.55),u.kind>0.5);
  let sigma=sqrt(0.011*0.011+1.0/(12.0*u.height*u.height));let spread=max(5.0*sigma,select(0.12,0.0,u.kind>0.5));
  if(any(abs(p)>sourceBounds+vec2f(spread))) { return vec4f(0); }
  let light=integrateMedium(p,t);var radiance=light.rgb;
  if(u.kind<0.5) { radiance+=startSparkle(p,t); }
  let mapped=vec3f(1)-exp(-max(radiance,vec3f(0)));
  return vec4f(pow(mapped,vec3f(1.0/2.2)),light.a);
}
