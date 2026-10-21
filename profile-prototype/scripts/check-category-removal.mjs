import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded','1');
  localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false}}));
  localStorage.setItem('corps-archive-catalog-v1',JSON.stringify({added:[{id:'X-041',title:'旧训练','category':'训练记录'},{id:'X-042',title:'旧记忆','category':'青春记忆'}],deleted:[],next:43,order:Array.from({length:42},(_,i)=>`X-${String(i+1).padStart(3,'0')}`)}));
 });
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready);
 const ids=await p.evaluate(()=>window.rhine.catalog().map(r=>r.id));assert.equal(ids.length,16);
 assert.deepEqual(await p.evaluate(()=>[...new Set(window.rhine.catalog().map(r=>r.category))]),['队伍档案','荣誉里程']);
 await p.locator('[data-action=search]').click();assert.deepEqual(await p.locator('.category-filters button').allTextContents(),['全部档案','队伍档案','荣誉里程']);
 assert.deepEqual(await p.locator('.result-name>b').allTextContents(),Array.from({length:16},(_,i)=>`X-${String(i+1).padStart(3,'0')}`));
 await p.locator('.catalog-create summary').click();assert.deepEqual(await p.locator('#catalog-create-form option').allTextContents(),['荣誉里程']);
 await p.locator('#catalog-create-form [name=title]').fill('新增荣誉');await p.locator('#catalog-create-form button[type=submit]').click();await p.waitForFunction(()=>window.rhine.catalog().length===17);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('corps-archive-catalog-v1')).added.filter(r=>['训练记录','青春记忆'].includes(r.category)).length),2);
 await mkdir('qa/category-removal',{recursive:true});await p.screenshot({path:'qa/category-removal/directory.png'});
 await p.locator('[data-action=close-modal]').click();await p.waitForFunction(()=>!document.querySelector('.modal-backdrop'));
 await p.evaluate(()=>window.rhine.select(7));await p.waitForTimeout(1500);await p.mouse.move(500,380);await p.mouse.wheel(0,120);await p.waitForTimeout(1300);assert.equal(await p.evaluate(()=>window.rhine.stats().selected),'X-025');
 await p.reload();await p.waitForFunction(()=>window.rhine?.stats().ready);assert.equal(await p.evaluate(()=>window.rhine.catalog().length),17);assert.deepEqual(errors,[]);
 console.log('Two categories removed from directory, scene and creation; legacy data retained, numbering, wheel boundary, creation and reload passed.');
}finally{await browser.close();}
