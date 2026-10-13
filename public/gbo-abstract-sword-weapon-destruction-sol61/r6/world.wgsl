struct VertexOut {@builtin(position) pos:vec4f,@location(0) world:vec4f,@location(1) emission:vec4f};
struct WorldOut {@location(0) world:vec4f,@location(1) emission:vec4f};
@vertex fn worldVS(@location(0) pos:vec2f,@location(1) world:vec4f,@location(2) emission:vec4f)->VertexOut{var o:VertexOut;o.pos=vec4f(pos,0.0,1.0);o.world=world;o.emission=emission;return o;}
@fragment fn worldFS(o:VertexOut)->WorldOut{var r:WorldOut;r.world=o.world;r.emission=o.emission;return r;}
