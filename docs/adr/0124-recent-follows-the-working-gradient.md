# ADR-0124: Recent collects the working gradient, one entry per session, shown by day

> **Update 2026-09-16 (three faults in the build this ADR described are fixed; decision unchanged):**
> - **Decision 4's pin now holds.** The bullet read "as built, the pin does not survive the first
>   sync" — it compared the collected id with the session id, which is still null then, so the pin
>   always dropped and the first edit rewrote the entry the gradient was picked from. It now holds
>   while the output is still the picked gradient, including after a fold that changed nothing, so
>   the first change opens a new entry and leaves the original as it was
>   (`palette/store/workingStore.ts`, grep `sessionPinned`).
> - **Decision 8's placement is by day.** A merge put a file's Recent entries at the END of the
>   run, and the rail starts a new chip at every change of date, so one day could appear twice
>   (Today · 1, Yesterday · 1, Today · 1). A merge and a replace now order Recent newest day
>   first, keeping order within a day (`palette/store/favientsStore.ts`, grep `byDayNewestFirst`;
>   `dayKey` moved into that store and `palette/components/favientBlocks.ts` re-exports it).
> - **Decision 7 narrowed.** The 400 ms debounce, Share and Wallpaper call `syncRecentOutsideUndo`,
>   which never syncs inside an open param transaction — it waits for the close
>   (`outsideParamTransaction` in `palette/store/paramUndoBracket.ts`). Before that, a gesture held
>   past 400 ms carried the shelf write into its own undo entry, so cancelling a Curves wave left
>   one entry that changed only My Gradients — against this ADR's "adding to Recent never creates
>   an undo step". Only the ♥ (inside its own bracket, before `add()`) and entering Mix still sync
>   directly.
> - **Guards added:** `npx tsx debug/test-palette-working.mts` [10] (pick from a bin, sync, edit,
>   sync), [11] (the ♥'s flash target), [12] (both bracket routes and a reopening bracket);
>   `npm run test:palette-favients` [9] (the rail's chips after a merge and a replace);
>   `npm run smoke:ge-wave` [7]/[7b]/[7c] (a cancelled wave leaves nothing to undo). Each was
>   falsified against the unfixed code.

- **Status:** Accepted
- **Date:** 2026-09-16
- **Relates to:** ADR-0111 (the Working pipeline's input slot — a session lives on it); ADR-0114
  (its Consequences owed this record); ADR-0119 (the ♥ flashes the set that grew); ADR-0121 (a
  session carries its Recent id); ADR-0122 / ADR-0123 (the signature Recent dedupes by);
  `plans/ge-v2-design.md` §4, §9, §12; `plans/ge-v2-unified-shell-plan.md` (grep `D.1 · My
  Gradients as DATED bins`). Code: `palette/store/favientsStore.ts` (grep `collectRecent`,
  `updateRecent`, `RECENT_GROUP`, `RECENT_CAP`), `palette/store/workingStore.ts` (grep
  `syncRecent`, `sessionPinned`, `RecentCollector`), `palette/installWorking.ts`,
  `gradient-explorer/v2/registerFeatures.ts`, `gradient-explorer/v2/GradientExplorerV2App.tsx`
  (grep `syncRecent`), `palette/components/favientBlocks.ts` (grep `buildBlocks`, `dayKey`),
  `palette/core/groundSets.ts` (grep `listGroundSets`). Guards: listed under Consequences.

## Context

The Gradient Explorer v2 has no Save button for the gradient you are working on. The design's four
roles (2026-09-03: Candidate / Working / Recent / Kept) answered that with a shelf that fills
itself: what you worked on is in My Gradients without a gesture, and keeping — the ♥, a group — is
a separate, deliberate act. The shelf is the same `gmt.favients` collection app-gmt and fluid-toy
show.

The decision was made and amended in stages, each on the owner's word, and was only ever written
down in the plans:

- 2026-09-03, design §4: Recent is auto-built from anything that becomes Working, exported, shared,
  sent to Wallpaper or starred — "NOT wall clicks (noise)" — deduped by content signature, grouped
  by day, capped at about 60.
- The same day, design §12 item 1: a pick IS a Use. `use` stopped collecting; "Recent catches
  anything moved on from".
- That evening, the S3 review: the bin "should be updating the gradient whenever the user modifies
  it, and know when to create a new gradient" — one entry per working session, refreshed in place,
  and a session picked up from the bin pinned so its first change opens a new entry.
- 2026-09-07: a source entered again opens a new entry ("bringing the image back as the source
  should also create a new item in the bin"), and D.1 — "for my gradients — dated bins by default".
- 2026-09-08, Phase D: the bins became sets on the rail, and Snapshots were removed because "the
  gradient itself is already in Recent and Kept".

ADR-0114 listed this as the last ADR Phase G owed. It records the code as it stands on 2026-09-16,
not a new design. Where the code and the recorded decision disagree, that is said under
Consequences rather than resolved here.

## Decision

1. **Recent is one auto-managed group on the shared shelf, not a store of its own.**
   `RECENT_GROUP` (`'g-recent'`) inside `gmt.favients`. It owns the front of the array as ONE
   contiguous run: every collect partitions the array into Recent and the rest instead of splicing,
   so the run is contiguous by construction — `buildBlocks` opens a block on every change of group,
   and two runs would draw as two dividers. `RECENT_LABEL` is re-asserted on every collect, because
   pruning drops it whenever the run empties. Nothing the user makes lands in it: `add()` falls back
   to Kept when `lastGroupId` is Recent ("a save parked there would silently fall off the cap"), a
   collect never writes `lastGroupId` ("an automatic collect must not steer where a deliberate save
   goes"), `removeGroup` refuses it, and a bin chip opens no menu and takes no drop. A Recent tile
   can be deleted like any favourite.

2. **Only the Explorer collects, and through a seam.** `workingStore` never imports the favourites
   store. `installWorking({ collectRecent, updateRecent })` installs a `RecentCollector` and a
   `RecentUpdater`, and `gradient-explorer/v2/registerFeatures.ts` is the only caller. A collector
   that throws is swallowed ("a collector failure must never break an edit"). app-gmt and fluid-toy
   collect nothing but show the run read-only, because the key is shared — which is also why Back
   to GMT carries nothing (plan, 2026-09-07).

3. **A write follows the working gradient, not a list of gestures.** `syncRecent` writes the
   pipeline's current OUTPUT (`deriveWorkingNow`) under the working name; an empty input writes
   nothing. The shell calls it:
   - 400 ms after the derived config, the name or the empty flag last changed (the effect in
     `GradientExplorerV2App`, commented "debounced past a drag"). That covers a wall or shelf pick,
     a bake, a stop edit, Adjust, Curves, a live Mix or Image, leaving Mix or Image, a rename, a
     share link opening at boot and a restored session's first render;
   - at once, to flush that delay, before entering Mix (slot B is "the most recent OTHER entry",
     read from the head of the shelf), before Share, before Wallpaper, and inside the ♥'s undo
     bracket before it files its copy.

   So a wall pick that stays Working for 400 ms is collected. The 2026-09-03 "NOT wall clicks" rule
   predates a pick becoming a Use and no longer describes the product. Export does not flush; no
   reason is recorded either way.

4. **One entry per working session, refreshed in place.** `sessionId` names the session's entry.
   `syncRecent` first calls `updateRecent(sessionId, config, name)`, which rewrites that entry's
   config and name — same id, same place in the run, `createdAt` untouched; identical content and
   name write nothing; any OTHER Recent entry already holding the new content is dropped, so the run
   stays one entry per gradient. It returns false when the entry is gone or has left Recent (dragged
   into a group, which "IS keeping it"), and the sync then collects, opening a new entry.
   - A session ENDS (`sessionId` → null) on `use` — every pick — and on `setInput`, `goLive`
     (entering Mix or Image), `cancelLive` and `returnToSource`.
   - It CONTINUES through `beginEdit` and the other folds ("an edit is the same gradient, changed")
     and through the ♥, which files a separate copy with `add()` (the last group used, else Kept)
     while the session goes on refreshing its Recent entry.
   - A session picked up from a bin (`use(…, { fromRecent: true })`) is PINNED: its first change is
     meant to open a new entry rather than rewrite the one it came from. See Consequences — as built,
     the pin does not survive the first sync.

5. **`collectRecent` dedupes by content, promotes, and caps.**
   - Identity is `favientSig`: the stops with their interpolation and bias plus the blend space
     (ADR-0123), or `ramp:` and the texels for a ramp gradient (ADR-0122). Colour space is not part
     of it.
   - A gradient already filed in any non-Recent group returns null and changes nothing ("Already
     filed somewhere the user chose — that IS keeping it"). The session then has no entry until its
     output changes. For the same reason a Recent entry does not light the ♥ — kept means filed by
     the user (grep `favOf` in `WorkingHero.tsx`).
   - A signature already in Recent is PROMOTED: moved to the head with `createdAt` refreshed, so it
     joins today's bin, keeping its id, name, source and config; it takes the caller's origin only
     if it had none.
   - Anything else is a new entry at the head, with the working source (`workingSourceOf`), the
     working origin (`originOfWorking`) and `createdAt` now.
   - `fresh` skips the promote and always opens a new entry. `syncRecent` passes it when a session
     has just opened on a live source (Mix or Image) — the owner's 2026-09-07 call above. It is the
     one way Recent holds two entries with one signature, until an `updateRecent` converges them.
   - `RECENT_CAP` is 60; the oldest falls off the tail, on collect only. Nothing expires by age.
     Design §4 said "oldest unstarred drop off": starring does not protect a Recent entry — the ♥'s
     copy sits outside the cap, which is what keeps it. No reason for 60 is recorded, and expiry by
     age has been an open call since 2026-09-03 (design §10, §13).

6. **A day is a view, not stored.** `buildBlocks` splits the Recent run wherever the local calendar
   day of `createdAt` changes (`dayKey`), labelled Today, Yesterday, "3 Sep" or "3 Sep 2025"
   (`dayLabel`). `listGroundSets` makes each block a `bin:<YYYY-MM-DD>` set on the rail, after All
   and GX global and before Kept and the named groups, and `membersOf` resolves a bin by its day.
   Newest-first is a property of placement — a collect or a promote always lands at the head with
   `createdAt` now — not a sort.

7. **Undo never brackets a collect.** `collectRecent` and `updateRecent` open no bracket, and
   `syncRecent` runs from a timer ("transient bookkeeping, outside any undo bracket (the next bracket
   snapshots it)"). An undo entry holds the shelf only when the shelf changed inside its bracket, so
   undoing a pick leaves that pick's entry in Recent — "Recent catches what was moved on from" —
   while the working snapshot carries `sessionId` and `sessionPinned`, so the gradient undone to
   writes to its own entry again. A sync that lands inside an open bracket (the ♥'s, or a drag held
   still for 400 ms) is part of that entry. No further rationale is recorded.

8. **Sessions and files.** The `working` document carries `sessionId` and `sessionPinned`
   (ADR-0121). A boot restore keeps them, so edits go on refreshing the same entry. A session FILE
   load clears them, "so a loaded session opens its own My Gradients entry instead of writing into
   whichever entry of yours happens to share an id". A share link that pre-empts the restore is a
   `use`, so a new session; the previous work is already in Recent (ADR-0121 Decision 5). A
   collection merge puts a file's Recent entries at the END of the run, and a replace puts Recent
   first (`placeMerged`, `recentFirst`; ADR-0123).

9. **Catalogue credit follows the content, not the entry.** A new entry stores the working input's
   origin and a promote keeps the entry's own; `updateRecent` changes the config and leaves the
   origin. An export honours the credit only while the config's key still matches
   (`unmodifiedOrigin`), so an in-place refresh that changes the gradient retires the credit without
   clearing anything, and one that brings the picked content back restores it (`catalogOrigin.ts`).

10. **Other tabs and apps.** Every write is the whole array to `gmt.favients`; the `storage`
    listener at the foot of `favientsStore.ts` re-reads in every other open document, and two open
    Explorer tabs each keep their own `sessionId`. There is no merge: a write from a document that
    has not yet received the other's `storage` event overwrites it. That this is rare enough not to
    matter is an assumption — nothing tests two documents.

## Consequences

- **Guards.** Run on 2026-09-16, all green; none was re-falsified for this ADR (other work was
  editing the tree). They cover:
  - `npm run test:palette-favients` [6] — a new collect at the head, a promote keeping its id,
    `fresh`, a filed gradient returning null and leaving the shelf byte-identical, the label restored
    after pruning, the cap, `lastGroupId` left alone, the run contiguous beside a user save (the
    `@invariant` on `collectRecent`, falsified when it was written, 2026-09-03), dated bins through
    `buildBlocks`; [7] `updateRecent`; [8] two ramp gradients never deduping into one.
  - `npx tsx debug/test-palette-groundsets.mts` [1]–[2] — bins in rail order; a bin's members by day.
  - `npm run test:palette-shelf` — Recent is never a group chip, and `removeGroup` refuses it.
  - `npm run test:gx-session` — a boot restore keeps the session id; a file load forgets it.
  - `npm run test:gradient-file` [7] — a merge keeps Recent one block at the top.
  - `npm run test:palette-licensing` — a collect keeps the origin.
  - `npx tsx debug/test-palette-working.mts` [9] — a pinned session whose ramp output changed opens a
    new entry. The harness SETS the pinned state; it does not reach it through a pick.
  - `npm run smoke:ge-ground` [2]–[4] — the wiring: two wall picks make Today · 2, the bin goes on
    the ground, an older tile brings its pick back.

  Unguarded: the session rules of Decision 4 in a real sequence, the flushes in Decision 3, undo
  against Recent, and two documents writing at once.
- **The bin pin does not hold as built.** Found while writing this, and not fixed (a docs-only
  pass). Traced through the real stores on 2026-09-16: after `use(A, …, { fromRecent: true })` the
  delayed `syncRecent` has no `sessionId` yet, so it collects; `collectRecent` promotes A's entry and
  returns its id; and `sessionPinned: next ? s.sessionPinned && next === s.sessionId : false` stores
  false, because `s.sessionId` was still null. The next edit then `updateRecent`s the very entry the
  gradient came from. Only an edit made inside the 400 ms delay opens a new entry. The one guard sets
  the pinned state directly and cannot see it. Whether the pin or today's behaviour is wanted is the
  owner's call; either way the site wants an `@bug PRODUCTION:` or a fix with a guard that drives a
  real pick.
- **A merge can show one day twice.** `placeMerged` appends a file's Recent entries to the end of
  the run with their own `createdAt`. When they are newer than the run's last day, `buildBlocks`
  meets that day twice and `listGroundSets` returns two chips with the same `bin:<day>` id — traced:
  Today · 1, Yesterday · 1, Today · 1 — each of which `membersOf` resolves to the whole day. A clock
  change can do the same. Not guarded.
- **An entry keeps the day its session opened.** `updateRecent` never touches `createdAt`, so a
  session resumed on a later day (a boot restore keeps its id) goes on refreshing an entry filed
  under the earlier day; only a re-collect moves an entry to Today. No decision about this is
  recorded.
- **Browsing fills Recent.** Every pick that stays Working for 400 ms is collected, so an hour of
  clicking through the wall can push older entries past the cap. The ♥ or a drag into a group is how
  something is kept; revisit if the owner decides entries should also expire by age, or that a pick
  should not count until it is edited.
- **Recent is visible in every GMT app**, read-only, because the key is shared. That is by design
  (`.claude/rules/palette.md`, "The Favients COLLECTION is shared across apps").
