// GPT-6.1-Sol: authored acoustic approximation of the existing digital assembly.
// These are design parameters, not measured firearm eigenmodes or a contact solver.
export const VERSION = 'weapon-switch-contact-sol61-r3';
export const TIMING = Object.freeze({ contact: .31, seated: .40, soundEnd: .58, visualEnd: .78 });
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x=clamp(x); return x*x*(3-2*x); };
export function contactAt(age) {
  if (!Number.isFinite(age)) throw new TypeError('finite age seconds required');
  const u=(age-TIMING.contact)/(TIMING.seated-TIMING.contact);
  const active=u>=0&&u<1;
  return Object.freeze({ touching: active, closure: smooth(u), slip: active?6*u*(1-u):0,
    loading: active?.25+.75*smooth(u):0 });
}
export const KIND_MATERIALS = Object.freeze([
  { name:'HG', bodyScale:1.16, damping:1.05 },
  { name:'SMG', bodyScale:1.02, damping:1.12 },
  { name:'AR', bodyScale:.90, damping:1 },
  { name:'SR', bodyScale:.76, damping:.96 },
  { name:'TSR', bodyScale:.82, damping:1.08 }
].map(Object.freeze));
export const MODES = Object.freeze([
  { hz:330, tau:.015, gain:.30 }, { hz:740, tau:.021, gain:.22 },
  { hz:1530, tau:.027, gain:.17 }, { hz:2790, tau:.018, gain:.10 },
  { hz:4380, tau:.011, gain:.06 }, { hz:6510, tau:.007, gain:.025 }
].map(Object.freeze));
export const CONTACT_EVENTS = Object.freeze([
  Object.freeze({ id:'seam-stop', at:.40, width:.0018, force:.62 }),
  Object.freeze({ id:'opposite-face-settle', at:.406, width:.0012, force:.19 })
]);
