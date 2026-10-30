import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaEngine } from '../src/engine.js';

function makeEngine() {
  const engine = Object.create(ArenaEngine.prototype);
  engine.keys = new Set();
  engine.onUpdate = () => {};
  engine.onEnd = () => {};
  engine.onAct = () => {};
  engine.onPatch = () => {};
  engine.reset();
  engine.playing = true;
  return engine;
}

test('jump buffering and coyote time preserve a late jump window', () => {
  const engine = makeEngine();
  engine.player.grounded = false;
  engine.coyote = .1;
  engine.onKeyDown(' ');
  engine.update(1 / 60);
  assert.ok(engine.player.vy < -400, 'buffered jump should fire during coyote time');
  assert.equal(engine.jumpBuffer, 0);
});

test('pause clears input and freezes elapsed gameplay time', () => {
  const engine = makeEngine();
  engine.onKeyDown('d');
  assert.equal(engine.pause('streamer'), true);
  const elapsed = engine.elapsed;
  assert.equal(engine.keys.size, 0);
  engine.update(.5);
  assert.equal(engine.elapsed, elapsed);
  assert.equal(engine.resume(), true);
  engine.update(1 / 60);
  assert.ok(engine.elapsed > elapsed);
});

test('guided offline run reaches all acts and completes without live services', () => {
  const engine = makeEngine();
  engine.guided = true;
  for (let frame = 0; frame < 90 * 60 && engine.playing; frame++) {
    if (frame === 60) engine.applyPatch('meteor+moon');
    engine.update(1 / 60);
  }
  assert.equal(engine.finished, true);
  assert.equal(engine.lastOutcome.won, true);
  assert.equal(engine.score, 12);
  assert.equal(engine.act.number, 3);
  assert.equal(engine.finalPhase, true);
  assert.equal(engine.boss.health, 0);
  assert.equal(engine.patchHistory[0].trace, 'low-gravity rings · meteor scars');
  assert.ok(engine.elapsed >= 40 && engine.elapsed <= 90);
});
