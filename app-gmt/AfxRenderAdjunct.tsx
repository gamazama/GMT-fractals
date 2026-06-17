// GMT's "Export to After Effects" entry for the timeline toolbar's "…"
// overflow menu. Registered via `registerRenderAdjunct` as a {label, Dialog}
// descriptor: the toolbar renders the label as a menu row and mounts the
// dialog at its root when picked, so the dialog survives the menu closing.
//
// The dialog wrapper sources the comp defaults (resolution / fps / frame
// range) from the stores, so it works standalone — no render-config
// plumbing. The heavy lifting (timeline sampling + .jsx writer) lives in
// engine-gmt/components/timeline/RenderPopup/afxExport.ts.

import React from 'react';
import { useEngineStore } from '../store/engineStore';
import { useAnimationStore } from '../store/animationStore';
import { AfxExportDialog } from '../engine-gmt/components/timeline/RenderPopup/AfxExportDialog';
import type { RenderAdjunct } from '../engine/animation/renderAdjunctRegistry';

// Default comp size = current render resolution (Fixed mode) or the live
// viewport, rounded back to CSS pixels. The dialog lets the user override,
// and warns it must match the separately-rendered footage.
const defaultCompSize = (): [number, number] => {
    const st = useEngineStore.getState();
    if (st.resolutionMode === 'Fixed') return st.fixedResolution;
    const dpr = st.dpr || 1;
    const [pw, ph] = st.canvasPixelSize;
    return [Math.max(2, Math.round(pw / dpr)), Math.max(2, Math.round(ph / dpr))];
};

const AfxAdjunctDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [w, h] = defaultCompSize();
    const anim = useAnimationStore.getState();
    return (
        <AfxExportDialog
            width={w}
            height={h}
            fps={anim.fps}
            startFrame={0}
            endFrame={anim.durationFrames}
            frameStep={1}
            onClose={onClose}
        />
    );
};

export const afxRenderAdjunct: RenderAdjunct = {
    label: 'Export to After Effects…',
    title: 'Export the camera animation, light positions and chosen params as an After Effects script (.jsx).',
    Dialog: AfxAdjunctDialog,
};
