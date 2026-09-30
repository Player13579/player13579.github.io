struct U {viewport:vec4f,controls:vec4f,flags:vec4f,more:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var emission:texture_2d<f32>;
@group(0) @binding(3) var nearTexture:texture_2d<f32>;
@group(0) @binding(4) var samp:sampler;
@vertex fn fullVS(@builtin(vertex_index)i:u32)->@builtin(position) vec4f {let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(q[i],.5,1.);}
fn filtered(p:vec2f,d:vec2f)->vec4f {var e=vec3f(0.);var weight=0.;for(var j=-7;j<=7;j++){let w=exp(-f32(j*j)/18.);e+=textureSampleLevel(nearTexture,samp,(p+d*f32(j)*max(1.,round(u.viewport.w)))/u.viewport.xy,0.).rgb*w;weight+=w;}return vec4f(e/weight,0.);}
@fragment fn horizontal(@builtin(position)p:vec4f)->@location(0) vec4f {return filtered(p.xy,vec2f(1.,0.));}
@fragment fn vertical(@builtin(position)p:vec4f)->@location(0) vec4f {return filtered(p.xy,vec2f(0.,1.));}
fn ease(a:f32,b:f32,x:f32)->f32 {let q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
fn center(id:u32)->vec2f {return vec2f(u.viewport.x*select(.5,select(.25,.75,id==1u),u.more.w>.5),u.viewport.y*.5);}
fn rays(p:vec2f,id:u32)->vec3f {
 let points=array<vec2f,3>(vec2f(16.,3.),vec2f(0.,-7.),vec2f(-16.,-10.));let peaks=array<f32,3>(.22,.64,1.16);let widths=array<f32,3>(.115,.14,.18);var e=vec3f(0.);
 for(var j=0u;j<3u;j++){let a=(u.controls.x-peaks[j])/widths[j];if(abs(a)>=1.){continue;}let src=center(id)+points[j]*u.viewport.z/64.;let q=(p-src)/(u.viewport.z/64.);let v=vec2f(.857167301*q.x+.515038075*q.y,-.515038075*q.x+.857167301*q.y);
  if(abs(v.x)>=7.||abs(v.y)>=4.){continue;}let surviving=textureSampleLevel(emission,samp,src/u.viewport.xy,0.).rgb;let visible=ease(.7,1.4,min(surviving.x,min(surviving.y,surviving.z)));
  let apod=(1.-ease(6.,7.,abs(v.x)))*(1.-ease(3.,4.,abs(v.y)));let cross=exp(-v.x*v.x/12.-v.y*v.y/.12)+exp(-v.x*v.x/.12-v.y*v.y/4.);e+=vec3f(3.7,4.2,4.4)*cross*apod*visible*pow(1.-a*a,2.);
 }return e;
}
@fragment fn composite(@builtin(position)p:vec4f)->@location(0) vec4f {
 let uv=p.xy/u.viewport.xy;let base=textureSampleLevel(scene,samp,uv,0.).rgb;var e=vec3f(0.);if(u.more.x>.5&&u.controls.y>.5&&u.flags.x>.5){e+=textureSampleLevel(nearTexture,samp,uv,0.).rgb*.30;if(u.controls.w>.5&&u.flags.w>.5){e+=rays(p.xy,0u);if(u.more.w>.5){e+=rays(p.xy,1u);}}}return vec4f(pow(max(base+e,vec3f(0.)),vec3f(1./2.2)),1.);
}
