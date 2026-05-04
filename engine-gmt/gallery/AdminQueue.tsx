import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGalleryStore } from './galleryStore';
import {
    listAllForModeration,
    approve,
    reject,
    setFeatured,
    ModerationItem,
} from './moderateGalleryItem';

const STATUS_PILL: Record<string, string> = {
    pending:  'bg-amber-500/20 text-amber-300 border-amber-500/40',
    approved: 'bg-green-500/20 text-green-300 border-green-500/40',
    rejected: 'bg-gray-700/40 text-gray-400 border-gray-600/40',
};

export const AdminQueueOverlay: React.FC = () => {
    const isOpen = useGalleryStore(s => s.isAdminOpen);
    const close  = useGalleryStore(s => s.closeAdmin);

    const [items, setItems] = useState<ModerationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busySlug, setBusySlug] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setItems(await listAllForModeration());
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) void refresh();
    }, [isOpen, refresh]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.stopPropagation(); close(); }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [isOpen, close]);

    if (!isOpen) return null;

    const onApprove = async (slug: string) => {
        setBusySlug(slug);
        try { const updated = await approve(slug); patchItem(updated); }
        catch (err) { setError(err instanceof Error ? err.message : String(err)); }
        finally { setBusySlug(null); }
    };
    const onReject = async (slug: string) => {
        setBusySlug(slug);
        try { const updated = await reject(slug); patchItem(updated); }
        catch (err) { setError(err instanceof Error ? err.message : String(err)); }
        finally { setBusySlug(null); }
    };
    const onToggleFeatured = async (slug: string, value: boolean) => {
        setBusySlug(slug);
        try { const updated = await setFeatured(slug, value); patchItem(updated); }
        catch (err) { setError(err instanceof Error ? err.message : String(err)); }
        finally { setBusySlug(null); }
    };

    const patchItem = (item: ModerationItem) => {
        setItems(prev => prev.map(p => p.slug === item.slug ? item : p));
    };

    const counts = items.reduce(
        (acc, it) => { acc[it.status] = (acc[it.status] ?? 0) + 1; return acc; },
        {} as Record<string, number>,
    );

    return createPortal(
        <div className="fixed inset-0 z-[2050] bg-black/85 backdrop-blur-md flex flex-col">
            <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/40">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-lg font-bold text-white">Gallery Admin</h1>
                    <span className="text-[10px] text-gray-500">
                        {loading ? 'loading…' : `${items.length} total · pending ${counts.pending ?? 0} · approved ${counts.approved ?? 0} · rejected ${counts.rejected ?? 0}`}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => void refresh()}
                        disabled={loading}
                        className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 disabled:opacity-50"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={close}
                        className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10"
                    >
                        Close (Esc)
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                {error && (
                    <div className="text-xs text-red-400 max-w-xl mx-auto mb-4 p-3 rounded bg-red-500/10 border border-red-500/30">
                        {error}
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div className="text-sm text-gray-500 max-w-xl mx-auto mt-12 text-center">No submissions.</div>
                )}

                <div className="space-y-3">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`flex gap-3 p-3 rounded-lg border transition-opacity ${
                                item.status === 'rejected' ? 'opacity-50' : ''
                            } ${
                                item.status === 'pending'
                                    ? 'bg-amber-500/[0.04] border-amber-500/20'
                                    : 'bg-white/[0.02] border-white/10'
                            } ${busySlug === item.slug ? 'pointer-events-none opacity-60' : ''}`}
                        >
                            <a
                                href={item.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 block w-24 h-24 rounded overflow-hidden bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-colors"
                                title="Open full image in new tab"
                            >
                                <img
                                    src={item.thumbnail_url}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                />
                            </a>

                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-white truncate">{item.title}</span>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${STATUS_PILL[item.status]}`}>
                                        {item.status}
                                    </span>
                                    {item.featured && (
                                        <span className="text-[8px] px-1.5 py-0.5 rounded border bg-cyan-500/20 text-cyan-300 border-cyan-500/40 uppercase tracking-wider font-bold">
                                            featured
                                        </span>
                                    )}
                                    <span className="text-[9px] text-gray-500 ml-auto font-mono">{item.slug}</span>
                                </div>

                                <div className="text-[10px] text-gray-400">
                                    {item.formula}
                                    {item.author && <span className="text-gray-600"> · by {item.author}</span>}
                                    <span className="text-gray-600"> · {new Date(item.created_at).toLocaleString()}</span>
                                </div>

                                {item.description && (
                                    <div className="text-[10px] text-gray-500 line-clamp-2">{item.description}</div>
                                )}

                                {item.tags && item.tags.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                        {item.tags.map(t => (
                                            <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400">{t}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5 flex-shrink-0 self-center">
                                {item.status !== 'approved' && (
                                    <button
                                        onClick={() => onApprove(item.slug)}
                                        className="text-[10px] font-bold px-3 py-1.5 rounded bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/40"
                                    >
                                        Approve
                                    </button>
                                )}
                                {item.status !== 'rejected' && (
                                    <button
                                        onClick={() => onReject(item.slug)}
                                        className="text-[10px] font-bold px-3 py-1.5 rounded bg-red-600/15 hover:bg-red-600/30 text-red-300 border border-red-500/30"
                                    >
                                        Reject
                                    </button>
                                )}
                                {item.status === 'approved' && (
                                    <button
                                        onClick={() => onToggleFeatured(item.slug, !item.featured)}
                                        className={`text-[10px] font-bold px-3 py-1.5 rounded border ${
                                            item.featured
                                                ? 'bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border-cyan-500/50'
                                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 border-white/10'
                                        }`}
                                    >
                                        {item.featured ? 'Unfeature' : 'Feature'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
};
