# CREATE → SHARE Loop — Experiential UX Polish Review

> **Type:** Research / report only. No fixes applied, no live exports or gallery submissions fired.
> **Date:** 2026-05-31 · **Codebase:** `dev/` (the one codebase, near v1) · **Method:** code trace of the
> full loop, one agent per stage, key claims verified directly against source.
> **Scope boundary:** the fractal *render pixels* need a GPU + a human eye — the owner judges those
> ([[feedback_visual_smokes]]). This pass reviews the **wiring, flows, UI states, and feedback** (all
> DOM/React, observable) plus UX heuristics. The forgotten-work sweep hunts dead/half-done UI
> separately — this is the *experiential* pass: "does it feel good, fast, and rewarding end-to-end?"

> **Implementation status (2026-05-31, owner-triaged).** Retracted/resolved by owner: H3, H6, P6.
> Already-present (no work needed): P2 (image-seq FSA notice already rendered), P9 (interlace tooltip
> already plain-language).
> **DONE & typecheck-clean:** missing static nav hint restored (stable→dev port,
> [HudOverlay.tsx](../engine-gmt/navigation/HudOverlay.tsx)); timeline "Animate" label
> ([TimelineHost.tsx](../components/TimelineHost.tsx)); **Batch 1** — generic `showToast` foundation
> ([toastStore.ts](../engine/store/toastStore.ts) + [ToastHost.tsx](../engine/components/ToastHost.tsx)),
> wired into PNG/GMF/JPG save with **H5**'s remix message + success/error states
> ([SceneIO.tsx](../engine/plugins/SceneIO.tsx)); **PNG drag-drop loading**
> ([SceneFileDropZone.tsx](../engine/components/SceneFileDropZone.tsx)) — drop a .png/.gmf/.json anywhere
> to load it, which makes H5's "drag the PNG back in" promise real (the only load paths were file pickers
> before); **P5** Lightbox backdrop-click guard
> ([Lightbox.tsx](../engine-gmt/gallery/Lightbox.tsx)); **P8** loading-picker discoverability tooltip; **P1** export completion toasts (video + image-seq) +
> disk→RAM fallback notice ([exportRunner.ts](../engine-gmt/components/timeline/RenderPopup/exportRunner.ts));
> **P3** bucket result modal no longer re-nags per frame — keeps the first, tallies extras, quiets after
> dismiss ([BucketRenderResultModal.tsx](../engine-gmt/gallery/BucketRenderResultModal.tsx)) — note: multi-
> frame bucket render isn't supported yet (owner: "no path to render 4K+ on most GPUs" is a real roadmap
> gap), so this is forward-compat; **H4** work-loss safety net — **camera-excluded** `isSceneDirty()`
> (orbiting isn't "dirty"), always-on beforeunload guard, **opt-in** autosave with configurable interval
> ([autosaveStore.ts](../engine/store/autosaveStore.ts) + [UnsavedWorkGuard.tsx](../engine/components/UnsavedWorkGuard.tsx)),
> boot-time recovery snapshot + notification that protects the prior session from live autosave bursts,
> File ▸ "Restore Last Session" (amber-highlighted when a recovery exists), and an unsaved `*` marker
> ([Logo.tsx](../engine-gmt/topbar/Logo.tsx)).
> **DONE (round 2):** H1 — first-run hint bar ([FirstRunHint.tsx](../engine-gmt/components/FirstRunHint.tsx),
> desktop, dismissible, persists); H7 — "Submit to Gallery" now ALWAYS visible (was hidden until
> signed-in) routing unauthed users to the modal's sign-in CTA ([installGallery.tsx](../engine-gmt/gallery/installGallery.tsx)),
> + moderation ETA copy and a rejected-item hint ([SubmitGalleryModal](../engine-gmt/gallery/SubmitGalleryModal.tsx),
> [MySubmissionsOverlay](../engine-gmt/gallery/MySubmissionsOverlay.tsx)); H8 — "▶ Open & Remix" rename +
> gallery-link vs editor-share-link clarification ([Lightbox.tsx](../engine-gmt/gallery/Lightbox.tsx));
> P7 — responsive NewScene / Submit modal widths + the Submit form stacks on narrow screens, and the
> mobile side-menu now dismisses on outside-tap ([Menu.tsx](../engine/plugins/Menu.tsx)).
> **REMAINING:** only H2's animation tutorials (owner-written). The review queue is otherwise complete. **Toolchain (FIXED & stable):** dev's node_modules was under-installed (missing `.bin` + ~113
> deps incl. `@codemirror/*`) → `npm install` reconciled it; `npm run typecheck` passes clean (0 errors)
> on local 5.9.3; global tsc bumped to 6.0.3.

This is GMT's product core **and** its growth engine. Fractal art is inherently shareable
(r/fractals ≈ 5× home reach, **video ≈ 8×** — see [[project_reddit_growth_channels]]), so the
create→share path is the highest-leverage surface in the app. The render is already beautiful;
this review is about everything *around* the render.

---

## Corrections caught during verification (read first)

Two stage agents made load-bearing claims that I verified against source and **corrected** — flagged
here so they don't propagate into planning:

1. **"Save / Load Scene (.gmf) is missing from the UI" — FALSE.** The File menu registers **Load**,
   **Save Scene (GMF)**, **Save Scene (PNG)**, **Save Image (JPG)** plus a standalone snapshot button and
   `Alt+S` — all in the engine-core **SceneIO** plugin, which GMT configures with `saveGMFScene` as the
   serializer and `fileExtension:'gmf'`. See [SceneIO.tsx:131-179](../engine/plugins/SceneIO.tsx#L131-L179).
   The agent only grepped `engine-gmt/` and missed the engine-core path (the classic dev patched-slice
   fallthrough — [[feedback_dev_patched_slice_fallthrough]]). The *real* SAVE finding (no autosave / no
   unsaved-changes guard) survives and is **H4** below.

2. **Gallery submission is AUTH-gated, not admin-token-gated.** The memory + README say "Submit to
   Gallery visible only when `localStorage.gmt_submit_token` is set." The shipped code gates it on
   `useAuthStore.getState().status === 'authed'` — i.e. **any signed-in user can submit** (Phase 2B
   landed). See [installGallery.tsx:78-90](../engine-gmt/gallery/installGallery.tsx#L78-L90). The growth
   blocker is therefore much smaller than the stale docs imply — the gate is *sign-in*, not *be-an-admin*.
   (Memory `project_gallery_phase2.md` and `engine-gmt/gallery/README.md` should be refreshed.)

---

## How to read this

Findings are grouped **HIGH-LEVERAGE** (magic-moment / growth-critical / trust) vs **PAPERCUTS**.
Each finding: **STAGE · WHAT · WHERE · IMPACT ON THE LOOP · SEVERITY · SUGGESTED FIX** (described, not
applied). A **TOP 5** closes the report. A strengths list and a state-coverage matrix follow.

Loop stages: **1** First-run · **2** Explore/Create · **3** Animate · **4** Preview/Converge ·
**5** Capture/Export · **6** Share/Publish · **7** Save/Persist.

---

# HIGH-LEVERAGE

### H1 · The first 10 seconds give the *render* but no *map* — the loop is undiscoverable
- **STAGE:** 1 (First-run)
- **WHAT:** On cold open the default Mandelbulb renders immediately (great) — but there is **no welcome,
  no "what is this / what can I do," no loop map.** A capable 4-lesson tutorial system exists
  ([app-gmt/tutorial/lessons.ts](../app-gmt/tutorial/lessons.ts)) but is **never offered on first run**
  (`tutorialActive` defaults false; only reachable via Help menu). Topbar actions are icon-only; the
  right-dock tabs aren't explained. A newcomer lands mid-tool with no orientation.
- **WHERE:** [app-gmt/main.tsx](../app-gmt/main.tsx) boot (no first-run gate) · [AppGmt.tsx](../app-gmt/AppGmt.tsx)
  (no welcome overlay) · tutorial registered but not auto-started.
- **IMPACT:** The emotional arc peaks at T≈5s ("it's real-time 3D!") then **flattens** — the user has the
  wow but no next step, so they bounce or sandbox aimlessly instead of entering create→share. This is the
  single biggest discoverability gap; everything downstream depends on it.
- **SEVERITY:** High
- **SUGGESTED FIX:** A lightweight first-visit overlay (gate on `tutorialCompleted.length===0 && !localStorage.hasStarted`)
  that (a) names the app in one line, (b) shows the loop as a 5-step map (Formula → Tweak → Light/Colour →
  Animate → Snapshot/Share), (c) offers three doors: **Start Tutorial · Explore Freely · Browse Gallery**.
  Respect returning/power users (dismiss + never-again). The asset already exists; it just needs a door.

### H2 · Animation — the differentiator and the highest-reach share format — is expert-gated
- **STAGE:** 3 (Animate)
- **WHAT:** Making a short animation requires clearing several invisible hurdles in a row:
  the **timeline is hidden** behind an unlabeled bottom-left icon / `T` hotkey
  ([TimelineHost.tsx:84-95](../components/TimelineHost.tsx#L84-L95)); opening it shows an **empty dope sheet
  with no guidance** ([Timeline.tsx](../components/Timeline.tsx), empty `tracks:{}` state); auto-keyframing
  needs **Record mode toggled first** or slider edits silently do nothing
  ([useTrackAnimation.ts](../hooks/useTrackAnimation.ts), `autoKeyOnChange` gated on `isRecording`); and there
  is **no one-click "orbit camera" / auto-animate preset** — the signature spinning-fractal clip must be
  hand-keyframed.
- **WHERE:** see files above + [components/timeline/TimelineToolbar.tsx](../components/timeline/TimelineToolbar.tsx)
  (Record + Key Cam buttons).
- **IMPACT:** Video averages **~8× the reach of stills** on r/fractals ([[project_reddit_growth_channels]]),
  so the animation path *is* the growth engine — yet a newcomer can't reach a looping clip they'd be proud
  of in their first session. The Key Cam button (one-click camera pose → keyframe) is genuinely good but
  buried. This is high-leverage for growth specifically.
- **SEVERITY:** High
- **SUGGESTED FIX:** (a) Label the timeline toggle ("Animate — T"); (b) render an empty-state card in the
  dope sheet ("No animation yet → ① Record ② move a slider ③ Space to play"); (c) when the timeline opens
  with zero tracks, default Record on (or make a track's keyframes always capture, treating Record as a
  safety latch); (d) add a **Quick Animations** menu — "360° Camera Orbit," "Zoom to Seed," "Pulse Power" —
  that generates a pre-keyed, editable sequence. (c)+(d) are the fastest path to the differentiator's wow.

### H3 · ~~Convergence / adaptive-resolution are silent~~ — RETRACTED (owner review 2026-05-31)
> **Owner correction:** reviewed running on real hardware — the render / adaptive-resolution feedback
> reads correctly by eye ([[feedback_visual_smokes]]). This was a code-trace over-call (agents inferred
> "silent" from where the indicators are wired, not from watching it run). **Dropped.** Original finding
> preserved below for context only — do **not** action it.
- **STAGE:** 4 (Preview/Converge)
- **WHAT:** Three render states; only one is visible. **Shader compile** has a polished indicator
  ([CompilingIndicator.tsx](../components/CompilingIndicator.tsx)). But **convergence/accumulation is
  silent** in the main viewport — sample count + convergence % render *only* inside the crop-region tool
  ([RegionOverlay.tsx](../engine-gmt/components/viewport/RegionOverlay.tsx)), so a normal user has no "still
  accumulating… / converged" signal. And the just-shipped **adaptive-resolution downscale during
  interaction** (drag → image softens → sharpens on release; ADR-0061/0062) has **no UI** — it just looks
  blurry-then-sharp with no explanation.
- **WHERE:** convergence display gated to region tool (above) · adaptive engagement read by
  [UniformManager](../engine-gmt/engine/managers/UniformManager.ts) but no badge/toast consumes
  `qualityFraction` / `needsAdaptive`.
- **IMPACT:** The signature **"watch it resolve into something gorgeous"** moment happens *invisibly*, and
  the deliberate blur-on-drag reads as a bug ("why did quality drop?") rather than a feature. Users can't
  answer the most basic question — *is this image finished?* — which undercuts confidence right before they
  capture/share.
- **SEVERITY:** High
- **SUGGESTED FIX:** Reuse the CompilingIndicator pattern for a **convergence phase**: a quiet
  "Converging…" → "Sharp" indicator (or a sample-count / progress ring) in the viewport HUD that fades when
  converged; and a subtle "Optimising while you move" hint (or a quality pip) while adaptive is engaged.
  The engine signals already exist — this is pure chrome.

### H4 · Work-loss trap: no autosave, no "unsaved changes" guard, dirty-state not surfaced
- **STAGE:** 7 (Save/Persist)
- **WHAT:** Save/Load *is* wired (correction above), but there is **no autosave, no `beforeunload`
  guard, and no session restore** anywhere in the tree (grep for `beforeunload|autosave|sessionStorage`
  finds only ADR/plan references to it as *future* work). The store tracks a dirty hash
  (`lastSavedHash`, [types/store.ts:84](../engine-gmt/types/store.ts#L84)) but **no UI reads it** — no title
  asterisk, no "unsaved" pip. A user who tunes a scene for 20 minutes and closes the tab (or hits a WebGL
  crash) loses everything, silently.
- **WHERE:** absence of `beforeunload`/autosave (whole tree) · dirty hash exists but unsurfaced.
- **IMPACT:** This is the trust killer of the loop. The create stage is where users invest the most effort;
  losing it with zero warning is the worst possible moment to feel betrayed, and it happens before they ever
  reach share.
- **SEVERITY:** High
- **SUGGESTED FIX:** (a) `beforeunload` guard when the dirty hash differs from `lastSavedHash`;
  (b) periodic autosave of the preset to localStorage + a "Restore previous session?" prompt on boot;
  (c) surface dirty state (title `*` or a topbar pip reading `lastSavedHash`). (a)+(c) are small and
  remove most of the risk. Note ADR-0061 already lists autosave as an intended InteractionSession consumer.

### H5 · The free growth multiplier nobody is told about: PNG snapshots are re-openable seeds
- **STAGE:** 5 (Capture) + 6 (Share) + 7 (Persist)
- **WHAT:** Every PNG snapshot embeds the full scene as GMF in an iTXt chunk — **drag it back in and the
  exact scene restores** ([SceneIO.tsx loadSceneFile](../engine/plugins/SceneIO.tsx#L220-L226), universal
  loader handles PNG-iTXt). This is the remix loop's foundation. But: the snapshot button gives **zero
  capture feedback** (no flash/toast — you only see the browser download bar), and **nothing ever tells the
  user the PNG is re-openable.** The property is documented in the README, invisible in the product.
- **WHERE:** snapshot path [SceneIO.tsx:166-179](../engine/plugins/SceneIO.tsx#L166-L179) (no toast) ·
  re-open capability [loadSceneFile](../engine/plugins/SceneIO.tsx#L220-L226).
- **IMPACT:** A shared fractal PNG that silently carries its own scene is *the* organic growth mechanic —
  every image posted to r/fractals/Discord is a re-openable, remixable seed. Unmarketed, it's a superpower
  no one uses. And the missing capture confirmation makes the most-used export action feel like it did
  nothing.
- **SEVERITY:** High (growth) / Med (the missing-feedback half)
- **SUGGESTED FIX:** On snapshot success, a 2s toast: **"Snapshot saved — drag it back into GMT to reopen
  this scene."** Surface the same line in Help and near the gallery/share UI. Consider a viewport drag-drop
  hint so users discover the reopen path. Tiny change, outsized growth payoff.

### H6 · ~~Lighting hidden behind an invisible toggle~~ — RETRACTED (owner review 2026-05-31)
> **Owner correction:** lighting **already has an easy, simple interface** that is NOT behind Advanced
> Mode — it mirrors the advanced Light panel. The `advancedMode`-gated Light tab is the *power* surface,
> not the only one. The agent saw only the gated panel. **Dropped** — no fix needed.
- **STAGE:** 2 (Explore/Create)
- **WHAT:** The entire **Light panel is `showIf:'advancedMode'`** ([panels.ts:247](../engine-gmt/panels.ts#L247)),
  and `advancedMode` **defaults false** ([uiSlice.ts:176](../store/slices/uiSlice.ts#L176)), toggled only by
  the unlabeled backtick (`` ` ``) key. So a newcomer wanting to "make it more dramatic" via lighting
  **can't find lights at all** — and when they do hit backtick, ~5 panels appear at once (a jarring jump).
  (Colour/Gradient are *not* advanced-gated, so that part of beautify is reachable — the gap is
  specifically lighting + camera-nav controls.)
- **WHERE:** [panels.ts:184-247](../engine-gmt/panels.ts#L184-L247) · [uiSlice.ts:176,277](../store/slices/uiSlice.ts#L176).
- **IMPACT:** Lighting is one of the highest payoff-per-second edits for a fractal; gating it behind a
  hidden key removes the most rewarding early beautify move and makes the simple/advanced split feel like a
  cliff rather than a ramp.
- **SEVERITY:** High
- **SUGGESTED FIX:** Either surface a visible Advanced-Mode toggle (topbar/dock header) with a one-time
  hint, or promote a *small* lighting affordance (key light direction + intensity) into the default Scene
  panel, keeping the full multi-light editor behind Advanced. Tie the reveal into the H1 onboarding map.

### H7 · After making art, the path to *public* is opaque: sign-in discovery + moderation silence
- **STAGE:** 6 (Share/Publish)
- **WHAT:** Two correct, well-built parts with friction at the seams. (1) **Submit requires sign-in**, and
  **unauthed users see no Submit entry at all** ([installGallery.tsx:78-90](../engine-gmt/gallery/installGallery.tsx#L78-L90))
  — so the path from "I made something" to "sign in and publish it" is undiscoverable. (2) After submitting,
  the user is told "Queued for review. Appears once an admin approves it"
  ([SubmitGalleryModal.tsx](../engine-gmt/gallery/SubmitGalleryModal.tsx)) but gets **no ETA, no approval/
  rejection notification, and no rejection reason** — "My Submissions" shows a status pill but won't say
  *why* something was rejected.
- **WHERE:** submit gate (above) · success/moderation copy in SubmitGalleryModal · status display in
  [MySubmissionsOverlay.tsx](../engine-gmt/gallery/MySubmissionsOverlay.tsx).
- **IMPACT:** Moderation opacity ("why isn't my scene up?") erodes trust in the discovery channel that
  drives growth; the hidden sign-in entry means casual creators never learn publishing exists.
- **SEVERITY:** High (growth/trust)
- **SUGGESTED FIX:** (a) Show a Submit/"Share to Gallery" entry to *everyone*, routing unauthed users into
  sign-in (rather than hiding it). (b) Add an ETA to the pending copy ("usually within 24h"), poll status in
  My Submissions, and surface a rejection reason (even a generic one + support link). (c) Optional email/
  toast on approve.

### H8 · The remix loop is genuinely strong — make sure it's not the *only* discoverable share, and label it
- **STAGE:** 6 (Share/Publish)
- **WHAT:** This is mostly a **strength worth protecting**, with one polish edge. Viewing a gallery item
  exposes a first-class **"▶ Open in GMT"** that fetches the GMF, re-injects the sky, and drops the user
  straight into an editable scene ([loadGalleryScene.ts](../engine-gmt/gallery/loadGalleryScene.ts);
  [Lightbox.tsx](../engine-gmt/gallery/Lightbox.tsx)), with author attribution and a "More from @user"
  strip. Deep-links (`?gallery=<slug>`) auto-open the lightbox. Frictionless and growth-smart. The edge:
  the button says "Open in GMT," which doesn't *teach* that you can remix — and the separate self-serve
  **URL share** (UrlStateEncoder, "Copy Share Link") is a different artifact from the gallery deep-link,
  which can confuse.
- **WHERE:** loader + lightbox (above) · share-link button in [engine-gmt/topbar](../engine-gmt/topbar.tsx).
- **IMPACT:** The remix loop is the compounding-growth core (view → open → tweak → re-share). It's well
  built; the only risk is under-selling it ("Open" vs "Remix") and the two-kinds-of-link ambiguity.
- **SEVERITY:** Med
- **SUGGESTED FIX:** Rename/augment to **"Open & Remix"** with a hover hint ("opens in the editor — tweak
  params, colours, camera"); add a one-line legend distinguishing *gallery link* (this entry) from *share
  link* (your custom params). Keep everything else as-is.

---

# PAPERCUTS

### P1 · Video export RAM-mode completion has no confirmation; disk-mode FSA failure falls back silently
- **STAGE:** 5 · **WHERE:** [renderDialogExtras.tsx](../app-gmt/renderDialogExtras.tsx) + worker export runner.
  In-progress feedback is excellent (%, ETA range, last-frame time, pause/resume/finish/discard). But on
  finish, RAM-mode files download with no "3 files saved" summary, and a `showSaveFilePicker` SecurityError
  silently reverts to RAM with only a `console.warn`. **IMPACT:** user unsure whether the long render
  actually produced files / where they went. **SEVERITY:** Med. **FIX:** completion toast listing the
  written files; surface a "disk blocked → saved to RAM" notice.

### P2 · Image-sequence export disables Start in Firefox/Safari with no inline reason
- **STAGE:** 5 · **WHERE:** [renderDialogExtras.tsx](../app-gmt/renderDialogExtras.tsx) (FSA gate). The Start
  button label flips to "Image Sequence Requires Chrome" but the *why* isn't explained next to the format
  dropdown. **IMPACT:** non-Chrome users hit a dead end without understanding it. **SEVERITY:** Low.
  **FIX:** inline helper text under the format select when an image-sequence format is chosen.

### P3 · Bucket-render result modal re-prompts per frame and discards prior frames' blobs
- **STAGE:** 5 · **WHERE:** [BucketRenderResultModal.tsx](../engine-gmt/gallery/BucketRenderResultModal.tsx).
  For multi-frame sequences the modal reappears every frame and revokes the previous blob; dismiss frame N
  then act on N+1 and N is gone. (Modal correctly uses `dismissOnBackdrop={false}`.) **IMPACT:** potential
  silent loss in sequence renders. **SEVERITY:** Med. **FIX:** suppress per-frame after first dismiss with a
  "N pending" badge, or a batch "Review all" view.

### P4 · Feedback is fragmented: one good toast primitive, used in few places
- **STAGE:** cross-cutting (2-7) · **WHERE:** [StateLibraryToast.tsx](../engine/components/StateLibraryToast.tsx)
  exists and is nice, but "saved," "snapshot taken," "submitted," "exported," "link copied" variously use
  modal-body repaints, inline badges, or nothing. **IMPACT:** the loop lacks consistent positive
  reinforcement at each completed step. **SEVERITY:** Med. **FIX:** extract `showToast(msg, tone)` from the
  existing primitive and fire it on save/snapshot/submit/export success; keep ShareLink's contextual inline
  badge.

### P5 · Modal-dismissal and label conventions drift
- **STAGE:** cross-cutting · **WHERE:** complex forms correctly block backdrop-close
  (NewScene, SubmitGallery, BucketResult all `dismissOnBackdrop={false}` — matches
  [[feedback_ui_surface_design]]), but the **Lightbox closes on any backdrop click** including mis-clicks on
  its own sidebar ([Lightbox.tsx](../engine-gmt/gallery/Lightbox.tsx)); button case drifts ("Submit to
  Gallery" vs "Submit to gallery"); close glyphs vary (`✕` vs `&times;` vs `<CloseIcon>`); several icon-only
  topbar buttons rely on `title=` with no `aria-label`. **IMPACT:** small trust/coherence papercuts; the
  `title`-only buttons are invisible on touch. **SEVERITY:** Low. **FIX:** guard Lightbox backdrop with
  `e.target===e.currentTarget`; standardise Title-Case + `<CloseIcon>` + `aria-label` on icon buttons.

### P6 · ~~Param-drag → render-update lag has no "catching up" hint~~ — RESOLVED (owner review 2026-05-31)
- **STAGE:** 2/4 · **Owner correction:** stable's "great lag warning" *is* present and mounted in dev —
  the low-FPS banner in [PerformanceMonitor.tsx:226-300](../components/PerformanceMonitor.tsx#L226-L300)
  (fires <10 FPS in PT mode / <15 otherwise for ~2.5s, offering Adaptive Resolution / Lite Mode / Reduce
  Resolution), mounted at [ViewportArea.tsx:185](../components/ViewportArea.tsx#L185). It was NOT lost. With
  that present and H3 retracted, the narrower slider-lag micro-hint is unnecessary. **Dropped.**

### P7 · Mobile create→share has real walls beyond the landscape gate
- **STAGE:** cross-cutting (mobile) · **WHERE:** timeline is desktop-only
  ([AppGmt.tsx](../app-gmt/AppGmt.tsx), [17_Mobile_Layout.md](../docs/engine/17_Mobile_Layout.md)) so
  **animation can't be authored on a phone**; bucket/video export is desktop-only; **NewSceneModal
  (`w-[720px]`) and SubmitGalleryModal (`grid-cols-[300px_1fr]`) overflow** a landscape phone
  ([NewSceneModal.tsx](../components/NewSceneModal.tsx), [SubmitGalleryModal.tsx](../engine-gmt/gallery/SubmitGalleryModal.tsx));
  and the **mobile menu has no outside-tap dismiss** (documented limitation). **IMPACT:** a phone user can
  explore + snapshot + browse the gallery, but the create→*share* loop dead-ends (no animate, awkward
  submit). **SEVERITY:** Med (mobile). **FIX:** responsive modal widths (`w-[min(720px,95vw)]`, stack the
  submit grid), outside-tap dismiss for the mobile menu, and document export/animate as desktop-only for now.

### P8 · Loading-screen formula switcher is powerful but mis-reads as a progress display
- **STAGE:** 1 · **WHERE:** [LoadingScreen.tsx](../app-gmt/LoadingScreen.tsx) — the `[Formula] ▼` control
  with thumbnail picker and drag-load is genuinely nice but looks like a status label, so newcomers don't
  realise it's interactive (and re-clicking during boot re-triggers compiles with no queue feedback).
  **IMPACT:** a discovery + minor-chaos papercut at the very first moment. **SEVERITY:** Low. **FIX:** a
  one-time "Click to explore other fractals" hint; disable/queue-label the picker while a boot is in flight.

### P9 · Disabled-formula and other tooltips use internal jargon
- **STAGE:** 2 · **WHERE:** interlace-incompatible formulas show "shape:self-contained: not compatible as
  interlace secondary" ([FormulaSelect.tsx](../engine-gmt/components/panels/formula/FormulaSelect.tsx)).
  **IMPACT:** confusing to non-experts. **SEVERITY:** Low. **FIX:** plain-language copy ("Can't be an
  interlace partner — it defines its own geometry").

---

## Strengths to protect (don't regress these)

- **Instant default render** — no blank canvas; the "real-time 3D" wow lands in ~5s. (Stage 1)
- **Compile feedback is best-in-class** — contextual messages, asymptotic progress, guaranteed paint before
  the GPU blocks; boot failures surface a reason + Reload. (Stages 1/4) — *use this as the template for H3.*
- **Camera nav onboarding is well-paced** — Tab hint shown for the first 2 switches then retired; reticle +
  fading crosshair. (Stage 2)
- **Slider ergonomics** — live value, default tick + right-click "reset to default," keyframe status dot. (Stage 2)
- **Key Cam** — one-click camera-pose keyframe is the most approachable animation primitive in the app. (Stage 3)
- **Adaptive-resolution + InteractionSession logic is sound** (ADR-0061/0062) — it just needs a UI voice. (Stage 4)
- **Export in-progress UX (video/mesh)** — ETA ranges, per-frame timing, pause/resume/finish/discard, mesh
  phase log + memory chart. (Stage 5)
- **The remix loop** — gallery item → "Open in GMT" → instantly editable, with attribution, "More from
  @user," and `?gallery=` deep-links. PNG-embedded GMF makes *every* shared image a reopenable seed. (Stage 6)
- **Complex modals don't backdrop-close** — NewScene/Submit/BucketResult all honour the project rule. (cross-cutting)
- **Save/Load round-trip is robust** — one universal loader (PNG-iTXt / .gmf / .json), GMF carries shader +
  full scene, legacy-JSON fallback. (Stage 7)

---

## TOP 5 — if you polish only five things in this loop

1. **Give first-run a door, not just a render (H1).** A dismissible welcome map + "Start Tutorial /
   Explore / Browse Gallery." Unlocks discoverability of the *entire* loop; the tutorial asset already exists.
2. **Make animation reachable in one session (H2).** Label the timeline, add an empty-state recipe card,
   default Record on for an empty timeline, and ship a one-click "360° Orbit" preset. This is the
   differentiator *and* the ~8×-reach share format — the biggest growth lever in the loop.
3. **Open the gallery sign-in path (H7).** "Submit to Gallery" is hidden *entirely* unless signed in, so
   casual creators never learn publishing exists — show the entry to everyone and route unauthed users
   into sign-in; add moderation transparency (ETA + rejection reason). Growth-critical.
4. **Close the work-loss trap (H4).** `beforeunload` guard + localStorage autosave/restore + a dirty `*`
   indicator. Small surface, removes the loop's biggest trust risk at its highest-investment moment.
5. **Market the free growth multiplier (H5).** A snapshot-success toast that *says* "drag this PNG back in
   to reopen the scene," plus capture feedback on the most-used export. One sentence; every shared image
   becomes a remixable seed.

*Owner review 2026-05-31 retracted the original #3 (render/adaptive feedback — judged correct by eye)
and the lighting runner-up H6 (already has an easy non-advanced interface). Remaining runner-up: the
remix-loop labeling polish (H8).*

---

## Appendix — state-coverage matrix (observable UI states by stage)

| Stage | first-run/empty | loading/in-progress | success/confirm | error/recovery |
|---|---|---|---|---|
| 1 First-run | render present; **no orientation** | ✅ compile bar + spinner | ✅ splash fade | ✅ boot-fail panel + Reload |
| 2 Explore/Create | beautiful default | ✅ compile indicator | ⚠️ edit-applied implicit (render lag) | ⚠️ compile-error surfaced, params silent |
| 3 Animate | ⚠️ **empty timeline, no guidance** | ✅ playing badge (only while playing) | ⚠️ keyframe dot (unlabeled) | n/a |
| 4 Preview/Converge | n/a | ❌ **converging silent**; ❌ adaptive silent | ❌ **no "converged" signal** (except region tool) | ⚠️ compile-error only |
| 5 Capture/Export | n/a | ✅ video/mesh rich; ⚠️ PNG instant/none | ⚠️ video/PNG **no completion toast** | ✅ video alerts; ⚠️ FSA fallback silent |
| 6 Share/Publish | ✅ empty-gallery text; ⚠️ no CTA | ✅ submit spinner; ✅ skeleton-ish | ✅ "pending" copy; ❌ **no ETA/approval ping** | ✅ form errors; ⚠️ no retry button |
| 7 Save/Persist | n/a | ⚠️ load feedback thin | ⚠️ **save = browser download only, no toast** | ⚠️ no corrupt-file error; ❌ **no autosave/unsaved guard** |

✅ covered · ⚠️ partial / weak · ❌ missing.

---

*Apply nothing from this report directly — it's the research pass. Approved items are a follow-on: the
`/polish` skill is built for that, or hand-pick from the HIGH-LEVERAGE list / TOP 5 above.*
