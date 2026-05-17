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
