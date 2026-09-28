struct Params {
  viewport: vec4f,
  background: vec4f,
  switches: vec4f,
  anchor: vec4f,
  reserved0: vec4f,
  reserved1: vec4f,
}
@group(0) @binding(0) var<uniform> u: Params;
@group(0) @binding(1) var actorTexture: texture_2d<f32>;
@group(0) @binding(2) var actorSampler: sampler;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = array<vec2f, 3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
  return vec4f(p[i], 0, 1);
}
fn ease(x: f32) -> f32 { let k = clamp(x, 0., 1.); return k*k*(3.-2.*k); }
fn window(t: f32, start: f32, attack: f32, end: f32) -> f32 {
  return ease((t-start)/attack) * (1.-ease((t-start-attack)/max(.001,end-start-attack)));
}
fn toLinear(x: vec3f) -> vec3f { return pow(max(x,vec3f(0)),vec3f(2.2)); }
fn toDisplay(x: vec3f) -> vec3f { return pow(max(x,vec3f(0)),vec3f(1./2.2)); }
struct Field { coverage: f32, emission: vec3f, nearby: vec3f, front: f32 }

// PH1. Finite curved pressure volume, with a broad interior and distinct surface.
fn field(p: vec2f, side: f32, t: f32, env: f32) -> Field {
  let receive = ease((t-.12)/.48);
  let settle = ease((t-.65)/.50);
  let bounce = sin(clamp((t-.90)/.36,0.,1.)*3.14159265) * mix(1., .12, u.background.w);
  let center = vec2f(side*mix(18.,7.2,receive), mix(29.,10.5,ease((t-.2)/.78))+2.8*bounce);
  let height = mix(10.,12.5,receive) * (1.-.27*settle+.18*bounce);
  let width = mix(7.2,6.,receive) * (1.+.29*settle-.13*bounce);
  let v = (p.y-center.y)/height;
  let bend = side * (2.6*v*v-1.5*v) * (1.-.6*settle);
  let q = vec2f((p.x-center.x-bend)/width, v);
  let radius2 = dot(q,q);
  let aa = 225./u.viewport.w/256.*2.0;
  let shell = 1.-smoothstep(1.-aa,1.+aa,radius2);
  let density = sqrt(max(0.,1.-radius2));
  let inside = pow(density, .65);
  let face = pow(max(0., .68+.32*dot(normalize(vec3f(q.x,q.y,density+.01)),normalize(vec3f(-.4,.8,1.)))),2.);
  let seam = exp(-pow((q.x+side*.35+v*.20)/.17,2.)) * (1.-smoothstep(.5,1.,abs(v)));
  let copper = vec3f(.25,.034,.018);
  let coral = vec3f(1.0,.24,.105);
  let hot = vec3f(1.7,.92,.48);
  let emission = (mix(copper,coral,inside*face)*.78 + hot*seam*.48) * shell * env;
  let near = exp(-radius2*.72) * (1.-smoothstep(2.2,3.1,sqrt(radius2))) * env;
  let front = ease((t-.28)/.38)*.58;
  return Field(shell * env * (.25+.45*inside), emission, vec3f(1.,.18,.045)*near*.135,front);
}

// OBS2: every cross has the same 18 degree clockwise angle from vertical.
fn sparkle(p: vec2f, center: vec2f, amplitude: f32) -> vec3f {
  let a = .3141592654;
  let delta = p-center;
  let q = vec2f(cos(a)*delta.x+sin(a)*delta.y,-sin(a)*delta.x+cos(a)*delta.y);
  let extent = 5.5;
  let vertical = exp(-abs(q.x)*3.6) * pow(max(0.,1.-abs(q.y)/extent),1.4);
  let horizontal = exp(-abs(q.y)*3.6) * pow(max(0.,1.-abs(q.x)/(extent*.64)),1.4);
  let core = exp(-dot(q,q)*1.8);
  let halo = exp(-dot(q,q)*.09)*.11*u.switches.y;
  return (vec3f(2.8,2.0,1.22)*(vertical+horizontal+core)+vec3f(1.2,.4,.09)*halo) * amplitude;
}

@fragment fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let t = u.viewport.z;
  let p = vec2f(frag.x-u.anchor.x,u.anchor.y-frag.y)*64./u.viewport.w;
  // 225 alpha-bound pixels occupy exactly height pixels, without stretching.
  let source = vec2f(128.+p.x*225./64.,240.-p.y*225./64.);
  let uv = source/256.;
  let inSprite = select(0.,1., all(uv>=vec2f(0)) && all(uv<=vec2f(1)));
  let texel = textureSampleLevel(actorTexture,actorSampler,clamp(uv,vec2f(0),vec2f(1)),0.);
  let actorA = texel.a*inSprite*u.switches.w;
  let base = toLinear(u.background.xyz);
  let original = mix(base,toLinear(texel.rgb),actorA);
  if (t<=0. || t>=1.5) { return vec4f(toDisplay(original),1.); }
  let env = ease(t/.16)*(1.-ease((t-1.18)/.32));
  let left = field(p,-1.,t,env);
  let right = field(p,1.,t,env);
  let cover = clamp(left.coverage+right.coverage,0.,.86)*u.switches.z;
  let visible = 1.-actorA*(1.-left.front);
  let e = (left.emission+right.emission)*u.switches.z;
  // PH1 behind actor, then translucent front face; PH2 arrival restricted to sprite alpha.
  var color = original*(1.-cover*visible*.46)+e*visible;
  let frontY = mix(35.,4.,ease((t-.24)/.78));
  let frontMask = exp(-pow((p.y-frontY)/7.,2.))*(1.-smoothstep(38.,43.,p.y));
  let bodyReturn = frontMask * actorA * env * ease((t-.19)/.14)*u.switches.z;
  color += vec3f(.60,.19,.06)*bodyReturn;
  color += (left.nearby+right.nearby)*u.switches.y;
  let waist = window(t,.18,.12,.59);
  let support = window(t,.89,.10,1.29);
  let stars = sparkle(p,vec2f(-12.,34.),waist)+sparkle(p,vec2f(12.,32.),waist*.84)
            +sparkle(p,vec2f(-8.,7.),support)+sparkle(p,vec2f(8.,9.),support*.84);
  color += stars*u.switches.x;
  return vec4f(toDisplay(color),1.);
}
