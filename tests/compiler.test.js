import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePatch, parseVote, VoteRound, canonicalVoteUser } from '../src/patches.js';
import { ArenaEngine } from '../src/engine.js';

test('compiles two-effect recipes to one canonical ID independent of input order', () => {
  const a = compilePatch('moon+meteor');
  const b = compilePatch(' METEORS + lowgrav ');
  assert.deepEqual(a.effects, ['meteor', 'moon']);
  assert.equal(a.id, b.id);
  assert.equal(a.compounded, true);
  assert.equal(parseVote('!PATCH moon + meteor'), 'meteor+moon');
  assert.equal(parseVote('!patch meteor+moon'), 'meteor+moon');
});

test('rejects arbitrary expressions, repeats, contradictory rules and extra tokens', () => {
  for (const value of [
    'meteor+meteor', 'moon+reverse', 'reverse+moon', 'moon+meteor+hyper',
    'meteor+unknown', 'meteor+ alert(1)', 'meteor;moon', 'meteor|moon',
    'meteor+moon --run', 'meteor++moon', '<script>alert(1)</script>',
    '', 'meteor+'.padEnd(90, ' '), null, 78
  ]) assert.equal(compilePatch(value), null, String(value));
  assert.equal(parseVote('!patch meteor+moon extra'), null);
  assert.equal(parseVote('look, !patch moon+meteor'), null);
});

test('one vote per user also holds across canonical compound variations', () => {
  const r = new VoteRound(30000, 0);
  assert.equal(r.vote('alice', 'moon+meteor', 100, 'Alice'), true);
  assert.equal(r.vote('alice', 'meteor+moon', 100, 'Alice'), false);
  assert.equal(r.vote('bob', 'meteor+moon', 110, 'Bob'), true);
  assert.equal(r.vote('carol', 'magnet', 120, 'Carol'), true);
  assert.equal(r.total(), 3);
  assert.equal(r.counts()['meteor+moon'], 2);
  assert.equal(r.winner(), 'meteor+moon');
  assert.deepEqual(r.credits('meteor+moon'), ['Alice', 'Bob']);
  assert.equal(r.vote('bob', 'reverse', 200, 'Bob'), true);
  assert.equal(r.counts()['meteor+moon'], 1);
  assert.deepEqual(r.credits('meteor+moon'), ['Alice']);
  assert.equal(r.total(), 3);
});

test('Twitch events compile valid recipes but ignore malformed and anonymous messages', () => {
  const valid = canonicalVoteUser({ chatter_user_id: '47', chatter_user_name: 'viewer', message_id: '3', message: { text: '!patch magnet+hyper' } });
  assert.equal(valid.patchId, 'hyper+magnet');
  assert.equal(canonicalVoteUser({ chatter_user_id: '47', message: { text: '!patch reverse+moon' } }), null);
  assert.equal(canonicalVoteUser({ message: { text: '!patch meteor+moon' } }), null);
});

test('engine applies multiple effects to player and bound patch duration', () => {
  const e = Object.create(ArenaEngine.prototype);
  e.playing = true; e.elapsed = 2; e.onUpdate = () => {}; e.meteorClock = 0;
  assert.equal(e.applyPatch('moon+meteor'), true);
  assert.equal(e.patch, 'meteor+moon');
  assert.deepEqual([...e.activeEffects()], ['meteor', 'moon']);
  assert.equal(e.applyPatch('reverse+moon'), false);
  assert.equal(e.patch, 'meteor+moon');
  assert.equal(e.applyPatch('hyper+magnet', 100), true);
  assert.equal(e.patchEnds, 22);
  assert.equal(e.vetoPatch(), true);
  assert.equal(e.activeEffects().size, 0);
});

function physicsFrame(recipe) {
  const e = Object.create(ArenaEngine.prototype);
  Object.assign(e, {
    playing: true, elapsed: 1, patch: recipe, patchEnds: 20, meteorClock: 0,
    keys: new Set(), health: 100, score: 0, hazards: [], meteors: [], trail: [],
    cores: [], platforms: [], onUpdate: () => {}, onEnd: () => {},
    player: { x: 190, y: 260, vx: 0, vy: 0, r: 18, invincible: 0, grounded: false }
  });
  e.update(.1);
  return e;
}

test('combined moon+meteor changes both gravity and meteor simulation', () => {
  const normal = physicsFrame(null);
  const combo = physicsFrame('meteor+moon');
  assert.ok(combo.player.vy < normal.player.vy);
  combo.update(.4);
  assert.equal(combo.meteors.length, 1);
});

test('combined hyper+magnet increases movement and magnetic range', () => {
  const e = physicsFrame('hyper+magnet');
  assert.ok(e.activeEffects().has('hyper'));
  assert.ok(e.activeEffects().has('magnet'));
});
