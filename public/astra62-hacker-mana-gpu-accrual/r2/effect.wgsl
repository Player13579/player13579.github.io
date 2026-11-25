struct Params {
  size: vec2f, age: f32, scale: f32,
  reduced: f32, live: f32, cells: f32, reserved: f32,
}
@group(0) @binding(0) var<uniform> u: Params;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let corners = array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(corners[i],0,1);
}
fn rounded(p: vec2f, extent: vec2f, radius: f32) -> f32 {
  let d = abs(p)-extent+radius;
  return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.)-radius;
}
fn fill(distance: f32, aa: f32) -> f32 {
  return 1.-smoothstep(-aa,aa,distance);
}
fn layer(base: vec3f, ink: vec3f, distance: f32, aa: f32) -> vec3f {
  return mix(base,ink,fill(distance,aa));
}
// Analytic scattering of a bounded emitter: a short bright skirt and a dim broader field.
fn halo(delta:vec2f, extent:vec2f)->f32 {
  let q=delta/extent;
  let rho=dot(q,q);
  return .32*exp(-1.25*rho)+.19*exp(-.24*rho);
}
fn displayColor(material:vec3f, light:vec3f)->vec3f {
  let base=select(material/12.92,pow((material+.055)/1.055,vec3f(2.4)),material>vec3f(.04045));
  let headroom=vec3f(1.)-base;
  let lit=base+headroom*(vec3f(1.)-exp(-light/max(headroom,vec3f(.0001))));
  return select(12.92*lit,1.055*pow(lit,vec3f(1./2.4))-.055,lit>vec3f(.0031308));
}
@fragment fn fs(@builtin(position) at: vec4f) -> @location(0) vec4f {
  let background = vec3f(.045,.064,.084);
  if (u.live < .5) { return vec4f(background,1); }
  let p = (at.xy-.5*u.size)/u.scale;
  let aa = .65/u.scale;
  let t = u.age;
  let plate = vec3f(.155,.22,.265);
  let cyanRadiance=vec3f(.075,.83,1.12);
  let warmRadiance=vec3f(1.34,.48,.063);
  var direct=vec3f(0.);
  var reflected=vec3f(0.);
  var scattered=vec3f(0.);
  var shadedGlass=0.;
  let track = vec3f(.39,.45,.46);
  let dark = vec3f(.072,.106,.127);
  var ink = layer(background,plate,rounded(p,vec2f(101,32),9.),aa);
  ink = layer(ink,dark,rounded(p,vec2f(98.5,29.5),7.),aa);
  ink = layer(ink,track,rounded(p-vec2f(1,12),vec2f(79,1.35),1.),aa);
  // Glass feed line. A finite charge slides through it and disappears into the die.
  ink = layer(ink,vec3f(.18,.36,.40),rounded(p-vec2f(-52,5),vec2f(37,8),5.),aa);
  ink = layer(ink,dark,rounded(p-vec2f(-52,5),vec2f(34.8,5.7),3.),aa);
  let transfer = smoothstep(145.,414.,t);
  let packetX = mix(-77.,-14.,transfer*(1.-u.reduced));
  let amount = select(6.,9.,u.cells>1.5);
  let feed = (1.-smoothstep(369.,430.,t));
  let packet = rounded(p-vec2f(packetX,5),vec2f(amount,3.8),2.);
  // The short packet sits inside a transparent channel. Its return tracks the moving source.
  let packetDelta=p-vec2f(packetX,5);
  let dieOcclusion=fill(rounded(p,vec2f(19,21),4.),aa);
  let outsideDie=1.-dieOcclusion;
  let channel=fill(rounded(p-vec2f(-52,5),vec2f(37,8),5.),aa);
  let tubeLip=channel*(1.-fill(rounded(p-vec2f(-52,5),vec2f(34.8,5.7),3.),aa));
  let packetFace=fill(packet,aa)*feed*outsideDie;
  ink=mix(ink,vec3f(.085,.35,.38),packetFace);
  direct+=cyanRadiance*packetFace*(.64+.8*exp(-.19*abs(packetDelta.y)));
  reflected+=cyanRadiance*feed*tubeLip*.59*exp(-.057*abs(packetDelta.x));
  scattered+=cyanRadiance*feed*halo(packetDelta,vec2f(amount+3.,6.));
  // The die briefly takes on the feed color as the charge arrives.
  ink = layer(ink,vec3f(.49,.52,.49),rounded(p,vec2f(19,21),4.),aa);
  ink = layer(ink,vec3f(.13,.19,.22),rounded(p,vec2f(16,18),3.),aa);
  let loaded = smoothstep(339.,420.,t)*(1.-smoothstep(472.,720.,t));
  let handoff=smoothstep(450.,550.,t);
  let die = mix(vec3f(.25,.36,.38),mix(vec3f(.07,.24,.27),vec3f(.35,.16,.055),handoff),loaded);
  ink = layer(ink,die,rounded(p,vec2f(8.8,8.8),1.7),aa);
  let dieLight=mix(cyanRadiance,warmRadiance,handoff)*loaded;
  let dieFace=fill(rounded(p,vec2f(8.8),1.7),aa);
  let packageEdge=dieOcclusion*(1.-fill(rounded(p,vec2f(16,18),3.),aa));
  direct+=dieLight*dieFace*(.80+.58*exp(-dot(p,p)/36.));
  reflected+=dieLight*packageEdge*(.36+.28*exp(-abs(p.y+10.)/12.));
  scattered+=dieLight*halo(p,vec2f(13.,12.));
  // Register taps rise from a shared lower bus into two individually latched windows.
  for (var i=0; i<2; i++) {
    let x = 54.+24.*f32(i);
    let arrive = 619.+195.*f32(i);
    let enabled = select(0.,1.,f32(i)<u.cells);
    ink = layer(ink,track,rounded(p-vec2f(x,5),vec2f(1.4,7.5),1.),aa);
    let travel = smoothstep(arrive-168.,arrive-33.,t);
    let rise = smoothstep(arrive-33.,arrive,t);
    let pulse = vec2f(mix(19.,x,travel),mix(12.,-2.,rise));
    let lit = smoothstep(arrive-175.,arrive-158.,t)*(1.-smoothstep(arrive,arrive+26.,t))*enabled;
    let moving=lit*(1.-u.reduced);
    let windowShell=fill(rounded(p-vec2f(x,-5),vec2f(9.,11.),2.2),aa);
    let visibleBus=1.-windowShell;
    direct+=warmRadiance*fill(length(p-pulse)-2.8,aa)*moving*visibleBus*1.45;
    let rail=fill(rounded(p-vec2f(1,12),vec2f(79,1.35),1.),aa);
    reflected+=warmRadiance*moving*rail*exp(-length(p-pulse)/8.)*.48;
    scattered+=warmRadiance*moving*halo(p-pulse,vec2f(5.,4.));
    ink = layer(ink,vec3f(.56,.48,.33),rounded(p-vec2f(x,-5),vec2f(9.,11.),2.2),aa);
    let level = smoothstep(arrive-12.,arrive+25.,t)*enabled;
    let windowInk = mix(vec3f(.16,.16,.14),vec3f(.48,.23,.05),level);
    let port=p-vec2f(x,-5);
    let pane=fill(rounded(port,vec2f(6.7,8.5),1.3),aa);
    ink=mix(ink,windowInk,pane);
    // A lit pane is both a source and a recessed well, with a bright internal filament.
    let filament=exp(-.32*abs(port.x+.9))*exp(-.014*port.y*port.y);
    direct+=warmRadiance*pane*level*(.83+1.65*filament);
    let bezel=(windowShell-pane)*(.38+.28*exp(-abs(port.y+6.)/8.));
    reflected+=warmRadiance*level*max(0.,bezel);
    scattered+=warmRadiance*level*halo(port,vec2f(10.,12.));
    // The opaque divider leaves the neighboring unused cell visibly unlatched.
    shadedGlass=max(shadedGlass,pane*(1.-level));
  }
  let opacity = smoothstep(0.,82.,t)*(1.-smoothstep(1150.,1370.,t));
  let radiance=direct+reflected+scattered*(1.-.91*shadedGlass);
  return vec4f(mix(background,displayColor(ink,radiance),opacity),1.);
}
