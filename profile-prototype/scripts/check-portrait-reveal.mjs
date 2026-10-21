import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const out='qa/portrait-reveal';await mkdir(out,{recursive:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4173/?scene=archive');
 await page.waitForFunction(()=>window.rhine?.stats().ready,null,{timeout:90000});
 await page.evaluate(()=>{window.portraitSamples=[];window.samplePortrait=true;function sample(){if(!window.samplePortrait)return;window.portraitSamples.push(window.rhine.stats());requestAnimationFrame(sample);}sample();});
 await page.locator('[data-action="open"]').first().click();
 await page.waitForFunction(()=>window.rhine.stats().portraitReveal?.phase==='complete',null,{timeout:25000});
 await page.screenshot({path:`${out}/complete.png`});
 const samples=await page.evaluate(()=>{window.samplePortrait=false;return window.portraitSamples.map(s=>({scan:s.decryption.time,intervals:s.decryption.intervals,portrait:s.portraitReveal}));});
 for(const s of samples) if(s.scan<38.84)assert.equal(s.portrait.phase,'hidden');
 for(const phase of ['point','line','opening','complete'])assert.ok(samples.some(s=>s.portrait.phase===phase),phase);
 for(const s of samples.filter(s=>s.portrait.phase==='line'))assert.equal(s.portrait.height,.008);
 for(const s of samples.filter(s=>s.portrait.phase==='opening'))assert.equal(s.portrait.width,1);
 await page.evaluate(async()=>{
  const {ArchiveScene}=await import('/src/rhine/scene.ts');const {qualityPresets}=await import('/src/rhine/render-quality.ts');
  const {fullMotion}=await import('/src/rhine/motion-preferences.ts');
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;z-index:999999';document.body.append(host);
  const s=window.revealProbe=new ArchiveScene(host);await s.load();s.setSuperPerformance(true);s.setQuality(qualityPresets.performance);
  s.setMotion({...fullMotion(),idleWave:false,pointerParallax:false});s.setMode('detail');window.probeTime=0;
 });
 const frames=[];
 for(const [phase,elapsed] of [['hidden',0],['point',.05],['line',.24],['opening',.59],['complete',.9]]){
  const state=await page.evaluate(({phase,elapsed})=>{
   const s=window.revealProbe;
   for(let i=0;i<900;i++){
    s.update(window.probeTime+=1/60);const f=s.getStats();
    if(phase==='hidden'?f.decryption.time>=38.6:f.portraitReveal.elapsed>=Math.min(.86,elapsed))return{...f.portraitReveal,scan:f.decryption.time,uniform:s.portraitSticker.userData.portraitReveal.value.toArray()};
   }throw Error('phase not reached: '+phase);
  },{phase,elapsed});
  assert.equal(state.phase,phase);frames.push(state);
  await page.screenshot({path:`${out}/${phase}.png`});
 }
 const checks=await page.evaluate(async()=>{
  const s=window.revealProbe;
  const {fullMotion}=await import('/src/rhine/motion-preferences.ts');
  s.setMode('archive');s.setMode('detail');s.decryption.select();s.decryption.enter();s.portraitRevealElapsed=0;
  s.setMotion({...fullMotion(),modelDecryption:false});s.update(window.probeTime+=1/60);
  const reduced=s.getStats().portraitReveal;
  const model=await s.createAssemblyModel();const viewer=model.model.getObjectByName('Portrait_Sticker').userData.portraitReveal.value.toArray();model.dispose();
  s.select(1);const clone=s.outgoing.at(-1)?.group.getObjectByName('Portrait_Sticker')?.userData.portraitReveal.value.toArray();
  s.setMode('archive');s.setMode('detail');s.setMotion(fullMotion());s.update(window.probeTime+=1/60);const next=s.getStats().portraitReveal;
  const {decryptionFrame}=await import('/src/rhine/decryption.ts');const {inspectionSegments}=await import('/src/rhine/inspection-overlay.ts');
  const segment=inspectionSegments(decryptionFrame(38.83))[0];const center=segment.map((a,i)=>a.map((v,k)=>(v+segment[1-i][k])/2))[0];
  s.dispose();return{reduced,viewer,clone,next,center};
 });
 assert.equal(checks.reduced.phase,'complete');assert.deepEqual(checks.viewer,[1,1]);assert.deepEqual(checks.clone,[1,1]);assert.equal(checks.next.phase,'hidden');assert.ok(Math.abs(checks.center[0]-.83)<.001);assert.ok(Math.abs(checks.center[1]-1.87)<.001);
 assert.deepEqual(errors,[]);await writeFile(`${out}/checks.json`,JSON.stringify({passed:true,frames,checks,errors},null,2));console.log(JSON.stringify({passed:true,frames,checks,errors},null,2));
}finally{await browser.close();}
