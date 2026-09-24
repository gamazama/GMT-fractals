# GX /polish pass — 2026-09-24, with the owner

> Brief: `plans/gx-polish-pass-brief.md`. Working files (reviews, critic plan, owner decisions) were in the
> session scratchpad; the parts worth keeping are copied here. Ended early at the owner's 5-hour usage cap (95%).
> Committed as five commits `bdb74608..0c885fe4` (one per batch: hero/tray/shell · shared editor + masters ·
> Export + Wallpaper · the ground · Help/Settings/first run/GMT side); each passed the pre-commit typecheck of the
> whole tree, but the commits were NOT typechecked one by one in isolation. Batch E's second round (Feedback's
> `signIn` / `available`, `text-kept` / `text-support` in `tailwind.config.js`, the z-index allowlist, the handoff
> smoke's selector) was stopped by the session end AFTER its edits landed; the tree typechecked and
> `check:zindex` was green. The glyph drafter produced nothing.

## What happened
Six read-only reviewers (hero + tray · the ground · layout + phone · Export + Wallpaper · chrome + first run + GMT
trip · journeys + IA + motion) → ~118 findings → a critic merged them into 81 fixes to apply, 40 owner questions and
25 rejected ideas → five implementer batches in waves, each owning a disjoint file set → owner answered every question.

## Owner decisions (all recorded here; the recommendations were accepted unless noted)
- **Esc on a tray face CANCELS** it (Adjust → reset dials; Mix / Image / an edited Curves → back to before the face);
  an untouched face leaves as a peek; a tab click, a pick, the fold or the ♥ still bake. "Esc cancels" copy is back.
  The state chip's action words underline on hover. No Apply/Cancel on Mix/Image/Curves; no ✕ on the inspector.
- **Tray covering the set rail: left as is** — owner: "i still need to think on this issue, that isnt the solution"
  (hanging faces below the rail was rejected). Open.
- **Short windows:** opening Filters folds the hero, closing unfolds (only a fold Filters made); carve tools
  collapse first when the wall is shorter than the tool column. Filters open + fold ownership ride undo (ADR-0120).
- **Default brightness is the Grey preset (12)**, not Light Grey (owner, unprompted). A trip from GMT neither asks
  nor changes GMT's look.
- Removed: GX hero ☰ Reset Default; Settings ▸ Files ▸ Storage in GX; Delete-group confirm; the selection bar's
  drag hint; Export ▸ Output profile (makes settled undo case #5 moot).
- Words: "Keep" = the ♥ and Kept only (ramp halves Cancel / Apply; "Group these N"); "bake" only for the face
  (Curves "Resample", wave ✓ "Apply the wave…"); "Add your gradient" (GX global); "axes" before Curves' chooser;
  count shown once on desktop; ♥ tooltip names its group; every download toast says "Downloaded"; Export heads
  "Web · Design apps · Fractal + 3D apps · Code + data"; Help window titled "Help" in both apps.
- Export/Wallpaper: set swatches follow the hero's rule; Export remembers Ramp/Swatches; Wallpaper remembers its
  size, a phone starts on Phone portrait; Dither once on desktop; Copy coords behind `?diag`, "Norm v1/v2" →
  "Normalise" (kept: it is the only way to reach normalised colour); a one-member set downloads one file; the set's
  Export window opens under its button.
- GMT side: "New here?" pill moved under the top bar (`@bug` cleared); only the GMT wordmark links out of GX;
  "or continue {name}" after a reload.
- Look: `Act` active = accent; toasts fade in (150 ms); phone menu 32 px; kept-♥ gold token (`--kept`, proposed
  #CEA84D dark / #876005 light — owner to judge on screen).
- No landing / cancel morph (dead `dragVisual` exports → a later /simplify).

## Not done (next session)
0. **The closing gate was not run.** On a quiet tree: `typecheck`, `check:text-bytes`, `check:rule-guards`,
   `orphans`, `build`, the palette node tests, and the smokes `boot`, `ge-next`, `ge-hero`, `ge-tray`, `ge-ground`,
   `ge-wave`, `ge-reduce`, `ge-phone`, `ge-session`, `ge-gradientfile`, `ge-uiundo`, `ge-livedrag`, `ge-wallpaper`,
   `ge-setsave`, `gmt-gradientdrop`, `gmt-gx-handoff`, `chrome`, `smoke-help-menu`. Each implementer ran its own
   area's smokes green, but with siblings editing (HMR noise). Also falsify `ge-ground` [14c] (below).
1. **Kept ♥ gold — wired, owner to judge.** The ♥ uses `text-kept` (token `--kept` in `index.css`, #CEA84D dark /
   #876005 light, exposed in `tailwind.config.js`); `text-kept` sorts after Act's active ink so it wins (batch E
   checked the built CSS). Act's active accent tints the button box when kept — the owner decides if the box should.
2. **Glyph drafts** (owner approved drafting): Multiply for the wave tool (today the same ✕ as Discard), Help `?`,
   a back arrow for the phone's "Back to GMT", Wallpaper split / dither / handles / landscape / portrait. Draft in
   `gradient-explorer/v2/ui/Icon.tsx`'s set, check `H:/GMT/assets/GXN/` sheets first, rasterise at 16 px for the owner.
3. **Recent across days** (owner decided): a gradient resumed on a later day files a NEW entry under Today instead of
   updating the earlier day's entry (`palette/store/workingStore.ts` / `favientsStore.ts`, clock seam, guard in
   `test-palette-working`; do not regress `9721cdda`). Queue an ADR-0124 update block. Also `favientsStore.ts` ~l.364
   comment "Keep these N" → "Group these N".
4. **What's New wording** — batch E made only factual fixes to the owner's text; the owner rewords (lines below).
5. **Tray vs rail** (ASK-2) — open, owner thinking.
6. Stale rule text: `.claude/rules/sibling-apps.md` ge-phone row says "no wider than the 100 px" → 108 (8d);
   `index.css` `@assumption` list of `fade-in-up` call sites misses ToastHost; the ge-ground row still says
   "Keep these N" (now "Group these N"), and could mention [14] / [15].
7. Light Grey: Feedback's accent ink was 2.88:1 — fixed inside FeedbackPanel (`ACCENT_INK`, accent mixed with the
   scheme's ink; Send measured 4.70:1). The light-regime accent ladder itself is still pale elsewhere — owner call.

## What's New — factual corrections made (owner to reword)
- "**GMT and the Gradient Explorer remember each other's gradient** when you move between them." →
  "**The Explorer opens on the gradient you had in GMT**, and Back to GMT returns you to your scene."
- "**Gradient ☰ menu → Reduce stops.**" → "**Gradient ☰ menu → Reduce Stops…**"
- "September 14, 2026" → "September 2026" (one date form; 2.0.0's day is not set yet)

## ADR text queued for the owner (none written — ADR writes need the owner's approval)
- **ADR-0082 update:** `engine/components/ToastHost` renders through `<Layer tier>` (default `shellToast`, 900 inline;
  GX opts into `toast` 3200 because Wallpaper's `overlay` 2000 hid its toasts), fits its text (`w-max max-w-[90vw]`),
  enters with `fade-in-up` at 150 ms. `FirstRunHint` renders through `<Layer tier="shellToast">` instead of raw `z-[800]`.
- **ADR-0120 update (ASK-1):** Esc on a tray face is that face's Cancel — Adjust `resetAdjust`, Mix / Image / an
  edited Curves `cancelFace` — and an untouched face leaves as a peek; a tab, a pick, the fold or the ♥ still bake
  (C.3 unchanged for those). One Ctrl+Z after an Esc-cancel gives back the face with what it held.
- **ADR-0120 update (what rides):** whether the ground's Filters rows are open and whether the current fold is
  Filters' own ride every entry as context (`useFiltersHistory` in `gradient-explorer/v2/uiHistory.ts`); the shell's
  `folded` stays the truth for the fold. Proven by `smoke:ge-ground` [15e] / [15f].
- **ADR-0115 / 0118 sentence (ASK-3):** Filters folds the hero while open and undoes only a fold it made; on a wall
  shorter than the tool column the carve tools collapse first, the fold and zoom stay.
- **ADR-0118 update:** a floor under the margin (`minGutter`) is margin, not room for labels — PickerWall draws row
  labels from the gutter the host asked for; `GroundList` takes `minGutter` too (G03, G09).
- **ADR-0119 update:** GX global is drawn where it lands too — its chip plays the slow flash when the server accepts.
- **ADR-0126 update:** a page opened by GMT's Explorer button neither shows the first-run dialogue nor applies a
  preset or marks `gmt.ge.themeSeeded` (`decideFirstRun({ fromGmt })`); guard `debug/test-ge-first-run.mts` [5].
- **ADR-0115 update:** the phone Settings sheet uses `FloatingPanel`'s `sheet` (inset 0, no clamp, no height cap).
- **ADR-0114 note:** `Act active` wears the lit-toggle accent (as `primary`, without the hover).
- **C.15 (owner decision) update:** the Output profile is removed from the Export window (every format writes sRGB;
  the row read "Linear" for every pick and a click baked the gradient). GMT's gradient file still carries `colorSpace`.
- **ADR-0123 (optional):** a set of one exports its member's own file; a set's swatches follow the hero's rule.

## New guard steps (each falsified by its implementer unless noted)
`smoke:ge-hero` [r1]/[r2] (first double-click keeps, no stray stop) and [n1]/[n2] (name-field drag) ·
`smoke:ge-gradientfile` [b3] (file on a swatch) · `smoke:ge-uiundo` [15] (♥ with Mix open) and [16] (Esc cancels) ·
`smoke:ge-tray` [5] rewritten (Esc cancels Mix) · `smoke:ge-ground` [14] (Esc takes the nearest held thing; [14c]
NOT yet falsified — mutation: `escape: false` on ExportMenu's `useDismiss([ref, previewRef], …)`), [15a]–[15f]
(Filters folds; rides undo) · `smoke:ge-wallpaper` [4] (Split Esc) · `test:gx-export` filename cases ·
`test-palette-wallzoom` [7] (`stepCursor`) · `test-palette-exportsubjects` [12] · `test-ge-first-run` [5].
