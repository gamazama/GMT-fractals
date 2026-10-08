/**
 * deep-zoom/data/starters.ts - the starter dives: a start view plus a straight-ahead dive target.
 *
 * DATA, hand-editable. Ported 2026-10-08 from last week's prototype (deep-zoom-prototype/ui/starters.ts,
 * which goes in stage 7). The start views are frames copied verbatim from the frozen page's
 * sample flight (mandelbulb_deepzoom/sample-flight.json, a recorded dive) at 0 %, 10 %, 50 % and
 * 95 % of its 1291 frames. Camera values are 256-bit decimal STRINGS: never parse them.
 *
 * @assumption `startDepth` is approximate. The flight file does not store a frame's surface
 *   distance; the figures are estimates by position in the flight. Measured in this shell on
 *   2026-10-08 for two of them: "Past f64" 1.96e-3 (f32), "Grain of sand" 1.14e-17 (deep).
 * @assumption each start view's forward ray reaches the surface. A dive flies straight ahead; from
 *   a view that grazes the surface it closes slowly and ends on the host's time limit ("Stopped
 *   at ..."). To replace a start view: fly to a good one, copy its location, paste its `view` here.
 */
import type { DzView } from '../host/DeepZoomHost';

export interface Starter {
    name: string;
    blurb: string;
    /** The dive target: surface distance the card flies to. Never below 1e-76. */
    depth: number;
    /** Where the dive starts. */
    view: DzView;
    /** About how deep the start view already is (see the assumption above). */
    startDepth: number;
}

export const STARTERS: Starter[] = [
    {
        name: "Whole bulb · 1e-3",
        blurb: "The start of the sample flight, outside the bulb. Works before the deep shader is ready.",
        depth: 1e-3,
        startDepth: 2e0,
        view: {"cam":["-12004329469645485047937427706023426690615009787959257048000668121821698064384","-3048675784628119469751797018997286768009585810962788698672706548352598147072","374318900487514760606603683363058317676782359194611622522743113598207757647872"],"yaw":-1.5374963267948958,"pitch":-1.2793585635328952e-17,"iters":14,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Surface · 1e-6",
        blurb: "Just past the f32 hand-over. Try this first.",
        depth: 1e-6,
        startDepth: 2e0,
        view: {"cam":["-12004329469645485047937427706023426690615009787959257048000668121821698064384","-3048675784628119469751797018997286768009585810962788698672706548352598147072","374318900487514760606603683363058317676782359194611622522743113598207757647872"],"yaw":-1.5374963267948958,"pitch":-1.2793585635328952e-17,"iters":14,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Past f64 · 1e-15",
        blurb: "Below about 1e-13, where f64 arithmetic runs out.",
        depth: 1e-15,
        startDepth: 6e-7,
        view: {"cam":["-19015127266064623846976486371933019433987285284170795533706773975252577298870","2083560063143305894752427218237610794780956107589798727189778559529896049477","106419871808915231907973865853650553289579036255121825003199800601437024803533"],"yaw":-1.8317210443240646,"pitch":-0.11950601086782939,"iters":14,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Grain of sand · 1e-30",
        blurb: "A good first video.",
        depth: 1e-30,
        startDepth: 4e-23,
        view: {"cam":["-19106688270107545123610310944093228319268234083931764161217485625786859879978","2056390632353041980388441420253193046898375110266709396020905008395931668174","106035815535807686550824900054021630250672589610944549407697460964969796977517"],"yaw":-1.0130614516955045,"pitch":-0.412169332221097,"iters":56,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Certified edge · 1e-50",
        blurb: "Checked against an independent referee to here.",
        depth: 1e-50,
        startDepth: 4e-35,
        view: {"cam":["-19106688270107543539847685334122574908462788363099593224465751636502417073449","2056390632353040684939008940472695153310485784884857827891628620567985409003","106035815535807683251647607458976088237621289450007267173621379188843051639489"],"yaw":-0.9470676032630783,"pitch":-0.6826967659566994,"iters":79,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
    {
        name: "Near the floor · 1e-75",
        blurb: "Two decades above the end of the 256-bit reference. A long dive (about 40 decades); it may stop short, then dive again.",
        depth: 1e-75,
        startDepth: 4e-35,
        view: {"cam":["-19106688270107543539847685334122574908462788363099593224465751636502417073449","2056390632353040684939008940472695153310485784884857827891628620567985409003","106035815535807683251647607458976088237621289450007267173621379188843051639489"],"yaw":-0.9470676032630783,"pitch":-0.6826967659566994,"iters":79,"power":8,"phase":[0,0],"light":0,"falloff":4,"color":0,"cscale":1,"surf":1},
    },
];
