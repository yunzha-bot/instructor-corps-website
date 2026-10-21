import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),out='qa/team-order-migration';await mkdir(out,{recursive:true});
const before=process.argv.includes('--before');
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  if(localStorage.getItem('order-migration-seeded'))return;
  localStorage.setItem('order-migration-seeded','1');
  localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false,rollingNumbers:false}}));
  localStorage.setItem('corps-archive-catalog-v1',JSON.stringify({added:[],deleted:[],next:41,order:Array.from({length:40},(_,i)=>`X-${String(i+1).padStart(3,'0')}`)}));
  localStorage.setItem('instructor-profile-demo-v1',JSON.stringify({nickname:'演示队员 01',bio:'保留简介',team:'原分队'}));
 });
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready);
 const ids=await p.evaluate(()=>window.rhine.catalog().map(r=>r.id));
 await p.locator('[data-action=search]').click();await p.locator('[data-filter="队伍档案"]').click();
 await p.waitForTimeout(400);assert.equal(await p.locator('#stage').evaluate(e=>e.scrollLeft),0);
 const labels=await p.locator('.catalog-result .result-name>b').allTextContents();
 await p.screenshot({path:`${out}/${before?'before':'after'}.png`});
 assert.deepEqual(labels,Array.from({length:8},(_,i)=>`X-${String(i+1).padStart(3,'0')}`),'A full old 40-item order must migrate new teammates into the team block, not append them as X-026 onward');
 assert.deepEqual(ids.slice(0,8),['X-001',...Array.from({length:7},(_,i)=>`T-${String(i+2).padStart(3,'0')}`)]);
 const scenarios=await p.evaluate(async()=>{
  const c=await import('/src/rhine/catalog-store.ts'),base=window.rhine.catalog(),key='corps-archive-catalog-v1',original=localStorage.getItem(key);
  const members=base.filter(r=>r.memberRecord).map(r=>r.id),others=base.filter(r=>!r.memberRecord).map(r=>r.id),result={};
  try{
   // Also repair a buggy team order already written with new IDs appended.
   localStorage.setItem(key,JSON.stringify({added:[],deleted:[],next:41,order:['X-001',...others,...members.slice(1)]}));
   result.appended=c.catalogRecords(base).map(r=>r.id);
   const id=c.createArchive('保留编号的新增训练','训练记录',base);result.savedVersion=JSON.parse(localStorage.getItem(key)).orderVersion;
   result.created=c.catalogRecords(base).map(r=>r.id);c.deleteArchive(id,base);result.deleted=c.catalogRecords(base).map(r=>r.id);c.restoreArchive(base);result.restored=c.catalogRecords(base).map(r=>r.id);
   // A later deliberate move is versioned and must not be undone by migration.
   c.moveArchive('T-002','X-009',true,base);result.moved=c.catalogRecords(base).map(r=>r.id);result.savedOrder=JSON.parse(localStorage.getItem(key)).order;
  }finally{localStorage.setItem(key,original);}
  return result;
 });
 assert.deepEqual(scenarios.appended.slice(0,8),ids.slice(0,8));assert.equal(scenarios.savedVersion,2);assert.deepEqual(scenarios.created.slice(0,8),ids.slice(0,8));assert.deepEqual(scenarios.deleted,ids);assert.deepEqual(scenarios.restored,scenarios.created);assert(scenarios.moved.indexOf('T-002')>scenarios.moved.indexOf('X-009'));assert.deepEqual(scenarios.moved,scenarios.savedOrder);
 await p.locator('[data-action=close-modal]').click();await p.waitForFunction(()=>!document.querySelector('.modal-backdrop'));
 await p.evaluate(()=>window.rhine.select(0));await p.waitForTimeout(1300);await p.mouse.move(500,380);await p.mouse.wheel(0,120);await p.waitForTimeout(1200);assert.equal(await p.evaluate(()=>window.rhine.stats().selected),'T-002');
 await p.reload();await p.waitForFunction(()=>window.rhine?.stats().ready);assert.deepEqual(await p.evaluate(()=>window.rhine.catalog().map(r=>r.id)),ids);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('instructor-profile-demo-v1')).bio),'保留简介');
 assert.deepEqual(errors,[]);await writeFile(`${out}/checks.json`,JSON.stringify({ids,labels,scenarios,oldOrderMigrated:true,wheelMatches:true,reloadStable:true,profilePreserved:true,errors},null,2));console.log('Old complete catalog order migrates teammates before training; numbering, wheel, reload, later sorting and existing profile passed.');
}finally{await browser.close();}
