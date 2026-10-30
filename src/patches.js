/** PATCH//LIVE bounded rule compiler.
 *  Chat supplies recipe identifiers, never code, expressions or arbitrary values.
 *  Each recipe is canonical, reversible and capped at two compatible effects.
 */
export const PATCHES = [
  { id: 'reverse', label: 'REVERSE GRAVITY', short: 'REVERSE', icon: '↟', className: 'violet', description: 'The world turns upside down', command: '!patch reverse' },
  { id: 'meteor', label: 'METEOR STORM', short: 'METEOR', icon: '✳', className: 'orange', description: 'A storm tears across the arena', command: '!patch meteor' },
  { id: 'moon', label: 'MOON PHYSICS', short: 'MOON', icon: '◌', className: 'blue', description: 'Every jump becomes a leap', command: '!patch moon' },
  { id: 'hyper', label: 'HYPERDRIVE', short: 'HYPER', icon: '⤳', className: 'pink', description: 'Every movement is amplified', command: '!patch hyper' },
  { id: 'magnet', label: 'MAGNETIC FIELD', short: 'MAGNET', icon: '◎', className: 'lime', description: 'Collectibles pull toward you', command: '!patch magnet' },
  { id: 'blackout', label: 'BLACKOUT', short: 'BLACKOUT', icon: '◒', className: 'grey', description: 'Find your way in the dark', command: '!patch blackout' }
];

const ALIASES = { invert: 'reverse', gravity: 'reverse', meteors: 'meteor', lowgrav: 'moon', speed: 'hyper', magnetic: 'magnet', dark: 'blackout' };
const LOOKUP = new Map(PATCHES.map((item, index) => [item.id, { ...item, index }]));
const RECIPE = /^[a-z-]+(?:\s*\+\s*[a-z-]+)?$/i;
const INCOMPATIBLE = new Set(['moon+reverse']);

/** Compiles only a strict one- or two-effect recipe. No eval or arbitrary instructions. */
export function compilePatch(input) {
  if (typeof input !== 'string' || input.length > 64 || !RECIPE.test(input.trim())) return null;
  const ids = input.trim().toLowerCase().split(/\s*\+\s*/).map(id => ALIASES[id] || id);
  if (ids.length > 2 || new Set(ids).size !== ids.length || ids.some(id => !LOOKUP.has(id))) return null;
  ids.sort((a, b) => LOOKUP.get(a).index - LOOKUP.get(b).index);
  const id = ids.join('+');
  // The two gravity regimes cannot run in the same frame.
  if (INCOMPATIBLE.has([...ids].sort().join('+'))) return null;
  const parts = ids.map(key => LOOKUP.get(key));
  const single = parts.length === 1;
  return Object.freeze({
    id,
    effects: Object.freeze([...ids]),
    label: single ? parts[0].label : parts.map(p => p.short).join(' + '),
    short: parts.map(p => p.short).join(' + '),
    icon: single ? parts[0].icon : '✳',
    className: single ? parts[0].className : 'violet',
    description: single ? parts[0].description : `COMPOUND RULE: ${parts.map(p => p.short).join(' / ')}`,
    compounded: !single
  });
}

export function parseVote(message) {
  if (typeof message !== 'string' || message.length > 100) return null;
  const match = /^\s*!patch\s+(.+?)\s*$/i.exec(message);
  return match ? compilePatch(match[1])?.id || null : null;
}

export class VoteRound {
  constructor(durationMs = 25000, now = Date.now()) {
    this.durationMs = durationMs;
    this.startedAt = now;
    this.endsAt = now + durationMs;
    this.votes = new Map();
    this.names = new Map();
  }

  vote(userId, patchId, now = Date.now(), displayName = '') {
    const recipe = compilePatch(patchId);
    if (!userId || !recipe || now >= this.endsAt || now < this.startedAt) return false;
    if (this.votes.get(userId) === recipe.id) return false;
    this.votes.set(userId, recipe.id);
    if (displayName) this.names.set(userId, String(displayName).slice(0, 32));
    return true;
  }

  counts() {
    const result = Object.fromEntries(PATCHES.map(p => [p.id, 0]));
    for (const id of this.votes.values()) result[id] = (result[id] || 0) + 1;
    return result;
  }

  winner() {
    const counts = this.counts();
    return Object.entries(counts).filter(([, count]) => count > 0)
      .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))[0]?.[0] || null;
  }

  credits(recipeId) {
    return [...this.votes].filter(([, id]) => id === recipeId)
      .map(([userId]) => this.names.get(userId)).filter(Boolean).slice(0, 3);
  }

  remaining(now = Date.now()) { return Math.max(0, Math.ceil((this.endsAt - now) / 1000)); }
  total() { return this.votes.size; }
}

export function canonicalVoteUser(event) {
  if (!event || !event.chatter_user_id || typeof event.message?.text !== 'string') return null;
  const patchId = parseVote(event.message.text);
  return patchId ? {
    userId: String(event.chatter_user_id),
    name: String(event.chatter_user_name || event.chatter_user_login || 'Viewer').slice(0, 32),
    patchId,
    messageId: event.message_id
  } : null;
}
