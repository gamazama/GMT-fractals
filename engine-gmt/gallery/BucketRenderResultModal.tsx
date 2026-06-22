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
import { GhostButton } from '../../components/GhostButton';

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
                className="bg-surface-sunken border border-line/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-[420px] max-h-[90vh] overflow-y-auto"
                {...stopNavKeys({ allowEscape: true })}
            >
                <header className="flex items-center justify-between px-4 py-3 border-b border-line/10">
                    <h2 className="text-sm font-bold text-fg">Render complete</h2>
                    <button onClick={dismiss} aria-label="Close" className="text-fg-dim hover:text-fg"><CloseIcon /></button>
                </header>

                <div className="p-4 space-y-3">
                    <div className="aspect-[4/3] bg-surface-section border border-line/10 rounded overflow-hidden flex items-center justify-center">
                        <img
                            src={pending.previewUrl}
                            alt="Rendered output"
                            className="w-full h-full object-contain"
                        />
                    </div>

                    <div className="text-[10px] text-fg-muted leading-relaxed">
                        <span className="text-fg-tertiary font-mono">{pending.filename}</span> — {pending.width}×{pending.height} downloaded.
                        Submit this hi-res output to the gallery?
                    </div>

                    {extraCount > 0 && (
                        <div className="text-[10px] text-warn/80 leading-relaxed">
                            +{extraCount} more frame{extraCount === 1 ? '' : 's'} rendered &amp; downloaded while this was open.
                        </div>
                    )}

                    <div className="flex gap-2 pt-1">
                        <GhostButton
                            onClick={dismiss}
                            className="flex-1 py-2 px-3 rounded text-[11px] font-bold text-fg-tertiary"
                        >
                            Skip
                        </GhostButton>
                        <GhostButton
                            variant="primary"
                            onClick={onSubmit}
                            className="flex-1 py-2 px-3 rounded text-[11px] font-bold text-cyan-100"
                        >
                            Submit to Gallery
                        </GhostButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
