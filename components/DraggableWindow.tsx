import React from 'react';
import { DragHandleIcon } from './Icons';
import { FloatingPanel } from './ui';
import { Z } from './ui/zIndex';
import { useEngineStore } from '../store/engineStore';
import { getPanelDefinition, evalShowIf } from '../engine/PanelManifest';

/**
 * GMT floating window. Thin wrapper over the shared `<FloatingPanel>` primitive
 * that adds the two GMT-specific concerns the primitive stays out of:
 *
 *  - **Managed mode** (`id` given): position/size/visibility live in the
 *    engineStore panel registry, and the header carries a dock-drag handle
 *    (`startPanelDrag`) so the window can be dragged back into the dock.
 *  - **Feature panels**: closing Audio/Drawing/Engine also turns the feature
 *    off, not just the panel.
 *
 * Standalone mode (no `id`) is controlled or uncontrolled position/size, same
 * as before — FloatingPanel handles the chrome, drag, resize and portal.
 */
export interface DraggableWindowProps {
    id?: string;
    title?: string;
    children: React.ReactNode;

    // Standalone props
    position?: { x: number; y: number };
    onPositionChange?: (pos: { x: number; y: number }) => void;
    size?: { width: number; height: number };
    onSizeChange?: (size: { width: number; height: number }) => void;
    onClose?: () => void;
    disableClose?: boolean;
    zIndex?: number;

    initialPos?: { x: number; y: number };
    initialSize?: { width: number; height: number };
}

const DraggableWindow: React.FC<DraggableWindowProps> = ({
    id, title, children,
    position, onPositionChange,
    size, onSizeChange,
    onClose, disableClose, zIndex,
    initialPos, initialSize,
}) => {
    // Granular selectors — `useEngineStore()` no-selector subscribes to all
    // state, re-rendering on every setter. See Dock.tsx for rationale.
    const panels = useEngineStore((s) => s.panels);
    const setFloatPosition = useEngineStore((s) => s.setFloatPosition);
    const setFloatSize = useEngineStore((s) => s.setFloatSize);
    const togglePanel = useEngineStore((s) => s.togglePanel);
    const startPanelDrag = useEngineStore((s) => s.startPanelDrag);

    const isManaged = !!id;
    const panel = id ? panels[id] : null;

    // Managed: also honour the panel manifest's `showIf` predicate, so a
    // floating panel hides when its feature is disabled (audio.isEnabled,
    // engineSettings.showEngineTab, …) — matching the dock, which filters the
    // same way (Dock.tsx). Selecting a boolean keeps re-renders to visibility
    // flips only, whatever slice the predicate reads.
    const showIfVisible = useEngineStore((s) =>
        isManaged && id ? evalShowIf(getPanelDefinition(id)?.showIf, s as never) : true,
    );

    // Managed: only render while open, floating, and not hidden by showIf.
    if (isManaged && (!panel || !panel.isOpen || panel.location !== 'float' || !showIfVisible)) return null;

    const displayTitle = title || (panel ? panel.id : 'Window');
    const displayZ = zIndex ?? (isManaged ? Z.panel : Z.panel + 100);

    const handleClose = () => {
        if (onClose) onClose();
        else if (isManaged && id) {
            // Closing a feature panel also turns its feature off.
            const actions = useEngineStore.getState() as any;
            if (id === 'Audio') actions.setAudio({ isEnabled: false });
            else if (id === 'Drawing') actions.setDrawing({ enabled: false });
            else if (id === 'ShaderCompiler') actions.setShaderCompiler({ showEngineTab: false });
            togglePanel(id, false);
        }
    };

    const showClose = !disableClose && (!!onClose || (isManaged && !panel?.isCore));

    return (
        <FloatingPanel
            z={displayZ}
            position={isManaged ? (panel?.floatPos ?? { x: 100, y: 100 }) : position}
            initialPosition={initialPos ?? { x: 100, y: 100 }}
            onPositionChange={
                isManaged
                    ? (pos) => id && setFloatPosition(id, pos.x, pos.y)
                    : onPositionChange
            }
            size={isManaged ? (panel?.floatSize ?? { width: 320, height: 400 }) : size}
            initialSize={initialSize ?? { width: 320, height: 400 }}
            onSizeChange={
                isManaged
                    ? (s) => id && setFloatSize(id, s.width, s.height)
                    : onSizeChange
            }
            draggable
            resizable
            title={displayTitle}
            onClose={showClose ? handleClose : undefined}
            showClose={showClose}
            headerLeft={
                isManaged && id ? (
                    // select-none + draggable=false + preventDefault: the handle bypasses
                    // FloatingPanel's header-drag onBegin (via stopPropagation), so it must
                    // suppress the browser's native text-selection / drag itself — otherwise
                    // a native drag fires intermittently, ghosts the page, captures the
                    // pointer, and the dock-drop never lands.
                    <div
                        className="cursor-grab text-fg-dim hover:text-fg select-none"
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); startPanelDrag(id); }}
                    >
                        <DragHandleIcon />
                    </div>
                ) : undefined
            }
            className="glass-panel flex flex-col overflow-hidden animate-pop-in shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
            // No body padding or background: the panel rows own their own
            // padding (AutoFeaturePanel `px-3`, sections `py-1.5`) and the
            // `glass-panel` root already supplies the dark bg + blur. A
            // `p-3 bg-black/80` body here stacked a second black layer and
            // added inset on every side → black gutter/bands around content.
            bodyClassName="overflow-y-auto overflow-x-hidden custom-scroll flex-1 relative"
        >
            {children}
        </FloatingPanel>
    );
};

export default DraggableWindow;
