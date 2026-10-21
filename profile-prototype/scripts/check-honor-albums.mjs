import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const b=await chromium.launch({channel:'msedge',headless:true}),out='qa/honor-albums';await mkdir(out,{recursive:true});
try{
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false}})));
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready);
 async function open(index){await p.evaluate(index=>{window.rhine.select(index);window.rhine.detail();},index);await p.waitForTimeout(1300);}
 async function back(){await p.evaluate(()=>window.rhine.archive());await p.waitForTimeout(1000);}
 await open(8);await p.locator('.album-empty').waitFor();assert.equal(await p.locator('.detail-tabs [data-tab]').count(),1);assert.equal(await p.locator('#tab-panel textarea,#tab-panel input:not([type=file])').count(),0);
 const type=await p.evaluate(()=>{
  const read=selector=>{const s=getComputedStyle(document.querySelector(selector));return {family:s.fontFamily,size:parseFloat(s.fontSize),weight:s.fontWeight};};
  return {tab:read('.detail-tabs button span'),add:read('[data-album-add]'),count:read('.album-count'),empty:read('.album-empty')};
 });assert.equal(type.add.family,type.tab.family);assert.equal(type.add.size,type.tab.size);assert.equal(type.add.weight,'400');assert(type.count.size<type.tab.size);assert.equal(type.empty.size,type.count.size);assert.equal(type.empty.weight,'400');
 await p.screenshot({path:`${out}/empty.png`});
 const images=await p.evaluate(()=>['#d58a64','#6c849d'].map(color=>{const c=document.createElement('canvas');c.width=800;c.height=600;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,800,600);ctx.fillStyle='#fff';ctx.font='50px sans-serif';ctx.fillText('HONOR PHOTO',100,300);return c.toDataURL('image/png').split(',')[1];}));
 const chooser=p.waitForEvent('filechooser');await p.locator('[data-album-add]').click();await(await chooser).setFiles(images.map((data,i)=>({name:`photo-${i+1}.png`,mimeType:'image/png',buffer:Buffer.from(data,'base64')})));
 await p.waitForFunction(()=>document.querySelectorAll('.album-photo').length===2);assert.deepEqual(await p.locator('.album-photo img').evaluateAll(imgs=>imgs.map(i=>i.alt)),['photo-1.png','photo-2.png']);await p.screenshot({path:`${out}/photos.png`});
 await p.locator('.album-photo-open').first().click();await p.locator('.album-preview[open]').waitFor();await p.screenshot({path:`${out}/preview.png`});await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('.album-preview'));assert.equal(await p.evaluate(()=>window.rhine.stats().mode),'detail');
 await back();await open(9);await p.locator('.album-empty').waitFor();assert.equal(await p.locator('.album-photo').count(),0);
 await back();await open(8);await p.waitForFunction(()=>document.querySelectorAll('.album-photo').length===2);
 await p.reload();await p.waitForFunction(()=>window.rhine?.stats().ready);await open(8);await p.waitForFunction(()=>document.querySelectorAll('.album-photo').length===2);
 await p.locator('.album-remove').first().click();assert.equal(await p.locator('.album-photo').count(),2);await p.locator('.album-remove').first().click();await p.waitForFunction(()=>document.querySelectorAll('.album-photo').length===1);
 await p.locator('.honor-album input').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('bad')});await p.locator('.album-feedback').filter({hasText:'未保存'}).waitFor();assert.equal(await p.locator('.album-photo').count(),1);
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);await p.screenshot({path:`${out}/mobile.png`});
 await back();await open(0);assert.equal(await p.locator('.honor-album').count(),0);assert.equal(await p.locator('.detail-tabs [data-tab]').count(),2);assert((await p.locator('.inline-record-form').count())>0);
 assert.deepEqual(errors,[]);await writeFile(`${out}/checks.json`,JSON.stringify({multipleUpload:true,order:true,independent:true,reload:true,preview:true,escapeKeepsDetail:true,deleteConfirmation:true,invalidFile:true,memberFormsPreserved:true,errors},null,2));console.log('Honor albums: upload, input order, per-record isolation, reload, preview/escape, removal, invalid file, mobile and member forms passed.');
}finally{await b.close();}
