// Mana Acquire r0.1: texture-free ribbon material + bounded analytic edge diffusion.
// Positions are already projected by the host-facing geometry builder.
struct VertexIn {
  @location(0) position: vec2f,
  @location(1) uv: vec2f,
  @location(2) data: vec4f, // mode, facet palette index, opacity envelope, transport wavefront
};
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) data: vec4f,
};
@vertex fn vs(v:VertexIn)->VertexOut {
  var o:VertexOut; o.position=vec4f(v.position,0.0,1.0);o.uv=v.uv;o.data=v.data;return o;
}
@fragment fn fs(v:VertexOut)->@location(0) vec4f {
  let u=v.uv.x; let q=v.uv.y; let a=abs(q);
  let aa=max(fwidth(q)*0.65,0.018);
  let body=1.0-smoothstep(0.88-aa,0.99+aa,a);
  let edge=exp(-pow((a-0.71)/max(aa,0.075),2.0));
  let keyline=smoothstep(0.74,0.85,a)*(1.0-smoothstep(0.98,1.05,a));
  let spine=1.0-smoothstep(0.055,0.14,abs(q+0.17));
  let vapor=0.055*exp(-pow(max(0.0,a-0.78)/0.30,2.0))*(1.0-body);
  let dark=vec3f(0.026,0.054,0.15);
  let cobalt=vec3f(0.12,0.30,0.81);
  let violet=vec3f(0.42,0.28,0.89);
  let cyan=vec3f(0.17,0.84,0.94);
  let ice=vec3f(0.37,0.96,1.0);
  let facet=mix(cobalt,violet,clamp(v.data.y,0.0,1.0));
  var rgb=mix(facet,cyan,smoothstep(-0.5,0.8,q)*0.77);
  rgb=mix(rgb,dark,spine*0.90);
  rgb=mix(rgb,dark,keyline*0.94);
  // Deliberately broken internal highlights. They belong to the folded sheet, not free particles.
  let seam=0.64+0.36*smoothstep(0.36,0.58,u);
  rgb=mix(rgb,ice,edge*seam*0.98);
  let wave=exp(-pow((u-v.data.w)/0.085,2.0));
  rgb=mix(rgb,vec3f(0.19,0.93,1.0),wave*body*0.76);
  var alpha=body*(0.51+0.41*edge+0.32*keyline+0.18*spine+0.19*wave)+vapor;
  if(v.data.x>0.5){
    // Body inlay: still split by a dark central channel; never a solid white core.
    rgb=mix(rgb,cyan,0.12);
    alpha=body*(0.58+0.33*edge+0.08*keyline)+vapor;
  }
  alpha=clamp(alpha*v.data.z,0.0,0.97);

  return vec4f(rgb*alpha,alpha); // premultiplied output; no additive wash over bright scenes
}
