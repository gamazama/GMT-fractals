/**
 * On-screen renderer diagnostics — shown when the URL contains `?diag`.
 *
 * The renderer runs in a Web Worker on an OffscreenCanvas, so on devices we
 * can't physically test (mobile GPUs) there's no console to read. Appending
 * `?diag` to the URL prints the WebGL2 capability report (GPU, float/half-float
 * renderability, fragment `highp`, key extensions) right on the screen, with a
 * one-tap "Send report" via feedback and a "Copy" button — no typing, no cable.
 *
 * Always-available (not advanced-gated): it's the support channel for "it's
 * black on my phone" reports.
 */
import React, { useState } from 'react';
import { collectBootDiagnostics } from '../engine-gmt/engine/webglDiagnostics';
import { submitFeedback } from '../engine-gmt/feedback/FeedbackClient';
import { useClipboardCopy } from '../hooks/useClipboardCopy';
import { Layer } from '../components/ui';

const diagRequested = (): boolean => {
    try { return new URLSearchParams(window.location.search).has('diag'); }
    catch { return false; }
};

export const DiagnosticsOverlay: React.FC = () => {
    const [open, setOpen] = useState(diagRequested);
    const [report] = useState(() => (diagRequested() ? collectBootDiagnostics() : ''));
    const [sent, setSent] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const clip = useClipboardCopy(1500);

    if (!open) return null;

    const send = async () => {
        setSent('sending');
        try {
            await submitFeedback({ category: 'bug', message: `Renderer diagnostics (manual)\n\n${report}`, includeScene: false });
            setSent('sent');
        } catch { setSent('error'); }
    };

    const copy = () => clip.copy(report);

    return (
        <Layer tier="overlay" className="inset-0 flex flex-col items-center justify-center bg-surface p-4">
            <div className="w-[520px] max-w-full bg-surface-sunken/90 border border-accent-500/40 rounded-xl p-5 shadow-[0_0_50px_rgb(var(--accent-glow)/0.15)]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-accent-400/80 mb-2">Renderer diagnostics</div>
                <div className="font-mono text-[10px] leading-relaxed text-fg-secondary whitespace-pre-wrap break-words max-h-[55vh] overflow-auto bg-surface-section rounded p-2 border border-line/5">
                    {report || '(none)'}
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                    <button
                        onClick={send}
                        disabled={sent === 'sending' || sent === 'sent'}
                        className="px-4 py-2 text-xs font-bold rounded border border-accent-500/40 bg-accent-900/30 text-accent-300 hover:bg-accent-800/40 hover:text-fg transition-colors disabled:opacity-50 disabled:cursor-default"
                    >
                        {sent === 'idle' && 'Send report'}
                        {sent === 'sending' && 'Sending…'}
                        {sent === 'sent' && 'Sent ✓'}
                        {sent === 'error' && 'Failed — retry'}
                    </button>
                    <button
                        onClick={copy}
                        className="px-4 py-2 text-xs font-bold rounded border border-line/15 bg-line/5 text-fg-secondary hover:bg-line/10 hover:text-fg transition-colors"
                    >
                        {clip.state === 'copied' ? 'Copied ✓' : 'Copy'}
                    </button>
                    <button
                        onClick={() => setOpen(false)}
                        className="px-4 py-2 text-xs font-bold rounded border border-line/15 bg-line/5 text-fg-muted hover:text-fg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Layer>
    );
};
