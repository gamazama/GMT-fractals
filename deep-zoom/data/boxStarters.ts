/**
 * deep-zoom/data/boxStarters.ts - the Mandelbox's starter places: a card each on the Locations tab.
 *
 * DATA, hand-editable. A card is a JUMP (its `depth` equals its `startDepth`: no dive), and its
 * `formula` is what switches the renderer to the Mandelbox with that card's parameters - a view
 * alone does not say which formula it is a view of (deep-zoom/locations.ts, PITFALLS).
 *
 * WHY THESE AND NOT THE FIRST RANDOM ONES. Detail in the Mandelbox depends on the place: of 24 rays
 * dived at scale -1.5, seven end on intricate ground and seventeen on smooth walls or streaks, at
 * 2e-20 and at 2e-50 alike (the same rays both times). The three deep places below were chosen
 * 2026-10-09 by a search on the GPU module and then by eye:
 *   tool    debug/scratch/formula-study/box-place-search.mjs (git-ignored): N rays from outside the
 *           box towards random points near its middle, the module's own test dive along each, a
 *           128 px thumbnail at each depth
 *   score   the mean brightness step between neighbouring pixels of that thumbnail, classic look
 *           (no shadows, so the step is the surface's relief): smooth walls 0 to 2, intricate
 *           ground 12 to 22 at scale -1.5
 *   by eye  the score is fooled by STREAKS (its best place at scale 2, 24.7, is nothing but
 *           diagonal stripes), so the winners were rendered at 800 px and looked at
 *           (place-sheet-s-1.5.png, place-sheet-positive.png beside the tool)
 * The whole-box view is built, not found: the camera 6.5 half-sides of the set away along a fixed
 * diagonal, as `formulaHome` in deep-zoom/locations.ts builds the view a switch of formula lands on.
 *
 * NOT IN `STARTERS` ON PURPOSE. `data/starters.ts` and `data/places.ts` are also the bulb's test
 * data: the node checks and the smokes march every view in them with the bulb's maths
 * (debug/deep-zoom-checks/ray-probe.mts, the stage smokes' "six starter cards"). A Mandelbox view
 * in either would be marched as a Mandelbulb's.
 *
 * Camera values are 256-bit decimal STRINGS: never parse them.
 *
 * @assumption each card draws what its name says in this shell. Looked at once, 2026-10-09, in the
 *   dev harness (the pictures above) and through the shell by debug/scratch/formula-study/shell-box.mjs;
 *   no check opens them.
 */
import type { Starter } from './starters';
import { FORMULA_BOX } from '../features/formula';

export const BOX_STARTERS: Starter[] = [
    {
        name: "Whole box · scale -1.5",
        blurb: "The Mandelbox at scale -1.5, from outside.",
        depth: 6.0,
        startDepth: 6.0,
        formula: { kind: FORMULA_BOX, boxScale: -1.5, boxMinRadius: 0.5, boxFold: 1, boxFixedRadius: 1, boxRotX: 0, boxRotY: 0, boxRotZ: 0 },
        view: {"cam":["1096911848332305037074805845702972509381124328566735171980201942093341996875776","714654689065040866850505792569326471459539256410128103460489426966611400589312","1013812465882913519064088689437401360010477617719514360792707988688998951288832"],"yaw":-2.3955442465809504,"pitch":-0.4462656061462504,"iters":14,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Arches · 1.2e-20",
        blurb: "Scale -1.5, twenty decades in: a perforated arch. Search score 13.7 (ray 13).",
        depth: 1.2295236417086819e-20,
        startDepth: 1.2295236417086819e-20,
        formula: { kind: FORMULA_BOX, boxScale: -1.5, boxMinRadius: 0.5, boxFold: 1, boxFixedRadius: 1, boxRotX: 0, boxRotY: 0, boxRotZ: 0 },
        view: {"cam":["105133227900455499701300868468310676970769101121820030482997042997629227630592","224205250848645760082472614631644373655887713607800908119944522723394800582656","231582939326469722564091680479486627488378211150615742408566556672015225323520"],"yaw":-2.169619490527162,"pitch":-0.3955501373754834,"iters":97,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Lace · 1.1e-50",
        blurb: "Scale -1.5, fifty decades in: a fan of lace. Search score 15.3 (ray 17); the same ray scored 21.8 at 5e-21.",
        depth: 1.1043085814678351e-50,
        startDepth: 1.1043085814678351e-50,
        formula: { kind: FORMULA_BOX, boxScale: -1.5, boxMinRadius: 0.5, boxFold: 1, boxFixedRadius: 1, boxRotX: 0, boxRotY: 0, boxRotZ: 0 },
        view: {"cam":["-208924965231058972396329323158961037276050042193772734323307024814366309482496","-231250838043160771662079818850505493865704381745841447490557383791440623042560","111826224272861864348785114830402391720381323820689594275357038133100972867584"],"yaw":0.029127783976886815,"pitch":0.6841917059963338,"iters":164,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Block city · 8.7e-42",
        blurb: "Scale 2, forty-one decades in: stacked blocks to the horizon. Search score 22.2 (ray 3).",
        depth: 8.731715881273556e-42,
        startDepth: 8.731715881273556e-42,
        formula: { kind: FORMULA_BOX, boxScale: 2, boxMinRadius: 0.5, boxFold: 1, boxFixedRadius: 1, boxRotX: 0, boxRotY: 0, boxRotZ: 0 },
        view: {"cam":["667951163547858345227662796364357847661243279945297544068252618814681339920384","-517624135418796263310132574026070401466220011117613386313111658529175032037376","-616403708235521093231712781108458524603977757626083392057256071077627630190592"],"yaw":2.652738625702473,"pitch":0.9092279035626659,"iters":175,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
];
