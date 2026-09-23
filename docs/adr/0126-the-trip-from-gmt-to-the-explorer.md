# ADR-0126: The trip from GMT to the Gradient Explorer carries a gradient there and nothing back

- **Status:** Accepted
- **Date:** 2026-09-24
- **Relates to:** ADR-0121 (the Explorer's own session, which the arrival pre-empts the way a share
  link does); ADR-0125 (the Explorer's address); the 2026-09-07 Phase B entry in
  `plans/ge-v2-unified-shell-plan.md` (the cancelled hand-BACK, which still stands). Code:
  `app-gmt/explorerTrip.ts` (grep `resolveGradientForExplorer`, `gradientAt`),
  `palette/core/explorerHandoff.ts` (grep `EXPLORER_INCOMING_KEY`, `CHANNEL`),
  `engine-gmt/utils/sceneStash.ts` (grep `SceneStashReason`, `GX_RETURN_QUERY`),
  `engine-gmt/utils/stashLiveScene.ts`, `gradient-explorer/v2/fromGmt.ts`, `app-gmt/main.tsx`
  (grep `resolveBootPreset`), `store/engineStore.ts` (grep `markSceneUnsaved`). Guards:
  `npm run test:scene-stash`, `npm run smoke:gmt-gx-handoff`.

## Context

GMT's My Gradients panel has a button that opens the Gradient Explorer. It opened a new tab
(`window.open(…, '_blank', 'noopener')`) and carried nothing, so the Explorer started from its own
session. Its "Back to GMT" was a plain link to `app-gmt.html` in the Explorer's tab, which booted a
second, fresh GMT on the default Mandelbulb. The owner, walking the swap on 2026-09-23, read that
as lost work, and asked for two things: the scene should survive the round trip, and the
Explorer should open on the gradient they had in GMT.

GMT's autosave is opt-in and off by default, and a normal boot never restores anything; the only
existing restore-on-boot was the Google sign-in stash (`oauthSceneStash.ts`), a one-shot copy of
the scene that expired after five minutes.

## Decision

**1. A gradient goes one way, through a one-shot key.** The Explorer button writes
`gmt.gx.incoming` (`{config, name, favId?}`, two-minute life). The Explorer reads and clears it on
boot, and makes it the working gradient with source "From GMT", replacing whatever the Explorer
restored from its own session — exactly what a share link does. What is sent, in order: the last
favourite applied from My Gradients in that tab, while its layer still shows it (then the Explorer
also shows it selected); otherwise the gradient the panel's Destination points at; otherwise
gradient 1. A candidate that is one flat colour counts as none (a fresh Mandelbulb's gradient 1 is
one white stop), and with nothing left the Explorer opens as it would on its own (owner,
2026-09-24). The last-applied favourite is remembered per tab in memory, not in storage, so it
cannot leak into another GMT tab or survive a reload.

**2. Back to GMT returns to the tab you came from.** When the Explorer was opened by GMT's button,
Back to GMT (the link, the phone menu item and the GMT wordmark alike) asks the tab that made the
trip whether it is still there, over a `BroadcastChannel`. If it answers, the Explorer tab closes
and the user is back in their untouched GMT. `window.close()` on a `noopener` tab was checked in
Chromium, Firefox and WebKit builds and is allowed there.

**3. A scene stash is the safety net.** If that tab does not answer — closed, reloaded, or
discarded by a phone — Back to GMT navigates to `app-gmt.html?from=gx`. The Explorer button stashed
the scene before opening the Explorer (camera flushed, WITHOUT the My Gradients documents:
restoring them would merge and resurrect gradients deleted in the Explorer). `resolveBootPreset`
restores a `'gx'` stash only with that flag, and if the stashed scene had unsaved changes it
stays marked unsaved (`markSceneUnsaved`), so the leave-page prompt still guards it.
`oauthSceneStash.ts` is generalised into `sceneStash.ts`: one slot per reason, `'oauth'` five
minutes as before, `'gx'` twenty-four hours — the flag gates the restore, so the lifetime only
bounds how long an unclaimed copy uses storage.

**4. Nothing comes back.** The Explorer sends no gradient to GMT. The 2026-09-07 decision stands:
the Explorer's working gradient already reaches GMT's My Gradients through the shared Recent
group.

## Consequences

- Only the Explorer trip gets a stash. Reloads and crashes remain covered by GMT's opt-in
  autosave, as before.
- A stash is a full scene without documents (about 34 KB for the default scene) in the same
  localStorage budget as `gmt.favients` and the Explorer's session; a failed write is reported,
  not silent, and the trip still happens.
- The sign-in path now also flushes the camera, and a failed sign-in write no longer leaves an
  older scene behind; its keys and lifetime are unchanged.
- Fluid Toy's opener is unchanged: it still opens the Explorer with nothing and no Back link.
