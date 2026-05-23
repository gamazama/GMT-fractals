/**
 * Topbar widget — "Sign in" when unauthed, profile chip with dropdown
 * when signed in. Mounted by installAuth() into the topbar's right slot.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from './authStore';
import { getSupabase } from '../supabase';

export const AuthTopbarWidget: React.FC = () => {
    const status            = useAuthStore((s) => s.status);
    const profile           = useAuthStore((s) => s.profile);
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
        return <div className="w-16 h-7 bg-white/[0.03] rounded animate-pulse" />;
    }

    if (status === 'unauthed' || status === 'needs-profile') {
        // needs-profile shows nothing because AccountPanel auto-mounts forcing setup
        if (status === 'needs-profile') return null;
        return (
            <button
                onClick={openAuthModal}
                className="px-3 py-1.5 rounded text-[11px] font-bold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40"
            >
                Sign in
            </button>
        );
    }

    if (!profile) return null;

    const initial = (profile.display_name || profile.username).charAt(0).toUpperCase();

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${open ? 'bg-white/10' : 'hover:bg-white/[0.06]'}`}
            >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/40 to-purple-500/40 border border-white/10 flex items-center justify-center text-[11px] font-bold text-white">
                    {initial}
                </span>
                <span className="text-[11px] text-gray-300 max-w-[100px] truncate hidden sm:inline">
                    @{profile.username}
                </span>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#121212] border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 p-1">
                    <div className="px-2 py-1.5 border-b border-white/5 mb-1">
                        <div className="text-[11px] font-bold text-white truncate">{profile.display_name}</div>
                        <div className="text-[9px] text-gray-500 truncate font-mono">@{profile.username}</div>
                    </div>

                    <button
                        onClick={() => { setOpen(false); openAccountPanel(); }}
                        className="w-full text-left px-2 py-1.5 rounded text-[11px] text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                        Account
                    </button>

                    {isAdmin && (
                        <div className="px-2 py-1.5 text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                            Admin · use backend/admin
                        </div>
                    )}

                    <button
                        onClick={async () => {
                            setOpen(false);
                            await getSupabase().auth.signOut();
                        }}
                        className="w-full text-left px-2 py-1.5 rounded text-[11px] text-gray-400 hover:bg-white/5 hover:text-white border-t border-white/5 mt-1"
                    >
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
};
