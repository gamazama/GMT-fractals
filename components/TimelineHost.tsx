/**
 * TimelineHost — shared animation-timeline chrome for any engine app.
 *
 * Mounts the lazy-loaded <Timeline> panel and the fixed-position
 * bottom-left toggle button that opens it. Reads `openContextMenu`
 * from the store for the button's right-click help menu.
 *
 * Any engine-based app that wants keyframe animation UI renders this
 * once (usually at the root, alongside the viewport). The keyframe
 * buttons on primitives are meaningless without it.
 */

import React, { Suspense, useState } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { TimelineOpenIcon } from './Icons';

const Timeline = React.lazy(() => import('./Timeline'));

export interface TimelineHostProps {
    /** Hide the toggle + panel entirely (e.g. broadcast / clean-feed mode). */
    hidden?: boolean;
}

export const TimelineHost: React.FC<TimelineHostProps> = ({ hidden = false }) => {
    const [showTimeline, setShowTimeline] = useState(false);
    const openContextMenu = useFractalStore((s) => s.openContextMenu);

    if (hidden) return null;

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openContextMenu(e.clientX, e.clientY, [], ['ui.timeline']);
    };

    return (
        <>
            {!showTimeline && (
                <div className="fixed bottom-4 left-4 z-50 flex gap-2 transition-all duration-500">
                    <button
                        type="button"
                        onClick={() => setShowTimeline(true)}
                        onContextMenu={handleContextMenu}
                        className="p-2 rounded-full border shadow-lg transition-all bg-gray-800 border-gray-600 text-gray-400 hover:text-white"
                        title="Open Timeline"
                    >
                        <TimelineOpenIcon />
                    </button>
                </div>
            )}
            {showTimeline && (
                <Suspense fallback={null}>
                    <Timeline onClose={() => setShowTimeline(false)} />
                </Suspense>
            )}
        </>
    );
};
