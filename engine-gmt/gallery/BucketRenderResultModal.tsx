/**
 * BucketRenderResultModal — subscribes to FRACTAL_EVENTS.BUCKET_RENDER_COMPLETE
 * and offers a "submit this hi-res render to the gallery?" prompt.
 *
 * Fires on every completed bucket render. For multi-image renders (animation
 * sequences) the modal will re-appear per frame — user can dismiss with Esc
 * or Skip. A future refinement could suppress for that session after the
 * first dismiss, or only emit on single-image runs.
 *
 * Submission flow: clicking Submit hands the blob to the gallery store via
 * openSubmitWith() — SubmitGalleryModal then renders normally with that
 * blob as its source instead of capturing a fresh viewport snapshot.
 *
 * Sign-in is checked at submit-click time; signed-out users get a brief
 * prompt to sign in and the result is discarded (they can still re-submit
 * by re-rendering after sign-in).
 */
import React, { useEffect, useState } from 'react';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { useGalleryStore } from './galleryStore';
import { useAuthStore } from '../auth/authStore';
import { Modal, Z, stopNavKeys } from '../../components/ui';

interface PendingResult {
    blob: Blob;
    filename: string;
    width: number;
    height: number;
    previewUrl: string;
}

export const BucketRenderResultModal: React.FC = () => {
    const [pending, setPending] = useState<PendingResult | null>(null);

    const openAuthModal    = useAuthStore((s) => s.openAuthModal);
    const openSubmitWith   = useGalleryStore((s) => s.openSubmitWith);

    useEffect(() => {
        const handler = (data: { blob: Blob; filename: string; width: number; height: number }) => {
            setPending((prev) => {
                // If a previous prompt is still open, revoke its URL before
                // replacing — keeps blobs from accumulating in memory.
                if (prev) URL.revokeObjectURL(prev.previewUrl);
                return {
                    blob: data.blob,
                    filename: data.filename,
                    width: data.width,
                    height: data.height,
                    previewUrl: URL.createObjectURL(data.blob),
                };
            });
        };
        FractalEvents.on(FRACTAL_EVENTS.BUCKET_RENDER_COMPLETE, handler);
        return () => { FractalEvents.off(FRACTAL_EVENTS.BUCKET_RENDER_COMPLETE, handler); };
    }, []);

    if (!pending) return null;

    const dismiss = () => {
        URL.revokeObjectURL(pending.previewUrl);
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
                    <button onClick={dismiss} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
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
                            Submit to gallery
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
