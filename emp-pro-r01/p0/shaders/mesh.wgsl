struct Camera { viewport:vec2f, center:vec2f, scale:f32, time:f32, draft:f32, _pad:f32 };
@group(0) @binding(0) var<uniform> cam:Camera;
struct VertexInput {
  @location(0) p:vec3f,
  @location(1) color:vec3f,
  @location(2) mat:vec4f,
  @location(3) uv:vec2f,
};
struct VertexOutput {
  @builtin(position) p:vec4f,
  @location(0) color:vec3f,
  @location(1) mat:vec4f,
  @location(2) uv:vec2f,
};
@vertex fn vertex_main(v:VertexInput)->VertexOutput {
  var o:VertexOutput;
  let xy=(v.p.xy-cam.center)*cam.scale;
  o.p=vec4f(xy.x/cam.viewport.x*2.,xy.y/cam.viewport.y*2.,clamp(.5-v.p.z/2000.,.001,.999),1.);
  o.color=v.color;o.mat=v.mat;o.uv=v.uv;return o;
}
@fragment fn fragment_main(v:VertexOutput)->@location(0) vec4f {
  // Coarse, structural subdivision only; never screen-space noise or a sprite mask.
  var modulation=1.;
  if(v.mat.z>.5&&v.mat.z<1.5){
    let cell=fract(v.uv.x*3.+v.mat.w*.16);
    let border=smoothstep(.04,.12,cell)*(1.-smoothstep(.85,.96,cell));
    modulation=.55+.45*border;
  }
  if(v.mat.z>1.5){modulation=.7+.3*v.uv.y;}
  let a=clamp(v.mat.x,0.,1.);
  let light=.20+v.mat.y*modulation;
  return vec4f(v.color*light*a,a);
}
