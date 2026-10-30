/** Local-only chat fixtures. No network calls, no Twitch impersonation. */
const USER_PATTERN = /^[A-Za-z0-9_]{2,25}$/;
export function demoChatEvent(name, text, seq = 0) {
  if (typeof name !== 'string' || !USER_PATTERN.test(name.trim())) return null;
  if (typeof text !== 'string' || text.length < 1 || text.length > 100) return null;
  const normalized = name.trim().toLowerCase();
  return {
    chatter_user_id: `local-test:${normalized}`,
    chatter_user_name: name.trim(),
    message_id: `local-test-message:${normalized}:${seq}`,
    message: { text }
  };
}

/** A repeatable named-user scenario; the regular vote parser must still validate it. */
export const DEMO_SCENARIO = Object.freeze([
  Object.freeze({ name:'void_runner', text:'!patch moon+meteor' }),
  Object.freeze({ name:'pixelwitch', text:'!patch meteor+moon' }),
  Object.freeze({ name:'orbital_7', text:'!patch hyper+magnet' }),
  Object.freeze({ name:'nightowl', text:'!patch moon+meteor' }),
  Object.freeze({ name:'starlord', text:'!patch blackout' }),
  Object.freeze({ name:'glitchkid', text:'!patch meteor+moon' })
]);
