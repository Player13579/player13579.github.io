struct Params { viewport:vec4f, rect:vec4f }
@group(0) @binding(0) var<uniform> u:Params;
struct Out { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) n:u32)->Out {var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Out;o.position=vec4f(p[n],0,1);return o;}
fn roundedBox(p:vec2f,halfSize:vec2f,r:f32)->f32 {let q=abs(p)-halfSize+vec2f(r);return length(max(q,vec2f(0)))+min(max(q.x,q.y),0.0)-r;}
fn srgbToScene(c:vec3f)->vec3f {let v=pow(c/255.0,vec3f(2.2));return v/(vec3f(1)-v);}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let background=vec3f(0.012,0.025,0.03);
 if(u.viewport.w<0.5){return vec4f(background,1.0);}
 let cssPixel=pixel.xy/u.viewport.z;
 let local=cssPixel-u.rect.xy;
 let halfOuter=u.rect.zw*0.5;
 let dOuter=roundedBox(local-halfOuter,halfOuter,7.0);
 let innerSize=max(u.rect.zw-vec2f(2.0),vec2f(0));
 let innerHalf=innerSize*0.5;
 let dInner=roundedBox(local-halfOuter+vec2f(1.0),innerHalf,6.0);
 let fill=srgbToScene(vec3f(35.0,53.0,50.0));
 let border=srgbToScene(vec3f(69.0,97.0,94.0));
 let outerAa=max(fwidth(dOuter)*0.5,0.0001);
 let innerAa=max(fwidth(dInner)*0.5,0.0001);
 let outerCoverage=1.0-smoothstep(-outerAa,outerAa,dOuter);
 let innerCoverage=1.0-smoothstep(-innerAa,innerAa,dInner);
 let rgb=mix(background,mix(border,fill,innerCoverage),outerCoverage);
 return vec4f(rgb,1.0);
}
