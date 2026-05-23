import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEngineStore } from '../../store/engineStore';
import { submitGalleryItem, SubmitError, SubmitResult } from './submitGalleryItem';
import { useAuthStore } from '../auth/authStore';
import { useGalleryStore } from './galleryStore';

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
    const projectName  = useEngineStore((s) => s.projectSettings.name);
    const formula      = useEngineStore((s) => s.formula);

    const authStatus       = useAuthStore((s) => s.status);
    const profile          = useAuthStore((s) => s.profile);
    const openAuthModal    = useAuthStore((s) => s.openAuthModal);

    const [slug, setSlug]               = useState('');
    const [title, setTitle]             = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags]               = useState('');
    const [visibility, setVisibility]   = useState<'public' | 'private'>('public');

    const [submitting, setSubmitting]   = useState(false);
    const [error, setError]             = useState<string | null>(null);
    const [slotCapHit, setSlotCapHit]   = useState<null | { cap: number; current: number; tier: string; verified: boolean }>(null);
    const [result, setResult]           = useState<SubmitResult | null>(null);

    const slugTouchedRef = useRef(false);

    useEffect(() => {
        if (!open) return;
        setTitle(projectName === 'Untitled' ? '' : projectName);
        setSlug(slugify(projectName === 'Untitled' ? '' : projectName));
        setDescription('');
        setTags('');
        setVisibility('public');
        setError(null);
        setSlotCapHit(null);
        setResult(null);
        slugTouchedRef.current = false;
    }, [open, projectName]);

    useEffect(() => {
        if (!slugTouchedRef.current) setSlug(slugify(title));
    }, [title]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [open, onClose]);

    if (!open) return null;

    const signedIn   = authStatus === 'authed' && !!profile;
    const slugValid  = SLUG_RE.test(slug);
    const titleValid = title.trim().length >= 3 && title.trim().length <= 100;
    const tagsArr    = tags.split(',').map(t => t.trim()).filter(Boolean);
    const tagsValid  = tagsArr.length <= 8 && tagsArr.every(t => /^[a-z0-9][a-z0-9-]{0,23}$/.test(t));
    const canSubmit  = signedIn && slugValid && titleValid && tagsValid && !submitting && !result;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        setSlotCapHit(null);
        try {
            const res = await submitGalleryItem({
                slug,
                title: title.trim(),
                description: description.trim() || undefined,
                formula,
                tags: tagsArr.length > 0 ? tagsArr : undefined,
                visibility,
            });
            setResult(res);
            // Invalidate browse query so the next gallery open shows the new
            // row immediately (and reflects it in any already-open gallery view).
            useGalleryStore.getState().bumpRefresh();
        } catch (err) {
            if (err instanceof SubmitError && err.detail?.code === 'SLOT_CAP_REACHED') {
                setSlotCapHit({
                    cap:      Number(err.detail.cap ?? 5),
                    current:  Number(err.detail.current ?? 0),
                    tier:     String(err.detail.tier ?? 'free'),
                    verified: Boolean(err.detail.verified),
                });
            } else {
                setError(err instanceof Error ? err.message : String(err));
            }
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
        >
            <div className="bg-gray-900 border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-[440px] max-h-[90vh] overflow-y-auto">
                <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h2 className="text-sm font-bold text-white">Submit to Gallery</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
                </header>

                {!signedIn && (
                    <div className="m-4 p-4 rounded bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-200 leading-relaxed text-center space-y-3">
                        <div>You need to be signed in to submit a scene.</div>
                        <button
                            onClick={() => { onClose(); openAuthModal(); }}
                            className="px-3 py-1.5 rounded text-[11px] font-bold bg-cyan-600/40 hover:bg-cyan-600/60 text-white border border-cyan-500/50"
                        >
                            Sign in
                        </button>
                    </div>
                )}

                {slotCapHit && (
                    <div className="m-4 p-3 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 leading-relaxed space-y-2">
                        <div className="font-bold text-amber-100">
                            {slotCapHit.verified ? `All ${slotCapHit.cap} slots are full` : 'Verify your email to submit more'}
                        </div>
                        {slotCapHit.verified ? (
                            <>
                                <div>You're using {slotCapHit.current} of {slotCapHit.cap} active slots. Remove a submission to make room, or unlock unlimited submissions for $5/mo.</div>
                                <div className="text-amber-400/80 italic">"My Submissions" view lands in the next polish pass — for now use the admin tools or contact support.</div>
                            </>
                        ) : (
                            <div>Click the link in the email we sent you. Then come back and submit again.</div>
                        )}
                    </div>
                )}

                {result && (
                    <div className="m-4 p-3 rounded bg-green-500/10 border border-green-500/30 text-[10px] text-green-300 leading-relaxed">
                        <div className="font-bold text-green-200 mb-1">Submitted successfully</div>
                        <div>Slug: <span className="font-mono">{result.finalSlug ?? result.slug}</span>{result.slugChanged && <span className="text-amber-300 ml-1">(auto-suffixed; original was taken)</span>}</div>
                        <div>Status: <span className="font-mono">{result.status}</span></div>
                        <div>Visibility: <span className="font-mono">{result.visibility}</span></div>
                        {result.status === 'pending' && (
                            <div className="mt-2 text-green-400/70">Your scene is queued for review — it'll appear in browse once an admin approves it.</div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="m-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-300 leading-relaxed">
                        {error}
                    </div>
                )}

                {signedIn && (
                    <form className="p-4 space-y-3" onSubmit={handleSubmit}>
                        <div className="text-[9px] text-gray-500">
                            Submitting as <span className="text-cyan-300 font-mono">@{profile!.username}</span>
                        </div>

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
                            <div className="text-[9px] text-gray-600 mt-1">Server auto-suffixes (-2, -3…) if taken.</div>
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

                        <div>
                            <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">Formula</label>
                            <input
                                type="text"
                                value={formula}
                                disabled
                                className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-400 outline-none"
                            />
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

                        <div>
                            <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">Visibility</label>
                            <div className="flex gap-2">
                                {(['public', 'private'] as const).map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setVisibility(v)}
                                        disabled={!!result || submitting}
                                        className={`flex-1 py-1.5 px-3 rounded text-[10px] font-bold border transition-colors ${
                                            visibility === v
                                                ? 'bg-cyan-600/30 border-cyan-500/50 text-cyan-200'
                                                : 'bg-white/[0.04] border-white/10 text-gray-400 hover:bg-white/[0.08]'
                                        }`}
                                    >
                                        {v === 'public' ? 'Public' : 'Private'}
                                    </button>
                                ))}
                            </div>
                            <div className="text-[9px] text-gray-600 mt-1">
                                {visibility === 'public'
                                    ? 'Visible in the browse view once approved.'
                                    : 'Only you can see this submission.'}
                            </div>
                        </div>

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
                )}
            </div>
        </div>,
        document.body,
    );
};
