const base=/*wgsl*/`
struct Params{screen:vec4f,time:vec4f,switches:vec4f,view:vec4f};
@group(0) @binding(0) var<uniform> p:Params;
fn ramp(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn live()->f32{return ramp(0.,.22,p.time.x)*(1.-ramp(1.8,2.4,p.time.x));}
fn advance()->f32{return ramp(.30,.72,p.time.x);}
fn deadline()->f32{return 2.4-1.3*advance();}
fn direction(a:f32)->vec2f{return vec2f(sin(a),-cos(a));}
fn centre(i:u32)->vec2f{let x=select(.5,select(.25,.75,i>0u),p.view.w>.5);return vec2f(p.screen.x*x,p.screen.y*.5);}
fn recipient(pixel:vec2f)->u32{return select(0u,1u,p.view.w>.5&&pixel.x>p.screen.x*.5);}
fn local(pixel:vec2f)->vec2f{return(pixel-centre(recipient(pixel)))/(p.screen.z/64.);}
fn pulse(at:f32,width:f32)->f32{return exp(-pow((p.time.x-at)/width,2.))*live();}
fn segment(q:vec2f,a:vec2f,b:vec2f)->f32{let v=b-a;let n=clamp(dot(q-a,v)/max(.001,dot(v,v)),0.,1.);return length(q-a-n*v);}
fn emitter(i:u32)->vec3f{var q=vec2f(36.,17.0289)+direction(deadline())*13.2;var at=.74;var width=.085;if(i==1u){q=vec2f(16.,4.);at=1.10;width=.11;}if(i==2u){q=vec2f(-17.,7.);at=1.55;width=.11;}return vec3f(q,pulse(at,width)*p.switches.x*p.switches.z);}
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
fn reception(q:vec2f)->f32{let t=p.time.x;let hand=exp(-dot((q-vec2f(8.5,8.5))/vec2f(6.,8.),(q-vec2f(8.5,8.5))/vec2f(6.,8.)));let chest=exp(-dot((q-vec2f(0.,-4.5))/vec2f(10.,11.),(q-vec2f(0.,-4.5))/vec2f(10.,11.)));let other=exp(-dot((q-vec2f(-11.5,6.5))/vec2f(6.,8.),(q-vec2f(-11.5,6.5))/vec2f(6.,8.)));let received=ramp(1.42,1.55,t)*(1.-ramp(1.90,2.20,t))*live();return(hand*pulse(1.059,.18)*.65+chest*pulse(1.191,.19)*.53+other*pulse(1.44,.18)*.65+(hand*.33+chest*.28+other*.33)*received)*p.switches.x*p.switches.w;}
@fragment fn person(r:Raster)->Layers{let tex=textureSample(body,atlasSampler,r.uv);let reflected=vec3f(.62,.43,.17)*reception(local(r.pixel.xy));return result((linear(tex.rgb)+reflected)*tex.a,tex.a,reflected*tex.a*.46);}
fn coupling(q:vec2f,rear:bool)->Layers{let points=array<vec2f,4>(vec2f(36.,17.0289),vec2f(8.5,8.5),vec2f(0.,-4.5),vec2f(-11.5,6.5));let lengths=vec3f(length(points[1]-points[0]),length(points[2]-points[1]),length(points[3]-points[2]));let total=lengths.x+lengths.y+lengths.z;var nearest=1000.;var along=0.;var offset=0.;for(var i=0u;i<3u;i++){let a=points[i];let b=points[i+1u];let vector=b-a;let part=clamp(dot(q-a,vector)/dot(vector,vector),0.,1.);let distance=length(q-a-part*vector);if(distance<nearest){nearest=distance;along=(offset+part*lengths[i])/total;}offset+=lengths[i];}let front=ramp(.70,1.44,p.time.x);let longitudinal=exp(-pow((along-front)/.17,2.))*ramp(.68,.76,p.time.x)*(1.-ramp(1.44,1.69,p.time.x));let core=exp(-nearest*nearest/8.)*longitudinal;let skirt=exp(-nearest*nearest/25.)*longitudinal;let factor=select(1.,.20,rear);let e=vec3f(1.48,1.13,.60)*(core*.85+skirt*.19)*live()*p.switches.x*p.view.y*factor;return result(e,skirt*.14*live()*factor,e);}
fn clock(q:vec2f)->Layers{let v=q-vec2f(36.,17.0289);let r=length(v);let ring=(1.-ramp(.65,1.0,abs(r-16.5)))*live();let face=(1.-ramp(13.8,14.6,r))*live();var marks=0.;for(var i=0u;i<4u;i++){let axis=direction(f32(i)*1.5707963);marks=max(marks,1.-ramp(.35,.75,segment(v,axis*12.7,axis*15.8)));}
 let nowHand=1.-ramp(.50,.90,segment(v,vec2f(0.),vec2f(0.,-9.)));let endHand=1.-ramp(.70,1.15,segment(v,vec2f(0.),direction(deadline())*13.2));let hub=1.-ramp(1.65,2.2,r);
 let theta=atan2(v.x,-v.y);let arcMask=select(0.,1.,theta>=0.&&theta<=deadline());let waitArc=(1.-ramp(1.1,1.6,abs(r-11.9)))*arcMask;
 let edgeIntensity=ring*.32+marks*live()*.20+nowHand*live()*.45+waitArc*live()*.28;let registrationPeak=1.+pulse(.65,.18)*1.2;let endIntensity=(endHand*.85+hub*.42)*live()*registrationPeak;
 let alpha=(1.-(1.-face*.09)*(1.-ring*.30)*(1.-marks*live()*.18)*(1.-nowHand*live()*.30)*(1.-endHand*live()*.40)*(1.-hub*live()*.30))*p.view.x;
 let pigment=vec3f(.17,.08,.016)*face*.09*p.view.x;let e=(vec3f(.80,.42,.07)*edgeIntensity+vec3f(1.30,1.10,.72)*endIntensity)*p.switches.x*p.view.x;
 return result(pigment+e,alpha,e);
}
fn outside(q:vec2f)->bool{return q.x< -26.||q.x>60.||q.y< -20.||q.y>44.;}
@fragment fn behind(r:Raster)->Layers{let q=local(r.pixel.xy);if(outside(q)){return result(vec3f(0.),0.,vec3f(0.));}return coupling(q,true);}
@fragment fn ahead(r:Raster)->Layers{let q=local(r.pixel.xy);if(outside(q)){return result(vec3f(0.),0.,vec3f(0.));}var c=clock(q);let link=coupling(q,false);c.colour=vec4f(c.colour.rgb+link.colour.rgb,c.colour.a+link.colour.a*(1.-c.colour.a));c.radiance=vec4f(c.radiance.rgb+link.radiance.rgb,0.);for(var i=0u;i<3u;i++){let source=emitter(i);let d=q-source.xy;let e=vec3f(2.0,1.68,1.15)*exp(-dot(d,d)/1.0)*source.z;c.colour=vec4f(c.colour.rgb+e,c.colour.a);c.radiance=vec4f(c.radiance.rgb+e,0.);}return c;}
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
