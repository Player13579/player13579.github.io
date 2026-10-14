// GPT-6.1-Sol R4: alpha-clipped curved dielectric cloth; swept tension seam and view/light-dependent reflection / refraction.
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
 let p=pos.xy;let q=(p-u.caster.xy)/u.caster.zw;let sprite=textureSampleLevel(person,imageSampler,spriteUV(q),0.);let alpha=alphaAt(q);let body=decode(sprite.rgb);
 // caster coordinates are actual physical target pixels; optical.z is CSS H/64.
 let physicalScale=u.optical.z*u.optical.w;let dx=vec2f(1.25*physicalScale/u.caster.z,0.);let dy=vec2f(0.,1.25*physicalScale/u.caster.w);
 let gradient=vec2f(alphaAt(q+dx)-alphaAt(q-dx),alphaAt(q+dy)-alphaAt(q-dy));
 let sx=(q.x-.22265625)/.55078125;let sy=(q.y-u.context.z)/u.context.w;let shellX=(sx-.5)*2.;let shellY=(sy-.5)*2.;
 let bend=sin(sy*5.4+u.view.z*.45)*u.dynamics.z;
 // Shallow 3D convex shell with an animated broad cloth fold; silhouette alpha supplies edge normals.
 let shellZ=sqrt(max(.08,1.-.48*shellX*shellX-.18*shellY*shellY));
 let normal=normalize(vec3f(shellX*.68+bend*.13-gradient.x*1.8,shellY*.24-gradient.y*1.8,shellZ));let V=normalize(vec3f(.12,-.08,1.));let L=normalize(u.light.xyz);let ndv=clamp(dot(normal,V),0.,1.);let fresnel=u.material.z+(1.-u.material.z)*pow(1.-ndv,5.);let roughLobe=pow(max(0.,dot(reflect(-L,normal),V)),mix(70.,8.,u.material.x));
 let enabled=u.gates.x;let supportY=(q.y-u.context.z)/u.context.w;let bowedFront=u.dynamics.x+.055*sin(sx*3.14159265)*sin(u.dynamics.x*3.14159265);let frontY=u.context.z+bowedFront*u.context.w;
 let distancePx=(q.y-frontY)*u.caster.w;let band=exp(-sq(distancePx/(1.35*physicalScale)))*alpha*enabled;
 let completed=smoothstep(bowedFront-.018,bowedFront+.010,supportY);let hidden=1.-completed;
 // Only transient E coating fades; separate gameplay-context ghost opacity remains .28.
 let conceal=hidden*enabled*u.context.y;let phaseOpacity=mix(1.,u.material.w,conceal);let opacity=select(phaseOpacity,u.material.w,u.gates.w>.5);
 var col=scene(p);// Approximate finite-thickness Snell displacement, Beer absorption and Schlick dielectric reflection.
 let transmittedRay=refract(-V,normal,1./1.46);let thickness=(.55+.25*abs(shellX))*physicalScale;let displacement=transmittedRay.xy/max(.24,abs(transmittedRay.z))*thickness*conceal;
 let behind=scene(p+displacement);let transmission=exp(-u.material.y*(.55+.25*abs(shellX))/max(.24,ndv));
 let reflectedScene=scene(p+reflect(-V,normal).xy*24.*physicalScale);
 let coating=behind*transmission*(1.-fresnel)+reflectedScene*fresnel+u.tint.rgb*roughLobe*.085*conceal;let visibleBody=body*(.72+.28*max(0.,dot(normal,L)));col=mix(col,mix(visibleBody,coating,conceal*.68),alpha*opacity);
 // Narrow high-radiance seam; broader material receiving light remains independent.
 let sourceFlux=band*u.dynamics.y;let radiance=vec3f(.78,1.30,1.04)*sourceFlux*4.1;let near=exp(-sq(distancePx/(5.5*physicalScale)))*alpha*u.dynamics.y*enabled*u.gates.z;col+=body*vec3f(.30,.57,.42)*near*.64;
 // Two staggered creases stay on registered material and never enclose an actor.
 let supportX=(q.x-.22265625)/.55078125;let close=smoothstep(.16,.96,u.view.z);
 let leftCenter=.10+.14*close+.045*sin(supportY*2.7+u.view.z*.9);let rightCenter=.91-.18*close-.035*sin(supportY*2.2+u.view.z*.7);
 let supportWidth=.55078125*u.caster.z;
 let left=exp(-sq((supportX-leftCenter)*supportWidth/(1.2*physicalScale)))*smoothstep(.30,.43,supportY)*(1.-smoothstep(.70,.85,supportY));
 let right=exp(-sq((supportX-rightCenter)*supportWidth/(.95*physicalScale)))*smoothstep(.48,.61,supportY)*(1.-smoothstep(.86,.99,supportY));
 let fold=(left+right*.72)*alpha*u.dynamics.z*enabled;
 let foldNormal=normalize(normal+vec3f(.13*cos(supportY*5.4+u.view.z*.45),0.,0.));let fFold=u.material.z+(1.-u.material.z)*pow(1.-abs(dot(foldNormal,V)),5.);let foldLight=pow(max(0.,dot(reflect(-L,foldNormal),V)),18.);let foldColor=u.tint.rgb*(.18+.48*fFold+.35*foldLight);col=mix(col,scene(p+foldNormal.xy*3.2*physicalScale)*.9+foldColor,clamp(fold*.23,0.,.65));
 let emitted=radiance+u.tint.rgb*fold*u.dynamics.y*.62;col+=radiance*.56+u.tint.rgb*fold*u.dynamics.y*.24;
 var o:Out;o.world=vec4f(col,1.);o.emission=vec4f(emitted,1.);return o;
}
