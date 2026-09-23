import React from 'react';
import { Layer } from './Layer';

/**
 * `<DropScrim>` — THE "a file is being dragged over the page" hint: a full-page scrim on the
 * `osDrop` tier with a dashed card naming what a drop does. Lifted out of app-gmt's
 * `SceneFileDropZone` (2026-09-23) when the Gradient Explorer needed the same hint, so the two
 * apps show one surface rather than two lookalikes.
 *
 * Pure: it only draws. The HOST decides when it shows (an OS FILE drag — `dataTransfer.types`
 * includes 'Files' — and never an in-app drag, which carries its own MIME) and handles the drop
 * itself on its own window listener. `pointer-events-none`, so the drop still lands on whatever
 * is under the cursor and bubbles to that listener; the scrim never takes a drop of its own.
 *
 * Words: `title` is what a drop does, `detail` what it takes. Both must be TRUE for the host —
 * a hint that promises an import the drop does not perform is worse than none.
 *
 * `rest` reaches the Layer's root (a `data-*` handle for a smoke).
 */
export interface DropScrimProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    title: React.ReactNode;
    detail?: React.ReactNode;
}

export const DropScrim: React.FC<DropScrimProps> = ({ title, detail, ...rest }) => (
    <Layer tier="osDrop" className="inset-0 pointer-events-none flex items-center justify-center bg-accent-900/40 backdrop-blur-sm" {...rest}>
        <div className="px-8 py-6 rounded-2xl border-2 border-dashed border-accent-400/70 bg-surface text-center shadow-2xl">
            <div className="text-accent-300 font-bold text-lg">{title}</div>
            {detail != null && <div className="text-accent-400/70 text-xs mt-1">{detail}</div>}
        </div>
    </Layer>
);

export default DropScrim;
