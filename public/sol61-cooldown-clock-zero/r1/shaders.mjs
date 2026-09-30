const base=/*wgsl*/`
struct Params{screen:vec4f,time:vec4f,switches:vec4f,view:vec4f};
@group(0) @binding(0) var<uniform> p:Params;
fn ramp(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn live()->f32{return ramp(0.,.22,p.time.x)*(1.-ramp(1.4,1.8,p.time.x));}
fn advance()->f32{return ramp(.30,.72,p.time.x);}
fn deadline()->f32{return 2.4-1.3*advance();}
fn direction(a:f32)->vec2f{return vec2f(sin(a),-cos(a));}
fn centre(i:u32)->vec2f{let x=select(.5,select(.25,.75,i>0u),p.view.w>.5);return vec2f(p.screen.x*x,p.screen.y*.5);}
fn recipient(pixel:vec2f)->u32{return select(0u,1u,p.view.w>.5&&pixel.x>p.screen.x*.5);}
fn local(pixel:vec2f)->vec2f{return(pixel-centre(recipient(pixel)))/(p.screen.z/64.);}
fn pulse(at:f32,width:f32)->f32{return exp(-pow((p.time.x-at)/width,2.))*live();}
fn segment(q:vec2f,a:vec2f,b:vec2f)->f32{let v=b-a;let n=clamp(dot(q-a,v)/max(.001,dot(v,v)),0.,1.);return length(q-a-n*v);}
fn emitter(i:u32)->vec3f{var q=vec2f(23.,13.)+direction(deadline())*13.2;var at=.74;var width=.085;if(i==1u){q=vec2f(13.,8.);at=.96;width=.11;}if(i==2u){q=vec2f(-15.,7.);at=1.18;width=.11;}return vec3f(q,pulse(at,width)*p.switches.x*p.switches.z);}
struct Raster{@builtin(position) pixel:vec4f,@location(0) uv:vec2f};
@vertex fn triangle(@builtin(vertex_index) v:u32)->Raster{let vertices=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var r:Raster;r.pixel=vec4f(vertices[v],0.,1.);r.uv=vec2f(0.);return r;}
`;
export const scene=base+/*wgsl*/`
@group(0) @binding(1) var body:texture_2d<f32>;
@group(0) @binding(2) var atlasSampler:sampler;
struct Layers{@location(0) colour:vec4f,@location(1) radiance:vec4f};
fn result(colour:vec3f,alpha:f32,radiance:vec3f)->Layers{var r:Layers;r.colour=vec4f(colour,alpha);r.radiance=vec4f(radiance,0.);return r;}
fn linear(c:vec3f)->vec3f{return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
@fragment fn backdrop(r:Raster)->Layers{let light=p.view.w>.5&&recipient(r.pixel.xy)>0u;return result(select(vec3f(.027,.035,.045),vec3f(.79,.80,.82),light),1.,vec3f(0.));}
@vertex fn character(@builtin(vertex_index) n:u32,@builtin(instance_index) id:u32)->Raster{let corners=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));let uv=corners[n];let pixel=centre(id)+(uv-.5)*p.screen.z*vec2f(136./225.,1.);var r:Raster;r.pixel=vec4f(pixel/p.screen.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);r.uv=(vec2f(62.,15.)+uv*vec2f(136.,225.))/vec2f(768.,512.);return r;}
fn reception(q:vec2f)->f32{let t=p.time.x;let hand=exp(-dot((q-vec2f(8.5,8.5))/vec2f(5.,7.),(q-vec2f(8.5,8.5))/vec2f(5.,7.)))*pulse(.90,.17);let chest=exp(-dot((q-vec2f(0.,-4.5))/vec2f(9.,10.),(q-vec2f(0.,-4.5))/vec2f(9.,10.)))*pulse(1.03,.17);let other=exp(-dot((q-vec2f(-11.5,6.5))/vec2f(5.,7.),(q-vec2f(-11.5,6.5))/vec2f(5.,7.)))*pulse(1.18,.17);return(hand*.43+chest*.32+other*.43)*p.switches.x*p.switches.w;}
@fragment fn person(r:Raster)->Layers{let tex=textureSample(body,atlasSampler,r.uv);let reflected=vec3f(.62,.43,.17)*reception(local(r.pixel.xy));return result((linear(tex.rgb)+reflected)*tex.a,tex.a,reflected*tex.a*.46);}
fn coupling(q:vec2f,rear:bool)->Layers{let a=vec2f(23.,13.);let b=vec2f(8.5,8.5);let v=b-a;let amount=clamp(dot(q-a,v)/dot(v,v),0.,1.);let d=segment(q,a,b);let front=ramp(.62,.88,p.time.x);let flowing=exp(-pow((amount-front)/.22,2.))*ramp(.60,.67,p.time.x)*(1.-ramp(.93,1.10,p.time.x));let bound=(1.-ramp(.97,1.04,amount))*ramp(-.04,.03,amount);let core=exp(-d*d/2.0)*flowing*bound;let skirt=exp(-d*d/14.)*flowing*bound;let factor=select(1.,.24,rear);let e=vec3f(1.25,.97,.55)*(core*.8+skirt*.18)*live()*p.switches.x*p.view.y*factor;return result(e,skirt*.11*live()*factor,e);}
fn clock(q:vec2f)->Layers{let v=q-vec2f(23.,13.);let r=length(v);let ring=(1.-ramp(.65,1.0,abs(r-16.5)))*live();let face=(1.-ramp(13.8,14.6,r))*live();var marks=0.;for(var i=0u;i<4u;i++){let axis=direction(f32(i)*1.5707963);marks=max(marks,1.-ramp(.35,.75,segment(v,axis*12.7,axis*15.8)));}
 let nowHand=1.-ramp(.50,.90,segment(v,vec2f(0.),vec2f(0.,-9.)));let endHand=1.-ramp(.70,1.15,segment(v,vec2f(0.),direction(deadline())*13.2));let hub=1.-ramp(1.65,2.2,r);
 let theta=atan2(v.x,-v.y);let arcMask=select(0.,1.,theta>=0.&&theta<=deadline());let waitArc=(1.-ramp(1.1,1.6,abs(r-11.9)))*arcMask;
 let edgeIntensity=ring*.32+marks*live()*.20+nowHand*live()*.45+waitArc*live()*.28;let registrationPeak=1.+pulse(.65,.18)*1.2;let endIntensity=(endHand*.85+hub*.42)*live()*registrationPeak;
 let alpha=(1.-(1.-face*.09)*(1.-ring*.30)*(1.-marks*live()*.18)*(1.-nowHand*live()*.30)*(1.-endHand*live()*.40)*(1.-hub*live()*.30))*p.view.x;
 let pigment=vec3f(.17,.08,.016)*face*.09*p.view.x;let e=(vec3f(.80,.42,.07)*edgeIntensity+vec3f(1.30,1.10,.72)*endIntensity)*p.switches.x*p.view.x;
 return result(pigment+e,alpha,e);
}
@fragment fn behind(r:Raster)->Layers{return coupling(local(r.pixel.xy),true);}
@fragment fn ahead(r:Raster)->Layers{let q=local(r.pixel.xy);var c=clock(q);let link=coupling(q,false);c.colour=vec4f(c.colour.rgb+link.colour.rgb,c.colour.a+link.colour.a*(1.-c.colour.a));c.radiance=vec4f(c.radiance.rgb+link.radiance.rgb,0.);for(var i=0u;i<3u;i++){let source=emitter(i);let d=q-source.xy;let e=vec3f(2.0,1.68,1.15)*exp(-dot(d,d)/1.0)*source.z;c.colour=vec4f(c.colour.rgb+e,c.colour.a);c.radiance=vec4f(c.radiance.rgb+e,0.);}return c;}
`;
export const optics=base+/*wgsl*/`
@group(0) @binding(1) var signal:texture_2d<f32>;
@group(0) @binding(2) var rendered:texture_2d<f32>;
fn fetch(q:vec2i)->vec3f{let bound=vec2i(textureDimensions(signal))-1;return textureLoad(signal,clamp(q,vec2i(0),bound),0).rgb;}
fn gaussian(q:vec2i,axis:vec2i)->vec4f{var sum=fetch(q)*.22;for(var n=1;n<=5;n++){let w=exp(-f32(n*n)/8.8)*.12;sum+=(fetch(q+axis*n)+fetch(q-axis*n))*w;}return vec4f(sum,0.);}
@fragment fn xBlur(r:Raster)->@location(0) vec4f{return gaussian(vec2i(r.pixel.xy),vec2i(1,0));}
@fragment fn yBlur(r:Raster)->@location(0) vec4f{return gaussian(vec2i(r.pixel.xy),vec2i(0,1));}
fn srgb(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn present(r:Raster)->@location(0) vec4f{let pixel=vec2i(r.pixel.xy);var c=textureLoad(rendered,pixel,0).rgb+fetch(pixel)*.72*p.switches.y;let q=local(r.pixel.xy);let a=.3010693;let axis=vec2f(cos(a),sin(a));let crossAxis=vec2f(-axis.y,axis.x);for(var i=0u;i<3u;i++){let source=emitter(i);let d=q-source.xy;let u=dot(d,axis);let v=dot(d,crossAxis);let ray=exp(-u*u/28.-v*v/.12)+.67*exp(-v*v/15.-u*u/.12);c+=vec3f(.82,.64,.28)*ray*source.z*p.switches.y;}return vec4f(srgb(c),1.);}
`;
