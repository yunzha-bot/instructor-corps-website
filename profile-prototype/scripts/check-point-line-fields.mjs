import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='qa/point-line-fields';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],result={};
try {
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false}})));
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready);
 async function open(index=0){await p.evaluate(i=>{window.rhine.select(i);window.rhine.detail();},index);await p.waitForTimeout(1300);}
 await open();
 const field=p.locator('[name=joined]'),save=p.locator('.inline-record-form [type=submit]');
 assert.equal(await field.getAttribute('type'),'text');
 // Seek the real CSS entry animations at three times: dot, growing line, final line.
 const phases=[];
 for(const [name,time]of [['point',130],['extending',280],['line',560]]){
  await p.locator('.editor-rule').evaluateAll((rules,t)=>rules.forEach(e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=t;})),time);
  await save.evaluate((e,t)=>e.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=t;}),time);
  const metrics=await p.locator('.editor-rule').first().evaluate(e=>({width:e.getBoundingClientRect().width,host:e.parentElement.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
  phases.push(metrics);await p.screenshot({path:`${out}/${name}.png`});
 }
 assert(phases[0].width<4);assert(phases[1].width>phases[0].width&&phases[1].width<phases[2].width);assert(Math.abs(phases[2].width-phases[2].host)<1);
 result.phases=phases;
 const surfaces=await p.locator('.inline-record-form input:not(.native-date-picker),.inline-record-form [type=submit]').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,border:s.borderTopWidth,radius:s.borderRadius};}));
 assert(surfaces.every(s=>s.background==='rgba(0, 0, 0, 0)'&&s.border==='0px'&&s.radius==='0px'));result.surfaces=surfaces;
 const before=await field.boundingBox();await field.focus();await p.waitForTimeout(650);assert.deepEqual(await field.boundingBox(),before);
 await field.fill('2026/10/20');await save.click();assert.equal(await field.inputValue(),'2026-10-20');assert.equal(await p.locator('.inline-record-form').getAttribute('data-state'),'saved');
 const scroll=()=>p.evaluate(()=>({window:scrollX,viewport:document.querySelector('#viewport').scrollLeft,stage:document.querySelector('#stage').scrollLeft,layout:document.querySelector('#stage').dataset.layout}));
 result.beforeValidationScroll=await scroll();
 // Compare all local storage so an invalid date cannot silently overwrite a previous save.
 const saved=await p.evaluate(()=>JSON.stringify(localStorage));
 await field.fill('2026-02-30');await save.click();assert.equal(await p.locator('.inline-record-form').getAttribute('data-state'),'error');assert.equal(await field.inputValue(),'2026-02-30');assert.equal(await p.evaluate(()=>JSON.stringify(localStorage)),saved);
 result.afterValidationScroll=await scroll();
 await field.fill('2025-02-29');await save.click();assert.equal(await field.getAttribute('aria-invalid'),'true');
 await field.fill('20240229');await save.click();assert.equal(await field.inputValue(),'2024-02-29');
 await field.fill('2026年1月2日');await save.click();assert.equal(await field.inputValue(),'2026-01-02');
 await field.fill('');await save.click();assert.equal(await field.inputValue(),'');assert.equal(await p.locator('.inline-record-form').getAttribute('data-state'),'saved');
 // Call the native picker from a real button click, then exercise its selection event.
 await p.evaluate(()=>{const original=HTMLInputElement.prototype.showPicker;HTMLInputElement.prototype.showPicker=function(){original.call(this);this.dataset.opened='true';};});
 await p.locator('[data-date-picker]').click();assert.equal(await p.locator('.native-date-picker').getAttribute('data-opened'),'true');await p.keyboard.press('Escape');
 await p.locator('.native-date-picker').evaluate(e=>{e.value='2026-10-19';e.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await field.inputValue(),'2026-10-19');await save.click();
 result.afterCalendarScroll=await scroll();
 await p.reload();await p.waitForFunction(()=>window.rhine?.stats().ready);await open();assert.equal(await field.inputValue(),'2026-10-19');
 await p.screenshot({path:`${out}/typed-date.png`});
 await open(8);await p.locator('[name=date]').fill('2026/10/18');await save.click();assert.equal(await p.locator('[name=date]').inputValue(),'2026-10-18');
 await p.locator('[data-tab=history]').click();await p.locator('[name=title]').fill('日期与线条检查');await p.locator('[name=body]').fill('文档保持直接填写。');await p.locator('.dossier-document-inline [type=submit]').click();assert.equal(await p.locator('.inline-document').count(),1);await p.screenshot({path:`${out}/documents.png`});
 result.afterDocumentsScroll=await scroll();
 assert.equal(result.afterDocumentsScroll.stage,0);assert.equal(result.afterDocumentsScroll.viewport,0);
 result.typedFormats=['2026/10/20','20240229','2026年1月2日'];result.invalidDatesBlocked=true;result.emptyDate=true;result.nativeCalendar=true;result.persistedAfterReload=true;result.trainingDates=true;result.documents=true;
 await p.setViewportSize({width:390,height:844});await open();await field.fill('2026/10/20');await save.click();await p.screenshot({path:`${out}/mobile.png`});assert.equal(await p.locator('#detail-content').evaluate(e=>e.scrollWidth>e.clientWidth),false);result.mobile=true;result.mobileScroll=await scroll();
 for(const mode of ['reduced','dark']){
  const q=await browser.newPage({viewport:{width:1440,height:900}});q.on('pageerror',e=>errors.push(e.message));
  await q.addInitScript(m=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,colorTheme:m==='dark'?'dark':'light',motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false,surfaceTransitions:m!=='reduced'}})),mode);
  await q.goto('http://127.0.0.1:4173/?scene=archive');await q.waitForFunction(()=>window.rhine?.stats().ready);await q.evaluate(()=>window.rhine.detail());await q.waitForTimeout(1300);
  if(mode==='reduced')assert.equal(await q.locator('.editor-rule').first().evaluate(e=>e.getAnimations().length),0);
  await q.screenshot({path:`${out}/${mode}.png`});await q.close();
 }
 assert.deepEqual(errors,[]);result.errors=errors;await writeFile(`${out}/checks.json`,JSON.stringify(result,null,2));console.log('Point → line, transparent fields, typed and calendar dates, validation, persistence, documents, mobile and reduced motion passed.');
} finally {await browser.close();}
