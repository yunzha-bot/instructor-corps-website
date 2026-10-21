import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const phase=process.argv[2]||'after',out=`qa/navigation-feedback/${phase}`;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.addInitScript(()=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false}})));
 await page.goto('http://127.0.0.1:4173/?scene=archive');
 await page.waitForFunction(()=>window.rhine?.stats().ready);
 const arrow=page.locator('[data-action=column-next]');await arrow.hover();await page.waitForTimeout(350);
 const hover=await arrow.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));
 await page.screenshot({path:`${out}/hover.png`});
 const read=page.locator('.read-file');await read.click();await page.waitForTimeout(1400);await page.locator('[data-action=back]').click();await page.waitForTimeout(500);
 const mouse=await read.evaluate(e=>({outline:getComputedStyle(e).outlineStyle,color:getComputedStyle(e).outlineColor,focused:document.activeElement===e}));
 await page.screenshot({path:`${out}/pointer-return.png`});
 await page.keyboard.press('Tab');await read.focus();
 const keyboard=await read.evaluate(e=>({outline:getComputedStyle(e).outlineStyle,color:getComputedStyle(e).outlineColor}));
 await page.screenshot({path:`${out}/keyboard.png`});
 await writeFile(`${out}/checks.json`,JSON.stringify({hover,mouse,keyboard},null,2));console.log({hover,mouse,keyboard});
 assert.equal(hover.background,'rgba(0, 0, 0, 0)','Navigation hover must have no colored block');
 assert.equal(mouse.outline,'none','Pointer return must have no focus rectangle');
 assert.equal(keyboard.outline,'solid');assert.equal(keyboard.color,'rgb(119, 119, 119)','Keyboard focus must be neutral gray');
 console.log('Navigation hover, mouse return and keyboard focus passed.');
}finally{await browser.close();}
