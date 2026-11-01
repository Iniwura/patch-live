const NON_GAME_TARGETS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']);

/** Keep keyboard gameplay from stealing focus-based UI interactions. */
export function shouldCaptureGameKey(activeElement) {
  if (!activeElement) return true;
  const tagName = String(activeElement.tagName || '').toUpperCase();
  return !NON_GAME_TARGETS.has(tagName) && !activeElement.isContentEditable;
}
