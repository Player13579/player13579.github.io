import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const shader=readFileSync(path.join(here,'../creative/reload-e-sol61-r4.wgsl'),'utf8');
const raw='o.coverage=(0.92*unionCoverage+0.70*receiverSide)*gate;';
const fixed='o.coverage=clamp((0.92*unionCoverage+0.70*receiverSide)*gate,0.0,1.0);';
assert(!shader.includes(raw));assert(shader.includes(fixed));
const clamp01=x=>Math.max(0,Math.min(1,x));
const opacity=(union,side,gate)=>clamp01((.92*union+.70*side)*gate);
// Author's deterministic latch/receiver overlap point: unclamped opacity was 1.4583.
assert.equal(opacity(1,.7690136372888261,1),1);
// Author's 112,941-point local scan peak; repaired output remains bounded.
assert.equal(opacity(.9932445218807248,.9932445218807248,1),1);
assert(opacity(1,.7690136372888261,1)<=1);
// Reconstruct the shader's stated R4 bevel/mask opacity over the author's complete 112,941-point overlap grid.
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
const aa=Math.max(.006,.85/64),mask=d=>1-smooth((d+aa)/(2*aa));
const box=(x,y,bx,by)=>Math.hypot(Math.max(Math.abs(x)-bx,0),Math.max(Math.abs(y)-by,0))+Math.min(Math.max(Math.abs(x)-bx,Math.abs(y)-by),0);
const bevel=(x,y,bx,by,cut)=>Math.max(box(x,y,bx,by),(Math.abs(x)+Math.abs(y)-bx-by+cut)*.70710678);
const receiverD=(x,y)=>Math.min(bevel(x,y-.405,.38,.055,.032),bevel(x+.325,y-.20,.055,.20,.030),bevel(x-.325,y-.20,.055,.20,.030));
const field=(x,y,gate=1)=>{const receiver=mask(receiverD(x,y)),side=mask(receiverD(x-.020,y+.023))*(1-receiver),supply=mask(bevel(x,y-.025,.20,.30,.055)),latch=mask(bevel(x,y-.022,.274,.028,.010)),union=Math.max(receiver,supply,latch);return opacity(union,side,gate)};
let gridMax=0;for(let ix=-400;ix<=400;ix++)for(let iy=-60;iy<=80;iy++)gridMax=Math.max(gridMax,field(ix/1000,iy/1000));
assert.equal(gridMax,1);
// Existing shader source-off guard returns zero before evaluating field coverage.
assert.match(shader,/if\(!live\|\|p\.gates\.x<=0\.0\|\|p\.gates\.z<=0\.0\|\|p\.gates\.w<=0\.0\)\{return o;\}/);
assert.equal(opacity(1,.7690136372888261,0),0);
assert.equal(field(-.255,.018,0),0);
// Existing complete-phase fade reaches zero at 620ms; bounded coverage stays zero.
assert.match(shader,/let fade=select\(opened,1\.0-ease\(\(age-420\.0\)\/200\.0\),complete\);/);
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
const age=620,fade=1-ease((age-420)/200),gate=1*1*fade;
assert.equal(fade,0);assert.equal(opacity(1,.7690136372888261,gate),0);
assert.equal(field(-.255,.018,gate),0);
console.log('coverage clamp: overlap, peak, source-off, and expiry PASS');
