import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
// User authorized an isolated Playwright browser for local visual and interaction QA.
const require = createRequire(import.meta.url);
const modules = process.env.PROFILE_QA_MODULES;
if (!modules) throw new Error('Set PROFILE_QA_MODULES to the directory containing Playwright.');
const { chromium } = require(path.join(modules, 'playwright'));
const out = path.resolve('qa');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PROFILE_QA_CHANNEL || undefined });
const context = await browser.newContext({ viewport: { width: 1586, height: 992 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const checks = [];
const ready = async () => {
  await page.waitForFunction(() => window.__archiveScene?.snapshot().loaded === true);
  await page.evaluate(() => window.__archiveScene.skip());
  await page.waitForFunction(() => window.__archiveScene.snapshot().mode === 'reading');
};
const noOverflow = async label => {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label} horizontal overflow`);
  checks.push(`${label}: no horizontal overflow`);
};
try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await ready();
  assert(await page.locator('canvas[data-archive-world]').isVisible());
  await noOverflow('desktop');
  await page.screenshot({ path: path.join(out, 'desktop.png'), fullPage: false });
  checks.push('AI archive image loaded and extraction completes');

  for (const [label, width, height] of [['laptop',1280,720],['tablet',768,1024],['mobile',390,844]]) {
    await page.setViewportSize({ width, height });
    await ready();
    await noOverflow(label);
    await page.screenshot({ path: path.join(out, `${label}.png`), fullPage: true });
  }
  await page.setViewportSize({ width:1586,height:992 });
  await page.getByRole('button', { name:'编辑资料', exact:true }).click();
  await page.screenshot({path:path.join(out,'edit-dialog.png')});
  await page.getByLabel('展示昵称').fill('演示队员 QA');
  await page.getByLabel('个人简介', { exact:false }).fill('仅用于原型检查的虚构简介。');
  await page.getByRole('button', { name:'保存演示资料' }).click();
  await page.reload({ waitUntil:'networkidle' });
  await ready();
  assert.equal(await page.locator('.profile-document h1').innerText(), '演示队员 QA');
  assert.match(await page.locator('.bio-text').innerText(), /虚构简介/);
  checks.push('edit, save and refresh preserve browser-only fictional profile');
  await page.getByRole('tab', { name:'训练记录' }).click();
  await page.getByRole('tab', { name:'训练记录' }).press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name:'个人荣誉' }).getAttribute('aria-selected'), 'true');
  checks.push('tabs support click and arrow-key navigation');
  await page.getByRole('button', { name:'重播动效' }).click();
  await page.locator('[data-motion="playing"]').waitFor();
  await page.getByRole('button', { name:'跳过', exact:true }).click();
  await ready();
  await page.waitForTimeout(600);
  assert.equal(await page.locator('.app-shell').getAttribute('data-motion'), 'ready');
  assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length),0);
  checks.push('skip during return cancels replay without restarting it');
  await page.getByLabel('减少动态').check();
  assert(await page.getByRole('button',{name:'重播动效'}).isDisabled());
  await page.getByRole('tab',{name:'基本资料'}).click();
  checks.push('reduced-motion control keeps content available and disables replay');
  await page.getByRole('button',{name:'放大本人示意影像'}).click();
  assert(await page.getByRole('dialog').isVisible());
  await page.keyboard.press('Escape');
  assert(!(await page.getByRole('dialog').isVisible()));
  checks.push('image viewer opens and Escape closes the modal');
  await page.getByRole('button',{name:'演示队员 QA'}).click();
  await page.getByRole('button',{name:'重置演示资料'}).click();
  assert.equal(await page.locator('.profile-document h1').innerText(),'演示队员 01');
  checks.push('demo reset restores the initial identity');

  const reducedContext = await browser.newContext({ reducedMotion:'reduce', viewport:{width:390,height:844} });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle'});
  assert.equal(await reducedPage.locator('.app-shell').getAttribute('data-reduced'),'true');
  assert.equal(await reducedPage.evaluate(() => document.getAnimations().length),0);
  checks.push('system reduced-motion preference prevents all entry animation');
  await reducedContext.close();

  const failure = await browser.newContext();
  const failedPage = await failure.newPage();
  await failedPage.route('**/member-photo.png', route => route.abort());
  await failedPage.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await failedPage.screenshot({path:path.join(out,'image-failure.png'),fullPage:true});
  await failedPage.getByText('三维影像加载失败，请刷新或检查浏览器 WebGL 支持。').waitFor();
  await failure.close();
  checks.push('missing image presents an explicit error state');
  assert.deepEqual(errors,[],'browser runtime/console errors');
  await writeFile(path.join(out,'browser-checks.json'),JSON.stringify({checks,errors,passed:true},null,2));
  console.log(JSON.stringify({passed:true,checks,errors},null,2));
} finally { await browser.close(); }
