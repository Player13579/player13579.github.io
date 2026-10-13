struct VertexOut {@builtin(position) pos:vec4f,@location(0) radiance:vec4f};
@vertex fn worldVS(@location(0) pos:vec2f,@location(1) radiance:vec4f)->VertexOut {var o:VertexOut;o.pos=vec4f(pos,0.0,1.0);o.radiance=radiance;return o;}
@fragment fn worldFS(o:VertexOut)->@location(0) vec4f{return o.radiance;}
