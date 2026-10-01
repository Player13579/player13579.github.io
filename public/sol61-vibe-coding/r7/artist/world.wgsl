struct Frame { viewport:vec2f, origin:vec2f, hPixels:f32, pad0:f32, pad1:f32, pad2:f32 };
struct Stroke { a:vec2f,b:vec2f,halfWidth:f32,r:f32,g:f32,bColor:f32,opacity:f32,emission:f32,kind:f32,pad:f32 };
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var<storage,read> strokes:array<Stroke>;
struct Vary { @builtin(position) position:vec4f,@location(0) uv:vec2f,@location(1) @interpolate(flat) id:u32 };
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->Vary {
  let corners=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let s=strokes[ii]; let uv=corners[vi]; let margin=max(s.halfWidth*2.0,1.25/frame.hPixels);
  let lo=min(s.a,s.b)-vec2f(margin); let hi=max(s.a,s.b)+vec2f(margin);
  let p=mix(lo,hi,uv); let screen=frame.origin+p*frame.hPixels;
  var o:Vary; o.position=vec4f(screen/frame.viewport*vec2f(2,-2)+vec2f(-1,1),0,1);o.uv=p;o.id=ii;return o;
}
struct Result { @location(0) scene:vec4f,@location(1) source:vec4f };
@fragment fn fs(v:Vary)->Result {
  let s=strokes[v.id]; var distance:f32;
  if(s.kind>.5) {
    let center=(s.a+s.b)*.5; let q=abs(v.uv-center)-(abs(s.b-s.a)*.5-vec2f(s.halfWidth));
    distance=length(max(q,vec2f(0)))+min(max(q.x,q.y),0)-s.halfWidth;
  } else {
    let d=s.b-s.a; let along=clamp(dot(v.uv-s.a,d)/max(dot(d,d),1e-10),0,1);
    distance=length(v.uv-s.a-along*d)-s.halfWidth;
  }
  let aa=max(fwidth(distance),.55/frame.hPixels);
  let coverage=1-smoothstep(-aa,aa,distance); let alpha=coverage*s.opacity;
  let c=vec3f(s.r,s.g,s.bColor); var out:Result;
  out.scene=vec4f(c*alpha*(1+s.emission),alpha);
  // Same painter coverage as scene, so plate/body/solids occlude source before optics.
  out.source=vec4f(c*alpha*s.emission,alpha);return out;
}
