const ABI=`struct U { viewport:vec4f, ray:vec4f, geometry:vec4f, observer:vec4f, controls:vec4f, backdrop:vec4f, reserve0:vec4f, reserve1:vec4f };
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 var positions=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
 var o:V;o.position=vec4f(positions[i],0.0,1.0);o.uv=vec2f((positions[i].x+1.0)*0.5,(1.0-positions[i].y)*0.5);return o;
}
fn gauss(v:f32)->f32{return exp(-v*v);}
fn envelope(t:f32)->f32{return select(0.0,min(1.0,t/55.0)*pow(max(0.0,1.0-t/1200.0),0.7),t>=0.0&&t<1200.0);}
fn frontAt(t:f32)->f32{return 1.0-pow(1.0-clamp((t-45.0)/475.0,0.0,1.0),2.0);}
`;
export const WORLD_WGSL=ABI+`
struct W { @location(0) radiance:vec4f, @location(1) keySource:vec4f };
@fragment fn fs(v:V)->W {
 let p=v.position.xy;let hand=u.ray.xy;let dir=u.geometry.xy;let d=p-hand;
 let x=dot(d,dir);let y=dot(d,vec2f(-dir.y,dir.x));let L=length(u.ray.zw-hand);let w=u.geometry.z;let t=u.viewport.z;
 let reduced=u.controls.w>0.5;let mt=select(t,180.0,reduced);
 let gain=envelope(t)*u.viewport.w;
 let front=L*select(frontAt(t),1.0,reduced);
 let releaseX=L*select(smoothstep(560.0,1130.0,t),0.0,reduced);
 var light=vec3f(0.0);var key=vec3f(0.0);
 if(x>=0.0&&x<=L&&abs(y)<=w&&gain>0.0){
   // Strong finite hand aperture. The selected rendered pixels, rather than a
   // fabricated exposure uniform, remain the optical input of the POST pass.
   let aperture=gauss(x/max(1.0,w*0.32))*gauss(y/max(1.0,w*0.21));
   key=vec3f(34.0,27.0,22.0)*aperture*gain*u.observer.z;
   let rel=clamp(x/max(1.0,front),0.0,1.0);
   let centerline=w*0.12*sin(rel*3.14159265)*sin(rel*3.8-mt*0.0028);
   let yn=(y-centerline)/max(1.0,w);
   // The cut crest bows toward its central leading point, while its wings
   // follow behind. A finite filled body connects the aperture and the crest.
   let crestX=front-w*0.48*yn*yn;
   let shapeWidth=0.38+0.49*pow(max(0.0,sin(rel*3.14159265)),0.65);
   let slab=pow(max(0.0,1.0-(yn/shapeWidth)*(yn/shapeWidth)),1.45);
   let ahead=1.0-smoothstep(crestX-1.2,crestX+1.2,x);
   let released=smoothstep(releaseX-w*0.25,releaseX+w*0.25,x);
   let connected=slab*ahead*released;
   // Broad folds are in the luminous material, not detached particles or
   // decorative scan lines. Their local phase travels source->finite endpoint.
   let arrival=45.0+475.0*(1.0-sqrt(max(0.0,1.0-clamp(x/max(1.0,L),0.0,1.0))));
   let localAge=max(0.0,mt-arrival);
   let flow=rel*4.1-localAge*0.0045;
   let foldA=gauss((yn-0.26*sin(flow))/0.24);
   let foldB=gauss((yn+0.32*sin(flow+1.7))/0.30);
   let roll=0.20+0.80*(0.62*foldA+0.38*foldB);
   let body=connected*(0.42+1.35*roll);
   let bodyColor=mix(vec3f(0.72,0.26,4.8),vec3f(0.28,1.15,3.5),clamp(0.5+0.5*yn,0.0,1.0));
   let hotFold=vec3f(3.6,1.3,0.70)*foldA*connected*exp(-localAge/330.0);
   let leading=gauss((x-crestX)/max(1.2,w*0.12))*gauss(yn/0.73)*step(releaseX-w*0.3,crestX);
   let crestFall=1.0-smoothstep(1030.0,1180.0,t);
   // During release the last material retreats toward the collision endpoint;
   // its curved trailing edge keeps a finite colored, readable remainder.
   let releaseEdge=gauss((x-releaseX)/max(1.2,w*0.20))*slab*ahead*select(smoothstep(560.0,700.0,t),0.0,reduced);
   light=key+gain*(bodyColor*body+hotFold+vec3f(22.0,13.0,8.0)*leading*crestFall+vec3f(0.5,0.65,4.0)*releaseEdge);
 }
 var o:W;o.radiance=vec4f(light,1.0);o.keySource=vec4f(key,1.0);return o;
}`;
export const POST_WGSL=ABI+`
@group(0) @binding(1) var radiance:texture_2d<f32>;
@group(0) @binding(2) var keySource:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
fn readKey(p:vec2f)->vec3f{return textureSampleLevel(keySource,linearSampler,clamp(p/u.viewport.xy,vec2f(0.0),vec2f(1.0)),0.0).rgb;}
fn iris(q:vec2f,r:f32)->f32 {
 let a=atan2(q.y,q.x);let rho=length(q/vec2f(1.18,0.86))/max(1.0,r);
 let boundary=1.0+0.044*cos(6.0*a);
 return gauss((rho-boundary)/0.13)*0.78+gauss(rho/0.72)*0.09;
}
@fragment fn fs(v:V)->@location(0) vec4f {
 let p=v.position.xy;let hand=u.ray.xy;let dir=u.geometry.xy;let w=u.geometry.z;let center=u.observer.xy;
 let key=(readKey(hand+dir*w*0.08)+readKey(hand+dir*w*0.20))*0.5;
 let energy=dot(key,vec3f(0.2126,0.7152,0.0722));let response=energy*u.observer.w;
 var color=textureSampleLevel(radiance,linearSampler,v.uv,0.0).rgb+u.backdrop.rgb;
 let offset=hand-center;let angleLoss=1.0/(1.0+dot(offset,offset)/max(1.0,dot(u.viewport.xy,u.viewport.xy)));
 let d=p-hand;let range=max(1.0,w);
 if(response>0.0){
   let near=gauss(length(d)/(range*1.65))*response*0.023*u.controls.z;
   let horizontal=gauss(d.y/max(1.0,w*0.065))*exp(-abs(d.x)/(range*6.5));
   let diagonal=gauss((d.y-d.x*0.32)/max(1.0,w*0.055))*exp(-length(d)/(range*3.0));
   let flare=(horizontal*0.038+diagonal*0.014)*response*angleLoss*u.controls.x;
   let g1=center-offset*0.68;let g2=center+offset*0.22;
   let radius=max(3.0,w*(1.3+length(offset)/max(1.0,u.viewport.x)*0.6));
   // Same two chosen lens paths, now with a broad resolved spectral rim.
   // Mild chromatic magnification separates wavelength channels of each
   // aperture image; it is not a bank of unrelated new ghost shapes.
   let q=p-g1;
   let spectral=vec3f(iris(q,radius*1.055),iris(q,radius),iris(q,radius*0.95));
   let ghost1=spectral*vec3f(0.40,0.56,1.0)*response*0.047*angleLoss*u.controls.y;
   let q2=(p-g2)/vec2f(0.9,1.12);let r2=max(2.0,w*0.54);
   let ghost2=(gauss(length(q2)/r2)*0.74+gauss((length(q2)/r2-0.87)/0.22)*0.24)*response*0.021*angleLoss*u.controls.y;
   color+=vec3f(1.0,0.69,0.49)*(near+flare)+ghost1+vec3f(1.0,0.42,0.28)*ghost2;
 }
 let mapped=vec3f(1.0)-exp(-max(vec3f(0.0),color)*u.backdrop.w);
 return vec4f(pow(mapped,vec3f(1.0/2.2)),1.0);
}`;
