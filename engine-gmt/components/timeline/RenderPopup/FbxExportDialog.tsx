// "Export to FBX (3D camera)" options dialog. Opened from the timeline
// toolbar's "…" overflow menu. Exports GMT's camera animation, lens and
// positional-light nulls as a binary .fbx for C4D / Blender / Maya / Fusion.
// The heavy lifting (timeline sampling + binary FBX writer) lives in
// fbxExport.ts / fbxBinary.ts.

import React from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { Z } from '../../../../components/ui/zIndex';
import { useAnimationStore } from '../../../../store/animationStore';
import { useEngineStore } from '../../../../store/engineStore';
import { runFbxExport } from './fbxExport';

export interface FbxExportDialogProps {
    fps:        number;
    startFrame: number;
    endFrame:   number;
    frameStep:  number;
    onClose:    () => void;
}

export const FbxExportDialog: React.FC<FbxExportDialogProps> = (props) => {
    const projectName = useEngineStore.getState().projectSettings?.name || 'scene';
    const frameCount = Math.max(1, Math.floor((props.endFrame - props.startFrame) / Math.max(1, props.frameStep)) + 1);

    const handleExport = () => {
        runFbxExport({
            fps:         props.fps,
            startFrame:  props.startFrame,
            endFrame:    props.endFrame,
            frameStep:   props.frameStep,
            projectName,
        });
        props.onClose();
    };

    return (
        <Modal onClose={props.onClose} dismissOnBackdrop={false} z={Z.overlayNested} labelledBy="fbx-export-title">
            <div className="bg-gray-900 border border-white/15 rounded-lg p-5 w-full max-w-sm text-gray-200 shadow-2xl">
                <h2 id="fbx-export-title" className="text-sm font-bold mb-1">Export to FBX (3D camera)</h2>
                <p className="text-[10px] text-gray-400 mb-3 leading-snug">
                    Exports the camera animation, lens and positional-light positions as a binary
                    <span className="text-cyan-300"> .fbx</span> — import it in C4D, Blender, Maya or
                    DaVinci&nbsp;Resolve (Fusion). The fractal isn't 3D geometry, so render your video
                    separately and place it on a plane at the scene origin to composite behind the move.
                </p>

                <div className="flex items-center justify-between mb-3 px-2 py-1.5 bg-black/30 border border-white/10 rounded">
                    <span className="t-label">Animation</span>
                    <span className="text-[11px] font-mono text-cyan-300">
                        {frameCount} frames @ {props.fps}fps
                    </span>
                </div>
                <p className="text-[8px] text-gray-500 mb-4 -mt-2 leading-tight">
                    Y-up, baked per-frame. Z-up apps (3ds Max / Unreal / Blender) convert on import.
                </p>

                <div className="flex gap-2 justify-end">
                    <button onClick={props.onClose}
                            className="px-3 py-1.5 rounded border border-white/15 text-[11px] text-gray-300 hover:bg-white/5">
                        Cancel
                    </button>
                    <button onClick={handleExport}
                            className="px-3 py-1.5 rounded border border-cyan-500/60 bg-cyan-900/40 text-[11px] text-cyan-100 hover:bg-cyan-800/50">
                        Save .fbx
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default FbxExportDialog;
