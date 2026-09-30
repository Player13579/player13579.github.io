// Reuses only the tested orthographic/MRT/body/finite-filter transport plumbing.
// The registered membrane, geodesic hit lift and annular pupil profile are replaced.
import fs from 'node:fs';
import {worldShader as plumbing} from '../r8/world-shader.mjs';
import {postShader as postPlumbing} from '../r8/post-shader.mjs';
import {DESIGN as D,createDistances,breakDistances,createMax,breakMax,cells} from './design.mjs';
const list=a=>a.map(x=>`${x}u`).join(',');
const geometry=/*wgsl*/`
const axes=vec3f(1.04,1.20,.80);
const createD=array<u32,72>(${list(createDistances)});
const releaseD=array<u32,72>(${list(breakDistances)});
fn unit(v:vec3f)->vec3f{return v/max(length(v),.000001);}
fn ease(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn wrap12(v:f32)->f32{return v-12.*floor((v+6.)/12.);}
fn centre(id:u32)->vec3f{let row=id/12u;let col=id%12u;let y=-.80+f32(row)*.32;let theta=(f32(col)+.5*f32(row%2u))*.5235987756;let r=sqrt(1.-y*y);return vec3f(r*sin(theta),y,r*cos(theta));}
fn seed(i:u32)->vec3f{return centre(select(22u,49u,i>0u));}
struct Tile{id:u32,metric:f32};
fn tileAt(n:vec3f)->Tile{let angle=atan2(n.x,n.z)/.5235987756;let nearRow=i32(clamp(round((n.y+.80)/.32),0.,5.));var best:Tile;best.id=0u;best.metric=100.;for(var dr=-1;dr<=1;dr++){let row=nearRow+dr;if(row<0||row>5){continue;}let parity=f32(row%2);let nearCol=i32(round(angle-.5*parity));for(var dc=-1;dc<=1;dc++){let col=((nearCol+dc)%12+12)%12;let u=wrap12(angle-f32(col)-.5*parity);let v=(n.y-(-.80+f32(row)*.32))/.32;let metric=max(2.*abs(u),abs(u)+1.5*abs(v));if(metric<best.metric){best.id=u32(row*12+col);best.metric=metric;}}}return best;}
fn distance(a:u32,b:u32)->f32{let ra=i32(a/12u);let rb=i32(b/12u);let dr=ra-rb;var best=100;for(var k=-1;k<=1;k++){let dq=i32(a%12u)-i32(b%12u)+k*12-ra/2+rb/2;best=min(best,max(abs(dq),max(abs(dr),abs(dq+dr))));}return f32(best);}
fn registration(id:u32)->f32{if(frame.phase.z<.5||frame.phase.y>3.5){return 0.;}let t=frame.phase.x;if(frame.phase.y<.5){let at=.50*f32(createD[id])/${createMax}.;return ease(at,at+.06,t);}if(frame.phase.y>1.5&&frame.phase.y<2.5){let at=.36*f32(releaseD[id])/${breakMax}.;return 1.-ease(at,at+.09,t);}return 1.;}
fn response(id:u32)->f32{if(frame.phase.y<2.5||frame.phase.y>3.5||frame.phase.x>=.65){return 0.;}let hitId=select(22u,u32(frame.contact.w),frame.phase.w>.5);let at=.045*distance(id,hitId);return ease(at,at+.016,frame.phase.x)*(1.-ease(at+.055,at+.12,frame.phase.x));}
fn registered(n:vec3f)->f32{return registration(tileAt(n).id);}
`;
let world=plumbing.replace(/const axes=[\s\S]*?fn view\(/,geometry+'\nfn view(');
world=world.replace('let at=select(.16,.43,i>0u);','let at=select(.14,.42,i>0u);').replace(')/.05,2.))*registered',')/.045,2.))*registered').replace('let at=select(.13,.34,i>0u);','let at=select(.08,.22,i>0u);').replace(')/.036,2.))*registered',')/.030,2.))*registered');
const density=/*wgsl*/`struct Density{rgb:vec3f,density:f32,signal:vec2f};
fn density(p:vec3f)->Density{let q=p/axes;let n=unit(q);let tile=tileAt(n);let state=registration(tile.id);let pulse=response(tile.id);let band=1.-ease(.035,.055,abs(length(q)-1.));let outer=1.-ease(.955,1.,tile.metric);let rim=ease(.76,.91,tile.metric)*outer;let inner=1.-ease(.73-.22*pulse,.79-.22*pulse,tile.metric);let coverage=band*state*outer*frame.gates.x;let hue=vec3f(.18,.58,1.20);let brightness=.27+.84*rim+.42*inner;var white=vec2f(0.);for(var i=0u;i<2u;i++){let s=focus(i);let d=p-s.p;white[i]=s.power*exp(-dot(d,d)/.035);}var out:Density;out.rgb=(hue*4.2*brightness+vec3f(8.,8.,7.6)*(white.x+white.y))*coverage;out.density=coverage;out.signal=white*coverage;return out;}
`;
world=world.replace(/struct Density[\s\S]*?struct Pixel/,density+'\nstruct Pixel').replace('let step=1.55/24.','let step=1.65/32.').replace('j<24u','j<32u').replace('select(-1.55,0.,front)','select(-1.65,0.,front)').replace('exp(-1.7*d.density','exp(-1.35*d.density').replace('d.rgb*.17*.65','d.rgb*.11*.65');
// Same camera-facing image receiver, new authored cell-area quadrature directions.
const nodes=[22,49,31,32,58,10].map(id=>`centre(${id}u)`);
world=world.replace(/let directions=array<vec3f,6>\([^;]+;/,`let directions=array<vec3f,6>(${nodes.join(',')});`);
// Avoid WGSL reserved token before handoff, no adapter-time source rewriting.
world=world.replace(/\blayout\b/g,'frameLayout');
let post=postPlumbing.replace('vec3f(.96,1.14,.72)','vec3f(1.04,1.20,.80)').replace(/let n=unit\(select\(vec3f\(-\.61,-\.42,\.67\),vec3f\(\.48,\.58,\.66\),i>0u\)\);/,`let n=select(vec3f(${cells[22].direction.map(v=>v.toFixed(10)).join(',')}),vec3f(${cells[49].direction.map(v=>v.toFixed(10)).join(',')}),i>0u);`);
post=post.replace(/let r=length\(vec2f\(dot\(g,ax\)\/7\.5,dot\(g,ay\)\/5\.25\)\);let aperture=\(1\.-smoothstep\(\.85,1\.46,r\)\);let pupil=[^;]+;/,`let r=length(vec2f(dot(g,ax)/8.,dot(g,ay)/6.));let aperture=1.-smoothstep(1.,1.5,r);let pupil=exp(-2.8*r*r)*aperture;`);
post=post.replace(/\blayout\b/g,'frameLayout');
fs.writeFileSync(new URL('world-shader.mjs',import.meta.url),'export const worldShader=/*wgsl*/`'+world+'`;\n');
fs.writeFileSync(new URL('post-shader.mjs',import.meta.url),'export const postShader=/*wgsl*/`'+post+'`;\n');
console.log(JSON.stringify({worldBytes:world.length,postBytes:post.length,createMax,breakMax,profile:'72 true hex parametric cells; graph wave; non-annular finite defocused pupil'}));
