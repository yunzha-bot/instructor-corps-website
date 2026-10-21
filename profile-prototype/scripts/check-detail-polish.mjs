import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const result={};
try {
 for(const [mode,enabled] of [["motion",true],["reduced",false],["dark",true]]) {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(({surface,dark})=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,colorTheme:dark?'dark':'light',motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false,surfaceTransitions:surface}})),{surface:enabled,dark:mode==='dark'});
  await page.goto('http://127.0.0.1:4173/?scene=archive');
  await page.waitForFunction(()=>window.rhine?.stats().ready);
  await page.evaluate(()=>{window.rhine.select(4);window.rhine.detail();});
  await page.waitForTimeout(1400);
  assert.equal(await page.locator('.powered').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  const before=await page.locator('[name=skill]').boundingBox();
  const baseline=await page.locator('[name=skill]').evaluate(e=>getComputedStyle(e.parentElement.querySelector('.editor-rule')).backgroundColor);
  await page.locator('[name=skill]').focus();await page.waitForTimeout(200);
  const focused=await page.locator('[name=skill]').evaluate(e=>getComputedStyle(e.parentElement.querySelector('.editor-rule')).backgroundColor);
  assert.notEqual(focused,baseline);assert.deepEqual(await page.locator('[name=skill]').boundingBox(),before);
  await page.locator('[name=skill]').fill('演示技能');await page.locator('.inline-record-form [type=submit]').click();
  assert.equal(await page.locator('.inline-record-form').getAttribute('data-state'),'saved');
  await page.screenshot({path:`qa/detail-polish/after/saved-${mode}.png`});
  const animation=await page.evaluate(()=>{
   document.querySelector('[data-tab=notes]').click();
   return document.querySelector('#tab-panel').getAnimations().map(a=>({duration:a.effect.getTiming().duration,frames:a.effect.getKeyframes()}));
  });
  assert.equal(animation.length,enabled?1:0);
  if(enabled) {assert.equal(animation[0].duration,220);assert.equal(animation[0].frames[0].transform,'translateY(4px)');}
  await page.waitForTimeout(100);await page.screenshot({path:`qa/detail-polish/after/tab-mid-${mode}.png`});
  await page.waitForTimeout(160);await page.screenshot({path:`qa/detail-polish/after/tab-end-${mode}.png`});
  await page.locator('[data-tab=history]').click();await page.locator('[data-tab=overview]').click();
  await page.waitForTimeout(300);assert.equal(await page.locator('[name=skill]').inputValue(),'演示技能');
  const bookmark=page.locator('[data-action=bookmark]');await bookmark.click();assert.match(await bookmark.innerText(),/已收藏/);assert.equal(await bookmark.getAttribute('aria-pressed'),'true');await bookmark.click();assert.match(await bookmark.innerText(),/收藏档案/);
  if(mode==='dark')assert.notEqual(await page.locator('[name=skill]').evaluate(e=>getComputedStyle(e).color),'rgb(48, 51, 47)');
  const geometry=await page.locator('#detail-content').evaluate(e=>({overflow:e.scrollWidth>e.clientWidth,titleWeight:getComputedStyle(e.querySelector('h2')).fontWeight,heavyRule:getComputedStyle(e.querySelector('.detail-rule')).display}));
  assert.equal(geometry.overflow,false);assert.equal(geometry.titleWeight,'400');assert.equal(geometry.heavyRule,'none');
  result[mode]={focusChangesWithoutLayoutShift:true,saveState:true,animation,rapidTabKeepsSavedFields:true,bookmarkToggle:true,geometry};
  await page.close();
 }
 await writeFile('qa/detail-polish/checks.json',JSON.stringify(result,null,2));
 console.log('Focus, saved state, tab phases, reduced motion and bookmark checks passed.');
}finally{await browser.close();}
