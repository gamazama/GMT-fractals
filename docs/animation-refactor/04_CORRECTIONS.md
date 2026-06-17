# Animation Refactor — Spec Corrections Log

**Purpose:** track every post-shipping amendment to [`03_SPEC.md`](./03_SPEC.md). When implementation diverges from spec, the spec is updated and the change is logged here with date and rationale. The spec is the source of truth; this file is the audit trail.

**Format:** newest entry on top. Each entry: date, phase, section affected, change, rationale.

---

## Template (copy when adding entries)

```
### YYYY-MM-DD — PHASE_N — §X.Y "<Section title>"

**Change:** <what was edited in 03_SPEC.md>

**Rationale:** <why; usually because implementation found something the spec assumed wrong>

**Discovered by:** <Phase N work / spike / bench regression / external — be specific>

**Cross-refs:**
- Commit: <sha>
- Related PR / Phase report section: <pointer>

---
```

## Inbound from gmt-rs

When the Rust port ships a phase touching our scope, capture the relevant pattern here as well.

```
### YYYY-MM-DD — INBOUND — gmt-rs PHASE_X

**Pattern:** <what gmt-rs did>

**Adoption:** <whether we adopt, with rationale; if we don't, why not>

**gmt-rs ref:** `gmt-rs/PHASE_X_REPORT.md` / `gmt-rs/docs/...`

---
```

## Entries

### 2026-05-17 — Canvas DopeSheet — `02_RATIONALE.md` §1's "React fanout dominates dope-play" partly retracted

**Change:** `16_CANVAS_DOPESHEET_REPORT.md` §Surprise #1 documents that canvas DopeSheet moved `dope-play` worker FPS from 26 to **59.3** — far above the 30-40 target the prompt set based on `08_ENGINE_PROBE_FINDINGS.md`'s "React fanout is the residual cost" framing. The React anim-notification fanout still exists at the same per-commit cost (`Dock:right` ~1.5 ms × 482 commits etc.), but with the 9000 DOM diamonds gone, the browser's layout/paint pipeline no longer chokes between React commits. The worker holds vsync despite the same React work happening.

**Rationale:** the `08`-doc framed React fanout as the dominant residual cost. That was the right framing for *what could be optimised by narrowing subscriptions* — and remains correct on that axis. But it implicitly assumed React reconciliation was load-bearing for user-felt smoothness, which the canvas DopeSheet result falsifies: removing 9000 DOM elements unblocked vsync even with the same React work intact.

**Implication for AnimationDocument:** the perf rationale for the deferred refactor is now further weakened. The remaining React fanout costs ~3 s of CPU per 4 s scenario, but at heavy seed that's spread thinly enough across vsync intervals that the user doesn't feel it. AnimationDocument's hygiene rationale still stands; the "if a user reports lag in a place canvas didn't touch" trigger from `02_RATIONALE.md` may take much longer to fire than projected.

**Discovered by:** canvas DopeSheet implementation (`472444d`).

**Cross-refs:**
- Report: `16_CANVAS_DOPESHEET_REPORT.md` §Surprise #1.
- Implicit confirmation of: `15_DOPESHEET_PROBE_FINDINGS.md` hypothesis-by-elimination (the unaccounted ~6050 ms of `dope-scrub` long-task time was browser layout reflow, as suspected).

---

### 2026-05-17 — Shared canvas utils — `drawGraph` Pass 1 had the O(T × S × N) bug pattern documented by DopeSheet Surprise #5

**Change:** `17_SHARED_CANVAS_UTILS.md` documents that `utils/GraphRenderer.ts` Pass 1 (selection-aware overlay) had the same anti-pattern caught in the DopeSheet efficiency review:

```ts
trackIds.forEach(tid =>
  selectedKeyframeIds.forEach(cid =>
    keys.find(kk => kk.id === kid)  // O(N) inside O(T × S)
  )
)
```

At heavy seed (9000 keys all selected on one track) that's 81 M `find()` ops per repaint. Fixed by analogy from the DopeSheet fix: pre-bucket `selectedKeyframeIds` by `trackId` once, build per-track `Map<keyId, Keyframe>` for the inner lookup.

**Rationale:** this code shipped in the canvas GraphEditor work (`09` / `11`) without being flagged at review. The DopeSheet review caught the equivalent pattern only because the heavy seed exposed it (9 ms / repaint × 480 repaints in dope-scrub was small enough to ignore in normal scenarios; only the canvas refactor's strict-perf review surfaced it). The Graph bug was less visible because `selectedKeyframeIds.length` is typically small in graph workflows, but the asymptote was identical.

**Lesson for future canvas/cache work:** **any inner loop of the shape `for selected of N: keys.find(...)` is a footgun.** Codify in review checklist alongside the in-place-mutation grep from the earlier corrections entry.

**Discovered by:** shared-utils cleanup pass (`ad6d62b`).

**Cross-refs:**
- Report: `17_SHARED_CANVAS_UTILS.md` §"Mirror bugs".
- Sibling bug: `16_CANVAS_DOPESHEET_REPORT.md` §Surprise #5.

---

### 2026-05-17 — DopeSheet probe — three claims in `01_AUDIT.md` / probe prompt invalidated

**Change:** `15_DOPESHEET_PROBE_FINDINGS.md` documents three audit / prompt claims that don't hold on current `dev`:

1. **`TrackRow.tick` is dead code in dev.** The exported `tick` function in `TrackRow.tsx` still exists but is never imported (`GmtRendererTickDriver.tsx` references it in a commented-out phase-C-shell entry only). `01_AUDIT.md` §2's "TrackRow.tick walks every visible diamond per RAF" cost is **not present in dev**. Stable build is unverified; if `TrackRow.tick` is still wired there, the cost description applies to stable only.
2. **`dope-zoom` mount/unmount churn is not present at the 9000-key heavy seed.** Zoom runs at vsync with 9 React commits over 4 s and zero long tasks. Either binary-search virtualisation is fast enough at the densities being tested, or wheel-zoom step sizes don't move many keys across the viewport boundary. If a future probe needs to validate this audit claim, use a denser seed (15000+ keys with smaller `frameWidth`).
3. **`bench-perf-timeline.mts` heavy-seed flag is `--seed=heavy`**, not `--heavy` as `13_DOPESHEET_PROBE_PROMPT.md` suggested. Documented in the bench code at `bench-perf-timeline.mts:682`.

**Rationale:** the audit was a snapshot at a point in time; the dev branch has moved. Future probes referencing audit claims should re-validate before instrumenting against them.

**Discovered by:** dope-sheet probe (`9b647e4`).

**Cross-refs:**
- Probe findings: `15_DOPESHEET_PROBE_FINDINGS.md`.
- Audit doc to (re-)examine: `01_AUDIT.md` §2 (DopeSheet cost description).
- Prompt corrected inline: `14_CANVAS_DOPESHEET_PROMPT.md` §"Probe-driven amendments".

**Lesson for future probes:** when the audit names a specific code path as load-bearing, the probe's first move should be a grep to confirm the path is still wired before instrumenting. The TrackRow.tick instrumentation in this probe was wasted effort — useful only as a regression detector going forward.

---

### 2026-05-17 — Canvas GraphEditor — `01_AUDIT.md` §10 was incomplete (in-place keyframe mutation bug class)

**Change:** fixed `updateKeyframes`, `setTangents`, `setGlobalInterpolation`, `pasteKeyframes`, `loopSelection` in `store/animation/sequenceSlice.ts` to clone the touched track + keyframes array before mutating. Without this, GraphRenderer's polyline cache (which keys on keyframes-array referential equality) goes stale until the array ref happens to change for some other reason — visible to the user as "bezier handles don't update the curve until I move a keyframe."

**Rationale:** the in-place mutation pattern was a latent footgun under React's shallow-equality / referential-equality memoisation; before the canvas cache landed, every render redrew everything so the bug was invisible. After the cache, it's a stale-render bug.

**Discovered by:** user testing immediately after canvas merge.

**Audit accuracy:**
- `01_AUDIT.md` §10 #1 flagged `updateKeyframe` as in-place — **false alarm**; it correctly uses `.map()` to clone.
- `01_AUDIT.md` §10 #2 flagged `updateKeyframes` — **TRUE**; was the immediate cause.
- Audit MISSED: `setTangents` (line 482), `setGlobalInterpolation` (line 549, worst — also mutates individual keyframe objects), `pasteKeyframes` (line 629, assigns `.keyframes` on original track ref), `loopSelection` (line 683+689, same pattern as paste).

**Cross-refs:**
- Commit: (this commit)
- Audit doc to update: `01_AUDIT.md` §10 should note the audit missed four writers with the same bug class. Leaving the audit as-is for historical accuracy and flagging the gap here.

**Lesson for future cleanups:** "mutates in place" / "clones correctly" is not a per-method property — it's a per-pattern property and needs to be checked against EVERY write path that touches keyframe data. A grep for `track.keyframes[` and `track.keyframes =` catches the family.

---
