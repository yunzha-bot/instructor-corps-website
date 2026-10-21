import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const out='qa/directory-order';await mkdir(out,{recursive:true});
try {
 const p=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{rollingNumbers:false}})));
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready,{timeout:90000});
 const mapping=await p.evaluate(async()=>{const d=await import('/src/rhine/data.ts');const loop=await import('/src/rhine/archive-loop.ts');return {ids:d.records.map(r=>r.id),categories:d.categories.slice(1),columns:d.archiveColumns,walk:Array.from({length:d.records.length+1},(_,step)=>{const result=loop.sequentialWheelCell({lane:0,row:12},12+step);return d.records[result.index].id;}),reverse:loop.sequentialWheelCell({lane:0,row:12},11).index};});
 assert.deepEqual(mapping.columns,mapping.categories);assert.deepEqual(mapping.walk,[...mapping.ids,mapping.ids[0]]);assert.equal(mapping.reverse,mapping.ids.length-1);
 const cases=[];
 async function state(){return p.evaluate(()=>({file:window.rhine.stats().selected,position:document.querySelector('#selected-number').innerText.split('\n')[0],total:document.querySelector('.count-total').textContent,ticks:document.querySelectorAll('.file-ticks button').length}));}
 for(const index of mapping.ids.map((_,i)=>i).filter(i=>i===mapping.ids.length-1||(i+1)%8===0)){
  await p.evaluate(i=>window.rhine.select(i),index);await p.waitForTimeout(1800);
  const before=await state();assert.equal(before.position,String(index+1).padStart(2,'0'));
  await p.mouse.move(500,380);await p.mouse.wheel(0,120);await p.waitForTimeout(1200);
  const down=await state();const next=(index+1)%mapping.ids.length;assert.equal(down.file,mapping.ids[next]);assert.equal(down.position,String(next+1).padStart(2,'0'));assert.equal(down.total,String(mapping.ids.length));assert.equal(down.ticks,8);
  await p.mouse.wheel(0,-120);await p.waitForTimeout(1200);const up=await state();assert.equal(up.file,before.file);
  cases.push({before,down,up});
 }
 await p.evaluate(()=>window.rhine.select(7));await p.waitForTimeout(1600);await p.locator('[data-action=next]').click();await p.waitForTimeout(1000);const button=await state();assert.equal(button.file,mapping.ids[8]);
 await p.screenshot({path:`${out}/after-boundary.png`});
 assert.deepEqual(errors,[]);await writeFile(`${out}/checks.json`,JSON.stringify({mapping,cases,button,errors},null,2));console.log('Directory order, all category boundaries, reverse, total and segmented ticks passed.');
} finally {await browser.close();}
