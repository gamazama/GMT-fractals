/**
 * Feedback POST helper + GMF stripper.
 *
 * Anonymous-allowed. Includes JWT when the user is signed in so the
 * server can attach user_id + verified email metadata. Optional GMF
 * attachment captures the current scene with heavy base64 fields
 * (envMapData, drawing strokes) stripped so emails stay small.
 */
import { useEngineStore } from '../../store/engineStore';
import { useAuthStore } from '../auth/authStore';
import { saveGMFScene } from '../utils/FormulaFormat';

const SUBMIT_URL = 'https://ehoacsxzeruhajosexzb.supabase.co/functions/v1/submit-feedback';

const MAX_GMF_BYTES = 200_000;

export type FeedbackCategory = 'bug' | 'feature' | 'support';

export interface FeedbackInput {
    category: FeedbackCategory;
    message: string;
    contactEmail?: string;
    includeScene: boolean;
}

export interface FeedbackResult {
    ok: true;
    id: string;
}

export class FeedbackError extends Error {
    constructor(message: string, public status: number, public code?: string) {
        super(message);
        this.name = 'FeedbackError';
    }
}

/** Heavy fields we blank out before sending. Order matters only for diagnostics. */
const HEAVY_FIELD_PATHS: string[][] = [
    ['features', 'materials', 'envMapData'],
    ['features', 'drawing',   'strokes'],     // user-drawn paths can be large
    ['scene',    'thumbnail'],                // png data URLs
];

/** Walk an object by path, delete the leaf if it's a non-empty string/array. */
function stripPath(root: any, path: string[]): boolean {
    let cur = root;
    for (let i = 0; i < path.length - 1; i++) {
        cur = cur?.[path[i]];
        if (cur == null) return false;
    }
    const leaf = path[path.length - 1];
    const v = cur?.[leaf];
    const has = (typeof v === 'string' && v.length > 0) || (Array.isArray(v) && v.length > 0);
    if (has) {
        cur[leaf] = null;
        return true;
    }
    return false;
}

/**
 * Capture the current scene as a slim GMF string. Returns null if no scene
 * is loaded. Throws if the result is still over MAX_GMF_BYTES after stripping —
 * the caller surfaces that to the user as a hint to retry without the
 * include-scene checkbox.
 */
export function captureSlimGmf(): { gmf: string; stripped: string[] } | null {
    const store = useEngineStore.getState() as any;
    if (typeof store.getPreset !== 'function') return null;

    let preset: any;
    try {
        preset = store.getPreset({ includeScene: true });
    } catch {
        return null;
    }
    if (!preset) return null;

    const clone = structuredClone(preset);
    const stripped: string[] = [];
    for (const path of HEAVY_FIELD_PATHS) {
        if (stripPath(clone, path)) stripped.push(path.join('.'));
    }

    const gmf = saveGMFScene(clone);
    if (gmf.length > MAX_GMF_BYTES) {
        throw new FeedbackError(
            `Scene too large to attach (${(gmf.length / 1024).toFixed(0)} KB; max ${MAX_GMF_BYTES / 1024} KB). ` +
            `Try sending without the scene attached.`,
            413,
            'GMF_TOO_LARGE',
        );
    }

    return { gmf, stripped };
}

function utf8ToBase64(str: string): string {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

interface AppContext {
    version: string;
    url: string;
    formula?: string;
    stripped_fields?: string[];
}

// Vite inlines __APP_VERSION__ at build via define{} in vite.config.ts. The
// declaration lives in engine-gmt/types/common.ts but isn't picked up here
// without an import, so we read it off globalThis (any) instead.
function appVersion(): string {
    const v = (globalThis as any).__APP_VERSION__;
    return typeof v === 'string' ? v : 'unknown';
}

function collectAppContext(strippedFields?: string[]): AppContext {
    const store = useEngineStore.getState() as any;
    const ctx: AppContext = {
        version: appVersion(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };
    if (typeof store.formula === 'string') ctx.formula = store.formula;
    if (strippedFields && strippedFields.length > 0) ctx.stripped_fields = strippedFields;
    return ctx;
}

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
    const message = input.message.trim();
    if (!message) throw new FeedbackError('Please write a message.', 400);

    let gmfPayload: { filename: string; content: string } | null = null;
    let stripped: string[] | undefined;
    if (input.includeScene) {
        const slim = captureSlimGmf();
        if (slim) {
            stripped   = slim.stripped;
            gmfPayload = { filename: 'scene.gmf', content: utf8ToBase64(slim.gmf) };
        }
        // If captureSlimGmf returned null (no preset), silently send without
        // the attachment — the user clearly has nothing meaningful to attach.
    }

    const body: Record<string, unknown> = {
        category:      input.category,
        message,
        contact_email: input.contactEmail?.trim() || null,
        app_context:   collectAppContext(stripped),
    };
    if (gmfPayload) body.gmf = gmfPayload;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = useAuthStore.getState().getAccessToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        let msg = `Send failed (${res.status})`;
        let code: string | undefined;
        try {
            const j = await res.json();
            if (j?.error) msg = j.error;
            if (j?.code)  code = j.code;
        } catch { /* non-JSON */ }
        throw new FeedbackError(msg, res.status, code);
    }

    return await res.json() as FeedbackResult;
}
