import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { matchingPreset, qualityPixelBudgets, renderDimensions, type RenderQuality } from "./render-quality";

export function applyTextureQuality(
  root: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  quality: RenderQuality,
) {
  const maximum = Math.min(
    quality.anisotropy,
    renderer.capabilities.getMaxAnisotropy(),
  );
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture && !value.isRenderTargetTexture)
          textures.add(value);
      }
    }
  });
  for (const texture of textures) {
    if (texture.anisotropy === maximum) continue;
    texture.anisotropy = maximum;
    texture.needsUpdate = true;
  }
}

export function resizeQuality(
  renderer: THREE.WebGLRenderer,
  composer: EffectComposer,
  host: HTMLElement,
  quality: RenderQuality,
  superPerformance = false,
) {
  const width = Math.max(1, host.clientWidth),
    height = Math.max(1, host.clientHeight);
  const supersampling = superPerformance ? 1 : quality.supersampling;
  const preset = matchingPreset(quality);
  const pixelBudget = superPerformance ? qualityPixelBudgets.performance
    : preset === "custom" ? 4_000_000 : qualityPixelBudgets[preset];
  const dimensions = renderDimensions(
    { ...quality, scale: quality.scale * supersampling },
    width,
    height,
    host.getBoundingClientRect().width / width,
    devicePixelRatio,
    renderer.capabilities.maxTextureSize,
    pixelBudget,
  );
  renderer.setPixelRatio(dimensions.ratio);
  renderer.setSize(width, height);
  // The renderer's antialias flag only covers the default framebuffer. Beauty
  // is drawn offscreen through EffectComposer, so it needs its own MSAA storage.
  // Bound memory on large buffers; SMAA and super-performance keep their paths.
  const samples = quality.antialias === "off" && !superPerformance
    ? Math.min(renderer.capabilities.maxSamples,
        dimensions.width * dimensions.height > 4_000_000 ? 2 : 4)
    : 0;
  for (const target of [composer.renderTarget1, composer.renderTarget2]) {
    if (target.samples === samples) continue;
    target.dispose();
    target.samples = samples;
  }
  composer.setPixelRatio(dimensions.ratio);
  composer.setSize(width, height);
  // The low tier's array is opaque. Its only refractive subject is the opened
  // file: a quarter-size capture breaks it into crawling blocks during drag.
  // Improve only that small capture, retaining the low full-frame pixel budget.
  const transmission = superPerformance ? Math.max(.5, quality.transmission) : quality.transmission;
  renderer.transmissionResolutionScale = transmission;
  host.dataset.renderQuality = JSON.stringify({
    ...dimensions,
    antialias: quality.antialias,
    samples,
    supersampling,
    pixelBudget,
    transmission,
    anisotropy: Math.min(
      quality.anisotropy,
      renderer.capabilities.getMaxAnisotropy(),
    ),
    superPerformance,
  });
  return dimensions;
}

export function createViewerPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const composer = new EffectComposer(renderer);
  const smaa = new SMAAPass();
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(smaa);
  composer.addPass(new OutputPass());
  return { composer, smaa };
}
