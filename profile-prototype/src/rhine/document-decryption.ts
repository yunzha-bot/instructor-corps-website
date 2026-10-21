import type { DecryptionFrame } from "./decryption";

type TextControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Cover = { window: HTMLElement; ink: HTMLElement; order: number; control?: TextControl };

// Native form values are not text nodes. Measure a temporary, invisible copy
// using the control's own typography; the real editable control stays in place.
function controlText(control: TextControl) {
  const style = getComputedStyle(control);
  const mirror = document.createElement('div');
  const text = control instanceof HTMLSelectElement ? control.selectedOptions[0]?.textContent || '' : control.value || control.placeholder;
  mirror.textContent = text;
  Object.assign(mirror.style, {
    position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
    left: `${control.offsetLeft - control.scrollLeft}px`, top: `${control.offsetTop - control.scrollTop}px`,
    width: `${control.offsetWidth}px`, height: `${control.offsetHeight}px`,
    boxSizing: style.boxSizing, padding: style.padding, border: style.border,
    font: style.font, letterSpacing: style.letterSpacing, textAlign: style.textAlign,
    whiteSpace: control instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre',
    overflowWrap: 'break-word',
  });
  if (!control.value && !(control instanceof HTMLSelectElement)) mirror.style.fontWeight = getComputedStyle(control, '::placeholder').fontWeight;
  control.parentElement!.append(mirror);
  return mirror;
}

/** Decorative redaction, driven by the physical archive's reveal cue. */
export class DocumentDecryption {
  private root: HTMLElement | null = null;
  private covers: Cover[] = [];
  private started: number | null = null;
  private progress = 0;

  reset(root: HTMLElement, clear: boolean) {
    this.remove();
    this.root = root;
    this.started = null;
    this.progress = clear ? 1 : 0;
    this.refresh();
  }

  refresh() {
    this.remove();
    if (!this.root || this.progress === 1) return;
    // Measure text fragments, including wrapped lines, without splitting or
    // replacing the actual text. Stage scaling cancels out in local coordinates.
    const targets = this.root.querySelectorAll<HTMLElement>(
      "h2, .detail-title-cn, .metadata dd, .tab-panel p, .research-notes li, .log-row, .member-profile dt, .member-profile dd, .member-section > summary" +
      (this.root.classList.contains('editable-dossier') ? ', .detail-tabs button, .record-field > span:first-child, .dossier-document-inline > label > .document-field-label, .inline-record-footer [role=status], .inline-record-footer button, .inline-document summary, .editor-control input:not([type=hidden]):not(.native-date-picker), .editor-control textarea, .editor-control select, .date-picker-button' : ''),
    );
    targets.forEach((target) => {
      const control = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement ? target : undefined;
      if (control === document.activeElement) return;
      const host = control ? control.parentElement! : target;
      host.classList.add("document-redacted");
      const bounds = host.getBoundingClientRect();
      const scale = bounds.width / host.offsetWidth;
      if (!scale || !Number.isFinite(scale)) return;
      const measured = control ? controlText(control) : target;
      const clip = control?.getBoundingClientRect();
      const walker = document.createTreeWalker(measured, NodeFilter.SHOW_TEXT);
      const lines: { x: number; y: number; right: number; bottom: number }[] = [];
      const icon = target.matches('.date-picker-button') ? target.querySelector('svg') : null;
      if (icon) {
        const rect = icon.getBoundingClientRect();
        lines.push({ x: (rect.left - bounds.left) / scale, y: (rect.top - bounds.top) / scale,
          right: (rect.right - bounds.left) / scale, bottom: (rect.bottom - bounds.top) / scale });
      }
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (!rect.width || !rect.height) continue;
          const x = (Math.max(rect.left, clip?.left ?? rect.left) - bounds.left) / scale;
          const y = (Math.max(rect.top, clip?.top ?? rect.top) - bounds.top) / scale;
          const right = (Math.min(rect.right, clip?.right ?? rect.right) - bounds.left) / scale;
          const bottom = (Math.min(rect.bottom, clip?.bottom ?? rect.bottom) - bounds.top) / scale;
          if (right <= x || bottom <= y) continue;
          const line = lines.find((entry) => Math.abs(entry.y - y) < 6);
          if (line) {
            line.x = Math.min(line.x, x);
            line.y = Math.min(line.y, y);
            line.right = Math.max(line.right, right);
            line.bottom = Math.max(line.bottom, bottom);
          } else lines.push({ x, y, right, bottom });
        }
      }
      if (control) measured.remove();
      for (const line of lines) {
        const window = document.createElement("span");
        window.className = "document-redaction-window";
        window.setAttribute("aria-hidden", "true");
        const left = Math.max(0, line.x - 1);
        const right = Math.min(host.clientWidth, line.right + 1);
        window.style.cssText = `margin:0;padding:0;left:${left}px;top:${line.y - 1}px;width:${right - left}px;height:${line.bottom - line.y + 2}px`;
        const ink = document.createElement("span");
        ink.className = "document-redaction-ink";
        // Tab captions style descendant spans; decoration must not inherit that gap.
        ink.style.margin = '0';
        window.append(ink);
        host.append(window);
        this.covers.push({ window, ink, order: this.covers.length, control });
      }
    });
    this.paint();
  }

  update(now: number, frame: DecryptionFrame, reduced: boolean) {
    // A user can begin typing before the reveal cue; do not mask their input.
    for (const cover of this.covers)
      if (cover.control === document.activeElement) cover.window.remove();
    if (!this.root || this.progress === 1) return;
    if (reduced) this.progress = 1;
    else {
      // Keep covered through joining / holding / retraction. The text starts
      // opening with the glass, and its easing tail lasts a little longer.
      if (this.started === null && frame.clarity > 0) this.started = now;
      if (this.started !== null)
        this.progress = Math.min(1, Math.max(0, (now - this.started) / 0.95));
    }
    if (this.progress === 1) this.remove();
    else if (this.started !== null) this.paint();
  }

  private paint() {
    const count = Math.max(1, this.covers.length - 1);
    for (const cover of this.covers) {
      const delay = (cover.order / count) * 0.22;
      const t = Math.min(1, Math.max(0, (this.progress - delay) / 0.78));
      // Brief acceleration, decisive departure, long deceleration; no bounce.
      const eased = t < 0.2
        ? 0.4 * (t / 0.2) ** 2
        : 1 - 0.6 * ((1 - t) / 0.8) ** (16 / 3);
      cover.ink.style.transform = `translateX(${eased * 101}%)`;
    }
  }

  private remove() {
    for (const cover of this.covers) cover.window.remove();
    this.covers = [];
  }
}
