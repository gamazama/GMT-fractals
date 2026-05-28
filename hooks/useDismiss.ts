import { useEffect, useId, useRef, type RefObject } from 'react';
import { shortcuts } from '../engine/plugins/Shortcuts';

/**
 * Shared dismissal behaviour for floating surfaces (panels, popovers, menus,
 * modals). Replaces the hand-rolled outside-click / Escape blocks that each
 * surface used to carry (Popover, LoadFilterPanel, the context menus, …).
 *
 * Outside-click: a `pointerdown` listener (covers mouse + touch), attached on a
 * deferred tick so the same interaction that opened the surface doesn't
 * immediately dismiss it — the `setTimeout(0)` trick the old call sites all
 * reimplemented. Pass `capture: true` to win against descendants that stop
 * propagation (the context menus relied on capture-phase listeners).
 *
 * Escape: routed through the scope-aware shortcut registry (`@engine/shortcuts`)
 * rather than a private keydown listener. Each open surface pushes its own
 * scope, so the topmost surface wins and consumes the keypress — nested
 * surfaces (a confirm over a modal) dismiss innermost-first with no double-fire,
 * and Escape participates in the app's shortcut priority model instead of
 * racing it. Requires `installShortcuts()` to have run (app-gmt does this at
 * boot); without it the Escape path is inert.
 */
export interface UseDismissOptions {
    /** Called when the surface should close (outside pointer-down or Escape). */
    onClose: () => void;
    /** Gate the listeners — pass the open flag here. Default true. */
    enabled?: boolean;
    /** Close on pointer-down outside the ref(s). Default true. */
    outside?: boolean;
    /** Close on Escape. Default true. */
    escape?: boolean;
    /** Attach the pointer-down listener in the capture phase. Default false. */
    capture?: boolean;
}

type DismissRef = RefObject<HTMLElement | null>;
/**
 * The surface element(s). A pointer-down counts as "outside" only when it
 * lands outside *every* ref — pass `[triggerRef, panelRef]` when the trigger
 * should not self-dismiss.
 */
type DismissRefs = DismissRef | DismissRef[];

export function useDismiss(refs: DismissRefs, options: UseDismissOptions): void {
    const { onClose, enabled = true, outside = true, escape = true, capture = false } = options;
    const instanceId = useId();

    // Read `onClose`/`refs` through refs so the listener effect doesn't tear
    // down and re-attach (re-deferring the pointer-down listener) when callers
    // pass an inline array or arrow — only the primitive flags gate the effect.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const refsRef = useRef(refs);
    refsRef.current = refs;

    // Outside-click via a deferred pointer-down listener.
    useEffect(() => {
        if (!enabled || !outside) return;

        const isInside = (target: Node | null) => {
            if (!target) return false;
            const list = Array.isArray(refsRef.current) ? refsRef.current : [refsRef.current];
            return list.some((r) => r.current?.contains(target));
        };
        const onPointerDown = (e: PointerEvent) => {
            if (!isInside(e.target as Node | null)) onCloseRef.current();
        };

        const timer = window.setTimeout(
            () => document.addEventListener('pointerdown', onPointerDown, capture),
            0,
        );
        return () => {
            clearTimeout(timer);
            document.removeEventListener('pointerdown', onPointerDown, capture);
        };
    }, [enabled, outside, capture]);

    // Escape via the scope-aware shortcut registry (topmost surface wins).
    useEffect(() => {
        if (!enabled || !escape) return;
        const scope = `dismiss:${instanceId}`;
        shortcuts.pushScope(scope);
        shortcuts.register({
            id: scope,
            key: 'Escape',
            scope,
            handler: () => onCloseRef.current(),
            // ignoreInputs: fire even when a field inside the surface has focus,
            // matching the raw-listener behaviour these call sites had before.
            ignoreInputs: true,
            description: 'Dismiss',
        });
        return () => {
            shortcuts.unregister(scope);
            shortcuts.popScope(scope);
        };
    }, [enabled, escape, instanceId]);
}
