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

fn toLinear(c: vec3f) -> vec3f {
    return select(pow((c+0.055)/1.055,vec3f(2.4)),c/12.92,c<=vec3f(0.04045));
}
fn toCode(c: vec3f) -> vec3f {
    let v = clamp(c,vec3f(0.0),vec3f(1.0));
    return select(1.055*pow(v,vec3f(1.0/2.4))-0.055,12.92*v,v<=vec3f(0.0031308));
}

// One transverse slice: leading x, axial depth, lip scale, lateral weight.
// Called only for |y| <= 1, with y measured in half-spans.
fn sliceAt(y: f32, front: f32, halfSpan: f32, bend: f32, large: f32) -> vec4f {
    let crestX = front-bend*y*y;
    let visibleSpan = 1.0-smoothstep(0.69,1.0,abs(y));
    let thick = mix(1.20,2.15,large)*(1.0-0.38*min(abs(y),1.0));
    let depthPx = min(0.82*crestX,(5.0*thick+0.54*halfSpan)*(1.0-0.24*abs(y)));
    return vec4f(crestX,depthPx,thick,visibleSpan);
}

// RGB is emitted radiance integrated through the sheet; A is 1-transmittance.
fn columnLight(behind: f32, s: vec4f, drive: f32) -> vec4f {
    if (behind <= 0.0 || behind >= s.y) { return vec4f(0.0); }
    let u = behind/s.y;
    let mass = smoothstep(0.0,0.095,u)*(1.0-smoothstep(0.68,1.0,u));
    let compression = 1.0-smoothstep(0.18,0.76,u);
    let lip = 1.0-smoothstep(0.65*s.z,2.85*s.z,behind);
    let tau = drive*s.w*mass*(1.32+0.64*compression+0.50*lip);
    let opacity = 1.0-exp(-tau);
    let bodyLight = mix(vec3f(0.045,0.84,0.72),vec3f(0.12,0.98,0.91),compression);
    let sourceLight = mix(bodyLight,vec3f(0.72,1.0,0.88),0.86*lip);
    return vec4f(sourceLight*opacity,opacity);
}
fn rayAt(q: vec2f, front: f32, halfSpan: f32, bend: f32, large: f32, drive: f32) -> vec4f {
    let y = q.y/halfSpan;
    if (abs(y) >= 1.0) { return vec4f(0.0); }
    let s = sliceAt(y,front,halfSpan,bend,large);
    return columnLight(s.x-q.x,s,drive);
}

// Finite area emitter, soft parallel-sheet coupling to local material.
// Each integration weight includes the actual area of its curved-strip cell.
fn incidentAt(q: vec2f, front: f32, halfSpan: f32, bend: f32, large: f32, drive: f32) -> vec3f {
    let h = mix(8.0,12.0,large);
    let reach = 4.0*h;
    if (q.x < -reach || q.x > front+reach || abs(q.y) > halfSpan+reach) { return vec3f(0.0); }
    // Positive Gauss-Legendre rules: (node, weight), measures 2 and 1.
    // Tensor product: 128 candidate samples, at most 128 columnLight calls.
    const yRule = array<vec2f, 16>(
        vec2f(-0.9894009349916499, 0.02715245941175409),
        vec2f(-0.9445750230732326, 0.06225352393864789),
        vec2f(-0.8656312023878318, 0.09515851168249278),
        vec2f(-0.7554044083550030, 0.12462897125553387),
        vec2f(-0.6178762444026438, 0.14959598881657673),
        vec2f(-0.4580167776572274, 0.16915651939500254),
        vec2f(-0.2816035507792589, 0.18260341504492359),
        vec2f(-0.09501250983763744, 0.18945061045506850),
        vec2f(0.09501250983763744, 0.18945061045506850),
        vec2f(0.2816035507792589, 0.18260341504492359),
        vec2f(0.4580167776572274, 0.16915651939500254),
        vec2f(0.6178762444026438, 0.14959598881657673),
        vec2f(0.7554044083550030, 0.12462897125553387),
        vec2f(0.8656312023878318, 0.09515851168249278),
        vec2f(0.9445750230732326, 0.06225352393864789),
        vec2f(0.9894009349916499, 0.02715245941175409)
    );
    const uRule = array<vec2f, 8>(
        vec2f(0.019855071751231884, 0.05061426814518813),
        vec2f(0.10166676129318663, 0.11119051722668724),
        vec2f(0.2372337950418355, 0.15685332293894364),
        vec2f(0.4082826787521751, 0.1813418916891810),
        vec2f(0.5917173212478249, 0.1813418916891810),
        vec2f(0.7627662049581645, 0.15685332293894364),
        vec2f(0.8983332387068134, 0.11119051722668724),
        vec2f(0.9801449282487681, 0.05061426814518813)
    );
    var sumLight = vec3f(0.0);
    for (var j = 0; j < 16; j = j+1) {
        let y = yRule[j].x;
        let s = sliceAt(y,front,halfSpan,bend,large);
        let stripArea = (yRule[j].y*halfSpan)*s.y;
        for (var i = 0; i < 8; i = i+1) {
            let d = uRule[i].x*s.y;
            let cellArea = stripArea*uRule[i].y;
            let r = q-vec2f(s.x-d,y*halfSpan);
            let r2 = dot(r,r);
            if (r2 < reach*reach) {
                let den = r2+h*h;
                let window = 1.0-smoothstep(6.25*h*h,reach*reach,r2);
                let coupling = h*h*window/(3.14159265*den*den);
                sumLight += columnLight(d,s,drive).rgb*(cellArea*coupling);
            }
        }
    }
    return sumLight;
}

// The field is measured in logical scene pixels. The release point lies on the
// moving tip and its tangent is parallel to the effect's origin-to-end vector.
@fragment fn fragment(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
    let scale = min(scene.viewport.x/384.0, scene.viewport.y/176.0);
    let sky = mix(vec3f(0.056,0.086,0.118),vec3f(0.71,0.74,0.75),scene.light);
    if (scale <= 0.0) { return vec4f(sky,1); }
    let pos = (pixel.xy - 0.5*scene.viewport)/scale + vec2f(192,88);
    let aa = max(0.55/scale,0.35);
    let travel = length(scene.end-scene.origin);
    var axis = vec2f(1,0);
    if (travel > 0.0) { axis = normalize(scene.end-scene.origin); }
    let normal = vec2f(-axis.y, axis.x);
    let delta = pos-scene.origin;
    let p = vec2f(dot(delta,axis),dot(delta,normal));
    let t = scene.phase;
    let large = scene.giant;
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
    if (t <= 0.0 || t >= 1.08 || travel <= 0.0) { return vec4f(color,1); }

    let progress = clamp(t,0.0,1.0);
    let front = progress*travel;
    let halfSpan = max(1.0,0.5*scene.width*smoothstep(-0.012,0.15,t));
    let bend = min(halfSpan*0.60,front*0.70);
    let attack = smoothstep(0.0,0.065,t);
    let decay = 1.0-smoothstep(0.79,1.08,t);
    let drive = attack*decay;

    // Four subpixel rays integrate premultiplied column light and extinction.
    let dx = vec2f(axis.x,normal.x)*(0.25/scale);
    let dy = vec2f(axis.y,normal.y)*(0.25/scale);
    let beam = 0.25*(rayAt(p-dx-dy,front,halfSpan,bend,large,drive)
                    +rayAt(p+dx-dy,front,halfSpan,bend,large,drive)
                    +rayAt(p-dx+dy,front,halfSpan,bend,large,drive)
                    +rayAt(p+dx+dy,front,halfSpan,bend,large,drive));

    // Top material replaces the receiver below it, just as in the resting pose.
    var rho = floorBand*vec3f(0.35,0.44,0.43);
    rho = mix(rho,vec3f(0.12,0.21,0.24),sleeve);
    rho = mix(rho,vec3f(0.24,0.34,0.36),cuff);
    rho = mix(rho,vec3f(0.50,0.35,0.23),grip);
    rho = mix(rho,vec3f(0.46,0.66,0.72),coverage(edge,0,aa));
    rho = mix(rho,vec3f(0.62,0.46,0.24),coverage(guard,1.45,aa));
    var reflectedRadiance = vec3f(0.0);
    if (any(rho > vec3f(0.0))) {
        let incident = incidentAt(p,front,halfSpan,bend,large,drive);
        // incident already includes the normalized kernel's 1/pi; gain is 1.
        reflectedRadiance = rho*incident;
    }
    if (beam.a == 0.0 && all(reflectedRadiance == vec3f(0.0))) { return vec4f(color,1); }
    let baseLin = toLinear(color);
    let litMaterial = baseLin+reflectedRadiance;
    return vec4f(toCode(litMaterial*(1.0-beam.a)+beam.rgb),1);
}