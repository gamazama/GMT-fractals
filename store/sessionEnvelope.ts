/**
 * sessionEnvelope — the versioned wrapper around an app's SESSION (what the user is working
 * on right now), shared by the browser autosave slot and a session file. Engine-core, pure:
 * no DOM, no store, no app — so `debug/test-gx-session.mts` runs it on plain node.
 *
 *   { "format": "<app tag>", "version": <int>, "savedAt": "<ISO>", "body": { … } }
 *
 * The envelope knows nothing about what a body holds; the app's adapter validates that
 * (engine/plugins/Session.ts `SessionAdapter.validate`). What the envelope guarantees is
 * the two refusals every caller needs and none should re-derive: a payload that is not
 * this app's session (garbage, another format, a bare JSON value), and one written under
 * a different VERSION of the format. Both are refused rather than half-read — a session
 * is untrusted input (a file from anywhere, or storage an older build wrote), and the
 * fallback for both is a clean start, never a crash.
 *
 * There is deliberately no migration step: version 1 is the first. When a v2 lands, add
 * the migration HERE (read v1, return a v2 body) rather than widening the equality test,
 * so an app never applies a body its validator was not written for.
 *
 * @see engine/plugins/Session.ts (the runtime: boot restore, the autosave loop, the file loop)
 */

export interface SessionEnvelope {
    format: string;
    version: number;
    /** When it was written (ISO 8601). Informational — nothing decides on it. */
    savedAt: string;
    body: Record<string, unknown>;
}

export type SessionDecodeFailure =
    /** Nothing to read (absent key, empty file). */
    | 'empty'
    /** Not JSON at all. */
    | 'not-json'
    /** JSON, but not an envelope (no format / version / object body). */
    | 'not-a-session'
    /** An envelope written by a different app. */
    | 'other-format'
    /** This app's envelope, under a version this build does not read. */
    | 'version';

export type SessionDecodeResult =
    | { ok: true; body: Record<string, unknown>; savedAt: string | null }
    | { ok: false; reason: SessionDecodeFailure; version?: number };

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object' && !Array.isArray(v);

/** Wrap a body. Throws only if the body itself cannot be stringified (a cycle) — callers
 *  capture plain JSON, so that is a programming error worth surfacing. */
export const encodeSession = (format: string, version: number, body: Record<string, unknown>, now: number = Date.now()): string =>
    JSON.stringify({ format, version, savedAt: new Date(now).toISOString(), body } satisfies SessionEnvelope);

/** Unwrap an untrusted payload. Never throws. */
export const decodeSession = (text: unknown, format: string, version: number): SessionDecodeResult => {
    if (typeof text !== 'string' || text.trim() === '') return { ok: false, reason: 'empty' };
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { ok: false, reason: 'not-json' };
    }
    if (!isPlainObject(parsed)) return { ok: false, reason: 'not-a-session' };
    if (typeof parsed.format !== 'string' || typeof parsed.version !== 'number' || !isPlainObject(parsed.body)) {
        return { ok: false, reason: 'not-a-session' };
    }
    if (parsed.format !== format) return { ok: false, reason: 'other-format' };
    if (parsed.version !== version) return { ok: false, reason: 'version', version: parsed.version };
    return { ok: true, body: parsed.body, savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null };
};

export type SessionBootAction =
    /** Autosave is off: keep nothing, start clean (and drop any stored session). */
    | 'clear'
    /** Something on this load outranks the stored session (a share link): start from it. */
    | 'preempted'
    /** No readable stored session: today's first-run behaviour, untouched. */
    | 'fresh'
    /** Restore the stored session. */
    | 'restore';

/**
 * What a boot does with the autosave slot. The ORDER is the contract: the toggle first (off
 * means the app keeps nothing), then a pre-empting load (a share link is an explicit request
 * for THAT gradient, so it wins over yesterday's work — which the autosave then overwrites
 * with the shared one on its next write), then whether anything valid is stored at all.
 */
export const sessionBootAction = (s: { enabled: boolean; preempted: boolean; hasValidStored: boolean }): SessionBootAction => {
    if (!s.enabled) return 'clear';
    if (s.preempted) return 'preempted';
    return s.hasValidStored ? 'restore' : 'fresh';
};
