import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEngineStore } from '../../store/engineStore';
import {
    submitGalleryItem,
    getSubmitToken,
    SubmitResult,
} from './submitGalleryItem';

interface Props {
    open: boolean;
    onClose: () => void;
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/;

const slugify = (s: string): string =>
    s.toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 60);

export const SubmitGalleryModal: React.FC<Props> = ({ open, onClose }) => {
    const projectName    = useEngineStore((s) => s.projectSettings.name);
    const projectAuthor  = useEngineStore((s) => s.projectSettings.author);
    const formula        = useEngineStore((s) => s.formula);

    const [slug, setSlug]               = useState('');
    const [title, setTitle]             = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags]               = useState('');
    const [author, setAuthor]           = useState('');
    const [featured, setFeatured]       = useState(false);

    const [submitting, setSubmitting]   = useState(false);
    const [error, setError]             = useState<string | null>(null);
    const [result, setResult]           = useState<SubmitResult | null>(null);

    const slugTouchedRef = useRef(false);

    // Re-prefill on open
    useEffect(() => {
        if (!open) return;
        setTitle(projectName === 'Untitled' ? '' : projectName);
        setSlug(slugify(projectName === 'Untitled' ? '' : projectName));
        setAuthor(projectAuthor ?? '');
        setDescription('');
        setTags('');
        setFeatured(false);
        setError(null);
        setResult(null);
        slugTouchedRef.current = false;
    }, [open, projectName, projectAuthor]);

    // Auto-derive slug from title until user manually edits the slug field
    useEffect(() => {
        if (!slugTouchedRef.current) setSlug(slugify(title));
    }, [title]);

    // ESC closes
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const tokenPresent = !!getSubmitToken();
    const slugValid    = SLUG_RE.test(slug);
    const titleValid   = title.trim().length >= 3 && title.trim().length <= 100;
    const tagsArr      = tags.split(',').map(t => t.trim()).filter(Boolean);
    const tagsValid    = tagsArr.length <= 8 && tagsArr.every(t => /^[a-z0-9][a-z0-9-]{0,23}$/.test(t));
    const canSubmit    = tokenPresent && slugValid && titleValid && tagsValid && !submitting && !result;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await submitGalleryItem({
                slug,
                title: title.trim(),
                description: description.trim() || undefined,
                formula,
                tags: tagsArr.length > 0 ? tagsArr : undefined,
                author: author.trim() || undefined,
                featured,
            });
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-gray-900 border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-[440px] max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h2 className="text-sm font-bold text-white">Submit to Gallery</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white text-lg leading-none"
                    >
                        &times;
                    </button>
                </header>

                {!tokenPresent && (
                    <div className="m-4 p-3 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 leading-relaxed">
                        No admin submit token configured. Open DevTools and run:
                        <pre className="mt-1 font-mono text-[10px] text-amber-200 break-all whitespace-pre-wrap">
localStorage.setItem('gmt_submit_token', '&lt;your token&gt;')
                        </pre>
                        Then reopen this dialog.
                    </div>
                )}

                {result && (
                    <div className="m-4 p-3 rounded bg-green-500/10 border border-green-500/30 text-[10px] text-green-300 leading-relaxed">
                        <div className="font-bold text-green-200 mb-1">Submitted successfully</div>
                        <div>Slug: <span className="font-mono">{result.slug}</span></div>
                        <div>Status: <span className="font-mono">{result.status}</span></div>
                        <div className="mt-2 text-green-400/70">
                            To approve: <code className="font-mono text-[9px]">update gallery_items set status='approved' where slug='{result.slug}';</code>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="m-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-300 leading-relaxed">
                        {error}
                    </div>
                )}

                <form className="p-4 space-y-3" onSubmit={handleSubmit}>
                    <div>
                        <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">
                            Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={!!result || submitting}
                            maxLength={100}
                            className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 disabled:opacity-50"
                            placeholder="Organic Tendrils"
                        />
                    </div>

                    <div>
                        <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">
                            Slug <span className="text-red-400">*</span>
                            {!slugValid && slug.length > 0 && (
                                <span className="text-red-400 ml-2 normal-case font-normal">
                                    (lowercase a-z 0-9 -, 3–60 chars)
                                </span>
                            )}
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => { slugTouchedRef.current = true; setSlug(e.target.value); }}
                            disabled={!!result || submitting}
                            maxLength={60}
                            className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500 disabled:opacity-50"
                            placeholder="organic-tendrils"
                        />
                    </div>

                    <div>
                        <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!!result || submitting}
                            maxLength={500}
                            rows={3}
                            className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 disabled:opacity-50 resize-none"
                            placeholder="A deep zoom into a Mandelbulb power-8 at iteration 32."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">
                                Formula
                            </label>
                            <input
                                type="text"
                                value={formula}
                                disabled
                                className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-400 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">
                                Author
                            </label>
                            <input
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                disabled={!!result || submitting}
                                maxLength={60}
                                className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 disabled:opacity-50"
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">
                            Tags <span className="text-gray-700 normal-case font-normal">(comma-separated, lowercase)</span>
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            disabled={!!result || submitting}
                            className={`w-full bg-gray-950 border rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 disabled:opacity-50 ${tagsValid ? 'border-white/10' : 'border-red-500/50'}`}
                            placeholder="organic, deep-zoom"
                        />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={featured}
                            onChange={(e) => setFeatured(e.target.checked)}
                            disabled={!!result || submitting}
                            className="accent-cyan-500"
                        />
                        <span className="text-[10px] text-gray-300">
                            Featured <span className="text-gray-600">(pinned to top of browse)</span>
                        </span>
                    </label>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-3 rounded text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/10"
                        >
                            {result ? 'Close' : 'Cancel'}
                        </button>
                        {!result && (
                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="flex-1 py-2 px-3 rounded text-[11px] font-bold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Submitting…' : 'Submit'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
};
