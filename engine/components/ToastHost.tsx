/**
 * ToastHost — renders the app-wide transient toast queue (see
 * engine/store/toastStore.ts). Mount once at the app root, near the
 * other overlays.
 *
 * Bottom-centre by design: keeps clear of the top-centre
 * <CompilingIndicator/> and the top-right <StateLibraryToast/> so
 * multiple feedback channels never stack on top of each other. The
 * container is pointer-events-none (never blocks the viewport); each
 * pill is clickable to dismiss early.
 *
 * The bottom offset carries `env(safe-area-inset-bottom)` (added
 * 2026-09-10 for GE v2's phone layout): this host is `fixed`, so it is
 * measured off the viewport and sits OUTSIDE any
 * `MobileViewportShell` safe-area padding its app applies. `env()` is
 * 0 wherever there is no inset, so every desktop app is unchanged.
 *
 * WHERE IT STACKS is the tier table's call, not a literal here (ADR-0082;
 * until 2026-09-24 this carried a raw `z-[900]`). `tier` defaults to
 * `shellToast` — the same 900, rendered inline, so an app that passes
 * nothing stacks exactly as before. An app with a full-screen takeover
 * that raises toasts of its own passes `tier="toast"` (portalled, 3200):
 * GE v2 does, because its Wallpaper overlay (`overlay`, 2000) announces
 * every export with a toast and the shell-tier host drew them UNDER it —
 * an export finished or failed without a word (EW-01).
 *
 * The container is as wide as its widest toast, up to 90 vw
 * (`w-max max-w-[90vw]`). Centred with `left-1/2`, a shrink-to-fit box
 * only had the half of the viewport right of centre to fill, so a toast
 * wrapped at 50 vw — two lines for a 36-character message on a phone (J10).
 */
import React from 'react';
import { Layer, type Tier } from '../../components/ui';
import { useToastStore, type ToastTone } from '../store/toastStore';

const TONE: Record<ToastTone, { border: string; dot: string; text: string }> = {
    success: { border: 'border-accent-500/40', dot: 'bg-accent-400', text: 'text-accent-300' },
    warning: { border: 'border-warn/50', dot: 'bg-warn', text: 'text-warn' },
    error:   { border: 'border-danger/50',   dot: 'bg-danger',   text: 'text-danger' },
    info:    { border: 'border-line/20',     dot: 'bg-line/60',  text: 'text-fg-secondary' },
};

export const ToastHost: React.FC<{ tier?: Extract<Tier, 'shellToast' | 'toast'> }> = ({ tier = 'shellToast' }) => {
    const toasts = useToastStore((s) => s.toasts);
    const dismiss = useToastStore((s) => s.dismiss);
    if (toasts.length === 0) return null;
    return (
        // `fixed` (Layer's default position) is measured from the VIEWPORT, so
        // it sits outside `MobileViewportShell`'s safe-area padding and a toast
        // landed under the home indicator on a phone (GE v2 Phase F,
        // 2026-09-10). The inset is added here rather than by the host because
        // `fixed` children cannot inherit a parent's padding. `env()` resolves
        // to 0 everywhere there is no inset, so this is 24 px on desktop
        // exactly as `bottom-6` was.
        <Layer
            tier={tier}
            className="left-1/2 -translate-x-1/2 w-max max-w-[90vw] flex flex-col items-center gap-2 pointer-events-none"
            style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
            {toasts.map((t) => {
                const c = TONE[t.tone];
                return (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => dismiss(t.id)}
                        title="Dismiss"
                        // ENTERS, so a toast at the bottom edge is noticed rather than just being
                        // there (owner, 2026-09-24, 8c): index.css's `fade-in-up`, at 150 ms
                        // rather than its 300 (the inline duration wins over the class's
                        // shorthand). No exit: a dismissed toast simply goes.
                        className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 bg-surface-sunken/95 border ${c.border} rounded-lg shadow-xl backdrop-blur-md max-w-[90vw] animate-fade-in-up`}
                        style={{ animationDuration: '150ms' }}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
                        <span className={`text-[11px] font-semibold ${c.text} whitespace-pre-wrap text-left`}>{t.message}</span>
                    </button>
                );
            })}
        </Layer>
    );
};
