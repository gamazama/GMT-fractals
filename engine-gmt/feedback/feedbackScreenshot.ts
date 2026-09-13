/**
 * feedbackScreenshot — a JPEG of what the user sees, sized to ride inside the ONE JSON
 * attachment the feedback endpoint takes (FeedbackClient.ts: `gmf`, ≤ 200 KB decoded, always
 * emailed as application/json). No backend change: the image is a data URL inside the JSON.
 *
 * THE CAPTURE — `modern-screenshot` (MIT, no dependencies; ~24 KB minified / ~9.6 KB gzip,
 * measured 2026-09-13), `import()`ed only when a screenshot is asked for, so it is its own
 * lazy chunk and costs a report without one nothing. Chosen over the alternatives:
 *   • `html-to-image` — the same SVG-foreignObject technique, larger, and its Safari path is
 *     the known-blank one (images inside foreignObject decode after the first draw); modern-
 *     screenshot is the fork that redraws for WebKit.
 *   • compositing the page's canvases by hand — would lose every DOM surface (the top bar,
 *     chips, labels, the tray's controls), which is most of what a bug report is about.
 *   • `getDisplayMedia` — ruled out (owner): a permission prompt, and absent on iOS.
 * Canvases are cloned through `toDataURL`, so a 2D canvas comes through as painted. A WebGL
 * canvas does too ONLY if it was created with `preserveDrawingBuffer: true` — otherwise it is
 * black. (The Gradient Explorer's are: its wall is 2D, its wallpaper compositors preserve.
 * app-gmt's renderer does not — it would need that before it could offer this.)
 *
 * WHAT IS LEFT OUT: any element carrying `data-feedback-no-capture` (and its subtree) — the
 * feedback window itself, so the shot is the app behind the form.
 *
 * THE BUDGET — one capture, then encodes in a loop: quality 0.8 → 0.3 in steps of 0.1 at the
 * captured size, then the same at ¾ the size, … until the WHOLE wrapped JSON (`wrap`) is at or
 * under `maxBytes`. The endpoint estimates decoded size as ¾ of the base64 length, which for
 * UTF-8 text is its byte length ±2, so the default 190 KB leaves ~10 KB of margin.
 *
 * iOS WebKit is the known risk: foreignObject rendering has had blank-image and missing-image
 * bugs there across versions (modern-screenshot works around the ones it knows). Not tested
 * on a real iPhone; the guard runs Chromium's Pixel 5 emulation.
 */

export const FEEDBACK_NO_CAPTURE_ATTR = 'data-feedback-no-capture';

export interface ScreenshotResult {
  /** The wrapped text (what `wrap` returned for the chosen encode). */
  text: string;
  /** The JPEG data URL (also inside `text`). */
  dataUrl: string;
  width: number;
  height: number;
  quality: number;
  /** UTF-8 bytes of `text`. */
  bytes: number;
}

export interface ScreenshotOptions {
  /** Longest side of the image, px. Default 1280. */
  maxSide?: number;
  /** Ceiling for the wrapped text's UTF-8 bytes. Default 190 000. */
  maxBytes?: number;
  /** Paint behind transparent pixels (JPEG has no alpha). Default: the body's background. */
  background?: string;
}

const utf8Bytes = (s: string): number => new TextEncoder().encode(s).length;

/**
 * Capture the viewport as a JPEG and wrap it (e.g. into a JSON document), shrinking until the
 * wrapped text fits. Throws if even the smallest encode does not fit.
 */
export async function captureViewportJpeg(
  wrap: (dataUrl: string, meta: { width: number; height: number; quality: number }) => string,
  { maxSide = 1280, maxBytes = 190_000, background }: ScreenshotOptions = {},
): Promise<ScreenshotResult> {
  const { domToCanvas } = await import('modern-screenshot');
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(window.devicePixelRatio || 1, maxSide / Math.max(vw, vh));
  const bg = background ?? (getComputedStyle(document.body).backgroundColor || '#000');

  const shot = await domToCanvas(document.body, {
    width: vw,
    height: vh,
    scale,
    backgroundColor: bg,
    // no web fonts in these apps; skip fetching and embedding them
    font: false,
    filter: (node) => !(node instanceof Element && node.hasAttribute(FEEDBACK_NO_CAPTURE_ATTR)),
  });

  let canvas: HTMLCanvasElement = shot;
  for (let shrink = 0; shrink < 5; shrink++) {
    for (let q = 0.8; q >= 0.3 - 1e-6; q -= 0.1) {
      const quality = Math.round(q * 10) / 10;
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const text = wrap(dataUrl, { width: canvas.width, height: canvas.height, quality });
      const bytes = utf8Bytes(text);
      if (bytes <= maxBytes) return { text, dataUrl, width: canvas.width, height: canvas.height, quality, bytes };
    }
    const next = document.createElement('canvas');
    next.width = Math.max(1, Math.round(canvas.width * 0.75));
    next.height = Math.max(1, Math.round(canvas.height * 0.75));
    const ctx = next.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, next.width, next.height);
    ctx.drawImage(canvas, 0, 0, next.width, next.height);
    canvas = next;
  }
  throw new Error('The screenshot is too large to attach — try sending without it.');
}
