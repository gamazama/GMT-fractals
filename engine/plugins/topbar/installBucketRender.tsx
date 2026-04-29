/**
 * installBucketRender — wire the generic BucketRenderPanel into the topbar.
 *
 * Each app provides a `BucketRenderController` adapter that exposes
 * start/stop/preview/accumulationCount. The install function registers a
 * topbar button (left slot, default order 30 to mirror GMT's pre-extraction
 * layout) which opens the panel popover.
 *
 * Idempotent. Apps with custom topbar chrome can override `slot`/`order`/`id`
 * to relocate the button.
 */

import React from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { RenderGridIcon } from '../../../components/Icons';
import { topbar, type TopBarSlot } from '../TopBar';
import BucketRenderPanel from './BucketRenderPanel';
import type { BucketRenderController } from './BucketRenderController';

export interface InstallBucketRenderOptions {
    controller: BucketRenderController;
    /** Topbar slot. Defaults to 'left'. */
    slot?: TopBarSlot;
    /** Sort order within the slot. Defaults to 30 (GMT layout). */
    order?: number;
    /** Item id (override only if multiple bucket buttons coexist). */
    id?: string;
}

let _installed = false;

export const installBucketRender = (options: InstallBucketRenderOptions): void => {
    if (_installed) return;
    _installed = true;

    const { controller, slot = 'left', order = 30, id = 'bucket-render' } = options;

    const BucketRenderToggle: React.FC = () => {
        const isBucketRendering = useEngineStore((s) => (s as { isBucketRendering?: boolean }).isBucketRendering);
        const rootRef = React.useRef<HTMLDivElement>(null);
        const [open, setOpen] = React.useState(false);

        React.useEffect(() => {
            if (!open) return;
            const onClick = (e: MouseEvent) => {
                if (rootRef.current && rootRef.current.contains(e.target as Node)) return;
                // Don't dismiss during active bucket render, while a preview region
                // is active (user needs the panel open to adjust params live), or
                // during preview-pick mode (the canvas click that picks shouldn't
                // also close the panel). Read fresh state to avoid stale closure.
                const s = useEngineStore.getState() as {
                    isBucketRendering?: boolean;
                    previewRegion?: unknown;
                    interactionMode?: string;
                };
                if (s.isBucketRendering) return;
                if (s.previewRegion) return;
                if (s.interactionMode === 'selecting_preview') return;
                setOpen(false);
            };
            const id = setTimeout(() => document.addEventListener('mousedown', onClick), 0);
            return () => { clearTimeout(id); document.removeEventListener('mousedown', onClick); };
        }, [open]);

        return (
            <div className="relative" ref={rootRef}>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                    title="Render!"
                    className={`flex items-center justify-center p-1 rounded border transition-colors ${
                        isBucketRendering
                            ? 'text-cyan-300 bg-cyan-900/30 border-cyan-500/40 animate-pulse'
                            : open
                                ? 'text-cyan-300 border-cyan-500/40'
                                : 'text-gray-500 border-white/10 hover:text-white hover:border-cyan-500/40'
                    }`}
                >
                    <RenderGridIcon />
                </button>
                {open && (
                    <div
                        className="absolute top-full left-0 mt-2 z-50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <BucketRenderPanel controller={controller} />
                    </div>
                )}
            </div>
        );
    };

    topbar.register({ id, slot, order, component: BucketRenderToggle });
};
