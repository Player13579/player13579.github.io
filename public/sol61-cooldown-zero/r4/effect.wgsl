struct Params { size:vec2f, time:f32, stars:f32, obs:f32, actor:f32, light:f32, reduced:f32 };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
@group(0) @binding(3) var<storage,read> nodes:array<vec4f,65>;
struct VertexOut { @builtin(position) pos:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->VertexOut { var a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VertexOut;o.pos=vec4f(a[i],0,1);return o; }
fn band(d:f32,w:f32)->f32{return 1.0-smoothstep(w-.55,w+.55,abs(d));}
fn env(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return smoothstep(a,b,t)*(1.0-smoothstep(c,d,t));}
fn star(p:vec2f,c:vec2f,size:f32,life:f32)->vec3f{let q=p-c;let cs=.92718385;let sn=.37460659;let r=vec2f(q.x*cs+q.y*sn,-q.x*sn+q.y*cs);let ray=band(r.y,.45)*exp(-abs(r.x)/size)+band(r.x,.45)*exp(-abs(r.y)/(size*.65));return life*(vec3f(1.55,1.38,.96)*(ray+exp(-dot(q,q)/1.5)*1.6)+vec3f(.25,.55,.65)*exp(-dot(q,q)/(size*size*.4))*u.obs);}
fn project(a:vec3f)->vec2f{return vec2f(-12,3)+vec2f(-.8660254,.5)*a.x+vec2f(-.5,-.8660254)*a.y;}
// PH1: 3D連続管の実距離。表裏は同じ形状のz深度と法線から決まる。
fn fieldDistance(p:vec3f)->f32{var d=1000.0;for(var i=0u;i<64u;i++){let a=nodes[i].xyz;let b=nodes[i+1u].xyz;let edge=b-a;let h=clamp(dot(p-a,edge)/dot(edge,edge),0.0,1.0);d=min(d,length(p-a-edge*h)-nodes[i].w);}return d;}
fn projectedDistance(p:vec2f)->f32{var d=1000.0;for(var i=0u;i<64u;i++){let a=nodes[i].xy;let edge=nodes[i+1u].xy-a;let h=clamp(dot(p-a,edge)/dot(edge,edge),0.0,1.0);d=min(d,length(p-a-edge*h)-nodes[i].w);}return d;}
@fragment fn fs(v:VertexOut)->@location(0) vec4f{
 let p=v.pos.xy;let q=p-vec2f(128,66);let t=u.time;
 var bg=mix(vec3f(.045,.055,.085),vec3f(.84,.86,.88),u.light);
 let rect=vec4f(91.1,27,73.8,73.8);let xy=(p-rect.xy)/rect.zw;var actor=vec4f(0);
 if(all(xy>=vec2f(0))&&all(xy<=vec2f(1))){actor=textureSampleLevel(actorTex,actorSampler,xy*vec2f(1.0/3.0,.5),0);}
 bg=mix(bg,actor.rgb,actor.a*u.actor);
 let life=env(t,0,.10,1.24,1.5);if(life<=0.0){return vec4f(bg,1);}
 let delta=q-vec2f(-12,3);let local=vec2f(dot(delta,vec2f(-.8660254,.5)),dot(delta,vec2f(-.5,-.8660254)));
 let compression=smoothstep(.28,.92,t);let color=mix(vec3f(.97,.43,.075),vec3f(.07,.86,.88),compression);
 // The same finite field makes the broad main shape and nearby observation glow.
 if(local.x> -11.0 && local.x<nodes[64].x+11.0 && abs(local.y)<17.0){
   let pd=projectedDistance(local);let glow=exp(-max(pd,0.0)*max(pd,0.0)/12.0)*.17*u.obs;
   bg+=glow*color*life;
   var z=11.0;var hit=false;var minimum=1000.0;
   for(var step=0u;step<48u;step++){let distance=fieldDistance(vec3f(local,z));minimum=min(minimum,distance);if(distance<.035){hit=true;break;}z-=max(distance*.85,.08);if(z < -11.0){break;}}
   if(hit){
     let at=vec3f(local,z);let epsilon=.12;let normal=normalize(vec3f(fieldDistance(at+vec3f(epsilon,0,0))-fieldDistance(at-vec3f(epsilon,0,0)),fieldDistance(at+vec3f(0,epsilon,0))-fieldDistance(at-vec3f(0,epsilon,0)),fieldDistance(at+vec3f(0,0,epsilon))-fieldDistance(at-vec3f(0,0,epsilon))));
     let front=smoothstep(-.25,.35,z);let occlusion=1.0-actor.a*u.actor*(1.0-front);
     let face=.48+.48*max(dot(normal,normalize(vec3f(-.3,.55,.8))),0.0);let bright=pow(max(normal.z,0.0),5.0);
     let field=color*face+vec3f(.84,1.02,.94)*bright*.63;
     bg=mix(bg,field,.52*life*occlusion)+field*.57*life*occlusion;
   }
 }
 // All benefit stars retain 22 degrees, bound to the receiving contact and actual path.
 if(u.stars>.5){
   bg+=star(q,project(nodes[0].xyz),4.0,env(t,.05,.13,.25,.34));
   bg+=star(q,project(nodes[21].xyz),4.2,env(t,.28,.38,.47,.57));
   bg+=star(q,project(nodes[43].xyz),4.2,env(t,.56,.66,.77,.86));
   bg+=star(q,project(nodes[0].xyz),4.8,env(t,.84,.95,1.08,1.21));
 }
 return vec4f(bg,1);
}
