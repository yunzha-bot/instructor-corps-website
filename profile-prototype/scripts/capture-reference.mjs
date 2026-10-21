import {createRequire}from'node:module';import{mkdir,writeFile}from'node:fs/promises';import path from'node:path';
const require=createRequire(import.meta.url);const{chromium}=require(path.join(process.env.PROFILE_QA_MODULES,'playwright'));
const out=path.resolve('qa/motion-v2/reference');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{const page=await browser.newPage({viewport:{width:1600,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('https://rhine.lubeiluchen.cc/?scene=archive',{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForTimeout(14000);await page.screenshot({path:path.join(out,'archive.png')});
await writeFile(path.join(out,'page-info.json'),JSON.stringify({text:await page.locator('body').innerText(),buttons:await page.locator('button').allTextContents(),errors},null,2));
console.log(await page.locator('button').allTextContents());
const button=page.getByRole('button',{name:/ACCESS FILE/}).first();
if(await button.isVisible()){
 await button.click();
 for(const t of [0,700,1700,3000,4500,6000]){if(t)await page.waitForTimeout(t===700?700:t===1700?1000:t===3000?1300:t===4500?1500:1500);await page.screenshot({path:path.join(out,`detail-${t}.png`)});}
}
console.log('Reference evidence saved',errors);
}finally{await browser.close();}
