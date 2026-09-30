// r13 new artist field. Frame values are described in render-contract.json.
struct Frame { viewport:vec4f, anchor:vec4f, clock:vec4f, features:vec4f, debug:vec4f };
@group(0) @binding(0) var<uniform> f:Frame;
@group(0) @binding(1) var original:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
fn ramp(a:f32,b:f32,x:f32)->f32 {let q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
fn fourth(x:f32)->f32 {let q=x*x;return q*q;}
fn live()->bool {return f.clock.z>.5&&f.clock.w>.5&&f.clock.y>=.9&&f.clock.x>=0.&&f.clock.x<f.clock.y;}
fn pointPosition(i:u32)->vec3f {return select(vec3f(-22.,-13.5,5.),vec3f(22.,-16.,5.),i==1u);}
fn pointGain(i:u32,u:f32)->f32 {let at=select(.62,.71,i==1u);let width=select(.055,.065,i==1u);let q=(u-at)/width;if(abs(q)>=1.){return 0.;}let a=1.-q*q;return a*a*ramp(0.,.085,u)*(1.-ramp(.84,1.,u));}
struct Field { density:f32, emission:vec3f };
fn source(p:vec3f)->Field {
 var out:Field;out.density=0.;out.emission=vec3f(0.);if(!live()||p.x<=-40.||p.x>=28.||p.y<=-29.||p.y>=32.||abs(p.z)>=12.){return out;}
 let u=f.clock.x/f.clock.y;let formed=ramp(0.,.085,u);let advance=ramp(.10,.66,u);let settle=ramp(.57,.78,u);let ending=1.-ramp(.84,1.,u);let frontY=24.-40.*advance;
 let tailX=(p.x+25.)/10.;let tailZ=(p.z+1.)/8.;let tail=(1.-ramp(.50,1.,fourth(tailX)+fourth(tailZ)))*ramp(-9.,-5.,p.y)*(1.-ramp(26.,29.,p.y))*(1.-ramp(frontY-2.,frontY+2.,p.y));
 let centre=-4.+4.*advance;let front=frontY+.075*(p.x+4.);let wx=(p.x-centre)/24.;let wy=(p.y-front)/5.5;let wz=(p.z-2.)/8.;let crest=(1.-ramp(.45,1.,fourth(wx)+fourth(wz)))*exp(-fourth(wy))*ramp(.065,.14,u)*(1.-ramp(.68,.82,u));
 let ry=(p.y+12.)/40.;let rx=(p.x-(1.8-3.6*ry))/(17.+5.*sin(3.141592654*clamp(ry,0.,1.)));let rz=(p.z-2.5)/8.5;
 let received=(1.-ramp(.45,1.,fourth(rx)+fourth(rz)))*ramp(-15.,-10.,p.y)*(1.-ramp(26.,30.,p.y))*ramp(front-4.,front+4.,p.y)*ramp(.16,.33,u);
 out.density=(tail*.58+crest*.72+received*.42)*formed*ending;
 out.emission=(vec3f(2.8,1.02,.12)*tail*.80+vec3f(6.5,5.9,3.8)*crest*(.78+.45*advance)+vec3f(.78,1.55,.34)*received*(.85+.55*settle))*formed*ending;
 if(f.debug.y>.5){for(var i=0u;i<2u;i++){let q=(p-pointPosition(i))/vec3f(1.15,1.15,2.5);out.emission+=vec3f(16.,16.,14.)*exp(-dot(q,q))*pointGain(i,u);}}
 return out;
}
struct Vertex { @builtin(position) position:vec4f, @location(0) local:vec2f, @location(1) uv:vec2f };
fn clip(local:vec2f)->vec4f {let pixel=f.anchor.xy+local*vec2f(f.anchor.z,1.)*f.viewport.z/64.;return vec4f(pixel/f.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),.5,1.);}
@vertex fn volumeVertex(@builtin(vertex_index)i:u32)->Vertex {let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));var out:Vertex;out.local=mix(vec2f(-40.,-29.),vec2f(28.,32.),q[i]);out.position=clip(out.local);out.uv=q[i];return out;}
@vertex fn bodyVertex(@builtin(vertex_index)i:u32)->Vertex {let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));var out:Vertex;out.local=(q[i]-vec2f(.5))*vec2f(64.*136./225.,64.);out.position=clip(out.local);out.uv=q[i];return out;}
struct Optical { @location(0) colour:vec4f, @location(1) emission:vec4f };
fn empty()->Optical {var o:Optical;o.colour=vec4f(0.);o.emission=vec4f(0.);return o;}
fn integrated(v:Vertex,front:bool)->Optical {if(select(f.features.w,f.features.z,front)<.5){return empty();}let dz=12./24.;var trans=1.;var colour=vec3f(0.);var emission=vec3f(0.);for(var i=0u;i<24u;i++){let z=select(0.,12.,front)-(f32(i)+.5)*dz;let q=source(vec3f(v.local,z));let a=(1.-exp(-q.density*dz*.075))*f.features.x;let light=q.emission*dz*.11;colour+=trans*(vec3f(.035,.030,.014)*a+light);emission+=trans*light;trans*=1.-a;}var o:Optical;o.colour=vec4f(colour,1.-trans);o.emission=vec4f(emission,1.-trans);return o;}
@fragment fn rearFragment(v:Vertex)->Optical {return integrated(v,false);}
@fragment fn frontFragment(v:Vertex)->Optical {return integrated(v,true);}
@fragment fn bodyFragment(v:Vertex)->Optical {if(f.debug.x<.5){return empty();}let tex=textureSample(original,samp,v.uv);let base=pow(max(tex.rgb,vec3f(0.)),vec3f(2.2));var incident=vec3f(0.);if(f.features.y>.5){let taps=array<vec3f,4>(vec3f(-3.,0.,2.),vec3f(3.,0.,2.),vec3f(0.,-3.,2.),vec3f(0.,3.,2.));for(var i=0u;i<4u;i++){incident+=source(vec3f(v.local,0.)+taps[i]).emission*.018;}}var o:Optical;o.colour=vec4f((base+base*incident)*tex.a,tex.a);o.emission=vec4f(base*incident*tex.a*.15,tex.a);return o;}
