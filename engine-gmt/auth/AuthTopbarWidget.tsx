/**
 * Topbar widget — minimal avatar circle. Sits after the GmtLogo on the
 * left side of the topbar.
 *
 * Signed out → person glyph; click opens AuthOverlay.
 * Signed in  → initial in a gradient circle; click opens a Popover with
 *              account header, "Account…", and "Sign out". Styling matches
 *              the engine's Menu plugin dropdowns (bg-black/95 + p-1 items).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from './authStore';
import { getSupabase } from '../supabase';

const PersonIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

export const AuthTopbarWidget: React.FC = () => {
    const status            = useAuthStore((s) => s.status);
    const profile           = useAuthStore((s) => s.profile);
    const user              = useAuthStore((s) => s.user);
    const isAdmin           = useAuthStore((s) => s.isAdmin);
    const openAuthModal     = useAuthStore((s) => s.openAuthModal);
    const openAccountPanel  = useAuthStore((s) => s.openAccountPanel);

    const [open, setOpen]   = useState(false);
    const ref               = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    if (status === 'loading') {
        return <div className="w-7 h-7 bg-white/[0.03] rounded-full animate-pulse" />;
    }

    // Signed out (or pre-profile): single click opens the auth flow. No
    // dropdown — there's nothing to choose from. needs-profile is hidden
    // because AccountPanel auto-mounts forcing the username pick.
    if (status === 'unauthed' || status === 'needs-profile') {
        if (status === 'needs-profile') return null;
        return (
            <button
                onClick={openAuthModal}
                title="Sign in"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-gray-400 hover:text-cyan-300 flex items-center justify-center transition-colors"
            >
                <PersonIcon />
            </button>
        );
    }

    if (!profile) return null;

    const initial = (profile.display_name || profile.username).charAt(0).toUpperCase();

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                title={`@${profile.username}`}
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold text-white transition-colors ${
                    open
                        ? 'bg-cyan-500/30 border-cyan-500/60'
                        : 'bg-gradient-to-br from-cyan-500/40 to-purple-500/40 border-white/15 hover:border-cyan-500/60'
                }`}
            >
                {initial}
            </button>

            {open && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 mt-2 w-56 bg-black/95 border border-white/15 rounded-lg shadow-2xl z-50 p-1"
                >
                    {/* Account header — name + handle + tier hint */}
                    <div className="px-2 py-1.5 border-b border-white/5 mb-1">
                        <div className="text-[11px] font-bold text-white truncate">{profile.display_name}</div>
                        <div className="text-[9px] text-gray-500 truncate font-mono">@{profile.username}</div>
                        {user?.email && (
                            <div className="text-[9px] text-gray-600 truncate mt-0.5">{user.email}</div>
                        )}
                    </div>

                    <MenuButton
                        label="Account…"
                        onClick={() => { setOpen(false); openAccountPanel(); }}
                    />

                    {isAdmin && (
                        <div className="px-2 py-1 text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                            Admin · use backend/admin
                        </div>
                    )}

                    <div className="h-px bg-white/5 my-1" />

                    <MenuButton
                        label="Sign out"
                        muted
                        onClick={async () => {
                            setOpen(false);
                            await getSupabase().auth.signOut();
                        }}
                    />
                </div>
            )}
        </div>
    );
};

const MenuButton: React.FC<{ label: string; onClick: () => void; muted?: boolean }> = ({ label, onClick, muted }) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-bold transition-colors ${
            muted ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-200 hover:text-white hover:bg-white/5'
        }`}
    >
        {label}
    </button>
);
