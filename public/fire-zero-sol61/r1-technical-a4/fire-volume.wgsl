struct Uniforms { viewport:vec4f, clock:vec4f, controls:vec4f, fixture:vec4f };
@group(0) @binding(0) var<uniform> u:Uniforms;
struct VertexOutput { @builtin(position) position:vec4f,@location(0) uv:vec2f };
@vertex fn vertexMain(@builtin(vertex_index) i:u32)->VertexOutput {
  var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); var o:VertexOutput;o.position=vec4f(p[i],0,1);o.uv=p[i]*vec2f(.5,-.5)+vec2f(.5);return o;
}
fn hash3(p:vec3f)->f32 {return fract(sin(dot(p,vec3f(17.13,91.7,43.11)))*43758.5453);}
fn noise(p:vec3f)->f32 {
  let a=floor(p);let f=fract(p);let w=f*f*(3-2*f);
  let c00=mix(hash3(a),hash3(a+vec3f(1,0,0)),w.x);let c10=mix(hash3(a+vec3f(0,1,0)),hash3(a+vec3f(1,1,0)),w.x);
  let c01=mix(hash3(a+vec3f(0,0,1)),hash3(a+vec3f(1,0,1)),w.x);let c11=mix(hash3(a+vec3f(0,1,1)),hash3(a+vec3f(1,1,1)),w.x);
  return mix(mix(c00,c10,w.y),mix(c01,c11,w.y),w.z);
}
fn fuel(y:f32)->f32 {let p=u.clock.x/u.clock.y-y*.115;return smoothstep(0,.06,p)*(1-smoothstep(.78,.82,p));}
fn flameAt(p:vec3f)->vec3f {
  let age=u.clock.x/u.clock.y;if(age<=0||age>=1||u.controls.x<.5||p.y<0||p.y>1.55){return vec3f(0);}
  let supply=fuel(p.y);if(supply<.001){return vec3f(0);}
  let motion=select(1.0,.35,u.fixture.z>.5);let t=u.clock.x*.001*motion;
  let drift=.12*p.y + .13*(noise(vec3f(p.y*1.8,p.z*2.2,t*.65))-.5)*p.y;
  let q=vec3f((p.x-drift)/u.clock.z,p.y,p.z/u.clock.z);
  let adv=vec3f(q.x*2.6,q.y*2.8-t*1.9,q.z*3.1);
  let eddy=noise(adv)+.35*noise(adv*1.9+vec3f(9.2,0,2.7));
  let rootRadius=length(vec2f(q.x,q.z/.65));let front=smoothstep(rootRadius*.07,rootRadius*.07+.035,age);
  let width=.92*(1-p.y*.48);let radial=length(vec2f(q.x,q.z/.68));
  let envelope=1-smoothstep(width-.23,width+.08,radial);
  let lobes=.60+.40*noise(vec3f(q.x*2.2,0,q.z*2.2)+vec3f(0,0,8));
  let tip=1-smoothstep(.95+eddy*.30,1.35+eddy*.17,p.y);
  let fold=smoothstep(.24,.75,eddy)*lobes;
  let density=max(0,envelope*tip*front*supply*(.32+.90*fold));
  let reaction=smoothstep(.28,.89,eddy)*(1-smoothstep(.45,1.55,p.y));
  let temperature=clamp(.35+.60*reaction-.15*p.y,0,1);
  return vec3f(density,temperature,supply);
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
    for(var i=0;i<24;i++){
      let depth=-u.clock.z*.82+(f32(i)+.5)*u.clock.z*1.64/24;
      let point=vec3f(p.x-u.fixture.x,p.y+.36*depth,depth);let state=flameAt(point);
      let stepLength=u.clock.z*1.64/24;let extinction=state.x*1.8;let coverage=1-exp(-extinction*stepLength);
      let warm=mix(vec3f(1.7,.085,.006),vec3f(5.8,2.6,.30),smoothstep(.30,.74,state.y));
      let hot=mix(warm,vec3f(13.0,9.8,5.7),smoothstep(.78,.93,state.y));
      emission+=transmittance*coverage*hot*(.65+2.8*state.y*state.y);
      heat+=transmittance*coverage*state.z*(.4+state.y);densitySum+=coverage;
      transmittance*=1-coverage;
    }
  }
  var result:WorldOutput;result.scene=vec4f(scene,1);result.radiance=vec4f(emission,1-transmittance);result.medium=vec4f(heat,densitySum,transmittance,fireAlive);return result;
}
