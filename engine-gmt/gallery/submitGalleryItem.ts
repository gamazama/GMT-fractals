/**
 * Submit the current scene to the gallery via the submit-gallery-item
 * Edge Function. Phase 2A: admin-only via a localStorage submit token.
 *
 * Flow:
 *   1. Capture PNG from the worker via proxy.captureSnapshot()
 *   2. Transcode PNG → JPEG @ q=0.85, max width 2048
 *   3. Serialize the live preset to GMF text
 *   4. POST multipart to the Edge Function
 *
 * Returns the inserted row metadata (id, slug, image_url, status) on success.
 */
import { useEngineStore } from '../../store/engineStore';
import { getProxy } from '../../engine-gmt';
import { saveGMFScene } from '../utils/FormulaFormat';

// Hardcoded — the function URL is public, the gate is the SUBMIT_TOKEN.
const SUBMIT_URL = 'https://ehoacsxzeruhajosexzb.supabase.co/functions/v1/submit-gallery-item';
const TOKEN_KEY = 'gmt_submit_token';

export interface SubmitInput {
    slug: string;
    title: string;
    description?: string;
    formula: string;
    tags?: string[];
    author?: string;
    featured?: boolean;
}

export interface SubmitResult {
    id: string;
    slug: string;
    image_url: string;
    thumbnail_url: string;
    status: string;
}

export function getSubmitToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export function setSubmitToken(token: string): void {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch {
        // localStorage unavailable (private mode, etc.) — best-effort
    }
}

export function clearSubmitToken(): void {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch {
        // ignore
    }
}

/** Capture the live worker canvas as a JPEG blob, resized to <= maxWidth. */
async function captureJpegSnapshot(maxWidth = 2048): Promise<Blob> {
    const proxy = getProxy();
    const pngBlob = await proxy.captureSnapshot();
    if (!pngBlob) throw new Error('Renderer not ready — try again once the scene is rendering');

    const bmp = await createImageBitmap(pngBlob);
    const scale = Math.min(1, maxWidth / bmp.width);
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2D context for JPEG transcode');
    ctx.drawImage(bmp, 0, 0, w, h);
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}

export async function submitGalleryItem(input: SubmitInput): Promise<SubmitResult> {
    const token = getSubmitToken();
    if (!token) {
        throw new Error('No admin submit token. Run localStorage.setItem("gmt_submit_token", "<token>") in DevTools.');
    }

    const jpg = await captureJpegSnapshot();
    const preset = useEngineStore.getState().getPreset({ includeScene: true });
    const gmf = saveGMFScene(preset as any);

    const form = new FormData();
    form.append('jpg', jpg, `${input.slug}.jpg`);
    form.append('gmf', gmf);
    form.append('slug', input.slug);
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    form.append('formula', input.formula);
    if (input.tags && input.tags.length > 0) form.append('tags', input.tags.join(','));
    if (input.author) form.append('author', input.author);
    if (input.featured) form.append('featured', '1');

    const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        body: form,
        headers: { 'X-Submit-Token': token },
    });

    if (!res.ok) {
        let msg = `Submit failed (${res.status})`;
        try {
            const body = await res.json();
            if (body?.error) msg = body.error;
        } catch {
            // non-JSON response — keep default msg
        }
        throw new Error(msg);
    }

    return (await res.json()) as SubmitResult;
}
