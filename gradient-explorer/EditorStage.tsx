/**
 * EditorStage — the Stops mode's centre stage.
 *
 * Mounts the engine AdvancedGradientEditor (consumed AS-IS — genericized in P0c)
 * bound to paletteEditorStore via the (d) reusable-editor undo seam: the editor's
 * value IS the config, onChange commits it, and onEditStart/onEditEnd/edit bracket
 * each gesture into one engine PARAM-undo entry (driving this store's history
 * provider). Above the editor sits the shared CanonicalHero (P2-A): the result
 * strip is a select/drag source for the bin dock, with the favourite star inline.
 *
 * The Stops mode is the MINIMAL hero — no primary Apply (it is always live-editing);
 * the dock bins are how its result reaches the other modes. The one-ramp seam for an
 * inbound BARE ramp (fitRampToStops once) is paletteEditorStore.loadRamp; the Stops
 * bin itself uses setConfig since a sent gradient already carries stops.
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
import { CanonicalHero } from '../palette/components/CanonicalHero';
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
                {/* Result — the baked output (same sampler the texture uses), as the
                    shared select/drag hero. Minimal variant: no primary action — the
                    dock bins are how the edited gradient reaches other modes. */}
                {/* targetId="stops" makes this hero the `stops` drop target's anchor AND a
                    self-filtering source — the one prop that turns a hero into source+target. */}
                <CanonicalHero
                    config={config}
                    ramp={ramp}
                    name="Stops"
                    source="Stops"
                    mode="stops"
                    targetId="stops"
                    height={64}
                    trailing={
                        <span className="text-[11px] text-gray-500 tabular-nums">
                            {config.stops.length} stops
                        </span>
                    }
                />

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
