import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const b=await chromium.launch({headless:true,channel:'msedge'});const out='qa/inline-records';await mkdir(out,{recursive:true});
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false}})));
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready,{timeout:90000});
 async function open(index){await p.evaluate(i=>{window.rhine.select(i);window.rhine.detail();},index);await p.waitForFunction(()=>window.rhine.stats().mode==='detail');await p.waitForTimeout(1200);}
 await open(0);assert.equal(await p.locator('.detail-content .metadata').count(),0);assert.equal(await p.locator('[data-action=profile]').count(),0);
 await p.locator('.inline-record-form [name=nickname]').fill('演示新昵称');await p.locator('.inline-record-form [name=team]').fill('演示分队');await p.locator('.inline-record-form [type=submit]').click();assert.equal(await p.locator('#detail-content h2').innerText(),'个人总览');
 await p.screenshot({path:`${out}/profile.png`});
 await open(1);assert.equal(await p.locator('[name=team]').count(),0);await p.locator('[name=intro]').fill('介绍草稿');await p.locator('[data-tab=notes]').click();await p.locator('[name=reflection]').fill('回顾草稿');await p.locator('[data-tab=overview]').click();assert.equal(await p.locator('[name=intro]').inputValue(),'介绍草稿');await p.locator('.inline-record-form [type=submit]').click();
 await open(2);await p.locator('[name=goal]').fill('本月训练目标');await p.locator('[name=status]').selectOption('进行中');await p.locator('[name=status]').focus();await p.keyboard.press('ArrowDown');assert.equal(await p.evaluate(()=>window.rhine.stats().selected),'X-003');await p.locator('.inline-record-form [type=submit]').click();await p.screenshot({path:`${out}/goals.png`});
 await open(15);const labels=await p.locator('.inline-record-form label>span:first-child').allTextContents();assert.deepEqual(labels,['训练目标','计划日期','执行安排']);await p.locator('[name=goal]').fill('训练计划草稿');await p.locator('[name=plan]').fill('记录分阶段安排');await p.screenshot({path:`${out}/training.png`});
 await open(2);assert.equal(await p.locator('[name=goal]').inputValue(),'本月训练目标');await open(15);assert.equal(await p.locator('[name=goal]').inputValue(),'训练计划草稿');await p.locator('.inline-record-form [type=submit]').click();
 await p.locator('[data-tab=history]').click();await p.locator('.dossier-document-inline [name=title]').fill('独立文本');await p.locator('.dossier-document-inline [name=body]').fill('文档草稿');await p.locator('[data-tab=overview]').click();await p.locator('[data-tab=history]').click();assert.equal(await p.locator('.dossier-document-inline [name=body]').inputValue(),'文档草稿');await p.locator('.dossier-document-inline [type=submit]').click();assert.equal(await p.locator('.inline-document').count(),1);await p.locator('.inline-document [name=body]').fill('修改后的正文');await p.locator('.inline-document [type=submit]').click();
 await p.reload();await p.waitForFunction(()=>window.rhine?.stats().ready);await open(0);assert.equal(await p.locator('[name=nickname]').inputValue(),'演示新昵称');await open(1);assert.equal(await p.locator('[name=intro]').inputValue(),'介绍草稿');await open(15);assert.equal(await p.locator('[name=goal]').inputValue(),'训练计划草稿');await p.locator('[data-tab=history]').click();assert.equal(await p.locator('.inline-document [name=body]').inputValue(),'修改后的正文');
 await open(15);await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);await p.screenshot({path:`${out}/mobile.png`});const overflow=await p.locator('#detail-content').evaluate(e=>e.scrollWidth>e.clientWidth);assert.equal(overflow,false);assert.deepEqual(errors,[]);
 await writeFile(`${out}/checks.json`,JSON.stringify({profileSave:true,uniqueFields:labels,draftAcrossTabsAndBoards:true,recordIsolation:true,documentCreateEdit:true,persistedAfterReload:true,selectKeyboardSafe:true,mobileOverflow:overflow,errors},null,2));console.log('Inline fields, independent records, drafts, documents, keyboard, persistence and mobile passed.');
}finally{await b.close();}
