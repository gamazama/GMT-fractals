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
 */
import React from 'react';
import { useToastStore, type ToastTone } from '../store/toastStore';

const TONE: Record<ToastTone, { border: string; dot: string; text: string }> = {
    success: { border: 'border-cyan-500/40', dot: 'bg-cyan-400', text: 'text-cyan-200' },
    warning: { border: 'border-amber-500/50', dot: 'bg-amber-400', text: 'text-amber-200' },
    error:   { border: 'border-red-500/50',   dot: 'bg-red-400',   text: 'text-red-200' },
    info:    { border: 'border-white/20',     dot: 'bg-white/60',  text: 'text-gray-200' },
};

export const ToastHost: React.FC = () => {
    const toasts = useToastStore((s) => s.toasts);
    const dismiss = useToastStore((s) => s.dismiss);
    if (toasts.length === 0) return null;
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[900] flex flex-col items-center gap-2 pointer-events-none">
            {toasts.map((t) => {
                const c = TONE[t.tone];
                return (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => dismiss(t.id)}
                        title="Dismiss"
                        className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 bg-gray-900/95 border ${c.border} rounded-lg shadow-xl backdrop-blur-md animate-fade-in max-w-[90vw]`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
                        <span className={`text-[11px] font-semibold ${c.text} whitespace-pre-wrap text-left`}>{t.message}</span>
                    </button>
                );
            })}
        </div>
    );
};
