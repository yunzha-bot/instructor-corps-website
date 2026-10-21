/** Offline caching is intentionally disabled for this frontend-only prototype. */
export function pwaSettingsMarkup() {
  return `<section class="pwa-settings"><h3>LOCAL PROTOTYPE / 本地原型</h3><p>未启用离线缓存与真实认证；请仅使用演示资料。</p></section>`;
}
export async function initPwa(_notify: (message: string) => void) {}
