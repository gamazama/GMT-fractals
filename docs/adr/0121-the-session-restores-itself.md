# ADR-0121: The working session restores itself, and travels in a file from Settings

> **Update 2026-09-23 (the old shell is gone; decision unchanged):** Consequences' last bullet
> says the old shell (`gradient-explorer/main.tsx`) keeps its SceneIO menu and inert Autosave rows
> "until it is removed". It was removed when `gradient-explorer.html` became the v2 shell (merge
> `79b88b16`), so the v2 session is now the only session any Gradient Explorer page has.

- **Status:** Accepted
- **Date:** 2026-09-13
- **Relates to:** ADR-0112 (variants bypass the scene loader — the same reasoning, reused);
  ADR-0111 (the Working pipeline's input slot); `plans/ge-v2-design.md` §5.8;
  `plans/ge-v2-parity-checklist.md` item S3. Code: `engine/plugins/Session.ts`,
  `store/sessionEnvelope.ts`, `palette/store/workingSession.ts`, `gradient-explorer/v2/session.ts`.
  Guards: `npm run test:gx-session`, `npm run smoke:ge-session`.

> **Update 2026-09-13 (same day, the owner's answers; Decisions 2 amended, the rest unchanged):**
> autosave is **opt-in in the Explorer too, and each app has its OWN keys**. Decision 2 below and
> the first Consequence (on-by-default via `applyAutosaveDefault(true)`, keys shared across the
> origin) are superseded: `applyAutosaveDefault` is deleted, and `engine/store/autosaveStore.ts`
> is now a per-app factory, `createAutosaveSettingsStore({ enabled, intervalSec })`, memoised by
> key. app-gmt keeps `useAutosaveSettings` on `gmt-autosave-enabled` / `gmt-autosave-interval-sec`
> byte for byte (no migration); the Explorer's `gxAutosaveSettings` (grep it in
> `gradient-explorer/v2/session.ts`) is on `gmt.ge.autosave-enabled` /
> `gmt.ge.autosave-interval-sec`. The session plugin takes the store as a REQUIRED option, and
> `registerCoreSettings({ autosave })` / `registerAutosaveSettings(store, text)` bind the Files ▸
> Autosave rows to the store handed in, with the Explorer's own wording. With autosave off (the
> default) a boot restores nothing and writes nothing — as before this ADR — while Settings ▸
> Files ▸ Session Save / Load keep working. Also added: a restored session always lands Mix's
> slot modifiers at neutral (`SLOT_MOD_DEFAULTS`, grep `withNeutralSlotMods`), because GE v2 has
> no control for them and a restored live Mix never runs the Mix entry that resets them.
> Decisions 5 (share link pre-empts) and the image-undo gap stand as written, confirmed by the
> owner the same day.

## Context

The Gradient Explorer v2 lost the working gradient on every reload. The old shell had
`installSceneIO` (Load / Save Scene / Restore Last Session), but its Restore read app-gmt's
recovery key and did nothing useful there, and the Settings panel in both shells showed the
Autosave rows (`registerCoreSettings`) with nothing behind them — `<UnsavedWorkGuard/>` is mounted
only by app-gmt. The owner's calls, 2026-09-13: the session must survive a reload / crash / close
and the existing Autosave settings must govern it; saving a session to a file is an advanced
case, so it belongs in Settings, not the top bar.

App-gmt's machinery is engine-core already, but it is shaped for a heavy scene: it serialises
`getPreset()` and loads through `loadScene` → `loadPreset`, and it restores by hand. For the
Explorer that path is wrong for the reasons ADR-0112 lists — `loadPreset` wipes undo, rewrites
project settings, and the `favients` document MERGES into the shared shelf with a toast.

## Decision

1. **A new engine plugin, not a copy and not a bend of SceneIO.** `engine/plugins/Session.ts`
   runs three loops over an app-supplied adapter (`capture` / `validate` / `apply`): restore on
   boot, autosave, and Save / Load rows registered into the Settings registry as `action`
   controls (Files ▸ Session). The versioned envelope and the boot decision are pure, in
   `store/sessionEnvelope.ts`. Any app with a light session can install it.
2. **The existing Autosave settings govern it.** Same store, same shared keys. The Explorer
   declares its own default (`applyAutosaveDefault(true)`, only while the key is unset), because
   there the autosave IS the session; app-gmt keeps opt-in. Off means the app keeps nothing: the
   stored session is removed when the toggle goes off, and none is restored while it is off.
   The interval is the periodic stash; `pagehide` / tab-hidden always flushes, so a reload or a
   closed tab never waits for it — only a crash can lose up to one interval.
3. **A session is a studio snapshot.** The capture + apply a variant already used, lifted into
   `captureStudioSnapshot` / `applyStudioSnapshot` so the two cannot drift: `paletteGenerator` +
   `paletteImage` slices and the registered documents minus `favients`. The browse filters, the
   palette-row prefs, the theme and every other per-viewer preference already persist on their
   own keys and are not part of it.
4. **Boot restore is unbracketed; a file load is one bracket.** The restore runs in `main.tsx`
   before the first render, so the hero's first paint is the restored gradient and a first
   Ctrl+Z has nothing to take away. A file load is one `paramEdit` and forgets the file's Recent
   session id.
5. **A share link that opens pre-empts the restore.** It is the gradient the user asked for on
   that load; the autosave then keeps it as the session. A broken link does not pre-empt. Their
   previous work is still in My Gradients (its Recent entry was kept current while they worked).
6. **One version, no silent reads across versions.** The envelope is
   `{ format: 'gmt-gx-session', version: 1, savedAt, body }`; another format or version, garbage,
   or a body without a readable `working` document is refused — a clean start at boot, a toast for
   a file. A future version adds its migration in `decodeSession`, not a looser test.
7. **The file is `<working name>.gxsession.json`.** `.json` so pickers and editors accept it; the
   inner tag so it is not confused with a gradient file or a Favients collection, both `.json` too.

## Consequences

- The shared autosave key means a choice made in app-gmt's Settings governs the Explorer and the
  reverse. Deliberate (the owner asked that the existing settings govern it); revisit if the two
  apps' users want different answers.
- A restored LIVE input (Mix / Image) reopens its face — the shell derives the tray from the input
  at first render. Opening Mix afresh would run `enterMix` over the restored blend.
- Inherited from ADR-0112: the `image` document restores asynchronously, so undoing a file load
  does not put the previous image back. The source image can make a session large; a write the
  browser refuses is retried once without it (the gradient survives, the image does not).
- The old shell (`gradient-explorer/main.tsx`, being retired) is unchanged: its SceneIO menu and
  inert Autosave rows remain until it is removed.
