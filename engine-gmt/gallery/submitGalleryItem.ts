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

/**
 * Extract the active env map (preset.materials.envMapData) as a JPEG blob,
 * scaled to <= maxWidth. Returns null if there's no env or if the embedded
 * data isn't decodable (e.g. raw HDR — Phase 2A doesn't transcode HDR).
 *
 * On success, also returns the modified preset clone with envMapData stripped
 * so the GMF text stays small. The server uploads the blob to skies/{slug}.jpg
 * and writes sky_url; the loader hydrates envMapData from that URL.
 */
async function extractSkyJpeg(
    preset: any,
    maxLongEdge = 1024,
): Promise<{ skyBlob: Blob | null; presetClone: any }> {
    const presetClone = structuredClone(preset);
    const materials = presetClone?.features?.materials;
    const envData: unknown = materials?.envMapData;
    if (!materials || typeof envData !== 'string' || envData.length === 0) {
        return { skyBlob: null, presetClone };
    }

    // Strip from clone regardless — we either externalize it or drop it.
    materials.envMapData = null;

    // Already an HTTP URL (re-submitted gallery item). Keep it inline so the
    // sky still loads — no transcoding needed.
    if (envData.startsWith('http://') || envData.startsWith('https://')) {
        materials.envMapData = envData;
        return { skyBlob: null, presetClone };
    }

    try {
        // For data URLs, fetch() works fine in browsers.
        const res = await fetch(envData);
        const blob = await res.blob();
        const bmp = await createImageBitmap(blob);
        const scale = Math.min(1, maxLongEdge / Math.max(bmp.width, bmp.height));
        const w = Math.round(bmp.width * scale);
        const h = Math.round(bmp.height * scale);
        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No 2D context for sky transcode');
        ctx.drawImage(bmp, 0, 0, w, h);
        const skyBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
        console.log('[gallery-submit] sky JPEG:', skyBlob.size, 'bytes (' + w + 'x' + h + ')');
        return { skyBlob, presetClone };
    } catch (err) {
        console.warn('[gallery-submit] could not transcode env map; submitting without sky:', err);
        return { skyBlob: null, presetClone };
    }
}

/** Capture the live worker canvas as a JPEG blob, resized to <= maxWidth. */
async function captureJpegSnapshot(maxWidth = 2048): Promise<Blob> {
    console.log('[gallery-submit] requesting snapshot from worker…');
    const proxy = getProxy();
    const pngBlob = await proxy.captureSnapshot();
    if (!pngBlob) throw new Error('Renderer not ready — try again once the scene is rendering');
    console.log('[gallery-submit] got PNG snapshot:', pngBlob.size, 'bytes — transcoding to JPEG');

    const bmp = await createImageBitmap(pngBlob);
    const scale = Math.min(1, maxWidth / bmp.width);
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2D context for JPEG transcode');
    ctx.drawImage(bmp, 0, 0, w, h);
    const jpg = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    console.log('[gallery-submit] JPEG ready:', jpg.size, 'bytes (' + w + 'x' + h + ')');
    return jpg;
}

export async function submitGalleryItem(input: SubmitInput): Promise<SubmitResult> {
    const token = getSubmitToken();
    if (!token) {
        throw new Error('No admin submit token. Run localStorage.setItem("gmt_submit_token", "<token>") in DevTools.');
    }

    const jpg = await captureJpegSnapshot();
    const rawPreset = useEngineStore.getState().getPreset({ includeScene: true });

    // Externalize env map: remove the (potentially MB-sized) base64 envMapData
    // from the preset and post the image as a separate sky multipart field.
    // Server uploads to skies/<slug>.jpg, writes sky_url; loader hydrates
    // preset.materials.envMapData from that URL on click-to-load.
    const { skyBlob, presetClone } = await extractSkyJpeg(rawPreset);
    const gmf = saveGMFScene(presetClone as any);
    console.log('[gallery-submit] GMF size:', gmf.length, 'chars');

    // Plan 41 §7.3 caps GMF at 100 KB. Anything bigger after env extraction
    // is a different runaway field — diagnostic for which one.
    const GMF_MAX = 100_000;
    if (gmf.length > GMF_MAX) {
        const breakdown: Record<string, number> = {};
        for (const [k, v] of Object.entries(presetClone as Record<string, unknown>)) {
            breakdown[k] = JSON.stringify(v ?? null).length;
        }
        console.warn('[gallery-submit] GMF too large — top preset fields by size:',
            Object.entries(breakdown).sort((a, b) => b[1] - a[1]).slice(0, 10));
        throw new Error(
            `Scene is too large to submit (${(gmf.length / 1024).toFixed(0)} KB; max ${GMF_MAX / 1024} KB). ` +
            `See console for which preset field is responsible.`
        );
    }

    const form = new FormData();
    form.append('jpg', jpg, `${input.slug}.jpg`);
    if (skyBlob) form.append('sky', skyBlob, `${input.slug}-sky.jpg`);
    form.append('gmf', gmf);
    form.append('slug', input.slug);
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    form.append('formula', input.formula);
    if (input.tags && input.tags.length > 0) form.append('tags', input.tags.join(','));
    if (input.author) form.append('author', input.author);
    if (input.featured) form.append('featured', '1');

    console.log('[gallery-submit] POSTing to', SUBMIT_URL);
    const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        body: form,
        headers: { 'X-Submit-Token': token },
    });
    console.log('[gallery-submit] response:', res.status, res.statusText);

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
