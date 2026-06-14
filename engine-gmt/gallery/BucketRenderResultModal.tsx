/**
 * BucketRenderResultModal — subscribes to FRACTAL_EVENTS.BUCKET_RENDER_COMPLETE
 * and offers a "submit this hi-res render to the gallery?" prompt.
 *
 * Fires on every completed bucket render. For multi-image renders (animation
 * sequences) frames stream in rapidly: rather than re-prompting per frame and
 * clobbering each prior blob, the modal keeps the first result shown and just
 * counts the extras ("+N more"), and after a dismiss it stays quiet for a few
 * seconds so the rest of the burst doesn't re-nag. Every frame is downloaded
 * regardless — the prompt only offers to submit one to the gallery.
 *
 * Submission flow: clicking Submit hands the blob to the gallery store via
 * openSubmitWith() — SubmitGalleryModal then renders normally with that
 * blob as its source instead of capturing a fresh viewport snapshot.
 *
 * Sign-in is checked at submit-click time; signed-out users get a brief
 * prompt to sign in and the result is discarded (they can still re-submit
 * by re-rendering after sign-in).
 */
import React, { useEffect, useState, useRef } from 'react';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { useGalleryStore } from './galleryStore';
import { useAuthStore } from '../auth/authStore';
import { Modal, Z, stopNavKeys } from '../../components/ui';
import { CloseIcon } from '../../components/Icons';

interface PendingResult {
    blob: Blob;
    filename: string;
    width: number;
    height: number;
    previewUrl: string;
}

export const BucketRenderResultModal: React.FC = () => {
    const [pending, setPending] = useState<PendingResult | null>(null);
    const [extraCount, setExtraCount] = useState(0);
    // After a dismiss/submit, ignore further auto-pops for a moment so a
    // streaming multi-frame sequence doesn't immediately re-nag.
    const suppressUntilRef = useRef(0);
    // Mirror of `pending` so the event handler can decide synchronously without
    // nesting setState calls inside an updater (React may invoke updaters more
    // than once — StrictMode / concurrent — which would mis-count extras).
    const pendingRef = useRef<PendingResult | null>(null);

    const openAuthModal    = useAuthStore((s) => s.openAuthModal);
    const openSubmitWith   = useGalleryStore((s) => s.openSubmitWith);

    useEffect(() => {
        const handler = (data: { blob: Blob; filename: string; width: number; height: number; multiTile?: boolean }) => {
            // Tiled render (rows×cols > 1): each tile saved as its own PNG. No
            // single tile — nor the un-stitched set — is a submittable image,
            // and the gallery server caps uploads at 5 MB, which a hi-res tile
            // would blow past anyway. Skip the prompt; the tiles still download.
            // TODO(gallery tiled-submit): accept tiled renders by stitching the
            //   tiles client-side, downscaling to the server's limit, and telling
            //   the user the gallery copy is a resized preview of their full-res
            //   tiled export (see backend submit-gallery-item: 5 MB JPG cap).
            if (data.multiTile) return;
            // A prompt is already open (sequence streaming in) — keep the first
            // shown and just tally the extras. Don't clobber its blob; each new
            // frame is already downloaded as its own file.
            if (pendingRef.current) {
                setExtraCount((c) => c + 1);
                return;
            }
            // Recently dismissed mid-burst — stay quiet, don't re-nag.
            if (Date.now() < suppressUntilRef.current) return;
            const next: PendingResult = {
                blob: data.blob,
                filename: data.filename,
                width: data.width,
                height: data.height,
                previewUrl: URL.createObjectURL(data.blob),
            };
            pendingRef.current = next;
            setExtraCount(0);
            setPending(next);
        };
        FractalEvents.on(FRACTAL_EVENTS.BUCKET_RENDER_COMPLETE, handler);
        return () => { FractalEvents.off(FRACTAL_EVENTS.BUCKET_RENDER_COMPLETE, handler); };
    }, []);

    if (!pending) return null;

    const dismiss = () => {
        URL.revokeObjectURL(pending.previewUrl);
        suppressUntilRef.current = Date.now() + 3000; // ride out the rest of a burst
        pendingRef.current = null;
        setExtraCount(0);
        setPending(null);
    };

    const onSubmit = () => {
        const authStatus = useAuthStore.getState().status;
        if (authStatus !== 'authed') {
            openAuthModal();
            return;
        }
        openSubmitWith(pending.blob);
        URL.revokeObjectURL(pending.previewUrl);
        suppressUntilRef.current = Date.now() + 3000;
        pendingRef.current = null;
        setExtraCount(0);
        setPending(null);
    };

    return (
        <Modal onClose={dismiss} z={Z.overlayResult} dismissOnBackdrop={false} backdropClassName="bg-black/70 backdrop-blur-sm" className="">
            <div
                className="bg-gray-900 border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-[420px] max-h-[90vh] overflow-y-auto"
                {...stopNavKeys({ allowEscape: true })}
            >
                <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h2 className="text-sm font-bold text-white">Render complete</h2>
                    <button onClick={dismiss} aria-label="Close" className="text-gray-500 hover:text-white"><CloseIcon /></button>
                </header>

                <div className="p-4 space-y-3">
                    <div className="aspect-[4/3] bg-black/40 border border-white/10 rounded overflow-hidden flex items-center justify-center">
                        <img
                            src={pending.previewUrl}
                            alt="Rendered output"
                            className="w-full h-full object-contain"
                        />
                    </div>

                    <div className="text-[10px] text-gray-400 leading-relaxed">
                        <span className="text-gray-300 font-mono">{pending.filename}</span> — {pending.width}×{pending.height} downloaded.
                        Submit this hi-res output to the gallery?
                    </div>

                    {extraCount > 0 && (
                        <div className="text-[10px] text-amber-300/80 leading-relaxed">
                            +{extraCount} more frame{extraCount === 1 ? '' : 's'} rendered &amp; downloaded while this was open.
                        </div>
                    )}

                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={dismiss}
                            className="flex-1 py-2 px-3 rounded text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/10"
                        >
                            Skip
                        </button>
                        <button
                            onClick={onSubmit}
                            className="flex-1 py-2 px-3 rounded text-[11px] font-bold bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-100 border border-cyan-500/50"
                        >
                            Submit to Gallery
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
