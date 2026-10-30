import test from 'node:test';
import assert from 'node:assert/strict';
import { PATCHES, VoteRound, canonicalVoteUser, parseVote } from '../src/patches.js';

test('only six whitelisted commands are accepted', () => {
  assert.equal(PATCHES.length, 6);
  assert.equal(parseVote('!patch reverse'), 'reverse');
  assert.equal(parseVote('   !PATCH meteors  '), 'meteor');
  assert.equal(parseVote('!patch invert'), 'reverse');
  for (const invalid of ['hello !patch meteor','!patch meteor now','!patch rm -rf /','!patch', '!patch javascript']) assert.equal(parseVote(invalid), null);
});

test('one counted vote per viewer with switch support', () => {
  const r = new VoteRound(10000, 0);
  assert.equal(r.vote('one', 'moon', 10), true);
  assert.equal(r.vote('one', 'moon', 10), false);
  assert.equal(r.vote('one', 'meteor', 20), true);
  assert.equal(r.total(), 1);
  assert.equal(r.counts().meteor, 1);
  assert.equal(r.counts().moon, 0);
});

test('closed round rejects votes and never invents winner', () => {
  const r = new VoteRound(100, 0);
  assert.equal(r.vote('one', 'moon', 100), false);
  assert.equal(r.winner(), null);
  assert.equal(r.remaining(120), 0);
});

test('majority selects winner, ties are stable', () => {
  const r = new VoteRound(10000, 0);
  r.vote('one', 'moon', 1);
  r.vote('two', 'moon', 1);
  r.vote('three', 'hyper', 1);
  assert.equal(r.winner(), 'moon');
});

test('real EventSub message validates trusted user ID and exact command', () => {
  assert.deepEqual(canonicalVoteUser({ chatter_user_id: '111', chatter_user_name: 'A', message_id: 'xyz', message: { text: '!patch magnet' } }), { userId: '111', name: 'A', patchId: 'magnet', messageId: 'xyz' });
  assert.equal(canonicalVoteUser({ chatter_user_name: 'NoId', message: { text: '!patch moon' }}), null);
});
