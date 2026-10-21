import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const results = [];
try {
  for (const route of ['/', '/?scene=archive', '/?scene=detail']) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.shaderLinks = [];
      const original = WebGL2RenderingContext.prototype.linkProgram;
      WebGL2RenderingContext.prototype.linkProgram = function (...args) {
        window.shaderLinks.push({ time: performance.now(), ready: window.rhine?.stats().ready ?? false });
        return original.apply(this, args);
      };
    });
    await page.goto(`http://127.0.0.1:4173${route}`);
    await page.waitForFunction(() => window.rhine?.stats().ready, { timeout: 90000 });
    const readyAt = await page.evaluate(() => performance.now());
    if (await page.locator('.entry-start:visible').count()) {
      await page.locator('.entry-start').click();
      await page.waitForFunction(() => window.rhine.stats().startup === 'started' || !document.querySelector('.entry-silent').hidden);
      if (await page.evaluate(() => window.rhine.stats().startup !== 'started')) await page.locator('.entry-silent').click();
    }
    await page.waitForFunction(() => window.rhine.stats().startup === 'started');
    if (!route.includes('detail')) await page.evaluate(() => window.rhine.archive());
    const result = await page.evaluate(() => new Promise(resolve => {
      const intervals = []; let previous = performance.now();
      const start = previous;
      function tick(now) {
        intervals.push(now - previous); previous = now;
        if (now - start < 5000) requestAnimationFrame(tick);
        else resolve({ latePrograms: window.shaderLinks.filter(x => x.ready).length,
          slowFrames: intervals.filter(x => x > 100).length, maxFrame: Math.max(...intervals),
          p95Frame: [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length * .95)] });
      }
      requestAnimationFrame(tick);
    }));
    await page.mouse.move(600, 400);
    if (!route.includes('detail')) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(1200);
      await page.evaluate(() => window.rhine.detail());
      await page.waitForTimeout(3500);
      result.interactionPrograms = await page.evaluate(() => window.shaderLinks.filter(x => x.ready).length);
    }
    if (route === '/?scene=archive') {
      await page.locator('[data-action="settings"]').click();
      await page.locator('[data-preset="reduced"]').click();
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.rhine.archive());
      await page.mouse.move(1, 1);
      await page.waitForTimeout(2500);
      const clip = { x: 200, y: 200, width: 600, height: 400 };
      const first = await page.screenshot({ clip });
      await page.waitForTimeout(250);
      const second = await page.screenshot({ clip });
      result.staticFramesIdentical = first.equals(second);
      assert.equal(result.staticFramesIdentical, true, 'A settled archive must not flicker between frames');
      await page.locator('[data-action="settings"]').click();
      await page.locator('.quality-advanced').evaluate(node => { node.open = true; });
      const sampling = page.locator('[data-quality="supersampling"]');
      assert.equal(await sampling.inputValue(), '1');
      await sampling.selectOption('1.5');
      const metrics = await page.locator('#three-scene').evaluate(node => JSON.parse(node.dataset.renderQuality));
      assert.equal(metrics.supersampling, 1.5);
      assert.ok(metrics.width * metrics.height <= 8_294_400);
      await page.reload();
      await page.waitForFunction(() => window.rhine?.stats().ready, { timeout: 90000 });
      assert.equal(await page.locator('#three-scene').evaluate(node => JSON.parse(node.dataset.renderQuality).supersampling), 1.5);
      result.stableSamplingSettingPersists = true;
    }
    console.log(route, { readyAt, ...result });
    results.push({ route, readyAt, ...result, errors });
    await page.close();
    assert.equal(result.latePrograms, 0, 'Visible archive must not compile new shader programs');
    assert.equal(result.interactionPrograms ?? 0, 0, 'Scrolling and opening must reuse prepared programs');
    assert.equal(result.slowFrames, 0, 'Archive startup must not stall for >100ms');
    assert.deepEqual(errors, []);
  }
  await mkdir('qa/startup', { recursive: true });
  await writeFile('qa/startup/checks.json', JSON.stringify({ passed: true, results }, null, 2));
} finally { await browser.close(); }
