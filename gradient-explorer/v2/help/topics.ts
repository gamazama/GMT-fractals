/**
 * The Gradient Explorer's own help — the topic map GX hands `setHelpTopicsLoader`
 * (./installGxHelp.tsx), in place of GMT's fractal-renderer topics. Lazy: only
 * `import()`ed when Help first opens.
 *
 * OWNER REVIEW (2026-09-13): every word here is a first draft for the owner to rewrite. It
 * was written from the live v2 shell — control titles in WorkingHero / Tray / SetRail /
 * BrowseStage, the key handlers that actually exist — not from the design doc, whose
 * vocabulary predates Phases A–F. Keep it that way: a sentence here that the shell does
 * not do is worse than no sentence.
 *
 * Rendered by components/HelpBrowser.tsx's small markdown: `##`/`###` headings, `- `
 * bullets, `**bold**`, `> ` muted asides, `---` rules. Categories must be ones HelpBrowser
 * orders (types/help.ts `HelpSection['category']`).
 *
 * THE CHANGELOG: newest entry first, under a `## <GX_VERSION> — <title>` heading with a
 * `> <date>` line, and bump ../version.ts in the same change — that is what relights the
 * What's New dot.
 */

import type { HelpSection } from '../../../types/help';
import { GX_TOPIC } from './ids';

const topic = (t: HelpSection): [string, HelpSection] => [t.id, t];

export const GX_HELP_TOPICS: Record<string, HelpSection> = Object.fromEntries([
  topic({
    id: GX_TOPIC.gettingStarted,
    category: 'Getting Started',
    title: 'Welcome to Gradient Explorer',
    content: `
Gradient Explorer is for finding, making and exporting colour gradients.

## The screen, top to bottom
- **The gradient you are working on** — its name, its colours as a palette, and the gradient bar with its stops. It appears once you pick something.
- **The sets** — a row of chips: All, GX global, Presets, your Recent days and your own groups.
- **The wall** — every gradient in the sets you have switched on.

## Start here
- **Click a gradient on the wall.** It becomes the gradient you are working on — a preview.
- **Click it again, or drag one of its stops,** to start editing it.
- **Press ♥** to keep it in My Gradients. **Share** copies a link that opens it; **Export** gives you a file; **Wallpaper** fills the screen with it.

> Everything you work on is added to Recent in My Gradients by itself, so a gradient you lost track of is under Today.
`,
  }),
  topic({
    id: GX_TOPIC.wall,
    category: 'Getting Started',
    parentId: GX_TOPIC.gettingStarted,
    title: 'The wall and the sets',
    content: `
## Sets
- **All** is the whole catalogue. **GX global** holds gradients people using the app have shared. **Presets** are the starter gradients. **Today**, **Yesterday** and older dates are what you worked on. **Kept** and named groups are yours.
- **Click a chip** to add that set to the wall or take it off. **Ctrl-click** shows that set alone.
- **Drop a gradient on a chip** to file it there, or on the + to start a new group.

## Narrowing the wall
- **Search** by name, and open **Filters** for look, sources and how the wall is arranged.
- **More like this** (Similar on a phone), next to the name of the gradient you are working on, sorts the wall by how alike the colours look. Right-click any gradient on the wall for the same.
- On a computer, the tools down the wall's left edge zoom, and on All they narrow the wall to what you draw round — a box, a lasso or a brush.
- Once the wall is narrowed to 400 or fewer, **Keep these** files them as a new group.
- In your own sets, drag across the wall's background to select several; **Delete** removes them from My Gradients.

## Your own files
Drop gradient files anywhere on the page to import them — a GMT gradient PNG, a set's .zip, CSS, GIMP, .map and more. They go into the set you are looking at when it is one of yours, and the wall shows where they landed. Drop an image anywhere to make a gradient from it.
`,
  }),
  topic({
    id: GX_TOPIC.editing,
    category: 'Getting Started',
    parentId: GX_TOPIC.gettingStarted,
    title: 'Editing a gradient',
    content: `
## Stops
- **Drag a stop** along the bar to move it. **Click the bar** to add one.
- Select a stop to see its colour and settings below the bar. **Delete** removes the selected stops.

## The four faces
The tabs under the gradient open one face at a time, over the wall:
- **Mix** blends your gradient with another. Pick the other one from the wall or My Gradients, then set how much Lightness, Chroma and Hue come from each.
- **Image** makes a gradient from a picture — choose one, or drop or paste it anywhere.
- **Curves** shapes the lightness, chroma and hue curves of the gradient.
- **Adjust** changes hue, chroma and contrast, and lightness, and adds posterize, scale (with mirrored tiles), phase and noise. Apply keeps the result and starts the dials fresh; Cancel throws the change away.

Leaving a face keeps what it did. The chip next to the name takes you back to how the gradient was before.

> Undo and redo cover faces opening and closing too, so undo gets you back to where you were.
`,
  }),
  topic({
    id: GX_TOPIC.using,
    category: 'Getting Started',
    parentId: GX_TOPIC.gettingStarted,
    title: 'Keep, share, export, wallpaper',
    content: `
- **♥ Keep** saves the gradient to My Gradients. Press it again to remove it.
- **Share** copies a link. Opening the link opens that gradient.
- **Export** saves a **GMT gradient** PNG, which opens back exactly — stops, name, set and credit. Below it are formats for other software — CSS, SVG, JSON, Photoshop .grd, GIMP, Adobe swatches, Cinema 4D and Blender scripts, a Fractint .map and more — as a smooth ramp or as its palette of swatches. The export button on the set row exports every gradient in the sets you have on the wall at once (not All).
- **Wallpaper** fills the screen with the gradient in a pattern — Linear, Radial, Conic, Liquify, Spline, Fractal and more — and saves it as an image.
`,
  }),
  topic({
    id: GX_TOPIC.shortcuts,
    category: 'General',
    title: 'Keyboard Shortcuts',
    content: `
## Everywhere
- \`Ctrl+Z\` — undo
- \`Ctrl+Y\` or \`Ctrl+Shift+Z\` — redo
- \`Esc\` — clear the wall's selection, then close the open face, then cancel picking a gradient to mix with

## Stops (with a stop selected)
- \`Delete\` or \`Backspace\` — remove the selected stops
- \`←\` \`→\` — nudge them; hold \`Shift\` for bigger steps
- \`Ctrl\`+drag a stop — duplicate it

## The wall
- \`←\` \`→\` \`↑\` \`↓\`, \`Home\`, \`End\` — move between gradients
- \`Enter\` or \`Space\` — pick the gradient
- \`Delete\` — remove the selected gradients from My Gradients
- \`[\` \`]\` — brush size, while the brush tool is on
- Middle-drag zooms, right-drag pans

> On a Mac, use ⌘ where this says Ctrl.
`,
  }),
  topic({
    id: GX_TOPIC.whatsNew,
    category: "What's New",
    title: "What's New",
    content: `
## 2.0.0-preview.2 — saving, opening and credits
> September 14, 2026

- **Every catalogue gradient credits where it came from.** Filters ▸ Sources and the wall's collection headers name each source and its licence, and Arrange ▸ Group by can sort the wall by Collection.
- **An export keeps the credit in its name** while the gradient is unchanged from the catalogue. GX Global is now a source too, and it won't take a catalogue gradient you haven't changed.
- **Dense gradients stay exact.** Striped and noisy palettes keep their 256 colours instead of approximate stops, Curves shows their real shape, and **Add stops** makes them editable.
- **Save a GMT gradient PNG** from Export, for one gradient or a whole set, or use Save collection for everything. It opens back exactly, with stops, name, set and credit, and still gives the exact colours if a chat app strips its data.
- **Drop any gradient file on the page** — a GMT PNG, a set's .zip, CSS, GIMP, .map and more. It keeps its name, and the wall shows the set it landed in. A dropped session file opens as your session.
- **Export** keeps Again at the top without repeats, and the PNG's size sits under GMT gradient.

---

## 2.0.0-preview — the new Gradient Explorer
> September 2026

A rebuilt Gradient Explorer, in preview beside the old one.

- **One gradient on top, the wall below.** The gradient you are working on is always at the top, as a palette and as a bar with stops you can drag. Everything else happens around it.
- **Sets on one wall.** The whole catalogue, gradients shared by other people (GX global), the presets, each day you worked and your own groups are chips over one wall — switch any of them on or off.
- **10,509 gradients** on a computer. A phone starts with 2,952 so it stays fast; Filters ▸ Sources loads the rest.
- **Four faces:** Mix with another gradient, make one from an Image, reshape it with Curves, or Adjust it.
- **More like this** sorts the wall by how alike the colours actually look.
- **Share links, Export** to file formats from CSS to Photoshop and Blender, and **Wallpaper** to fill the screen with it.
- **Works on a phone**, with its own layout.
`,
  }),
]);

/**
 * The map for this device. A phone has no keyboard, so the shortcuts page is left out along
 * with the menu item (owner, 2026-09-13). Decided once, when help first loads.
 */
export const gxHelpTopicsFor = (phone: boolean): Record<string, HelpSection> => {
  if (!phone) return GX_HELP_TOPICS;
  const { [GX_TOPIC.shortcuts]: _omit, ...rest } = GX_HELP_TOPICS;
  return rest;
};
