/**
 * Free, unlisted "share a scene by link" client (ADR pending; backend
 * migration 0003_shared_scenes.sql + the `share-scene` edge function).
 *
 * Unlike gallery submission this needs NO sign-in: the `share-scene` function
 * is anonymous-allowed (deployed `--no-verify-jwt`). We send the user's JWT
 * ONLY when they happen to be signed in, so the share gets stamped with their
 * user_id and appears in "My Fractals"; anonymous callers just omit it (same
 * pattern as FeedbackClient). The returned id is the whole capability — the
 * caller builds the link from its own origin, so this module never hardcodes an
 * app URL (works for prod / dev / branch previews alike).
 *
 * Reads go through the `get_shared_scene_anon(id)` SECURITY DEFINER RPC (exact
 * id, one row — enumeration-proof, like getSharedScene(slug) for the gallery).
 */
import { getSupabase } from '../supabase';
import { useAuthStore } from '../auth/authStore';

const SHARE_URL = 'https://ehoacsxzeruhajosexzb.supabase.co/functions/v1/share-scene';

export class ShareSceneError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = 'ShareSceneError';
        this.status = status;
        this.code = code;
    }
}

export interface ShareSceneResult {
    id: string;
    /** True when an identical scene was already shared and its id was reused. */
    deduped: boolean;
}

/** A shared-scene row as returned by the read RPC / owner list. `gmf_text` is
 *  present only on the by-id read (the list omits it to stay light). */
export interface SharedScene {
    id: string;
    gmf_text?: string;
    title: string | null;
    formula: string | null;
    created_at: string;
}

/**
 * Upload a GMF blob and get back a short id. Signed-in callers' shares land in
 * their "My Fractals" list; anonymous callers get an orphan link. Re-sharing an
 * identical scene reuses the existing id (server-side content-hash dedup).
 */
export async function createSharedScene(
    gmf: string,
    meta: { title?: string | null; formula?: string | null } = {},
): Promise<ShareSceneResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = useAuthStore.getState().getAccessToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(SHARE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ gmf, title: meta.title ?? null, formula: meta.formula ?? null }),
    });
    if (!res.ok) {
        let msg = `Share failed (${res.status})`;
        let code: string | undefined;
        try {
            const j = await res.json();
            if (j?.error) msg = j.error;
            if (j?.code) code = j.code;
        } catch { /* non-JSON */ }
        throw new ShareSceneError(msg, res.status, code);
    }
    return await res.json() as ShareSceneResult;
}

/** Fetch a shared scene's GMF by exact id (the ?s=<id> open path). Anonymous. */
export async function getSharedSceneById(id: string): Promise<SharedScene | null> {
    const { data, error } = await getSupabase().rpc('get_shared_scene_anon', { p_id: id });
    if (error) throw error;
    const rows = (data ?? []) as unknown as SharedScene[];
    return rows[0] ?? null;
}

/** The signed-in user's own quick-shares, newest first, for "My Fractals".
 *  RLS scopes this to `auth.uid() = user_id`, so it needs a session. */
export async function listMySharedScenes(): Promise<SharedScene[]> {
    const { data, error } = await getSupabase()
        .from('shared_scenes')
        .select('id, title, formula, created_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SharedScene[];
}

/** Delete one of the caller's own shares (RLS enforces ownership). */
export async function deleteMySharedScene(id: string): Promise<void> {
    const { error } = await getSupabase().from('shared_scenes').delete().eq('id', id);
    if (error) throw error;
}
