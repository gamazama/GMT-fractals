import{G as e}from"./gradient-explorer-next-DYkpi7I1.js";import"./CollapsibleSection-CjDeHF6T.js";import"./react-KfUPlHYY.js";import"./pako-DwGzBETv.js";import"./three-0VA8E5V9.js";import"./FormulaFormat-BMI4gmfD.js";import"./createSingleSlot-BAHyf9Ga.js";import"./gradientEditorEntrance-CfFverW5.js";import"./Undo-D3PSjNoz.js";import"./installPaletteSettings-Co9ipAuv.js";import"./createBlueNoiseWebGL2-DPCFizNT.js";import"./support-CGvH0LDm.js";import"./colorSchemeStore-CDjzN0eW.js";import"./KeyframeInspector-Bsgt8fdA.js";import"./AdvancedGradientEditor-Dc7kdjEp.js";import"./AnchoredMenu-BV0VOP6g.js";import"./MobileViewportShell-OkYrQ6Wl.js";import"./roundRectPath-CmLijJrG.js";import"./gradientSeam-DECbWJSv.js";import"./AppErrorBoundary-Ct3ifPYp.js";import"./Help-DR55iOGy.js";import"./WhatsNew-CH0hkW-x.js";import"./useGlobalContextMenu-D6KSghVM.js";const t=o=>[o.id,o],a=Object.fromEntries([t({id:e.gettingStarted,category:"Getting Started",title:"Welcome to Gradient Explorer",content:`
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
`}),t({id:e.wall,category:"Getting Started",parentId:e.gettingStarted,title:"The wall and the sets",content:`
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
Drop gradient files anywhere on the page to import them. Drop an image anywhere to make a gradient from it.
`}),t({id:e.editing,category:"Getting Started",parentId:e.gettingStarted,title:"Editing a gradient",content:`
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
`}),t({id:e.using,category:"Getting Started",parentId:e.gettingStarted,title:"Keep, share, export, wallpaper",content:`
- **♥ Keep** saves the gradient to My Gradients. Press it again to remove it.
- **Share** copies a link. Opening the link opens that gradient.
- **Export** copies or downloads the gradient in a file format — CSS, SVG, JSON, Photoshop .grd, GIMP, Adobe swatches, Cinema 4D and Blender scripts, a Fractint .map and more — as a smooth ramp or as its palette of swatches. The export button on the set row exports every gradient in the sets you have on the wall at once (not All).
- **Wallpaper** fills the screen with the gradient in a pattern — Linear, Radial, Conic, Liquify, Spline, Fractal and more — and saves it as an image.
`}),t({id:e.shortcuts,category:"General",title:"Keyboard Shortcuts",content:"\n## Everywhere\n- `Ctrl+Z` — undo\n- `Ctrl+Y` or `Ctrl+Shift+Z` — redo\n- `Esc` — clear the wall's selection, then close the open face, then cancel picking a gradient to mix with\n\n## Stops (with a stop selected)\n- `Delete` or `Backspace` — remove the selected stops\n- `←` `→` — nudge them; hold `Shift` for bigger steps\n- `Ctrl`+drag a stop — duplicate it\n\n## The wall\n- `←` `→` `↑` `↓`, `Home`, `End` — move between gradients\n- `Enter` or `Space` — pick the gradient\n- `Delete` — remove the selected gradients from My Gradients\n- `[` `]` — brush size, while the brush tool is on\n- Middle-drag zooms, right-drag pans\n\n> On a Mac, use ⌘ where this says Ctrl.\n"}),t({id:e.whatsNew,category:"What's New",title:"What's New",content:`
> OWNER REVIEW — first draft.

## 2.0.0-preview — the new Gradient Explorer
> September 2026

A rebuilt Gradient Explorer, in preview beside the old one.

- **One gradient on top, the wall below.** The gradient you are working on is always at the top, as a palette and as a bar with stops you can drag. Everything else happens around it.
- **Sets on one wall.** The whole catalogue, gradients shared by other people (GX global), the presets, each day you worked and your own groups are chips over one wall — switch any of them on or off.
- **11,131 gradients** from six collections on a computer. A phone starts with 3,076 so it stays fast; Filters ▸ Sources loads the rest.
- **Four faces:** Mix with another gradient, make one from an Image, reshape it with Curves, or Adjust it.
- **More like this** sorts the wall by how alike the colours actually look.
- **Share links, Export** to file formats from CSS to Photoshop and Blender, and **Wallpaper** to fill the screen with it.
- **Works on a phone**, with its own layout.
`})]),I=o=>{if(!o)return a;const{[e.shortcuts]:i,...r}=a;return r};export{a as GX_HELP_TOPICS,I as gxHelpTopicsFor};
