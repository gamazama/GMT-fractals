// On-screen showcase. The small top-left panel renders the boot block
// inline; "Show full source" opens a tabbed modal with every file the
// demo ships, all imported via Vite `?raw` so the code on screen is
// always exactly the code that just booted the app — no copy-paste
// drift between the README and reality.

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import bootSrc        from '../index.tsx?raw';
import featureSrc     from './DemoFeature.ts?raw';
import registerSrc    from './registerFeatures.ts?raw';
import setupSrc       from './setup.ts?raw';
import canvasRefSrc   from './demoCanvasRef.ts?raw';
import overlaySrc     from './DemoOverlay.tsx?raw';
import renderRunnerSrc from './demoRenderRunner.ts?raw';

const SHOWCASE_START = '// __SHOWCASE_START__';
const SHOWCASE_END   = '// __SHOWCASE_END__';

const sliceShowcase = (src: string): string => {
    const i = src.indexOf(SHOWCASE_START);
    const j = src.indexOf(SHOWCASE_END);
    if (i === -1 || j === -1 || j < i) return '// (showcase markers missing)';
    return src.slice(src.indexOf('\n', i) + 1, j).replace(/\s+$/g, '');
};

const SOURCES: Array<{ path: string; code: string }> = [
    { path: 'index.tsx',                 code: bootSrc },
    { path: 'demo/DemoFeature.ts',       code: featureSrc },
    { path: 'demo/registerFeatures.ts',  code: registerSrc },
    { path: 'demo/setup.ts',             code: setupSrc },
    { path: 'demo/demoCanvasRef.ts',     code: canvasRefSrc },
    { path: 'demo/DemoOverlay.tsx',      code: overlaySrc },
    { path: 'demo/demoRenderRunner.ts',  code: renderRunnerSrc },
];

const countLines = (s: string): number => s.split('\n').length;
const TOTAL_LINES = SOURCES.reduce((acc, f) => acc + countLines(f.code), 0);
const BOOT_SNIPPET = sliceShowcase(bootSrc);

export const DemoExplainer: React.FC = React.memo(() => {
    const [showSource, setShowSource] = useState(false);

    return (
        <>
            <div className="absolute top-4 left-4 max-w-[420px] pointer-events-none select-none">
                <div className="text-accent-500/80 text-[10px] font-mono tracking-wider mb-2">
                    // GMT engine — generic plugin host
                </div>
                <p className="text-xs leading-relaxed text-fg-muted mb-3">
                    Everything in this app — the right-dock Demo panel, sliders, undo,
                    save / load, PNG snapshot (Alt+S), video export, keyboard
                    shortcuts, modulation timeline — boots up from the lines below.
                    The <code className="text-fg-tertiary">DemoFeature</code> itself is a
                    single declarative object whose params become a Zustand slice, an
                    auto-generated panel, and a save/load round-trip — for free.
                </p>
                <pre className="text-[10px] font-mono leading-relaxed text-fg-dim bg-surface-section border border-line/5 rounded px-3 py-2.5 whitespace-pre overflow-x-auto pointer-events-auto select-text">
                    {BOOT_SNIPPET}
                </pre>
                <div className="mt-3 flex items-center gap-3 pointer-events-auto">
                    <button
                        type="button"
                        onClick={() => setShowSource(true)}
                        className="text-[10px] font-mono text-accent-400 hover:text-accent-300 border border-accent-500/30 hover:border-accent-400/60 rounded px-2.5 py-1 transition-colors"
                    >
                        Show full source ({SOURCES.length} files, {TOTAL_LINES} lines)
                    </button>
                </div>
            </div>
            {showSource && <SourceModal onClose={() => setShowSource(false)} />}
        </>
    );
});
DemoExplainer.displayName = 'DemoExplainer';

// ─── Source modal ─────────────────────────────────────────────────

interface SourceModalProps {
    onClose: () => void;
}

const SourceModal: React.FC<SourceModalProps> = ({ onClose }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const active = SOURCES[activeIdx];

    // Close on Escape — the modal traps focus loosely (no tabindex
    // dance), so a one-shot key listener is enough.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-6"
            onClick={onClose}
        >
            <div
                className="bg-surface-dock border border-line/10 rounded-lg shadow-2xl w-[min(960px,100%)] h-[min(800px,100%)] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-line/10">
                    <div>
                        <div className="text-accent-400 text-sm font-semibold">Demo source</div>
                        <div className="text-fg-dim text-[10px] font-mono">
                            {SOURCES.length} files · {TOTAL_LINES} lines · live from this build
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-fg-muted hover:text-fg text-lg leading-none px-2"
                        aria-label="Close source viewer"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-line/10 bg-surface-tabbar">
                    {SOURCES.map((f, i) => (
                        <button
                            key={f.path}
                            type="button"
                            onClick={() => setActiveIdx(i)}
                            className={
                                'text-[11px] font-mono px-2.5 py-1 rounded transition-colors ' +
                                (i === activeIdx
                                    ? 'bg-accent-500/15 text-accent-300 border border-accent-500/40'
                                    : 'text-fg-muted hover:text-fg hover:bg-line/5 border border-transparent')
                            }
                        >
                            {f.path}
                            <span className="text-fg-faint ml-1.5">{countLines(f.code)}L</span>
                        </button>
                    ))}
                </div>

                {/* Source */}
                <div className="flex-1 overflow-auto bg-surface-section p-4">
                    <pre className="text-[11px] font-mono leading-relaxed text-fg-tertiary whitespace-pre select-text">
                        {active.code.replace(/\s+$/, '')}
                    </pre>
                </div>
            </div>
        </div>,
        document.body,
    );
};
