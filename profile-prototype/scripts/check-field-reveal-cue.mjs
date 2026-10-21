import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='qa/field-reveal-cue';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{rollingNumbers:false,idleWave:false,pointerParallax:false}})));
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready);
 await p.evaluate(()=>{
  window.cueSamples=[];
  function sample(){
   const s=window.rhine.stats(),rule=document.querySelector('.editor-rule');
   if(rule&&s.mode==='detail')window.cueSamples.push({time:s.decryption.time,phase:s.decryption.phase,opacity:Number(getComputedStyle(rule).opacity),width:rule.getBoundingClientRect().width,host:rule.parentElement.getBoundingClientRect().width,state:document.querySelector('#detail-content').dataset.editorReveal});
   requestAnimationFrame(sample);
  }sample();window.rhine.detail();
 });
 await p.waitForFunction(()=>window.rhine.stats().decryption.time>35&&window.rhine.stats().decryption.time<36.04);
 await p.screenshot({path:`${out}/${process.argv[2]==='before'?'before':'waiting'}.png`});
 const waiting=await p.locator('.editor-rule').first().evaluate(e=>Number(getComputedStyle(e).opacity));
 assert.equal(waiting,0,'No right field lines until the left scan segments have joined');
 await p.waitForFunction(()=>document.querySelector('#detail-content').dataset.editorReveal==='ready');
 const phases=[];
 for(const [name,t]of [['point',130],['extending',280],['line',560]]){
  await p.locator('.editor-rule').evaluateAll((es,time)=>es.forEach(e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=time;})),t);
  await p.locator('.inline-record-footer [type=submit]').evaluate((e,time)=>e.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=time;}),t);
  phases.push(await p.locator('.editor-rule').first().evaluate(e=>({width:e.getBoundingClientRect().width,host:e.parentElement.getBoundingClientRect().width,opacity:Number(getComputedStyle(e).opacity)})));
  await p.screenshot({path:`${out}/${name}.png`});
 }
 assert(phases[0].width<4);assert(phases[1].width>phases[0].width&&phases[1].width<phases[2].width);assert(Math.abs(phases[2].width-phases[2].host)<1);
 const field=p.locator('[name=team]'),rule=field.locator('..').locator('.editor-rule');
 const read=()=>rule.evaluate(e=>({width:e.getBoundingClientRect().width,color:getComputedStyle(e).backgroundColor,animations:e.getAnimations().map(a=>({start:a.startTime,time:a.currentTime}))}));
 await p.mouse.move(600,100);const idle=await read();
 await field.hover();await p.waitForTimeout(240);const hover=await read();assert.notEqual(hover.color,idle.color);
 await field.click();await p.mouse.move(600,100);await p.waitForTimeout(240);const focused=await read();
 assert.equal(focused.color,hover.color);assert.equal(focused.width,idle.width);assert.deepEqual(focused.animations,idle.animations,'Focusing must not restart a geometry animation');
 await field.fill('输入仍正常');assert.equal(await field.inputValue(),'输入仍正常');await p.screenshot({path:`${out}/focused.png`});
 await p.locator('[name=role]').click();await p.mouse.move(600,100);await p.waitForTimeout(240);const blurred=await read();assert.equal(blurred.color,idle.color);assert.equal(blurred.width,idle.width);assert.deepEqual(blurred.animations,idle.animations);
 const samples=await p.evaluate(()=>window.cueSamples);
 assert(samples.some(s=>s.phase==='joining'));assert(samples.filter(s=>s.time<36.04).every(s=>s.opacity===0));
 assert(samples.some(s=>s.time>=36.04&&s.opacity>0));
 await p.waitForFunction(()=>window.rhine.stats().decryption.phase==='clear');
 await p.locator('[data-action=back]').click();await p.waitForTimeout(1200);await p.evaluate(()=>{window.rhine.select(1);window.rhine.detail();});
 await p.waitForFunction(()=>window.rhine.stats().decryption.phase==='joining');assert.equal(await p.locator('.editor-rule').first().evaluate(e=>Number(getComputedStyle(e).opacity)),0);
 await p.waitForFunction(()=>document.querySelector('#detail-content').dataset.editorReveal==='ready');
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(700);await p.screenshot({path:`${out}/mobile.png`});assert.equal(await p.locator('#detail-content').evaluate(e=>e.scrollWidth>e.clientWidth),false);
 // No scan to wait for when model animation is off; reduced surfaces show completed lines.
 const fallbacks=[];
 for(const motion of [{modelDecryption:false,documentReveal:false},{modelDecryption:true,surfaceTransitions:false}]){
  const q=await browser.newPage({viewport:{width:1440,height:900}});
  await q.addInitScript(m=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:m})),motion);
  await q.goto('http://127.0.0.1:4173/?scene=archive');await q.waitForFunction(()=>window.rhine?.stats().ready);await q.evaluate(()=>window.rhine.detail());await q.waitForTimeout(1400);
  const state=await q.locator('.editor-rule').first().evaluate(e=>({opacity:getComputedStyle(e).opacity,state:document.querySelector('#detail-content').dataset.editorReveal,animations:e.getAnimations().length}));
  assert.equal(state.opacity,'1');assert.equal(state.state,motion.surfaceTransitions===false?'static':'ready');fallbacks.push(state);await q.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/checks.json`,JSON.stringify({waiting,phases,idle,hover,focused,blurred,fallbacks,samples,errors},null,2));console.log('Scan joins → right dot/line reveal; hover/focus color only; re-entry, mobile and motion fallbacks passed.');
} finally {await browser.close();}
