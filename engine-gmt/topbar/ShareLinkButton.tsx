/**
 * ShareLinkButton — topbar right-slot button that shares the current scene as a
 * short link (`?s=<id>`), backed by the gallery backend (share-scene edge
 * function + shared_scenes table).
 *
 * Why backend, not the old `#s=` preset-diff hash: a GMF blob embeds the full
 * fused shader (FormulaFormat.saveGMFScene), so this shares ANY scene — weaves,
 * MB3D imports, Workshop formulas — the exact cases the `#s=` diff couldn't
 * reconstruct. It's also a fixed-length link regardless of scene size. Free +
 * no sign-in; a signed-in user's shares also land in "My Fractals".
 *
 * The upload is a network round-trip, so the button shows an in-flight state and
 * the clipboard write happens after an await — which can lose transient
 * activation in some browsers, so we fall back to surfacing the link in a toast
 * for manual copy when the auto-copy is blocked.
 */

import React, { useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { saveGMFScene } from '../utils/FormulaFormat';
import { createSharedScene, ShareSceneError } from '../gallery/sharedScene';
import { showToast } from '../../engine/store/toastStore';

export type ShareLinkStatus = 'idle' | 'sharing' | 'copied' | 'error';
type Status = ShareLinkStatus;

/**
 * Share the current scene and copy its link to the clipboard, firing toast
 * feedback (so callers that aren't the button — e.g. the topbar menu item — get
 * feedback too). Returns the resulting status for the button's badge.
 *
 *   'copied' — link created; copied to clipboard (or shown in a toast to copy)
 *   'error'  — serialize / upload / network failure (message toasted)
 */
export const copyShareLink = async (): Promise<Status> => {
    const state = useEngineStore.getState() as any;
    const preset = state.getPreset({ includeScene: true });

    let gmf: string;
    try {
        gmf = saveGMFScene(preset);
    } catch {
        showToast("Couldn't prepare this scene for sharing.", 'error');
        return 'error';
    }
    // saveGMFScene falls back to raw JSON (no <Scene> tag, no embedded shader)
    // when the formula isn't in the registry — a recipient couldn't rebuild it,
    // so refuse rather than mint a broken link.
    if (!gmf.includes('<Scene>')) {
        showToast("This scene can't be shared by link — try saving it as a .gmf file instead.", 'warning', 5000);
        return 'error';
    }

    try {
        const { id } = await createSharedScene(gmf, { title: preset.name, formula: preset.formula });
        const url = `${window.location.origin}${window.location.pathname}?s=${id}`;
        let copied = false;
        try { await navigator.clipboard.writeText(url); copied = true; } catch { /* activation lost / blocked */ }
        if (copied) showToast('Share link copied to clipboard.', 'success', 3500);
        else showToast(`Share link: ${url}`, 'info', 8000);
        return 'copied';
    } catch (e) {
        const msg = e instanceof ShareSceneError
            ? (e.status === 429 ? 'Too many shares — try again in a bit.' : e.message)
            : 'Couldn’t reach the share service — check your connection and try again.';
        showToast(msg, 'error', 5000);
        return 'error';
    }
};

const LinkIcon: React.FC<{ active?: boolean }> = ({ active }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#4ade80' : 'currentColor'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

export const ShareLinkButton: React.FC = () => {
    const [status, setStatus] = useState<Status>('idle');

    const flash = (s: Status) => {
        setStatus(s);
        setTimeout(() => setStatus('idle'), 2500);
    };

    const handleClick = async () => {
        if (status === 'sharing') return;      // in-flight; ignore double-clicks
        setStatus('sharing');
        const result = await copyShareLink();  // fires its own toast feedback
        flash(result);
    };

    const label: Record<Status, string> = {
        idle:    '',
        sharing: 'Sharing…',
        copied:  'Copied!',
        error:   'Failed',
    };
    const color: Record<Status, string> = {
        idle:    '',
        sharing: 'bg-line/40',
        copied:  'bg-ok-strong',
        error:   'bg-warn-strong',
    };

    return (
        <div className="relative flex items-center">
            <button
                onClick={handleClick}
                disabled={status === 'sharing'}
                title="Copy a share link for this scene"
                className="flex items-center justify-center w-7 h-7 rounded text-fg-muted hover:text-fg hover:bg-line/10 transition-colors disabled:opacity-60"
            >
                <LinkIcon active={status === 'copied'} />
            </button>
            {status !== 'idle' && (
                <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-0.5 ${color[status]} text-fg text-[9px] font-bold rounded whitespace-nowrap animate-fade-in pointer-events-none z-50`}>
                    {label[status]}
                </div>
            )}
        </div>
    );
};
