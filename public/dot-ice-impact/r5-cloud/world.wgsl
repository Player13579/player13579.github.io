struct U{ time:f32, zoom:f32, width:f32,height:f32, cx:f32,cy:f32, source:f32,near:f32 };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> lights:array<vec4f>;
struct V{@builtin(position) clip:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,@location(2) info:vec4f};
fn project(p:vec3f)->vec4f{let px=64.0/(1.778*.92)*u.zoom;return vec4f((p.x-u.cx)*px/(u.width*.5),(p.y*.92-p.z*.39191836-u.cy)*px/(u.height*.5),.5-(p.y*.39191836+p.z*.92)*.008,1);}
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)info:vec4f)->V{var o:V;o.clip=project(p);o.p=p;o.n=n;o.info=info;return o;}
@fragment fn fs(v:V)->@location(0)vec4f{if(v.info.x<-.5){return vec4f(.55,.55,.55,1);}let n=normalize(v.n);let eye=normalize(vec3f(0,.39191836,.92));let l=normalize(vec3f(-.45,.8,.7));let diffuse=.22+.78*max(0,dot(n,l));let fr=.025+.975*pow(1-abs(dot(n,eye)),5);let spec=pow(max(0,dot(reflect(-l,n),eye)),select(30.0,8.0,v.info.x>.5));
 // Approximate thickness from equal-volume diameter and incidence, not scene refraction.
 let thickness=v.info.w/max(.32,abs(dot(n,eye)));
 let trans=exp(-vec3f(.8,.26,.12)*thickness);
 let scatter=(vec3f(1)-trans)*vec3f(.42,.68,.78)*(.38+.62*diffuse);
 let transmitted=trans*vec3f(.055,.12,.18);
 let fresh=select(1.0,.82,v.info.x>.5);
 let body=(scatter+transmitted)*fresh;
 let emission=vec3f(.35,2.2,3.8)*v.info.z*v.info.x;
 let color=body+fr*vec3f(.28,.45,.57)+spec*vec3f(.65,.88,1.0)+emission;
 return vec4f(color*v.info.y,v.info.y);}
struct Q{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn quad(@builtin(vertex_index)i:u32)->Q{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Q;o.p=vec4f(p[i],.99,1);o.uv=p[i];return o;}
@fragment fn ground(q:Q)->@location(0)vec4f{let px=64.0/(1.778*.92)*u.zoom;let x=q.uv.x*u.width*.5/px+u.cx;let z=-(q.uv.y*u.height*.5/px+u.cy)/.39191836;let p=vec3f(x,0,z);var lit=vec3f(0);if(u.source>.5&&u.near>.5){for(var i=0u;i<64u;i++){let a=lights[i];let d=distance(p,a.xyz);let lambert=max(.05,a.y)/max(.1,d);lit+=vec3f(.015,.18,.25)*a.w*lambert*pow(max(0.0,1.0-d/.72),2.0)/(1+d*d*4);}}return vec4f(vec3f(.004,.008,.014)+lit,1);}
