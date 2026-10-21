import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const out = 'qa/quality-tiers';
await mkdir(out, { recursive: true });
const results = [], errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    if (!localStorage.getItem('quality-migration-test')) {
      localStorage.setItem('rhine-settings', JSON.stringify({ sound: false, music: false, renderingVersion: 3,
        rendering: { scale: 100, supersampling: 2, pixelRatio: 1.5, antialias: 'off', shadows: 2048, aoSamples: 32, aoResolution: 1, depthOfField: 100, transmission: 1, anisotropy: 16 } }));
      localStorage.setItem('quality-migration-test', 'done');
    }
  });
  await page.goto('http://127.0.0.1:4173/?scene=archive');
  await page.waitForFunction(() => window.rhine?.stats().ready, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.rhine.stats().superPerformance), true);
  await page.locator('[data-action="settings"]').click();
  assert.equal(await page.locator('#quality-preset').getAttribute('type'), 'range');
  assert.equal(await page.locator('#quality-preset').inputValue(), '0');
  const before = await page.locator('#three-scene').getAttribute('data-render-quality');
  await page.locator('#quality-preset').evaluate(slider => {
    for (const value of ['1', '2', '3']) {
      slider.value = value; slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  assert.equal(await page.locator('#three-scene').getAttribute('data-render-quality'), before, 'Dragging must not reallocate GPU buffers');
  const budgets = [921600, 1440000, 2073600, 3686400];
  for (const [index, label] of ['低', '中', '高', '极高'].entries()) {
    await page.locator(`[data-quality-tier="${index}"]`).click();
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('#quality-tier-value').textContent(), label);
    const metrics = await page.locator('#three-scene').evaluate(node => JSON.parse(node.dataset.renderQuality));
    assert.equal(metrics.pixelBudget, budgets[index]);
    assert.ok(metrics.width * metrics.height <= budgets[index]);
    assert.equal(await page.evaluate(() => window.rhine.stats().superPerformance), index === 0);
    await page.keyboard.press('Escape');
    await page.mouse.move(600, 400);
    await page.mouse.wheel(0, 120);
    const timing = await page.evaluate(() => new Promise(resolve => {
      const frames = []; let previous = performance.now(); const start = previous;
      function tick(now) { frames.push(now - previous); previous = now;
        if (now - start < 1500) requestAnimationFrame(tick);
        else resolve({ frames: frames.length, meanFrame: frames.reduce((a, b) => a + b, 0) / frames.length }); }
      requestAnimationFrame(tick);
    }));
    results.push({ label, metrics, timing });
    await page.locator('[data-action="settings"]').click();
    if (index === 0) {
      await page.waitForTimeout(650);
      await page.screenshot({ path: `${out}/desktop-settings.png` });
    }
  }
  await page.locator('#quality-preset').focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#quality-tier-value').textContent(), '中');
  await page.reload();
  await page.waitForFunction(() => window.rhine?.stats().ready, { timeout: 90000 });
  await page.waitForFunction(() => !document.querySelector('#loading'));
  await page.locator('[data-action="settings"]').click();
  assert.equal(await page.locator('#quality-preset').inputValue(), '1', 'Selected tier persists after reload');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${out}/mobile-settings.png` });
  assert.equal(await page.locator('[data-quality-tier]').count(), 4);
  assert.deepEqual(errors, []);
  await writeFile(`${out}/checks.json`, JSON.stringify({ passed: true, results, errors,
    checks: ['heavy preferences migrate to low', 'four real GPU budgets', 'no reallocation while dragging', 'buttons and keyboard work', 'reload persistence', 'mobile settings'] }, null, 2));
  console.log(JSON.stringify({ passed: true, results, errors }, null, 2));
} finally { await browser.close(); }
