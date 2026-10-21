import { escapeHtml as esc } from './html';

// Keep one saved ISO value, whether it came from typing or the native calendar.
export function normalizeDate(value: string): string | null {
  const text = value.trim();
  if (!text) return '';
  const match = /^(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})\s*日?$/.exec(text)
    || /^(\d{4})(\d{2})(\d{2})$/.exec(text);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  if (year < 1 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function dateField(id: string, name: string, value: string, label: string) {
  return `<input id="${id}" name="${name}" type="text" data-typed-date inputmode="numeric" maxlength="24" value="${esc(value)}" placeholder="年 / 月 / 日" aria-label="${esc(label)}，可直接输入年月日" title="可输入 2026-10-20、2026/10/20 或 20261020">
    <input class="native-date-picker" type="date" value="${normalizeDate(value) || ''}" tabindex="-1" aria-hidden="true">
    <button class="date-picker-button" type="button" data-date-picker aria-label="选择${esc(label)}" title="打开日历"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="1"/><path d="M8 2v6M16 2v6M4 10h16"/></svg></button>`;
}

export function validateDates(form: HTMLFormElement) {
  let valid = true;
  for (const input of form.querySelectorAll<HTMLInputElement>('[data-typed-date]')) {
    const normalized = normalizeDate(input.value);
    input.setCustomValidity(normalized === null ? '请输入有效日期，例如 2026-10-20。' : '');
    input.setAttribute('aria-invalid', String(normalized === null));
    if (normalized === null) valid = false;
    else input.value = normalized;
  }
  return valid;
}

export function bindDateFields() {
  document.addEventListener('input', event => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.matches('[data-typed-date]')) {
      input.setCustomValidity('');
      input.removeAttribute('aria-invalid');
    }
  });
  document.addEventListener('click', event => {
    const button = (event.target as Element).closest('[data-date-picker]');
    if (!button) return;
    event.preventDefault();
    const wrapper = button.parentElement!;
    const typed = wrapper.querySelector<HTMLInputElement>('[data-typed-date]')!;
    const picker = wrapper.querySelector<HTMLInputElement>('.native-date-picker')!;
    picker.value = normalizeDate(typed.value) || '';
    try { picker.showPicker(); } catch { typed.focus(); }
  });
  document.addEventListener('change', event => {
    const picker = event.target;
    if (!(picker instanceof HTMLInputElement) || !picker.matches('.native-date-picker')) return;
    const typed = picker.parentElement!.querySelector<HTMLInputElement>('[data-typed-date]')!;
    typed.value = picker.value;
    typed.dispatchEvent(new Event('input', { bubbles: true }));
    typed.focus();
  });
}
