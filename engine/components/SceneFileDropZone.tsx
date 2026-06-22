/**
 * SceneFileDropZone — drag a scene file anywhere onto the app to load it:
 *   - .png  (snapshot with the scene embedded in an iTXt chunk)
 *   - .gmf  (formula + full scene)
 *   - .json (legacy preset)
 *
 * Routes through the SceneIO universal loader (`loadSceneFile`, which
 * auto-detects PNG-iTXt vs text) + the compile-gated `loadScene`, so a
 * PNG snapshot the app saved round-trips straight back in. This is what
 * makes the snapshot toast's "drag the PNG back in" promise real.
 *
 * Only OS file drags are handled (dataTransfer carries 'Files'); internal
 * element drags (panel docking, gradient knots) carry other types and are
 * skipped. File drops that another target already claimed — it called
 * preventDefault, e.g. the Workshop's .frag import — are deferred, so we
 * only act on drops nothing else handled and never fight them. Any other
 * unclaimed, non-scene file gets a "here's what's supported" nudge rather
 * than a silent no-op (which reads as "the drop broke"). A drag-depth
 * counter keeps the overlay from flickering as the cursor crosses children.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { loadSceneFile } from '../plugins/SceneIO';
import { showToast } from '../store/toastStore';

const SCENE_EXT = /\.(png|gmf|json)$/i;
const IMAGE_EXT = /\.(jpe?g|webp|gif|bmp)$/i;

export const SceneFileDropZone: React.FC = () => {
    const [active, setActive] = useState(false);
    const depth = useRef(0);

    useEffect(() => {
        const isFileDrag = (e: DragEvent) =>
            !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');

        const onDragEnter = (e: DragEvent) => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
            depth.current += 1;
            setActive(true);
        };
        const onDragOver = (e: DragEvent) => {
            if (!isFileDrag(e)) return;
            e.preventDefault(); // required for 'drop' to fire
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        };
        const onDragLeave = (e: DragEvent) => {
            if (!isFileDrag(e)) return;
            depth.current = Math.max(0, depth.current - 1);
            if (depth.current === 0) setActive(false);
        };
        const onDrop = async (e: DragEvent) => {
            if (!isFileDrag(e)) return;
            depth.current = 0;
            setActive(false);
            // Defer to any inner drop target that already claimed this file
            // (a real file-drop handler — e.g. the Workshop's .frag import —
            // calls preventDefault). Only unclaimed drops are ours to handle,
            // so we never double-handle or falsely warn over those targets.
            if (e.defaultPrevented) return;
            e.preventDefault();
            const file = e.dataTransfer?.files?.[0];
            if (!file) return;
            if (!SCENE_EXT.test(file.name)) {
                // Not a scene file. Nudge toward what IS supported — a silent
                // no-op reads as "the drop broke". Images get a tailored hint
                // (use the PNG snapshot, which embeds the scene).
                const msg = IMAGE_EXT.test(file.name)
                    ? `"${file.name}" has no embedded scene — use a PNG snapshot or a .gmf file`
                    : `Can't load "${file.name}" — drop a .png snapshot, .gmf, or .json scene file`;
                showToast(msg, 'warning', 3500);
                return;
            }
            try {
                const preset = await loadSceneFile(file);
                if (!preset) {
                    showToast(`Couldn't read a scene from "${file.name}"`, 'error', 3500);
                    return;
                }
                useEngineStore.getState().loadScene({ preset });
                showToast(`Loaded "${file.name}"`, 'success');
            } catch (err) {
                console.error('[SceneFileDropZone] load failed', err);
                showToast(`Failed to load "${file.name}" — see console`, 'error', 3500);
            }
        };

        window.addEventListener('dragenter', onDragEnter);
        window.addEventListener('dragover', onDragOver);
        window.addEventListener('dragleave', onDragLeave);
        window.addEventListener('drop', onDrop);
        return () => {
            window.removeEventListener('dragenter', onDragEnter);
            window.removeEventListener('dragover', onDragOver);
            window.removeEventListener('dragleave', onDragLeave);
            window.removeEventListener('drop', onDrop);
        };
    }, []);

    if (!active) return null;
    return (
        <div className="fixed inset-0 z-[1500] pointer-events-none flex items-center justify-center bg-accent-900/40 backdrop-blur-sm">
            <div className="px-8 py-6 rounded-2xl border-2 border-dashed border-accent-400/70 bg-surface text-center shadow-2xl">
                <div className="text-accent-300 font-bold text-lg">Drop to load scene</div>
                <div className="text-accent-400/70 text-xs mt-1">.png snapshot · .gmf · .json</div>
            </div>
        </div>
    );
};
