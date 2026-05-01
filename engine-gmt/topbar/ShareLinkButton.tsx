/**
 * ShareLinkButton — topbar right-slot button that copies the current
 * scene as a shareable URL (#s=... hash). Shows inline feedback:
 *   "Copied!"  — success
 *   "Too Long" — URL > 4096 chars; animations stripped, still copied
 *   "N/A"      — imported/Workshop formula, URL sharing unsupported
 */

import React, { useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { registry } from '../engine/FractalRegistry';

export type ShareLinkStatus = 'idle' | 'copied' | 'long' | 'na';
type Status = ShareLinkStatus;

/**
 * Copy the current scene's share URL to the clipboard. Returns the
 * resulting status so callers can render feedback (or ignore it).
 *
 *   'copied' — full URL ≤ 4096 chars copied
 *   'long'   — animations stripped to fit; truncated URL still copied
 *   'na'     — formula isn't in the built-in registry (Workshop / import)
 *              or clipboard write failed
 */
export const copyShareLink = async (): Promise<Status> => {
    const formula = (useEngineStore.getState() as any).formula;
    const getShareString = (useEngineStore.getState() as any).getShareString;
    const def = registry.get(formula);
    if (!def) return 'na';

    try {
        let shareStr = getShareString({ includeAnimations: true });
        const url = `${window.location.origin}${window.location.pathname}#s=${shareStr}`;
        if (url.length > 4096) {
            shareStr = getShareString({ includeAnimations: false });
            const shortUrl = `${window.location.origin}${window.location.pathname}#s=${shareStr}`;
            await navigator.clipboard.writeText(shortUrl);
            return 'long';
        }
        await navigator.clipboard.writeText(url);
        return 'copied';
    } catch {
        return 'na';
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
    // Subscribe so the disabled-title updates when the formula changes
    // (Workshop/imported formulas show "Share unavailable").
    const formula = useEngineStore((s: any) => s.formula);

    const flash = (s: Status) => {
        setStatus(s);
        setTimeout(() => setStatus('idle'), 2500);
    };

    const handleClick = async () => { flash(await copyShareLink()); };

    const label: Record<Status, string> = {
        idle:   '',
        copied: 'Copied!',
        long:   'Long URL',
        na:     'N/A',
    };
    const color: Record<Status, string> = {
        idle:   '',
        copied: 'bg-green-600',
        long:   'bg-amber-600',
        na:     'bg-gray-700',
    };

    return (
        <div className="relative flex items-center">
            <button
                onClick={handleClick}
                title={!registry.get(formula as any) ? 'Share unavailable for imported formulas' : 'Copy share link'}
                className="flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
                <LinkIcon active={status === 'copied'} />
            </button>
            {status !== 'idle' && (
                <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-0.5 ${color[status]} text-white text-[9px] font-bold rounded whitespace-nowrap animate-fade-in pointer-events-none z-50`}>
                    {label[status]}
                </div>
            )}
        </div>
    );
};
