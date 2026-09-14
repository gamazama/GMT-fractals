# The GMT gradient file — plan and progress

Decision: `docs/adr/0123-the-gradient-file-is-a-png.md` (owner, 2026-09-14: "png with metadata";
"a solid plan"). Measurement: `debug/test-gradient-roundtrip.mts` (report mode until item 4).

## Owner report that started it

Exported a gradient as CSS linear-gradient and as CSS variables, imported both: "neither
appeared". Reproduced in the browser: both import, into Kept, while the view stays on the
catalogue — only a toast says so. CSS variables came in as one flat colour. Both downloads were
named `Sea_Glass.css`.

## Work breakdown

1. **Payload + PNG + loader** (`palette/core/gradientDocument.ts` new, `palette/core/gradientPng.ts`
   new, `utils/pngCodec.ts` new if needed, `palette/core/importGradientFiles.ts` becomes the router,
   `palette/store/favientsStore.ts`): the document codec and legacy readers; the PNG writer (pure,
   metadata + band layout) and reader (metadata → band pixels → not ours); .zip entries; session /
   collection JSON routed instead of dead-ending; names from the file (un-slugged filename only as a
   fallback); Decision 4's destination rule; `exportCollection` writes the document;
   `favientSig` learns blend / bias / interpolation; a merge keeps Recent one block at the top.
2. **Format fixes** (`palette/core/importFormats.ts`, `palette/core/exportFormats.ts`,
   `gradient-explorer/v2/shareUrl.ts`): parsers return the name a file carries and an exact config
   for `{stops}` JSON; CSS variables and design tokens import their colours; builders write the name
   into .gpl/.ggr/.cpt/.grd; the CSS variables / tokens / Tailwind downloads stop sharing a filename
   with CSS / JSON; CSS honours the stop budget; an unsupported extension is refused rather than
   sniffed as something else; share-link positions precise enough not to move a step edge.
3. **UI** (after 1–2): Export menu offers the GMT file (PNG default, JSON) first for a gradient and a
   set; Save collection writes it; picker `accept` and the drop path take .png/.zip; a PNG drop reads
   gradient metadata before image extraction; a session file dropped opens as a session; after an
   import the view shows where it landed; app-gmt's Favients menus use the same loader.
4. **Guard**: the round-trip harness asserts (ADR-0123 Consequences), joins `test:palette`.

## Status

- 2026-09-14: ADR-0123 written; round-trip report in; browser repro done. Items 1 and 2 dispatched.
- 2026-09-14, later: items 1 and 2 landed, `test:palette` green incl. the new `test:gradient-file`
  (32 falsifications) and 34 falsifications across the format harnesses. Decisions the build made
  beyond the ADR, recorded so nobody re-derives them:
  - an app-gmt `.gmf` scene's favourites document is now the new document; an OLDER build reads a
    newer scene's favourites as empty (harmless: scene restore only adds);
  - one-stop favourites stay accepted from collection files ("existing shelves lose nothing");
  - duplicates are judged within the DESTINATION set (a multi-set document: against the shelf);
  - a merge keeps every group one contiguous run, Recent first;
  - a stripped 128-px-tall PNG of identical rows is read as ONE gradient (it could be four at 32);
  - share links keep 4 decimals unless a stop would cross a texel, then more — ordinary links are
    byte-identical;
  - CSS variables / design tokens import their 11 colours evenly spaced (lossy by nature); names
    written as `gradient` by older exports are treated as no name.
  Item 3 (UI) dispatched.
- 2026-09-14, done: item 3 — Export menu "For GMT" band (GMT gradient .png first, .json) for a
  gradient and a set, "For other software" below; Save collection (.png / .json); Load & merge /
  Replace read PNGs (Replace refuses anything but a gradients document); drops route gradient
  files — PNG included — through the loader before image extraction; a session file opens as a
  session; the view shows where an import landed (the owner's "neither appeared"). New
  `npm run smoke:ge-gradientfile` [a]–[f], falsified four ways. Item 4 — `test:gradient-roundtrip`
  asserts 977 cells by class (EXACT / COLOURS / REDUCED / EXPORT-ONLY / NAME / SETS), last link of
  `test:palette`, falsified five ways. Its probe found one more gap, fixed: a bare `{stops}` config
  the gate would thin imported as "exact" minus the stop; now it falls to the colour reader
  (`everyStopKept`, test-gradient-file [8]).

## Still open

- Registry downloads (not the GMT file) still name files with `slugName`, which collapses spaces
  and non-ASCII — a format with no name field of its own comes back as e.g. "Stufe B nder".
  `smoke:ge-hero` [8] pins today's credited filename, so changing it is a deliberate step.
- A gradient PNG dropped on app-gmt's SCENE loader toasts "Couldn't read a scene" (File ▸ Load
  Scene only warns in the console). Routing it to the Favients import there is not built.
- Wording to confirm with the owner: "For GMT", "For other software", "GMT gradient".
