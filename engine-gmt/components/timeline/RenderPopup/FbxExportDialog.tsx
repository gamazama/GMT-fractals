// "Export to FBX (3D camera)" options dialog. Opened from the timeline
// toolbar's "…" overflow menu. Exports GMT's camera animation, lens and
// positional-light nulls as a binary .fbx for C4D / Blender / Maya / Fusion.
// The heavy lifting (timeline sampling + binary FBX writer) lives in
// fbxExport.ts / fbxBinary.ts.

import React, { useMemo, useState } from 'react';
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

// Camera-driving tracks live on the exported camera, not on param nulls.
const isCameraTrack = (id: string) => id.startsWith('camera.');

export const FbxExportDialog: React.FC<FbxExportDialogProps> = (props) => {
    const projectName = useEngineStore.getState().projectSettings?.name || 'scene';
    const frameCount = Math.max(1, Math.floor((props.endFrame - props.startFrame) / Math.max(1, props.frameStep)) + 1);

    // Animatable scalar tracks (camera tracks excluded) → param-null candidates.
    const paramCandidates = useMemo(() => {
        const tracks = useAnimationStore.getState().sequence.tracks;
        return Object.entries(tracks)
            .filter(([id]) => !isCameraTrack(id))
            .map(([id, t]) => ({ id, label: t.label || id, count: t.keyframes.length }));
    }, []);
    const [selected, setSelected] = useState<Set<string>>(() => new Set(paramCandidates.map(c => c.id)));
    const toggle = (id: string) => setSelected((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const [footage, setFootage] = useState('');

    // Footage aspect for the plate — from the current render resolution.
    const footageAspect = useMemo(() => {
        const st = useEngineStore.getState();
        const [w, h] = st.resolutionMode === 'Fixed' ? st.fixedResolution : st.canvasPixelSize;
        return h > 0 ? w / h : 16 / 9;
    }, []);

    const handleExport = () => {
        runFbxExport({
            fps:            props.fps,
            startFrame:     props.startFrame,
            endFrame:       props.endFrame,
            frameStep:      props.frameStep,
            sliderTrackIds: paramCandidates.filter(c => selected.has(c.id)).map(c => c.id),
            footageFileName: footage.trim(),
            footageAspect,
            projectName,
        });
        props.onClose();
    };

    return (
        <Modal onClose={props.onClose} dismissOnBackdrop={false} z={Z.overlayNested} labelledBy="fbx-export-title">
            <div className="bg-surface-sunken border border-line/15 rounded-lg p-5 w-full max-w-sm text-fg-secondary shadow-2xl">
                <h2 id="fbx-export-title" className="text-sm font-bold mb-1">Export to FBX (3D camera)</h2>
                <p className="text-[10px] text-fg-muted mb-3 leading-snug">
                    Exports the camera animation, lens and positional-light positions as a binary
                    <span className="text-accent-300"> .fbx</span> — import it in C4D, Blender, Maya or
                    DaVinci&nbsp;Resolve (Fusion). The fractal isn't 3D geometry, so render your video
                    separately and place it on a plane at the scene origin to composite behind the move.
                </p>

                <div className="flex items-center justify-between mb-3 px-2 py-1.5 bg-surface-section border border-line/10 rounded">
                    <span className="t-label">Animation</span>
                    <span className="text-[11px] font-mono text-accent-300">
                        {frameCount} frames @ {props.fps}fps
                    </span>
                </div>
                <p className="text-[8px] text-fg-dim mb-3 -mt-2 leading-tight">
                    Y-up, baked per-frame. Z-up apps (3ds Max / Unreal / Blender) convert on import.
                </p>

                {/* Optional camera-locked backdrop plate */}
                <label className="t-label mb-0.5 block">Backdrop plate footage <span className="text-fg-dim normal-case">(optional)</span></label>
                <input
                    type="text"
                    value={footage}
                    onChange={(e) => setFootage(e.target.value)}
                    className="w-full mb-1 px-2 py-1 text-[11px] bg-surface-sunken border border-line/10 rounded text-fg-secondary focus:border-accent-500/60 outline-none"
                    placeholder="myRender.mp4  (blank = no plate)"
                />
                <p className="text-[8px] text-fg-dim mb-3 leading-tight">
                    Adds a camera-locked plane showing this file (render it separately, keep it beside the .fbx).
                    Leave blank to skip and composite manually.
                </p>

                {/* Animated params → PSR-encoded nulls (value on Position Y) */}
                <div className="mt-2 mb-1 flex items-center justify-between">
                    <label className="t-label">Animated params as nulls</label>
                    {paramCandidates.length > 0 && (
                        <button type="button"
                                onClick={() => setSelected(selected.size === paramCandidates.length ? new Set() : new Set(paramCandidates.map(c => c.id)))}
                                className="text-[9px] text-accent-300 hover:text-cyan-200 underline-offset-2 hover:underline">
                            {selected.size === paramCandidates.length ? 'None' : 'All'}
                        </button>
                    )}
                </div>
                {paramCandidates.length === 0 ? (
                    <p className="text-[9px] text-fg-dim italic mb-3">No animated (non-camera) params on the timeline.</p>
                ) : (
                    <>
                        <div className="max-h-32 overflow-y-auto mb-1 border border-line/5 rounded bg-surface-section p-1.5 space-y-0.5">
                            {paramCandidates.map((c) => (
                                <label key={c.id} className="flex items-center gap-2 text-[10px] cursor-pointer hover:bg-line/5 rounded px-1 py-0.5">
                                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-cyan-400" />
                                    <span className="flex-1 truncate">{c.label}</span>
                                    <span className="text-fg-faint text-[8px]">{c.count} keys</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-[8px] text-fg-dim mb-3 leading-tight">
                            Each becomes a null named <span className="text-accent-300">GMT_param_&lt;name&gt;</span>; read its value off Position Y.
                        </p>
                    </>
                )}

                <div className="flex gap-2 justify-end">
                    <button onClick={props.onClose}
                            className="px-3 py-1.5 rounded border border-line/15 text-[11px] text-fg-tertiary hover:bg-line/5">
                        Cancel
                    </button>
                    <button onClick={handleExport}
                            className="px-3 py-1.5 rounded border border-accent-500/60 bg-accent-900/40 text-[11px] text-cyan-100 hover:bg-accent-800/50">
                        Save .fbx
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default FbxExportDialog;
