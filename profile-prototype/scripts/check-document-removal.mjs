import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const b=await chromium.launch({channel:'msedge',headless:true});
try{
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false}}));localStorage.setItem('corps-documents-demo-v1','[{"id":"old","record":"X-001","title":"保留旧文档","body":"旧内容","visibility":"private"}]');});
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready);
 for(const index of [0,1,8]){
  await p.evaluate(index=>{window.rhine.select(index);window.rhine.detail();},index);await p.waitForTimeout(1400);
  assert.equal(await p.locator('.detail-tabs [data-tab]').count(),2);assert.equal(await p.locator('[data-tab=history],.dossier-document-inline').count(),0);
  await p.locator('[data-tab=notes]').click();await p.locator('[data-tab=notes]').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('[data-tab=overview]').getAttribute('aria-selected'),'true');
  await p.locator('[data-tab=notes]').click();assert.equal(await p.locator('[data-tab=notes]').getAttribute('aria-selected'),'true');
  if(index===0){await mkdir('qa/document-removal',{recursive:true});await p.screenshot({path:'qa/document-removal/own.png'});}
  await p.evaluate(()=>window.rhine.archive());await p.waitForTimeout(1000);
 }
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('corps-documents-demo-v1'))[0].body),'旧内容');assert.deepEqual(errors,[]);
 console.log('Own, peer and honor have two tabs; keyboard wraps correctly, document UI absent, old storage retained.');
}finally{await b.close();}
