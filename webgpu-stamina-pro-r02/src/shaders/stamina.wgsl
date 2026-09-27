// constants.wgsl is prepended by renderer.mjs. No texture, image, or sampled sprite.
struct View { projection: mat4x4f, metrics: vec4f }
@group(0) @binding(0) var<uniform> view: View;
struct Input {
 @location(0) position: vec3f,
 @location(1) uv: vec2f,
 @location(2) shade: vec4f,
 @location(3) attributes: vec4f,
 @location(4) color: vec4f,
}
struct Output {
 @builtin(position) position: vec4f,
 @location(0) uv: vec2f,
 @location(1) shade: vec4f,
 @location(2) attributes: vec4f,
 @location(3) color: vec4f,
}
fn linearize(c: vec3f) -> vec3f {
 return select(c / 12.92, pow((c + vec3f(0.055)) / 1.055, vec3f(2.4)), c > vec3f(0.04045));
}
@vertex fn vs(input: Input) -> Output {
 var out: Output;
 out.position=view.projection*vec4f(input.position,1.0);
 out.uv=input.uv;out.shade=input.shade;out.attributes=input.attributes;out.color=input.color;
 return out;
}
@fragment fn fs(input: Output) -> @location(0) vec4f {
 // Derivatives are unconditional: no derivative_uniformity suppression.
 let fw=max(fwidth(input.uv),vec2f(0.0001));
 let u=input.uv.x;
 let v=abs(input.uv.y);
 let opacity=input.shade.x;
 let charge=input.shade.y;
 let morph=input.shade.z;
 let leading=input.shade.w;
 let half_width=max(input.attributes.x,0.08);
 let kind=input.attributes.y;
 let flux=input.attributes.z;
 if(kind<0.5){return vec4f(linearize(input.color.rgb),1.0);}
 if(kind>2.5){
   // Surface-bound receiver response; torso/arm depth is still tested.
   let ellipse=length(input.uv*vec2f(1.0,0.91));
   let body=1.0-smoothstep(0.60,1.0,ellipse);
   let filled=1.0-smoothstep(charge*2.0-1.08,charge*2.0-0.88,input.uv.y);
   let alpha=body*filled*opacity*charge*0.24;
   return vec4f(linearize(mix(BODY_COLOR,HOT_COLOR,0.22))*alpha,alpha);
 }
 let tip=smoothstep(0.0,0.042,u)*(1.0-smoothstep(0.958,1.0,u));
 let crest_delta=(u-leading)/0.12;
 let crest=exp(-crest_delta*crest_delta)*(1.0-charge);
 let edge_coverage=1.0-smoothstep(1.0-fw.y,1.0,v);
 let filled=1.0-smoothstep(charge-0.05,charge+0.04,u);
 let structural=mix(0.65+0.26*crest,0.57+0.28*filled,morph);
 if(kind>1.5){
   // Local observation-only diffusion from this exact carrier, not primary geometry.
   let glow=exp(-v*v*3.9)*(1.0-smoothstep(0.70,1.0,v));
   let strength=GLOW_BUDGET*opacity*tip*(0.30+0.70*max(crest,flux));
   return vec4f(linearize(BODY_COLOR)*glow*strength,0.0);
 }
 let edge_fraction=clamp(EDGE_WIDTH/(half_width*max(view.metrics.x,0.5)),0.14,0.46);
 let surface=1.0-smoothstep(1.0-edge_fraction-fw.y,1.0-edge_fraction+fw.y,v);
 let ridge_delta=(input.uv.y+0.26)/0.20;
 let ridge=exp(-ridge_delta*ridge_delta);
 let lamina=0.88+0.12*cos(input.uv.y*4.0+u*3.0);
 let inner=mix(BODY_COLOR,HOT_COLOR,clamp((0.12+0.48*crest+0.15*flux+0.16*charge)*ridge,0.0,0.80));
 let color=mix(EDGE_COLOR,inner*lamina,surface);
 let alpha=opacity*tip*edge_coverage*structural;
 return vec4f(linearize(color)*alpha,alpha);
}
