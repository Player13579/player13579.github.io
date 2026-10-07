import {
  LIFETIME_SECONDS, PROFILES, planWeaponSelectionR5, variantForSelection
} from './creative-model.mjs';

export const ABI_BYTES = 64;
export const PASS_COUNT = 3;

const fail = reason => Object.freeze({ active: false, reason, passes: PASS_COUNT, abiBytes: ABI_BYTES });

/**
 * Admit only the exact latest immutable producer receipt. `frame` must be
 * populated by the eventual registered-owner renderer callback; this module
 * deliberately does not manufacture a transform, currentness proof or GPU proof.
 */
export function admitLocalSelectionR5({ state, receipt, frame, settings = {} }) {
  if (!state || !receipt || !frame) return fail('missing-live-context');
  const variant = variantForSelection(receipt.selected);
  if (variant < 0) return fail('not-an-exact-r5-selection');

  const owner = state.localNonFirearmSelectionOwner;
  const journal = state.localWeaponSelectionReceipts;
  if (!Array.isArray(journal) || !journal.includes(receipt) ||
      state.localNonFirearmCurrentReceiptId !== receipt.id ||
      owner?.receiptId !== receipt.id || owner?.actorId !== receipt.actorId ||
      owner?.roomId !== receipt.roomId || owner?.roomGeneration !== receipt.roomGeneration ||
      state.localNonFirearmSelectedWeaponId !== receipt.selected.id) {
    return fail('producer-current-receipt-owner-mismatch');
  }
  if (receipt.type !== 'non-firearm-weapon-selection' || receipt.origin !== 'local-selection' ||
      receipt.previous?.id === receipt.selected?.id ||
      receipt.eClockRoomId !== receipt.roomId ||
      receipt.eClockRoomGeneration !== receipt.roomGeneration ||
      !Number.isSafeInteger(receipt.roomGeneration) || receipt.roomGeneration < 0 ||
      !Number.isFinite(receipt.eClockStartedAt)) {
    return fail('receipt-contract-mismatch');
  }
  if (String(state.roomSessionGeneration) !== String(receipt.roomGeneration) ||
      String(state.currentRoomId ?? frame.roomId) !== String(receipt.roomId) ||
      String(state.currentActorId ?? frame.ownerId) !== String(receipt.actorId)) {
    return fail('producer-owner-room-epoch-mismatch');
  }
  if (frame.ownerId !== receipt.actorId || frame.roomId !== receipt.roomId ||
      frame.roomGeneration !== receipt.roomGeneration ||
      frame.clockRoomId !== receipt.eClockRoomId ||
      frame.clockRoomGeneration !== receipt.eClockRoomGeneration) {
    return fail('renderer-owner-room-clock-epoch-mismatch');
  }
  if (typeof frame.currentTrustedOwnership !== 'function' ||
      frame.currentTrustedOwnership(receipt) !== true) {
    return fail('current-trusted-inventory-ownership-mismatch');
  }
  if (frame.firearmServerEmitterActive === true) {
    return fail('firearm-r4-server-emitter-owns-cue');
  }

  const exactFrame = {
    ...frame,
    currentReceipt: candidate => candidate === receipt &&
      state.localNonFirearmCurrentReceiptId === candidate.id &&
      state.localNonFirearmSelectionOwner?.receiptId === candidate.id &&
      state.localWeaponSelectionReceipts.includes(candidate) &&
      frame.currentTrustedOwnership(candidate) === true
  };
  const plan = planWeaponSelectionR5({ receipt, frame: exactFrame, settings });
  if (!plan.active) return fail(plan.reason);
  if (plan.passes !== PASS_COUNT || plan.uniforms.byteLength !== ABI_BYTES ||
      plan.uniforms.length !== 16 || plan.ageSeconds < 0 || plan.ageSeconds >= LIFETIME_SECONDS ||
      plan.causeId !== receipt.id || plan.selectedId !== receipt.selected.id) {
    return fail('sealed-r5-plan-invariant');
  }
  return Object.freeze({ active: true, reason: 'admitted-local-selection', plan,
    receipt, causeId: receipt.id, selectedId: receipt.selected.id,
    passes: PASS_COUNT, abiBytes: ABI_BYTES, lifetimeActorESeconds: LIFETIME_SECONDS });
}

/** Advance a private renderer's one-shot consume watermark after an admitted receipt. */
export function claimAdmittedReceipt(admission, consumedReceiptIds) {
  if (!admission?.active || !(consumedReceiptIds instanceof Set)) return false;
  if (consumedReceiptIds.has(admission.causeId)) return false;
  consumedReceiptIds.add(admission.causeId);
  return true;
}

export function r5DescriptorSummary(admission) {
  if (!admission?.active) return null;
  const p = PROFILES.find(x => x.id === admission.selectedId);
  return Object.freeze({ id: admission.selectedId, profile: p, ageSeconds: admission.plan.ageSeconds,
    lifetimeActorESeconds: admission.lifetimeActorESeconds, passCount: admission.passes,
    abiBytes: admission.abiBytes, origin: 'local-selection', gameplayEquipClaim: false,
    localFire: false, cast: false });
}
