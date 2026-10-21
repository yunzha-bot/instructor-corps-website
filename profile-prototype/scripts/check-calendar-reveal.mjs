import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='qa/calendar-reveal';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{rollingNumbers:false,idleWave:false,pointerParallax:false}})));
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready);await p.evaluate(()=>{window.rhine.select(8);window.rhine.detail();});
 await p.waitForFunction(()=>window.rhine.stats().decryption.phase==='joining');assert.equal(await p.locator('.date-picker-button .document-redaction-window').count(),1);
 await p.screenshot({path:`${out}/actual-waiting.png`});
 await p.waitForFunction(()=>window.rhine.stats().decryption.phase==='clear');await p.waitForTimeout(1200);
 await p.evaluate(async()=>{const {DocumentDecryption}=await import('/backups/before-calendar-icon-reveal-20261020/document-decryption.ts');window.calendarProbe=new DocumentDecryption();window.calendarProbe.reset(document.querySelector('#detail-content'),false);});
 await p.screenshot({path:`${out}/before.png`});
 await p.evaluate(async()=>{window.calendarProbe.reset(document.querySelector('#detail-content'),true);const {DocumentDecryption}=await import('/src/rhine/document-decryption.ts');window.calendarProbe=new DocumentDecryption();window.calendarProbe.reset(document.querySelector('#detail-content'),false);});
 const covered=await p.locator('.date-picker-button').evaluate(e=>{const icon=e.querySelector('svg').getBoundingClientRect(),mask=e.querySelector('.document-redaction-window').getBoundingClientRect();return {icon:icon.toJSON(),mask:mask.toJSON(),fits:mask.left<=icon.left&&mask.right>=icon.right&&mask.top<=icon.top&&mask.bottom>=icon.bottom};});assert(covered.fits);
 await p.screenshot({path:`${out}/covered.png`});
 await p.evaluate(()=>{const f=window.rhine.stats().decryption;window.calendarProbe.update(0,f,false);window.calendarProbe.update(.3,f,false);});
 const middle=await p.locator('.date-picker-button .document-redaction-window').evaluate(e=>({left:e.getBoundingClientRect().left,ink:e.firstElementChild.getBoundingClientRect().left,width:e.getBoundingClientRect().width}));assert(middle.ink>middle.left&&middle.ink<middle.left+middle.width);await p.screenshot({path:`${out}/middle.png`});
 await p.evaluate(()=>window.calendarProbe.update(1,window.rhine.stats().decryption,false));assert.equal(await p.locator('.document-redaction-window').count(),0);await p.screenshot({path:`${out}/clear.png`});
 await p.evaluate(()=>{const original=HTMLInputElement.prototype.showPicker;HTMLInputElement.prototype.showPicker=function(){original.call(this);this.dataset.opened='true';};});
 await p.locator('[data-date-picker]').click();assert.equal(await p.locator('.native-date-picker').getAttribute('data-opened'),'true');await p.keyboard.press('Escape');
 await p.locator('[name=date]').fill('2026/10/20');await p.locator('.inline-record-form [type=submit]').click();assert.equal(await p.locator('[name=date]').inputValue(),'2026-10-20');assert.equal(await p.locator('.date-picker-button .document-redaction-window').count(),0);
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);await p.evaluate(()=>window.calendarProbe.reset(document.querySelector('#detail-content'),false));await p.screenshot({path:`${out}/mobile.png`});assert.equal(await p.locator('#detail-content').evaluate(e=>e.scrollWidth>e.clientWidth),false);
 await p.evaluate(()=>window.calendarProbe.update(0,window.rhine.stats().decryption,true));assert.equal(await p.locator('.date-picker-button .document-redaction-window').count(),0);
 assert.deepEqual(errors,[]);await writeFile(`${out}/checks.json`,JSON.stringify({covered,middle,realEntry:true,nativePicker:true,typedDate:true,noReplayOnSave:true,mobile:true,reduced:true,errors},null,2));console.log('Calendar icon is covered, revealed left to right, still opens its picker, and keeps typed dates/mobile/reduced motion.');
}finally{await browser.close();}
