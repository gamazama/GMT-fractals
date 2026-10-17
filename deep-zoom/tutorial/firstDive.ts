/**
 * deep-zoom/tutorial/firstDive.ts - the first-run guide: lesson 1 of the engine's tutorial, "The
 * first dive", and when it shows.
 *
 * PURPOSE
 *   A first-time visitor gets one small card (the engine's tutorial card, 360 px, at the bottom of
 *   the window) that walks through the app's one loop: dive, fly, save the place, make a route
 *   and play it. Seven cards. Each waits for the DEED and moves on by itself - a dive that really
 *   ended, a flight that really moved the camera, a place that is really in the list, a keyframe
 *   that is really on the route (./hostEvents.ts) - so nobody is asked for something already done
 *   and nothing has to be clicked on the card but its first button and its last.
 *   (plans/deep-zoom-shell/DECISIONS.md, D9: the engine's card, not a strip of our own.)
 *
 * THE SEAM
 *   - `installFirstDive({ preempted })` once, at the end of main.tsx's install chain: the engine's
 *     tutorial plugin under this app's own storage key, the `dz-dive` card (./steps.tsx), the
 *     lesson, the bridge to the action bus, and the first-run start.
 *   - `<TutorialRunner />` and `<TutorialOverlay />` are mounted by DeepZoomApp.tsx. Without them
 *     a started lesson is a store flag and nothing on screen.
 *   - `startFirstDive()` is the "?" menu's "Show the intro again"
 *     (deep-zoom/help/installDeepZoomHelp.tsx).
 *
 * WHEN IT SHOWS BY ITSELF
 *   Once: on the first visit, at the moment the deep renderer is ready (the loading notice has the
 *   picture to itself until then, and the first card's button needs the renderer). "Seen" is this
 *   app's own key, `gmt.deepZoom.firstDive.seen`, written when the lesson ENDS, finished or
 *   skipped - the engine's own record (`gmt.deepZoom-tutorials`) is written on a finish only, and
 *   a skipped intro must not come back either. A reload in the middle of the lesson shows it
 *   again from its first card: it was neither finished nor dismissed.
 *   NOT on a visit that opened a share link (`preempted`): the link's place is what was asked
 *   for, and the first card's button would jump away from it. Such a visit leaves the key alone,
 *   so the next plain visit still gets the intro.
 *
 * THE CARD DOES NOT TAKE THE PICTURE'S INPUT (D9's condition; the plan's row marked it unverified).
 *   Verified in the app on 2026-10-12 (debug/scratch/help/app-help.mts, git-ignored): with the
 *   card up, W moves the camera and a drag on the picture turns it, and W still flies after a
 *   click on the card's own button (the focus was on the page's body before the click and on the
 *   picture's frame after it: the dive hands it there). The same day the five stages of
 *   `npm run smoke:deep-zoom`, which boot clean profiles and so run with the card up, were green
 *   (54 steps), as was `npm run smoke:chrome` for this app. Why it holds: the card is a box at
 *   the bottom of the window, 360 x 174 px over the foot of the picture, that takes the pointer
 *   over itself and nowhere else; it holds no text field; and the fly keys are heard on the window
 *   whatever has focus (deep-zoom/DeepZoomNavigation.tsx, PITFALLS).
 *   What it does cover: that patch of the picture, and whatever of the timeline lies under it when
 *   the timeline is open. A press there goes to the card.
 *
 * PITFALLS
 *   - NO STEP HAS `onExit`, and none may: the engine's runner calls it on a step-to-step change
 *     only, never when the lesson ends or is skipped (engine/plugins/tutorial/runner.ts, header).
 *     No step has `onEnter` or `forceTab` either: the lesson never changes the scene, the camera
 *     or a tab by itself. The one thing it does is the first card's button, when it is pressed.
 *   - THE STORAGE KEY MUST BE GIVEN. Without `storageKey` the tutorial plugin keeps its "finished"
 *     list under GMT's own key (`gmt-tutorials`), and the two apps share an origin: finishing
 *     this lesson 1 would tick GMT's lesson 1.
 *   - `showKeys` are the key caps a card draws. They are the keys the card's words name, and
 *     `npm run check:deep-zoom-help` holds each against the shortcuts registry and the fly keys'
 *     table. (They do not light up when pressed: the engine lights them from its own `keypress`
 *     trigger alone, and these steps wait for the deed.)
 *   - The card's own words "Tutorial 1", "Skip Tutorial" and "Finish" are the engine's.
 *   - HINTS GO OFF WHILE A LESSON IS UP AND ON WHEN IT ENDS, whatever they were: the engine's
 *     `startTutorial` / `skipTutorial` / `completeTutorial` set `showHints` so (store/slices/
 *     uiSlice.ts, grep `showHints: false`). Somebody who had switched the hints off and asks for
 *     the intro again has them on afterwards, until the next reload (the stored choice is not
 *     touched). GMT's lessons behave the same; it is not put right here.
 *   - THE FIRST CARD'S DIVE IS THE STARTER "Surface", whose start view is the Start view a fresh
 *     start opens on (deep-zoom/locations.ts, `startAtStartView`): the button's jump moves nothing
 *     and the dive takes off at once. Its toast said "Stopped at 2.11e-5" though it arrived, until
 *     the dive said how it ended and the toast read the depth settled (deep-zoom/diveControl.ts,
 *     2026-10-17): "Arrived at 1.07e-6". The button says "Dive to 1e-6" because that is where the
 *     dive goes.
 *
 * @assumption The lesson runs as THE SEAM and WHEN IT SHOWS say. No standing guard drives it: on
 *   2026-10-12 a clean profile was driven through all seven cards in the app, each advancing on
 *   its deed, then a reload (no card), then a skip on another clean profile and a reload (no card)
 *   (debug/scratch/help/app-help.mts). `npm run check:deep-zoom-help` proves only what stands
 *   without a browser: the lesson's shape, its keys and its action names.
 */
import { installTutorial, registerLessons } from '../../engine/plugins/Tutorial';
import type { TutorialLesson } from '../../engine/plugins/Tutorial';
import { useEngineStore } from '../../store/engineStore';
import { getTelemetry, subscribeTelemetry } from '../host/telemetry';
import { DZ_ACTION, installHostEvents } from './hostEvents';
import { DZ_STEP_DIVE, registerDeepZoomStepKinds } from './steps';

/** The lesson's number in the engine's registry (this app has one lesson). */
export const FIRST_DIVE_LESSON_ID = 1;
/** localStorage: '1' once the intro has ended, finished or skipped. */
export const DZ_FIRST_DIVE_SEEN_KEY = 'gmt.deepZoom.firstDive.seen';
/** The tutorial plugin's namespace: its "finished" list is kept under `gmt.deepZoom-tutorials`. */
const TUTORIAL_STORAGE_KEY = 'gmt.deepZoom';

const action = (name: string) => ({ kind: 'action', name });

export const firstDiveLesson: TutorialLesson = {
    id: FIRST_DIVE_LESSON_ID,
    title: 'The first dive',
    steps: [
        {
            id: 'dive',
            kind: DZ_STEP_DIVE,
            text: 'This is a fractal you can fly into. Start with a dive.',
            subtext: 'Watch the depth at the top left: each step in the exponent is ten times closer.',
            trigger: action(DZ_ACTION.diveEnded),
        },
        {
            id: 'fly',
            text: 'Now fly it yourself. Hold W to go forward, and drag the picture to look.',
            subtext: 'A, S and D move too. Space is up, C is down, Shift is four times as fast.',
            showKeys: ['W', 'A', 'S', 'D', 'Space', 'C', 'Shift'],
            trigger: action(DZ_ACTION.flightEnded),
        },
        {
            id: 'save',
            text: 'Found a view you like? Press B to save it.',
            subtext: 'It is kept under My locations on the Locations tab, with a picture.',
            showKeys: ['B'],
            trigger: action(DZ_ACTION.locationSaved),
        },
        {
            id: 'keyframe',
            text: 'Now a camera move. Press K to drop a keyframe on this view.',
            showKeys: ['K'],
            trigger: action(DZ_ACTION.keyframeAdded),
        },
        {
            id: 'keyframe-2',
            text: 'Fly on for a few seconds, deeper or somewhere else, and press K again.',
            subtext: 'The route runs from the first keyframe to the second.',
            showKeys: ['K'],
            trigger: action(DZ_ACTION.keyframeAdded),
        },
        {
            id: 'play',
            text: 'Open the Route tab on the left and press Play.',
            subtext: 'While it plays, a drag on the picture still looks around.',
            trigger: action(DZ_ACTION.routePlayed),
        },
        {
            id: 'done',
            text: 'That was the first dive.',
            subtext: 'Render, on the Route tab, makes a video of a route.\nThe ? at the top right has Help, and so does the / key.',
            showKeys: ['/'],
            trigger: { kind: 'manual' },
        },
    ],
};

function seen(): boolean {
    try { return localStorage.getItem(DZ_FIRST_DIVE_SEEN_KEY) === '1'; } catch { return true; }   // storage refused: no card at every visit
}
function remember(): void {
    try { localStorage.setItem(DZ_FIRST_DIVE_SEEN_KEY, '1'); } catch { /* private mode: it shows again next visit */ }
}

/** Start the intro from its first card. The "?" menu's "Show the intro again". */
export function startFirstDive(): void {
    useEngineStore.getState().startTutorial(FIRST_DIVE_LESSON_ID);
}

let installed = false;

/**
 * Call once, after the store exists. `preempted`: this visit opened a share link, so the intro
 * does not start by itself (see WHEN IT SHOWS BY ITSELF).
 */
export function installFirstDive(opts: { preempted?: boolean } = {}): void {
    if (installed) return;
    installed = true;
    installTutorial({ storageKey: TUTORIAL_STORAGE_KEY });
    registerDeepZoomStepKinds();
    registerLessons([firstDiveLesson]);
    installHostEvents();

    // Ended, finished or skipped: it does not show by itself again.
    useEngineStore.subscribe((s) => s.tutorialActive, (active, was) => { if (was && !active) remember(); });

    if (opts.preempted || seen()) return;
    // The first visit: at the first telemetry sample that says the deep renderer is ready.
    const startWhenReady = (): boolean => {
        const t = getTelemetry();
        if (!(t.live && t.ready)) return false;
        if (!useEngineStore.getState().tutorialActive && !seen()) startFirstDive();
        return true;
    };
    if (startWhenReady()) return;
    const stop = subscribeTelemetry(() => { if (startWhenReady()) stop(); });
}
