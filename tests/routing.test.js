import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('landing route is marketing-only and points to the new raid encounter', async () => {
  const html = await read('index.html');
  assert.match(html, /href="\/duel\/"/);
  assert.match(html, /src="\/src\/landing\.js"/);
  assert.doesNotMatch(html, /src="\/src\/(?:main|engine)\.js"/);
  assert.doesNotMatch(html, /id="patch-options"/);
  assert.doesNotMatch(html, /id="chat-lab-form"/);
});

test('play route owns the arena shell and Architect controller', async () => {
  const html = await read('play/index.html');
  assert.match(html, /id="arena"/);
  assert.match(html, /id="patch-options"/);
  assert.match(html, /id="chat-lab-form"/);
  assert.match(html, /src="\/src\/play\.js"/);
  assert.match(await read('scripts/build.mjs'), /play\//);
});
