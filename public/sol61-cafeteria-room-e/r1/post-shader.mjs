export const POST_SHADER = /* wgsl */ `
struct RoomU { viewport:vec4f,fit:vec4f,flags:vec4f,optics:vec4f,draw:vec4f,bounds:vec4f }
@group(0) @binding(0) var<uniform> u:RoomU;
@group(0) @binding(1) var sourceScene:texture_2d<f32>;
@group(0) @binding(2) var sourceBright:texture_2d<f32>;
struct VOut { @builtin(position) pos:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var v:VOut;v.pos=vec4f(p[i],0,1);return v;}
fn readBright(p:vec2i)->vec3f {let d=vec2i(textureDimensions(sourceBright));if(any(p<vec2i(0))||any(p>=d)){return vec3f(0);}return textureLoad(sourceBright,p,0).rgb;}
fn outputRGB(c:vec3f)->vec3f {let rgb=max(c,vec3f(0));return select(rgb*12.92,1.055*pow(rgb,vec3f(1./2.4))-.055,rgb>vec3f(.0031308));}
fn nearSupport(p:vec2f,d:f32)->bool {
 let centres=array<vec2f,7>(vec2f(263,38),vec2f(430,38),vec2f(619,38),vec2f(1251,475),vec2f(51,283),vec2f(394,1139),vec2f(1019,1139));
 for(var i:u32=0u;i<7u;i++){let h=select(vec2f(12,2),vec2f(2,12),i==3u||i==4u)*u.fit.z+vec2f(6.*d);if(all(abs(p-(u.fit.xy+centres[i]*u.fit.z))<=h)){return true;}}
 return all(abs(p-(u.fit.xy+vec2f(920,343)*u.fit.z))<=vec2f(2.2,1.4)*u.fit.z+vec2f(6.*d));
}
@fragment fn fs(v:VOut)->@location(0) vec4f {
 let p=vec2i(v.pos.xy);let base=textureLoad(sourceScene,p,0).rgb;
 var nearLight=vec3f(0);
 if(u.optics.x>0.&&u.optics.z==0.&&u.fit.w>0.&&u.viewport.z>=0.&&u.viewport.z<12000.){
  // 表示PSF。レンズ内反射/ghostをこのblurで満たしたと主張しない。
  let d=max(u.optics.w,u.fit.z);
  if(nearSupport(v.pos.xy,d)){var wSum=0.;
   for(var y:i32=-2;y<=2;y++){for(var x:i32=-2;x<=2;x++){
    let offset=vec2f(f32(x),f32(y))*3.*d;let w=exp(-.38*f32(x*x+y*y));
    nearLight+=readBright(p+vec2i(round(offset)))*w;wSum+=w;
   }}nearLight=nearLight/wSum*.18;
  }
  if(u.optics.y>0.&&u.flags.z>0.){
   let spot=u.fit.xy+vec2f(920,343)*u.fit.z;let local=v.pos.xy-spot;
   let angle=-.20943951;let q=vec2f(local.x*cos(angle)+local.y*sin(angle),-local.x*sin(angle)+local.y*cos(angle));
   let h=vec2f(8.,3.)*u.fit.z;
   if(all(abs(q)<=h)){let longArm=exp(-q.y*q.y/(.45*d*d))*max(0.,1.-abs(q.x)/h.x);
    let shortArm=exp(-q.x*q.x/(.45*d*d))*max(0.,1.-abs(q.y)/h.y);
    let peak=readBright(vec2i(round(spot)));nearLight+=peak*(longArm+shortArm)*.12;
   }
  }
 }
 return vec4f(outputRGB(base+nearLight),1.);
}
`;
