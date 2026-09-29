import { VERSION, DURATION, createRenderer, StaminaAudio, samplePhase } from './stamina.mjs';
const params = new URLSearchParams(location.search);
const verify = params.has('verify');
if (params.has('embed')) document.body.classList.add('embed');
const $ = id => document.getElementById(id);
const status = $('status');
const audio = new StaminaAudio({ verify });
if (verify) { $('sound').disabled = true; $('sound').textContent = '検証：音声 0 固定'; }
const canvases = [$('dark'), $('bright')];
const renderers = [];
const diagnostics = { version: VERSION, verify, quality: 'candidate-unaccepted', gpu: 'initializing', errors: [], frames: 0, loops: 0, frameIntervals: [], phase: 'before', disposed: false };
let frameHandle = 0, paused = false, fixedTime = null, clockStart = 0, previousFrame = 0, previousLoop = -1;
const options = { height: 64, sparkle: true, glow: true, main: true, actor: true, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
$('motion').checked = options.reducedMotion;
function paint(time) {
  const paintStart=performance.now();
  diagnostics.phase = samplePhase(time).stage;
  diagnostics.effectTime = time;
  for (let i = 0; i < renderers.length; i++) {
    const canvas = canvases[i];
    if(canvas.clientWidth===0 || canvas.clientHeight===0)continue;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    renderers[i].draw({ ...options, height: options.height*dpr, time, background: i === 0 ? [.07,.095,.12] : [.90,.89,.85], originY: height*.80 });
  }
  diagnostics.frames++; diagnostics.lastSubmitMs=performance.now()-paintStart;
  diagnostics.errors = renderers.flatMap(r => r.errors);
}
function animate(now) {
  if (diagnostics.disposed) return;
  if (previousFrame && !paused) { diagnostics.frameIntervals.push(now-previousFrame); if (diagnostics.frameIntervals.length > 2400) diagnostics.frameIntervals.shift(); }
  previousFrame = now;
  const elapsed = (now-clockStart)/1000;
  const loop = Math.floor(elapsed/2.65);
  const time = fixedTime ?? (elapsed % 2.65);
  if (!paused) {
    if (loop !== previousLoop && fixedTime === null) {
      previousLoop = loop; diagnostics.loops++;
      audio.play({ eventId:'gain-stamina', semantic:'stamina-gain', result:'changed', authoritative:true, causeId:`preview:${loop}`, recipientId:'fixture-philia', actualDelta:1, atSeconds:now/1000-time }, now/1000);
    }
    paint(time); $('seek').value = Math.min(time,1.65);
  }
  if (diagnostics.frames%30===0) status.textContent = `${VERSION} | ${diagnostics.gpu} | ${diagnostics.phase} | ${options.height}px | ${verify?'verify: silent':'音は操作後に有効'}\n品質未受入 / GPU frames ${diagnostics.frames} / errors ${diagnostics.errors.length}`;
  frameHandle = requestAnimationFrame(animate);
}
async function dispose() {
  if (diagnostics.disposed) return;
  diagnostics.disposed = true; cancelAnimationFrame(frameHandle);
  // Destroy shared consumers before the device owner.
  for (const renderer of [...renderers].reverse()) renderer.dispose();
  await audio.dispose();
}
window.__staminaE = {
  diagnostics,
  renderAt(time, overrides = {}) { Object.assign(options,overrides); paused = true; fixedTime = time; paint(time); return { ...diagnostics }; },
  resume() { fixedTime = null; paused = false; previousFrame=0; },
  dispose,
  audioState() { return { verify:audio.verify, muted:audio.muted, contextCreated:!!audio.context, activeNodes:audio.nodes.size }; }
};
for (const [id,key] of [['spark','sparkle'],['glow','glow'],['main','main'],['motion','reducedMotion']]) $(id).addEventListener('change',e=>{ options[key]=e.target.checked; if(paused) paint(fixedTime??diagnostics.effectTime??0); });
$('size').addEventListener('change', e=>{options.height=Number(e.target.value);if(paused)paint(fixedTime??diagnostics.effectTime??0);});
$('seek').addEventListener('input',e=>{paused=true;fixedTime=Number(e.target.value);paint(fixedTime);$('pause').textContent='再生';});
$('pause').addEventListener('click',()=>{paused=!paused;fixedTime=null;$('pause').textContent=paused?'再生':'一時停止';});
$('sound').addEventListener('click',async()=>{
  if (verify) return;
  try { if(audio.muted){await audio.enable();$('sound').textContent='音を消す';}else{audio.setMuted(true);$('sound').textContent='音を有効にする';} }catch(error){diagnostics.errors.push(error.message);}
});
addEventListener('pagehide',()=>{void dispose();},{once:true});
try {
  renderers.push(await createRenderer(canvases[0]));
  renderers.push(await createRenderer(canvases[1], { device:renderers[0].device }));
  diagnostics.gpu='ready'; clockStart=performance.now(); frameHandle=requestAnimationFrame(animate);
} catch(error) {
  diagnostics.gpu='failed'; diagnostics.errors.push(error.message); status.textContent=`WebGPU を開始できません: ${error.message}`; await dispose();
}
