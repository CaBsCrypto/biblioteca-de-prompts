/** Only a browser-confirmed write counts as a successful copy. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Browsers can deny Clipboard API permission while still supporting a user-initiated copy.
  }
  if (typeof document === 'undefined' || !document.body || typeof document.execCommand !== 'function') return false;
  const previousFocus = document.activeElement as HTMLElement | null;
  const selection = typeof window !== 'undefined' ? window.getSelection?.() : null;
  const previousRanges: Range[] = [];
  if (selection) {
    for (let index = 0; index < selection.rangeCount; index += 1) previousRanges.push(selection.getRangeAt(index).cloneRange());
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.tabIndex = -1;
  field.setAttribute('aria-hidden', 'true');
  Object.assign(field.style, { position: 'fixed', top: '0', left: '0', width: '1px', height: '1px', opacity: '0' });
  try {
    document.body.appendChild(field);
    selectCopyText(field);
    return document.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    field.remove();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    if (selection && previousRanges.length) {
      selection.removeAllRanges();
      for (const range of previousRanges) selection.addRange(range);
    }
  }
}

/** Select the visible, exact fallback text so the user can copy it manually. */
export function selectCopyText(field: HTMLTextAreaElement | null): void {
  if (!field) return;
  field.focus({ preventScroll: true });
  field.select();
  field.setSelectionRange(0, field.value.length);
}
