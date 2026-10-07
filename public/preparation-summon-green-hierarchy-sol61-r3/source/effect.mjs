// GPT-6.1-Sol: new green geometric edition, not an adapter of an older shader.
export const EFFECT_ID = 'preparation-summon-green-hierarchy-sol61-r3';
export const DURATION = 3.2;
export const WORLD = Object.freeze({ radius: 1.08, actorHeight: 1.7, planeY: .008, elevation: 32 * Math.PI / 180 });
const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
export function phase(age) {
  if (!Number.isFinite(age) || age < 0 || age >= DURATION) return { active:false, envelope:0, reveal:0, arrival:0, release:1 };
  return { active:true, envelope:smooth(0,.18,age)*(1-smooth(2.35,3.2,age)),
    reveal:smooth(0,.8,age), arrival:smooth(.72,.96,age)*(1-smooth(1.35,1.72,age)), release:smooth(2.35,3.2,age) };
}
export function project(world, pixelsPerMeter, anchor=[0,0], elevation=WORLD.elevation) {
  return [anchor[0]+world[0]*pixelsPerMeter,anchor[1]+(-world[1]*Math.cos(elevation)+world[2]*Math.sin(elevation))*pixelsPerMeter];
}
export function planePoint(pixel,pixelsPerMeter,anchor=[0,0],elevation=WORLD.elevation) {
  return [(pixel[0]-anchor[0])/pixelsPerMeter,WORLD.planeY,
    ((pixel[1]-anchor[1])/pixelsPerMeter+WORLD.planeY*Math.cos(elevation))/Math.sin(elevation)];
}
export function starSegments(n,step,radius,offset=0) {
  return Array.from({length:n},(_,i)=>{const a=offset+2*Math.PI*i/n,b=offset+2*Math.PI*((i+step)%n)/n;
    return [[radius*Math.cos(a),radius*Math.sin(a)],[radius*Math.cos(b),radius*Math.sin(b)]];});
}
export const GEOMETRY = Object.freeze({rings:[.22,.43,.69,.92,1.08],outerStar:{n:12,step:5,radius:.92,offset:Math.PI/12},
  innerStar:{n:9,step:4,radius:.61,offset:-Math.PI/2},petals:{count:6,center:.40,axes:[.60,.26]},lineHalfWidth:.009});
// ABI: 4 vec4<f32>, 64 bytes. Screen coordinates are physical render pixels.
export function packUniform({width,height,anchor,ppm,age,exposure=1.0,worldOn=true,arrivalOn=true,obsOn=true}) {
  if (!(width>0 && height>0 && ppm>0) || !anchor?.every(Number.isFinite)) throw new Error('Invalid projection');
  return new Float32Array([width,height,...anchor,ppm,WORLD.elevation,age,exposure,
    +worldOn,+arrivalOn,+obsOn,0,0,0,0,0]);
}
