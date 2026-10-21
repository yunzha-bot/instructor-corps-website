import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const out = process.argv[2] ?? 'qa/disc';
await mkdir(out,{recursive:true});
const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/?scene=archive');
 await page.waitForFunction(()=>window.rhine?.stats().ready,null,{timeout:90000});
 await page.locator('[data-action="open"]').first().click();
 await page.waitForFunction(()=>window.rhine.stats().decryption.phase==='clear'&&window.rhine.stats().portraitReveal?.phase==='complete'&&document.querySelectorAll('.document-redaction-window').length===0,null,{timeout:35000});
 await page.screenshot({path:`${out}/detail.png`});
 const pose = await page.evaluate(() => window.rhine.stats());
 const x = Math.max(100, Math.min(650, (pose.topLeft[0] + pose.topRight[0]) / 2));
 const y = Math.max(250, Math.min(600, pose.topLeft[1] + 180));
 await page.mouse.move(x,y); await page.mouse.down();
 await page.mouse.move(x+100,y,{steps:15}); await page.mouse.up();
 await page.waitForTimeout(150);
 assert.ok(Math.abs((await page.evaluate(() => window.rhine.stats())).rotation - pose.rotation) > .01);
 await page.screenshot({path:`${out}/drag.png`});
 await page.locator('[data-action="model-viewer"]').click();
 await page.waitForFunction(()=>!document.querySelector('.model-viewer').hidden&&document.querySelector('.viewer-loading').hidden,null,{timeout:30000});
 await page.waitForTimeout(1200);
 await page.screenshot({path:`${out}/viewer.png`});
 await page.locator('[data-viewer="close"]').click();
 const result=await page.evaluate(async()=>{
  const {ArchiveScene}=await import('/src/rhine/scene.ts');
  const {isReplacedInterior}=await import('/src/rhine/archive-disc.ts');
  const {reducedMotion}=await import('/src/rhine/motion-preferences.ts');
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;visibility:hidden';document.body.append(host);
  const s=new ArchiveScene(host);await s.load();s.setMotion(reducedMotion());s.setMode('detail');
  for(let i=0;i<120;i++)s.update(i/60);
  const surfaces=g=>g.children.map(m=>m.userData.surface).filter(Boolean);
  const selected=surfaces(s.model);
  s.select(1);const clones=s.outgoing.map(o=>surfaces(o.group));
  const assembly=await s.createAssemblyModel();
  const assembled=surfaces(assembly.model);
  const replaced=assembly.model.children.filter(m=>!m.userData.surface?.startsWith('Disc_')&&isReplacedInterior(m.userData.assemblyPart,m.userData.surface)).length;
  const portrait=s.model.getObjectByName('Portrait_Sticker');
  const r={selected,clones,assembled,replaced,labelLast:!s.model.children.at(-1).userData.surface,
   portrait:portrait?{parent:portrait.parent===s.model,z:portrait.position.z,tilt:portrait.rotation.z,
    texture:!!portrait.material.map?.image?.width,assemblyPart:assembly.model.getObjectByName('Portrait_Sticker')?.userData.assemblyPart}:null};
  assembly.dispose();s.dispose();host.remove();return r;
 });
 const check=surfaces=>{for(const n of ['Disc_Body','Disc_Recording','Disc_Hub','Portrait_Sticker'])assert.ok(surfaces.includes(n));assert.ok(!surfaces.includes('Subsurface_Optics'));assert.ok(!surfaces.includes('Amber_Optical_Inlay'));};
 check(result.selected);check(result.assembled);assert.ok(result.clones.length>0);result.clones.forEach(check);assert.equal(result.replaced,0);assert.ok(result.labelLast);assert.deepEqual(errors,[]);
 assert.ok(result.portrait.parent && result.portrait.texture && result.portrait.z > .2464 && result.portrait.tilt !== 0);
 assert.equal(result.portrait.assemblyPart,'cover');
 await writeFile(`${out}/checks.json`,JSON.stringify({passed:true,...result,errors},null,2));console.log(JSON.stringify({passed:true,...result,errors}));
} finally {await browser.close();}
