struct U {viewport:vec4f,controls:vec4f,flags:vec4f,more:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct Out {@location(0) scene:vec4f,@location(1) emission:vec4f};
fn result(rgb:vec3f,a:f32,e:vec3f)->Out {var o:Out;o.scene=vec4f(rgb,a);o.emission=vec4f(e,a);return o;}
fn ease(a:f32,b:f32,x:f32)->f32 {let q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
fn lifetime()->f32 {let t=u.controls.x;if(t<0.||t>=1.7||u.controls.y<.5||u.flags.x<.5){return 0.;}return ease(0.,.09,t)*(1.-ease(1.37,1.7,t));}
fn field(p:vec3f)->vec4f {
 let life=lifetime();if(life==0.||p.x<=-26.||p.x>=22.||p.y<=-19.||p.y>=17.||abs(p.z)>=9.){return vec4f(0.);}
 let s=clamp((18.-p.x)/42.,0.,1.);let cy=3.-18.*s+5.*s*s;let halfWidth=6.+7.*sin(3.141592654*s);let focusZ=1.8+2.*sin(3.141592654*s);
 let yn=(p.y-cy)/halfWidth;let zn=(p.z-focusZ)/6.;let yy=yn*yn;let zz=zn*zn;let rho=pow(yy*yy+zz*zz,.25);
 let longitudinal=ease(-26.,-21.,p.x)*(1.-ease(17.,22.,p.x));let opening=1.-ease(2.,7.,p.y-cy)*ease(-2.,6.,p.x);
 let front=16.-44.*ease(.12,.90,u.controls.x);let density=(1.-ease(.68,1.,rho))*longitudinal*opening*ease(front-5.,front+5.,p.x)*life;
 let cx=(p.x-front)/4.8;let crest=exp(-cx*cx);let retained=ease(.46,.96,u.controls.x)*(1.-ease(2.,13.,p.x));
 let foldY=cy-2.1+1.2*sin(3.141592654*s);let fy=(p.y-foldY)/3.1;let fz=(p.z-focusZ)/3.6;let focus=exp(-fy*fy)*exp(-fz*fz);
 let hue=vec3f(.18+.09*(1.-s),.28+.53*(1.-s),1.10+.14*(1.-s));let radiance=density*(.52+.58*crest+.34*retained)*(hue*.48+vec3f(.76,1.02,1.12)*focus*.74);
 return vec4f(radiance,density);
}
fn center(id:u32)->vec2f {return vec2f(u.viewport.x*select(.5,select(.25,.75,id==1u),u.more.w>.5),u.viewport.y*.5);}
fn clip(p:vec2f)->vec4f {return vec4f(p/u.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),.5,1.);}
struct VolumeV {@builtin(position) position:vec4f,@location(0) local:vec2f};
@vertex fn volumeVS(@builtin(vertex_index)i:u32,@builtin(instance_index)id:u32)->VolumeV {
 let uv=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));let local=mix(vec2f(-26.,-19.),vec2f(22.,17.),uv[i]);var v:VolumeV;v.local=local;v.position=clip(center(id)+local*u.viewport.z/64.);return v;
}
fn integrate(local:vec2f,front:bool)->Out {
 var e=vec3f(0.);var optical=0.;let dz=9./16.;
 for(var j=0u;j<16u;j++){let z=(f32(j)+.5)*dz*select(-1.,1.,front);let f=field(vec3f(local,z));e+=f.xyz*dz*.16;optical+=f.w*dz*.027;}
 return result(e,1.-exp(-optical),e);
}
@fragment fn backFS(v:VolumeV)->Out {if(u.more.z<.5){return result(vec3f(0.),0.,vec3f(0.));}return integrate(v.local,false);}
@fragment fn frontFS(v:VolumeV)->Out {if(u.more.y<.5){return result(vec3f(0.),0.,vec3f(0.));}return integrate(v.local,true);}
struct BodyV {@builtin(position) position:vec4f,@location(0) local:vec2f,@location(1) uv:vec2f};
@vertex fn bodyVS(@builtin(vertex_index)i:u32,@builtin(instance_index)id:u32)->BodyV {
 let q=array<vec2f,6>(vec2f(-.5,-.5),vec2f(.5,-.5),vec2f(-.5,.5),vec2f(-.5,.5),vec2f(.5,-.5),vec2f(.5,.5));var v:BodyV;v.local=q[i]*vec2f(64.*136./225.,64.);v.position=clip(center(id)+v.local*u.viewport.z/64.);v.uv=(vec2f(62.,15.)+(q[i]+vec2f(.5))*vec2f(136.,225.))/vec2f(768.,512.);return v;
}
@fragment fn bodyFS(v:BodyV)->Out {
 if(u.flags.y<.5){return result(vec3f(0.),0.,vec3f(0.));}let tex=textureSample(actor,samp,v.uv);var incident=vec3f(0.);
 if(u.flags.z>.5){let offsets=array<vec3f,3>(vec3f(-2.,0.,2.),vec3f(2.,0.,2.),vec3f(0.,-2.,2.));for(var j=0u;j<3u;j++){incident+=field(vec3f(v.local,0.)+offsets[j]).xyz*.045;}}
 return result((pow(tex.rgb,vec3f(2.2))+incident)*tex.a,tex.a,incident*tex.a*.20);
}
fn source(i:u32)->vec4f {
 let points=array<vec3f,3>(vec3f(16.,3.,2.),vec3f(0.,-7.,3.),vec3f(-16.,-10.,2.));let peaks=array<f32,3>(.22,.64,1.16);let widths=array<f32,3>(.115,.14,.18);let q=(u.controls.x-peaks[i])/widths[i];var g=0.;if(abs(q)<1.&&u.flags.w>.5){let a=1.-q*q;g=a*a*lifetime();}return vec4f(points[i],g);
}
struct PointV {@builtin(position) position:vec4f,@location(0) uv:vec2f,@location(1) gain:f32,@location(2) depth:f32};
@vertex fn pointVS(@builtin(vertex_index)i:u32,@builtin(instance_index)instance:u32)->PointV {
 let q=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));let src=source(instance%3u);var v:PointV;v.position=clip(center(instance/3u)+(src.xy+q[i]*2.2)*u.viewport.z/64.);v.uv=q[i];v.gain=src.w;v.depth=src.z;return v;
}
fn point(v:PointV)->Out {let e=vec3f(7.2,7.2,7.0)*exp(-dot(v.uv,v.uv)/.18)*(1.-ease(.85,1.,length(v.uv)))*v.gain;return result(e,0.,e);}
@fragment fn pointBackFS(v:PointV)->Out {if(v.depth>=0.||u.more.z<.5){return result(vec3f(0.),0.,vec3f(0.));}return point(v);}
@fragment fn pointFrontFS(v:PointV)->Out {if(v.depth<0.||u.more.y<.5){return result(vec3f(0.),0.,vec3f(0.));}return point(v);}
