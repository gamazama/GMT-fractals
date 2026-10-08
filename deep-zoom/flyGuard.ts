/**
 * deep-zoom/flyGuard.ts - while the pointer is captured, the timeline's keys do nothing.
 *
 * `components/TimelineHost.tsx` registers `t` (open the timeline) and `Space` (play) itself. At
 * 1e-50 the left hand sits on W A S D Q E: a slip onto Space must not start the timeline and pull
 * the camera along the flight. The engine has no "not while this app is flying" predicate for
 * those two (plan gap E37), so this shadows them with the dispatcher's own means: a shortcut
 * SCOPE that is on the stack only while the pointer is captured, holding the same two keys with a
 * handler that does nothing. A deeper scope outranks `global` (grep `scopeIdx` in
 * engine/plugins/Shortcuts.ts) - the mechanism the timeline's own hover binding uses.
 *
 * PITFALL - why this is a scope and not `priority` + `when`. The dispatcher picks the winning
 * binding for a key FIRST and tests its `when` afterwards; a failing `when` does not fall through
 * to the next binding (grep `match.when` there). A priority-10 guard with `when: captured` would
 * therefore swallow T and Space with the pointer free as well. Seen 2026-10-08: the stage-2 smoke
 * step "with the pointer free it does" was red on exactly that.
 *
 * The captured flag comes from the telemetry store (the host writes it on a pointer-lock change),
 * so this needs no host and follows a remount by itself.
 *
 * INTERIM. It goes when the engine's navigation takes the input (stage N5: nothing captures the
 * mouse then), or when the engine gains the predicate.
 */
import { shortcuts } from '../engine/plugins/Shortcuts';
import { getTelemetry, subscribeTelemetry } from './host/telemetry';

/** On the dispatcher's scope stack only while the pointer is captured on the picture. */
export const DZ_FLYING_SCOPE = 'deep-zoom-flying';

const nothing = (): void => undefined;

/** Call once, after `installShortcuts()`. */
export function installFlyGuard(): void {
    // `t` needs no do-nothing binding here: deep-zoom/hotkeys.ts registers T in this same scope
    // as "lamp falloff down", which shadows the timeline's T just the same.
    shortcuts.register({
        id: 'deep-zoom.fly-guard.play',
        key: 'Space',
        scope: DZ_FLYING_SCOPE,
        handler: nothing,
        description: 'While flying: Space does not play the timeline',
        category: 'Flying',
    });

    let pushed = false;
    const follow = (captured: boolean): void => {
        if (captured === pushed) return;
        pushed = captured;
        if (captured) shortcuts.pushScope(DZ_FLYING_SCOPE);
        else shortcuts.popScope(DZ_FLYING_SCOPE);
    };
    follow(getTelemetry().captured);
    subscribeTelemetry((t) => follow(t.captured));
}
