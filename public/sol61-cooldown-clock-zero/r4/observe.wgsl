// artist-selected virtualcamera。actual lens accuracy/not_run、OBS三段を独立OFF。
struct Observe { viewport:vec4f, anchor:vec4f, clock:vec4f, controls:vec4f, optical:vec4f, owners:vec4f }
@group(0) @binding(0) var<uniform> o:Observe;
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var surviving:texture_2d<f32>;
@group(0) @binding(3) var samp:sampler;
@vertex fn fullVertex(@builtin(vertex_index)i:u32)->@builtin(position)vec4f {let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(q[i],.5,1.);}
fn ramp(a:f32,b:f32,x:f32)->f32{let q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
fn gauss(x:f32,w:f32)->f32{return exp(-pow(x/w,2.));}
fn emission(pixel:vec2f)->vec3f {return textureSampleLevel(surviving,samp,pixel/o.viewport.xy,0.).rgb;}
fn project(local:vec2f)->vec2f{return o.anchor.xy+local*o.viewport.z/64.*vec2f(o.anchor.z,1.);}
@fragment fn finalFragment(@builtin(position)pos:vec4f)->@location(0)vec4f {let px=pos.xy;let base=textureSampleLevel(scene,samp,px/o.viewport.xy,0.).rgb;var light=vec3f(0.);let scale=o.viewport.z/64.;if(o.clock.z>.5&&o.clock.w>.5&&o.clock.y>=.9&&o.clock.x>=0.&&o.clock.x<o.clock.y){if(o.controls.x>.5){var local=vec3f(0.);var weight=0.;for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){let w=exp(-f32(x*x+y*y)/3.);local+=emission(px+vec2f(f32(x),f32(y))*scale*1.8)*w;weight+=w;}}light+=local/weight*.28;}
if(o.controls.w>.5){let u=o.clock.x/o.clock.y;let end=1.-ramp(.84,1.,u);let centers=array<vec2f,3>(vec2f(43.,-12.),vec2f(7.4,7.4),vec2f(-12.5,6.7));let peaks=array<f32,3>(.325,.455,.66);let widths=array<f32,3>(.035,.037,.045);let onsets=array<f32,3>(.295,.425,.625);let lengths=array<f32,3>(10.,14.,12.);let angle=.30106929597;let axis=vec2f(cos(angle),sin(angle));let normal=vec2f(-axis.y,axis.x);
for(var i=0u;i<3u;i++){let owner=select(o.owners.z,o.owners.x,i==0u);let S=project(centers[i]);var actual=vec3f(0.);for(var j=0u;j<5u;j++){let offset=array<vec2f,5>(vec2f(0.),vec2f(1.,0.),vec2f(-1.,0.),vec2f(0.,1.),vec2f(0.,-1.));actual+=emission(S+offset[j]*scale)*.2;}let energy=max(max(actual.r,actual.g),actual.b);let envelope=gauss(u-peaks[i],widths[i])*ramp(onsets[i],onsets[i]+.015,u)*end*owner;let survival=ramp(.15,1.,energy);let d=(px-S)/scale;let apertureOffAxis=length(S-o.optical.xy)/(64.*scale);let astigmatism=1.+.08*clamp(apertureOffAxis,0.,2.);if(o.controls.y>.5){let long=gauss(dot(d,axis),lengths[i]*astigmatism)*gauss(dot(d,normal),.65);let short=gauss(dot(d,axis),.65)*gauss(dot(d,normal),8./astigmatism);light+=actual*envelope*survival*(long+short)*.18;}
if(o.controls.z>.5){let C=o.optical.xy;let center=C+.22*(C-S);let opticalAxis=normalize(C-S+vec2f(.0001,0.));let q=(px-center)/scale;let r=length(vec2f(dot(q,opticalAxis)/4.6,dot(q,vec2f(-opticalAxis.y,opticalAxis.x))/3.0));let pupil=1.-ramp(.45,1.25,r);let offaxis=ramp(3.,24.,length(C-S)/scale);light+=actual*vec3f(.84,.71,.43)*pupil*envelope*survival*offaxis*.016;}
}}}let linear=max(base+light,vec3f(0.));return vec4f(pow(clamp(linear,vec3f(0.),vec3f(1.)),vec3f(1./2.2)),1.);}
