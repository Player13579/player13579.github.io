
// Uniforms are 64 bytes. No background color, texture, character UV or caster ID.
struct Params {
 viewport:vec4f, // framebuffer W,H,Hpx,ageMs
 event:vec4f,    // kind (-1 idle,0..3), authority, impact q (-2 unknown), impact v (-1 unknown)
 pose:vec4f,     // center x,y, yaw radians, pitch radians
 options:vec4f,  // core 0/1, diagnostic 0 normal 1 alpha 2 emission 3 normals, unused, unused
};
@group(0) @binding(0) var<uniform> p:Params;
struct RasterVertex {
 @builtin(position) position:vec4f,
 @location(0) uv:vec2f,
 @location(1) @interpolate(flat) front:f32,
};
fn rotatePoint(g:Point)->vec3f {
 let cy=cos(p.pose.z);let sy=sin(p.pose.z);let cp=cos(p.pose.w);let sp=sin(p.pose.w);
 let x=cy*g.x+sy*g.z;let z=-sy*g.x+cy*g.z;
 return vec3f(x,cp*g.y-sp*z,sp*g.y+cp*z);
}
@vertex fn vs(@builtin(vertex_index) id:u32,@builtin(instance_index) instance:u32)->RasterVertex {
 let nu=$NU$u;let nv=$NV$u;
 // Indexed shared parameter grid: ~6,370 unique vertices for two faces, not 36,864 evaluations.
 let grid=vec2u(id%(nu+1u),id/(nu+1u));
 let q=2.0*f32(grid.x)/f32(nu)-1.0;let v=f32(grid.y)/f32(nv);
 let front=f32(instance); // draw instance 0 back, then 1 front; never draw twice as layers.
 let g=geometry(q,v,p.event.x,p.viewport.w,p.event.y,p.event.z,p.event.w,front);
 let pos=rotatePoint(g);let pixel=p.pose.xy+vec2f(pos.x,-pos.y)*p.viewport.z;
 var out:RasterVertex;out.position=vec4f(2.0*pixel.x/p.viewport.x-1.0,1.0-2.0*pixel.y/p.viewport.y,0.5-pos.z*0.20,1.0);
 out.uv=vec2f(q,v);out.front=front;return out;
}
@fragment fn fs(v:RasterVertex)->@location(0) vec4f {
 let f=material(v.uv.x,v.uv.y,p.event.x,p.viewport.w,p.event.y,p.event.z,p.event.w,v.front,p.viewport.z,p.options.x,p.pose.z,p.pose.w);
 if(p.options.y==1.0){return vec4f(vec3f(f.a),f.a);}
 if(p.options.y==2.0){return vec4f(vec3f(f.emissionY),f.a);}
 if(p.options.y==3.0){return vec4f((vec3f(f.normalX,f.normalY,f.normalZ)*0.5+0.5)*f.a,f.a);}
 // GENERALIZED premultiplied emission: RGB = alpha*surface + coverage*emission.
 // RGB>alpha is legal. Outside coverage both RGB and alpha are zero. No add pass.
 return vec4f(f.r,f.g,f.b,f.a);
}
// GPU/CPU scalar parity. Independent of rasterization; cannot certify visual quality.
struct Probe { config:vec4f, point:vec4f, contact:vec4f }; // kind age auth H; q v front core; iq iv yaw pitch
struct ProbeOut { geometry:vec4f, rgba:vec4f, diagnosis:vec4f };
@group(1) @binding(0) var<storage,read> probes:array<Probe>;
@group(1) @binding(1) var<storage,read_write> probeResults:array<ProbeOut>;
@compute @workgroup_size(64) fn parity(@builtin(global_invocation_id) id:vec3u){
 if(id.x>=arrayLength(&probes)){return;}
 let a=probes[id.x];let g=geometry(a.point.x,a.point.y,a.config.x,a.config.y,a.config.z,a.contact.x,a.contact.y,a.point.z);
 let f=material(a.point.x,a.point.y,a.config.x,a.config.y,a.config.z,a.contact.x,a.contact.y,a.point.z,a.config.w,a.point.w,a.contact.z,a.contact.w);
 probeResults[id.x]=ProbeOut(vec4f(g.x,g.y,g.z,f.coverage),vec4f(f.r,f.g,f.b,f.a),vec4f(f.core,f.emissionY,f.normalX,f.normalY));
}
