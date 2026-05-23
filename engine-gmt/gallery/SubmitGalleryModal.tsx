import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEngineStore } from '../../store/engineStore';
import {
    submitGalleryItem, SubmitError, SubmitResult,
    captureJpegSnapshot, bakeSignature, transcodeToJpeg,
} from './submitGalleryItem';
import { useAuthStore, watermarkTextFor } from '../auth/authStore';
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
    const primaryFormula = useEngineStore((s) => s.formula);
    // Interlace state lives on the engine store as a DDFS feature slice;
    // when interlaceCompiled + interlaceFormula are set the active scene
    // is a hybrid of the primary + the secondary formula, and the
    // submission should attribute both.
    const interlaceCompiled  = useEngineStore((s) => (s as any).interlace?.interlaceCompiled as boolean | undefined);
    const interlaceSecondary = useEngineStore((s) => (s as any).interlace?.interlaceFormula  as string  | undefined);

    const formula = (interlaceCompiled && interlaceSecondary)
        ? `${primaryFormula} + ${interlaceSecondary}`
        : primaryFormula;

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
    const [previewExpanded, setPreviewExpanded] = useState(false);

    // Capture pipeline: base snapshot captured on open, final blob =
    // base ± signature bake. Both reset on close.
    const [baseJpg, setBaseJpg]         = useState<Blob | null>(null);
    const [finalJpg, setFinalJpg]       = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
    const [captureError, setCaptureError] = useState<string | null>(null);
    const [bakeWatermark, setBakeWatermark] = useState(true);

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
        setBaseJpg(null);
        setFinalJpg(null);
        setCaptureError(null);
        setBakeWatermark(profile?.watermark_enabled ?? true);
        slugTouchedRef.current = false;
    }, [open, projectName, profile?.watermark_enabled]);

    // Capture pipeline:
    //   - If openSubmitWith(source) preset a source blob (bucket render
    //     completion), transcode it to JPEG sized for the gallery.
    //   - Otherwise capture a fresh worker snapshot.
    // Re-bake happens via a separate effect when the watermark toggle flips.
    const submitSource = useGalleryStore((s) => s.submitSource);
    useEffect(() => {
        if (!open || authStatus !== 'authed' || !profile) return;
        let cancelled = false;
        setCaptureError(null);
        const promise = submitSource
            ? transcodeToJpeg(submitSource)
            : captureJpegSnapshot();
        promise
            .then((blob) => { if (!cancelled) setBaseJpg(blob); })
            .catch((err) => {
                if (!cancelled) setCaptureError(err instanceof Error ? err.message : String(err));
            });
        return () => { cancelled = true; };
    }, [open, authStatus, profile, submitSource]);

    // Recompute the final blob whenever the base or the watermark toggle
    // changes. Re-bakes the JPEG on a few ms of CPU per change — cheap.
    useEffect(() => {
        if (!baseJpg || !profile) {
            setFinalJpg(null);
            return;
        }
        let cancelled = false;
        const apply = bakeWatermark
            ? bakeSignature(baseJpg, watermarkTextFor(profile))
            : Promise.resolve(baseJpg);
        apply
            .then((blob) => { if (!cancelled) setFinalJpg(blob); })
            .catch((err) => {
                console.warn('[submit-modal] bake failed, falling back to unbaked:', err);
                if (!cancelled) setFinalJpg(baseJpg);
            });
        return () => { cancelled = true; };
    }, [baseJpg, bakeWatermark, profile]);

    // Manage preview object URL lifecycle — revoke the old one whenever
    // we have a new finalJpg, and on unmount.
    useEffect(() => {
        if (!finalJpg) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(finalJpg);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [finalJpg]);

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
    const previewReady = !!finalJpg;
    const canSubmit  = signedIn && slugValid && titleValid && tagsValid && previewReady && !submitting && !result;

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
            }, { jpgBlob: finalJpg! });
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

    const openGalleryFromSuccess = () => {
        onClose();
        useGalleryStore.getState().openGallery();
    };

    // ── Body content driven by state — only ONE of these renders ─────────
    // - 'signed-out'   : sign-in CTA
    // - 'cap-hit'      : slot cap message
    // - 'submitted'    : clean success view
    // - 'forming'      : two-column preview + form
    const bodyMode: 'signed-out' | 'cap-hit' | 'submitted' | 'forming' =
        !signedIn ? 'signed-out'
        : slotCapHit ? 'cap-hit'
        : result    ? 'submitted'
        : 'forming';

    const modalWidth = bodyMode === 'forming' ? 'w-[720px]' : 'w-[440px]';

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
                onKeyPress={(e) => e.stopPropagation()}
            >
                <div className={`bg-gray-900 border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] ${modalWidth} max-w-[95vw] max-h-[92vh] flex flex-col`}>
                    <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
                        <h2 className="text-sm font-bold text-white">
                            {bodyMode === 'submitted' ? 'Submitted' : 'Submit to Gallery'}
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
                    </header>

                    {/* ── Signed-out CTA ──────────────────────────────────────── */}
                    {bodyMode === 'signed-out' && (
                        <div className="p-6 text-center space-y-3">
                            <div className="text-[11px] text-cyan-200 leading-relaxed">You need to be signed in to submit a scene.</div>
                            <button
                                onClick={() => { onClose(); openAuthModal(); }}
                                className="px-3 py-1.5 rounded text-[11px] font-bold bg-cyan-600/40 hover:bg-cyan-600/60 text-white border border-cyan-500/50"
                            >
                                Sign in
                            </button>
                        </div>
                    )}

                    {/* ── Slot cap hit ────────────────────────────────────────── */}
                    {bodyMode === 'cap-hit' && slotCapHit && (
                        <div className="p-6 space-y-3 text-center">
                            <div className="text-sm font-bold text-amber-100">
                                {slotCapHit.verified ? `All ${slotCapHit.cap} slots are full` : 'Verify your email to submit more'}
                            </div>
                            <div className="text-[10px] text-amber-200 leading-relaxed">
                                {slotCapHit.verified
                                    ? `You're using ${slotCapHit.current} of ${slotCapHit.cap} active slots. Remove a submission to make room, or unlock unlimited for $5/mo.`
                                    : `Click the link in the email we sent you. Then come back and submit again.`}
                            </div>
                            <button
                                onClick={onClose}
                                className="px-3 py-1.5 rounded text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/10"
                            >
                                Close
                            </button>
                        </div>
                    )}

                    {/* ── Success view ────────────────────────────────────────── */}
                    {bodyMode === 'submitted' && result && (
                        <div className="p-6 space-y-4 text-center">
                            <div className="text-3xl">✓</div>
                            <div className="text-sm font-bold text-green-200">Submitted as @{(result.finalSlug ?? result.slug)}</div>
                            <div className="text-[10px] text-gray-400 space-y-1">
                                <div>
                                    Status <span className="font-mono text-green-300">{result.status}</span>
                                    <span className="text-gray-600 mx-1.5">·</span>
                                    Visibility <span className="font-mono text-green-300">{result.visibility}</span>
                                </div>
                                {result.slugChanged && (
                                    <div className="text-amber-300/80">
                                        Slug auto-suffixed — your requested slug was already taken.
                                    </div>
                                )}
                                {result.status === 'pending' && (
                                    <div className="text-green-400/70 leading-relaxed pt-1">
                                        Queued for review. Appears in browse once an admin approves it.
                                    </div>
                                )}
                                {result.status === 'approved' && result.visibility === 'public' && (
                                    <div className="text-green-400/70 leading-relaxed pt-1">
                                        Live in the gallery now.
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2 px-3 rounded text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/10"
                                >
                                    Done
                                </button>
                                <button
                                    onClick={openGalleryFromSuccess}
                                    className="flex-1 py-2 px-3 rounded text-[11px] font-bold bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-100 border border-cyan-500/50"
                                >
                                    View gallery
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Main forming view (two columns) ─────────────────────── */}
                    {bodyMode === 'forming' && (
                        <form className="flex-1 min-h-0 flex flex-col" onSubmit={handleSubmit}>
                            <div className="flex-1 min-h-0 grid grid-cols-[300px_1fr] gap-4 p-4 overflow-y-auto">
                                {/* Left: preview + watermark toggle */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Preview</label>
                                    <button
                                        type="button"
                                        onClick={() => previewUrl && setPreviewExpanded(true)}
                                        disabled={!previewUrl}
                                        className="aspect-[4/3] bg-black/40 border border-white/10 rounded overflow-hidden flex items-center justify-center hover:border-cyan-500/40 transition-colors disabled:cursor-default disabled:hover:border-white/10 group relative"
                                        title={previewUrl ? 'Click to view full size' : ''}
                                    >
                                        {captureError ? (
                                            <div className="text-[10px] text-red-300 text-center px-4 leading-relaxed">{captureError}</div>
                                        ) : previewUrl ? (
                                            <>
                                                <img src={previewUrl} alt="Submission preview" className="w-full h-full object-contain" />
                                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[8px] font-bold bg-black/60 border border-white/10 rounded text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Click to zoom
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-[10px] text-gray-500">Capturing scene…</div>
                                        )}
                                    </button>
                                    <label className="flex items-start gap-2 cursor-pointer select-none mt-1">
                                        <input
                                            type="checkbox"
                                            checked={bakeWatermark}
                                            onChange={(e) => setBakeWatermark(e.target.checked)}
                                            disabled={submitting}
                                            className="accent-cyan-500 mt-0.5"
                                        />
                                        <span className="text-[10px] text-gray-300 leading-snug">
                                            Bake author signature
                                            <div className="text-[9px] text-gray-600 mt-0.5 font-mono break-all">{watermarkTextFor(profile!)}</div>
                                        </span>
                                    </label>
                                    <div className="text-[9px] text-gray-500 mt-auto">
                                        Submitting as <span className="text-cyan-300 font-mono">@{profile!.username}</span>
                                    </div>
                                </div>

                                {/* Right: form fields */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">
                                            Title <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            disabled={submitting}
                                            maxLength={100}
                                            className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 disabled:opacity-50"
                                            placeholder="Organic Tendrils"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">
                                            Slug <span className="text-red-400">*</span>
                                            {!slugValid && slug.length > 0 && (
                                                <span className="text-red-400 ml-2 normal-case font-normal">(lowercase a-z 0-9 -, 3–60 chars)</span>
                                            )}
                                        </label>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => { slugTouchedRef.current = true; setSlug(e.target.value); }}
                                            disabled={submitting}
                                            maxLength={60}
                                            className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500 disabled:opacity-50"
                                            placeholder="organic-tendrils"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            disabled={submitting}
                                            maxLength={500}
                                            rows={2}
                                            className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 disabled:opacity-50 resize-none"
                                            placeholder="A deep zoom into a Mandelbulb power-8 at iteration 32."
                                        />
                                    </div>

                                    <div className="grid grid-cols-[1fr_1fr] gap-2">
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
                                            <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">Tags</label>
                                            <input
                                                type="text"
                                                value={tags}
                                                onChange={(e) => setTags(e.target.value)}
                                                disabled={submitting}
                                                className={`w-full bg-gray-950 border rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 disabled:opacity-50 ${tagsValid ? 'border-white/10' : 'border-red-500/50'}`}
                                                placeholder="organic, deep-zoom"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">Visibility</label>
                                        <div className="flex gap-2">
                                            {(['public', 'private'] as const).map((v) => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => setVisibility(v)}
                                                    disabled={submitting}
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

                                    {error && (
                                        <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-300 leading-relaxed">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sticky bottom action bar */}
                            <footer className="flex gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2 px-3 rounded text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="flex-[2] py-2 px-3 rounded text-[11px] font-bold bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-100 border border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Submitting…' : 'Submit to Gallery'}
                                </button>
                            </footer>
                        </form>
                    )}
                </div>
            </div>

            {/* Click-to-zoom preview overlay — separate portal so it sits above
                everything else and lets the modal stay open behind it. */}
            {previewExpanded && previewUrl && (
                <div
                    className="fixed inset-0 z-[2200] bg-black/95 backdrop-blur flex items-center justify-center cursor-zoom-out"
                    onClick={() => setPreviewExpanded(false)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setPreviewExpanded(false); }}
                >
                    <img
                        src={previewUrl}
                        alt="Submission full size"
                        className="max-w-[95vw] max-h-[95vh] object-contain"
                    />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-500">
                        Click or press Esc to close
                    </div>
                </div>
            )}
        </>,
        document.body,
    );
};
