// Astra r03: newly composed time-volume compression. No lamina/ring geometry from r01/r02.
export const shader=/* wgsl */`
struct U { screen:vec4f, body:vec4f, state:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct V { @builtin(position) p:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {var v:V;let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));v.p=vec4f(a[i],0,1);return v;}
fn window(t:f32,a:f32,b:f32)->f32{return smoothstep(a,a+.06,t)*(1-smoothstep(b-.15,b,t));}
fn blend(c:vec3f,b:vec3f,a:f32)->vec3f{return mix(c,b,clamp(a,0,1));}
fn line(d:f32,width:f32)->f32{return 1-smoothstep(width,width+1./u.body.z,abs(d));}
@fragment fn fs(v:V)->@location(0) vec4f {
 let pixel=v.p.xy/u.screen.z;let p=vec2f(pixel.x-u.body.x,u.body.y-pixel.y)/u.body.z;
 let t=u.state.x;let alive=select(0.,1.,t>0.&&t<1.);let bg=mix(vec3f(.035,.061,.102),vec3f(.77,.81,.79),u.state.z);var c=bg;
 let onset=smoothstep(.015,.095,t)*alive;let drain=smoothstep(.12,.60,t);let release=smoothstep(.59,.89,t);
 let fade=(1-smoothstep(.80,1.,t))*onset;
 let compact=select(release,release*.3,u.state.y>.5);
 let y=(p.y-.49)/(1-compact*.25)+.49;
 let radial=abs(y-.49)/.62;
 // An hourglass of remaining waiting-time material, broad reservoirs and a narrow causal throat.
 let radius=.065+.50*pow(clamp(radial,0,1),.90)+compact*.20;
 let side=abs(p.x);let shellInside=(1-smoothstep(radius-.009,radius+.012,side))*smoothstep(-.15,-.10,y)*(1-smoothstep(1.08,1.13,y));
 let thickness=sqrt(max(0.,1-pow(side/radius,2.)));
 let shellEdge=line(side-radius,.009)*smoothstep(-.14,-.04,y)*(1-smoothstep(1.04,1.13,y));
 let topRim=line(length(vec2f(p.x/.565,(y-1.105)/.064))-1,.033);
 let bottomRim=line(length(vec2f(p.x/.565,(y+.12)/.064))-1,.033);
 let hourglassEnvelope=fade*(1-smoothstep(.60,.83,t));
 // Upper amber strata contract towards the throat. This is a normalized removed time segment, not a numeric timer.
 let topLevel=mix(1.06,.51,drain);let upperVolume=shellInside*smoothstep(.52,.56,y)*(1-smoothstep(topLevel-.014,topLevel+.022,y));
 let upperCrest=line(y-topLevel,.011)*shellInside;
 let layers=.80+.20*cos((y-.51)*33.-drain*6.);
 let upperColor=mix(vec3f(.21,.10,.12),vec3f(.99,.61,.21),thickness*.7+.3);
 let lowerLevel=mix(-.08,.32,drain);let lowerVolume=shellInside*(1-smoothstep(lowerLevel-.015,lowerLevel+.02,y))*smoothstep(-.14,-.08,y);
 let lowerColor=mix(vec3f(.03,.22,.28),vec3f(.18,.83,.75),thickness);
 let streamMask=window(t,.10,.66)*exp(-pow(p.x/.043,4.))*smoothstep(lowerLevel-.02,lowerLevel+.10,y)*(1-smoothstep(.63,.68,y));
 // Rear half gives depth through bounded volume, rather than an outline-only time icon.
 c=blend(c,vec3f(.05,.17,.22),shellInside*hourglassEnvelope*.23);
 c=blend(c,upperColor*layers,upperVolume*hourglassEnvelope*.75);
 c=blend(c,lowerColor,lowerVolume*hourglassEnvelope*.8);
 c+=vec3f(.26,.49,.39)*streamMask*hourglassEnvelope*.3;
 let ground=exp(-pow(p.x/.52,2.)-pow((p.y+.005)/.055,2.));let pulse=exp(-pow((t-.59)/.085,2.))*alive;
 c+=vec3f(.04,.19,.13)*ground*window(t,.17,.98);
 c*=1-exp(-pow(p.x/.19,2.)-pow(p.y/.021,2.))*.24;
 let source=vec2f(128.+p.x*222.,240.-p.y*222.);let uv=source/vec2f(textureDimensions(actor));
 let inside=source.x>=0&&source.x<256&&source.y>=0&&source.y<256;let tex=textureSampleLevel(actor,samp,uv,0);let alpha=select(0.,tex.a,inside)*u.state.w;
 let bodyFront=smoothstep(.2,.6,t);let clearFront=mix(-.12,1.13,smoothstep(.40,.88,t));
 let clearing=exp(-pow((p.y-clearFront)/.13,2.))*window(t,.36,.97);
 let illuminate=vec3f(.11,.34,.23)*clearing+vec3f(.09,.20,.13)*pulse;
 c=blend(c,tex.rgb+illuminate,alpha);
 // Front reservoir retains transparent volume on the body; core feed is continuously connected to both reservoirs.
 c=blend(c,upperColor*layers,upperVolume*hourglassEnvelope*.28);
 c=blend(c,lowerColor,lowerVolume*hourglassEnvelope*.26);
 c+=vec3f(1.,.77,.38)*upperCrest*hourglassEnvelope*.52;
 c+=vec3f(.42,.85,.81)*shellEdge*hourglassEnvelope*.74;
 c+=vec3f(.19,.54,.55)*(topRim+bottomRim)*hourglassEnvelope*.5;
 c+=mix(vec3f(1.,.66,.28),vec3f(.66,1.,.83),clamp((.62-y)*1.8,0,1))*streamMask*hourglassEnvelope*.85;
 // Result: the shortened time segment opens as two solid curved valves, then drains away at the feet.
 let opening=window(t,.53,.94);let localY=clamp((p.y-.10)/.85,0,1);let valveX=.09+.37*sin(localY*3.14159)+compact*.19;
 let valveWidth=.095*(1-localY)+.012;let valveInside=smoothstep(valveX-valveWidth-.01,valveX-valveWidth+.01,side)*(1-smoothstep(valveX-.005,valveX+.008,side));
 let valveEnd=smoothstep(.08,.17,p.y)*(1-smoothstep(.90,.99,p.y));
 let valveColor=mix(vec3f(.03,.34,.33),vec3f(.60,.98,.75),localY);
 c=blend(c,valveColor,valveInside*valveEnd*opening*.84);
 c+=vec3f(.40,.88,.65)*line(side-valveX,.006)*valveEnd*opening*.55;
 c+=vec3f(.73,.94,.69)*exp(-pow(p.x/.21,4.)-pow((p.y-clearFront)/.035,2.))*clearing*.55;
 return vec4f(c,1);
}`;
