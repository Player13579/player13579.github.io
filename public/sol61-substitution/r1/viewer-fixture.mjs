export const FIXTURE_NAMES = Object.freeze([
  "grant-self", "grant-target", "grant-hidden-recipient", "trigger-both",
  "trigger-origin-only", "trigger-destination-only", "all-hidden"
]);

const actor = (footX, footY) => ({ authorized: true, visible: true, current: true, registered: true, footX, footY, actorHeightPx: 64 });
const hidden = () => {
  const p = { authorized: false, visible: false, current: true, registered: true };
  for (const key of ["footX", "footY", "actorHeightPx"]) {
    Object.defineProperty(p, key, { enumerable: true, get() { throw new Error("hidden " + key + " accessed"); } });
  }
  return p;
};

export function fixture(name, requestedKind = name.startsWith("grant") ? "grant" : "trigger") {
  const a = actor(240, 300), b = actor(520, 300), no = hidden();
  const sourceVisible = name !== "all-hidden" && name !== "trigger-destination-only";
  const optionalVisible = name === "grant-self" || name === "grant-target" || name === "trigger-both" || name === "trigger-destination-only";
  const roles = requestedKind === "grant"
    ? [sourceVisible ? a : no, optionalVisible ? (name === "grant-self" ? a : b) : no, null, null]
    : [null, null, sourceVisible ? a : no, optionalVisible ? b : no];
  return Object.freeze({
    kind: requestedKind, fixture: name, viewportPx: Object.freeze([800, 440]), dpr: 1, zoom: 1,
    roles: Object.freeze(roles),
    roleIds: Object.freeze(["caster-fixture", "recipient-fixture", "origin-fixture", "destination-fixture"])
  });
}

function f32(value) {
  if (!Number.isFinite(value)) return null;
  const result = Math.fround(value);
  return Number.isFinite(result) ? result : null;
}

export function sanitizeProjection(projection) {
  if (projection == null || projection.authorized !== true || projection.visible !== true ||
      projection.current !== true || projection.registered !== true) return null;
  const footX = f32(projection.footX), footY = f32(projection.footY), actorHeightPx = f32(projection.actorHeightPx);
  if (footX === null || footY === null || actorHeightPx === null || actorHeightPx <= 0) return null;
  return Object.freeze({ authorized: true, visible: true, current: true, registered: true, footX, footY, actorHeightPx });
}

export function sanitizeFixture(input) {
  if (input === null || typeof input !== "object") throw new TypeError("fixture must be an object");
  if (input.kind !== "grant" && input.kind !== "trigger") throw new TypeError("invalid fixture kind");
  if (typeof input.fixture !== "string") throw new TypeError("invalid fixture name");
  if (!Array.isArray(input.roles) || input.roles.length !== 4) throw new TypeError("fixture must have four roles");
  if (!Array.isArray(input.viewportPx) || input.viewportPx.length !== 2) throw new TypeError("invalid viewport");
  const width = f32(input.viewportPx[0]), height = f32(input.viewportPx[1]);
  if (width === null || height === null || width <= 0 || height <= 0) throw new TypeError("invalid viewport dimensions");
  const roles = input.roles.map(role => role == null ? null : sanitizeProjection(role));
  return Object.freeze({
    kind: input.kind, fixture: input.fixture, viewportPx: Object.freeze([width, height]), roles: Object.freeze(roles)
  });
}
