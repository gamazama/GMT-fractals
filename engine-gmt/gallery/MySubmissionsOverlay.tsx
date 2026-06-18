/**
 * MySubmissionsOverlay — lists the signed-in user's own gallery submissions
 * regardless of status (pending / approved / rejected) or visibility
 * (public / private). RLS lets owners read all of their own rows even when
 * the public browse query would filter them out.
 *
 * Per-row actions for owner:
 *   - Toggle visibility (public ↔ private)
 *     · public → private flips status='pending' via DB trigger if past
 *       the 100-bootstrap threshold (server-side; the modal just reflects
 *       it after the refresh).
 *   - Delete (with confirm)
 *
 * Submission counts toward the user's slot cap (free=5 active excluding
 * featured). The header shows the live count so users know how many slots
 * they have left.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGalleryStore } from './galleryStore';
import { useAuthStore } from '../auth/authStore';
import { ErrorNote } from '../../components/ErrorNote';
import { GhostButton } from '../../components/GhostButton';
import { Z } from '../../components/ui';
import {
    listMySubmissions, deleteMySubmission, updateMyVisibility,
    GalleryItem, GALLERY_FEATURED_BADGE,
} from './GalleryClient';
import type { Profile } from '../auth/authStore';

/** Mirrors the server-side cap in backend/supabase/functions/_shared/auth.ts.
 *  Keep these in sync — if launch tiers change, update both. */
function slotCapForTier(tier: Profile['tier']): number {
    switch (tier) {
        case 'free':    return 5;
        case 'creator': return 1000;
        case 'pro':     return 1000;
        case 'studio':  return 1000;
        default:        return 5;
    }
}

const STATUS_PILL: Record<string, string> = {
    pending:  'bg-amber-500/20 text-amber-300 border-amber-500/40',
    approved: 'bg-green-500/20 text-green-300 border-green-500/40',
    rejected: 'bg-gray-700/40 text-gray-400 border-gray-600/40',
};

const VIS_PILL: Record<string, string> = {
    public:  'bg-blue-500/20 text-blue-300 border-blue-500/40',
    private: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
};

export const MySubmissionsOverlay: React.FC = () => {
    const isOpen   = useGalleryStore(s => s.isMySubsOpen);
    const close    = useGalleryStore(s => s.closeMySubmissions);
    const bumpRef  = useGalleryStore(s => s.bumpRefresh);
    const profile  = useAuthStore(s => s.profile);

    const [items, setItems]       = useState<GalleryItem[]>([]);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [busyId, setBusyId]     = useState<string | null>(null);

    // Guard async setState: a delete/toggle (or the initial fetch) can resolve
    // after the overlay has closed and unmounted. Skip the state writes then.
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const refresh = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        setError(null);
        try {
            const rows = await listMySubmissions(profile.id);
            if (mountedRef.current) setItems(rows);
        } catch (err) {
            if (mountedRef.current) setError(err instanceof Error ? err.message : String(err));
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [profile]);

    useEffect(() => { if (isOpen) void refresh(); }, [isOpen, refresh]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.stopPropagation(); close(); }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [isOpen, close]);

    if (!isOpen) return null;
    if (!profile) {
        return createPortal(
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center" style={{ zIndex: Z.overlayNested }}>
                <div className="text-sm text-gray-400">Sign in to view your submissions.</div>
            </div>,
            document.body,
        );
    }

    const cap = slotCapForTier(profile.tier);
    const nonFeatured = items.filter(i => !i.featured && i.status !== 'rejected').length;

    const wrap = async (id: string, op: () => Promise<void>) => {
        setBusyId(id);
        try {
            await op();
            await refresh();
            bumpRef();
        } catch (err) {
            if (mountedRef.current) setError(err instanceof Error ? err.message : String(err));
        } finally {
            if (mountedRef.current) setBusyId(null);
        }
    };

    const onToggleVisibility = (item: GalleryItem) => wrap(item.id, () =>
        updateMyVisibility(item.id, profile.id, item.visibility === 'public' ? 'private' : 'public')
    );

    const onDelete = (item: GalleryItem) => {
        if (!window.confirm(`Delete "${item.title}" forever?\n\nThis frees up a submission slot. Cannot be undone.`)) return;
        return wrap(item.id, () => deleteMySubmission(item.id, profile.id));
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col" style={{ zIndex: Z.overlayNested }}>
            <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/40 flex-shrink-0">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-lg font-bold text-white">My Submissions</h1>
                    <span className="text-[10px] text-gray-500">
                        {loading
                            ? 'loading…'
                            : `${items.length} item${items.length === 1 ? '' : 's'} · ${nonFeatured} of ${cap >= 1000 ? '∞' : cap} slot${cap === 1 ? '' : 's'} used`}
                    </span>
                </div>
                <div className="flex gap-2">
                    <GhostButton
                        onClick={() => void refresh()}
                        disabled={loading}
                        className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded disabled:opacity-50"
                    >
                        Refresh
                    </GhostButton>
                    <GhostButton
                        onClick={close}
                        className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded"
                    >
                        Close (Esc)
                    </GhostButton>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                {error && (
                    <ErrorNote className="text-xs text-red-400 max-w-3xl mx-auto mb-4 p-3">
                        {error}
                    </ErrorNote>
                )}

                {!loading && items.length === 0 && (
                    <div className="text-sm text-gray-500 max-w-xl mx-auto mt-12 text-center leading-relaxed">
                        No submissions yet.<br/>
                        <span className="text-[11px] text-gray-600">
                            Compose a scene and use File → Submit to Gallery to share it.
                        </span>
                    </div>
                )}

                <div className="max-w-3xl mx-auto space-y-3">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`flex gap-3 p-3 rounded-lg border ${
                                item.status === 'rejected' ? 'opacity-60' : ''
                            } ${
                                item.status === 'pending'
                                    ? 'bg-amber-500/[0.04] border-amber-500/20'
                                    : 'bg-white/[0.02] border-white/10'
                            } ${busyId === item.id ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <a
                                href={item.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 block w-20 h-20 rounded overflow-hidden bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-colors"
                                title="Open full image in new tab"
                            >
                                <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                            </a>

                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-white truncate">{item.title}</span>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${STATUS_PILL[item.status]}`}>
                                        {item.status}
                                    </span>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${VIS_PILL[item.visibility]}`}>
                                        {item.visibility}
                                    </span>
                                    {item.featured && (
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${GALLERY_FEATURED_BADGE}`}>
                                            featured
                                        </span>
                                    )}
                                    <span className="text-[9px] text-gray-500 ml-auto font-mono">{item.slug}</span>
                                </div>

                                <div className="text-[10px] text-gray-400">
                                    {item.formula}
                                    <span className="text-gray-600"> · {new Date(item.created_at).toLocaleString()}</span>
                                </div>

                                {item.description && (
                                    <div className="text-[10px] text-gray-500 line-clamp-2">{item.description}</div>
                                )}

                                {item.status === 'rejected' && (
                                    <div className="text-[10px] text-gray-400 leading-relaxed mt-0.5">
                                        Not accepted into the gallery — you can adjust the scene and resubmit.
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5 flex-shrink-0 self-center">
                                {item.status !== 'rejected' && (
                                    <GhostButton
                                        onClick={() => onToggleVisibility(item)}
                                        className="text-[10px] font-bold px-3 py-1.5 rounded text-gray-300"
                                        title={item.visibility === 'public'
                                            ? 'Hide from public browse'
                                            : 'Submit for public listing'}
                                    >
                                        Make {item.visibility === 'public' ? 'private' : 'public'}
                                    </GhostButton>
                                )}
                                <button
                                    onClick={() => onDelete(item)}
                                    className="text-[10px] font-bold px-3 py-1.5 rounded bg-red-700/30 hover:bg-red-700/60 text-red-200 border border-red-500/50"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
};
