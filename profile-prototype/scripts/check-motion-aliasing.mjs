// Regression: compare legacy, native AA and stable sampling under subpixel motion.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { PNG } = require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const out = 'qa/motion-flicker';
await mkdir(out, { recursive: true });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  // Keep the app's animation loop out of this fixed-pose renderer experiment.
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => callback.name === 'frame' ? 0 : raf(callback);
  });
  await page.goto('http://127.0.0.1:4173/?scene=archive');
  await page.waitForFunction(() => window.rhine?.stats().ready, { timeout: 90000 });
  await page.evaluate(async () => {
    const { ArchiveScene } = await import('/src/rhine/scene.ts');
    const { reducedMotion } = await import('/src/rhine/motion-preferences.ts');
    const { qualityPresets, normalizeQuality } = await import('/src/rhine/render-quality.ts');
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;width:960px;height:540px;z-index:999999';
    document.body.append(host);
    window.probe = new ArchiveScene(host);
    // Keep this historical optics comparison independent of the lighter presets.
    window.probeBaseQuality = { ...qualityPresets.original, scale: 100, supersampling: 1, pixelRatio: 1,
      antialias: 'off', shadows: 2048, aoSamples: 32, aoResolution: 1, depthOfField: 100, transmission: 1, anisotropy: 16 };
    window.probeStableQuality = normalizeQuality({ ...window.probeBaseQuality, supersampling: 2 });
    await window.probe.load();
    window.probe.setQuality(window.probeBaseQuality);
    window.probe.setMotion(reducedMotion());
    window.probe.setMode('detail');
    for (let i = 0; i < 80; i++) window.probe.update(i / 60);
    window.probe.cameraBase = window.probe.camera.position.clone();
  });
  for (const variant of ['legacy-no-aa', 'native-aa', 'stable-optional']) {
    await page.evaluate(variant => {
      const s = window.probe;
      s.setQuality(variant === 'stable-optional' ? window.probeStableQuality : window.probeBaseQuality);
      s.resize();
      s.smaa.enabled = false;
      s.camera.near = 5;
      s.camera.updateProjectionMatrix();
      if (variant === 'legacy-no-aa') for (const target of [s.composer.renderTarget1, s.composer.renderTarget2]) {
        target.samples = 0; target.dispose();
      }
    }, variant);
    const frames = [];
    for (let i = 0; i < 8; i++) {
      await page.evaluate(i => {
        const s = window.probe;
        s.camera.position.copy(s.cameraBase);
        s.camera.position.x += i * 0.001;
        s.camera.updateMatrixWorld();
        s.renderer.shadowMap.needsUpdate = true;
        s.composer.render();
      }, i);
      const bytes = await page.screenshot();
      frames.push(PNG.sync.read(bytes));
      if (i < 2) await writeFile(`${out}/${variant}-${i}.png`, bytes);
    }
    let largeChanges = 0, variation = 0, samples = 0;
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1], b = frames[i];
      for (let j = 0; j < a.data.length; j += 4) {
        const d = Math.abs(a.data[j] - b.data[j]) + Math.abs(a.data[j + 1] - b.data[j + 1]) + Math.abs(a.data[j + 2] - b.data[j + 2]);
        if (d > 90) largeChanges++;
        variation += d; samples++;
      }
    }
    const result = { variant, largeChanges, meanVariation: variation / samples };
    results.push(result); console.log(result);
  }
  await writeFile(`${out}/diagnosis.json`, JSON.stringify(results, null, 2));
  assert.ok(results[1].largeChanges < results[0].largeChanges * 0.75,
    'Native archive rendering must reduce large subpixel edge changes by at least 25%');
  assert.ok(results[2].largeChanges <= results[1].largeChanges * 0.1,
    'Stable sampling must reduce remaining large subpixel edge changes by at least 90%');
} finally { await browser.close(); }
