# Decisions only the owner can make

Seven decisions. Each lists the options, what each costs, and a recommendation. Package ids refer to `WORK-PACKAGES.md`; stages to `PLAN.md`.

## 1. What "deep zoom in GMT" means: a second renderer behind GMT's shell, or GMT's own renderer going deep

- **(a) Second renderer, Mandelbulb only.** Stages A to E. About 5 sessions to the first user-visible result, about 5 to 7 weeks of sessions for everything. The look changes at the hand-over; whole-number power, no twist, no Radiolaria, no Julia, no hybrids; no path tracer, volumetrics or materials.
- **(b) Native perturbation in GMT's marcher.** 2 to 4 months for the Mandelbulb alone (result-1), with one unproven problem: shadows, AO, reflections and path tracing from the hit point at 1e-30 and beyond. Then 1 to 3 weeks per smooth formula; fold formulas (Mandelbox, Kleinian, about 25 of them) are open-ended because nobody has measured how often fold crossings force a new reference in 3D.
- **(c) Both, in that order.** (a) now, and only the two cheap probes of (b): F0 (count which formulas the gallery actually uses, under an hour) and F1 (prove the per-formula contract on Mandelbar3D in the standalone page, about a week).

**Recommendation: (c).** (a) reuses nothing GMT-specific that (b) would throw away - the camera conversion, the scene field and the timeline track all carry over. Decide on (b) after F0 and F1, with numbers.

## 2. Is the standalone page still the master, and may agents edit it on `kernel-perf`

Stage K (four small handles) and stage X (the page becomes a module) both edit `mandelbulb_deepzoom/index.html`, which is on an unpushed branch you are actively working on, colour next.

- **(a) Page stays the master in its own repo; GMT vendors a copy.** What level 1 does today. Costs a sync step forever and two places to look.
- **(b) Module becomes the master, living in GMT under `engine-gmt/`; the standalone page imports it.** One master. Costs the 3 to 4 sessions of stage X, and the page's suites must then run against GMT's tree.
- **(c) (a) now, (b) once stage X is done.**

And separately, who edits the page: you in your own session, or an agent in a window you name.

**Recommendation: (c), with stage K done in your own `kernel-perf` session** (it is about one session and you know the file), and stage X scheduled for the first stopping point after the colour work, not in parallel with it. Stage A does not wait for either.

## 3. Where deep zoom lives in app-gmt

- **(a) A File menu item only** ("Open in Deep Zoom", next to Copy Share Link). Stage A. Cheapest; discoverable only by people who open the menu.
- **(b) Also a HUD line near the f32 limit** ("f32 ends near 1e-6 - Continue in deep mode"). Needs the live surface distance on the main thread (where that is read is unverified). Explains the mush at 1e-6, which nothing does today.
- **(c) A switch in the Formula panel**, shown only for an eligible Mandelbulb.

**Recommendation: (a) in stage A, (b) added in stage D.** Never automatic: the picture changes at the hand-over, so the user should choose the moment.

## 4. Is a visible change of look at the hand-over acceptable

Through stage D the deep picture uses the page's own shading pass (its copy of GMT's lighting model, shadows and AO from the depth buffer), and until K1 its field of view is 34.1 degrees against GMT's default 60.

- **(a) Accept and say so** in the toast and the HUD line. No cost.
- **(b) Hold stage A until K1 (field of view) lands.** About one extra session of yours before anything ships.
- **(c) Hold stage D until GMT's light rig drives the shading pass (D4).** Two more sessions before deep mode ships; materials and the path tracer still do not follow.

**Recommendation: (a) for stage A, with K1 as soon as you have the page open; (c) is not worth holding stage D for.** You judge the match once, from the single split image in A4.

## 5. Is the return trip worth building ("Open in GMT" from a deep view)

GMT cannot stand closer than about 1e-6, so a view at 1e-50 opens in GMT 1e-5 away on the same line of sight. It is useful for shallow views and for lighting or path-tracing the neighbourhood, and lossy by construction.

- **(a) Build it in stage A (A5, 1 to 2 sessions).**
- **(b) Move it later**, after deep mode in the viewport (D3 needs the same camera write and would bring it for free).

**Recommendation: (b).** Stage A's value is the outbound trip.

## 6. Touch the shipped Gradient Explorer hand-off now

The deep-zoom trip uses the same mechanism as the GX trip (`palette/core/explorerHandoff.ts`). The engine rule is one source of truth.

- **(a) Write the generic helper and move GX onto it now.** One source; costs a re-run of the GX hand-off smoke and a small risk to shipped behaviour.
- **(b) Write the generic helper, leave GX alone, move it at the next GX release.** Two implementations for a while, marked `@stale`.

**Recommendation: (b).** GX 2.0.0 shipped two weeks ago and this is not a reason to disturb it.

## 7. Scope and wording of what is offered

- **Formulas:** day one is "Mandelbulb, whole-number power 2 to 16, phase allowed". A scene with power 8.5 is refused, not rounded - or rounded with a notice. **Recommendation: refuse with the reason**, since rounding changes the picture.
- **Name:** "Deep Zoom" for the menu item, the tool and the mode. If native perturbation ever ships, the same name still fits. **Recommendation: one name everywhere.**
- **Licence:** the page is your own code and GMT is GPL-3.0; vendoring it into GMT publishes it under GPL-3.0 with the rest. Whether the page's repo carries its own licence file is unverified. **Recommendation: confirm you want the perturbation kernel public before stage X moves it into GMT's tree** (level 1 already ships a copy under `public/deep-zoom-core/` once that branch is pushed).
- **What's New:** nothing is announced until you have judged the A4 split image.
