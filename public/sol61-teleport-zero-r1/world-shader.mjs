// host は full-screen triangle、same-device MRT、linear HDR を設定する。
// uniforms 96 bytes = 6 vec4<f32>。uv x/y down。H はactual selected body height。
export const TELEPORT_WORLD_WGSL = /* wgsl */ `
struct U { viewport:vec4<f32>, anchor:vec4<f32>, shape:vec4<f32>, light:vec4<f32>, receiver:vec4<f32>, optics:vec4<f32> };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var solidCoverage:texture_2d<f32>;
struct V { @builtin(position) position:vec4<f32>, @location(0) uv:vec2<f32> };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 let p=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
 var o:V; o.position=vec4<f32>(p[i],0.,1.); o.uv=p[i]*vec2<f32>(.5,-.5)+vec2<f32>(.5); return o;
}
fn sdBox(p:vec2<f32>,b:vec2<f32>)->f32 { let q=abs(p)-b; return length(max(q,vec2<f32>(0.)))+min(max(q.x,q.y),0.); }
fn edge(d:f32,aa:f32)->f32 { return 1.-smoothstep(-aa,aa,d); }
fn gate(p:vec2<f32>,sgn:f32,aa:f32)->vec3<f32> {
 // 二枚の浅い直角面。y方向skewによる奥行きを保持、中央は実際の開口。
 let q=vec2<f32>((p.x-sgn*u.shape.x)-sgn*(p.y+.48)*u.shape.y,p.y+.48);
 let spine=sdBox(q,vec2<f32>(.0275,.56));
 let capTop=sdBox(q-vec2<f32>(-sgn*.085,-.56),vec2<f32>(.1125,.033));
 let capBottom=sdBox(q-vec2<f32>(-sgn*.085,.56),vec2<f32>(.1125,.033));
 let d=min(spine,min(capTop,capBottom)); let a=edge(d,aa);
 let rim=edge(abs(d)-.009,aa)*a;
 // 輸送方向を示す3個の広い鍵。noise、読めない文字、粒子を使わない。
 let key0=edge(sdBox(q-vec2<f32>(0.,-.31),vec2<f32>(.035,.036)),aa);
 let key1=edge(sdBox(q-vec2<f32>(0.,0.),vec2<f32>(.035,.045)),aa);
 let key2=edge(sdBox(q-vec2<f32>(0.,.31),vec2<f32>(.035,.036)),aa);
 return vec3<f32>(a,rim,max(key0,max(key1,key2)));
}
struct Out { @location(0) scene:vec4<f32>, @location(1) sourceSignal:vec4<f32> };
@fragment fn fs(v:V)->Out {
 let H=max(u.anchor.z,1.); let p=(v.position.xy-u.anchor.xy)/H; let aa=max(.65/H,fwidth(p.x));
 let left=gate(p,-1.,aa); let right=gate(p,1.,aa);
 // rear=upper body-height parts、front=lower crossing。切分はopacityもsignalも同一。
 let front=smoothstep(-.22,-.18,p.y); let layer=select(1.-front,front,u.anchor.w>.5);
 let a=max(left.x,right.x)*u.shape.z*layer;
 let rim=max(left.y,right.y); let keys=max(left.z,right.z);
 let seam=edge(sdBox(p-vec2<f32>(0.,-.48),vec2<f32>(.012,.53)),aa)*(1.-smoothstep(.07,.15,u.shape.x));
 let foot=edge(sdBox(p-vec2<f32>(0.,.105),vec2<f32>(u.shape.x+.1,.024)),aa);
 let energy=(u.light.x*rim+u.light.y*seam+u.light.z*keys+.42*u.light.w*foot)*layer;
 let color0=mix(vec3<f32>(.08,.56,.95),vec3<f32>(.55,.95,1.),clamp(seam,0.,1.));
 let color=mix(color0,vec3<f32>(.86,.96,1.),clamp(keys*.45,0.,1.));
 let radiance=color*energy;
 // 固い前景のpainter-order coverageを光学前に掛ける。後処理側でbodyholeを再生しない。
 let coords=vec2<i32>(clamp(v.position.xy,vec2<f32>(0.),u.viewport.xy-vec2<f32>(1.)));
 let visible=1.-clamp(textureLoad(solidCoverage,coords,0).r,0.,1.);
 var o:Out; o.scene=vec4<f32>((vec3<f32>(.022,.075,.17)*a+radiance)*visible,a*visible);
 o.sourceSignal=vec4<f32>(radiance*visible,0.); return o;
}
// host actual-body passでexisting RGBlinearへ一度だけ加算。UV/crop/alpha再decodeをしない。
fn teleportBodyIrradiance(worldPixel:vec2<f32>)->vec3<f32> {
 let p=(worldPixel-u.anchor.xy)/max(u.anchor.z,1.);
 let m=(1.-smoothstep(.28,.52,abs(p.x)))*smoothstep(-1.13,-.98,p.y)*(1.-smoothstep(.07,.18,p.y));
 return vec3<f32>(.08,.56,.95)*u.receiver.x*m*(.55+.45*clamp(.5-p.x,0.,1.));
}
fn teleportSurfaceIrradiance(worldPixel:vec2<f32>)->vec3<f32> {
 let p=(worldPixel-u.anchor.xy)/max(u.anchor.z,1.);
 let m=(1.-smoothstep(.20,.68,abs(p.x)))*(1.-smoothstep(.10,.29,abs(p.y-.10)));
 return vec3<f32>(.08,.56,.95)*u.light.w*.20*m;
}
`;
export function packWorldUniforms(state, {width,height,anchorX,anchorY,bodyH=64,layer='rear'}) {
 if (![width,height,anchorX,anchorY,bodyH].every(Number.isFinite) || width<1 || height<1 || bodyH<1 || !['rear','front'].includes(layer)) throw new TypeError('world-uniforms');
 return new Float32Array([width,height,0,0, anchorX,anchorY,bodyH,layer==='front'?1:0,
   state.halfOpeningH,state.skewH,state.gateAlpha,state.t,
   state.core,state.seam,state.core*.36,state.footEnergy, state.receiver,0,0,0,
   state.bloomGain,state.ghostGain,state.fringePx,0]);
}
