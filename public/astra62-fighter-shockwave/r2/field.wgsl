struct Scene {
    viewport: vec2f,
    phase: f32,
    giant: f32,
    origin: vec2f,
    end: vec2f,
    width: f32,
    light: f32,
    spare: vec2f
}
@group(0) @binding(0) var<uniform> scene: Scene;

@vertex fn vertex(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
    let positions = array<vec2f, 3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
    return vec4f(positions[index], 0, 1);
}
fn segment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
    let axis = b-a;
    return length(p-a-axis*clamp(dot(p-a,axis)/max(dot(axis,axis),0.0001),0.0,1.0));
}
fn coverage(distance: f32, radius: f32, aa: f32) -> f32 {
    return 1.0-smoothstep(radius-aa,radius+aa,distance);
}
fn bladeAngle(t: f32) -> f32 {
    let poised = 3.64;
    let release = 1.5707963268;
    let followThrough = release-0.70;
    // Both Hermite segments have d(angle)/dt = -5.8 at release.
    // Tangential tip speed there is 31 * 5.8 logical px per unit phase.
    let rate = -5.8;
    if (t < 0.0) {
        let u = clamp((t+0.46)/0.46,0.0,1.0);
        return mix(poised,release,smoothstep(0.0,1.0,u)) + 0.46*rate*u*u*(u-1.0);
    }
    let v = clamp(t/0.30,0.0,1.0);
    let angle = mix(release,followThrough,smoothstep(0.0,1.0,v)) + 0.30*rate*v*(1.0-v)*(1.0-v);
    // Recover after the front has expired, then hold for the next cycle.
    return mix(angle,poised,smoothstep(1.16,1.92,t));
}
// The field is measured in logical scene pixels. The release point lies on the
// moving tip and its tangent is parallel to the effect's origin-to-end vector.
@fragment fn fragment(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
    let scale = min(scene.viewport.x/384.0, scene.viewport.y/176.0);
    let pos = (pixel.xy - 0.5*scene.viewport)/scale + vec2f(192,88);
    let aa = max(0.55/scale,0.35);
    let axis = normalize(scene.end-scene.origin);
    let normal = vec2f(-axis.y, axis.x);
    let delta = pos-scene.origin;
    let p = vec2f(dot(delta,axis),dot(delta,normal));
    let t = scene.phase;
    let large = scene.giant;
    let sky = mix(vec3f(0.056,0.086,0.118),vec3f(0.71,0.74,0.75),scene.light);
    let floorColor = mix(vec3f(0.11,0.155,0.175),vec3f(0.53,0.58,0.59),scene.light);
    let floorBand = smoothstep(94.0,162.0,pos.y);
    var color = mix(sky,floorColor,floorBand);
    let floorLine = exp(-abs(pos.y-145.0)/0.8);
    color = mix(color,sky,0.28*floorLine);

    // The sword tip at the release frame is (0,0); the wrist sits above it.
    let pivot = vec2f(0,-31);
    let angle = bladeAngle(t);
    let bladeAxis = vec2f(cos(angle),sin(angle));
    let crossAxis = vec2f(-bladeAxis.y,bladeAxis.x);
    let palm = pivot-bladeAxis*3.5;
    let elbow = vec2f(-24,-30);
    let sleeve = coverage(segment(p,vec2f(-39,-5),elbow),6.0,aa);
    color = mix(color,vec3f(0.18,0.29,0.34),sleeve);
    let cuff = coverage(segment(p,elbow,palm),4.6,aa);
    color = mix(color,vec3f(0.32,0.43,0.46),cuff);
    let grip = coverage(length(p-palm),4.5,aa);
    color = mix(color,vec3f(0.52,0.45,0.36),grip);
    let bladeP = p-pivot;
    let along = dot(bladeP,bladeAxis);
    let across = dot(bladeP,crossAxis);
    let halfWidth = mix(2.2,0.15,smoothstep(20.0,31.0,along));
    let edge = max(abs(across)-halfWidth,max(2.0-along,along-31.0));
    let metal = mix(vec3f(0.34,0.49,0.55),vec3f(0.90,0.98,1.00),smoothstep(-0.4,0.75,across));
    color = mix(color,metal,coverage(edge,0,aa));
    let guard = segment(p,pivot-crossAxis*5.5,pivot+crossAxis*5.5);
    color = mix(color, vec3f(0.78,0.62,0.39),coverage(guard,1.45,aa));

    let travel = length(scene.end-scene.origin);
    let progress = clamp(t,0.0,1.0);
    let front = progress*travel;
    let halfSpan = max(1.0,0.5*scene.width*smoothstep(-0.012,0.15,t));
    let bend = min(halfSpan*0.60,front*0.70);
    let y = p.y/halfSpan;
    let crestX = front-bend*y*y;
    let behind = crestX-p.x;
    let visibleSpan = 1.0-smoothstep(0.69,1.0,abs(y));
    let attack = smoothstep(-0.005,0.065,t);
    let decay = 1.0-smoothstep(0.79,1.08,t);
    let envelope = attack*decay*visibleSpan;
    let thick = mix(1.20,2.15,large)*(1.0-0.38*min(abs(y),1.0));
    // Incident pressure and the immediately trailing rarefaction share one front.
    let trough = exp(-abs(behind-2.7*thick)/(2.6*thick))*envelope;
    let compressed = exp(-abs(behind)/thick)*envelope;
    let wakeExtent = min(front*0.72,halfSpan*0.62);
    let wake = smoothstep(0.0,thick,behind)*(1.0-smoothstep(thick,thick+wakeExtent,behind))*envelope;
    color = mix(color,vec3f(0.13,0.36,0.38),wake*0.36);
    color = mix(color,vec3f(0.075,0.18,0.21),trough*0.77);
    color = mix(color,vec3f(0.77,0.99,0.93),compressed*0.98);
    return vec4f(color,1);
}
