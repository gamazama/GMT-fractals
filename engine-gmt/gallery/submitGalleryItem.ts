/**
 * Submit the current scene to the gallery via the submit-gallery-item
 * Edge Function. Phase 2B: signed-in user, JWT-authenticated.
 *
 * Flow:
 *   1. Capture PNG from the worker via proxy.captureSnapshot()
 *   2. Transcode PNG → JPEG @ q=0.85, max width 2048
 *   3. Serialize the live preset to GMF text
 *   4. POST multipart to the Edge Function with Authorization: Bearer <jwt>
 *
 * Returns the inserted row metadata. Throws SubmitError with `code` populated
 * for known server-side rejection reasons (SLOT_CAP_REACHED → trigger upgrade
 * modal in the caller).
 */
import { useEngineStore } from '../../store/engineStore';
import { getProxy } from '../../engine-gmt';
import { saveGMFScene } from '../utils/FormulaFormat';
import { useAuthStore } from '../auth/authStore';

// Hardcoded — function URL is public; auth is the JWT in the Authorization header.
const SUBMIT_URL = 'https://ehoacsxzeruhajosexzb.supabase.co/functions/v1/submit-gallery-item';

export interface SubmitInput {
    slug: string;
    title: string;
    description?: string;
    formula: string;
    tags?: string[];
    visibility?: 'public' | 'private';
}

export interface SubmitResult {
    id: string;
    slug: string;
    image_url: string;
    thumbnail_url: string;
    sky_url: string | null;
    status: 'pending' | 'approved' | 'rejected';
    visibility: 'public' | 'private';
    /** True when the server auto-suffixed the slug to avoid a collision. */
    slugChanged: boolean;
    finalSlug: string;
}

export interface SubmitErrorDetail {
    /** Server-supplied machine code (e.g. SLOT_CAP_REACHED). May be undefined. */
    code?: string;
    /** Server-supplied extra context (e.g. { cap, current, tier, verified }). */
    [key: string]: unknown;
}

export class SubmitError extends Error {
    constructor(message: string, public status: number, public detail: SubmitErrorDetail = {}) {
        super(message);
        this.name = 'SubmitError';
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
    maxEdge = 1024,
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

    // Primary path: ask the worker to read its bound env texture back from
    // the GPU. For LDR sources this returns a tonemapped JPEG; for HDR
    // (HalfFloat / Float DataTexture) it returns a Radiance .hdr blob so
    // dynamic range above 1.0 (sun, etc.) survives the round-trip. Works
    // for any source the engine could load.
    try {
        const proxy = getProxy();
        const skyBlob = await proxy.captureEnvMap(maxEdge);
        if (skyBlob) return { skyBlob, presetClone };
    } catch {
        // Fall through to LDR fallback below.
    }

    // Fallback: try createImageBitmap on the original data URL. Works for
    // LDR but not HDR — kept around in case the worker proxy isn't ready.
    try {
        const res = await fetch(envData);
        const blob = await res.blob();
        const bmp = await createImageBitmap(blob);
        const w = Math.min(bmp.width, maxEdge);
        const h = Math.min(bmp.height, maxEdge);
        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No 2D context for sky transcode');
        ctx.drawImage(bmp, 0, 0, w, h);
        const skyBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
        return { skyBlob, presetClone };
    } catch (err) {
        console.warn('[gallery-submit] could not transcode env map; submitting without sky:', err);
        return { skyBlob: null, presetClone };
    }
}

/** Capture the live worker canvas as a JPEG blob, resized to <= maxWidth. */
export async function captureJpegSnapshot(maxWidth = 2048): Promise<Blob> {
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

/**
 * Bake a text watermark into a JPEG blob.
 *
 * Standard preset (Phase 2B): bottom-right, white text with subtle black
 * shadow, ~1.2% of image height, opacity 0.78. Caller passes the text —
 * use `watermarkTextFor(profile)` from the auth store to resolve the
 * user's preference (default = `gmt-fractals.com/u/@<username>`).
 *
 * Re-encodes the canvas as JPEG so the watermark survives downloads.
 */
export async function bakeSignature(jpgBlob: Blob, text: string): Promise<Blob> {
    const bmp = await createImageBitmap(jpgBlob);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2D context for signature bake');
    ctx.drawImage(bmp, 0, 0);

    const fontSize = Math.max(10, Math.min(28, Math.round(bmp.height * 0.012)));
    const padding  = Math.max(8, Math.round(fontSize * 0.9));

    ctx.font          = `${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle     = 'rgba(255,255,255,0.78)';
    ctx.shadowColor   = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur    = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.textBaseline  = 'bottom';
    ctx.textAlign     = 'right';
    ctx.fillText(text, bmp.width - padding, bmp.height - padding);

    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}

export interface SubmitOptions {
    /** Pre-built JPEG to upload as the display image. Lets the caller
     *  show a preview (with watermark applied) before submitting and
     *  reuse the same bytes here. If omitted, a fresh snapshot is captured. */
    jpgBlob?: Blob;
}

export async function submitGalleryItem(input: SubmitInput, opts: SubmitOptions = {}): Promise<SubmitResult> {
    const token = useAuthStore.getState().getAccessToken();
    if (!token) {
        throw new SubmitError('You must be signed in to submit a scene.', 401);
    }

    const jpg = opts.jpgBlob ?? await captureJpegSnapshot();
    const rawPreset = useEngineStore.getState().getPreset({ includeScene: true });

    // Externalize env map: remove the (potentially MB-sized) base64 envMapData
    // from the preset and post the image as a separate sky multipart field.
    // Server uploads to skies/<slug>.jpg, writes sky_url; loader hydrates
    // preset.materials.envMapData from that URL on click-to-load.
    const { skyBlob, presetClone } = await extractSkyJpeg(rawPreset);
    const gmf = saveGMFScene(presetClone as any);

    // Server-side validator caps GMF at 100 KB (plan 41 §7.3). Anything
    // bigger after env extraction is a different runaway field — log the
    // top contributors so the curator can diagnose without instrumenting.
    const GMF_MAX = 100_000;
    if (gmf.length > GMF_MAX) {
        const breakdown: Record<string, number> = {};
        for (const [k, v] of Object.entries(presetClone as Record<string, unknown>)) {
            breakdown[k] = JSON.stringify(v ?? null).length;
        }
        console.warn('[gallery-submit] GMF too large — top preset fields by size:',
            Object.entries(breakdown).sort((a, b) => b[1] - a[1]).slice(0, 10));
        throw new SubmitError(
            `Scene is too large to submit (${(gmf.length / 1024).toFixed(0)} KB; max ${GMF_MAX / 1024} KB). ` +
            `See console for which preset field is responsible.`,
            413,
        );
    }

    const form = new FormData();
    form.append('jpg', jpg, `${input.slug}.jpg`);
    if (skyBlob) {
        // Server uses Content-Type to pick the R2 key extension (.hdr vs .jpg).
        const skyExt = skyBlob.type === 'image/vnd.radiance' ? 'hdr' : 'jpg';
        form.append('sky', skyBlob, `${input.slug}-sky.${skyExt}`);
    }
    form.append('gmf', gmf);
    form.append('slug', input.slug);
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    form.append('formula', input.formula);
    if (input.tags && input.tags.length > 0) form.append('tags', input.tags.join(','));
    form.append('visibility', input.visibility ?? 'public');

    const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        body: form,
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
        let msg = `Submit failed (${res.status})`;
        let detail: SubmitErrorDetail = {};
        try {
            const body = await res.json();
            if (body?.error) msg = body.error;
            detail = body;
        } catch {
            // non-JSON response — keep default msg
        }
        throw new SubmitError(msg, res.status, detail);
    }

    return (await res.json()) as SubmitResult;
}
