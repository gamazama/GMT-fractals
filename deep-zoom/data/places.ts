/**
 * deep-zoom/data/places.ts - places worth keeping: the owner's own, as project data.
 *
 * WHAT THESE ARE FOR (the owner, 2026-10-08: "we need these deep zoom locations for our flythroughs,
 * which will become rich testing data for the quality questions"). Two readers:
 *   - the app: `KeptPlaces` in components/StarterDives.tsx draws one card each on the Locations tab;
 *     a click is `jumpTo(place.state)` - the view, the look, and the march settings the place needs.
 *   - the quality tooling: a script imports `PLACES` and marches these views. They are the HARD
 *     cases - found by a person, not sampled from one dive - so a march rule that holds on the
 *     sample flight and fails here is wrong (which is how the depth-only step rule died).
 *
 * A place is a location (`DzLocationState` in deep-zoom/locations.ts): the same object a saved
 * location holds and "Copy location" puts on the clipboard. To add one: go there, set the march
 * so it draws right, Copy location, and append `{ name, note, state: <the pasted object> }`.
 *
 * PITFALLS
 *   - The three `cam` values are 256-bit integers as decimal STRINGS. Paste them; never retype them
 *     and never let anything turn them into numbers.
 *   - `state.look.march` (step size, hit refine, reach) is what makes a hard place draw right.
 *     Without it a jump keeps whatever the Quality tab holds.
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
                },
                "dzLight": {
                    "shading": 1,
                    "lightType": 0,
                    "lampFalloff": 4,
                    "keyElevation": 23,
                    "keyTurn": 0,
                    "lightTint": 0.5,
                    "shadows": 1,
                    "occlusion": 2,
                    "sky": 0.3,
                    "roughness": 0.75,
                    "haze": 0
                },
                "dzColour": {
                    "plain": false,
                    "mode": 1,
                    "scale": 0.8
                },
                "detail": 32.0,
                "march": {
                    "stepSize": 0.1,
                    "hitRefine": 2,
                    "reach": 2
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
                },
                "dzLight": {
                    "shading": 1,
                    "lightType": 0,
                    "lampFalloff": 4,
                    "keyElevation": 23,
                    "keyTurn": 0,
                    "lightTint": 0.5,
                    "shadows": 1,
                    "occlusion": 2,
                    "sky": 0.3,
                    "roughness": 0.75,
                    "haze": 0
                },
                "dzColour": {
                    "plain": false,
                    "mode": 1,
                    "scale": 0.8
                },
                "detail": 32.0,
                "march": {
                    "stepSize": 0.5,
                    "hitRefine": 4,
                    "reach": 1
                }
            },
            "depth": "1.5686261975430396e-19"
        }
    },
    {
        "name": "Slicing · 2.8e-39",
        "note": "The owner's place where he first saw slicing (2026-10-08). Power 8. At step 0.85, 57 % of the pixels of one sample land behind the right surface; step 0.5 with Hit refine 3 leaves 2.8 %. Saved here with those two.",
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
                },
                "dzLight": {
                    "shading": 1,
                    "lightType": 0,
                    "lampFalloff": 4,
                    "keyElevation": 40,
                    "keyTurn": 0,
                    "lightTint": 0.5,
                    "shadows": 1,
                    "occlusion": 1,
                    "sky": 0.3,
                    "roughness": 0.45,
                    "haze": 1
                },
                "dzColour": {
                    "plain": true,
                    "mode": 0,
                    "scale": 1
                },
                "detail": 1,
                "march": {
                    "stepSize": 0.5,
                    "hitRefine": 3,
                    "reach": 1
                }
            },
            "depth": "2.7593205824225345e-39"
        }
    }
];
