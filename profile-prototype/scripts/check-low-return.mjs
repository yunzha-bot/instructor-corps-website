import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const out = 'qa/low-return'; await mkdir(out, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://127.0.0.1:4173/?scene=archive');
  await page.waitForFunction(() => window.rhine?.stats().ready, { timeout: 90000 });
  await page.waitForTimeout(1800);
  await page.mouse.move(1550, 850);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(300); }
  await page.screenshot({ path: `${out}/real-wheel.png` });
  const wheel = await page.evaluate(() => window.rhine.stats());
  assert.equal(wheel.superPerformance, true);
  assert.ok(wheel.returningFiles > 0, 'Exercise the return interval after real wheel input');
  const result = await page.evaluate(async () => {
    const { ArchiveScene } = await import('/src/rhine/scene.ts');
    const { qualityPresets } = await import('/src/rhine/render-quality.ts');
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset:0;z-index:999999'; document.body.append(host);
    const s = new ArchiveScene(host); await s.load(); s.setSuperPerformance(true); s.setQuality(qualityPresets.performance); s.setMode('archive');
    for (let i = 0; i < 180; i++) s.update(i / 60);
    s.select(1); s.update(3.016);
    window.returnProbe = s;
    const old = s.outgoing[0];
    return {
      shadows: s.renderer.shadowMap.enabled, returning: s.outgoing.length,
      fullCopiesVisible: s.outgoing.filter(o => o.group.visible).length,
      oldCellInBatch: s.drawnCells.some(cell => cell.lane === old.cell.lane && cell.row === old.cell.row),
    };
  });
  console.log(result);
  await page.screenshot({ path: `${out}/return-pose.png` });
  await writeFile(`${out}/checks.json`, JSON.stringify(result, null, 2));
  assert.equal(result.shadows, false);
  assert.equal(result.returning, 1);
  assert.equal(result.fullCopiesVisible, 0, 'Low quality must not draw returning files with full optical materials');
  assert.equal(result.oldCellInBatch, true, 'Returning files must use the same cheap batch as their neighbours');
  const continuous = await page.evaluate(() => {
    const s = window.returnProbe;
    let fullSelectedFrames = 0, missingSelectedFrames = 0;
    for (let frame = 0; frame < 120; frame++) {
      if (frame % 10 === 0) s.select((frame / 10 + 2) % 8);
      s.update(3.033 + frame / 60);
      if (s.model.visible) fullSelectedFrames++;
      if (!s.drawnCells.some(cell => cell.lane === s.selectedCell.lane && cell.row === s.selectedCell.row)) missingSelectedFrames++;
    }
    return { fullSelectedFrames, missingSelectedFrames, activePulses: s.pulses.length };
  });
  console.log({ continuous });
  assert.equal(continuous.fullSelectedFrames, 0, 'Incoming selected files must not flash full optical materials during low-quality browsing');
  assert.equal(continuous.missingSelectedFrames, 0, 'Selected files remain physically present in the low-cost batch');
  assert.equal(continuous.activePulses, 0, 'Low-quality continuous browsing must not stack background wave fronts');
  const phases = await page.evaluate(() => {
    const s = window.returnProbe, old = s.outgoing[0];
    const index = s.drawnCells.findIndex(cell => cell.lane === old.cell.lane && cell.row === old.cell.row);
    const offset = index * 16;
    const attr = s.instances[0].instanceMatrix;
    const matrix = Array.from(attr.array.slice(offset, offset + 16));
    let matrixError = 0;
    old.group.updateMatrix();
    matrix.forEach((value, i) => { matrixError = Math.max(matrixError, Math.abs(value - old.group.matrix.elements[i])); });
    const time = s.clock;
    s.setSuperPerformance(false); s.update(time + .017);
    const highRestoresCopy = old.group.visible;
    s.setSuperPerformance(true); s.update(time + .034);
    const lowHidesCopyAgain = !old.group.visible;
    for (let i = 1; i <= 420; i++) s.update(time + .034 + i / 60);
    const returnsComplete = s.outgoing.length === 0;
    s.setMode('detail'); s.update(time + 7.051);
    const detailModelVisible = s.model.visible;
    return { matrixError, highRestoresCopy, lowHidesCopyAgain, returnsComplete, detailModelVisible };
  });
  assert.ok(phases.matrixError < 0.0001, 'Cheap return keeps the original physical pose');
  assert.equal(phases.highRestoresCopy, true);
  assert.equal(phases.lowHidesCopyAgain, true);
  assert.equal(phases.returnsComplete, true);
  assert.equal(phases.detailModelVisible, true, 'Opening details restores the full model');
  await writeFile(`${out}/checks.json`, JSON.stringify({ passed: true, result, continuous, phases }, null, 2));
} finally { await browser.close(); }
