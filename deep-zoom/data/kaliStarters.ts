/**
 * deep-zoom/data/kaliStarters.ts - KaliBox's starter places: a card each on the Locations tab.
 *
 * DATA, hand-editable. A card is a JUMP (its `depth` equals its `startDepth`: no dive), and its
 * `formula` is what switches the renderer to KaliBox with that card's numbers - a view alone does
 * not say which formula it is a view of (deep-zoom/locations.ts, PITFALLS). A card's formula holds
 * KaliBox's numbers and not the Mandelbox's, so pressing one leaves the Mandelbox's rows as they are.
 *
 * WHERE THE PLACES COME FROM. Every camera here is one of the CPU study's own
 * (plans/deep-zoom-shell/BURNING-KALIBOX.md, section 1; its pictures are
 * debug/scratch/formula-next/bk-kali-*.png): the study's outside camera and the stops of its one
 * straight dive, walked by exact orbits. They were drawn again on the GPU on 2026-10-12 and looked
 * at (debug/scratch/kalibox/still-*.png, git-ignored), each beside a CPU still of the same view.
 *   Scale 1.8, the point added (the first four)   the set that opens first: a solid that holds its
 *       shapes. It is an octant without end, so there is no whole to show: "Tip" is where the study
 *       stood, 8.5 from the middle of the shapes, and is the view `formulaHome` in
 *       deep-zoom/locations.ts gives a switch to KaliBox.
 *   GMT's preset (the last two)   Scale 2.04348 in JULIA MODE with GMT's constant, which the view
 *       carries as three strings (`julia`). The tower is the study's outside camera moved 1.6 times
 *       as far out on its own line, so the whole of it is in the picture.
 *
 * THE DETAIL NOTE ON THE PRESET'S CARDS (the owner's call 1, 2026-10-12: ship it, the card says so,
 * no rule keyed to the formula). GMT's preset has no inside: every orbit escapes, and what is drawn
 * is the estimate's level one pixel from a dust of dimension about 2.5. The study found a city of
 * detail at every depth at Detail 1 and grain at Detail 16 (one sample a pixel, 320 x 200). On the
 * GPU at Detail 16, eight samples, 960 x 600, the city card's view is not grain but another, far
 * finer city (debug/scratch/kalibox/still-julia-1-1e-2-detail16.png): either way the shapes of
 * Detail 1 are Detail 1's alone. Nothing here sets or caps Detail: a card never changes quality.
 *
 * Saved iteration counts are what the renderer's own margin rule settles at for each view.
 *
 * NOT IN `STARTERS` ON PURPOSE, as the Mandelbox's are not (data/boxStarters.ts says why).
 *
 * Camera values and the Julia constant are 256-bit decimal STRINGS: never parse them.
 *
 * @assumption each card draws what its name says in this shell. All six were looked at once,
 *   2026-10-12, in the dev harness (the stills above); no check opens them.
 */
import type { Starter } from './starters';
import { FORMULA_KALI } from '../features/formula';

export const KALI_STARTERS: Starter[] = [
    {
        name: "Tip · scale 1.8",
        blurb: "KaliBox at Scale 1.8, from outside: the tip of a solid that has no end. Where a switch to KaliBox lands.",
        depth: 4.3,
        startDepth: 4.3,
        formula: { kind: FORMULA_KALI, kaliScale: 1.8, kaliMinRad2: 0.3492, kaliTransX: 0.0365, kaliTransY: -1.9183, kaliTransZ: 0.0365, kaliRot: 0 },
        view: {"cam":["328860990939891431163030601553936272413645429662822540747599066723994868645888","292219343320518629000378595166607123189047948177245427128474532459778418933760","363715231403247793234544697925942967970961177799869900591960682462735763505152"],"yaw":-2.3249546567620767,"pitch":-0.4342807733694343,"iters":41,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Holes · 9.9e-3",
        blurb: "Scale 1.8, two decades in: sheets with round holes.",
        depth: 0.0099,
        startDepth: 0.0099,
        formula: { kind: FORMULA_KALI, kaliScale: 1.8, kaliMinRad2: 0.3492, kaliTransX: 0.0365, kaliTransY: -1.9183, kaliTransZ: 0.0365, kaliRot: 0 },
        view: {"cam":["-70939908614332461657832733694683741836890101410990043242417599129521640964096","14829850650358207407508349703508818797641791907123815116823099093048272879616","-75899043941028600104225696250407316633317120959381333861419593212025932611584"],"yaw":-2.308800110686097,"pitch":-0.43674493555299115,"iters":52,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Plates · 9.5e-9",
        blurb: "Scale 1.8, eight decades in: perforated plates, stacked.",
        depth: 9.5e-09,
        startDepth: 9.5e-09,
        formula: { kind: FORMULA_KALI, kaliScale: 1.8, kaliMinRad2: 0.3492, kaliTransX: 0.0365, kaliTransY: -1.9183, kaliTransZ: 0.0365, kaliRot: 0 },
        view: {"cam":["-74747347884089749871338055862036880681370872168526785606542143121252021174272","12188176635647346625444326135348116021089351231447116291771610163906168750080","-80085639462344273440443557860412073757755756302569161010894181649771999002624"],"yaw":-2.308800110686097,"pitch":-0.43674493555299115,"iters":71,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Sheets · 9.6e-31",
        blurb: "Scale 1.8, thirty decades in: the same sheets and holes, new at this depth.",
        depth: 9.6e-31,
        startDepth: 9.6e-31,
        formula: { kind: FORMULA_KALI, kaliScale: 1.8, kaliMinRad2: 0.3492, kaliTransX: 0.0365, kaliTransY: -1.9183, kaliTransZ: 0.0365, kaliRot: 0 },
        view: {"cam":["-74747350392315720865738580605046445502908764133038979080088539304219289583616","12188174895392308750288540400627247724961143899150722489557601653869911212032","-80085642220346928931837117080060035986362046417089747631529768687801825492992"],"yaw":-2.308800110686097,"pitch":-0.43674493555299115,"iters":136,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "GMT's preset · Detail 1",
        blurb: "GMT's own KaliBox, a Julia set, from outside: a tower. It has no solid inside - what is drawn is a dust one pixel fat - so it holds these shapes at Detail 1 only. Raise Detail and the same view thins into finer and finer structure.",
        depth: 9.0,
        startDepth: 9.0,
        formula: { kind: FORMULA_KALI, kaliScale: 2.04348, kaliMinRad2: 0.3492, kaliTransX: 0.0365, kaliTransY: -1.9183, kaliTransZ: 0.0365, kaliRot: 0, juliaMode: true },
        view: {"cam":["1776023085924551319056590372971557363607621288292974707839973752960890760593408","474935884106935902348770315860129641367055787637077793483877080024929190019072","1125990359225215145141775344030388118830667574845024207647603454310259264533299"],"yaw":-2.5764432135830337,"pitch":-0.22281349262895303,"julia":["-77476486908688269607782846778695012400687082290547348739704404086014905155584","-150853933858375534543589835171760781994081047478212537131534536826448628416512","-53003828848381487323855235229397735838293022472518496013430801456536079040512"],"iters":34,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "GMT's city · 4.1e-3",
        blurb: "GMT's own KaliBox, inside the tower: a city. Like the tower it holds these shapes at Detail 1 only: at a higher Detail the same view is another, finer one.",
        depth: 0.0041,
        startDepth: 0.0041,
        formula: { kind: FORMULA_KALI, kaliScale: 2.04348, kaliMinRad2: 0.3492, kaliTransX: 0.0365, kaliTransY: -1.9183, kaliTransZ: 0.0365, kaliRot: 0, juliaMode: true },
        view: {"cam":["66902464399730565106994682795534832441128744757075888623155925398821231656960","-520592622445459064309229749526229322985747434489490285831927069264210231820288","37253956912894123720493470987961942495221717012164198991984520475130506248192"],"yaw":-2.5730290475397117,"pitch":-0.5836214169125001,"julia":["-77476486908688269607782846778695012400687082290547348739704404086014905155584","-150853933858375534543589835171760781994081047478212537131534536826448628416512","-53003828848381487323855235229397735838293022472518496013430801456536079040512"],"iters":47,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
];
