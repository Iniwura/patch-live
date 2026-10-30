/**
 * Deterministic, allowlisted boss DNA.
 * Twitch chat never supplies executable code, coordinates, or raw CSS.
 * The same rules act on the streamer and the Architect, with counterplay.
 */
export const BOSS_FORMS = Object.freeze({
  PRIME: Object.freeze({ name: 'THE ARCHITECT', color: '#c8a7ff', subtitle: 'UNWRITTEN' }),
  CATACLYSM: Object.freeze({ name: 'THE CATACLYSM', color: '#ff9a70', subtitle: 'METEOR FORGED' }),
  SINGULARITY: Object.freeze({ name: 'THE SINGULARITY', color: '#a0dfff', subtitle: 'GRAVITY TORN' }),
  ECLIPSE: Object.freeze({ name: 'THE ECLIPSE', color: '#ed8ec9', subtitle: 'LIGHT CONSUMED' })
});

const ALLOWED = new Set(['reverse', 'moon', 'meteor', 'hyper', 'magnet', 'blackout']);

export function formForEffects(effects) {
  const set = new Set(effects);
  if (set.has('blackout')) return 'ECLIPSE';
  if (set.has('meteor') || set.has('hyper')) return 'CATACLYSM';
  if (set.has('reverse') || set.has('moon') || set.has('magnet')) return 'SINGULARITY';
  return 'PRIME';
}

/** Each vote leaves a permanent, visible addition to the creature. */
export function evolveArchitect(boss, recipe) {
  if (!boss || !recipe || !Array.isArray(recipe.effects)) return null;
  const effects = recipe.effects.filter(effect => ALLOWED.has(effect));
  if (!effects.length) return null;
  const all = new Set(boss.aspects || []);
  for (const effect of effects) all.add(effect);
  boss.aspects = [...all];
  boss.evolution = Math.min(3, (boss.evolution || 0) + 1);
  boss.form = formForEffects(effects);
  boss.signature = effects.join(' + ').toUpperCase();
  boss.morphPulse = 1.35;
  boss.morphCount = all.size;
  const definition = BOSS_FORMS[boss.form];
  return {
    form: boss.form,
    name: definition.name,
    color: definition.color,
    stage: boss.evolution,
    aspects: [...all],
    signature: boss.signature,
    announcement: `EVOLUTION 0${boss.evolution} // ${definition.name}`
  };
}

/**
 * Shared physical law + tactical response. Lower gravity allows higher jumps
 * and draws the boss downward into dash range; inversion lets both entities
 * occupy the ceiling; hyperdrive accelerates both and prolongs boss recovery.
 */
export function bossRuleDynamics(aspects = []) {
  const set = new Set(aspects);
  return {
    float: set.has('moon'),
    invert: set.has('reverse'),
    haste: set.has('hyper'),
    magnet: set.has('magnet'),
    meteor: set.has('meteor'),
    veil: set.has('blackout'),
    openingSeconds: set.has('hyper') ? 1.7 : set.has('moon') || set.has('magnet') ? 1.4 : 1.05,
    bonusDamage: (set.has('moon') ? 4 : 0) + (set.has('magnet') ? 4 : 0)
  };
}

/** A form changes actual attacks, not only labels or colors. */
export function pickBossAttack(boss, index) {
  const form = boss?.form || 'PRIME';
  const sequence = form === 'CATACLYSM'
    ? ['meteor', 'slam', 'beam', 'meteor']
    : form === 'SINGULARITY'
      ? ['orbit', 'beam', 'orbit', 'slam']
      : form === 'ECLIPSE'
        ? ['veil', 'orbit', 'beam', 'veil']
        : ['beam', 'slam', 'orbit'];
  return sequence[index % sequence.length];
}
