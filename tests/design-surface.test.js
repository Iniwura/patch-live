import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/landing.css',import.meta.url),'utf8');
const duel=readFileSync(new URL('../duel/index.html',import.meta.url),'utf8');

test('cinematic landing contains authentic game preview and playable CTAs',()=>{
 assert.match(html,/canvas id="landing-teaser"/);
 assert.match(html,/src\/landing\.js/);
 assert.match(html,/CHAT BUILDS/);
 assert.match(html,/THE BOSS/);
 assert.match(html,/href="\/duel\/"/);
 assert.match(html,/OFFLINE DEMO/);
 assert.match(html,/ILLUSTRATIVE COMMANDS · NOT LIVE CHAT/);
});
test('story explains the real three-wave game without false Twitch LIVE claims',()=>{
 for(const text of ['SYSTEM BREACH','FIREWALL UPRISING','FINAL COMPILATION','!power shield','!patch meteor+moon'])
  assert.ok(html.includes(text),text);
 assert.match(html,/TWITCH REQUIRES AUTHORIZATION/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('game UI preserves streamer help, chat commands, and local Streamer.bot connect',()=>{
 for(const id of ['play-btn','show-btn','raid-coach','chat-quickstart','sb-connect']) {
  const re=id==='chat-quickstart' ? /class="chat-quickstart"/ : new RegExp('id="'+id+'"');
  assert.match(duel,re);
 }
});
