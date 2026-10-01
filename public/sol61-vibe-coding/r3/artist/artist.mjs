import {strokeText, strokeGlyph} from './glyphs.mjs';
export const ARTIST = 'GPT-6.1-Sol';
export const ABI = 'dva-vibe-r2-linear-strokes-1';
export const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
const hash = n => { n=Math.imul(n^0x9e3779b9,0x85ebca6b); n^=n>>>13; return (n>>>0)/4294967296; };
const seedOf = id => [...id].reduce((s,c)=>Math.imul(s^c.charCodeAt(0),16777619)>>>0,2166136261);
// Segment ABI: ax,ay,bx,by,halfWidth,r,g,b,opacity,emission,kind,pad. H-normalized.
export function buildFrame({causeKey, programLines, ageMs, durationMs, reducedMotion=false}) {
  if(typeof causeKey!=='string'||!causeKey||!Array.isArray(programLines)||programLines.length<1||programLines.length>3)
    throw new TypeError('Cause and finite program required');
  if(!Number.isFinite(ageMs)||!Number.isFinite(durationMs)||durationMs<=0) throw new RangeError('Finite E clock required');
  for(const line of programLines) if(line.length>27) throw new RangeError('Program line exceeds locked layout');
  const empty={rear:new Float32Array(),front:new Float32Array(),phase:'off',focus:null,commit:0};
  if(ageMs<0||ageMs>=durationMs) return empty;
  const p=ageMs/durationMs, seed=seedOf(causeKey);
  const onset=smooth(0,.075,p), release=1-smooth(.82,1,p), env=onset*release;
  const capture=smooth(.12,.34,p), seal=smooth(.57,.69,p), rainOff=1-smooth(.66,.80,p);
  const rear=[],front=[];
  const add=(dst,coords,w,color,opacity,emission,kind=0)=>dst.push(...coords,w,...color,opacity,emission,kind,0);
  const green=[.055,.95,.20], mint=[.24,1,.56], white=[.8,1,.88];
  // Rear data falls THROUGH finite columns and arrests at the code plane. Never endless full-screen rain.
  for(let c=0;c<13;c++) {
    const x=-1.72+c*.285, velocity=.55+hash(seed+c*17)*.40;
    for(let row=0;row<6;row++) {
      const travel=reducedMotion ? row*.16 : ((row*.18+p*velocity+hash(seed+c*97)*.35)%1.25);
      const y=-2.65+travel;
      const stop=-1.84 + (c%3)*.02;
      const yy=y+(stop-y)*capture*.68;
      const symbol='01abcdef'[Math.floor(hash(seed+c*31+row*73)*8)];
      const local=strokeGlyph(symbol);
      const head=row===5, alpha=env*rainOff*(head?.86:.28+.055*row);
      for(const [ax,ay,bx,by] of local) add(rear,[x+ax*.065,yy+ay*.13,x+bx*.065,yy+by*.13],.008,
        head?mint:green,alpha,head?2.7:.70);
    }
  }
  // Program plane has a non-emissive dark material backing (kind=1 rectangle endpoints).
  const panelTop=-1.80, panelBottom=-1.13;
  add(front,[-1.84,panelTop,1.84,panelBottom],.035,[.008,.021,.013],.88*env,0,1);
  const chars=programLines.reduce((n,line)=>n+line.length,0);
  const reveal=Math.floor(chars*smooth(.17,.34,p));
  let seen=0;
  programLines.forEach((line,row) => {
    const text=line.slice(0,Math.max(0,reveal-seen)); seen+=line.length;
    const y=panelTop+.07+row*.185;
    for(const segment of strokeText(text,-1.64,y,.165,.115)) add(front,segment,.011,
      seal>.4?mint:green,env,1.50+.72*seal);
  });
  // The execution frontier belongs to the completed program, not a generic floor wave.
  const run=smooth(.44,.63,p), frontier=-1.68+3.36*run;
  if(p>=.44&&p<.69) add(front,[frontier,panelTop+.035,frontier,panelBottom-.035],.017,white,
    env*(1-smooth(.63,.69,p)),4.5);
  const braceAlpha=env*(.45+.55*seal), braceColor=seal>.5?mint:green;
  for(const side of [-1,1]) {
    const x=side*1.77;
    for(const seg of [[x,panelTop+.03,x,panelBottom-.03],[x,panelTop+.03,x-side*.14,panelTop+.03],
      [x,panelBottom-.03,x-side*.14,panelBottom-.03]]) add(front,seg,.018,braceColor,braceAlpha,1.6+seal*1.8);
  }
  return {rear:new Float32Array(rear),front:new Float32Array(front),
    phase:p<.17?'receive':p<.34?'compile':p<.44?'read':p<.69?'execute':p<.82?'sealed':'release',
    focus:{x:frontier,y:(panelTop+panelBottom)/2,energy:p>=.44&&p<.69?env*(1-smooth(.63,.69,p))*4.5:0},
    commit:seal, envelope:env, normalizedAge:p};
}
export function validateScissor(rect,width,height) {
  if(!Array.isArray(rect)||rect.length!==4||![width,height,...rect].every(Number.isSafeInteger)) throw new TypeError('Scissor UInt32 integers');
  if(width<=0||height<=0||width>0xffffffff||height>0xffffffff||rect.some(v=>v<0||v>0xffffffff)) throw new RangeError('Scissor UInt32 range');
  if(rect[2]===0||rect[3]===0||rect[0]+rect[2]>width||rect[1]+rect[3]>height) throw new RangeError('Scissor outside current attachment');
  return rect.slice();
}
