import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const exists = async file => { try { await access(new URL(file, root)); return true; } catch { return false; } };

test('retired Architect files are absent from the active source tree', async () => {
  for (const file of [
    'play/index.html', 'src/engine.js', 'src/main.js', 'src/play.js', 'src/play.css',
    'src/progression.js', 'src/boss-art.js', 'scripts/inline.mjs', 'single-file-preview.html'
  ]) assert.equal(await exists(file), false, `${file} should not ship in the active source tree`);
});

test('fullscreen shell includes the game and audience surfaces', async () => {
  const html = await read('duel/index.html');
  const css = await read('src/duel.css');
  const js = await read('src/duel.js');
  assert.match(html, /class="combat-layout" id="combat-shell"/);
  assert.match(html, /class="broadcast-rail"/);
  assert.match(html, /class="fullscreen-toggle" id="fullscreen-toggle"/);
  assert.match(css, /#combat-shell:fullscreen/);
  assert.match(css, /aspect-ratio:16\/9/);
  assert.match(css, /\.masthead \.exit-link\{display:inline-block/);
  assert.match(js, /document\.addEventListener\('fullscreenchange'/);
});
