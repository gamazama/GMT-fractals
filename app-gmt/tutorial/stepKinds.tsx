/**
 * Custom step renderers for GMT lessons. Currently one — `next-steps`,
 * the interactive list shown at the end of lesson 2 + 4 with hover
 * highlights pointing at follow-up actions.
 */

import React from 'react';
import { stepRenderers, TutorialHighlight } from '../../engine/plugins/Tutorial';
import { ANCHOR } from './anchors';

interface NextStepItem {
    label: string;
    target: string;
}

export const NEXT_STEPS_ITEMS: NextStepItem[] = [
    { label: 'Save a snapshot',                                 target: ANCHOR.snapshotBtn },
    { label: 'Do a hi-res render',                              target: ANCHOR.bucketBtn },
    { label: 'Adjust camera, colour, effects and fog',          target: ANCHOR.tabScene },
    { label: 'Change the look of the material',                 target: ANCHOR.tabShader },
    { label: 'Adjust surface colours',                          target: ANCHOR.tabGradient },
    { label: 'Change quality parameters and resolution',        target: ANCHOR.tabQuality },
];

const NextStepsList: React.FC = () => {
    const [hovered, setHovered] = React.useState<string | null>(null);
    const [flash, setFlash] = React.useState<string | null>(null);
    const click = (t: string) => { setFlash(t); setTimeout(() => setFlash(null), 600); };

    return (
        <>
            <div style={{ marginTop: 8 }}>
                {NEXT_STEPS_ITEMS.map((item) => (
                    <div
                        key={item.target}
                        onMouseEnter={() => setHovered(item.target)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => click(item.target)}
                        style={{
                            fontSize: 11,
                            color: hovered === item.target ? 'rgba(103, 232, 249, 1)' : 'rgba(255,255,255,0.7)',
                            padding: '3px 0', cursor: 'pointer', transition: 'color 0.15s',
                        }}
                    >
                        {'•'} {item.label}
                    </div>
                ))}
            </div>
            {(hovered || flash) && <TutorialHighlight targets={[flash || hovered!]} flash={!!flash} />}
        </>
    );
};

export function registerGmtStepKinds(): void {
    stepRenderers.register({
        kind: 'next-steps',
        render: () => <NextStepsList />,
    });
}
