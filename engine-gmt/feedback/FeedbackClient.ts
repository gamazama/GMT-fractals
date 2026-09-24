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
    /** Attach the app's declared attachment (see `configureFeedback`) — GMT's default is
     *  the slim scene. The name predates the seam and is kept for its callers. */
    includeScene: boolean;
    /** Which declared option, when the app declares several. Default: the first. */
    attachmentId?: string;
    /** A file the form already built (an option with `captureOnSelect`, so what the user
     *  previewed is what is sent). Takes precedence over `includeScene` / `attachmentId`. */
    preparedAttachment?: FeedbackFile | null;
}

// ── App-declared attachment + context ──────────────────────────────────
//
// The feedback endpoint (backend/supabase/functions/submit-feedback) takes exactly ONE
// attachment — `gmf: { filename, content }`, base64, ≤ 200 KB decoded — and emails it
// with content_type application/json whatever the filename says. So a report carries at
// most one attachment, and it is text: binary content (a screenshot) rides INSIDE a JSON
// file as a data URL, with a `kind` field saying what it is (see feedbackScreenshot.ts).
//
// An app may declare SEVERAL options; the form then offers a one-of choice (None + each
// option) instead of the single checkbox, and still sends one file.

/** The file an option produces. */
export interface FeedbackFile {
    filename: string;
    /** Sent base64-encoded as the attachment's content. */
    text: string;
    stripped?: string[];
    /** An image data URL the form shows as a thumbnail (what is being sent). */
    preview?: string;
    /** Extra `app_context` fields for this file, e.g. `{ attachment_kind: 'screenshot' }`. */
    context?: Record<string, unknown>;
}

/** A thing an app offers to attach to a report. */
export interface FeedbackAttachment {
    /** Needed when an app declares more than one option. */
    id?: string;
    /** Checkbox / choice label, e.g. "Include current scene". */
    label: string;
    /** One line under the label saying what is sent. */
    hint: string;
    /** Build it. `null` = nothing to attach right now; the report goes without.
     *  Throw a FeedbackError for a problem the user should see (too large, …). */
    capture: () => FeedbackFile | null | Promise<FeedbackFile | null>;
    /** Build it when the user CHOOSES this option (multi-option forms), not at send — for a
     *  capture of the moment (a screenshot) and so its `preview` can be shown first. */
    captureOnSelect?: boolean;
    /** Is there anything to attach right now? Read when the form opens (it remounts on
     *  each open). An unavailable option renders disabled and is never the form's default,
     *  so the form does not promise a file it will not send. Absent = always available. */
    available?: () => boolean;
}

export interface FeedbackConfig {
    /** The attachment the form offers; `null` hides the checkbox. Default: GMT's scene. */
    attachment?: FeedbackAttachment | null;
    /** Several options, one of which (or none) is sent. Wins over `attachment`. */
    attachments?: FeedbackAttachment[];
    /** Extra `app_context` fields (after the built-in version/url/formula), e.g. which app. */
    context?: () => Record<string, unknown>;
    /** Does this app offer a sign-in? The form's intro tells an anonymous user they can sign
     *  in for a reply only when it does. Default true (GMT, which installs the auth widget). */
    signIn?: boolean;
}

/** GMT's attachment — what every app sent before the seam existed. */
const GMT_SCENE_ATTACHMENT: FeedbackAttachment = {
    label: 'Include current scene',
    hint: "Attaches a .gmf file of your scene (sky + heavy data stripped) so I can reproduce what you're seeing.",
    capture: () => {
        const slim = captureSlimGmf();
        return slim ? { filename: 'scene.gmf', text: slim.gmf, stripped: slim.stripped } : null;
    },
};

let _config: { attachments: FeedbackAttachment[]; context?: FeedbackConfig['context']; signIn: boolean } = { attachments: [GMT_SCENE_ATTACHMENT], signIn: true };

/**
 * Declare this app's attachment / context. Call once at boot; apps that never call it
 * (app-gmt, fluid-toy, the old Gradient Explorer) keep GMT's scene attachment and send
 * exactly the payload they always did.
 */
export const configureFeedback = (config: FeedbackConfig): void => {
    const single = config.attachment === undefined ? GMT_SCENE_ATTACHMENT : config.attachment;
    _config = {
        attachments: config.attachments ?? (single ? [single] : []),
        context: config.context,
        signIn: config.signIn ?? true,
    };
};

/** The options the form should offer — one (a checkbox), several (a choice), or none. */
export const getFeedbackAttachments = (): FeedbackAttachment[] => _config.attachments;

/** Can this option be attached right now (`available`, absent = yes)? */
export const isFeedbackAttachmentAvailable = (o: FeedbackAttachment): boolean => o.available?.() ?? true;

/** Does this app offer a sign-in (`configureFeedback({ signIn })`, default true)? */
export const feedbackOffersSignIn = (): boolean => _config.signIn;

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
    [extra: string]: unknown;
}

// Vite inlines __APP_VERSION__ at build via define{} in vite.config.ts. The
// declaration lives in engine-gmt/types/common.ts but isn't picked up here
// without an import, so we read it off globalThis (any) instead.
function appVersion(): string {
    const v = (globalThis as any).__APP_VERSION__;
    return typeof v === 'string' ? v : 'unknown';
}

function collectAppContext(strippedFields?: string[], fileContext?: Record<string, unknown>): AppContext {
    const store = useEngineStore.getState() as any;
    const ctx: AppContext = {
        version: appVersion(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };
    if (typeof store.formula === 'string') ctx.formula = store.formula;
    if (strippedFields && strippedFields.length > 0) ctx.stripped_fields = strippedFields;
    if (_config.context) Object.assign(ctx, _config.context());
    if (fileContext) Object.assign(ctx, fileContext);
    return ctx;
}

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
    const message = input.message.trim();
    if (!message) throw new FeedbackError('Please write a message.', 400);

    let gmfPayload: { filename: string; content: string } | null = null;
    let stripped: string[] | undefined;
    let file: FeedbackFile | null = input.preparedAttachment ?? null;
    if (!file && input.includeScene) {
        const options = _config.attachments;
        const option = input.attachmentId ? options.find((o) => o.id === input.attachmentId) : options[0];
        if (option) file = await option.capture();
        // If capture returned null (e.g. no preset), silently send without
        // the attachment — the user clearly has nothing meaningful to attach.
    }
    if (file) {
        stripped   = file.stripped;
        gmfPayload = { filename: file.filename, content: utf8ToBase64(file.text) };
    }

    const body: Record<string, unknown> = {
        category:      input.category,
        message,
        contact_email: input.contactEmail?.trim() || null,
        app_context:   collectAppContext(stripped, file?.context),
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
