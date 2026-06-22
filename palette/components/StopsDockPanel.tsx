/**
 * StopsDockPanel — the Stops mode's dock content (custom UI `palette-editor-dock`).
 *
 * The per-stop inspector (colour / interpolation / position / bias) is in the
 * engine editor on the centre stage; this panel owns the DOCUMENT-level controls
 * that apply to the whole gradient: blend space, output colour space, and reset.
 * Hosting these here keeps the "Stops" tab from being a dead empty panel (polish
 * T5) without duplicating the per-stop editing surface. (Favourite + stop count
 * live on the stage result strip — one source each, as in the other modes.)
 *
 * Undo: the GMT <Dropdown> already opens its own param-undo bracket around its
 * onChange (StoreCallbacks begin/endParamTransaction), which snapshots this
 * store's history provider — so blend/output changes are one undo entry for free.
 * The plain Reset button has no such bracket, so it goes through `editorEdit`.
 */

import React from 'react';
import type { BlendColorSpace, ColorSpaceMode } from '../../types';
import Dropdown from '../../components/Dropdown';
import { usePaletteEditorStore, editorEdit } from '../store/paletteEditorStore';

const BLEND_OPTIONS = [
    { label: 'Oklab (perceptual)', value: 'oklab' },
    { label: 'RGB (standard)', value: 'rgb' },
    { label: 'HSV (short path)', value: 'hsv' },
    { label: 'HSV (long path)', value: 'hsv-far' },
];

const OUTPUT_OPTIONS = [
    { label: 'sRGB (standard)', value: 'srgb' },
    { label: 'Linear (physical)', value: 'linear' },
    { label: 'Inverse ACES', value: 'aces_inverse' },
];

export const StopsDockPanel: React.FC = () => {
    const config = usePaletteEditorStore((s) => s.config);
    const setConfig = usePaletteEditorStore((s) => s.setConfig);
    const reset = usePaletteEditorStore((s) => s.reset);

    return (
        <div className="flex flex-col gap-2 px-3 py-1">
            <p className="text-[11px] leading-relaxed text-fg-dim">
                Edit the gradient on the stage — click the bar to add a stop, drag to move, drag away to
                remove. These settings apply to the whole gradient:
            </p>

            <Dropdown
                label="Blend"
                value={config.blendSpace}
                onChange={(v) => setConfig({ ...config, blendSpace: v as BlendColorSpace })}
                options={BLEND_OPTIONS}
                fullWidth
            />
            <Dropdown
                label="Output"
                value={config.colorSpace}
                onChange={(v) => setConfig({ ...config, colorSpace: v as ColorSpaceMode })}
                options={OUTPUT_OPTIONS}
                fullWidth
            />

            <button
                onClick={() => editorEdit(reset)}
                title="Reset the gradient to the default"
                className="mt-1 text-[11px] px-2 py-1 rounded-sm bg-line/[0.06] text-fg-tertiary hover:bg-line/10 transition-colors self-start"
            >
                Reset to default
            </button>
        </div>
    );
};

export default StopsDockPanel;
