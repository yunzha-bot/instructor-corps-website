import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 await p.addInitScript(()=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false}})));
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready);
 await p.locator('[data-action=search]').click();await p.locator('[data-filter="训练记录"]').click();
 await p.locator('[data-catalog-drag="X-013"]').click();
 const input=p.locator('.catalog-position input');await input.fill('13');
 await p.locator('[data-position-step="1"]').click();assert.equal(await input.inputValue(),'14');
 await p.locator('[data-position-step="-1"]').click();assert.equal(await input.inputValue(),'13');
 await input.focus();assert.equal(await input.evaluate(e=>getComputedStyle(e).outlineStyle),'none');
 assert.equal(await input.evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');
 await mkdir('qa/position-control',{recursive:true});await p.screenshot({path:'qa/position-control/after.png'});
 await input.fill('10');await p.locator('.catalog-position button[type=submit]').click();
 await p.waitForFunction(()=>window.rhine.catalog()[9].id==='X-013');
 console.log('Borderless position control, custom steps, typed position and live reorder passed.');
}finally{await browser.close();}
