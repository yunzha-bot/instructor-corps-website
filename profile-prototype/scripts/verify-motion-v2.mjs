import assert from 'node:assert/strict';import{createRequire}from'node:module';import{mkdir,writeFile}from'node:fs/promises';import path from'node:path';
const require=createRequire(import.meta.url);const{chromium}=require(path.join(process.env.PROFILE_QA_MODULES,'playwright'));
const out=path.resolve('qa/motion-v2');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
const page=await browser.newPage({viewport:{width:1586,height:992},deviceScaleFactor:1});const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__archiveScene?.snapshot().loaded===true);
await page.getByRole('button',{name:'读取档案',exact:true}).waitFor();
await page.screenshot({path:path.join(out,'archive.png')});
const samples=[];
for(const t of [0,.6,1.4,3,5,6.5]){
const snapshot=await page.evaluate(time=>window.__archiveScene.inspectAt(time),t);samples.push({time:t,...snapshot});
await page.screenshot({path:path.join(out,`stage-${t}.png`)});
}
assert(samples.every(s=>Math.abs(s.rotation)<.001),'extraction must change camera, not automatically rotate the card');
assert(samples[1].lift>samples[0].lift&&samples[1].lift<4.05,'physical lift must advance');
assert(samples[1].camera.some((v,i)=>Math.abs(v-samples[0].camera[i])>1),'camera must actually travel in 3D');
assert.equal(samples[0].clarity,0);
assert(samples.some(s=>s.lines>0),'scan lines must exist in the actual 3D model');
assert.equal(samples.at(-1).scan,'clear');
assert(samples.at(-1).clarity>.999);
assert(samples.at(-1).drawCalls>4,'must render actual world geometry, not an empty canvas');
await page.getByRole('button',{name:'编辑资料',exact:true}).click();await page.getByLabel('展示昵称').fill('演示队员01');await page.getByRole('button',{name:'取消',exact:true}).click();
await page.evaluate(()=>window.__archiveScene.skip());
await page.mouse.move(380,450);await page.mouse.down();await page.mouse.move(465,450,{steps:12});await page.mouse.up();
await page.waitForFunction(()=>Math.abs(window.__archiveScene.snapshot().rotation)>.1);
const dragged=await page.evaluate(()=>window.__archiveScene.snapshot());
await page.getByRole('button',{name:'返回档案',exact:true}).click();
const returning=await page.evaluate(()=>window.__archiveScene.snapshot());
assert(Math.abs(returning.rotation)>0,'rotation should return gradually');
assert(Math.abs(returning.model[1]-dragged.model[1])<.003,'height must hold while aligning');
await page.waitForFunction(()=>window.__archiveScene.snapshot().lift<4);
const descending=await page.evaluate(()=>window.__archiveScene.snapshot());
assert.equal(descending.rotation,0,'descent only starts after rotation is aligned');
await page.waitForFunction(()=>window.__archiveScene.snapshot().mode==='archive',{timeout:15000});
await page.screenshot({path:path.join(out,'returned.png')});
await page.getByRole('button',{name:'读取档案',exact:true}).click();
await page.getByRole('button',{name:'跳过',exact:true}).click();
await page.waitForFunction(()=>window.__archiveScene.snapshot().mode==='reading');
await page.getByRole('tab',{name:'训练记录'}).click();assert.equal(await page.getByRole('tab',{name:'训练记录'}).getAttribute('aria-selected'),'true');
for(const [name,width,height]of[['tablet',768,1024],['mobile',390,844]]){await page.setViewportSize({width,height});await page.evaluate(()=>window.__archiveScene.skip());await page.screenshot({path:path.join(out,`${name}.png`),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} overflow`);}
assert.deepEqual(errors,[]);
await writeFile(path.join(out,'motion-checks.json'),JSON.stringify({passed:true,samples,errors},null,2));console.log(JSON.stringify({passed:true,samples:samples.map(({time,lift,detail,clarity,scan,drawCalls})=>({time,lift,detail,clarity,scan,drawCalls})),errors},null,2));
}finally{await browser.close()}
