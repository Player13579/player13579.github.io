struct U { time:f32, scale:f32, width:f32, height:f32, reduced:f32, unused0:f32, unused1:f32, unused2:f32 };
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) clip:vec4f, @location(0) normal:vec3f, @location(1) local:vec3f, @location(2) age:f32, @location(3) @interpolate(flat) id:u32, @location(4) world:vec3f };
fn project(p:vec3f)->vec4f {let s=36.0*u.scale;return vec4f(p.x*s/(u.width*.5), (p.y*.92-p.z*.38-.15)*s/(u.height*.5), .5-(p.z*.92+p.y*.38)*.015,1);}
fn rotate(p:vec3f,a:f32,b:f32)->vec3f{let q=vec3f(p.x*cos(a)-p.y*sin(a),p.x*sin(a)+p.y*cos(a),p.z);return vec3f(q.x*cos(b)+q.z*sin(b),q.y,-q.x*sin(b)+q.z*cos(b));}
@vertex fn vs(@location(0) pos:vec3f,@location(1) norm:vec3f,@builtin(instance_index) id:u32)->V {
 let f=f32(id);let age=u.time-.38;let t=select(max(age,0),.17,u.reduced>.5);let angle=f*2.399963;let tier=select(.62,1.0,id<4u);let size=vec3f(.105+.055*cos(f*1.7),.22+.12*sin(f*.9+1.1),.10+.035*sin(f))*tier;
 var p=pos*size;var n=norm;var center=vec3f(0);
 if(id==0u && age<0){let k=clamp(u.time/.38,0,1);center=vec3f(-2.7*(1-k),.20+1.15*(1-k),0);p=rotate(pos*vec3f(.17,.42,.17),-1.1,0.4);n=rotate(norm,-1.1,.4);}
 else {let vx=cos(angle)*(1.1+f*.085)+.65;let vz=sin(angle)*(1.0+f*.055);let vy=2.6+1.5*abs(sin(f*1.31));let h=.12+vy*t-4.9*t*t;let bounce=max(0.0,-h)*.22;center=vec3f(vx*t,max(.045,h+bounce),vz*t);p=rotate(p,angle+t*(1.3-f*.21),f*.7+t*.9);n=rotate(n,angle+t*(1.3-f*.21),f*.7+t*.9);}
 if(age<0 && id!=0u){p=vec3f(0);center=vec3f(0,-100,0);}
 var o:V;o.world=p+center;o.clip=project(o.world);o.normal=n;o.local=pos;o.age=age;o.id=id;return o;
}
@fragment fn fs(v:V)->@location(0) vec4f {
 let n=normalize(v.normal);let eye=normalize(vec3f(0,.38,.92));let light=normalize(vec3f(-.4,.8,.5));let ndl=max(dot(n,light),0);let fresnel=.022+.978*pow(1-abs(dot(n,eye)),5);let thickness=.18+.25*(1-abs(v.local.y));let transmission=exp(-vec3f(4.8,1.0,.32)*thickness);
 let body=mix(vec3f(.025,.09,.26),transmission*vec3f(.15,.65,.88),.34+.66*ndl);let spec=pow(max(dot(reflect(-light,n),eye),0),40)*1.8;let pulse=select(0.0,exp(-max(v.age,0)*14),v.age>=0);let vein=pow(max(0.0,1-abs(v.local.x*.8+v.local.y*.24)*4),10);
 let emission=vec3f(.8,4.8,7.2)*pulse*(.18+vein*1.1);let color=body+fresnel*vec3f(.45,.8,1.05)+spec+emission;let fade=1-smoothstep(.72,1.17,v.age);if(fade<=0){discard;}return vec4f(color*fade,fade);
}
struct Q { @builtin(position) p:vec4f, @location(0) uv:vec2f };
@vertex fn quad(@builtin(vertex_index)i:u32)->Q{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Q;o.p=vec4f(p[i],.99,1);o.uv=p[i];return o;}
@fragment fn ground(q:Q)->@location(0) vec4f{let s=36*u.scale;let screen=vec2f(q.uv.x*u.width*.5,q.uv.y*u.height*.5);let x=screen.x/s;let z=-(screen.y/s+.15)/.38;let age=u.time-.38;let pulse=select(0.0,exp(-max(age,0)*12),age>=0);let falloff=exp(-(x*x+z*z)*1.8)*pulse;let base=vec3f(.0037,.007,.014);return vec4f(base+vec3f(.015,.22,.34)*falloff,1);}
