/**
 * deep-zoom/tutorial/hostEvents.ts - what really happened in the app, said on the tutorial's
 * action bus, so a lesson step advances on the deed and not on a key that was pressed.
 *
 * PURPOSE
 *   The engine's tutorial has a trigger kind `action`: a step waits for a NAME fired on
 *   `actionBus` (engine/plugins/tutorial/actionBus.ts). This file fires the names, each from the
 *   place in this app that knows the thing has happened:
 *
 *     dz.dive.ended       a dive that was in flight is over, however it ended (arrived, stopped,
 *                         a fly key): `useDive` goes from a dive to none (deep-zoom/diveControl.ts)
 *     dz.flight.ended     the hands flew and the camera is somewhere else, or turned: `flying`
 *                         goes down (deep-zoom/navigationState.ts) with a view that is not the
 *                         view it went up with. A click on the picture that moved nothing is no
 *                         flight.
 *     dz.location.saved   My locations grew (the B key, "Save this view", an imported file)
 *     dz.keyframe.added   the route has more keyframes than it had (K, "Add keyframe", a route
 *                         made from the trail). A keyframe that only took a new view is not one.
 *     dz.route.played     the timeline started to play with a route of two keyframes or more on
 *                         it (the Route tab's Play, a leg's play, the timeline's own Play)
 *
 * THE SEAM
 *   `installHostEvents()` once, from deep-zoom/tutorial/firstDive.ts. It listens ONLY WHILE A
 *   LESSON IS ACTIVE (the engine store's `tutorialActive`): with no lesson up there is no
 *   subscription at all, so the animation store's every-frame writes while a timeline plays cost
 *   this file nothing. A lesson names an action with `{ kind: 'action', name: DZ_ACTION.x }`.
 *
 * PITFALLS
 *   - NOTHING HERE READS THE HOST'S EVENTS OR ITS TELEMETRY, though the plan's row for this file
 *     says so (plans/deep-zoom-shell/BUILD-PLAN.md, S4-3). The host has no event for any of the
 *     five: a dive is a promise inside `diveTo`, a flight is the navigation's, places and
 *     keyframes are store state. The stores are where each is already published.
 *   - A fired name with no step waiting for it does nothing: the bus has no queue. A dive that
 *     ends BEFORE its step is entered does not advance that step.
 *   - `dz.flight.ended` compares the renderer's view (camera strings and the three angles) at
 *     take-off and at landing; with no renderer mounted nothing is fired.
 */
import { actionBus } from '../../engine/plugins/Tutorial';
import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { useDive } from '../diveControl';
import { useDzNavigation } from '../navigationState';
import { getHost } from '../host/current';
import { ROUTE_TRACK } from '../route';

/** The action names this app fires. A lesson's `action` trigger names one of these. */
export const DZ_ACTION = {
    diveEnded: 'dz.dive.ended',
    flightEnded: 'dz.flight.ended',
    locationSaved: 'dz.location.saved',
    keyframeAdded: 'dz.keyframe.added',
    routePlayed: 'dz.route.played',
} as const;

/** The camera as one string: where it is and how it is turned. '' with no renderer. */
function pose(): string {
    const host = getHost();
    if (!host) return '';
    const v = host.getView();
    return [...v.cam, v.yaw, v.pitch, v.roll ?? 0].join(' ');
}

/** How many keyframes the route has, in a state of the animation store. */
const routeKeyCount = (s: ReturnType<typeof useAnimationStore.getState>): number => s.sequence.tracks[ROUTE_TRACK]?.keyframes.length ?? 0;

/** Start listening. Returns the function that stops it. */
function listen(): () => void {
    let tookOffAt = useDzNavigation.getState().flying ? pose() : '';
    const offs = [
        useDive.subscribe((s, was) => { if (was.dive && !s.dive) actionBus.fire(DZ_ACTION.diveEnded); }),
        useDzNavigation.subscribe((s, was) => {
            if (s.flying === was.flying) return;
            if (s.flying) { tookOffAt = pose(); return; }
            const landedAt = pose();
            if (tookOffAt !== '' && landedAt !== '' && landedAt !== tookOffAt) actionBus.fire(DZ_ACTION.flightEnded);
        }),
        useEngineStore.subscribe((s) => s.savedLocations?.length ?? 0, (n, was) => { if (n > was) actionBus.fire(DZ_ACTION.locationSaved); }),
        useAnimationStore.subscribe(routeKeyCount, (n, was) => { if (n > was) actionBus.fire(DZ_ACTION.keyframeAdded); }),
        useAnimationStore.subscribe((s) => s.isPlaying, (playing) => {
            if (playing && routeKeyCount(useAnimationStore.getState()) >= 2) actionBus.fire(DZ_ACTION.routePlayed);
        }),
    ];
    return () => offs.forEach((off) => off());
}

let installed = false;

/** Call once. Listens while a lesson is active, and not otherwise. */
export function installHostEvents(): void {
    if (installed) return;
    installed = true;
    let stop: (() => void) | null = null;
    const follow = (active: boolean): void => {
        if (active && !stop) stop = listen();
        else if (!active && stop) { stop(); stop = null; }
    };
    useEngineStore.subscribe((s) => s.tutorialActive, follow);
    follow(useEngineStore.getState().tutorialActive);
}
