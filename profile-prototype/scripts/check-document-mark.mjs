import assert from 'node:assert/strict';
import{createRequire}from'node:module';import{mkdir,writeFile}from'node:fs/promises';
const require=createRequire(import.meta.url);const{chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});const out='qa/document-mark-growth';await mkdir(out,{recursive:true});const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:900}});page.on('pageerror',e=>errors.push(e.message));
 let release;const gate=new Promise(r=>release=r);
 await page.route('**/assets/archive-assembly.glb',async route=>{await gate;await route.continue();});
 await page.goto('http://127.0.0.1:4173/?scene=archive',{waitUntil:'domcontentloaded'});
 await page.locator('.loading-mark .document-mark').waitFor();
 const frames=[];
 for(const[name,time]of[['point',150],['line',620],['thickening',1000],['complete',1500]]){
  const frame=await page.locator('.loading-mark .document-mark').evaluate((svg,time)=>{for(const a of svg.getAnimations({subtree:true})){a.pause();a.currentTime=time;}
   const style=n=>getComputedStyle(svg.querySelector(n));const matrix=new DOMMatrix(style('.doc-sheet').transform);return{face:+style('.doc-face').opacity,opacity:+style('.doc-sheet').opacity,width:matrix.a,height:matrix.d,mass:+style('.doc-mass').opacity,clip:style('.doc-face').clipPath};},time);
  await page.screenshot({path:`${out}/${name}.png`});frames.push({name,...frame});
 }
 assert.equal(frames[0].width,.06);assert.equal(frames[0].height,.045);assert.equal(frames[1].width,.06);assert.equal(frames[1].height,1);assert.ok(frames[2].width>.06&&frames[2].width<1);assert.equal(frames[2].height,1);assert.equal(frames[3].width,1);assert.equal(frames[3].mass,0);for(const f of frames){assert.equal(f.face,1);assert.equal(f.clip,'none');}
 assert.equal(await page.locator('.loading-mark').getByText('INSTRUCTOR CORPS').count(),1);
 const oldMarks=await page.locator('svg path').evaluateAll(paths=>paths.filter(p=>p.getAttribute('d')?.includes('M156 75C')||p.getAttribute('d')?.includes('M295 73C')).length);assert.equal(oldMarks,0);
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.locator('.loading-mark .doc-sheet').evaluate(el=>getComputedStyle(el).animationName);assert.equal(reduced,'none');await page.emulateMedia({reducedMotion:'no-preference'});
 release();await page.waitForFunction(()=>window.rhine?.stats().ready,null,{timeout:90000});
 await page.evaluate(()=>window.rhine.seek(10.5));await page.waitForTimeout(1500);await page.screenshot({path:`${out}/boot.png`});
 const boot=await page.locator('.boot-logo .document-mark').getAttribute('data-animate');assert.notEqual(boot,null);
 await page.evaluate(()=>window.rhine.archive());await page.locator('[data-action="open"]').first().click();await page.waitForFunction(()=>window.rhine.stats().portraitReveal?.phase==='complete',null,{timeout:30000});
 await page.screenshot({path:`${out}/label.png`});
 const mark=await page.evaluate(async()=>{const{labelMarkSvg}=await import('/src/rhine/brand.ts');return labelMarkSvg;});assert.ok(mark.includes('doc-face'));assert.ok(!mark.includes('M156 75C'));
 const fav=await page.request.get('http://127.0.0.1:4173/icons/app-icon.svg');assert.ok((await fav.text()).includes('M160 112'));
 assert.deepEqual(errors,[]);console.log({passed:true,frames,oldMarks,boot,reduced,errors});await writeFile(`${out}/checks.json`,JSON.stringify({passed:true,frames,oldMarks,boot,reduced,errors},null,2));
}finally{await browser.close();}
