/**
 * deep-zoom/help/flyKeys.ts - what the hands do, as one table for Help's shortcuts page.
 *
 * THE FLY KEYS ARE NOT IN THE SHORTCUTS REGISTRY, on purpose: W A S D, Space, C, Q, E and Shift
 * are heard on the window by the navigation, as are the wheel and the drags on the picture
 * (deep-zoom/hotkeys.ts says why none of them may be registered). So the generated page
 * (./shortcutsPage.ts) cannot read them from the registry, and this table is where it gets them.
 *
 * THIS TABLE MUST FOLLOW `deep-zoom/DeepZoomNavigation.tsx` - its header, WHAT THE HANDS DO, is
 * the statement of record, and the code under it is what acts. Change a key, a drag or the wheel
 * there and change the row here in the same edit. Nothing derives one from the other: the
 * navigation reads keys through the engine's input hook, which has no list to export.
 *
 * A row is either KEYS (shown as key caps) or a HAND movement (shown as words), with what it
 * does. `does` is plain text: no backticks, which in the help topics mean "a key".
 *
 * `npm run check:deep-zoom-help` reads `FLY_KEY_NAMES` as the keys a topic or the first-dive
 * lesson may name without their being registered, and fails if one of them IS registered (a
 * registered fly key would act twice).
 */

export interface FlyKeyRow {
    /** Key caps, as Help prints them. Absent for a row about the mouse. */
    keys?: readonly string[];
    /** A movement of the mouse, in words. Absent for a row of keys. */
    hand?: string;
    does: string;
}

export interface FlyKeyGroup {
    title: string;
    /** One line under the title, or none. */
    note?: string;
    rows: readonly FlyKeyRow[];
}

export const FLY_KEYS: readonly FlyKeyGroup[] = [
    {
        title: 'Fly mode',
        note: 'The mode the app starts in. With the pointer over the timeline or the Route tab these keys do nothing, and Space plays the route.',
        rows: [
            { keys: ['W', 'A', 'S', 'D'], does: 'forward, left, back, right' },
            { keys: ['Space', 'C'], does: 'up, down' },
            { keys: ['Q', 'E'], does: 'roll left, right' },
            { keys: ['Shift'], does: 'four times as fast, the roll too' },
            { hand: 'Drag the picture', does: 'look; the further from where the drag began, the faster the turn' },
            { hand: 'Wheel on the picture', does: 'the fly speed, 0.01 to 8 paces a second (with Shift four notches at once, with Alt a tenth of one)' },
        ],
    },
    {
        title: 'Orbit mode',
        rows: [
            { hand: 'Drag', does: 'turn the camera about the point under the pointer' },
            { hand: 'Wheel', does: 'fly to the point under the pointer, or back from it' },
            { hand: 'Middle drag', does: 'the same flight by hand: up is towards the point, down is back' },
            { hand: 'Right drag', does: 'drag the point under the pointer; the camera moves sideways' },
            { keys: ['Q', 'E'], does: 'roll; the other fly keys do nothing in this mode' },
        ],
    },
    {
        title: 'While a route plays',
        rows: [
            { hand: 'Drag the picture (Fly mode)', does: 'turn the view on top of the route; the route plays on' },
            { keys: ['Q', 'E'], does: 'roll on top of the route; the route plays on' },
            { keys: ['W', 'A', 'S', 'D', 'Space', 'C'], does: 'in Fly mode: stop the route and take the camera where it is' },
            { hand: 'The wheel, or any press in Orbit mode', does: 'stop the route and take the camera where it is' },
        ],
    },
];

/** Every key the table names, once. */
export const FLY_KEY_NAMES: readonly string[] = [...new Set(FLY_KEYS.flatMap((g) => g.rows.flatMap((r) => r.keys ?? [])))];
