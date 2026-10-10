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
  let release=1.-smoothstep(.78,1.,phase);
  let envelope=rise*release;
  let p=(in.position.xy-u.anchor.xy)/u.viewport.z;
  let aa=.65/u.viewport.z;
  let advance=smoothstep(0.,.64,phase);
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
      let front=exp(-pow((along-fieldProgress)/.21,2.));
      let center=exp(-pow(d/(width*.29),2.));
      // The narrow high-energy core is localized at the inward advancing front.
      let emission=(vec3f(1.,.20,.035)*rho*(.8+1.15*front)+vec3f(1.7,.95,.43)*rho*center*front)*termination;
      coverage=max(coverage,rho*termination);
      radiance+=emission;
    }
  } else if(u.anchor.w<1.5) {
    // Grit: a tapered load-bearing state column with broad seated field buttresses.
    let tip=-.10-.23*fieldProgress;
    let axial=section(p,vec2f(0.,.075),vec2f(0.,tip));
    let axialWidth=mix(.079,.038,axial.y);
    let axialRho=density(axial.x,axialWidth,aa);
    let axialFront=exp(-pow((axial.y-fieldProgress)/.22,2.));
    coverage=axialRho;
    radiance=vec3f(.055,.29,1.)*axialRho*(.85+.9*axialFront)+vec3f(.45,.9,1.8)*axialRho*axialFront;
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
        let rho=density(d,width,aa)*seat;
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
        let orderedProgress=clamp(fieldProgress*1.32-row*.13,0.,1.);
        let front=exp(-pow((along-orderedProgress)/.18,2.));
        let lowerFace=clamp((q.y-y)/.075,0.,1.);
        let taper=.4+.6*sin(clamp(along,.015,.985)*3.14159265);
        coverage=max(coverage,rho*taper);
        radiance+=(vec3f(.025,.78,.39)*rho*(.65+.3*lowerFace)+vec3f(.25,1.55,1.05)*rho*front)*taper;
      }
    }
  }
  // Source-bound emission and independent field coverage, no particles or UI glyphs.
  return vec4f(radiance*envelope,coverage*envelope*.64);
}
