export const postShader=/*wgsl*/`
struct Frame {viewport:vec4f,phase:vec4f,gates:vec4f,optics:vec4f,layout:vec4f,contact:vec4f,camera:vec4f,bounds:vec4f};
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var radiance:texture_2d<f32>;
@group(0) @binding(3) var sourceSignal:texture_2d<f32>;
@group(0) @binding(4) var filtered:texture_2d<f32>;
@group(0) @binding(5) var sampleLinear:sampler;
@vertex fn fullVS(@builtin(vertex_index)i:u32)->@builtin(position)vec4f {let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(q[i],0.,1.);}
fn gaussian(p:vec2f,axis:vec2f)->vec4f {var colour=vec3f(0.);var W=0.;for(var i=-7;i<=7;i++){let w=exp(-f32(i*i)/18.);colour+=textureSampleLevel(filtered,sampleLinear,(p+axis*f32(i)*frame.viewport.w)/frame.viewport.xy,0.).rgb*w;W+=w;}return vec4f(colour/W,0.);}
@fragment fn horizontal(@builtin(position)p:vec4f)->@location(0)vec4f{return gaussian(p.xy,vec2f(1.,0.));}
@fragment fn vertical(@builtin(position)p:vec4f)->@location(0)vec4f{return gaussian(p.xy,vec2f(0.,1.));}
fn view(p:vec3f)->vec3f{let z=-.275637356*p.x+.961261696*p.z;return vec3f(.961261696*p.x+.275637356*p.z,.992546152*p.y-.121869343*z,.121869343*p.y+.992546152*z);}
fn unit(v:vec3f)->vec3f{return v/max(length(v),.000001);}
fn cell(i:u32)->vec2f{return vec2f(frame.viewport.x*select(.5,select(.25,.75,i>0u),frame.layout.x>.5),frame.viewport.y*.5);}
fn source(i:u32)->vec3f{let n=unit(select(vec3f(-.61,-.42,.67),vec3f(.48,.58,.66),i>0u));var p=n*vec3f(.96,1.14,.72)+vec3f(frame.camera.zw,0.);if(frame.phase.y>2.5&&frame.phase.y<3.5&&i==0u&&frame.phase.w>.5){p=frame.contact.xyz;}return p;}
fn visibleSource(s:vec2f,id:u32)->f32{let k=frame.viewport.z/64.;let offsets=array<vec2f,5>(vec2f(0.),vec2f(1.,0.),vec2f(-1.,0.),vec2f(0.,1.),vec2f(0.,-1.));var total=0.;for(var i=0u;i<5u;i++){total+=textureSampleLevel(sourceSignal,sampleLinear,(s+offsets[i]*k)/frame.viewport.xy,0.)[id];}return max(0.,total*.2);}
fn optical(pixel:vec2f,sourceScreen:vec2f,observerCentre:vec2f,visible:f32)->vec3f{let k=frame.viewport.z/64.;let angle=-.549778714;let ax=vec2f(cos(angle),sin(angle));let ay=vec2f(-ax.y,ax.x);let d=(pixel-sourceScreen)/k;let u=dot(d,ax);let v=dot(d,ay);let window=(1.-smoothstep(8.,10.,abs(u)))*(1.-smoothstep(4.,6.,abs(v)));let diffraction=(exp(-u*u/24.-v*v/.16)+.64*exp(-v*v/12.-u*u/.16))*window;
 let ghost=observerCentre-1.6*(sourceScreen-observerCentre);let g=(pixel-ghost)/k;let r=length(vec2f(dot(g,ax)/7.5,dot(g,ay)/5.25));let aperture=(1.-smoothstep(.85,1.46,r));let pupil=(.24*exp(-r*r/1.1)+.58*exp(-pow((r-.63)/.24,2.)))*aperture;
 return visible*(vec3f(1.15,1.15,1.10)*diffraction*frame.optics.y+vec3f(.72,.84,1.08)*pupil*.065*8.*frame.optics.z);}
fn encode(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn finish(@builtin(position)p:vec4f)->@location(0)vec4f{var c=textureLoad(scene,vec2i(p.xy),0).rgb;let id=select(0u,1u,frame.layout.x>.5&&p.x>frame.viewport.x*.5);let relative=abs(p.xy-cell(id));if(frame.phase.z<.5||frame.gates.x<.5||relative.x>frame.layout.z||relative.y>frame.layout.w){return vec4f(encode(c),1.);}let C=cell(id)+frame.camera.xy*frame.viewport.z/64.;c+=textureLoad(filtered,vec2i(p.xy),0).rgb*.34*frame.optics.x;for(var i=0u;i<2u;i++){let s=view(source(i));let S=cell(id)+vec2f(s.x,-s.y)*frame.viewport.z/1.65;c+=optical(p.xy,S,C,visibleSource(S,i));}return vec4f(encode(c),1.);}
`;
