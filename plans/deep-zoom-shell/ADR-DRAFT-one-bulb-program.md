# DRAFT, not filed: ADR-0137 - The deep zoomer's Mandelbulb has one program, the ray march

Drafted 2026-10-11 while the owner was away. An ADR write raises an approval prompt, so this waits
for him: when he says yes it is filed as `docs/adr/0137-...md` (take the next free number at the
time: 0131 and 0132 are taken on the unmerged `audio-perf-overnight` branch), this file is deleted,
and ADR-0135 gets the update block at the foot of this page. The builder of R7b-1 wrote the first
text; the orchestrator edited it.

---

# ADR-0137: The deep zoomer's Mandelbulb has one program, the ray march

- Status: Accepted
- Date: 2026-10-11
- Supersedes: the second sentence of ADR-0135's decision 1 ("the module at its defaults still equals
  the frozen page") and its guard line `npm run smoke:deep-zoom-parity`. The rest of ADR-0135 stands.
- Code: `deep-zoom/renderer/core.js` (grep "deep program variants", `let rayAsk`, `api.setRayMarch`),
  `deep-zoom/host/moduleHost.ts` (grep `failRay`), `deep-zoom/host/current.ts`
  (`DZ_RAY_FAILED_TEXT`), `deep-zoom/features/quality.ts` (`BOX_ONLY`).
- Guards: `npm run smoke:deep-zoom-direct`, `npm run smoke:deep-zoom` (stage 2),
  `npm run check:deep-zoom-module-host`, `npm run check:deep-zoom-param-map`.

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
   ray program: the careful march that finds its hits is that program's measuring mode (bit 8).
4. The page's distance estimate and its step rule stay in the shader: the hit test, the bisection,
   hit refine, the probes and the normal taps read the estimate (as the hit test it is wrong on
   1.0 % of rays where the ray estimate is wrong on 4.4 %), and the Mandelbox and the measuring
   mode step by the rule.
5. In the shell there is no Ray march switch, no True-gradient march, no Normals: Gradient and no
   BLA setting, and Step size is the Mandelbox's row. A saved scene that carries any of them loads
   and ignores them (Normals: Gradient comes back as 4-tap).
6. The Mandelbox keeps its own program and the page's step rule (ADR-0135, decision 3) until a math
   session says whether it can take the ray march's step (`plans/deep-zoom-shell/NEXT.md`, session 8).

## Consequences

- `core.js` went from 5,719 to 4,966 lines over the two steps (`e41890c4`, `f9f01e1a`). The kept
  programs compile the text they compiled before, less four unused uniform declarations.
- The direct proof's 79 output lines are the same as in the page's program but for the line that
  names the path.
- First wait, dev server, cold shader cache, three runs each: the first deep picture came at 13.1 s
  (the page's march) with the ray march's at 33.2 s; it now comes at 20.3 s and is the ray march's.
  In the production build (nine cold runs): the plain picture at 0.8 to 0.9 s, ready and the first
  deep picture at 21 to 26 s, the page alive throughout with "ray march: building" on screen.
- The bulb's iteration count is held at the ray march's ceiling (400), not the page's 160
  (`63411aa8`): a route's keyed count arrives whole.
- The page's depth rule for the iteration count stays beside the ray march's margin rule. Measured
  on 13 views: the margin rule alone settles no lower at power 2 and power 4, and far lower at
  power 8, where the picture moves (the start view: 32 against 13).
- The readiness limit of 120 s now bounds the ray shader's build.
- What the parity smoke also held, and nothing holds now: the module's create / dispose lifecycle,
  its own key listener under a host-owned input, and "roll 0 is the picture from before the roll".
  Each is an `@assumption` in `deep-zoom/renderer/index.ts`.
- The seven host path members and the module's recorder, spline, play and ZIP code are gone; routes
  on the timeline replaced them (ADR-0136).

---

## The update block ADR-0135 gets when this is filed

> **Update 2026-10-11 (the page's program retired for the Mandelbulb; decisions 2 to 4 unchanged):**
> decision 1's "the module at its defaults still equals the frozen page" and its guard
> `npm run smoke:deep-zoom-parity` are superseded by ADR-0137: the Mandelbulb is drawn by the ray
> march's program alone and the parity smoke is gone. In decision 3, "the page's march" is now the
> page's step rule inside the Mandelbox's own program, and "the skip table" and "the Jacobian
> variant" it names no longer exist.

## Other lines that now cite something gone (each raises an approval prompt)

- `.claude/rules/sibling-apps.md`, grep `smoke:deep-zoom-parity`: "After ANY edit of
  `deep-zoom/renderer/core.js`: `npm run smoke:deep-zoom-parity` and `npm run smoke:deep-zoom-direct`."
  The parity half is gone (`npm run check:rule-guards` reports it). The same rule should say the
  route check carries the "look: ..." lines, and that a route renders to a folder of frames or to a
  video through `FrameSink`.
- `docs/adr/0134-the-deep-zoomer-flies-by-rays.md`, grep `(BLA)`: "or skipping iterations in the CPU
  probe the way the GPU march does (BLA)": the GPU march no longer has it.
- `docs/adr/0136-keys-carry-app-data.md`: an update block for the free look's three tracks (released
  on record while the route's track is held; a pass begins at the hand's first turn; a keyframe
  under a recorded look stores route = screen x inverse look).
- Plan pages that cite parity as a standing guard: `BLUEPRINT.md` (grep `parity`), `BUILD-PLAN.md`,
  `DECISIONS.md` K2.
