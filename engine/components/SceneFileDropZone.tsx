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
 *
 * CLAIMS FIRST (2026-09-16). Before anything above, every dropped file is
 * offered to the app's registered claims (`engine/plugins/SceneFileClaims.ts`):
 * a claim takes the files that are its own by content, says what happened
 * itself, and hands back the rest, which then go through exactly the path
 * above — the first remaining file as a scene, or the nudge. A drop every
 * file of which was claimed says nothing more here. An app that registers
 * no claim gets the drop's own `files[0]`, as before.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { loadSceneFile } from '../plugins/SceneIO';
import { claimSceneFiles } from '../plugins/SceneFileClaims';
import { showToast } from '../store/toastStore';
import { DropScrim } from '../../components/ui/DropScrim';

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
            // Read the list NOW: the browser empties the transfer once this
            // handler returns, and the claims are awaited.
            const dropped = Array.from(e.dataTransfer?.files ?? []);
            if (!dropped.length) return;
            const rest = await claimSceneFiles(dropped);
            const file = rest[0];
            if (!file) return; // every file was claimed; the claim said so
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
    return <DropScrim title="Drop to load scene" detail=".png snapshot · .gmf · .json" />;
};
