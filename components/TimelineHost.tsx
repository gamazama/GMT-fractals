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

import React, { Suspense, useState, useCallback } from 'react';
import { useEngineStore } from '../store/engineStore';
import { useAnimationStore } from '../store/animationStore';
import { TimelineOpenIcon } from './Icons';
import { useShortcut } from '../engine/plugins/Shortcuts';

const Timeline = React.lazy(() => import('./Timeline'));

export interface TimelineHostProps {
    /** Hide the toggle + panel entirely (e.g. broadcast / clean-feed mode). */
    hidden?: boolean;
}

export const TimelineHost: React.FC<TimelineHostProps> = ({ hidden = false }) => {
    const [showTimeline, setShowTimeline] = useState(false);
    const openContextMenu = useEngineStore((s) => s.openContextMenu);

    // T toggles timeline visibility — matches GMT's KeyT binding. The
    // state lives in this component, so the shortcut is registered
    // here rather than in app/main where the rest of the bindings sit.
    const toggleTimeline = useCallback(() => setShowTimeline((s) => !s), []);
    useShortcut({
        id: 'engine.timeline.toggle',
        key: 't',
        description: 'Toggle timeline panel',
        category: 'Timeline',
        handler: toggleTimeline,
    });

    // Space → play/pause. Generic for any engine app: requires tracks
    // to exist and skips when an app puts the camera in 'Fly' mode (so
    // Space stays bound to fly-up). The 'timeline-hover' scope below
    // shadows this with priority 10, so hovering the timeline always
    // plays even in Fly mode.
    const togglePlay = useCallback(() => {
        const { isPlaying, play, pause, sequence } = useAnimationStore.getState();
        if (Object.keys(sequence.tracks).length === 0) return;
        if (isPlaying) pause();
        else play();
    }, []);
    useShortcut({
        id: 'engine.timeline.toggle-play',
        key: 'Space',
        description: 'Play / pause animation',
        category: 'Timeline',
        handler: togglePlay,
        when: () => {
            const s = useEngineStore.getState() as any;
            return s.cameraMode !== 'Fly';
        },
    });
    useShortcut({
        id: 'engine.timeline.toggle-play-hovered',
        key: 'Space',
        scope: 'timeline-hover',
        priority: 10,
        description: 'Play / pause animation',
        category: 'Timeline',
        handler: togglePlay,
    });

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
