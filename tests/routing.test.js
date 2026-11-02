import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('landing route is marketing-only and points to Codebreakers', async () => {
  const html = await read('index.html');
  assert.match(html, /href="\/duel\/"/);
  assert.match(html, /src="\/src\/landing\.js"/);
  assert.doesNotMatch(html, /src="\/src\/(?:main|engine)\.js"/);
  assert.doesNotMatch(html, /id="patch-options"/);
  assert.doesNotMatch(html, /id="chat-lab-form"/);
});

test('duel owns the active game shell and legacy play paths redirect to it', async () => {
  const html = await read('duel/index.html');
  const build = await read('scripts/build.mjs');
  const server = await read('server.mjs');
  const vercel = JSON.parse(await read('vercel.json'));
  assert.match(html, /id="fight"/);
  assert.match(html, /id="combat-shell"/);
  assert.match(html, /id="fullscreen-toggle"/);
  assert.match(html, /href="\/" class="exit-link">HOME/);
  assert.doesNotMatch(html, /href="\/play\//);
  assert.doesNotMatch(build, /cp\(new URL\('\.\.\/play/);
  assert.match(server, /pathname === '\/play' \|\| pathname === '\/play\/'/);
  assert.match(server, /Location: '\/duel\/'/);
  assert.deepEqual(vercel.redirects.map(({source,destination}) => [source,destination]), [
    ['/play','/duel/'], ['/play/','/duel/'], ['/play/index.html','/duel/']
  ]);
});
