import React from 'react';
import type { FeatureComponentProps } from '../../components/registry/ComponentRegistry';

/**
 * SampleSkies — four bundled HDR sky presets for the Sky Image source.
 *
 * Registered as `sample-skies` (app-gmt/registerFeatures.ts) and mounted by the
 * materials feature's customUI under the Source dropdown (Sky Image only).
 *
 * The .hdr files live in public/skies/ (1k equirect Radiance, ~1–1.7 MB each,
 * fetched ON PICK — never part of the JS bundle) and load by URL: the texture
 * pipeline already fetches http(s)/path URLs ending in .hdr and RGBE-parses
 * them in the worker (WorkerProxy.updateTexture — the gallery-sky path). Saved
 * scenes therefore carry the short URL, not megabytes of base64.
 */
const SAMPLE_SKIES = [
    { id: 'sky-cloudy', label: 'Cloudy Sky' },
    { id: 'studio-natural', label: 'Natural Studio' },
    { id: 'studio-softbox', label: 'Softbox Studio' },
    { id: 'studio-window', label: 'Window Studio' },
] as const;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const SampleSkies: React.FC<FeatureComponentProps> = ({ featureId, sliceState, actions }) => {
    const setter = (actions as Record<string, (u: Record<string, unknown>) => void>)[`set${cap(featureId)}`];
    const current = sliceState?.envMapData;

    return (
        <div className="px-2 pb-1.5">
            <div className="text-[8px] text-fg-faint mb-1">Sample skies</div>
            <div className="grid grid-cols-4 gap-1">
                {SAMPLE_SKIES.map((s) => {
                    const url = `/skies/${s.id}.hdr`;
                    const active = current === url;
                    return (
                        <button
                            key={s.id}
                            title={s.label}
                            onClick={() => setter?.({
                                envMapData: url,
                                useEnvMap: true,
                                envMapColorSpace: 1, // Radiance HDR is linear
                            })}
                            className={`relative rounded overflow-hidden border transition-all hover:scale-105 active:scale-95 ${active ? 'border-accent-400 shadow-[0_0_5px_rgb(var(--accent-glow))]' : 'border-line/10 hover:border-line/40'}`}
                        >
                            <img
                                src={`/skies/${s.id}.thumb.jpg`}
                                alt={s.label}
                                draggable={false}
                                className="w-full h-7 object-cover select-none"
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SampleSkies;
