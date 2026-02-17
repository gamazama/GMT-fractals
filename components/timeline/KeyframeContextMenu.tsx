
import { ContextMenuItem } from '../../types/help';

export interface KeyframeMenuActions {
    updateInterp: (i: 'Linear' | 'Step' | 'Bezier') => void;
    setTangents: (m: 'Auto' | 'Split' | 'Unified' | 'Ease') => void;
    deleteKeys: () => void;
    // New Actions
    copyKeys: () => void;
    pasteKeys: () => void;
    duplicateKeys: () => void;
    loopKeys: (times: number) => void;
}

export const getKeyframeMenuItems = (
    interp: string,
    broken: boolean | undefined,
    auto: boolean | undefined,
    actions: KeyframeMenuActions,
    selectedCount: number,
    hasClipboard: boolean
): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
        { label: 'Interpolation', action: () => {}, isHeader: true },
        { 
            label: 'Linear', 
            checked: interp === 'Linear', 
            action: () => actions.updateInterp('Linear') 
        },
        { 
            label: 'Step', 
            checked: interp === 'Step', 
            action: () => actions.updateInterp('Step') 
        },
        { 
            label: 'Bezier', 
            checked: interp === 'Bezier', 
            action: () => actions.updateInterp('Bezier') 
        }
    ];

    if (interp === 'Bezier') {
        items.push(
            { label: 'Tangents', action: () => {}, isHeader: true },
            { 
                label: 'Auto (Smooth)', 
                checked: !!auto, 
                action: () => actions.setTangents('Auto') 
            },
            { 
                label: 'Ease (Flat)', 
                action: () => actions.setTangents('Ease') 
            },
            { 
                label: 'Unified', 
                checked: !broken && !auto, 
                action: () => actions.setTangents('Unified') 
            },
            { 
                label: 'Broken', 
                checked: !!broken, 
                action: () => actions.setTangents('Split') 
            }
        );
    }

    items.push(
        { label: 'Clipboard', action: () => {}, isHeader: true },
        { 
            label: `Copy ${selectedCount > 1 ? `(${selectedCount})` : ''}`, 
            action: actions.copyKeys 
        },
        { 
            label: 'Paste', 
            disabled: !hasClipboard,
            action: actions.pasteKeys 
        },
        { 
            label: 'Duplicate Here', 
            action: actions.duplicateKeys 
        },
        {
             label: 'Duplicate & Loop',
             children: [
                 {
                     label: 'Loop x2',
                     action: () => actions.loopKeys(1)
                 },
                 {
                     label: 'Loop x3',
                     action: () => actions.loopKeys(2)
                 },
                 {
                     label: 'Loop x4',
                     action: () => actions.loopKeys(3)
                 },
                 {
                     label: 'Loop x8',
                     action: () => actions.loopKeys(7)
                 }
             ]
        }
    );

    items.push(
        { label: 'Actions', action: () => {}, isHeader: true },
        { 
            label: `Delete ${selectedCount > 1 ? 'Keys' : 'Key'}`, 
            danger: true, 
            action: actions.deleteKeys 
        }
    );

    return items;
};
