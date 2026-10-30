/** Deterministic three-act progression. The audience controls rules, not level safety. */
export const GOAL_CORES = 12;

export const ACTS = Object.freeze([
  Object.freeze({ id:'ignition', number:1, name:'IGNITION', subtitle:'LEARN THE LAWS', threshold:0, hazards:2, speed:1, sky:'#15112a', accent:'#b68eff' }),
  Object.freeze({ id:'fracture', number:2, name:'FRACTURE', subtitle:'THE FLOOR IS LYING', threshold:4, hazards:3, speed:1.18, sky:'#20132d', accent:'#ff8ed0' }),
  Object.freeze({ id:'collapse', number:3, name:'COLLAPSE', subtitle:'REALITY UNRAVELS', threshold:8, hazards:4, speed:1.4, sky:'#271222', accent:'#ffb488' })
]);

export function actForScore(score) {
  if (!Number.isFinite(score)) return ACTS[0];
  return ACTS[score >= 8 ? 2 : score >= 4 ? 1 : 0];
}

export function progressPercent(score) {
  return Math.max(0, Math.min(100, Math.round((score / GOAL_CORES) * 100)));
}

/** Visible outcome grade is based on concrete run performance, not simulated viewers. */
export function runGrade(won, health, seconds) {
  if (!won) return 'INCOMPLETE';
  if (health >= 70 && seconds <= 100) return 'S';
  if (health >= 45 && seconds <= 160) return 'A';
  return 'B';
}
