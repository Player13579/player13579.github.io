struct Uniforms { viewport:vec4f, anchor:vec4f, gates:vec4f, reserve:vec4f }
@group(0) @binding(0) var<uniform> u:Uniforms;
struct VertexOut { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) index:u32)->VertexOut {
  var positions=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var result:VertexOut; result.position=vec4f(positions[index],0.,1.); return result;
}
// Distance and longitudinal coordinate in one finite field section.
fn section(p:vec2f,a:vec2f,b:vec2f)->vec2f {
  let ab=b-a;
  let along=clamp(dot(p-a,ab)/max(dot(ab,ab),.00001),0.,1.);
  return vec2f(length(p-a-ab*along),along);
}
// A graded excited volume, not a solid surface or a constant-width outline.
fn density(distance:f32,halfWidth:f32,aa:f32)->f32 {
  let edge=1.-smoothstep(halfWidth-aa,halfWidth+aa,distance);
  let crossSection=exp(-2.4*pow(distance/max(halfWidth,.001),2.));
  return edge*crossSection;
}
@fragment fn fs(in:VertexOut)->@location(0) vec4f {
  if(u.gates.x<.5 || u.viewport.w<0. || u.viewport.w>=u.anchor.z){return vec4f(0.);}
  let phase=u.viewport.w/u.anchor.z;
  let rise=smoothstep(0.,.12,phase);
  let release=1.-smoothstep(.90,1.,phase);
  let envelope=rise*release;
  let p=(in.position.xy-u.anchor.xy)/u.viewport.z;
  let aa=.65/u.viewport.z;
  let advance=u.reserve.x;
  let fieldProgress=select(advance,.65,u.gates.z>.5);
  var coverage=0.; var radiance=vec3f(0.);
  if(u.anchor.w<.5) {
    // Desire: compressible oblique folds feed inward; excitation stays in the folds.
    for(var side=-1.;side<=1.;side+=2.) {
      let q=vec2f(p.x*side,p.y);
      let a=vec2f(.36-.10*fieldProgress,-.28+.025*fieldProgress);
      let b=vec2f(.20-.055*fieldProgress,-.11);
      let c=vec2f(.055,-.035);
      let outer=section(q,a,b); let inner=section(q,b,c);
      let useInner=inner.x<outer.x;
      let d=select(outer.x,inner.x,useInner);
      let along=select(outer.y*.55,.55+inner.y*.45,useInner);
      let width=mix(.055,.094,sin(along*3.14159265));
      let rho=density(d,width,aa);
      let termination=.35+.65*sin(clamp(along,.02,.98)*3.14159265);
      let retardedGate=smoothstep(along-.10,along+.035,advance)*(1.-smoothstep(along-.06,along+.14,u.reserve.y));
      let front=exp(-pow((along-advance)/.16,2.));
      let center=exp(-pow(d/(width*.29),2.));
      // The narrow high-energy core is localized at the inward advancing front.
      let emission=(vec3f(1.,.20,.035)*rho*(.8+1.15*front)+vec3f(1.7,.95,.43)*rho*center*front)*termination*retardedGate;
      coverage=max(coverage,rho*termination*retardedGate);
      radiance+=emission;
    }
  } else if(u.anchor.w<1.5) {
    // Grit: a tapered load-bearing state column with broad seated field buttresses.
    let tip=-.10-.23*fieldProgress;
    let axial=section(p,vec2f(0.,.075),vec2f(0.,tip));
    let axialWidth=mix(.079,.038,axial.y);
    let axialRho=density(axial.x,axialWidth,aa);
    let axialGate=smoothstep(axial.y-.12,axial.y+.04,advance)*(1.-smoothstep(axial.y-.05,axial.y+.14,u.reserve.y));
    let axialFront=exp(-pow((axial.y-advance)/.18,2.));
    coverage=axialRho*axialGate;
    radiance=vec3f(.055,.29,1.)*axialRho*(.85+.9*axialFront)+vec3f(.45,.9,1.8)*axialRho*axialFront;
    radiance*=axialGate;
    for(var row=0.;row<3.;row+=1.) {
      let y=.045-row*.103-.025*fieldProgress;
      let seat=smoothstep(row*.12,row*.12+.18,phase);
      for(var side=-1.;side<=1.;side+=2.) {
        let q=vec2f(p.x*side,p.y);
        let outer=section(q,vec2f(.255,y+.05),vec2f(.15,y-.035));
        let inner=section(q,vec2f(.15,y-.035),vec2f(.025,y-.035));
        let useInner=inner.x<outer.x;
        let along=select(outer.y*.52,.52+inner.y*.48,useInner);
        let d=select(outer.x,inner.x,useInner);
        let width=mix(.041,.067,along);
        let rowGate=smoothstep(along-.11,along+.035,advance)*(1.-smoothstep(along-.05,along+.14,u.reserve.y));
        let rho=density(d,width,aa)*seat*rowGate;
        let seatedFront=exp(-pow((along-fieldProgress)/.23,2.));
        let shoulder=exp(-pow((d-width*.4)/(width*.3),2.));
        let rowEnergy=.9-row*.16;
        coverage=max(coverage,rho);
        radiance+=vec3f(.055,.35,1.)*rho*rowEnergy*(.75+.95*seatedFront)+vec3f(.3,.85,1.4)*rho*shoulder*seatedFront*.65;
      }
    }
  } else {
    // Rational: six discrete field packets resolve and carry ordered internal excitation.
    for(var side=-1.;side<=1.;side+=2.) {
      for(var row=0.;row<3.;row+=1.) {
        let q=vec2f(p.x*side,p.y);
        let y=-.29+row*.115;
        let spread=.085*(1.-fieldProgress)*(row-1.);
        let a=vec2f(.36+spread,y-.047*(1.-fieldProgress));
        let b=vec2f(.215,y);
        let c=vec2f(.068,y+.041);
        let outer=section(q,a,b); let inner=section(q,b,c);
        let useInner=inner.x<outer.x;
        let along=select(outer.y*.5,.5+inner.y*.5,useInner);
        let d=select(outer.x,inner.x,useInner);
        // Broad middle and tapered endpoints preserve packet separation and empty gaps.
        let width=.030+.024*sin(along*3.14159265);
        let rho=density(d,width,aa);
        let orderedProgress=smoothstep(0.,.40+row*.09,phase);
        let orderedGate=smoothstep(along-.09,along+.025,orderedProgress)*(1.-smoothstep(along-.04,along+.13,u.reserve.y));
        let front=exp(-pow((along-orderedProgress)/.18,2.));
        let lowerFace=clamp((q.y-y)/.075,0.,1.);
        let taper=.4+.6*sin(clamp(along,.015,.985)*3.14159265);
        coverage=max(coverage,rho*taper*orderedGate);
        radiance+=(vec3f(.025,.78,.39)*rho*(.65+.3*lowerFace)+vec3f(.25,1.55,1.05)*rho*front)*taper*orderedGate;
      }
    }
  }
  // R5 receiving domains start only once the advancing excitation arrives.
  // They are finite fictional state fields, not objects or invented gameplay gains.
  var receiverCenter=vec2f(0.,-.035); var receiverShape=vec2f(.12,.075);
  var receiverColor=vec3f(1.4,.45,.08);
  if(u.anchor.w>.5 && u.anchor.w<1.5){receiverCenter=vec2f(0.,-.17);receiverShape=vec2f(.075,.16);receiverColor=vec3f(.15,.65,1.5);}
  if(u.anchor.w<1.5){
    let distance=length((p-receiverCenter)/receiverShape);
    let domain=(1.-smoothstep(.68,1.0,distance))*exp(-distance*distance*1.7)*u.reserve.z;
    radiance+=receiverColor*domain*(1.05+.45*(1.-u.reserve.y));
    coverage=max(coverage,domain);
  } else {
    for(var row=0.;row<3.;row+=1.) {
      let center=vec2f(0.,-.249+row*.115);
      let arrival=.40+row*.09;
      let seated=smoothstep(arrival,arrival+.07,phase)*(1.-smoothstep(.90,1.,phase));
      let d=length((p-center)/vec2f(.09,.041));
      let domain=(1.-smoothstep(.65,1.,d))*exp(-d*d*1.5)*seated;
      radiance+=vec3f(.05,1.25,.63)*domain;coverage=max(coverage,domain);
    }
  }
  // Sparse fixed-angle crosses at the receiving contacts, never in free space.
  if(u.reserve.w>.5) {
    for(var k=0.;k<3.;k+=1.) {
      var center=vec2f((k-1.)*.078,-.035);
      var arrival=.44+abs(k-1.)*.025;
      if(u.anchor.w>.5 && u.anchor.w<1.5){center=vec2f((k-1.)*.04,-.17-(k-1.)*.074);arrival=.52+abs(k-1.)*.025;}
      if(u.anchor.w>1.5){center=vec2f(0.,-.249+k*.115);arrival=.40+k*.09;}
      let pulse=smoothstep(arrival,arrival+.018,phase)*(1.-smoothstep(arrival+.06,arrival+.13,phase));
      let delta=p-center;
      let rotated=vec2f(delta.x*.9238795+delta.y*.3826834,-delta.x*.3826834+delta.y*.9238795);
      let arms=max(exp(-pow(rotated.x/.033,2.)-pow(rotated.y/.0065,2.)),exp(-pow(rotated.y/.023,2.)-pow(rotated.x/.0065,2.)));
      radiance+=vec3f(2.3,2.0,1.55)*arms*pulse;
      coverage=max(coverage,arms*pulse);
    }
  }
  // Source-bound emission and independent field coverage, no particles or UI glyphs.
  return vec4f(radiance*envelope,coverage*envelope*.64);
}
