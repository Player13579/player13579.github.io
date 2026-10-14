struct Uniforms { viewport:vec4f, clock:vec4f, controls:vec4f, fixture:vec4f };
@group(0) @binding(0) var<uniform> u:Uniforms;
struct VertexOutput { @builtin(position) position:vec4f,@location(0) uv:vec2f };
@vertex fn vertexMain(@builtin(vertex_index) i:u32)->VertexOutput {
  var corners=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VertexOutput;o.position=vec4f(corners[i],0,1);o.uv=corners[i]*vec2f(.5,-.5)+vec2f(.5);return o;
}
fn hash3(p:vec3f)->f32 {return fract(sin(dot(p,vec3f(17.13,91.7,43.11)))*43758.5453);}
fn noise1(value:f32)->f32 {let a=floor(value);let f=fract(value);let w=f*f*(3-2*f);return mix(hash3(vec3f(a,1,2)),hash3(vec3f(a+1,1,2)),w);}
fn noise2(p:vec2f)->f32 {let a=floor(p);let f=fract(p);let w=f*f*(3-2*f);return mix(mix(hash3(vec3f(a,3)),hash3(vec3f(a+vec2f(1,0),3)),w.x),mix(hash3(vec3f(a+vec2f(0,1),3)),hash3(vec3f(a+vec2f(1,1),3)),w.x),w.y);}
fn fuel(y:f32)->f32 {let supplyTime=u.clock.x/u.clock.y-y*.115;return smoothstep(0,.06,supplyTime)*(1-smoothstep(.78,.82,supplyTime));}
// Components are independent density, orange reaction envelope, local high-luminance core, and hot supply.
fn flameAt(p:vec3f)->vec4f {
  let age=u.clock.x/u.clock.y;if(age<=0||age>=1||u.controls.x<.5||p.y<0||p.y>1.55){return vec4f(0);}
  let supply=fuel(p.y);if(supply<.001){return vec4f(0);}
  let q=vec3f(p.x/u.clock.z,p.y,p.z/u.clock.z);
  let motion=select(1.0,.35,u.fixture.z>.5);
  let radius=length(vec2f(q.x,q.z/.65));let ignition=smoothstep(radius*.07,radius*.07+.035,age);
  // A low connected fuel root; above it the broad gas streams entrain air and develop rolling reaction sheets.
  let root=(1-smoothstep(.74,.94,radius))*(1-smoothstep(.10,.24,q.y));
  var fuelVolume=0.0;var hotCore=0.0;var localReaction=0.0;
  for(var j=0;j<3;j++){
    let stream=f32(j);
    let rootX=select(select(-.55,.04,j==1),.58,j==2);
    let rootZ=select(select(-.12,.16,j==1),-.18,j==2);
    let baseHeight=select(select(1.30,1.53,j==1),1.12,j==2);
    let baseWidth=select(select(.32,.38,j==1),.29,j==2);
    let transported=(q.y-age/.115)*2.05;
    let roll=noise1(stream*37+transported);
    let height=baseHeight-.13+.17*noise1(stream*43+transported+.8);
    let streamY=q.y/max(height,.1);
    if(streamY>=1){continue;}
    // The same retarded gas-coordinate carries each lateral fold upward, rather than redrawing unrelated grain.
    let curlPhase=noise1(stream*51+transported*.68+1.6)*2-1;
    let tipCurl=smoothstep(.46,.97,streamY);
    let bend=((roll-.5)*.28*streamY+curlPhase*.37*tipCurl*tipCurl)*motion;
    let centerX=rootX*(.88+.12*smoothstep(.12,.40,q.y))+bend;
    let centerZ=rootZ+(noise1(stream*29+transported+.65)-.5)*.30*streamY*motion;
    // The taper follows a swept curve and shrinks to zero, rather than cutting a cone with a flat top plane.
    let width=baseWidth*(1-pow(streamY,.86))*(.62+.70*roll);
    let local=vec2f((q.x-centerX)/max(width,.012),(q.z-centerZ)/max(width*.82,.012));
    let radial=length(local);
    let fold=noise2(vec2f(stream*5.1+local.x*.52+local.y*.35,transported*1.05));
    let interfaceRadius=.76+.18*(fold-.5);
    let radialSupport=1-smoothstep(interfaceRadius-.18,interfaceRadius+.25,radial);
    // The broad rolled neck keeps a connected fuel path. Oxygen-mixing sheets may open large partial windows.
    let neck=.43+.57*smoothstep(.26,.60,fold+.23*(1-streamY));
    let tongue=radialSupport*neck;
    fuelVolume=max(fuelVolume,tongue);
    let mixingFront=exp(-pow((radial-interfaceRadius)/.22,2))*radialSupport;
    let sidedReaction=.35+.65*smoothstep(.25,.68,fold+.14*local.y);
    let shell=mixingFront*sidedReaction*(.74+.26*streamY);
    localReaction=max(localReaction,shell);
    // A narrow supplied hot root remains intense; the fuel-rich center above it is cooler and less emissive.
    let core=exp(-radial*radial*8.5)*(1-smoothstep(.12,.60,q.y))*(.45+.55*neck);
    hotCore=max(hotCore,core);
  }
  let support=max(root*.58,fuelVolume);
  let density=support*supply*ignition*(.22+.42*localReaction+.65*hotCore);
  let reaction=(.20*root+1.20*localReaction)*supply*ignition;
  let core=hotCore*supply*ignition;
  return vec4f(density,reaction,core,supply);
}
fn actorMask(p:vec2f)->f32 {
  let q=p-vec2f(-1.75,0);let head=length(q-vec2f(0,.87))-.13;
  let torso=max(abs(q.x)-.16,abs(q.y-.55)-.20);
  let legA=max(abs(q.x+.09)-.065,abs(q.y-.18)-.18);let legB=max(abs(q.x-.09)-.065,abs(q.y-.18)-.18);
  let armA=max(abs(q.x+.24)-.065,abs(q.y-.53)-.19);let armB=max(abs(q.x-.24)-.065,abs(q.y-.53)-.19);
  return 1-smoothstep(-.008,.008,min(min(head,torso),min(min(legA,legB),min(armA,armB))));
}
struct WorldOutput {@location(0) scene:vec4f,@location(1) radiance:vec4f,@location(2) medium:vec4f};
@fragment fn fragmentMain(o:VertexOutput)->WorldOutput {
  let p=vec2f((o.uv.x-.5)*u.viewport.x/u.viewport.z,(.64-o.uv.y)*u.viewport.y/u.viewport.z);
  let base=select(vec3f(.035,.045,.055),vec3f(.78,.80,.82),u.fixture.y>.5);
  let floorMask=1-smoothstep(-.015,.015,p.y);let stripes=.015*(.5+.5*cos(p.x*7+p.y*4));
  var scene=base+vec3f(stripes);scene=mix(scene,base*.82,floorMask);
  let actor=actorMask(p);scene=mix(scene,vec3f(.14,.24,.31)*(1+.25*p.y),actor);
  let fireAlive=select(0.0,1.0,u.clock.x>0&&u.clock.x<u.clock.y&&u.controls.x>.5);
  let sourcePoint=vec2f(p.x-u.fixture.x,p.y);
  let near=fireAlive*(fuel(0)*.45/(1+dot(sourcePoint,sourcePoint)*3/u.clock.z/u.clock.z)+fuel(.5)*.35/(1+dot(sourcePoint-vec2f(0,.5),sourcePoint-vec2f(0,.5))*3/u.clock.z/u.clock.z)+fuel(1)*.20/(1+dot(sourcePoint-vec2f(0,1),sourcePoint-vec2f(0,1))*3/u.clock.z/u.clock.z));
  scene+=vec3f(1,.21,.025)*near*.50*u.controls.z*(1-u.controls.w)*(floorMask+actor*.6);
  var transmittance=1.0;var emission=vec3f(0);var densitySum=0.0;var heat=0.0;
  if(abs(p.x-u.fixture.x)<u.clock.z*1.35&&p.y>-.30&&p.y<1.86&&fireAlive>.5){
    for(var i=0;i<32;i++){
      let depth=-u.clock.z*.82+(f32(i)+.5)*u.clock.z*1.64/32;
      let point=vec3f(p.x-u.fixture.x,p.y+.36*depth,depth);let state=flameAt(point);
      let stepLength=u.clock.z*1.64/32;let extinction=state.x*1.8;let coverage=1-exp(-extinction*stepLength);
      // Cooler interior absorption and a brighter oxygen-mixing shell are distinct in depth, not a solid orange face.
      let warmRadiance=vec3f(.62,.018,.002)+vec3f(9.2,1.65,.035)*state.y;
      let coreRadiance=vec3f(34,23,7.4)*state.z;
      emission+=transmittance*coverage*(warmRadiance+coreRadiance);
      heat+=transmittance*coverage*state.w*(.55+.45*state.y);densitySum+=coverage;
      transmittance*=1-coverage;
    }
  }
  var result:WorldOutput;result.scene=vec4f(scene,1);result.radiance=vec4f(emission,1-transmittance);result.medium=vec4f(heat,densitySum,transmittance,fireAlive);return result;
}
