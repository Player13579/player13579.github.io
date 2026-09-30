export const worldShader=String.raw`
struct Frame{viewportTime:vec4f,gates:vec4f,more:vec4f,sourceSize:vec4f};
@group(0) @binding(0)var<uniform> f:Frame;
@group(0) @binding(1)var original:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
@vertex fn vertex(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
fn age(offset:f32,period:f32)->f32{return fract((f.viewportTime.z-offset)/period)*period;}
fn gaussian(p:vec2f,C:vec2f,R:vec2f)->f32{let q=(p-C)/R;let q2=dot(q,q);return exp(-q2*2.)*(1.-smoothstep(4.,6.,q2));}
fn box(p:vec2f,B:vec4f)->f32{return select(0.,1.,all(p>=B.xy)&&all(p<=B.zw));}
fn decode(c:vec3f)->vec3f{return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
fn lamp(i:u32)->vec2f{let a=array<vec2f,7>(vec2f(265.,38.),vec2f(435.,37.),vec2f(613.,37.),vec2f(1134.,119.),vec2f(1243.,427.),vec2f(1017.,1137.),vec2f(80.,488.));return a[i];}
fn floorPatch(i:u32)->vec4f{let a=array<vec4f,7>(vec4f(268.,120.,6.,22.),vec4f(435.,112.,6.,19.),vec4f(606.,155.,6.,30.),vec4f(1132.,173.,6.,23.),vec4f(1190.,469.,6.,25.),vec4f(1015.,1057.,6.,24.),vec4f(128.,493.,6.,26.));return a[i];}
fn power(i:u32)->f32{let offsets=array<f32,7>(0.,.65,2.1,4.1,6.4,8.4,10.);let enabled=(u32(f.more.w)&(1u<<i))!=0u;let a=age(offsets[i],12.);return smoothstep(0.,.32,a)*(1.-smoothstep(1.65,2.2,a))*select(0.,1.,enabled)*f.gates.w;}
struct Result{@location(0)scene:vec4f,@location(1)radiance:vec4f};
@fragment fn fragment(@builtin(position)pixel:vec4f)->Result{let uv=pixel.xy/f.viewportTime.xy;let p=uv*vec2f(1305.,1206.);let tex=textureSampleLevel(original,smp,uv,0.);let base=decode(tex.rgb);var emitted=vec3f(0.);var received=vec3f(0.);var steamAlpha=0.;
for(var i=0u;i<3u;i++){let centers=array<vec2f,3>(vec2f(315.,327.),vec2f(367.,327.),vec2f(420.,327.));let offsets=array<f32,3>(.4,1.4,2.4);let a=age(offsets[i],4.);let life=smoothstep(0.,.18,a)*(1.-smoothstep(1.45,2.1,a));let h=clamp(a/2.1,0.,1.);let C=centers[i]+vec2f(3.*sin(3.1*a+f32(i)),-43.*h);let r=vec2f(4.+7.*h,7.+9.*h);let body=gaussian(p,C,r)+.58*gaussian(p,C+vec2f(3.,-10.*h),r*.72);steamAlpha+=body*life*.19*f.gates.x*box(p,vec4f(300.,270.,432.,333.));}
for(var i=0u;i<3u;i++){let panels=array<vec4f,3>(vec4f(884.,298.,911.,313.),vec4f(968.,294.,1004.,307.),vec4f(1045.,53.,1096.,68.));let offsets=array<f32,3>(1.2,5.6,9.);let a=age(offsets[i],12.);let pulse=smoothstep(0.,.06,a)*(1.-smoothstep(.44,.65,a));let b=panels[i];let n=(p-b.xy)/(b.zw-b.xy);let cell=floor(n.x*3.);let selected=floor(clamp(a/.65,0.,.999)*3.);let w=select(.08,.55,cell==selected);let interior=box(p,b)*box(n,vec4f(.06,.18,.94,.82));emitted+=vec3f(.15,.6,1.2)*w*pulse*interior*f.gates.y;}
let a=age(7.8,12.);let drop=gaussian(p,vec2f(892.,330.+17.*clamp(a/.38,0.,1.)),vec2f(1.7,3.2))*smoothstep(0.,.025,a)*(1.-smoothstep(.32,.39,a));let q=p-vec2f(892.,347.);let ring=exp(-pow((length(q)-7.*clamp((a-.35)/.5,0.,1.))/1.3,2.))*smoothstep(.35,.4,a)*(1.-smoothstep(.65,.9,a))*box(p,vec4f(883.,341.,904.,354.));emitted+=vec3f(.35,.65,.9)*(drop+.22*ring)*f.gates.z;
for(var i=0u;i<7u;i++){let pw=power(i);emitted+=vec3f(2.4,1.4,.52)*gaussian(p,lamp(i),vec2f(6.,3.))*pw;let b=floorPatch(i);received+=vec3f(.30,.19,.065)*gaussian(p,b.xy,b.zw)*pw*f.more.x;}
let green=select(0.,1.,tex.g>tex.r*.98&&tex.g>tex.b*1.15&&tex.g>.035);let patches=array<vec4f,3>(vec4f(378.,48.,647.,79.),vec4f(556.,1112.,795.,1138.),vec4f(1018.,271.,1050.,329.));let pairs=array<vec2u,3>(vec2u(1u,2u),vec2u(0u,5u),vec2u(3u,4u));for(var k=0u;k<3u;k++){let b=patches[k];let pair=pairs[k];for(var j=0u;j<2u;j++){let id=select(pair.x,pair.y,j>0u);let C=vec2f(clamp(lamp(id).x,b.x+8.,b.z-8.),clamp(lamp(id).y,b.y+5.,b.w-5.));let w=gaussian(p,C,vec2f(max(12.,(b.z-b.x)*.43),max(10.,(b.w-b.y)*1.1)));received+=base*vec3f(.32,.45,.18)*w*power(id)*green*box(p,b)*f.more.y;}}
let steam=clamp(steamAlpha,0.,.34);let color=base*(1.-steam)+vec3f(.72,.78,.82)*steam+emitted+received;var o:Result;o.scene=vec4f(color,tex.a);o.radiance=vec4f(emitted+received,1.);return o;}
`;
