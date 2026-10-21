import {createRequire} from 'node:module';import{mkdir,writeFile}from'node:fs/promises';import path from'node:path';
const require=createRequire(import.meta.url);const{chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve('qa/faithful/reference');await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:'msedge'});
try{for(const[name,width,height]of[['desktop',1600,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://rhine.lubeiluchen.cc/?scene=archive',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.rhine?.stats().ready,{timeout:60000});await page.waitForTimeout(4500);
 await page.screenshot({path:path.join(out,`${name}-archive.png`)});await writeFile(path.join(out,`${name}-archive.json`),JSON.stringify({text:await page.locator('body').innerText(),stats:await page.evaluate(()=>window.rhine.stats()),layout:await page.locator('#stage').evaluate(e=>({width:e.clientWidth,height:e.clientHeight,transform:getComputedStyle(e).transform})),errors},null,2));
 await page.locator('[data-action="open"]').first().click();await page.waitForTimeout(6500);await page.screenshot({path:path.join(out,`${name}-detail.png`)});
 await page.locator('[data-action="model-viewer"]').click();await page.waitForTimeout(2500);await page.screenshot({path:path.join(out,`${name}-viewer.png`)});await page.keyboard.press('Escape');await page.waitForTimeout(500);
 await page.locator('[data-action="settings"]').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(out,`${name}-settings.png`)});
 await writeFile(path.join(out,`${name}-capture.json`),JSON.stringify({errors,buttons:await page.locator('button').allTextContents()},null,2));await page.close();}
}finally{await browser.close();}
