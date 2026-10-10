struct Uniforms { viewport:vec4f, anchor:vec4f, gates:vec4f, reserve:vec4f }
@group(0) @binding(0) var<uniform> u:Uniforms;
struct VertexOut { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) index:u32)->VertexOut {
  var positions=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var result:VertexOut; result.position=vec4f(positions[index],0.,1.); return result;
}
fn segment(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let ab=b-a; return length(p-a-ab*clamp(dot(p-a,ab)/dot(ab,ab),0.,1.));
}
fn ribbon(d:f32,width:f32,aa:f32)->f32 {return 1.-smoothstep(width-aa,width+aa,d);}
@fragment fn fs(in:VertexOut)->@location(0) vec4f {
  if(u.gates.x<.5 || u.viewport.w<0. || u.viewport.w>=u.anchor.z){return vec4f(0.);}
  let phase=u.viewport.w/u.anchor.z;
  let rise=smoothstep(0.,.12,phase);
  let release=1.-smoothstep(.78,1.,phase);
  let envelope=rise*release;
  let p=(in.position.xy-u.anchor.xy)/u.viewport.z;
  let aa=1./u.viewport.z;
  let advance=smoothstep(0.,.64,phase);
  let fieldProgress=select(advance,.65,u.gates.z>.5);
  var body=0.; var core=0.; var color=vec3f(1.,.19,.055);
  // Each selected mental state has a different field topology, not a hue swap.
  if(u.anchor.w<.5) {
    // Desire: two broad, open oblique folds converge toward the chest.
    for(var side=-1.;side<=1.;side+=2.) {
      let q=vec2f(p.x*side,p.y);
      let a=vec2f(.40-.12*fieldProgress,-.30+.03*fieldProgress);
      let b=vec2f(.24-.09*fieldProgress,-.09);
      let c=vec2f(.07,-.035);
      let d=min(segment(q,a,b),segment(q,b,c));
      let taper=clamp((q.x-.035)/.22,0.,1.);
      body=max(body,ribbon(d,.042+.025*taper,aa));
      core=max(core,ribbon(d,.009+.007*taper,aa)*(.55+.45*taper));
    }
    color=vec3f(1.,.23,.065);
  } else if(u.anchor.w<1.5) {
    // Grit: stepped open ribs seat into an ascending central tensile spine.
    let tip=-.10-.23*fieldProgress;
    body=ribbon(segment(p,vec2f(0.,.08),vec2f(0.,tip)),.045,aa);
    core=ribbon(segment(p,vec2f(0.,.08),vec2f(0.,tip)),.012,aa);
    for(var row=0.;row<3.;row+=1.) {
      let y=.06-row*.105-.025*fieldProgress;
      for(var side=-1.;side<=1.;side+=2.) {
        let q=vec2f(p.x*side,p.y);
        let d=min(segment(q,vec2f(.27,y+.055),vec2f(.17,y-.035)),segment(q,vec2f(.17,y-.035),vec2f(.045,y-.035)));
        let seat=smoothstep(row*.12,row*.12+.18,phase);
        body=max(body,ribbon(d,.035,aa)*seat);
        core=max(core,ribbon(d,.009,aa)*seat);
      }
    }
    color=vec3f(.16,.48,1.);
  } else {
    // Rational: separated bent packets resolve into two interleaving ordered paths.
    for(var side=-1.;side<=1.;side+=2.) {
      for(var row=0.;row<3.;row+=1.) {
        let q=vec2f(p.x*side,p.y);
        let y=-.29+row*.115;
        let spread=.10*(1.-fieldProgress)*(row-1.);
        let a=vec2f(.37+spread,y-.05*(1.-fieldProgress));
        let b=vec2f(.22,y);
        let c=vec2f(.075,y+.048);
        let d=min(segment(q,a,b),segment(q,b,c));
        body=max(body,ribbon(d,.034,aa));
        core=max(core,ribbon(d,.008,aa));
      }
    }
    color=vec3f(.08,1.,.66);
  }
  // Finite transport excitation moves within the established field; no particles, glyphs or faux receipt.
  let scan=exp(-pow((p.y-(-.32+.43*fieldProgress))/.075,2.));
  let coverage=body*envelope;
  let emitted=(color*body*(1.15+.65*scan)+vec3f(2.1)*core*(.7+.3*scan))*envelope;
  return vec4f(emitted,coverage*.64);
}
