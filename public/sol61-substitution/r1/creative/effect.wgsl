// 変わり身の術 R1 — 折り替えの空殻。手続き的PHと源に束縛したOBS。
// ABI: 4 vec4<f32>, 64 bytes. Coordinates are authorized per-role projected foot anchors.
struct Uniforms {
  viewportAgeRole: vec4<f32>,
  anchorHeightReduced: vec4<f32>,
  switches: vec4<f32>,
  reserved: vec4<f32>,
};
@group(0) @binding(0) var<uniform> u: Uniforms;
struct VertexOut { @builtin(position) position: vec4<f32> };
@vertex fn vsMain(@builtin(vertex_index) index:u32) -> VertexOut {
  var positions=array<vec2<f32>,3>(vec2<f32>(-1.0,-1.0),vec2<f32>(3.0,-1.0),vec2<f32>(-1.0,3.0));
  var out:VertexOut; out.position=vec4<f32>(positions[index],0.0,1.0); return out;
}
fn cross2(a:vec2<f32>,b:vec2<f32>)->f32 { return a.x*b.y-a.y*b.x; }
fn seg(p:vec2<f32>,a:vec2<f32>,b:vec2<f32>)->f32 {
  let d=b-a; let t=clamp(dot(p-a,d)/max(dot(d,d),0.0000001),0.0,1.0); return length(p-a-t*d);
}
fn tri(p:vec2<f32>,a:vec2<f32>,b:vec2<f32>,c:vec2<f32>)->f32 {
  let x=cross2(b-a,p-a); let y=cross2(c-b,p-b); let z=cross2(a-c,p-c);
  let inside=(x>=0.0 && y>=0.0 && z>=0.0)||(x<=0.0 && y<=0.0 && z<=0.0);
  return select(1.0,-1.0,inside)*min(seg(p,a,b),min(seg(p,b,c),seg(p,c,a)));
}
fn ease(a:f32,b:f32,x:f32)->f32 { return smoothstep(a,b,x); }
fn window(a:f32,b:f32,attack:f32,release:f32,t:f32)->f32 {
  return ease(a,a+attack,t)*(1.0-ease(b-release,b,t));
}
fn over(front:vec4<f32>,back:vec4<f32>)->vec4<f32> {
  return vec4<f32>(front.rgb+back.rgb*(1.0-front.a),front.a+back.a*(1.0-front.a));
}
// A return face + broad main facet share one hinged lamella; neither is a duplicate glow.
fn lamella(p:vec2<f32>,side:f32,inner:f32,width:f32,y0:f32,height:f32,
           fold:f32,energy:f32,opacity:f32,aa:f32,bloomOn:f32)->vec4<f32> {
  let q=vec2<f32>(p.x*side,p.y);
  let a=vec2<f32>(inner,y0);
  let b=vec2<f32>(inner+width,y0+0.19*height);
  let c=vec2<f32>(inner+width*(0.72+0.13*fold),y0+height);
  let d=vec2<f32>(inner+width*0.16,y0+height*0.78);
  let crease=mix(a,c,0.54);
  let k=vec2<f32>(inner+width*(0.56+0.12*fold),y0+height*0.43);
  let faceD=min(tri(q,a,b,c),tri(q,a,c,d));
  let cov=1.0-smoothstep(-aa,aa,faceD);
  let returnD=tri(q,a,k,c);
  let returnCov=(1.0-smoothstep(-aa,aa,returnD))*cov;
  let distanceToCrease=seg(q,a,c);
  let seam=exp(-pow(distanceToCrease/0.012,2.0))*cov;
  // Magically powered seam; finite local scattering onto the adjacent return material.
  let received=exp(-distanceToCrease/0.055)*cov*energy;
  let facet=0.5+0.5*fold;
  let albedo=mix(vec3<f32>(0.035,0.12,0.24),vec3<f32>(0.10,0.42,0.48),facet);
  let returnColor=mix(albedo,vec3<f32>(0.28,0.68,0.63),returnCov*0.72);
  let alpha=cov*opacity;
  let emitterColor=vec3<f32>(0.62,1.0,0.88);
  let base=returnColor*alpha+emitterColor*(seam*energy*1.75+received*0.48);
  // Analytic local display PSF of THAT seam image, not a second world halo.
  let narrow=exp(-pow(distanceToCrease/0.032,2.0));
  let broad=exp(-pow(distanceToCrease/0.084,2.0));
  let psf=(0.26*narrow+0.12*broad)*energy*bloomOn;
  let optical=emitterColor*psf;
  let opticalAlpha=min(0.7,psf*0.28);
  return vec4<f32>(base+optical,max(alpha,opticalAlpha));
}
// Two seating glints, one common24-degree cross orientation; no sparkle particle travel.
fn seatingGlint(p:vec2<f32>,center:vec2<f32>,size:f32,power:f32,aa:f32)->vec4<f32> {
  let angle=0.4188790205;
  let d=p-center;
  let q=vec2<f32>(d.x*cos(angle)+d.y*sin(angle),-d.x*sin(angle)+d.y*cos(angle));
  let xArm=max(abs(q.x)/size,abs(q.y)/(0.007+aa));
  let yArm=max(abs(q.y)/(size*0.70),abs(q.x)/(0.006+aa));
  let arms=pow(max(0.0,1.0-min(xArm,yArm)),1.5);
  let core=exp(-dot(d,d)/(0.009*0.009));
  let amount=power*(arms+0.8*core);
  return vec4<f32>(vec3<f32>(0.85,1.0,0.91)*amount,min(0.80,amount*0.45));
}
@fragment fn fsMain(in:VertexOut)->@location(0) vec4<f32> {
  let age=u.viewportAgeRole.z;
  let role=u.viewportAgeRole.w;
  let h=u.anchorHeightReduced.z;
  if (u.switches.x<0.5 || h<=0.0 || age<=0.0 || role<0.0 || role>3.0) {return vec4<f32>(0.0);}
  let p=vec2<f32>((in.position.x-u.anchorHeightReduced.x)/h,(u.anchorHeightReduced.y-in.position.y)/h);
  if(p.x < -0.92 || p.x>0.92 || p.y < -0.18 || p.y>1.22){return vec4<f32>(0.0);}
  let reduced=step(0.5,u.anchorHeightReduced.w);
  let aa=0.65/h;
  let bloom=step(0.5,u.switches.y);
  var life=0.0;
  var inner=0.1; var width=0.26; var bottom=0.18; var height=0.58;
  var fold=0.0; var energy=0.0; var opacity=0.0;
  if(role<0.5) {
    // Caster: a compact seed opens to offer a reserve. It never flies toward a target.
    if(age>=820.0){return vec4<f32>(0.0);}
    life=window(0.0,820.0,26.0,140.0,age);
    let open=ease(30.0,260.0,age);
    inner=mix(0.025,0.11,mix(open,0.5,reduced));
    width=0.18+0.10*open; bottom=0.11; height=0.33;
    fold=open; energy=life*(0.60+0.65*(1.0-ease(140.0,440.0,age)));
    opacity=life*0.73;
  } else if(role<1.5) {
    // Recipient: opposed spare folds seat around torso, with a face/center opening.
    if(age<=140.0 || age>=820.0){return vec4<f32>(0.0);}
    life=window(140.0,820.0,40.0,100.0,age);
    let seat=ease(160.0,430.0,age);
    inner=mix(0.30,0.16,mix(seat,0.70,reduced));
    width=mix(0.15,0.24,seat); bottom=0.18; height=0.57;
    fold=1.0-seat*0.8; energy=life*(0.72+0.65*window(260.0,490.0,55.0,100.0,age));
    opacity=life*0.70;
  } else if(role<2.5) {
    // Real avoidance residue AT ORIGIN. Separation exposes empty space, no attack impact.
    if(age>=1200.0){return vec4<f32>(0.0);}
    life=window(0.0,1200.0,12.0,150.0,age);
    let open=ease(0.0,200.0,age); let settle=ease(280.0,950.0,age);
    let release=ease(950.0,1200.0,age);
    inner=0.075+mix(0.25*open*(1.0-0.62*settle),0.15,reduced);
    width=(0.28-0.10*settle)*(1.0-0.28*release);
    bottom=0.12+mix(0.13*settle,0.05,reduced);
    height=0.69*(1.0-mix(0.26*settle+0.20*release,0.10*release,reduced));
    fold=1.0-settle; energy=life*(1.15-0.45*settle);
    opacity=life*(0.72-0.12*settle);
  } else {
    // Independent visible completion. No interpolation, shared path, or direction input.
    if(age<=100.0 || age>=1080.0){return vec4<f32>(0.0);}
    life=window(100.0,1080.0,45.0,190.0,age);
    let seat=ease(100.0,470.0,age);
    inner=mix(0.32,0.17,mix(seat,0.7,reduced));
    width=0.19; bottom=0.20; height=0.55;
    fold=1.0-seat; energy=life*(0.65+0.30*(1.0-seat));
    opacity=life*0.57;
  }
  let left=lamella(p,-1.0,inner,width,bottom,height,fold,energy,opacity,aa,bloom);
  let right=lamella(p,1.0,inner,width,bottom,height,fold,energy,opacity,aa,bloom);
  var result=over(right,left);
  if(role>0.5 && role<1.5 && u.switches.z>0.5){
    let seatPeak=window(285.0,550.0,50.0,130.0,age)*life;
    let g1=seatingGlint(p,vec2<f32>(-(inner+width*0.12),bottom+height*0.13),0.075,seatPeak*1.3,aa);
    let g2=seatingGlint(p,vec2<f32>(inner+width*0.76,bottom+height*0.88),0.058,
      window(335.0,605.0,45.0,145.0,age)*life,aa);
    result=over(g2,over(g1,result));
  }
  // Same-age source gates precede material and OBS; no finite-life tail outside windows.
  return result;
}
