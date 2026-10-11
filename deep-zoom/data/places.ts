/**
 * deep-zoom/data/places.ts - places worth keeping: the owner's own, as project data.
 *
 * WHAT THESE ARE FOR (the owner, 2026-10-08: "we need these deep zoom locations for our flythroughs,
 * which will become rich testing data for the quality questions"). Two readers:
 *   - the app: `KeptPlaces` in components/StarterDives.tsx draws one card each on the Locations tab;
 *     a click is `jumpTo(place.state)` - the camera and the formula, as for any place.
 *   - the quality tooling: a script imports `PLACES` and marches these views. They are the HARD
 *     cases - found by a person, not sampled from one dive - so a march rule that holds on the
 *     sample flight and fails here is wrong (which is how the depth-only step rule died).
 *
 * `state` is a location (`DzLocationState` in deep-zoom/locations.ts): the same object a saved
 * location holds and "Copy location" puts on the clipboard. To add one: go there, Copy location,
 * and append `{ name, note, state: <the pasted object> }`.
 *
 * PITFALLS
 *   - The three `cam` values are 256-bit integers as decimal STRINGS. Paste them; never retype them
 *     and never let anything turn them into numbers.
 *   - A PLACE BRINGS NO MARCH: a jump keeps whatever the Quality tab holds. Until 2026-10-11 each
 *     entry also carried `march`, the Step size, Hit refine and Reach the owner drew it with under
 *     the page's march (0.1 / 2 / full, 0.5 / 4 / relaxed and 0.5 / 3 / relaxed, in the order
 *     below), which the march bench marched again as its "saved" row. That march and that row are
 *     gone, nothing read the field any more, and it went. The notes still quote what the page's
 *     march measured here: that is why these places are the hard ones.
 *   - Each view still carries the renderer's own `light`, `color`, `cscale` and `surf` (detail)
 *     fields: a view has them. A jump does not read them; the bench's `--detail saved` reads `surf`.
 *   - This file was first written by a script from the owner's saved files
 *     (e20power2iters85.json, e-19.png, and the 2.8e-39 location he pasted). It is edited by hand
 *     from here on; the script was session tooling.
 */
import type { DzLocationState } from '../locations';

export interface KeptPlace {
    name: string;
    /** Why it is kept, and what was measured there. Shown as the card's tooltip. */
    note: string;
    state: DzLocationState;
}

export const PLACES: KeptPlace[] = [
    {
        "name": "Power 2 · 5e-20",
        "note": "The owner's place of 2026-10-08, for a zoom-out. Power 2 over-reads the distance badly: at step 0.85, 85 % of the pixels of one sample land on the wrong surface; it needs 0.1 (1 % with Hit refine 2).",
        "state": {
            "view": {
                "cam": [
                    "-41299578387078232545878371227068119285832195730019431450984645769513507225600",
                    "80672762438630187210424034746723853255404543356324650743109286124885171503104",
                    "42871165992184102881694734728346435229906702572029550406945316366478605287424"
                ],
                "yaw": 1.0596296909488407,
                "pitch": -1.134166464057262,
                "iters": 86,
                "power": 2,
                "phase": [
                    0,
                    0
                ],
                "light": 0,
                "falloff": 4,
                "color": 2,
                "cscale": 0.8,
                "surf": 32.0
            },
            "look": {
                "dzFormula": {
                    "power": 2,
                    "phaseTheta": 0,
                    "phasePhi": 0,
                    "iterations": 86,
                    "autoIterations": true
                }
            },
            "depth": "5.0845759552981455e-20"
        }
    },
    {
        "name": "Power 2 · 1.6e-19",
        "note": "The owner's earlier place of the same day and the same power-2 region, saved at step 0.5 with Hit refine 4.",
        "state": {
            "view": {
                "cam": [
                    "-41299578387077162849559771630358194231095007272079534017125588655504713842688",
                    "80672762438631142468019674616569092945184675403738063836907411890399141167104",
                    "42871165992178137900329277194208523121681299103289648158492868704739776266240"
                ],
                "yaw": 0.29011827097753123,
                "pitch": -0.3275251426797584,
                "iters": 86,
                "power": 2,
                "phase": [
                    0,
                    0
                ],
                "light": 0,
                "falloff": 4,
                "color": 2,
                "cscale": 0.8,
                "surf": 32.0
            },
            "look": {
                "dzFormula": {
                    "power": 2,
                    "phaseTheta": 0,
                    "phasePhi": 0,
                    "iterations": 86,
                    "autoIterations": true
                }
            },
            "depth": "1.5686261975430396e-19"
        }
    },
    {
        "name": "Slicing · 2.8e-39",
        "note": "The owner's place where he first saw slicing (2026-10-08). Power 8. At step 0.85, 57 % of the pixels of one sample land behind the right surface; step 0.5 with Hit refine 3 leaves 2.8 %.",
        "state": {
            "view": {
                "cam": [
                    "-44941943988488659798543559355376442983230172451703683197094164287583594479616",
                    "-72308752214925160516146362634770805815280717328556611202725868179338297344",
                    "114858454208225827715024381334265686061241196818655984331942760955394400452608"
                ],
                "yaw": 1.140903673205096,
                "pitch": 0.28889999999999944,
                "iters": 98,
                "power": 8,
                "phase": [
                    0,
                    0
                ],
                "light": 0,
                "falloff": 4,
                "color": 0,
                "cscale": 1,
                "surf": 1
            },
            "look": {
                "dzFormula": {
                    "power": 8,
                    "phaseTheta": 0,
                    "phasePhi": 0,
                    "iterations": 98,
                    "autoIterations": true
                }
            },
            "depth": "2.7593205824225345e-39"
        }
    }
];
