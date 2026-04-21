/**
 * Community preset submission (Option C v1).
 * Posts the current scene as multipart/form-data to the configured backend
 * endpoint. Returns `{ ok: true, id }` on success and a normalized error
 * object on failure. Client-side throttles via `lastSubmissionAt`.
 *
 * The server side of this lives in the private `gmt-gallery-backend` repo.
 */

import type { SavedState } from './savedState';
import {
  PRESET_SUBMIT_ENDPOINT,
  PRESET_SUBMIT_MAX_IMAGE_BYTES,
  PRESET_SUBMIT_COOLDOWN_SEC,
} from './constants';

export interface SubmitMeta {
  /** User-chosen preset name (1–60 chars). */
  name: string;
  /** Optional alias (≤ 60 chars). */
  author?: string;
  /** Optional description (≤ 500 chars). */
  notes?: string;
}

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; code: 'disabled' | 'cooldown' | 'invalid' | 'too-large' | 'network' | 'server'; message: string };

let lastSubmissionAt = 0;

/** Returns remaining cooldown in seconds, or 0 if ready to submit. */
export function submitCooldownRemainingSec(): number {
  const elapsed = (performance.now() - lastSubmissionAt) / 1000;
  return Math.max(0, PRESET_SUBMIT_COOLDOWN_SEC - elapsed);
}

/** Are submissions enabled in this build? */
export function isSubmitEnabled(): boolean {
  return !!PRESET_SUBMIT_ENDPOINT;
}

/** Grab a PNG of the canvas, sized to reasonable limits. */
async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('canvas.toBlob returned null');
  return blob;
}

/**
 * Submit a preset to the backend.
 * Throws only on programmer errors (missing args); all user-facing failures
 * are returned as `{ ok: false, ... }` so callers can render a toast.
 */
export async function submitPreset(
  canvas: HTMLCanvasElement,
  state: SavedState,
  meta: SubmitMeta,
): Promise<SubmitResult> {
  if (!PRESET_SUBMIT_ENDPOINT) {
    return {
      ok: false,
      code: 'disabled',
      message: 'Preset submission is not yet enabled in this build. Save a PNG and send it directly.',
    };
  }

  const remaining = submitCooldownRemainingSec();
  if (remaining > 0) {
    return { ok: false, code: 'cooldown', message: `Please wait ${Math.ceil(remaining)}s before submitting again.` };
  }

  const trimmedName = (meta.name ?? '').trim();
  if (trimmedName.length < 1 || trimmedName.length > 60) {
    return { ok: false, code: 'invalid', message: 'Name is required (1–60 characters).' };
  }
  if (meta.author && meta.author.length > 60) {
    return { ok: false, code: 'invalid', message: 'Author is too long (max 60 characters).' };
  }
  if (meta.notes && meta.notes.length > 500) {
    return { ok: false, code: 'invalid', message: 'Notes are too long (max 500 characters).' };
  }

  let image: Blob;
  try {
    image = await canvasToPngBlob(canvas);
  } catch (e) {
    return { ok: false, code: 'invalid', message: `Couldn't capture canvas: ${(e as Error).message}` };
  }
  if (image.size > PRESET_SUBMIT_MAX_IMAGE_BYTES) {
    return {
      ok: false,
      code: 'too-large',
      message: `Image is too large (${(image.size / 1024 / 1024).toFixed(1)} MB; max ${(PRESET_SUBMIT_MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0)} MB).`,
    };
  }

  const form = new FormData();
  form.set('state', JSON.stringify(state));
  form.set('image', image, 'preset.png');
  form.set('name', trimmedName);
  if (meta.author) form.set('author', meta.author);
  if (meta.notes) form.set('notes', meta.notes);

  let res: Response;
  try {
    res = await fetch(PRESET_SUBMIT_ENDPOINT, { method: 'POST', body: form });
  } catch (e) {
    return { ok: false, code: 'network', message: `Network error: ${(e as Error).message}` };
  }

  // Try to read JSON first; fall back to text if the server is having a moment.
  let body: { ok?: boolean; error?: string; id?: string } = {};
  try {
    body = await res.json();
  } catch { /* empty body or non-JSON — we handle below */ }

  if (!res.ok) {
    return {
      ok: false,
      code: res.status === 429 ? 'cooldown' : res.status >= 500 ? 'server' : 'invalid',
      message: body.error ?? `Submission failed (${res.status} ${res.statusText}).`,
    };
  }

  lastSubmissionAt = performance.now();
  return { ok: true, id: body.id ?? 'unknown' };
}
