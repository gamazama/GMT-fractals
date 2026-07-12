/**
 * GMT-specific body for the engine Help plugin's `about` slot. The plugin
 * owns the menu item + expand scaffold; this component owns the GMT content
 * (version, GPU info, credits, links).
 *
 * The "Support GMT" body lives in `engine-gmt/support.ts` (gmtSupportConfig)
 * so every engine app shares one definition.
 */

import React, { useEffect, useState } from 'react';
import { getProxy } from '../engine-gmt';
import { useEngineStore } from '../store/engineStore';
import { menu, type MenuItem } from '../engine/plugins/Menu';
import pkg from '../package.json';

// Kept as a string literal (NOT imported from data/help/topics/changelog) so the
// lazy ~8KB changelog content stays out of the main bundle. Matches how the Help
// plugin references topic ids like 'general.shortcuts'.
const CHANGELOG_TOPIC_ID = 'changelog.whats-new';

// ── "What's New" unseen-update indicator ───────────────────────────────
// A dot lights the ? menu and the What's New item is highlighted whenever the
// app version is newer than the last version the user opened the changelog for.
// Persisted in localStorage so it survives reloads and re-appears on the next
// release. First run (no stored value) counts as unseen, giving existing users
// a one-time nudge for the current release. Cleared when they open the page.
const SEEN_KEY = 'gmt.whatsNew.seenVersion';
let _unseen: boolean | null = null;

/** True when there's a release the user hasn't opened the changelog for. */
export const isWhatsNewUnseen = (): boolean => {
    if (_unseen === null) {
        try { _unseen = localStorage.getItem(SEEN_KEY) !== pkg.version; }
        catch { _unseen = false; }
    }
    return _unseen;
};

/** Mark the current version's changelog as seen — clears the dot + highlight. */
export const markWhatsNewSeen = (): void => {
    try { localStorage.setItem(SEEN_KEY, pkg.version); } catch { /* private mode */ }
    _unseen = false;
    menu.refresh(); // re-render the ? anchor so the dot clears immediately
};

/** Open the "What's New" changelog help page (and mark it seen). */
const openChangelog = () => {
    markWhatsNewSeen();
    (useEngineStore.getState() as any).openHelp?.(CHANGELOG_TOPIC_ID);
};

const SparkleIcon: React.FC = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 4.8L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.7z" />
        <path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
);

/**
 * MenuItem for `installHelp({ extraItems: [...] })` — mirrors feedbackMenuItem's
 * wiring. Opens the changelog help page. Fixed id so re-registering replaces
 * rather than duplicates.
 */
export const whatsNewMenuItem = (opts: { id?: string; label?: string } = {}): MenuItem => ({
    id: opts.id ?? 'whats-new',
    type: 'button',
    label: opts.label ?? "What's New",
    icon: <SparkleIcon />,
    title: 'See the latest GMT updates and full version history',
    badge: () => isWhatsNewUnseen(),
    onSelect: () => openChangelog(),
});

export const AboutGmtBody: React.FC = () => {
    const [gpuInfo, setGpuInfo] = useState<string>('');

    useEffect(() => {
        const proxy = getProxy();
        const initial = proxy.gpuInfo;
        if (initial && initial !== 'Generic WebGL Device') {
            setGpuInfo(initial);
            return;
        }
        const t = setTimeout(() => setGpuInfo(getProxy().gpuInfo || 'Generic WebGL Device'), 3000);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="text-[10px] text-fg-muted leading-relaxed space-y-2">
            {gpuInfo && (
                <div className="mb-2 pb-2 border-b border-line/10">
                    <div className="text-[8px] text-fg-dim font-bold mb-1">Active Renderer</div>
                    <div className="text-[9px] text-ok font-mono break-all">{gpuInfo}</div>
                </div>
            )}
            <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] text-fg-dim font-mono">v{pkg.version}</p>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openChangelog(); }}
                    className="text-[9px] text-accent-400 hover:underline hover:text-accent-300 transition-colors"
                >
                    What's New →
                </button>
            </div>
            <p>
                GMT was crafted with ❤️ by <span className="text-fg font-bold">Guy Zack</span> using{' '}
                <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">Gemini</a>{' '}
                and{' '}
                <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">Claude</a>.
            </p>

            <div className="pt-2 border-t border-line/10">
                <div className="text-[8px] text-fg-dim font-bold mb-1">Tech Stack</div>
                <div className="text-[9px] text-fg-dim font-mono">React + TypeScript + Three.js + GLSL + Zustand + Vite</div>
            </div>

            <div className="flex flex-col gap-1 pt-2 border-t border-line/10">
                <a href="https://www.reddit.com/r/GMT_fractals/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-fg transition-colors">
                    <span>Community:</span>
                    <span className="text-accent-400 hover:underline">r/GMT_fractals</span>
                </a>
                <a href="https://github.com/gamazama/GMT-fractals" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-fg transition-colors">
                    <span>Source:</span>
                    <span className="text-accent-400 hover:underline">GitHub (GPL-3.0)</span>
                </a>
            </div>

            <div className="pt-2 border-t border-line/10">
                <p className="text-[9px] text-fg-dim">GMT is free &amp; open source.</p>
            </div>
        </div>
    );
};
