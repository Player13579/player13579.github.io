import {strokeText, strokeGlyph} from './glyphs.mjs';
export const ARTIST = 'GPT-6.1-Sol';
export const ABI = 'dva-vibe-r5-linear-strokes-1';
export const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
const mix = (a,b,t) => a+(b-a)*t;
const hash = n => { n=Math.imul(n^0x9e3779b9,0x85ebca6b); n^=n>>>13; return (n>>>0)/4294967296; };
const seedOf = id => [...id].reduce((s,c)=>Math.imul(s^c.charCodeAt(0),16777619)>>>0,2166136261);
const rainGlyphs = Object.fromEntries([...'01abcdef'].map(ch=>[ch,strokeGlyph(ch)]));
const layoutCache = new WeakMap();
const TEXT_X=-1.83, TEXT_H=.23, ADVANCE=.135;

// The ten incoming heads own contiguous groups on one actual code line each.
// Line breaks therefore cannot teleport one arrival to two distant positions.
function layoutFor(lines) {
  const signature=lines.join('\n'), cached=layoutCache.get(lines);
  if(cached?.signature===signature) return cached;
  const panelBottom=-1.24, panelTop=panelBottom-(.20+lines.length*.27);
  const total=lines.reduce((n,line)=>n+line.length,0), allocations=lines.map(()=>1);
  for(let remaining=Math.min(10,total)-lines.length;remaining>0;remaining--) {
    let selected=-1;
    for(let row=0;row<lines.length;row++) {
      if(allocations[row]>=lines[row].length) continue;
      if(selected<0||lines[row].length/allocations[row]>lines[selected].length/allocations[selected]) selected=row;
    }
    allocations[selected]++;
  }
  const groups=[];
  lines.forEach((line,row)=>{
    const y=panelTop+.09+row*.27, slots=allocations[row];
    for(let slot=0;slot<slots;slot++) {
      const start=Math.floor(line.length*slot/slots), end=Math.floor(line.length*(slot+1)/slots);
      const x=TEXT_X+start*ADVANCE, endX=TEXT_X+(end-1)*ADVANCE+ADVANCE*.72;
      groups.push({row,start,end,text:line.slice(start,end),x:(x+endX)/2,y:y+TEXT_H*.35,
        segments:strokeText(line.slice(start,end),x,y,TEXT_H,ADVANCE)});
    }
  });
  // The last line contains the actual noun/target in wrapped commands.
  const last=lines.length-1, underlineY=panelTop+.09+last*.27+TEXT_H+.05;
  const underlineEnd=TEXT_X+(lines[last].length-1)*ADVANCE+ADVANCE*.72;
  const layout={signature,panelTop,panelBottom,groups,total,underlineY,underlineEnd};
  layoutCache.set(lines,layout); return layout;
}

// Segment ABI: ax,ay,bx,by,halfWidth,r,g,b,opacity,emission,kind,pad. H-normalized.
// Formation is a display-side digital gesture, not an executable game operation.
export function buildFrame({causeKey, programLines, ageMs, durationMs, reducedMotion=false}) {
  if(typeof causeKey!=='string'||!causeKey||!Array.isArray(programLines)||programLines.length<1||programLines.length>3)
    throw new TypeError('Cause and finite program required');
  if(!Number.isFinite(ageMs)||durationMs!==1200) throw new RangeError('Finite 1200 actor E-ms required');
  for(const line of programLines)
    if(typeof line!=='string'||!line.length||line.length>27) throw new RangeError('Program line exceeds locked layout');
  const empty={rear:new Float32Array(),front:new Float32Array(),phase:'off',focus:null,commit:0,assembly:[]};
  if(ageMs<0||ageMs>=durationMs) return empty;
  const p=ageMs/durationMs, seed=seedOf(causeKey), layout=layoutFor(programLines);
  const onset=smooth(0,90,ageMs), release=1-smooth(984,1200,ageMs), env=onset*release;
  const seal=smooth(756,828,ageMs), rear=[],front=[],assembly=[];
  const add=(dst,coords,w,color,opacity,emission,kind=0)=> {
    if(opacity>0) dst.push(...coords,w,...color,opacity,emission,kind,0);
  };
  const green=[.055,.95,.20], mint=[.24,1,.56], white=[.8,1,.88];
  const {panelTop,panelBottom}=layout;
  add(front,[-2.02,panelTop,2.02,panelBottom],.035,[.008,.021,.013],.91*env,0,1);

  layout.groups.forEach((group,c)=>{
    const arrivalAt=204+c*18.4, settledAt=arrivalAt+38.4;
    const travel=smooth(90,arrivalAt,ageMs), formation=smooth(arrivalAt,settledAt,ageMs);
    // Incoming head and outgoing letters share this destination and formation.
    const sourceX=reducedMotion?group.x:-1.88+c*.40;
    const sourceY=reducedMotion?group.y-.18:panelTop-.80;
    const headX=mix(sourceX,group.x,travel), headY=mix(sourceY,group.y,travel);
    const rainAlpha=env*(1-formation), collapse=1-formation;
    for(let row=0;row<5;row++) {
      const symbol='01abcdef'[Math.floor(hash(seed+c*31+row*73)*8)];
      const x=headX-.0475, y=headY-.0675-row*(reducedMotion?.065:.18)*collapse;
      const alpha=rainAlpha*(row===0?1.0:.52-row*.085);
      for(const [ax,ay,bx,by] of rainGlyphs[symbol]) add(rear,
        [x+ax*.095,y+ay*.18,x+bx*.095,y+by*.18],.009,row===0?mint:green,alpha,row===0?3.15:1.10);
    }
    for(const [ax,ay,bx,by] of group.segments) add(front,
      [mix(group.x,ax,formation),mix(group.y,ay,formation),mix(group.x,bx,formation),mix(group.y,by,formation)],
      .010,seal>.4?mint:green,env*formation,1.50+.72*seal);
    assembly.push({row:group.row,start:group.start,end:group.end,arrivalAt,settledAt,
      formation,rainAlpha,letterAlpha:env*formation,head:[headX,headY],destination:[group.x,group.y]});
  });

  // A luminous underline traverses the command without crossing any target glyph.
  const run=smooth(528,756,ageMs), frontier=mix(TEXT_X,layout.underlineEnd,run);
  const edgeAlpha=env*(1-smooth(756,828,ageMs));
  if(ageMs>=528) {
    add(front,[TEXT_X,layout.underlineY,frontier,layout.underlineY],.010,mint,
      env*(.60+.25*seal),2.2);
    if(ageMs<828) add(front,[Math.max(TEXT_X,frontier-.14),layout.underlineY,
      Math.min(layout.underlineEnd,frontier+.02),layout.underlineY],.017,white,edgeAlpha,4.5);
  }
  const braceAlpha=env*(.45+.55*seal), braceColor=seal>.5?mint:green;
  for(const side of [-1,1]) {
    const x=side*1.94;
    for(const seg of [[x,panelTop+.03,x,panelBottom-.03],[x,panelTop+.03,x-side*.14,panelTop+.03],
      [x,panelBottom-.03,x-side*.14,panelBottom-.03]]) add(front,seg,.018,braceColor,braceAlpha,1.6+seal*1.8);
  }
  return {rear:new Float32Array(rear),front:new Float32Array(front),
    phase:ageMs<204?'receive':ageMs<408?'compile':ageMs<528?'read':ageMs<828?'execute':ageMs<984?'sealed':'release',
    focus:{x:frontier,y:layout.underlineY,energy:ageMs>=528&&ageMs<828?edgeAlpha*4.5:0},
    commit:seal,envelope:env,normalizedAge:p,assembly,
    execution:{startE:528,travelEndE:756,sealEndE:828,startX:TEXT_X,endX:layout.underlineEnd,y:layout.underlineY}};
}
export function validateScissor(rect,width,height) {
  if(!Array.isArray(rect)||rect.length!==4||![width,height,...rect].every(Number.isSafeInteger)) throw new TypeError('Scissor UInt32 integers');
  if(width<=0||height<=0||width>0xffffffff||height>0xffffffff||rect.some(v=>v<0||v>0xffffffff)) throw new RangeError('Scissor UInt32 range');
  if(rect[2]===0||rect[3]===0||rect[0]+rect[2]>width||rect[1]+rect[3]>height) throw new RangeError('Scissor outside current attachment');
  return rect.slice();
}
