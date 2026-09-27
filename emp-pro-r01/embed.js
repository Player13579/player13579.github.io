const canvas = document.getElementById('vfx');
const error = document.getElementById('error');
const params = new URLSearchParams(location.search);
const draft = params.get('draft') === '1';
const verify = params.has('verify');
const Engine = await import(draft ? './p0/src/emp-e.js' : './r01/src/emp-e.js');
const clock = new Engine.ActorClock();
const muted = verify;
let fx;
let last = performance.now();
let epoch = 0;
let eventIndex = 0;
const loopMs = 10000;
const A = { x: -180, y: 0 }, B = { x: 180, y: 0 }, M = { x: 0, y: 0 };

function fail(cause) {
  error.hidden = false;
  error.textContent = `WebGPUを起動できませんでした。\n${cause?.message ?? cause}`;
}
function plan() {
  epoch++;
  clock.reset(0);
  fx.reset(0);
  let id = 0;
  const make = (kind, atMs, data) => ({ kind, spec: { id: `emp-gallery-${epoch}-${id++}`, atMs, ...data } });
  const next = [
    make('charge', 100, { actorId: 'A', origin: A }),
    make('charge', 340, { actorId: 'B', origin: B }),
    make('normal', 1300, { actorId: 'A', origin: A, targets: [] }),
    make('normal', 1540, { actorId: 'B', origin: B, phase: -1, targets: [] }),
    make('resonance', 1540, { origin: M, a: A, b: B }),
  ];
  eventIndex = 0;
  return next;
}
let events;
function emitUntil(ms) {
  while (eventIndex < events.length && events[eventIndex].spec.atMs <= ms) {
    const event = events[eventIndex++];
    fx[event.kind]({ ...event.spec, sound: !muted && event.spec.sound !== false });
  }
}
try {
  fx = await Engine.EMPEffects.create({ canvas, draft, onError: message => fail(new Error(message)) });
  fx.setView({ center: { x: 0, y: 0 }, pixelsPerGamePixel: 1 });
  events = plan();
  if (!muted) {
    canvas.addEventListener('pointerdown', async () => {
      try { await fx.enableAudio(); } catch (cause) { fail(cause); }
    }, { once: true });
  }
  function frame(now) {
    try {
      const dt = Math.min(100, Math.max(0, now - last)); last = now;
      clock.advance(dt);
      if (clock.ms >= loopMs) events = plan();
      emitUntil(clock.ms);
      fx.update({ actorMs: clock.ms, rate: 1 });
      fx.render();
      requestAnimationFrame(frame);
    } catch (cause) { fail(cause); }
  }
  requestAnimationFrame(frame);
  window.empGalleryPreview = { fx, getState: () => ({ draft, verifyMuted: muted, actorMs: clock.ms, stats: fx.stats() }) };
} catch (cause) { fail(cause); }
