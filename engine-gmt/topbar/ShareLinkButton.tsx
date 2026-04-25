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

type Status = 'idle' | 'copied' | 'long' | 'na';

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
    const formula = useEngineStore((s: any) => s.formula);
    const getShareString = useEngineStore((s: any) => s.getShareString);

    const flash = (s: Status) => {
        setStatus(s);
        setTimeout(() => setStatus('idle'), 2500);
    };

    const handleClick = async () => {
        // Workshop / imported formulas can't be encoded in a URL (shader
        // code not in the built-in registry).
        const def = registry.get(formula as any);
        if (!def) { flash('na'); return; }

        try {
            let shareStr = getShareString({ includeAnimations: true });
            const url = `${window.location.origin}${window.location.pathname}#s=${shareStr}`;
            let tooLong = false;

            if (url.length > 4096) {
                shareStr = getShareString({ includeAnimations: false });
                const shortUrl = `${window.location.origin}${window.location.pathname}#s=${shareStr}`;
                if (shortUrl.length <= 4096) {
                    await navigator.clipboard.writeText(shortUrl);
                    tooLong = true;
                } else {
                    await navigator.clipboard.writeText(shortUrl);
                    tooLong = true;
                }
            } else {
                await navigator.clipboard.writeText(url);
            }

            flash(tooLong ? 'long' : 'copied');
        } catch {
            flash('na');
        }
    };

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
