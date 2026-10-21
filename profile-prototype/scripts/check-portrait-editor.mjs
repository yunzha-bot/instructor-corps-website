import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const b=await chromium.launch({channel:'msedge',headless:true});const out='qa/portrait-editor';await mkdir(out,{recursive:true});
try{
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false}}));}});
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready);
 await p.evaluate(()=>window.rhine.detail());await p.waitForTimeout(1600);
 const sticker=p.locator('.portrait-open'),dialog=p.locator('.portrait-dialog');await p.screenshot({path:`${out}/before.png`});const start=await sticker.boundingBox();await sticker.click();
 await p.waitForFunction(()=>document.querySelector('dialog').open);await p.evaluate(()=>{const a=document.querySelector('.portrait-sheet').getAnimations()[0];a.pause();a.currentTime=0;});await p.screenshot({path:`${out}/mid.png`});
 await p.evaluate(()=>document.querySelector('.portrait-sheet').getAnimations()[0].finish());await p.waitForTimeout(50);
 const box=await p.locator('.portrait-sheet').boundingBox();assert(Math.abs(box.x+box.width/2-720)<2);assert(Math.abs(box.y+box.height/2-450)<2);
 const edges=await p.locator('.portrait-sheet canvas').evaluate(c=>{
  const ctx=c.getContext('2d');
  const left=y=>{for(let x=0;x<640;x++)if(ctx.getImageData(x,y,1,1).data[3]>200)return x;};
  const top=x=>{for(let y=0;y<864;y++)if(ctx.getImageData(x,y,1,1).data[3]>200)return y;};
  return {left:[left(80),left(780)],top:[top(80),top(560)]};
 });assert.equal(edges.left[0],edges.left[1]);assert.equal(edges.top[0],edges.top[1]);
 await p.screenshot({path:`${out}/center.png`});assert.equal(await sticker.evaluate(e=>getComputedStyle(e).opacity),'0');
 const chooser=p.waitForEvent('filechooser');await p.locator('.portrait-upload').click();const file=await chooser;
 const data=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=100;c.getContext('2d').fillStyle='#ff0000';c.getContext('2d').fillRect(0,0,80,100);return c.toDataURL('image/png').split(',')[1];});
 await file.setFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});await p.getByRole('status').filter({hasText:'头像已保存'}).waitFor();
 const pixel=await p.locator('.portrait-sheet canvas').evaluate(c=>[...c.getContext('2d').getImageData(200,200,1,1).data]);assert(pixel[0]>200&&pixel[1]<10);
 await p.screenshot({path:`${out}/uploaded.png`});await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('dialog').open);assert.equal(await sticker.evaluate(e=>e.classList.contains('portrait-lifted')),false);
 await p.reload();await p.waitForFunction(()=>window.rhine?.stats().ready);await p.evaluate(()=>window.rhine.detail());await p.waitForTimeout(1500);await sticker.click();await p.waitForTimeout(750);
 assert((await p.locator('.portrait-sheet canvas').evaluate(c=>c.getContext('2d').getImageData(200,200,1,1).data[0]))>200);
 await p.locator('.portrait-dialog input').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')});await p.getByRole('status').filter({hasText:'请选择20MB以内'}).waitFor();
 await p.keyboard.press('Escape');await p.waitForTimeout(750);await p.evaluate(()=>window.rhine.archive());await p.waitForTimeout(1000);await p.evaluate(()=>{window.rhine.select(1);window.rhine.detail();});await p.waitForTimeout(1500);await sticker.click();await p.waitForTimeout(750);
 assert.equal(await p.locator('.portrait-upload').isVisible(),false);assert.equal(await p.locator('.portrait-upload').isDisabled(),true);await p.screenshot({path:`${out}/peer-readonly.png`});
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(150);const mobile=await p.locator('.portrait-sheet').boundingBox();assert(Math.abs(mobile.x+mobile.width/2-195)<2);await p.screenshot({path:`${out}/mobile.png`});assert.deepEqual(errors,[]);
 await writeFile(`${out}/checks.json`,JSON.stringify({center:box,mobile,pixel,fileChooser:true,upload:true,reload:true,peerReadonly:true,errors},null,2));console.log('Sticker lift, center/straighten, native file chooser, upload, persistence, invalid input, escape, peer readonly and mobile passed.');
}finally{await b.close();}
