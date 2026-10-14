struct Uniforms { viewport:vec4f, clock:vec4f, controls:vec4f, fixture:vec4f, diagnostics:vec4f };
@group(0) @binding(0) var<uniform> u:Uniforms;
struct VertexOutput { @builtin(position) position:vec4f,@location(0) uv:vec2f };
@vertex fn vertexMain(@builtin(vertex_index) i:u32)->VertexOutput {
  var corners=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VertexOutput;o.position=vec4f(corners[i],0,1);o.uv=corners[i]*vec2f(.5,-.5)+vec2f(.5);return o;
}
fn smoothSlope(a:f32,b:f32,x:f32)->f32 {if(x<=a||x>=b){return 0;}let t=(x-a)/(b-a);return 6*t*(1-t)/(b-a);}
fn erfApprox(x:f32)->f32 {
  let signValue=select(-1.0,1.0,x>=0);let a=abs(x);let t=1/(1+.3275911*a);
  let poly=(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t;
  return signValue*(1-poly*exp(-a*a));
}
fn gaussianAverage(distance:f32,sigma:f32,halfInterval:f32)->f32 {
  let center=distance/sigma;let normalizedHalf=halfInterval/sigma;
  if(halfInterval==0){return exp(-center*center);}
  // Near-constant cells avoid cancellation of almost equal erf values; four-node symmetric Gaussian quadrature.
  if(normalizedHalf<.125){
    let a=center+.3399810436*normalizedHalf;let b=center-.3399810436*normalizedHalf;let c=center+.8611363116*normalizedHalf;let d=center-.8611363116*normalizedHalf;
    return .3260725774*(exp(-a*a)+exp(-b*b))+.1739274226*(exp(-c*c)+exp(-d*d));
  }
  return max(0,.4431134627*sigma/halfInterval*(erfApprox((distance+halfInterval)/sigma)-erfApprox((distance-halfInterval)/sigma)));
}
// Analytic cell average of a ray-linearized product of Gaussian coordinate factors, including local shape derivatives.
fn quadraticAverage(a:f32,b:f32,c:f32,halfInterval:f32)->f32 {
  if(a==0){return exp(-c);}
  let residual=max(0,c-b*b/a);return exp(-residual)*gaussianAverage(b/a,inverseSqrt(a),halfInterval);
}
fn fuel(y:f32)->f32 {let supplyTime=u.clock.x/u.clock.y-y*.115;return smoothstep(0,.06,supplyTime)*(1-smoothstep(.78,.82,supplyTime));}
struct GasShape { center:vec2f,centerSlope:vec2f,width:vec2f,widthSlope:vec2f,normal:vec2f,normalSlope:vec2f,sheetOffset:f32,sheetOffsetSlope:f32,thickness:f32,thicknessSlope:f32,tip:f32 };
fn gasShape(y:f32,age:f32,j:i32)->GasShape {
  let stream=f32(j);let k=4.7;
  let rootX=select(select(-.55,.04,j==1),.58,j==2);let rootZ=select(select(-.12,.16,j==1),-.18,j==2);
  let baseHeight=select(select(1.30,1.53,j==1),1.12,j==2);let baseWidth=select(select(.32,.38,j==1),.29,j==2);
  let phase=(y-age/.115)*k+stream*2.0;let topPhase=(baseHeight-age/.115)*k+stream*2.0;
  let height=baseHeight-.16+.06*sin(topPhase);let fraction=clamp(y/height,0,1);
  let motion=select(1.0,.35,u.fixture.z>.5);
  let amplitude=smoothstep(.12,.82,fraction);let amplitudeSlope=smoothSlope(.12,.82,fraction)/height;
  let tipRamp=smoothstep(.45,1,fraction);let tipRampSlope=smoothSlope(.45,1,fraction)/height;
  let curlPhase=phase*.65+stream;
  let center=vec2f(rootX+motion*(.16*sin(phase)*amplitude+.28*sin(curlPhase)*tipRamp),rootZ+motion*.17*cos(phase)*amplitude);
  let centerSlope=motion*vec2f(.16*(k*cos(phase)*amplitude+sin(phase)*amplitudeSlope)+.28*(.65*k*cos(curlPhase)*tipRamp+sin(curlPhase)*tipRampSlope),.17*(-k*sin(phase)*amplitude+cos(phase)*amplitudeSlope));
  let profile=1-smoothstep(.15,1,fraction);let profileSlope=-smoothSlope(.15,1,fraction)/height;
  let bulge=.90+.22*cos(phase);let bulgeSlope=-.22*k*sin(phase);
  // A finite physical lobe radius ends through cooling, rather than an infinitely narrow clamped needle.
  let widthX=.72*baseWidth*(.18+.82*profile)*bulge;
  let widthXSlope=.72*baseWidth*(.82*profileSlope*bulge+(.18+.82*profile)*bulgeSlope);
  let depthRatio=.95+.20*sin(phase);let widthZ=widthX*depthRatio;
  let widthZSlope=widthXSlope*depthRatio+widthX*.20*k*cos(phase);
  let theta=phase*.8;let rawNormal=vec2f(.65*sin(theta),.55+.35*cos(theta));let rawSlope=vec2f(.65*cos(theta),-.35*sin(theta))*.8*k;
  let normal=normalize(rawNormal);let normalSlope=(rawSlope-normal*dot(normal,rawSlope))/length(rawNormal);
  let offsetFactor=.06+.09*sin(phase);let offset=offsetFactor*widthX;
  let offsetSlope=.09*k*cos(phase)*widthX+offsetFactor*widthXSlope;
  var shape:GasShape;shape.center=center;shape.centerSlope=centerSlope;shape.width=vec2f(widthX,widthZ);shape.widthSlope=vec2f(widthXSlope,widthZSlope);shape.normal=normal;shape.normalSlope=normalSlope;shape.sheetOffset=offset;shape.sheetOffsetSlope=offsetSlope;
  shape.thickness=.15+.02*(1-fraction)+.015*cos(phase);shape.thicknessSlope=select(-.02/height,0.0,y>=height||y<=0)-.015*k*sin(phase);
  shape.tip=1-smoothstep(height-.12,height+.12,y);return shape;
}
// Components are averaged optical density, averaged reaction emissivity, hot-core emissivity, and supplied heat.
fn flameAt(p:vec3f,halfInterval:f32)->vec4f {
  let age=u.clock.x/u.clock.y;if(age<=0||age>=1||u.controls.x<.5||p.y<0||p.y>1.55){return vec4f(0);}
  let supply=fuel(p.y);if(supply<.001){return vec4f(0);}
  let q=vec3f(p.x/u.clock.z,p.y,p.z/u.clock.z);let dy=.36*u.clock.z;
  let pixelQ=1/(u.viewport.z*u.clock.z);let radius=length(vec2f(q.x,q.z/.65));let ignition=smoothstep(radius*.07,radius*.07+.035,age);
  var gas=0.0;var reaction=0.0;var core=0.0;
  for(var j=0;j<3;j++){
    let shape=gasShape(q.y,age,j);if(shape.tip<=0){continue;}
    let delta=vec2f(q.x,q.z)-shape.center;
    let sigmaX=sqrt(shape.width.x*shape.width.x+pixelQ*pixelQ/6);
    let sigmaXSlope=shape.width.x*shape.widthSlope.x/sigmaX;
    let sigma=vec2f(sigmaX,shape.width.y);let sigmaSlope=vec2f(sigmaXSlope,shape.widthSlope.y);
    let r=delta/sigma;
    let derivative=(vec2f(0,1)-shape.centerSlope*dy)/sigma-r*sigmaSlope/sigma*dy;
    let a=dot(derivative,derivative);let b=dot(r,derivative);let c=dot(r,r);
    let footprintGain=shape.width.x/sigmaX;let parcel=supply*ignition*shape.tip*footprintGain;
    let gasAverage=quadraticAverage(a,b,c,halfInterval);
    let s=(dot(shape.normal,delta)-shape.sheetOffset)/shape.thickness;
    let sDerivative=(shape.normal.y+(dot(shape.normalSlope,delta)-dot(shape.normal,shape.centerSlope)-shape.sheetOffsetSlope)*dy)/shape.thickness-s*shape.thicknessSlope/shape.thickness*dy;
    let sheetAverage=quadraticAverage(a+sDerivative*sDerivative,b+s*sDerivative,c+s*s,halfInterval);
    let coreAverage=quadraticAverage(a*9.5,b*9.5,c*9.5,halfInterval)*(1-smoothstep(.12,.60,q.y));
    gas+=parcel*gasAverage;reaction+=parcel*sheetAverage;core+=parcel*coreAverage;
  }
  let rootHeight=1-smoothstep(.10,.24,q.y);let rootX=exp(-q.x*q.x/.64);
  let rootDepth=gaussianAverage(q.z,.48,halfInterval);
  let root=rootHeight*rootX*rootDepth*supply*ignition;
  let density=.22*gas+.80*reaction+.65*core+.16*root;
  return vec4f(density,.90*reaction+.12*root,1.05*core,.55*gas+.45*reaction);
}
fn actorMask(p:vec2f)->f32 {
  let q=p-vec2f(-1.75,0);let head=length(q-vec2f(0,.87))-.13;let torso=max(abs(q.x)-.16,abs(q.y-.55)-.20);
  let legA=max(abs(q.x+.09)-.065,abs(q.y-.18)-.18);let legB=max(abs(q.x-.09)-.065,abs(q.y-.18)-.18);
  let armA=max(abs(q.x+.24)-.065,abs(q.y-.53)-.19);let armB=max(abs(q.x-.24)-.065,abs(q.y-.53)-.19);
  return 1-smoothstep(-.008,.008,min(min(head,torso),min(min(legA,legB),min(armA,armB))));
}
struct WorldOutput {@location(0) scene:vec4f,@location(1) radiance:vec4f,@location(2) medium:vec4f};
@fragment fn fragmentMain(o:VertexOutput)->WorldOutput {
  let p=vec2f((o.uv.x-.5)*u.viewport.x/u.viewport.z,(.64-o.uv.y)*u.viewport.y/u.viewport.z);
  let base=select(vec3f(.035,.045,.055),vec3f(.78,.80,.82),u.fixture.y>.5);
  let floorMask=1-smoothstep(-.015,.015,p.y);let stripes=.015*(.5+.5*cos(p.x*7+p.y*4));var scene=base+vec3f(stripes);scene=mix(scene,base*.82,floorMask);
  let actor=actorMask(p);scene=mix(scene,vec3f(.14,.24,.31)*(1+.25*p.y),actor);
  let fireAlive=select(0.0,1.0,u.clock.x>0&&u.clock.x<u.clock.y&&u.controls.x>.5);let sourcePoint=vec2f(p.x-u.fixture.x,p.y);
  let near=fireAlive*(fuel(0)*.45/(1+dot(sourcePoint,sourcePoint)*3/u.clock.z/u.clock.z)+fuel(.5)*.35/(1+dot(sourcePoint-vec2f(0,.5),sourcePoint-vec2f(0,.5))*3/u.clock.z/u.clock.z)+fuel(1)*.20/(1+dot(sourcePoint-vec2f(0,1),sourcePoint-vec2f(0,1))*3/u.clock.z/u.clock.z));
  scene+=vec3f(1,.21,.025)*near*.50*u.controls.z*(1-u.controls.w)*(floorMask+actor*.6);
  var transmittance=1.0;var emission=vec3f(0);var densitySum=0.0;var heat=0.0;
  if(abs(p.x-u.fixture.x)<u.clock.z*1.35&&p.y>-.2952*u.clock.z&&p.y<1.55+.2952*u.clock.z&&fireAlive>.5){
    let depthSamples=u.diagnostics.x;let nearDepth=max(-u.clock.z*.82,-p.y/.36);let farDepth=min(u.clock.z*.82,(1.55-p.y)/.36);
    let stepLength=(farDepth-nearDepth)/depthSamples;let halfInterval=stepLength/(2*u.clock.z);
    for(var i=0;i<64;i++){
      if(f32(i)>=depthSamples){break;}
      let depth=nearDepth+(f32(i)+.5)*stepLength;
      let point=vec3f(p.x-u.fixture.x,p.y+.36*depth,depth);let state=flameAt(point,halfInterval);
      let extinction=state.x*1.8;let coverage=1-exp(-extinction*stepLength);
      var transfer=stepLength;if(extinction>1e-6){transfer=coverage/extinction;}
      let emissivity=(vec3f(.62,.018,.002)*state.x+vec3f(9.2,1.65,.035)*state.y+vec3f(34,23,7.4)*state.z)*1.8;
      emission+=transmittance*emissivity*transfer;
      heat+=transmittance*state.w*stepLength;densitySum+=coverage;transmittance*=1-coverage;
    }
  }
  var result:WorldOutput;result.scene=vec4f(scene,1);result.radiance=vec4f(emission,1-transmittance);result.medium=vec4f(heat,densitySum,transmittance,fireAlive);return result;
}
