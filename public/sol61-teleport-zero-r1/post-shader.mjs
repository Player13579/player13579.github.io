// OBS専用。最終encode/toneMapを含まない。owner間でsignal/fociを共有しない。
export const TELEPORT_POST_WGSL = /* wgsl */ `
struct U { viewport:vec4<f32>, anchor:vec4<f32>, optic:vec4<f32>, phase:vec4<f32> };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var signal:texture_2d<f32>;
@group(0) @binding(2) var blur:texture_2d<f32>;
@group(0) @binding(3) var scene:texture_2d<f32>;
@group(0) @binding(4) var s:sampler;
struct V { @builtin(position) position:vec4<f32>, @location(0) uv:vec2<f32> };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 let p=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
 var o:V; o.position=vec4<f32>(p[i],0.,1.); o.uv=p[i]*vec2<f32>(.5,-.5)+vec2<f32>(.5); return o;
}
fn boundedSample(tex:texture_2d<f32>,uv:vec2<f32>)->vec3<f32> {
 let q=clamp(uv,vec2<f32>(0.),vec2<f32>(1.));
 let inside=select(0.,1.,all(uv>=vec2<f32>(0.))&&all(uv<=vec2<f32>(1.)));
 return textureSampleLevel(tex,s,q,0.).rgb*inside;
}
@fragment fn blurFS(v:V)->@location(0) vec4<f32> {
 // 2 separable passes。phase.xyはpixel方向、phase.zはH64基準のσ倍率。
 let d=u.phase.xy/u.viewport.xy*max(.5,u.phase.z); var c=boundedSample(signal,v.uv)*.2260;
 c+=(boundedSample(signal,v.uv+d)+boundedSample(signal,v.uv-d))*.1932;
 c+=(boundedSample(signal,v.uv+2.*d)+boundedSample(signal,v.uv-2.*d))*.1214;
 c+=(boundedSample(signal,v.uv+3.*d)+boundedSample(signal,v.uv-3.*d))*.054;
 c+=(boundedSample(signal,v.uv+4.*d)+boundedSample(signal,v.uv-4.*d))*.0163;
 c+=(boundedSample(signal,v.uv+5.*d)+boundedSample(signal,v.uv-5.*d))*.0021;
 return vec4<f32>(c,0.);
}
@fragment fn finishFS(v:V)->@location(0) vec4<f32> {
 let base=textureSampleLevel(scene,s,v.uv,0.); let H=max(u.anchor.z,1.);
 let foci=(u.anchor.xy+vec2<f32>(-u.anchor.w,-.48)*H)/u.viewport.xy;
 // 遮蔽済み、owner固有の実sourceだけが光学を駆動する。
 let source=boundedSample(signal,foci); let axis=(foci-vec2<f32>(.5))*u.viewport.xy;
 let ghostCenter=(foci*u.viewport.xy-.23*axis);
 let q=(v.position.xy-ghostCenter)/H;
 // 直角開口由来のぼけた像。独立装飾でなく同一sourceの弱いゴースト。
 let aperture=exp(-pow(abs(q.x)/.10,4.)-pow(abs(q.y)/.063,4.));
 let ghost=source*vec3<f32>(.65,.80,1.)*u.optic.y*aperture;
 // 受け手sceneの色成分はずらさず、source像の境界だけ色差を加える。
 let delta=vec2<f32>(u.optic.z,0.)/u.viewport.xy;
 let src=boundedSample(signal,v.uv);
 let shifted=vec3<f32>(boundedSample(signal,v.uv+delta).r,src.g,boundedSample(signal,v.uv-delta).b);
 let fringe=max(shifted-src,vec3<f32>(0.))*.11;
 let bloom=boundedSample(blur,v.uv)*u.optic.x;
 return vec4<f32>(base.rgb+bloom+ghost+fringe,base.a);
}
`;
export function packPostUniforms(state, {width,height,anchorX,anchorY,bodyH=64,direction=[1,0]}) {
 if (![width,height,anchorX,anchorY,bodyH,...direction].every(Number.isFinite) || width<1 || height<1 || bodyH<1) throw new TypeError('post-uniforms');
 return new Float32Array([width,height,0,0, anchorX,anchorY,bodyH,state.halfOpeningH,
   state.bloomGain,state.ghostGain,state.fringePx,0, direction[0],direction[1],bodyH/64,0]);
}
