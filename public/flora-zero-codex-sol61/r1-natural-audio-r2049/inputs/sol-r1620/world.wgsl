struct U { view:vec4f, caster:vec4f, crop:vec4f, dynamics:vec4f, gates:vec4f, light:vec4f, tint:vec4f, material:vec4f, optical:vec4f, context:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var person:texture_2d<f32>;
@group(0) @binding(2) var imageSampler:sampler;
struct V { @builtin(position) p:vec4f };struct Out { @location(0) world:vec4f,@location(1) emission:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:V;o.p=vec4f(p[i],0,1);return o;}
fn decode(c:vec3f)->vec3f{return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
fn sq(x:f32)->f32{return x*x;}
fn scene(p:vec2f)->vec3f{let base=select(vec3f(.018,.026,.036),vec3f(.57,.62,.66),u.view.w>.5);let vertical=clamp(p.y/u.view.y,0.,1.);let horizon=exp(-sq((vertical-.73)/.045));return base*(.84+.16*vertical)+vec3f(.026,.032,.031)*horizon;}
fn spriteUV(q:vec2f)->vec2f{return u.crop.xy+clamp(q,vec2f(0),vec2f(1))*u.crop.zw;}
fn alphaAt(q:vec2f)->f32{if(any(q<vec2f(0))||any(q>vec2f(1))){return 0.;}return textureSampleLevel(person,imageSampler,spriteUV(q),0.).a;}
@fragment fn fs(@builtin(position) pos:vec4f)->Out{
 let p=pos.xy;let q=(p-u.caster.xy)/u.caster.zw;let sprite=textureSampleLevel(person,imageSampler,spriteUV(q),0.);let alpha=alphaAt(q);let body=decode(sprite.rgb);let supportScale=u.optical.z;let dx=vec2f(1.25/u.caster.z,0.);let dy=vec2f(0.,1.25/u.caster.w);
 let gradient=vec2f(alphaAt(q+dx)-alphaAt(q-dx),alphaAt(q+dy)-alphaAt(q-dy));let normal=normalize(vec3f(-gradient*2.8,.75));let V=normalize(vec3f(.12,-.08,1.));let L=normalize(u.light.xyz);let ndv=clamp(dot(normal,V),0.,1.);let fresnel=u.material.z+(1.-u.material.z)*pow(1.-ndv,5.);let roughLobe=pow(max(0.,dot(reflect(-L,normal),V)),mix(70.,8.,u.material.x));
 let enabled=u.gates.x;let frontY=mix(.02,.99,u.dynamics.x);let band=exp(-sq((q.y-frontY)/.075))*alpha*enabled;let completed=smoothstep(frontY-.075,frontY+.035,q.y);let hidden=1.-completed;let conceal=hidden*enabled;let phaseOpacity=mix(1.,u.material.w,conceal);let opacity=select(phaseOpacity,u.material.w,u.gates.w>.5);
 var col=scene(p);let behind=scene(p+normal.xy*(4.2*supportScale*conceal));let transmission=exp(-u.material.y*(.7+alpha*.4));let coating=behind*transmission+u.tint.rgb*(fresnel*.12+roughLobe*.06)*conceal;let visibleBody=body*(.72+.28*max(0.,dot(normal,L)));col=mix(col,mix(visibleBody,coating,conceal*.68),alpha*opacity);
 // A coherent front follows real material support, not a geometric actor outline.
 let sourceFlux=band*u.dynamics.y;let radiance=vec3f(.78,1.30,1.04)*sourceFlux*3.6;let near=exp(-sq((q.y-frontY)/.16))*alpha*u.dynamics.y*enabled*u.gates.z;col+=body*vec3f(.30,.57,.42)*near*.72;
 // Two broad thin interface folds close toward the material; no particles or enclosing barrier.
 let local=(p-(u.caster.xy+u.caster.zw*vec2f(.5,.53)))/supportScale;let y=local.y;let span=sqrt(max(0.,1.-sq(y/36.)));let bend=14.*span+5.*sin(y/24.+u.view.z*1.8);let left=exp(-sq((local.x+bend)/1.7));let right=exp(-sq((local.x-bend)/1.35));let taper=smoothstep(-37.,-23.,y)*(1.-smoothstep(23.,38.,y));let fold=(left+right*.72)*taper*u.dynamics.z*enabled;
 let foldNormal=normalize(vec3f(local.x/22.,y/52.,.45));let fFold=u.material.z+(1.-u.material.z)*pow(1.-abs(dot(foldNormal,V)),5.);let foldLight=pow(max(0.,dot(reflect(-L,foldNormal),V)),18.);let foldColor=u.tint.rgb*(.18+.48*fFold+.35*foldLight);col=mix(col,scene(p+foldNormal.xy*3.2*supportScale)*.9+foldColor,clamp(fold*.23,0.,.65));
 let emitted=radiance+u.tint.rgb*fold*u.dynamics.y*.62;col+=radiance*.56+u.tint.rgb*fold*u.dynamics.y*.24;
 var o:Out;o.world=vec4f(col,1.);o.emission=vec4f(emitted,1.);return o;
}
