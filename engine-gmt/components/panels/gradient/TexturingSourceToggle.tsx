/**
 * TexturingSourceToggle — Gradient vs Image Texture mode selector inside
 * the Layer 1 accordion section. Wraps the engine's ToggleSwitch with
 * GMT-specific labels and binds to texturing.active in the store.
 */

import React from 'react';
import { useEngineStore } from '../../../../store/engineStore';
import ToggleSwitch from '../../../../components/ToggleSwitch';

export const TexturingSourceToggle: React.FC = () => {
    const active = useEngineStore((s) => (s as any).texturing?.active);
    const setTexturing = useEngineStore((s) => (s as any).setTexturing);
    if (active === undefined || !setTexturing) return null;
    return (
        <ToggleSwitch
            value={!!active}
            onChange={(v) => setTexturing({ active: v })}
            options={[
                { label: 'Gradient', value: false },
                { label: 'Image Texture', value: true },
            ]}
        />
    );
};
