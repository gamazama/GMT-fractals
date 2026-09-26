import{G as e}from"./main-DcAgRh0u.js";import"./CollapsibleSection-OB5uYY0v.js";import"./react-KfUPlHYY.js";import"./pako-DwGzBETv.js";import"./three-D_TtD-pt.js";import"./FormulaFormat-7OOyb8Ho.js";import"./createSingleSlot-BAHyf9Ga.js";import"./gradientStopReducer-C4GQUCYD.js";import"./AppErrorBoundary-BizO4abA.js";import"./Undo-BK4N6rQp.js";import"./AutoFeaturePanel-C0s0BKH2.js";import"./support-BZkkz93b.js";import"./colorSchemeStore-GNqMXcfM.js";import"./Help-CozcYY5Q.js";import"./WhatsNew-ChOnR9_8.js";import"./roundRectPath-BdbSocd5.js";import"./AdvancedGradientEditor-jOA5bf4c.js";import"./AnchoredMenu-DlUm_uNZ.js";import"./PaintSurface-DwmM7aVQ.js";import"./KeyframeInspector-DFfqAqCB.js";import"./gradientSeam-Dw6XCMpP.js";import"./createBlueNoiseWebGL2-VPiE-lew.js";const t=a=>[a.id,a],o=Object.fromEntries([t({id:e.gettingStarted,category:"Getting Started",title:"Welcome to Gradient Explorer",content:`
Gradient Explorer is for finding, making and exporting colour gradients.

## The screen, top to bottom
- **The gradient you are working on** — its name, its colours as a palette, and the gradient bar with its stops. It appears once you pick something.
- **The sets** — a row of chips: All, GX global, Presets, your Recent days and your own groups.
- **The wall** — every gradient in the sets you have switched on.

## Start here
- **Click a gradient on the wall.** It becomes the gradient you are working on — a preview.
- **Click it again, or drag one of its stops,** to start editing it.
- **Or start a new one** — the **start a new one** link above the colour range, or New Gradient in the gradient's ☰ menu — to begin from plain black to white.
- **Press ♥** to keep it in My Gradients. **Share** copies a link that opens it; **Export** gives you a file; **Wallpaper** fills the screen with it.

> Everything you work on is added to Recent in My Gradients by itself, so a gradient you lost track of is under Today.
`}),t({id:e.wall,category:"Getting Started",parentId:e.gettingStarted,title:"The wall and the sets",content:`
## Sets
- **All** is the whole catalogue. **GX global** holds gradients people using the app have shared. **Presets** are the starter gradients. **Today**, **Yesterday** and older dates are what you worked on. **Kept** and named groups are yours.
- **Click a chip** to add that set to the wall or take it off. **Ctrl-click** shows that set alone.
- **Drop a gradient on a chip** to file it there, or on the + to start a new group.

## Narrowing the wall
- **Search** by name, and open **Filters** for look, sources and how the wall is arranged.
- **More like this** (Similar on a phone), next to the name of the gradient you are working on, sorts the wall by how alike the colours look. Right-click any gradient on the wall for the same.
- On a computer, the tools down the wall's left edge zoom, and on All they narrow the wall to what you draw round — a box, a lasso or a brush.
- Once the wall is narrowed to 400 or fewer, **Group these** files them as a new group.
- In your own sets, drag across the wall's background to select several; **Delete** removes them from My Gradients.

## Your own files
Drop gradient files anywhere on the page to import them — a GMT gradient PNG, a set's .zip, CSS, GIMP, .map and more. They go into the set you are looking at when it is one of yours, and the wall shows where they landed. Drop an image anywhere to make a gradient from it.
`}),t({id:e.editing,category:"Getting Started",parentId:e.gettingStarted,title:"Editing a gradient",content:`
## Stops
- **Drag a stop** along the bar to move it. **Click the bar** to add one.
- Select a stop to see its colour and settings below the bar. **Delete** removes the selected stops.

## The faces
The tabs under the gradient open one face at a time, over the wall:
- **Mix** blends your gradient with another. Pick the other one from the wall or My Gradients, then set how much Lightness, Chroma and Hue come from each.
- **Image** makes a gradient from a picture. Its tab appears once a picture is loaded — click the picture slot beside the gradient, or drop or paste one anywhere.
- **Curves** shapes the lightness, chroma and hue curves of the gradient.
- **Adjust** changes hue, chroma, lightness and contrast, and adds posterize, scale (with mirrored tiles), phase and noise. Apply keeps the result and starts the dials fresh; Cancel throws the change away.
- **Paint** puts a brush on the gradient itself. Pick a brush — Paint, Smudge, Soften, Sharpen, Tone, Clone or Restore — and drag along the bar. The brush's shape under the bar is its settings: drag its feet for size, its shoulders for hardness, the bar above it for strength, the diamond for flow and the triangle below for spacing. Paint mixes in the blend mode and colour space you choose; Clone copies from the ring (Alt-click the gradient to move it). Apply keeps the painting as the gradient; Cancel throws it away. A stop action from the menu asks to add stops first, since painting leaves a gradient without them.

Another tab or a new pick applies what a face did; \`Esc\` cancels it. The chip next to the name takes you back to how the gradient was before.

> Undo also brings back the face you were in when you made the change.
`}),t({id:e.using,category:"Getting Started",parentId:e.gettingStarted,title:"Keep, share, export, wallpaper",content:`
- **♥ Keep** saves the gradient to My Gradients. Press it again to remove it.
- **Share** copies a link. Opening the link opens that gradient.
- **Export** saves a **GMT gradient** PNG, which opens back exactly — stops, name, set and credit. Below it are formats for other software — CSS, SVG, JSON, Photoshop .grd, GIMP, Adobe swatches, Cinema 4D and Blender scripts, a Fractint .map and more — as a smooth ramp or as its palette of swatches. The export button on the set row exports every gradient in the sets you have on the wall at once (not All).
- **Wallpaper** fills the screen with the gradient in a pattern — Linear, Radial, Conic, Liquify, Spline, Fractal and more — and saves it as an image.
`}),t({id:e.shortcuts,category:"General",title:"Keyboard Shortcuts",content:"\n## Everywhere\n- `Ctrl+Z` — undo\n- `Ctrl+Y` or `Ctrl+Shift+Z` — redo\n- `Esc` — clear the wall's selection, then cancel the open face, then cancel picking a gradient to mix with\n\n## Stops (with a stop selected)\n- `Delete` or `Backspace` — remove the selected stops\n- `←` `→` — nudge them; hold `Shift` for bigger steps\n- `Ctrl`+drag a stop — duplicate it\n\n## The wall\n- `←` `→` `↑` `↓`, `Home`, `End` — move between gradients\n- `Enter` or `Space` — pick the gradient\n- `Delete` — remove the selected gradients from My Gradients\n- `[` `]` — brush size, while the brush tool is on\n- Middle-drag zooms, right-drag pans\n\n## Paint\n- `Ctrl+Z` / `Ctrl+Y` — undo / redo a stroke, while the face has strokes\n- `[` `]` or the wheel over the gradient — brush size\n- Right-drag on the gradient — sideways for size, up and down for hardness\n- `Alt`+click on the gradient — Clone's source, or the colour under the brush\n- `Esc` — throw the painting away\n\n> On a Mac, use ⌘ where this says Ctrl.\n"}),t({id:e.whatsNew,category:"What's New",title:"What's New",content:`
## 2.0.0 — out of preview
> September 2026

- **This is the Gradient Explorer now.** The page GMT and Fluid Toy open shows it, and coming from GMT's My Gradients gives you a Back to GMT link. The old Explorer is gone.
- **Links shared from the preview still open.** New share links use the main address.
- **The Explorer opens on the gradient you had in GMT**, and Back to GMT returns you to your scene.
- **Paint** — a new face that puts a brush straight onto the gradient: paint, smudge, soften, sharpen, tone, clone and restore.
- **The Image tab appears once a picture is loaded** — click the picture slot, or drop or paste one anywhere.
- **Gradient ☰ menu → Reduce Stops…**
- **Gradient ☰ menu → New Gradient.**
- **The wall steps back while you edit** — it dims under Curves, Adjust, Paint and Image (click it to wake it), and its toolbar can hide it.
- **Export text preview**, and other small UX improvements.

---

## 2.0.0-preview.2 — saving, opening and credits
> September 2026

- **Every catalogue gradient credits where it came from.** Filters ▸ Sources and the wall's collection headers name each source and its licence, and Arrange ▸ Group by can sort the wall by Collection.
- **An export keeps the credit in its name** while the gradient is unchanged from the catalogue. GX Global is now a source too, and it won't take a catalogue gradient you haven't changed.
- **Dense gradients stay exact.** Striped and noisy palettes keep their 256 colours instead of approximate stops, Curves shows their real shape, and **Add stops** makes them editable.
- **Save a GMT gradient PNG** from Export, for one gradient or a whole set, or use Save collection for everything. It opens back exactly, with stops, name, set and credit, and still gives the exact colours if a chat app strips its data.
- **Drop any gradient file on the page** — a GMT PNG, a set's .zip, CSS, GIMP, .map and more. It keeps its name, and the wall shows the set it landed in. A dropped session file opens as your session.
- **Export** keeps Again at the top without repeats, and the PNG's size sits under GMT gradient.

---

## 2.0.0-preview — the new Gradient Explorer
> September 2026

A rebuilt Gradient Explorer.

- **One gradient on top, the wall below.** The gradient you are working on is always at the top, as a palette and as a bar with stops you can drag. Everything else happens around it.
- **Sets on one wall.** The whole catalogue, gradients shared by other people (GX global), the presets, each day you worked and your own groups are chips over one wall — switch any of them on or off.
- **10,509 gradients** on a computer. A phone starts with 2,952 so it stays fast; Filters ▸ Sources loads the rest.
- **Four faces:** Mix with another gradient, make one from an Image, reshape it with Curves, or Adjust it.
- **More like this** sorts the wall by how alike the colours actually look.
- **Share links, Export** to file formats from CSS to Photoshop and Blender, and **Wallpaper** to fill the screen with it.
- **Works on a phone**, with its own layout.
`})]),E=a=>{if(!a)return o;const{[e.shortcuts]:n,...r}=o;return r};export{o as GX_HELP_TOPICS,E as gxHelpTopicsFor};
