
import React from 'react';
import { KeyIcon, KeyStatus } from './Icons';
import { useStoreCallbacks } from './contexts/StoreCallbacksContext';
import type { ContextMenuItem } from '../types/help';

/**
 * KeyframeButton — the keyframe diamond next to an animatable param.
 *
 * Interaction model (consistent across every diamond in the app):
 *   - click                    → toggle: remove when the frame is exactly keyed,
 *                                otherwise set/update the key (`onClick` = set,
 *                                composed with `onDeleteKey` when `status === 'keyed'`)
 *   - Ctrl/⌘ + click           → delete the key at the current frame (`onDeleteKey`)
 *   - Ctrl/⌘ + Shift + click   → delete the whole track (`onDeleteTrack`)
 *   - right-click              → context menu with explicit Set / Delete Key / Delete Track
 *
 * The delete handlers are optional so callers that only key (no track wiring)
 * still work — the modifier-clicks and the corresponding menu items degrade to
 * disabled/no-ops, and plain click falls back to set-only. `hasKey` / `hasTrack`
 * are derived from `status` so multi-track callers (min/max, vec axes) don't have to
 * thread extra flags: `keyed`/`keyed-dirty` means a key sits on this frame; anything
 * but `none` means the track exists. Toggle-remove fires only on exact `keyed`, so a
 * `keyed-dirty` click updates the value rather than deleting it.
 *
 * The context menu uses the app's global menu via `StoreCallbacksContext`
 * (`openContextMenu`) — no store import, so the primitive stays pure. When no
 * provider is mounted the menu is silently unavailable (documented invariant).
 */
interface KeyframeButtonProps {
    status: KeyStatus;
    /** "Set Keyframe": add or update the key at the current frame. Plain click uses
     *  this when unkeyed, and `onDeleteKey` when exactly keyed (toggle). */
    onClick: () => void;
    /** Ctrl/⌘+click and the "Delete Keyframe" menu item. */
    onDeleteKey?: () => void;
    /** Ctrl/⌘+Shift+click and the "Delete Track" menu item. */
    onDeleteTrack?: () => void;
    /** Param name shown as the context-menu header. */
    label?: string;
    className?: string;
}

export const KeyframeButton: React.FC<KeyframeButtonProps> = ({
    status,
    onClick,
    onDeleteKey,
    onDeleteTrack,
    label,
    className = "",
}) => {
    const { openContextMenu } = useStoreCallbacks();

    const hasKey = status === 'keyed' || status === 'keyed-dirty';
    const hasTrack = status !== 'none';

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const mod = e.ctrlKey || e.metaKey;
        if (mod && e.shiftKey) {
            if (onDeleteTrack && hasTrack) onDeleteTrack();
            return;
        }
        if (mod) {
            if (onDeleteKey && hasKey) onDeleteKey();
            return;
        }
        // Plain click toggles: remove on an exact key, otherwise set/update.
        if (status === 'keyed' && onDeleteKey) onDeleteKey();
        else onClick();
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const items: ContextMenuItem[] = [
            { label: label ? `Keyframe · ${label}` : 'Keyframe', isHeader: true },
            { label: hasKey ? 'Update Keyframe' : 'Set Keyframe', action: onClick },
            { label: 'Delete Keyframe', danger: true, disabled: !hasKey || !onDeleteKey, action: () => onDeleteKey?.() },
            { label: 'Delete Track', danger: true, disabled: !hasTrack || !onDeleteTrack, action: () => onDeleteTrack?.() },
        ];
        openContextMenu(e.clientX, e.clientY, items);
    };

    return (
        <button
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            tabIndex={-1}
            className={`p-0.5 rounded hover:bg-line/10 transition-colors shrink-0 ${
                status === 'keyed' ? 'text-warn' :
                status === 'keyed-dirty' ? 'text-danger' :
                status === 'dirty' ? 'text-danger' :
                status === 'partial' ? 'text-warn hover:text-warn' :
                'text-fg-faint hover:text-warn'
            } ${className}`}
            title={
                (status === 'keyed'
                    ? "Remove key · Ctrl+click: delete key"
                    : hasKey
                        ? "Update key · Ctrl+click: delete key"
                        : "Add key") +
                (hasTrack ? " · Ctrl+Shift+click: delete track" : "") +
                " · right-click for menu"
            }
        >
            <KeyIcon status={status} />
        </button>
    );
};
