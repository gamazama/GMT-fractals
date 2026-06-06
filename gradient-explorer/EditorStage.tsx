/**
 * EditorStage — the Stops mode's centre stage.
 *
 * Mounts the engine AdvancedGradientEditor (consumed AS-IS — genericized in P0c)
 * bound to paletteEditorStore via the (d) reusable-editor undo seam: the editor's
 * value IS the config, onChange commits it, and onEditStart/onEditEnd/edit bracket
 * each gesture into one engine PARAM-undo entry (driving this store's history
 * provider). Above the editor sits a larger result strip rendered with the
 * canonical engine sampler (renderStopsToRamp) so the output reads at a glance,
 * with a favourite toggle.
 *
 * Deliberately NO canonical hero / send-to / fullscreen-⛶ here — P2 owns the
 * cross-mode hero unification (select → act). The one-ramp seam (inbound bare
 * ramps → fitRampToStops once) is paletteEditorStore.loadRamp, consumed by future
 * send-to-Stops; the stage just renders the config the editor owns.
 */

import React, { useMemo } from 'react';
import AdvancedGradientEditor from '../components/AdvancedGradientEditor';
import type { GradientConfig, GradientStop } from '../types';
import {
    usePaletteEditorStore,
    editorEditStart,
    editorEditEnd,
    editorEdit,
} from '../palette/store/paletteEditorStore';
import { GradientStrip } from '../palette/components/GradientStrip';
import { FavStar } from '../palette/components/FavStar';
import { renderStopsToRamp } from '../palette/core/gmtGradient';

export const EditorStage: React.FC = () => {
    const config = usePaletteEditorStore((s) => s.config);
    const setConfig = usePaletteEditorStore((s) => s.setConfig);

    const ramp = useMemo(
        () => renderStopsToRamp(config.stops, config.blendSpace, config.colorSpace),
        [config],
    );

    // The editor's value is always the object form here, so onChange emits a
    // GradientConfig; tolerate the legacy bare-array shape defensively — and if it
    // ever fires, keep the user's current blend/output space rather than resetting.
    const onChange = (val: GradientStop[] | GradientConfig): void => {
        setConfig(Array.isArray(val) ? { ...config, stops: val } : val);
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scroll p-4 flex flex-col gap-3">
                {/* Result — the baked output, same sampler the texture uses. */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-gray-400 shrink-0">Result</span>
                            <FavStar config={config} name="Stops" source="Stops" />
                        </div>
                        <span className="text-[11px] text-gray-500 tabular-nums shrink-0">{config.stops.length} stops</span>
                    </div>
                    <GradientStrip ramp={ramp} height={64} />
                </div>

                {/* The engine Stops editor — knot track + per-stop inspector. */}
                <AdvancedGradientEditor
                    value={config}
                    onChange={onChange}
                    onEditStart={editorEditStart}
                    onEditEnd={editorEditEnd}
                    edit={editorEdit}
                />
            </div>
        </div>
    );
};

export default EditorStage;
