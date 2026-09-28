// Astra r06: three irregular waiting strata compress in spacing and thickness;
// the finite residual wedge contracts to nothing; only shoulder/sleeve facets respond.
export const shader=/* wgsl */`
struct U{screen:vec4f,body:vec4f,state:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct V{@builtin(position) p:vec4f};
@vertex fn vs(@builtin(vertex_index) i:u32)->V{var v:V;let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));v.p=vec4f(a[i],0,1);return v;}
fn turn(p:vec3f,a:f32)->vec3f{return vec3f(cos(a)*p.x-sin(a)*p.y,sin(a)*p.x+cos(a)*p.y,p.z);}
fn yaw(p:vec3f,a:f32)->vec3f{return vec3f(cos(a)*p.x-sin(a)*p.z,p.y,sin(a)*p.x+cos(a)*p.z);}
fn actorAlpha(source:vec2f)->f32{
 let legal=source.x>=0&&source.x<256&&source.y>=0&&source.y<256;
 return select(0.,textureSampleLevel(actor,samp,source/vec2f(textureDimensions(actor)),0).a,legal);
}
fn stratum(p:vec2f,t:f32,index:i32)->vec4f{
 if(t<=0.||t>=.635){return vec4f(0);}
 let i=f32(index);let compress=smoothstep(.15,.445,t);
 let reduction=select(compress,compress*.78,u.state.y>.5);
 let vanish=smoothstep(.475,.615,t);
 let length=max(.001,1-vanish);let thick=mix(1.,.165,reduction)*(1-vanish*.80);
 // Each polygon has a different nose and shoulder. These are solid volumes, not strokes.
 let profiles=array<vec2f,6>(vec2f(-.69,-.065),vec2f(-.51,-.14),vec2f(.26,-.12),vec2f(.61,.005),vec2f(.32,.13),vec2f(-.43,.195));
 let angle=mix(.27+(i-1)*.09,.27,compress);
 let spacing=mix(.245,.017,reduction);
 let shift=(i-1)*spacing;
 let origin=vec3f((i-1)*.035*(1-compress)+.10*vanish,.53+shift,-.27-i*.14);
 let ro=yaw(turn(vec3f(p.x,p.y+.28,1)-origin,angle),-.48);
 let rd=yaw(turn(vec3f(0,-.28,-1),angle),-.48);
 var near=-100.;var far=100.;var normal=vec3f(0,0,1);var edge=-1;
 for(var k=0;k<8;k++){
  var n=vec3f(0,0,1);var bound=.065*(1-compress*.45);
  if(k<6){
   let aa=profiles[k];let bb=profiles[(k+1)%6];
   let aa2=vec2f((aa.x+.36)*length-.36,aa.y*thick*(1+(i-1)*.16));
   let bb2=vec2f((bb.x+.36)*length-.36,bb.y*thick*(1+(i-1)*.16));
   let e=bb2-aa2;n=normalize(vec3f(e.y,-e.x,0));bound=dot(n.xy,aa2);
  }else if(k==7){n=vec3f(0,0,-1);}
  let denom=dot(n,rd);let distance=bound-dot(n,ro);
  if(abs(denom)<.000001){if(distance<0){return vec4f(0);}continue;}
  let hit=distance/denom;
  if(denom<0){if(hit>near){near=hit;normal=n;edge=k;}}else{far=min(far,hit);}
 }
 if(far<=near||near<0.){return vec4f(0);}
 let pt=ro+rd*near;
 let light=.22+.78*max(0.,dot(normal,normalize(vec3f(-.46,.8,.62))));
 let broadFacet=smoothstep(-.11,.15,pt.y/max(.06,thick));
 let color=mix(vec3f(.24,.105,.027),vec3f(.98,.66,.23),light)*mix(.82,1.10,broadFacet);
 let crest=exp(-pow((t-.445)/.047,2.));
 let emission=vec3f(.32,.21,.07)*crest*(.3+.7*light);
 let appearance=smoothstep(.012,.075,t)*(1-smoothstep(.595,.635,t));
 // A broad lit face and dark bevel preserve volume at actual 64 px body height.
 return vec4f(color+emission,(.80+.11*light)*appearance);
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let pixel=v.p.xy/u.screen.z;let p=vec2f(pixel.x-u.body.x,u.body.y-pixel.y)/u.body.z;let t=u.state.x;
 var c=mix(vec3f(.035,.061,.102),vec3f(.77,.81,.79),u.state.z);
 let ground=exp(-pow(p.x/.34,2.)-pow(p.y/.04,2.));
 c+=vec3f(.12,.065,.018)*ground*smoothstep(.01,.08,t)*(1-smoothstep(.50,.63,t));
 c*=1-exp(-pow(p.x/.19,2.)-pow(p.y/.023,2.))*.24;
 for(var j=2;j>=0;j--){let shape=stratum(p,t,j);c=mix(c,shape.rgb,shape.a);}
 let source=vec2f(128.+p.x*222.,240.-p.y*222.);
 let tex=textureSampleLevel(actor,samp,source/vec2f(textureDimensions(actor)),0);let alpha=actorAlpha(source)*u.state.w;
 // Discrete local material response. No full-body tint or persistent halo.
 let left=exp(-pow((p.x+.16)/.09,2.)-pow((p.y-.71)/.135,2.));
 let right=exp(-pow((p.x-.20)/.09,2.)-pow((p.y-.61)/.13,2.));
 let leftTime=smoothstep(.65,.715,t)*(1-smoothstep(.745,.88,t));
 let rightTime=smoothstep(.715,.78,t)*(1-smoothstep(.81,.955,t));
 let response=left*leftTime+right*rightTime;
 let interior=vec3f(.17,.55,.40)*response*.85;
 c=mix(c,tex.rgb+interior,alpha);
 let d=222./u.body.z*2.3;
 let neighboring=max(max(actorAlpha(source+vec2f(d,0)),actorAlpha(source-vec2f(d,0))),max(actorAlpha(source+vec2f(0,d)),actorAlpha(source-vec2f(0,d))));
 let rim=max(0.,neighboring-alpha)*u.state.w;
 c+=vec3f(.30,.91,.65)*rim*response*1.18;
 return vec4f(c,1);
}`;
