# ADR-0123: The GMT gradient file is a PNG that carries its own data, and one loader reads every gradient file

- **Status:** Accepted
- **Date:** 2026-09-14
- **Relates to:** ADR-0122 (the two gradient forms this file carries); ADR-0119 (a save is drawn
  where it lands — imports now follow it); ADR-0121 (the session file, which this loader routes
  but does not replace). Plan: `plans/gradient-file-format.md`. Measurement that motivated it:
  `debug/test-gradient-roundtrip.mts`.

## Context

The owner exported a gradient as CSS and as CSS variables, imported both, and "neither
appeared". Measured the same day (`debug/test-gradient-roundtrip.mts` plus the browser):

- No FILE the Explorer writes brings a gradient back. Every registry format writes the 256-texel
  ramp (or a reduction of it), so authored stops, bias, interpolation, blend and colour space are
  gone by nature, and the importer re-fits. Only a share link, a session file, the whole-shelf
  collection JSON and in-editor paste were exact — none of them a "save this gradient" file.
- No import keeps the NAME, even from formats that write one (.json, .gpl): the importer names
  every gradient after its filename, and `slugName` had already mangled that ("Sea Glass é" →
  `Sea_Glass_`).
- A `{stops:[…]}` JSON (the editor's own copy shape) imported with its colours evenly respaced.
- CSS variables imported as one flat colour; design tokens were refused; set exports (.zip)
  were not accepted anywhere; a collection or session JSON dropped on the Explorer dead-ended.
- Imports landed in Kept while the user looked at the catalogue — invisible but for a toast.
  That is the "neither appeared".
- The favourites dedupe signature ignores blend and bias, so a merge silently dropped a
  gradient that differed from another only in blend (ΔE 0.109).

## Decision

1. **One payload.** A GMT gradients document:

   ```json
   {
     "format": "gmt-gradients",
     "version": 1,
     "gradients": [
       { "name": "Sea Glass é",
         "config": { "stops": [ … ], "colorSpace": "srgb", "blendSpace": "oklab" },
         "group": "g-ocean", "origin": { … }, "source": "…", "createdAt": 1757800000000 }
     ],
     "groups": { "g-ocean": "Ocean" }
   }
   ```

   `config` is either ADR-0122 form, verbatim (stop ids optional). `name` is the name as typed.
   `group`, `groups`, `origin`, `source`, `createdAt` are optional. One gradient, one set and the
   whole shelf are the same document with more entries. Readers accept, and route, the legacy
   Favients collection (`{version: 1, favients, groupLabels}`), which `exportCollection` wrote
   before this ADR.

2. **The file is a PNG by default.** The payload rides in an `iTXt` chunk with keyword
   `gmt-gradients` (never the scene keys, so a scene loader and a gradient loader each ignore
   the other's files). The PIXELS are the data too, so a PNG whose metadata was stripped (chat
   apps, social sites, "copy image") still imports with exact colours, as ramp gradients:
   - width 1024: each of the 256 texels is a 4-px column, nearest-neighbour, opaque RGB8;
   - one horizontal band per gradient, every row of a band identical; band height 128 px for
     one gradient, 32 px for a set, dropping to 16 then 8 as the count grows so the image stays
     at or under 16,384 px tall (a larger document still writes every gradient in the
     metadata; its pixels carry the first 2,048);
   - written by our own pure encoder (no canvas, no colour management, no gAMA/iCCP), so the
     bytes are exactly the texels.
   JSON (`.gmt-gradients.json`) is the same payload as plain text — offered beside PNG, and the
   form a developer or a backup reads.

3. **One loader.** Every gradient-file entrance — the file picker, a drop anywhere, the
   collection menu — goes through one router that decides by CONTENT, not by extension or by
   which menu was used:
   - PNG → `gmt-gradients` metadata → the payload; no metadata but our band layout → exact ramps;
     a scene PNG → "that is a GMT scene"; anything else → the existing image extraction (drop
     path only).
   - JSON → `format: "gmt-gradients"` / legacy collection → the payload; a session envelope →
     the session loader; a GX Global wire; a bare config or `{stops}` (editor copy) → exact
     stops; `{name, colors}`, design tokens → colours.
   - .zip → each entry through the same router.
   - text formats (.map .gpl .ggr .cpt .css — including CSS variables) → a ramp through the
     existing parsers, now returning the NAME the file carries when it carries one.

4. **Where an import lands, and that you see it.** Into the set you are viewing when it is
   yours; otherwise, a document that names one set lands in a set of that name (created when
   missing); otherwise Kept. Then the view shows the destination (ADR-0119). A document with
   more than one set is a collection: a drop merges it (never replaces); the menu keeps Load &
   merge / Replace.

5. **What the file export is for.** The PNG (and its JSON) is the Explorer's save: first in the
   Export menu for a gradient and for a set, and what "Save collection" writes. The registry
   formats stay, as exports to OTHER software; they are lossy by nature and are not how GX saves.

## Consequences

- A gradient saved from GX comes back exactly — stops, bias, interpolation, blend, colour space,
  name, set and catalogue credit — and a stripped copy of the same file still comes back with
  exact colours.
- The favourites signature learns blend, bias and interpolation (colour space stays out: the same
  stops in `linear` and `srgb` display identically), so two gradients that differ only there
  stop deduping into one. Existing shelves lose nothing — more gradients become distinct.
- Guard: `debug/test-gradient-roundtrip.mts` stops being a report and asserts a fidelity per
  path — exact for the GMT file (PNG and JSON) and its stripped PNG (colours), exact colours for
  .map/.gpl/.ggr/.cpt/.json, names where the file carries one, sets and zips by count and order.
