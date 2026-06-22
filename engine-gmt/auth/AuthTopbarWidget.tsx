/**
 * Topbar widget — minimal avatar circle. Sits after the GmtLogo on the
 * left side of the topbar.
 *
 * Signed out → person glyph; click opens AuthOverlay.
 * Signed in  → initial in a gradient circle; click opens a Popover with
 *              account header, "Account…", and "Sign out". Styling matches
 *              the engine's Menu plugin dropdowns (bg-surface + p-1 items).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from './authStore';
import { useGalleryStore } from '../gallery/galleryStore';
import { PersonIcon } from '../../components/Icons2';

export const AuthTopbarWidget: React.FC = () => {
    const status            = useAuthStore((s) => s.status);
    const profile           = useAuthStore((s) => s.profile);
    const user              = useAuthStore((s) => s.user);
    const isAdmin           = useAuthStore((s) => s.isAdmin);
    const openAuthModal     = useAuthStore((s) => s.openAuthModal);
    const openAccountPanel  = useAuthStore((s) => s.openAccountPanel);
    const signOut           = useAuthStore((s) => s.signOut);

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

    // Styling tokens match the ViewportQuality topbar button for visual
    // consistency: cyan border + cyan-900/20 bg + cyan-300 text, hover
    // bumps to cyan-900/40. Circle is sized to align with the other
    // left-slot pill-shaped controls.
    const CHIP_BASE =
        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ' +
        'border transition-colors';
    const CHIP_IDLE  = 'bg-accent-900/20 border-accent-500/20 text-accent-300 hover:bg-accent-900/40';
    const CHIP_OPEN  = 'bg-accent-900/40 border-accent-500/40 text-cyan-200';

    if (status === 'loading') {
        return <div className={`${CHIP_BASE} bg-line/[0.03] border-line/10 animate-pulse`} />;
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
                className={`${CHIP_BASE} ${CHIP_IDLE}`}
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
                className={`${CHIP_BASE} ${open ? CHIP_OPEN : CHIP_IDLE}`}
            >
                {initial}
            </button>

            {open && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 mt-2 w-56 bg-surface border border-line/15 rounded-lg shadow-2xl z-50 p-1"
                >
                    {/* Account header — name + handle + tier hint */}
                    <div className="px-2 py-1.5 border-b border-line/5 mb-1">
                        <div className="text-[11px] font-bold text-fg truncate">{profile.display_name}</div>
                        <div className="text-[9px] text-fg-dim truncate font-mono">@{profile.username}</div>
                        {user?.email && (
                            <div className="text-[9px] text-fg-faint truncate mt-0.5">{user.email}</div>
                        )}
                    </div>

                    <MenuButton
                        label="My submissions…"
                        onClick={() => { setOpen(false); useGalleryStore.getState().openMySubmissions(); }}
                    />
                    <MenuButton
                        label="Account…"
                        onClick={() => { setOpen(false); openAccountPanel(); }}
                    />

                    {isAdmin && (
                        <div className="px-2 py-1 text-[9px] text-warn font-bold uppercase tracking-wider">
                            Admin · use backend/admin
                        </div>
                    )}

                    <div className="h-px bg-line/5 my-1" />

                    <MenuButton
                        label="Sign out"
                        muted
                        onClick={async () => {
                            setOpen(false);
                            await signOut();
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
            muted ? 'text-fg-muted hover:text-fg hover:bg-line/5' : 'text-fg-secondary hover:text-fg hover:bg-line/5'
        }`}
    >
        {label}
    </button>
);
