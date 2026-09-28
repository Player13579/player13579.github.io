// OBS2: 共通IntensityBudget、mask再適用、linear→sRGB、premultiplied alpha出力。
@group(0) @binding(0) var core:texture_2d<f32>;
@group(0) @binding(1) var glow:texture_2d<f32>;
@group(0) @binding(2) var visibility:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
fn srgb(x:vec3f)->vec3f{return select(12.92*x,1.055*pow(max(x,vec3f(0.)),vec3f(1./2.4))-0.055,x>vec3f(0.0031308));}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f{
 let at=vec2i(p.xy);let m=textureLoad(visibility,at,0).r;
 let c=textureLoad(core,at,0);let h=textureLoad(glow,at,0);
 let haloAlpha=clamp(h.a*0.16,0.,0.095);
 let a=clamp(c.a+haloAlpha*(1.-c.a),0.,0.96)*m;
 if(a<0.00001){return vec4f(0.);}
 let linear=(c.rgb+h.rgb*0.15)*m/max(a,0.00001);
 // 白い塊にしないsoft shoulder。表示変換後の色を実在物性値と呼ばない。
 let mapped=linear/(vec3f(1.)+linear*0.56);
 let rgb=clamp(srgb(mapped),vec3f(0.),vec3f(0.965));
 return vec4f(rgb*a,a);
}
