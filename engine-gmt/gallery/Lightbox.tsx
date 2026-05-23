/**
 * Lightbox — modal overlay shown when a gallery tile is clicked.
 *
 * Plan 44 §2.1: image-dominant layout, right sidebar for metadata,
 * "More from @user" strip below. Keyboard nav: ← → step through items
 * in the current browse view; Esc closes (capture-phase so the
 * gallery's Esc handler doesn't also fire); Enter triggers "Open in GMT".
 */
import React, { useEffect, useMemo, useState } from 'react';
import { GalleryItem } from './GalleryClient';

interface Props {
    item: GalleryItem;
    /** Full list of items currently in the browse view — used for prev/next
     *  navigation and the "More from @user" strip. */
    items: GalleryItem[];
    /** True while loadGalleryScene is in progress for the current item. */
    loading: boolean;
    /** Optional error from a failed load attempt. */
    loadError: string | null;
    onClose: () => void;
    onLoadScene: (item: GalleryItem) => void;
    onNavigate: (item: GalleryItem) => void;
}

export const Lightbox: React.FC<Props> = ({ item, items, loading, loadError, onClose, onLoadScene, onNavigate }) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    // 'fit' = object-contain into the pane; '100' = native-resolution with
    // overflow-auto on the parent so the user can scroll to see pixels.
    const [zoomMode, setZoomMode] = useState<'fit' | '100'>('fit');
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

    // Reset img-loaded + zoom state when the displayed item changes (prev/next).
    useEffect(() => {
        setImgLoaded(false);
        setZoomMode('fit');
        setCopyState('idle');
    }, [item.id]);

    const copyImageLink = async () => {
        try {
            await navigator.clipboard.writeText(item.image_url);
            setCopyState('copied');
        } catch {
            setCopyState('failed');
        }
        setTimeout(() => setCopyState('idle'), 1800);
    };

    // Prev/next within current view
    const index = useMemo(() => items.findIndex(i => i.id === item.id), [items, item.id]);
    const prevItem = index > 0 ? items[index - 1] : null;
    const nextItem = index >= 0 && index < items.length - 1 ? items[index + 1] : null;

    // Other items by same author (excluding the current item)
    const moreFromAuthor = useMemo(() => {
        if (!item.user_id) return [];
        return items.filter(i => i.user_id === item.user_id && i.id !== item.id).slice(0, 6);
    }, [items, item]);

    // Keyboard shortcuts — capture phase so the parent gallery's Esc doesn't
    // also fire. Arrows + Enter only act while this lightbox is mounted.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // In zoomed mode, Esc first drops back to fit; second Esc closes.
                if (zoomMode === '100') { e.stopPropagation(); setZoomMode('fit'); }
                else                    { e.stopPropagation(); onClose(); }
            }
            else if (e.key === 'ArrowLeft'  && prevItem) { e.stopPropagation(); onNavigate(prevItem); }
            else if (e.key === 'ArrowRight' && nextItem) { e.stopPropagation(); onNavigate(nextItem); }
            else if (e.key === 'Enter' && !loading)      { e.stopPropagation(); onLoadScene(item); }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [item, prevItem, nextItem, loading, zoomMode, onClose, onLoadScene, onNavigate]);

    const formatRelative = (iso: string): string => {
        const now    = Date.now();
        const past   = new Date(iso).getTime();
        const secs   = Math.max(0, Math.round((now - past) / 1000));
        if (secs < 60)         return `${secs}s ago`;
        const mins = Math.round(secs / 60);
        if (mins < 60)         return `${mins}m ago`;
        const hours = Math.round(mins / 60);
        if (hours < 24)        return `${hours}h ago`;
        const days = Math.round(hours / 24);
        if (days < 30)         return `${days}d ago`;
        const months = Math.round(days / 30);
        if (months < 12)       return `${months}mo ago`;
        return `${Math.round(months / 12)}y ago`;
    };

    return (
        <div
            className="fixed inset-0 z-[2050] bg-black/95 backdrop-blur-md flex flex-col"
            onClick={onClose}
        >
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/40 flex-shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10"
                >
                    ← Back to gallery
                </button>
                <div className="text-[10px] text-gray-500 font-mono">
                    {index >= 0 && `${index + 1} / ${items.length}`}
                </div>
            </div>

            {/* Main content — image + sidebar */}
            <div
                className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Image pane — fit mode centres + contains; 100 mode scrolls. */}
                <div
                    className={`flex-1 relative bg-black/40 min-h-0 ${
                        zoomMode === 'fit' ? 'flex items-center justify-center overflow-hidden' : 'overflow-auto'
                    }`}
                >
                    {!imgLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-500 pointer-events-none">
                            loading image…
                        </div>
                    )}
                    <img
                        src={item.image_url}
                        alt={item.title}
                        onLoad={() => setImgLoaded(true)}
                        onClick={() => setZoomMode(zoomMode === 'fit' ? '100' : 'fit')}
                        className={`transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'} ${
                            zoomMode === 'fit'
                                ? 'max-w-full max-h-full object-contain cursor-zoom-in'
                                : 'max-w-none cursor-zoom-out'
                        }`}
                        style={zoomMode === '100' ? { width: 'auto', height: 'auto' } : undefined}
                    />

                    {/* Zoom pill */}
                    {imgLoaded && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-bold bg-black/60 border border-white/10 rounded text-gray-300 pointer-events-none">
                            {zoomMode === 'fit' ? 'Fit · click to zoom' : '100% · click to fit'}
                        </div>
                    )}

                    {/* Prev/next arrows — hidden in 100% mode so the image isn't crowded */}
                    {zoomMode === 'fit' && prevItem && (
                        <button
                            onClick={() => onNavigate(prevItem)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center text-lg leading-none"
                            title={`Previous (${prevItem.title})`}
                        >
                            ‹
                        </button>
                    )}
                    {zoomMode === 'fit' && nextItem && (
                        <button
                            onClick={() => onNavigate(nextItem)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center text-lg leading-none"
                            title={`Next (${nextItem.title})`}
                        >
                            ›
                        </button>
                    )}
                </div>

                {/* Sidebar */}
                <aside className="w-full md:w-80 md:flex-shrink-0 border-t md:border-t-0 md:border-l border-white/10 bg-black/60 overflow-y-auto">
                    <div className="p-5 space-y-4">
                        <div>
                            <h2 className="text-base font-bold text-white leading-tight">{item.title}</h2>
                            <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] text-gray-400">
                                {item.author && <span>by <span className="text-cyan-300">@{item.author}</span></span>}
                                <span className="text-gray-600">·</span>
                                <span>{item.formula}</span>
                                <span className="text-gray-600">·</span>
                                <span title={new Date(item.created_at).toLocaleString()}>{formatRelative(item.created_at)}</span>
                            </div>
                            {item.featured && (
                                <span className="inline-block mt-2 text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider font-bold">
                                    Featured
                                </span>
                            )}
                        </div>

                        {item.description && (
                            <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                        )}

                        {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {item.tags.map(t => (
                                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400">#{t}</span>
                                ))}
                            </div>
                        )}

                        {loadError && (
                            <div className="text-[10px] text-red-300 p-2 rounded bg-red-500/10 border border-red-500/30">
                                {loadError}
                            </div>
                        )}

                        <div className="space-y-2 pt-1">
                            <button
                                onClick={() => onLoadScene(item)}
                                disabled={loading}
                                className="w-full py-2 px-3 rounded text-[11px] font-bold bg-cyan-600/30 hover:bg-cyan-600/50 text-white border border-cyan-500/50 disabled:opacity-50"
                            >
                                {loading ? 'Loading scene…' : '▶ Open in GMT'}
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <a
                                    href={item.image_url}
                                    download={`${item.slug}.${item.image_format ?? 'jpg'}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="block py-2 px-3 rounded text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 border border-white/10 text-center no-underline"
                                >
                                    ↓ Download
                                </a>
                                <button
                                    onClick={copyImageLink}
                                    className={`py-2 px-3 rounded text-[11px] font-bold border transition-colors ${
                                        copyState === 'copied'
                                            ? 'bg-green-500/15 border-green-500/40 text-green-300'
                                            : copyState === 'failed'
                                                ? 'bg-red-500/15 border-red-500/40 text-red-300'
                                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 border-white/10'
                                    }`}
                                >
                                    {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Failed' : '🔗 Copy link'}
                                </button>
                            </div>
                        </div>

                        <div className="text-[9px] text-gray-600 leading-relaxed pt-1">
                            Keyboard: <kbd className="font-mono">←</kbd> <kbd className="font-mono">→</kbd> previous / next ·
                            <kbd className="font-mono"> Enter</kbd> open in GMT ·
                            <kbd className="font-mono"> Esc</kbd> close
                        </div>

                        {moreFromAuthor.length > 0 && (
                            <div className="border-t border-white/5 pt-4">
                                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    More from <span className="text-cyan-300">@{item.author}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {moreFromAuthor.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => onNavigate(m)}
                                            className="aspect-square block rounded overflow-hidden bg-black/40 border border-white/10 hover:border-cyan-500/60 transition-colors"
                                            title={m.title}
                                        >
                                            <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};
