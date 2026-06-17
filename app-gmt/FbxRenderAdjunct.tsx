// GMT's "Export to FBX (3D camera)" entry for the timeline toolbar's "…"
// overflow menu — the FBX twin of AfxRenderAdjunct. Registered via
// `registerRenderAdjunct` as a {label, Dialog} descriptor. The dialog sources
// fps / frame range from the stores, so it works standalone. The heavy lifting
// (timeline sampling + binary FBX writer) lives in
// engine-gmt/components/timeline/RenderPopup/fbxExport.ts.

import React from 'react';
import { useAnimationStore } from '../store/animationStore';
import { FbxExportDialog } from '../engine-gmt/components/timeline/RenderPopup/FbxExportDialog';
import type { RenderAdjunct } from '../engine/animation/renderAdjunctRegistry';

const FbxAdjunctDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const anim = useAnimationStore.getState();
    return (
        <FbxExportDialog
            fps={anim.fps}
            startFrame={0}
            endFrame={anim.durationFrames}
            frameStep={1}
            onClose={onClose}
        />
    );
};

export const fbxRenderAdjunct: RenderAdjunct = {
    label: 'Export to FBX (3D camera)…',
    title: 'Export the camera animation, lens and light positions as a binary FBX for C4D / Blender / Maya / Fusion.',
    Dialog: FbxAdjunctDialog,
};
