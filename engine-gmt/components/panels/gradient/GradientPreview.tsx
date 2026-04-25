/**
 * GradientPreview — thin colour strip rendered on the right side of an
 * accordion section header (Layer 1 / Layer 2 in the Gradient panel).
 *
 * Two registered variants:
 *   - 'gradient-preview-layer1' reads `coloring.gradient`
 *   - 'gradient-preview-layer2' reads `coloring.gradient2`
 *
 * Built as separate widget ids rather than a parameterised one so the
 * manifest stays declarative — no per-widget `props` needed for this
 * specific case.
 */

import React, { useMemo } from 'react';
import { useEngineStore } from '../../../../store/engineStore';
import { getGradientCssString } from '../../../../utils/colorUtils';

const Strip: React.FC<{ stops: any }> = ({ stops }) => {
    const bg = useMemo(() => {
        if (!stops) return 'linear-gradient(to right, #000, #fff)';
        return getGradientCssString(stops);
    }, [stops]);
    return (
        <div
            className="flex-1 h-2.5 rounded-sm overflow-hidden opacity-80"
            style={{ backgroundImage: bg, backgroundSize: '100% 100%' }}
        />
    );
};

export const GradientPreviewLayer1: React.FC = () => {
    const stops = useEngineStore((s) => (s as any).coloring?.gradient);
    return <Strip stops={stops} />;
};

export const GradientPreviewLayer2: React.FC = () => {
    const stops = useEngineStore((s) => (s as any).coloring?.gradient2);
    return <Strip stops={stops} />;
};
