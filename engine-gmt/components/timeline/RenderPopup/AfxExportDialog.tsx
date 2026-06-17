// "Save AFX comp" options dialog. Opened from the render dialog; lets the
// user pick which animated scalar params become AE Slider Controls, toggle
// GMT-native FOV, override the frame size, and name the footage the AE comp
// references. On confirm it samples the timeline and downloads a .jsx
// (see afxExport.ts). Camera + rotation tracks are NOT offered as sliders —
// they drive the exported camera itself.

import React, { useMemo, useState } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { Z } from '../../../../components/ui/zIndex';
import { useAnimationStore } from '../../../../store/animationStore';
import { useEngineStore } from '../../../../store/engineStore';
import { runAfxExport } from './afxExport';

export interface AfxExportDialogProps {
    width:      number;
    height:     number;
    fps:        number;
    startFrame: number;
    endFrame:   number;
    frameStep:  number;
    onClose:    () => void;
}

// Camera-driving tracks live on the exported camera, not on slider controls.
const isCameraTrack = (id: string) => id.startsWith('camera.');

export const AfxExportDialog: React.FC<AfxExportDialogProps> = (props) => {
    const projectName = useEngineStore.getState().projectSettings?.name || 'scene';

    // Animatable scalar tracks (camera tracks excluded) → slider candidates.
    const sliderCandidates = useMemo(() => {
        const tracks = useAnimationStore.getState().sequence.tracks;
        return Object.entries(tracks)
            .filter(([id]) => !isCameraTrack(id))
            .map(([id, t]) => ({ id, label: t.label || id, count: t.keyframes.length }));
    }, []);

    const [selected, setSelected] = useState<Set<string>>(
        () => new Set(sliderCandidates.map(c => c.id)),
    );
    const [overrideSize, setOverrideSize] = useState(false);
    const [w, setW] = useState(props.width);
    const [h, setH] = useState(props.height);
    const [footage, setFootage] = useState(`${projectName}.mp4`);

    const clampDim = (v: number, fallback: number) =>
        Number.isFinite(v) ? Math.max(2, Math.round(v)) : fallback;
    const compW = overrideSize ? clampDim(w, props.width) : props.width;
    const compH = overrideSize ? clampDim(h, props.height) : props.height;

    const toggle = (id: string) => setSelected((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const handleExport = () => {
        runAfxExport({
            width:           compW,
            height:          compH,
            fps:             props.fps,
            startFrame:      props.startFrame,
            endFrame:        props.endFrame,
            frameStep:       props.frameStep,
            footageFileName: footage.trim() || `${projectName}.mp4`,
            sliderTrackIds:  sliderCandidates.filter(c => selected.has(c.id)).map(c => c.id),
            projectName,
        });
        props.onClose();
    };

    return (
        <Modal onClose={props.onClose} dismissOnBackdrop={false} z={Z.overlayNested} labelledBy="afx-export-title">
            <div className="bg-gray-900 border border-white/15 rounded-lg p-5 w-full max-w-sm text-gray-200 shadow-2xl">
                <h2 id="afx-export-title" className="text-sm font-bold mb-1">Save After Effects Comp</h2>
                <p className="text-[10px] text-gray-400 mb-3 leading-snug">
                    Exports the camera animation, light positions and chosen params as a
                    <span className="text-cyan-300"> .jsx</span> script. Run it in After Effects
                    (File ▸ Scripts ▸ Run Script File…). It rebuilds the comp and references your render by filename.
                </p>

                {/* Comp dimensions — surfaced so it always matches the render */}
                <div className="flex items-center justify-between mb-3 px-2 py-1.5 bg-black/30 border border-white/10 rounded">
                    <span className="t-label">Comp</span>
                    <span className="text-[11px] font-mono text-cyan-300">
                        {compW} × {compH} @ {props.fps}fps
                    </span>
                </div>
                <p className="text-[8px] text-gray-500 mb-3 -mt-2 leading-tight">
                    Must match your rendered footage — set the render resolution, or override below.
                </p>

                {/* Footage filename */}
                <label className="t-label mb-0.5 block">Render footage filename</label>
                <input
                    type="text"
                    value={footage}
                    onChange={(e) => setFootage(e.target.value)}
                    className="w-full mb-1 px-2 py-1 text-[11px] bg-black/40 border border-white/10 rounded text-gray-100 focus:border-cyan-500/60 outline-none"
                    placeholder="myRender.mp4"
                />
                <p className="text-[8px] text-gray-500 mb-3 leading-tight">
                    The comp's plate layer points at this file (render it separately, then drop both in one folder).
                    A placeholder solid is used if it's not found.
                </p>

                {/* Frame size override */}
                <label className="flex items-center gap-2 text-[10px] mb-1 cursor-pointer">
                    <input type="checkbox" checked={overrideSize}
                           onChange={(e) => setOverrideSize(e.target.checked)} className="accent-cyan-400" />
                    Override frame size
                    {!overrideSize && <span className="text-gray-500">(using {props.width}×{props.height})</span>}
                </label>
                {overrideSize && (
                    <div className="flex items-center gap-2 mb-3 ml-5">
                        <input type="number" value={w} onChange={(e) => setW(+e.target.value)}
                               className="w-20 px-2 py-1 text-[11px] bg-black/40 border border-white/10 rounded text-gray-100 outline-none" />
                        <span className="text-gray-500 text-[10px]">×</span>
                        <input type="number" value={h} onChange={(e) => setH(+e.target.value)}
                               className="w-20 px-2 py-1 text-[11px] bg-black/40 border border-white/10 rounded text-gray-100 outline-none" />
                    </div>
                )}

                {/* Animated params → slider controls */}
                <div className="mt-2 mb-1 flex items-center justify-between">
                    <label className="t-label">Animated params as sliders</label>
                    {sliderCandidates.length > 0 && (
                        <button type="button"
                                onClick={() => setSelected(selected.size === sliderCandidates.length ? new Set() : new Set(sliderCandidates.map(c => c.id)))}
                                className="text-[9px] text-cyan-300 hover:text-cyan-200 underline-offset-2 hover:underline">
                            {selected.size === sliderCandidates.length ? 'None' : 'All'}
                        </button>
                    )}
                </div>
                {sliderCandidates.length === 0 ? (
                    <p className="text-[9px] text-gray-500 italic mb-3">No animated (non-camera) params on the timeline.</p>
                ) : (
                    <div className="max-h-36 overflow-y-auto mb-3 border border-white/5 rounded bg-black/20 p-1.5 space-y-0.5">
                        {sliderCandidates.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 text-[10px] cursor-pointer hover:bg-white/5 rounded px-1 py-0.5">
                                <input type="checkbox" checked={selected.has(c.id)}
                                       onChange={() => toggle(c.id)} className="accent-cyan-400" />
                                <span className="flex-1 truncate">{c.label}</span>
                                <span className="text-gray-600 text-[8px]">{c.count} keys</span>
                            </label>
                        ))}
                    </div>
                )}

                <div className="flex gap-2 justify-end mt-1">
                    <button onClick={props.onClose}
                            className="px-3 py-1.5 rounded border border-white/15 text-[11px] text-gray-300 hover:bg-white/5">
                        Cancel
                    </button>
                    <button onClick={handleExport}
                            className="px-3 py-1.5 rounded border border-cyan-500/60 bg-cyan-900/40 text-[11px] text-cyan-100 hover:bg-cyan-800/50">
                        Save .jsx
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AfxExportDialog;
