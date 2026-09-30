export const postShader=/*wgsl*/`
struct U{viewport:vec4f,time:vec4f,options:vec4f,more:vec4f,contact:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var scene:texture_2d<f32>;
@group(0) @binding(3) var emission:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(q[i],0.,1.);}
fn eSmooth(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn norm(p:vec3f)->f32{let q=p/vec3f(.86,1.06,.70);let q2=q*q;return sqrt(sqrt(dot(q2,q2)));}
fn node(index:u32)->vec3f{return select(vec3f(-.58,-.47,.48),vec3f(.62,.55,.42),index>0u);}
fn point(index:u32)->vec4f{let t=u.time.x;var p=node(index);var gain=0.;if(u.time.w>.5){if(u.time.y<.5&&t>=0.&&t<.65){let at=select(.165,.415,index>0u);let width=select(.05,.065,index>0u);let a=(t-at)/width;gain=exp(-a*a)*(1.-eSmooth(.60,.65,t));}if(u.time.y>1.5&&u.time.y<2.5&&t>=0.&&t<.48){let at=select(.14,.35,index>0u);let a=(t-at)/.04;gain=exp(-a*a)*(1.-eSmooth(.40,.48,t));}if(u.time.y>2.5&&u.time.y<3.5&&index==0u&&t>=0.&&t<.65){p=select(node(0u),u.contact.xyz,u.time.z>.5&&norm(u.contact.xyz)<=1.10);let a=(t-.055)/.045;gain=exp(-a*a)*(1.-eSmooth(.40,.65,t));}}return vec4f(p,gain*eSmooth(0.,.01,t)*u.options.x);}
fn view(p:vec3f)->vec3f{let cy=.961261696;let sy=.275637356;let cx=.992546152;let sx=.121869343;let z=-sy*p.x+cy*p.z;return vec3f(cy*p.x+sy*p.z,cx*p.y-sx*z,sx*p.y+cx*z);}
fn blur(p:vec2i,axis:vec2i)->vec4f{let dimensions=vec2i(textureDimensions(source));var rgb=vec3f(0.);var weights=0.;for(var i=-8;i<=8;i++){let weight=exp(-f32(i*i)/14.);rgb+=textureLoad(source,clamp(p+axis*i*i32(round(u.viewport.w)),vec2i(0),dimensions-vec2i(1)),0).rgb*weight;weights+=weight;}return vec4f(rgb/weights,0.);}
@fragment fn horizontal(@builtin(position)p:vec4f)->@location(0)vec4f{return blur(vec2i(p.xy),vec2i(1,0));}
@fragment fn vertical(@builtin(position)p:vec4f)->@location(0)vec4f{return blur(vec2i(p.xy),vec2i(0,1));}
fn sparkle(pixel:vec2f)->vec3f{let id=select(0u,1u,u.options.w>.5&&pixel.x>u.viewport.x*.5);let cx=u.viewport.x*select(.5,select(.25,.75,id>0u),u.options.w>.5);let center=vec2f(cx,u.viewport.y*.5);let angle=-.4537856055;let axis=vec2f(cos(angle),sin(angle));let across=vec2f(-axis.y,axis.x);var result=vec3f(0.);for(var i=0u;i<2u;i++){let src=point(i);let pos=view(src.xyz);let projected=center+vec2f(pos.x,-pos.y)*u.viewport.z/1.65;let q=(pixel-projected)/u.viewport.w;let a=dot(q,axis);let b=dot(q,across);if(src.w>0.&&abs(a)<7.&&abs(b)<3.8&&all(projected>=vec2f(0.))&&all(projected<u.viewport.xy)){let raw=textureLoad(emission,vec2i(projected),0).rgb;let observed=eSmooth(.7,1.4,min(raw.x,min(raw.y,raw.z)));let aperture=(1.-eSmooth(6.,7.,abs(a)))*(1.-eSmooth(3.2,3.8,abs(b)));let ray=exp(-a*a/12.-b*b/.12)+.67*exp(-b*b/4.-a*a/.12);result+=vec3f(2.3,2.3,2.2)*ray*aperture*src.w*observed;}}return result;}
@fragment fn composite(@builtin(position)p:vec4f)->@location(0)vec4f{let q=vec2i(p.xy);let base=textureLoad(scene,q,0).rgb;var near=vec3f(0.);var stars=vec3f(0.);if(u.options.y>.5&&u.time.w>.5){near=textureLoad(source,q,0).rgb*.32;if(u.more.z>.5){stars=sparkle(p.xy);}}return vec4f(pow(max(base+near+stars,vec3f(0.)),vec3f(1./2.2)),1.);}
`;
