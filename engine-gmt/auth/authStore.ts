/**
 * Zustand store for Supabase Auth session + GMT profile state.
 *
 * Status enum mirrors the four states the UI cares about:
 *   - 'loading'       — initial hydration in progress (don't render gated UI yet)
 *   - 'unauthed'      — no session
 *   - 'needs-profile' — signed in but no profiles row yet (post-OAuth username pick)
 *   - 'authed'        — signed in AND profile loaded; all gallery features usable
 *
 * The store subscribes once to supabase.auth.onAuthStateChange on first
 * import; cleanup never runs because the auth subscription is process-wide.
 */
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, supabaseEnabled, AUTH_STORAGE_KEY } from '../supabase';

export type AuthStatus = 'loading' | 'unauthed' | 'needs-profile' | 'authed';

export interface Profile {
    id: string;
    username: string;
    display_name: string;
    bio: string | null;
    tier: 'free' | 'creator' | 'pro' | 'studio' | 'promo';
    watermark_enabled: boolean;
    /** Custom text for the signature bake. NULL = use the default
     *  `gmt-fractals.com/u/@<username>` pattern. */
    watermark_text: string | null;
    created_at: string;
    updated_at: string;
}

/** Resolve the watermark text the bake function should use. */
export function watermarkTextFor(profile: Profile): string {
    return profile.watermark_text ?? `gmt-fractals.com/u/@${profile.username}`;
}

interface AuthState {
    status: AuthStatus;
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    isAdmin: boolean;
    isAuthModalOpen: boolean;
    isAccountPanelOpen: boolean;

    openAuthModal: () => void;
    closeAuthModal: () => void;
    openAccountPanel: () => void;
    closeAccountPanel: () => void;

    /** Re-fetches the profile + admin flag from Supabase. Called after
     *  signup, profile update, or any change that might affect them. */
    refreshProfile: () => Promise<void>;

    /** Signs the user out. Calls supabase.auth.signOut() (global scope, so
     *  the refresh token is revoked server-side) but GUARANTEES the local
     *  session is cleared even when that network revoke fails: auth-js bails
     *  before clearing localStorage on a non-4xx error, which would leave a
     *  live JWT on the device after the user asked to sign out. Returns the
     *  supabase error (if any) so callers can surface it — the local state is
     *  cleared regardless. */
    signOut: () => Promise<{ error: Error | null }>;

    /** Convenience: returns the JWT for the current session, or null if
     *  unauthed. Used by gallery submission code to set the Authorization
     *  header on Edge Function calls. */
    getAccessToken: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    status: supabaseEnabled ? 'loading' : 'unauthed',
    session: null,
    user: null,
    profile: null,
    isAdmin: false,
    isAuthModalOpen: false,
    isAccountPanelOpen: false,

    openAuthModal:      () => set({ isAuthModalOpen: true }),
    closeAuthModal:     () => set({ isAuthModalOpen: false }),
    openAccountPanel:   () => set({ isAccountPanelOpen: true }),
    closeAccountPanel:  () => set({ isAccountPanelOpen: false }),

    refreshProfile: async () => {
        const sess = get().session;
        if (!sess) {
            set({ profile: null, isAdmin: false, status: 'unauthed' });
            return;
        }
        const supabase = getSupabase();
        try {
            // is_admin is a security-definer rpc — bypasses RLS so the
            // admins table can stay locked down to owners-only without
            // breaking the client check. Mirrors the server-side check.
            const [profileRes, adminRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', sess.user.id).maybeSingle(),
                supabase.rpc('is_admin', { uid: sess.user.id }),
            ]);
            if (profileRes.error) console.warn('[auth] profile lookup error:', profileRes.error);
            if (adminRes.error)   console.warn('[auth] admin lookup error:',   adminRes.error);

            if (profileRes.data) {
                set({
                    profile: profileRes.data as Profile,
                    isAdmin: !!adminRes.data,
                    status: 'authed',
                });
            } else {
                set({
                    profile: null,
                    isAdmin: false,
                    status: 'needs-profile',
                });
            }
        } catch (err) {
            console.warn('[auth] refreshProfile crashed — falling through to unauthed:', err);
            set({ profile: null, isAdmin: false, status: 'unauthed' });
        }
    },

    signOut: async () => {
        let error: Error | null = null;
        try {
            const res = await getSupabase().auth.signOut();
            error = res.error ?? null;
        } catch (err) {
            // auth-js re-throws raw transport errors (offline, DNS) instead of
            // returning them — treat the same as a returned error.
            error = err instanceof Error ? err : new Error(String(err));
        }
        if (error) {
            // Global-scope signOut bailed before clearing localStorage (network
            // / 5xx revoke failure) and SIGNED_OUT never fired. Hard-clear the
            // persisted token and reset state ourselves so the device isn't
            // left holding a live JWT after the user asked to sign out.
            console.warn('[auth] signOut failed — forcing local clear:', error);
            try { window.localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
            set({ status: 'unauthed', session: null, user: null, profile: null, isAdmin: false });
        }
        // On success the onAuthStateChange(SIGNED_OUT) listener already reset
        // the store; nothing more to do here.
        return { error };
    },

    getAccessToken: () => get().session?.access_token ?? null,
}));

// ── One-time subscription ───────────────────────────────────────────────
//
// Bootstraps the store from the current session and listens for changes.
// Runs at module load — there's only one Supabase client per app and we
// want the auth state ready before any UI mounts. No-op when env is
// missing (gallery just isn't configured for this build).

if (supabaseEnabled) {
    const supabase = getSupabase();

    const hydrate = async (label: string, session: Session | null) => {
        try {
            useAuthStore.setState({ session, user: session?.user ?? null });
            await useAuthStore.getState().refreshProfile();
        } catch (err) {
            console.warn(`[auth] ${label} handler failed — forcing unauthed:`, err);
            useAuthStore.setState({
                status: 'unauthed',
                session: null,
                user: null,
                profile: null,
                isAdmin: false,
            });
        }
    };

    // Failsafe: if neither getSession nor onAuthStateChange resolves within
    // 8 s, drop out of 'loading' so the UI doesn't hang on a stuck client.
    const failsafe = setTimeout(() => {
        if (useAuthStore.getState().status === 'loading') {
            console.warn('[auth] bootstrap timed out — falling through to unauthed');
            useAuthStore.setState({
                status: 'unauthed',
                session: null,
                user: null,
                profile: null,
                isAdmin: false,
            });
        }
    }, 8000);

    supabase.auth.getSession()
        .then(({ data: { session }, error }) => {
            if (error) console.warn('[auth] getSession error:', error);
            clearTimeout(failsafe);
            return hydrate('getSession', session);
        })
        .catch((err) => {
            console.warn('[auth] getSession threw:', err);
            clearTimeout(failsafe);
            useAuthStore.setState({ status: 'unauthed' });
        });

    supabase.auth.onAuthStateChange((_event, session) => {
        clearTimeout(failsafe);
        void hydrate('onAuthStateChange', session);
    });
}
