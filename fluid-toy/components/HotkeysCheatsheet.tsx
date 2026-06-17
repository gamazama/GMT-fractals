/**
 * HotkeysCheatsheet — bottom-left HUD hotkeys panel.
 *
 * Copy + styling match the reference toy-fluid 1:1. Two states:
 *   - Expanded: boxed panel with a title bar, line-by-line entries
 *     mixing `<Key>` pills and prose, and a × button to collapse.
 *   - Collapsed: small "? hotkeys" pill that re-expands on click.
 *
 * `showHints` (the global H-toggle) is the master switch: when it's
 * off, neither state renders. Collapsing via × only flips the local
 * `expanded` state so the "? hotkeys" pill remains visible as a hint
 * that hotkeys exist.
 *
 * Registered onto @engine/hud via help.registerHudHint in main.tsx's
 * setup. Lives as a fluid-toy component rather than in engine because
 * the copy is app-specific — the engine-side default pill-row is fine
 * for apps that don't want this level of detail.
 */

import React, { useState } from 'react';

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-block px-1 py-px text-[9px] font-mono border border-white/20 rounded bg-white/10 text-white/90 mx-0.5">
        {children}
    </span>
);

export const HotkeysCheatsheet: React.FC = () => {
    const [expanded, setExpanded] = useState(true);

    if (expanded) {
        return (
            <div className="px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[360px] pointer-events-auto shadow-xl">
                <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] uppercase text-cyan-300 tracking-wide">Hotkeys</div>
                    <button
                        onClick={() => setExpanded(false)}
                        className="text-gray-500 hover:text-gray-200 text-[12px] px-1 leading-none"
                        title="Hide (click ? to reopen)"
                    >×</button>
                </div>
                <ul className="space-y-0.5 leading-snug">
                    <li><Key>Drag</Key> inject force + dye into the fluid</li>
                    <li><Key>B</Key>+<Key>Drag</Key> resize the brush live (horizontal = scale)</li>
                    <li><Key>C</Key>+<Key>Drag</Key> pick Julia c directly on the canvas</li>
                    <li><Key>Right-click</Key>+<Key>Drag</Key> pan the fractal view</li>
                    <li><Key>Right-click</Key> (tap) canvas for quick actions menu</li>
                    <li><Key>Shift</Key>/<Key>Alt</Key> precision modifiers (5× / 0.2×) for any drag</li>
                    <li><Key>Wheel</Key> zoom · <Key>Middle</Key>+<Key>Drag</Key> smooth zoom · <Key>Home</Key> recenter</li>
                    <li><Key>Space</Key> pause sim · <Key>R</Key> clear fluid · <Key>O</Key> toggle c-orbit · <Key>H</Key> hide hints</li>
                </ul>
            </div>
        );
    }

    return (
        <button
            onClick={() => setExpanded(true)}
            className="px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70 pointer-events-auto"
            title="Show hotkeys"
        >? hotkeys</button>
    );
};
