import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.PROFILE_QA_MODULES,'playwright'));
const out=path.resolve('qa/motion-v2');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1586,height:992}});
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 await page.waitForTimeout(1700);
 await page.screenshot({path:path.join(out,'before.png')});
 const current=await page.evaluate(()=>({canvases:document.querySelectorAll('canvas').length,imageAnimation:document.querySelector('.plate-flight')!==null}));
 console.log('Current renderer:',current);
 await writeFile(path.join(out,'before-renderer.json'),JSON.stringify(current,null,2));
 assert.equal(current.canvases>0,true,'Reference requires actual depth, camera travel and array extraction; current prototype only transforms a flat image.');
}finally{await browser.close();}
