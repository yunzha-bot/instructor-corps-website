import { normalizeQuality, qualityPresets, type RenderQuality } from "./render-quality";
import type { WallpaperProperties } from "./wallpaper";

export const superPerformanceQuality: RenderQuality = { ...qualityPresets.performance };

export function wallpaperQuality(props: WallpaperProperties, fallback: RenderQuality): RenderQuality {
  const preset = props.renderquality?.value;
  if (typeof preset === "string" && Object.hasOwn(qualityPresets, preset))
    return { ...qualityPresets[preset as keyof typeof qualityPresets] };
  if (preset !== "custom") return fallback;
  const custom: Record<string, unknown> = {};
  for (const key of Object.keys(qualityPresets.original)) {
    const value = props[`quality${key.toLowerCase()}`]?.value;
    if (value === undefined) continue;
    custom[key] = key === "antialias" ? value : typeof value === "string" ? Number(value) : value;
  }
  return normalizeQuality(custom);
}
