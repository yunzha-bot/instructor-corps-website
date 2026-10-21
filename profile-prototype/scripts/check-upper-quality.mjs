import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const out = 'qa/upper-quality'; await mkdir(out, { recursive: true });
const errors = [], results = [];
try {
 const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
 page.on('pageerror', e => errors.push(e.message));
 page.on('console', m => { if(m.type()==='error')errors.push(m.text()); });
 await page.goto('http://127.0.0.1:4173/?scene=archive');
 await page.waitForFunction(() => window.rhine?.stats().ready, { timeout:90000 });
 for(const [index,name] of [[1,'medium'],[2,'high'],[3,'ultra']]) {
  await page.locator('[data-action="settings"]').click();
  await page.locator(`[data-quality-tier="${index}"]`).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1600);
  const initial = await page.evaluate(() => window.rhine.stats());
  await page.mouse.move(600,400);
  for(let i=0;i<12;i++){ await page.mouse.wheel(0,80); await page.waitForTimeout(60); }
  await page.waitForTimeout(1000);
  const wheel = await page.evaluate(() => window.rhine.stats());
  console.log(name, {initial:initial.selectedCell,after:wheel.selectedCell,mode:wheel.mode,track:wheel.wheelTrack});
  assert.ok(wheel.selectedCell.row > initial.selectedCell.row, `${name}: continuous wheel advances the physical row`);
  await page.screenshot({path:`${out}/${name}-archive.png`});
  await page.locator('[data-action="open"]').first().click();
  await page.waitForFunction(() => window.rhine.stats().canInspect, {timeout:25000});
  const before = await page.evaluate(() => window.rhine.stats());
  const x=Math.max(80,Math.min(650,(before.topLeft[0]+before.topRight[0])/2));
  const y=Math.max(250,Math.min(600,before.topLeft[1]+180));
  await page.mouse.move(x,y); await page.mouse.down();
  await page.mouse.move(x+140,y,{steps:20});
  await page.waitForTimeout(250);
  const drag = await page.evaluate(() => window.rhine.stats());
  assert.ok(Math.abs(drag.rotation-before.rotation)>.01,`${name}: real drag rotates the model`);
  await page.screenshot({path:`${out}/${name}-drag.png`});
  await page.mouse.up();
  await page.waitForFunction(() => window.rhine.stats().decryption.phase==='clear' && document.querySelectorAll('.document-redaction-window').length===0,{timeout:25000});
  const detail = await page.evaluate(() => window.rhine.stats());
  assert.ok(detail.decryption.modelClarity > .99);
  await page.screenshot({path:`${out}/${name}-clear.png`});
  await page.evaluate(() => window.rhine.archive());
  await page.waitForFunction(() => window.rhine.stats().rotation===0 && window.rhine.stats().cameraDetail<.001,{timeout:20000});
  const metrics=await page.locator('#three-scene').evaluate(e=>JSON.parse(e.dataset.renderQuality));
  assert.ok(metrics.width*metrics.height<=metrics.pixelBudget);
  results.push({name, wheelRow:wheel.selectedCell.row, rotation:drag.rotation, modelClarity:detail.decryption.modelClarity, metrics});
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/checks.json`,JSON.stringify({passed:true,results,errors},null,2));
 console.log(JSON.stringify({passed:true,results,errors},null,2));
} finally {await browser.close();}
