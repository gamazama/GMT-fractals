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
import { getSupabase, supabaseEnabled } from '../supabase';

export type AuthStatus = 'loading' | 'unauthed' | 'needs-profile' | 'authed';

export interface Profile {
    id: string;
    username: string;
    display_name: string;
    bio: string | null;
    tier: 'free' | 'creator' | 'pro' | 'studio';
    created_at: string;
    updated_at: string;
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
        const [{ data: profile }, { data: adminRow }] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', sess.user.id).maybeSingle(),
            supabase.from('admins').select('user_id').eq('user_id', sess.user.id).maybeSingle(),
        ]);
        if (profile) {
            set({
                profile: profile as Profile,
                isAdmin: !!adminRow,
                status: 'authed',
            });
        } else {
            set({
                profile: null,
                isAdmin: false,
                status: 'needs-profile',
            });
        }
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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
        useAuthStore.setState({ session, user: session?.user ?? null });
        await useAuthStore.getState().refreshProfile();
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
        useAuthStore.setState({ session, user: session?.user ?? null });
        await useAuthStore.getState().refreshProfile();
    });
}
