import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),out='qa/field-text-reveal';await mkdir(out,{recursive:true});
const result={},errors=[];
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{rollingNumbers:false,idleWave:false,pointerParallax:false}}));
  localStorage.setItem('instructor-profile-demo-v1',JSON.stringify({nickname:'演示队员 01',bio:'',team:'11',cohort:'24',joined:'2026-10-20',role:'队员'}));
  localStorage.setItem('corps-inline-records-demo-v1',JSON.stringify({'X-002':{overview:{intro:'这是一段自动换行的介绍，用于核对每行文字的遮挡宽度。'.repeat(9)+'\n第二段内容。',interests:'阅读与训练'}},'X-003':{overview:{goal:'训练目标',date:'',status:'进行中',steps:'具体行动'}}}));
 });
 await p.goto('http://127.0.0.1:4173/?scene=archive');await p.waitForFunction(()=>window.rhine?.stats().ready);await p.evaluate(()=>window.rhine.detail());
 await p.waitForFunction(()=>window.rhine.stats().decryption.phase==='joining');
 const counts=await p.evaluate(()=>({title:document.querySelector('h2').querySelectorAll('.document-redaction-window').length,tabs:document.querySelector('.detail-tabs').querySelectorAll('.document-redaction-window').length,labels:document.querySelectorAll('.record-field>span:first-child .document-redaction-window').length,values:document.querySelectorAll('.editor-control>.document-redaction-window').length,footer:document.querySelectorAll('.inline-record-footer .document-redaction-window').length}));
 assert(counts.title&&counts.tabs===3&&counts.labels===5&&counts.values===5&&counts.footer>=2);result.coverage=counts;
 assert.equal(await p.locator('.date-picker-button .document-redaction-window').count(),1);result.calendarIconCovered=true;
 await p.screenshot({path:`${out}/actual-waiting.png`});
 await p.locator('[name=team]').click();await p.locator('[name=team]').fill('11');
 await p.waitForFunction(()=>!document.querySelector('[name=team]').parentElement.querySelector('.document-redaction-window'));
 assert(await p.locator('[name=cohort]').locator('..').locator('.document-redaction-window').count()>0);await p.locator('[name=team]').blur();result.earlyTypingUnmasked=true;
 await p.waitForFunction(()=>window.rhine.stats().decryption.phase==='clear');await p.waitForTimeout(1300);assert.equal(await p.locator('.document-redaction-window').count(),0);
 assert.equal(await p.locator('[name=team]').inputValue(),'11');
 // Compare the previous implementation with this one at the same settled scene.
 await p.evaluate(async()=>{const {DocumentDecryption}=await import('/backups/before-field-text-reveal-20261020/document-decryption.ts');window.textProbe=new DocumentDecryption();window.textProbe.reset(document.querySelector('#detail-content'),false);});
 await p.screenshot({path:`${out}/before.png`});
 await p.evaluate(async()=>{window.textProbe.reset(document.querySelector('#detail-content'),true);const {DocumentDecryption}=await import('/src/rhine/document-decryption.ts');window.textProbe=new DocumentDecryption();window.textProbe.reset(document.querySelector('#detail-content'),false);});
 assert.equal(await p.locator('.detail-tabs button').evaluateAll(es=>es.every(e=>e.querySelector('.document-redaction-window').getBoundingClientRect().left<=e.getBoundingClientRect().left+1)),true,'Tab numbering must be covered too, without inheriting the caption margin');
 await p.screenshot({path:`${out}/covered.png`});
 const phases=[];
 for(const [name,t]of [['left-revealed',.32],['mostly-revealed',.6],['clear',1]]){
  await p.evaluate(t=>{const f=window.rhine.stats().decryption;window.textProbe.update(0,f,false);window.textProbe.update(t,f,false);},t);
  phases.push(await p.locator('.editor-control>.document-redaction-window').first().evaluate(e=>({window:e.getBoundingClientRect().toJSON(),ink:e.firstElementChild.getBoundingClientRect().toJSON()})).catch(()=>null));
  await p.screenshot({path:`${out}/${name}.png`});
 }
 assert(phases[0].ink.left>phases[0].window.left);assert(phases[1].ink.left>phases[0].ink.left);assert.equal(phases[2],null);result.phases=phases;
 await p.locator('[name=team]').click();await p.locator('[name=team]').fill('新分队');await p.locator('.inline-record-form [type=submit]').click();assert.equal(await p.locator('.document-redaction-window').count(),0);result.noReplayOnEdit=true;
 await p.locator('[data-action=back]').click();await p.waitForTimeout(1100);await p.evaluate(()=>{window.rhine.select(1);window.rhine.detail();});await p.waitForFunction(()=>window.rhine.stats().decryption.phase==='clear');await p.waitForTimeout(1200);
 await p.evaluate(()=>window.textProbe.reset(document.querySelector('#detail-content'),false));
 const multiline=await p.locator('[name=intro]').locator('..').locator('.document-redaction-window').count();assert(multiline>1);result.multilineMasks=multiline;
 await p.screenshot({path:`${out}/multiline.png`});
 await p.locator('[name=intro]').click();await p.locator('[name=intro]').fill('提前填写也不受遮挡影响');await p.evaluate(()=>window.textProbe.update(0,window.rhine.stats().decryption,false));assert.equal(await p.locator('[name=intro]').locator('..').locator('.document-redaction-window').count(),0);
 await p.evaluate(()=>window.textProbe.reset(document.querySelector('#detail-content'),true));
 await p.locator('[data-tab=history]').click();await p.evaluate(()=>window.textProbe.reset(document.querySelector('#detail-content'),false));
 assert.equal(await p.locator('.document-field-label .document-redaction-window').count(),2);assert.equal(await p.locator('.editor-control>.document-redaction-window').count(),2);await p.screenshot({path:`${out}/documents.png`});
 await p.evaluate(()=>window.textProbe.reset(document.querySelector('#detail-content'),true));
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);await p.locator('[data-tab=overview]').click();await p.evaluate(()=>window.textProbe.reset(document.querySelector('#detail-content'),false));await p.screenshot({path:`${out}/mobile.png`});assert.equal(await p.locator('#detail-content').evaluate(e=>e.scrollWidth>e.clientWidth),false);
 await p.evaluate(()=>window.textProbe.update(0,window.rhine.stats().decryption,true));assert.equal(await p.locator('.document-redaction-window').count(),0);result.reducedClearsAll=true;
 // Disabled document reveal remains immediately readable in the real app.
 const q=await browser.newPage();await q.addInitScript(()=>localStorage.setItem('rhine-settings',JSON.stringify({renderingVersion:4,motion:{modelDecryption:false,documentReveal:false}})));await q.goto('http://127.0.0.1:4173/?scene=archive');await q.waitForFunction(()=>window.rhine?.stats().ready);await q.evaluate(()=>window.rhine.detail());await q.waitForTimeout(1000);assert.equal(await q.locator('.document-redaction-window').count(),0);await q.close();
 assert.deepEqual(errors,[]);result.errors=errors;await writeFile(`${out}/checks.json`,JSON.stringify(result,null,2));console.log('Tabs, labels, native values/placeholders, multiline fields and save text share the title wipe; editing and reduced motion passed.');
}finally{await browser.close();}
