// Native-size reconstruction after ordered depth peeling. r0.5 adds a tightly source-bound observation response.
struct DisplayParams { size:vec4f,background:vec4f,flags:vec4f };
@group(0) @binding(0) var peeledColor:texture_2d_array<f32>;
@group(0) @binding(1) var peeledZ:texture_2d_array<f32>;
@group(0) @binding(2) var<uniform> d:DisplayParams;
@group(1) @binding(0) var nativeField:texture_2d<f32>;
@group(2) @binding(0) var encodedFrame:texture_2d<f32>;
@vertex fn vsFull(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let positions=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));return vec4f(positions[i],0.0,1.0);
}
struct ResolveOut { @location(0) color:vec4f,@location(1) info:vec4f };
@fragment fn resolve(@builtin(position) pos:vec4f)->ResolveOut{
 let ss=i32(d.size.z);let nativeXY=vec2i(pos.xy);var sum=vec4f(0.0);var countMax=0.0;var rangeMax=0.0;var overflow=0.0;
 for(var j=0;j<ss;j++){for(var i=0;i<ss;i++){
  let loc=nativeXY*ss+vec2i(i,j);var c=vec4f(0.0);var count=0.0;var nearest=1.0;var farthest=0.0;
  for(var layer=3;layer>=0;layer--){
   let f=textureLoad(peeledColor,loc,layer,0);let z=textureLoad(peeledZ,loc,layer,0).r;
   if(z<0.99999){count+=1.0;nearest=min(nearest,z);farthest=max(farthest,z);} c=f+(1.0-f.a)*c;
  }
  let probe=textureLoad(peeledZ,loc,4,0).r;if(probe<0.99999){overflow=1.0;} sum+=c;countMax=max(countMax,count);rangeMax=max(rangeMax,max(0.0,farthest-nearest));
 }}
 let color=sum/f32(ss*ss);return ResolveOut(color,vec4f(countMax,rangeMax,1.0-color.a,overflow));
}
fn encodeSRGB(c:vec3f)->vec3f{return select(12.92*c,1.055*pow(max(c,vec3f(0.0)),vec3f(1.0/2.4))-0.055,c>vec3f(0.0031308));}
fn luma(c:vec3f)->f32{return dot(c,vec3f(0.2126,0.7152,0.0722));}
fn sampleHalo(loc:vec2i,ofs:vec2i,weight:f32)->vec3f{
 let t=textureLoad(nativeField,loc+ofs,0);let y=luma(t.rgb);let gate=smoothstep(0.10,0.36,y)*smoothstep(0.01,0.10,t.a);let norm=t.rgb/max(0.0001,y);return weight*gate*norm*y;
}
@fragment fn display(@builtin(position) pos:vec4f)->@location(0) vec4f{
 let xy=vec2i(pos.xy);let f=textureLoad(nativeField,xy,0);var bg=d.background.xyz;
 if(d.background.w>0.5){let b=(i32(pos.x)/4+i32(pos.y)/4)%2;bg=select(vec3f(0.025),vec3f(0.85),b==0);} var c=f.rgb+(1.0-f.a)*bg;
 let localY=luma(f.rgb);let baseGate=smoothstep(0.06,0.24,localY)*smoothstep(0.01,0.09,f.a);
 let halo=(sampleHalo(xy,vec2i(-1,0),0.14)+sampleHalo(xy,vec2i(1,0),0.14)+sampleHalo(xy,vec2i(0,-1),0.16)+sampleHalo(xy,vec2i(0,1),0.16)+sampleHalo(xy,vec2i(-2,0),0.06)+sampleHalo(xy,vec2i(2,0),0.06)+sampleHalo(xy,vec2i(0,-2),0.08)+sampleHalo(xy,vec2i(0,2),0.08));
 c+=0.11*baseGate*halo;
 c=c/max(1.0,max(c.r,max(c.g,c.b)));
 if(d.flags.x>0.5){c=vec3f(dot(c,vec3f(0.2126,0.7152,0.0722)));}
 return vec4f(encodeSRGB(max(c,vec3f(0.0))),1.0);
}
@fragment fn present(@builtin(position) pos:vec4f)->@location(0) vec4f{return textureLoad(encodedFrame,vec2i(pos.xy),0);}
