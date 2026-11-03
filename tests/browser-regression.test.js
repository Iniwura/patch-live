import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const playwright = await import('playwright').catch(() => null);
const browserTest = playwright
  ? test
  : (name, _fn) => test(name, { skip: 'Playwright package is unavailable in this environment' }, () => {});
const port = 4175;
const baseUrl = `http://127.0.0.1:${port}`;
const viewports = [
  { name: '1920x1080 desktop', width: 1920, height: 1080 },
  { name: '1440x900 desktop', width: 1440, height: 900 },
  { name: '1024x768 desktop', width: 1024, height: 768 },
  { name: '900x700 compact desktop', width: 900, height: 700 },
  { name: '390x844 mobile', width: 390, height: 844 },
  { name: '320x680 mobile', width: 320, height: 680 },
];

async function startPreview() {
  const server = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/duel/`);
      if (response.ok) return server;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  server.kill('SIGTERM');
  throw new Error('local preview did not become ready');
}

function overlaps(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

browserTest('fullscreen geometry, proportions, Escape and mobile Home regressions', async t => {
  let server;
  try {
    server = await startPreview();
    let browser;
    try {
      browser = await playwright.chromium.launch({ headless: true });
    } catch (error) {
      t.skip(`Chromium is unavailable: ${error.message}`);
      return;
    }
    try {
      const page = await browser.newPage();
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`${baseUrl}/duel/`, { waitUntil: 'domcontentloaded' });
        const supported = await page.evaluate(() => document.fullscreenEnabled && typeof document.querySelector('#combat-shell')?.requestFullscreen === 'function');
        if (!supported) {
          t.skip(`Fullscreen API is unavailable at ${viewport.name}`);
          return;
        }
        await page.click('#play-btn');
        await page.click('#fullscreen-toggle');
        await page.waitForFunction(() => document.fullscreenElement?.id === 'combat-shell');
        await page.waitForTimeout(300);
        const geometry = await page.evaluate(() => {
          const box = selector => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
          };
          const home = document.querySelector('.exit-link');
          const homeRect = home.getBoundingClientRect();
          return {
            shell: box('#combat-shell'),
            stage: box('.stage'),
            rail: box('.broadcast-rail'),
            canvas: box('.canvas-outer'),
            touch: box('.touch-controls'),
            home: { display: getComputedStyle(home).display, left: homeRect.left, right: homeRect.right, width: homeRect.width },
            ratio: document.querySelector('#fight').getBoundingClientRect().width / document.querySelector('#fight').getBoundingClientRect().height,
          };
        });
        assert.notEqual(geometry.home.display, 'none', `${viewport.name}: Home must remain visible`);
        assert.ok(geometry.home.width > 0 && geometry.home.left >= 0 && geometry.home.right <= viewport.width + 1, `${viewport.name}: Home must fit the header`);
        assert.ok(Math.abs(geometry.ratio - 16 / 9) < 0.02, `${viewport.name}: game canvas must stay 16:9`);
        assert.ok(!overlaps(geometry.stage, geometry.rail), `${viewport.name}: stage and audience rail overlap`);
        assert.ok(geometry.canvas.bottom <= geometry.stage.bottom + 1, `${viewport.name}: canvas escapes stage`);
        if (viewport.width <= 650) {
          assert.ok(geometry.touch.height > 0, `${viewport.name}: touch controls are missing`);
          assert.ok(geometry.touch.bottom <= geometry.stage.bottom + 1, `${viewport.name}: touch controls escape stage`);
          assert.ok(geometry.stage.bottom <= geometry.rail.top + 1, `${viewport.name}: audience rail overlaps stage`);
        }
        await page.click('#fullscreen-toggle');
        await page.waitForFunction(() => document.fullscreenElement === null);
        await page.click('#fullscreen-toggle');
        await page.waitForFunction(() => document.fullscreenElement?.id === 'combat-shell');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.fullscreenElement === null);
      }
    } finally {
      await browser.close();
    }
  } finally {
    server?.kill('SIGTERM');
  }
});
