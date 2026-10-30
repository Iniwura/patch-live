import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTS, GOAL_CORES, actForScore, progressPercent, runGrade } from '../src/progression.js';
import { demoChatEvent, DEMO_SCENARIO } from '../src/demo.js';
import { canonicalVoteUser, VoteRound } from '../src/patches.js';
import { ArenaEngine } from '../src/engine.js';

test('three acts have deterministic thresholds and increasing difficulty', () => {
  assert.equal(GOAL_CORES,12);
  assert.deepEqual([0,3,4,7,8,12].map(s=>actForScore(s).number),[1,1,2,2,3,3]);
  assert.ok(ACTS[0].speed < ACTS[1].speed && ACTS[1].speed < ACTS[2].speed);
  assert.equal(progressPercent(-3),0);
  assert.equal(progressPercent(6),50);
  assert.equal(progressPercent(20),100);
  assert.equal(runGrade(true,75,90),'S');
  assert.equal(runGrade(false,100,12),'INCOMPLETE');
});

test('act transitions occur once, increase hazards, and reset for the next run', () => {
  const transitions=[];
  const e=Object.create(ArenaEngine.prototype);
  e.onUpdate=()=>{};e.onAct=a=>transitions.push(a.name);e.onEnd=()=>{};
  e.reset();
  assert.equal(e.hazards.length,2);
  e.score=4;assert.equal(e.advanceAct(),true);
  assert.equal(e.advanceAct(),false);
  assert.equal(e.hazards.length,3);
  e.score=8;assert.equal(e.advanceAct(),true);
  assert.equal(e.hazards.length,4);
  assert.deepEqual(transitions,['FRACTURE','COLLAPSE']);
  assert.equal(e.snapshot().progress,67);
  e.reset();assert.equal(e.act.number,1);assert.equal(e.hazards.length,2);
});

test('local lab messages pass the exact Twitch parser and are one-per-named-viewer',()=>{
  const round=new VoteRound(25000,100);
  const first=demoChatEvent('viewer_01','!patch moon+meteor',1);
  const second=demoChatEvent('viewer_01','!patch reverse',2);
  const changed=demoChatEvent('viewer_01','!patch moon+meteor',3);
  assert.equal(canonicalVoteUser(first).patchId,'meteor+moon');
  assert.equal(round.vote(canonicalVoteUser(first).userId,'meteor+moon',101,'viewer_01'),true);
  assert.equal(round.vote(canonicalVoteUser(second).userId,'reverse',102,'viewer_01'),true);
  assert.equal(round.vote(canonicalVoteUser(changed).userId,'meteor+moon',103,'viewer_01'),true);
  assert.equal(round.total(),1);
  assert.equal(round.counts()['meteor+moon'],1);
  assert.equal(demoChatEvent('<script>','!patch moon'),null);
  assert.equal(canonicalVoteUser(demoChatEvent('legit','!patch hello\n!patch moon')),null);
});

test('scenario produces a real vote tally only through the strict parser',()=>{
  const round=new VoteRound(25000,100);
  for(const item of DEMO_SCENARIO){
    const parsed=canonicalVoteUser(demoChatEvent(item.name,item.text));
    assert.ok(parsed);
    assert.equal(round.vote(parsed.userId,parsed.patchId,101,parsed.name),true);
  }
  assert.equal(round.total(),6);
  assert.equal(round.winner(),'meteor+moon');
  assert.equal(round.counts()['meteor+moon'],4);
  assert.equal(round.counts()['hyper+magnet'],1);
});
