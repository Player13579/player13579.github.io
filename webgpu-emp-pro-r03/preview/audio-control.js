/** Enable preview audio only from an explicit user gesture; verification stays silent. */
export async function unlockAudioFromGesture(fx, verifyMode) {
  if (!fx || verifyMode) return false;
  await fx.enableAudio();
  return true;
}
