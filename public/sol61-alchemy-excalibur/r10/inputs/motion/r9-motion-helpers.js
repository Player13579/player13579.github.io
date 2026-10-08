function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function objectEffectEase(value) {
  const clamped = clamp(value, 0, 1);
  return 1 - Math.pow(1 - clamped, 3);
}

function physicalMotionSignature(motionId, kind) {
  const source = `${String(kind || "action")}:${String(motionId || kind || "action")}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const unit = (shift) => ((hash >>> shift) & 255) / 255;
  return {
    lead: 0.015 + unit(0) * 0.075,
    release: 0.86 + unit(8) * 0.1,
    sway: unit(16) * 2 - 1,
    lift: unit(24) * 2 - 1,
    twist: (((hash >>> 5) & 255) / 255) * 2 - 1,
    frequency: 1 + ((hash >>> 13) & 3)
  };
}

function physicalActionFramePosition(kind, progress, motionId = kind) {
  const signature = physicalMotionSignature(motionId, kind);
  const value = clamp((progress - signature.lead) / Math.max(0.5, signature.release - signature.lead), 0, 1);
  if (kind === "attack" || kind === "slash") {
    if (value < 0.34) return objectEffectEase(value / 0.34) * 0.62;
    if (value < 0.58) return 0.62 + objectEffectEase((value - 0.34) / 0.24) * 1.38;
    return 2;
  }
  if (kind === "throw") {
    if (value < 0.4) return objectEffectEase(value / 0.4) * 0.82;
    if (value < 0.62) return 0.82 + objectEffectEase((value - 0.4) / 0.22) * 1.18;
    return 2;
  }
  if (kind === "shoot") return Math.min(2, objectEffectEase(value / 0.42) * 2);
  if (kind === "evade") return Math.sin(value * Math.PI) * 2;
  if (kind === "cast" || kind === "heal" || kind === "power" || kind === "heart-transfer") {
    const smooth = value * value * (3 - 2 * value);
    return smooth * 2;
  }
  if (kind === "reload") return (0.5 - Math.cos(value * Math.PI) * 0.5) * 2;
  if (kind === "focus" || kind === "rest") return Math.min(2, value * 1.72 + Math.sin(value * Math.PI) * 0.28);
  return objectEffectEase(value) * 2;
}

