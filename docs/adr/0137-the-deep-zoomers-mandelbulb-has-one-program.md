# ADR-0137: The deep zoomer's Mandelbulb has one program, the ray march

- **Status:** Accepted
- **Date:** 2026-10-11
- **Supersedes:** the second sentence of ADR-0135's decision 1 ("the module at its defaults still
  equals the frozen page") and its guard line `npm run smoke:deep-zoom-parity`. The rest of
  ADR-0135 stands.
- **Code:** `deep-zoom/renderer/core.js` (grep "deep program variants", `let rayAsk`,
  `api.setRayMarch`, `itersMax`, `THIS DEPTH RULE STAYS`), `deep-zoom/host/moduleHost.ts` (grep
  `DZ_RAY_FAILED_TEXT`), `deep-zoom/host/current.ts` (`DZ_RAY_FAILED_TEXT`),
  `deep-zoom/features/quality.ts` (`BOX_ONLY`), `deep-zoom/features/formula.ts`
  (`iterationCeiling`), `deep-zoom/presetFields.ts` (`dzRetiredNormals`).
  Guards: `npm run smoke:deep-zoom-direct`, `npm run smoke:deep-zoom` (stage 2),
  `npm run check:deep-zoom-module-host`, `npm run check:deep-zoom-param-map`,
  `npm run check:deep-zoom-ray-probe` (the iteration ceiling).
  Commits `e41890c4`, `f9f01e1a`, `63411aa8` on `deep-zoom-tool`. What each step measured:
  `plans/deep-zoom-shell/ROUTES.md`, section R7.
- **Numbering:** 0131 and 0132 are taken on the unmerged `audio-perf-overnight` branch.

## Context

The renderer was ported from a standalone page and, at its defaults, drew what that page draws; a
parity smoke held it there. Since 2026-10-09 the shell drew the bulb with the ray march instead. The
page's own march stayed as what drew for the 20 s the ray march's shader took to build and as the
fallback if that build failed, with a skip table (BLA) that only it used and a true-gradient (J)
variant that the ray march had replaced as the cure for the estimate's over-reading.

The owner, 2026-10-11, on a first proposal that removed the controls and kept the page's program:
"i was hoping for a more thorough removal of uneccesarry parts - and am wondering if the remaining
lean on the pages march was supposed to be minimized beyond this." Then: "Normals: Gradient - was
superseded by the raymarch too"; "If the ray shader fails to build on a machine, that machine is
likely gonna die trying to render the mandelbulb at high zoom - so I wouldnt want an alternative
based on that, rather an error"; a wait with no deep picture is acceptable "only if the pages march
is retired and we start in the ray shader immediately"; parity retired and the direct proof kept:
"yes".

## Decision

1. The Mandelbulb has one shader program, the ray march's. It is built from the moment the module
   is created and is what `ready` means. The page's program and the skip-table variants are never
   compiled; the skip table and the J variant are gone from the shader and from the CPU.
2. Until that program is built the plain single-precision picture is shown and nothing deep is
   drawn. If it cannot be built that is the shell's fatal boot failure, said in plain words with
   the compiler's own; no other march stands in.
3. The module no longer equals the frozen page, and the parity smoke is retired. The kernel is held
   by the direct proof (the GPU's values against the CPU's high-precision ones), which runs in the
   ray program: the careful march that finds its hits is that program's measuring mode (bit 8),
   and between two of them the proof holds the ray bits at 0 so its iteration counts are its own.
4. The page's distance estimate and its step rule stay in the shader: the hit test, the bisection,
   hit refine, the probes and the normal taps read the estimate (as the hit test it is wrong on
   1.0 % of rays where the ray estimate is wrong on 4.4 %), and the Mandelbox and the measuring
   mode step by the rule.
5. In the shell there is no Ray march switch, no True-gradient march, no Normals: Gradient and no
   BLA setting, and Step size is the Mandelbox's row. A saved scene that carries any of them loads
   and ignores them (Normals: Gradient comes back as 4-tap).
6. The bulb's iteration count is held at the ray march's own ceiling (400), not the page's 160: a
   route's keyed count arrives whole. The page's depth rule for the count (32 + 1.35 a decade)
   stays beside the ray march's margin rule: measured, the margin rule does not hold alone at
   power 8.
7. The Mandelbox keeps its own program and the page's step rule (ADR-0135, decision 3) until a math
   session says whether it can take the ray march's step (`plans/deep-zoom-shell/NEXT.md`,
   session 8).

## Consequences

- `core.js` went from 5,719 to 4,973 lines. The kept programs compile the text they compiled
  before, less four unused uniform declarations; 41 pictures of the ray march, the Mandelbox and
  the shell came out as before the retirement (40 to the byte, 1 within the measured floor).
- The direct proof's 79 output lines are the same as in the page's program but for the line that
  names the path.
- First wait, production build, cold shader cache, nine runs: the plain picture at 0.8 to 0.9 s,
  ready and the first deep picture at 21 to 26 s, the page alive throughout with "ray march:
  building" on screen. On the dev server (three runs each): the first deep picture came at 13.1 s
  (the page's march) with the ray march's at 33.2 s; it comes at 20.3 s now and is the ray
  march's.
- The readiness limit of 120 s now bounds the ray shader's build.
- The depth rule, measured on 13 views with the count started at 4: the margin rule alone settles
  no lower at power 2 and power 4 (95 / 95, 86 / 86, 160 / 164) and far lower at power 8, where
  the picture moves (the start view: 32 with both rules, 13 alone; 9,143 of 230,400 pixels). Why
  power 8 needs more than the margin gives is not known.
- What the parity smoke also held, and nothing holds now: the module's create / dispose lifecycle,
  its own key listener under a host-owned input, and "roll 0 is the picture from before the roll".
  Each is an `@assumption` in `deep-zoom/renderer/index.ts`.
- The seven host path members and the module's recorder, spline, play and ZIP code are gone; routes
  on the timeline replaced them (ADR-0136).
- Not changed by this: a single render can still come out as another throw of its grain and the
  next be the usual picture again (the retest of 2026-10-11: the usual picture in 374 of 380
  renders of one frame, the odd one most often the second render after ready). Its cause is not
  known.
