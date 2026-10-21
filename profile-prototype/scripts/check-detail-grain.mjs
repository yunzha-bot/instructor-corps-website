// Regression: real inner-plate reveal under rotation, without unrelated glass.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { PNG } = require('C:/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
await mkdir('qa/detail-grain', { recursive: true });
try {
 const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
 await page.addInitScript(() => { const raf = requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => cb.name === 'frame' ? 0 : raf(cb); });
 await page.goto('http://127.0.0.1:4173/?scene=archive');
 await page.waitForFunction(() => window.rhine?.stats().ready, { timeout: 90000 });
 await page.evaluate(async () => {
  const { ArchiveScene } = await import('/src/rhine/scene.ts');
  const { qualityPresets } = await import('/src/rhine/render-quality.ts');
  const { reducedMotion } = await import('/src/rhine/motion-preferences.ts');
  const THREE = await import('/node_modules/.vite/deps/three.js');
  window.normalBlend = THREE.NormalBlending;
  window.probePresets = qualityPresets;
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset:0;z-index:999999'; document.body.append(host);
  const s = window.grainProbe = new ArchiveScene(host); await s.load();
  s.setQuality(qualityPresets.high); s.setMotion(reducedMotion()); s.setMode('detail');
  for (let i = 0; i < 160; i++) s.update(i / 60);
  s.appearance.setClarity(s.model, 0);
  // Minimise to the real flat inner plate. Refraction, ring parallax and edges
  // otherwise mix expected image changes into a stochastic-mask noise metric.
  for (const mesh of s.model.children) mesh.visible = mesh.userData.surface === 'Internal_Ceramic';
  for (const mesh of s.instances) mesh.visible = false;
  s.scene.getObjectByName('archive-floor').visible = false;
 });
 const results = [];
 for (const variant of ['legacy-mask', 'production']) {
  await page.evaluate(variant => {
   const s = window.grainProbe;
   s.setSuperPerformance(true); s.setQuality(window.probePresets.performance);
   s.camera.near = 5; s.camera.updateProjectionMatrix();
   s.renderer.transmissionResolutionScale = .5;
   s.appearance.apply(s.model, .5); s.appearance.setClarity(s.model, .5);
   s.scene.traverse(o => { if (!o.material) return; const m = o.material;
    m.userData.grainHooks ??= [m.onBeforeCompile, m.customProgramCacheKey, m.blending];
    const [before, key, blending] = m.userData.grainHooks;
    if(o.userData.surface==='Internal_Ceramic')m.blending = variant === 'legacy-mask' ? window.normalBlend : blending;
    m.onBeforeCompile = function(shader, renderer) { before.call(this, shader, renderer);
     if (variant === 'legacy-mask') shader.fragmentShader = shader.fragmentShader.replace('diffuseColor.a *= archiveQuality;', 'float coverage = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); if (archiveQuality <= coverage) discard;');
    }; m.customProgramCacheKey = () => key.call(m) + variant; m.needsUpdate = true;
   });
  }, variant);
  const samples = [];
  for (let i = 0; i < 6; i++) {
   const points = await page.evaluate(i => {
    const s = window.grainProbe; s.model.rotation.y = .55 + (i - 2.5) * .004;
    s.scene.updateMatrixWorld(true); s.renderer.shadowMap.needsUpdate = true; s.renderer.render(s.scene,s.camera);
    const p = [];
    for (let x = -2.15; x < 2.2; x += .06) for (let y = .4; y < 3.3; y += .06) p.push(s.projectCard(x, y));
    return p;
   }, i);
   const bytes = await page.screenshot(); const png = PNG.sync.read(bytes);
   if (i === 2) await writeFile(`qa/detail-grain/${variant}.png`, bytes);
   samples.push(points.map(([x,y]) => {
    if (x < 1 || x > png.width-2 || y < 1 || y > png.height-2) return null;
    const at = (dx,dy) => png.data[((Math.floor(y)+dy)*png.width+Math.floor(x)+dx)*4];
    const a = x-Math.floor(x), b = y-Math.floor(y);
    return at(0,0)*(1-a)*(1-b)+at(1,0)*a*(1-b)+at(0,1)*(1-a)*b+at(1,1)*a*b;
   }));
  }
  let change=0, spikes=0, count=0;
  for (let i=1;i<samples.length;i++) for(let j=0;j<samples[i].length;j++) {
   const a=samples[i-1][j],b=samples[i][j]; if(a===null||b===null)continue;
   const d=Math.abs(a-b); change+=d; if(d>5)spikes++; count++;
  }
  const result={variant,meanChange:change/count,spikes,count}; results.push(result); console.log(result);
 }
 await writeFile('qa/detail-grain/diagnosis.json', JSON.stringify(results,null,2));
 assert.ok(results[1].spikes < results[0].spikes * .5, 'Smooth coverage must halve grain spikes during model movement');
} finally { await browser.close(); }
