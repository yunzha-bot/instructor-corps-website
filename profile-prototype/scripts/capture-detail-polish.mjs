import {createRequire} from 'node:module';import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const phase=process.argv[2]||'before',out=`qa/detail-polish/${phase}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false}})));
 await page.goto('http://127.0.0.1:4173/?scene=archive');await page.waitForFunction(()=>window.rhine?.stats().ready,{timeout:90000});
 async function open(i){await page.evaluate(n=>{window.rhine.select(n);window.rhine.detail();},i);await page.waitForFunction(()=>window.rhine.stats().mode==='detail');await page.waitForTimeout(1600);}
 const metrics=[];
 for(const [name,index]of [['skills',4],['profile',0],['training',15],['memories',32]]){await open(index);await page.screenshot({path:`${out}/${name}.png`});metrics.push(await page.locator('#detail-content').evaluate(e=>({title:e.querySelector('h2').textContent,rect:e.getBoundingClientRect().toJSON(),titleFont:getComputedStyle(e.querySelector('h2')).fontSize,titleWeight:getComputedStyle(e.querySelector('h2')).fontWeight,scrollHeight:e.scrollHeight,height:e.clientHeight})));}
 await open(4);await page.locator('[name=skill]').focus();await page.screenshot({path:`${out}/focus.png`});await page.locator('[data-tab=history]').click();await page.waitForTimeout(400);await page.screenshot({path:`${out}/documents.png`});
 await page.setViewportSize({width:2560,height:1299});await open(4);await page.screenshot({path:`${out}/wide.png`});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:`${out}/mobile.png`});
 await writeFile(`${out}/observations.json`,JSON.stringify({metrics,errors},null,2));console.log(`Captured ${phase} right-panel states; errors: ${errors.length}`);
}finally{await browser.close();}
