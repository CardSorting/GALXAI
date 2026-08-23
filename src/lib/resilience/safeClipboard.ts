/**
 * GALXAI Zero-Crash Safe Clipboard Utility
 *
 * Provides a universal, bulletproof clipboard writer that will never crash
 * the application or throw unhandled Promise rejections, even in sandboxed
 * iframes, non-HTTPS IP addresses, or mobile browsers with strict gesture policies.
 */

export async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (!text && text !== '') return false;

  // 1. Try modern asynchronous Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // 2. Fallback to legacy execCommand with offscreen textarea
  if (typeof document !== 'undefined' && document.body) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');
      document.body.appendChild(textArea);

      textArea.select();
      textArea.setSelectionRange(0, 99999);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) return true;
    } catch {
      // Fail gracefully
    }
  }

  return false;
}
