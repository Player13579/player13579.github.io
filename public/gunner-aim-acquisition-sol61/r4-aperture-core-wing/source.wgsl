struct U { viewport: vec4f, endpoints: vec4f, state: vec4f, controls: vec4f }
@group(0) @binding(0) var<uniform> u: U;
struct V { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i:u32)->V { let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i];var v:V;v.position=vec4f(p,0,1);v.uv=p*vec2f(.5,-.5)+vec2f(.5);return v; }
fn box(p:vec2f,b:vec2f)->f32 { let q=abs(p)-b;return length(max(q,vec2f(0)))+min(max(q.x,q.y),0); }
fn apertureShape(p:vec2f,age:f32)->f32 {
 let folded=abs(p);let progress=smoothstep(0.,300.,age);
 let radius=mix(68.,42.426407,progress);
 let normal=(folded.x+folded.y)*.70710678-radius;
 let tangent=(folded.x-folded.y)*.70710678;
 // R3: 青い収束面。表示上の状態遷移であり、世界内の物質輸送ではない。
 let acquire=max(abs(normal)-12.,abs(tangent)-(14.+normal*.20));
 // R3: 内側14pxの開口を保持し、32px面の内角16pxを切り抜く。16px幅の青い腕。
 let q=folded-vec2f(30.);
 let outer=box(q,vec2f(16.));
 let cut=box(q+vec2f(10.),vec2f(10.));
 let confirmed=max(outer,-cut);
 return mix(acquire,confirmed,smoothstep(200.,300.,age));
}
@fragment fn fs(v:V)->@location(0) vec4f {
 let p=v.uv*u.viewport.xy;let local=(p-u.endpoints.zw)/u.state.y;let age=u.state.x;
 let alive=select(0.,1.,age>=0.&&age<900.&&u.controls.x>.5);
 let onset=smoothstep(0.,85.,age);let release=1.-smoothstep(670.,900.,age);
 let progress=smoothstep(200.,300.,age);let surfaceDistance=apertureShape(local,age);
 let coverage=1.-smoothstep(-.65/u.state.y,.65/u.state.y,surfaceDistance);
 let edge=exp(-pow((surfaceDistance+.9)/1.1,2.));
 // R3: 既存面を一度だけ横断する確認前線。空間外に粒子・光条を追加しない。
 let scanCoordinate=(abs(local.x)+abs(local.y))*.70710678;
 let scanPosition=mix(76.,24.,smoothstep(230.,430.,age));
 let scan=exp(-pow((scanCoordinate-scanPosition)/1.25,2.))*smoothstep(215.,260.,age)*(1.-smoothstep(430.,490.,age));
 let peak=exp(-pow((age-315.)/82.,2.));
 let depth=clamp(-surfaceDistance/8.,0.,1.);
 let faceColor=mix(vec3f(.015,.25,.72),vec3f(.008,.22,.95),progress);
 let face=faceColor*(1.+depth*.2)*(1.+peak*.18);
 let boundary=vec3f(3.8,4.5,4.8)*edge*(.8+peak*1.8);
 let confirmedScan=vec3f(3.8,4.5,4.8)*scan*1.6;
 let signal=(face+boundary+confirmedScan)*coverage*onset*release*alive;
 return vec4f(signal,coverage*onset*release*alive);
}

