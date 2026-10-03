
struct Light { positionRange:vec4f, colorIntensity:vec4f };
@group(0) @binding(0) var<storage,read> lights:array<Light>;
@group(0) @binding(1) var baseRadiance:texture_2d<f32>;
@group(0) @binding(2) var albedo:texture_2d<f32>;
@group(0) @binding(3) var worldNormal:texture_2d<f32>;
@group(0) @binding(4) var worldPosition:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);
}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let xy=vec2i(pixel.xy);let base=textureLoad(baseRadiance,xy,0);let material=textureLoad(albedo,xy,0);
 let normalData=textureLoad(worldNormal,xy,0);let pos=textureLoad(worldPosition,xy,0);var irradiance=vec3f(0);
 if(pos.w>0.5 && normalData.w>0.5 && length(normalData.xyz)>0.0001){let normal=normalize(normalData.xyz);
   for(var i=0u;i<arrayLength(&lights);i++){let l=lights[i];let delta=l.positionRange.xyz-pos.xyz;
     let distance=max(length(delta),0.001);let cutoff=pow(max(0.0,1.0-distance/l.positionRange.w),2.0);
     let cosine=max(dot(normal,delta/distance),0.0);
     irradiance+=l.colorIntensity.rgb*l.colorIntensity.w*cosine*cutoff/(1.0+distance*distance/225.0);
   }
 }
 // Actual per-surface Lambert response; preserve original radiance. No fake halo or full-screen tint.
 let lit=base.rgb+material.rgb*irradiance;return vec4f(lit,base.a);
}
