import{D as i}from"./deep-zoom-CtqAjvTX.js";import{e as F,au as A}from"./CollapsibleSection-4tnOC6Ox.js";import"./three-dPzokJkq.js";import"./FormulaFormat-UWix00HC.js";import"./react-KfUPlHYY.js";import"./pako-DwGzBETv.js";import"./gradientStopReducer-C2wBV-e6.js";import"./FavientsToggleButton-BfVKEMjI.js";import"./cameraKeyRegistry-Dw_xU0XS.js";import"./installStateLibrary-DGA6pUYK.js";import"./DraggableWindow-DT1mnSKV.js";import"./PwaUpdate-DmxgeQqc.js";import"./AutoFeaturePanel-b9lJ00QX.js";import"./accordionReveal-DBuFOf5J.js";import"./Undo-DKpXkRD6.js";import"./Icon-COccCZMO.js";import"./installGradientStudio-B8C-qJz7.js";import"./paintStore-T0pMyhI9.js";import"./AppErrorBoundary-Bz1Mo_S9.js";import"./ViewportFrame-IKzrXSsx.js";import"./Help-BCfNvkaq.js";import"./RenderLoop-CiCFYn3T.js";import"./index-ArYAfZYt.js";import"./Segmented-Dvq39vZD.js";import"./FlyIntegrator-FI3ZLxUL.js";import"./WhatsNew-DeQaqfJF.js";import"./SettingsAccess-Cqfz790t.js";import"./support-ChFjRNEI.js";import"./colorSchemeStore-NqX-YoIT.js";import"./pickedFile-DxZUqX5U.js";import"./AnchoredMenu-a6cMPFzg.js";import"./Session-BLF9jNh9.js";const D=[{title:"Fly mode",note:"The mode the app starts in. With the pointer over the timeline or the Route tab these keys do nothing, and Space plays the route.",rows:[{keys:["W","A","S","D"],does:"forward, left, back, right"},{keys:["Space","C"],does:"up, down"},{keys:["Q","E"],does:"roll left, right"},{keys:["Shift"],does:"four times as fast, the roll too"},{hand:"Drag the picture",does:"look; the further from where the drag began, the faster the turn"},{hand:"Wheel on the picture",does:"the fly speed, 0.01 to 8 paces a second (with Shift four notches at once, with Alt a tenth of one)"}]},{title:"Orbit mode",rows:[{hand:"Drag",does:"turn the camera about the point under the pointer"},{hand:"Wheel",does:"fly to the point under the pointer, or back from it"},{hand:"Middle drag",does:"the same flight by hand: up is towards the point, down is back"},{hand:"Right drag",does:"drag the point under the pointer; the camera moves sideways"},{keys:["Q","E"],does:"roll; the other fly keys do nothing in this mode"}]},{title:"While a route plays",rows:[{hand:"Drag the picture (Fly mode)",does:"turn the view on top of the route; the route plays on"},{keys:["Q","E"],does:"roll on top of the route; the route plays on"},{keys:["W","A","S","D","Space","C"],does:"in Fly mode: stop the route and take the camera where it is"},{hand:"The wheel, or any press in Orbit mode",does:"stop the route and take the camera where it is"}]}];[...new Set(D.flatMap(t=>t.rows.flatMap(e=>e.keys??[])))];const E="deep-zoom.",P={"timeline-hover":"with the pointer over the timeline"},W="while its window or tool is open",C={"`":"Backtick",Escape:"Esc"};function v(t){const e=A(),a=!e.endsWith("+"),s=a?e:e.slice(0,-1),m=o=>{const l=o.length===1?o.toUpperCase():o.charAt(0).toUpperCase()+o.slice(1);return C[l]??l},n=t.split("+").map(o=>o.trim()).filter(Boolean).map(o=>o.toLowerCase()==="mod"?s:m(o));return n.reduce((o,l,c)=>o+(c===0||a&&n[c-1]===s?"":"+")+l,"")}const k=t=>t.scope&&t.scope!=="global"?t.scope:"",u=t=>{var e;return((e=t.description)==null?void 0:e.trim())||`(${t.id})`};function M(t){const e=k(t);return e?` (${P[e]??W})`:""}const S=t=>u(t)+M(t);function T(t){var s;const e=/^(.*\D)(\d)$/.exec(((s=t.description)==null?void 0:s.trim())??""),a=/^(.*?)(\d)$/.exec(t.key.trim());return!e||!a||e[2]!==a[2]?null:{stem:e[1].trimEnd(),keyStem:a[1],n:Number(e[2])}}function I(t=F.list()){var m;const e=new Map;for(const n of t){const o=((m=n.category)==null?void 0:m.trim())||"Other";e.set(o,[...e.get(o)??[],n])}const a=n=>n.some(o=>o.id.startsWith(E));return[...e].filter(([,n])=>a(n)).concat([...e].filter(([,n])=>!a(n))).map(([n,o])=>{const l=[],c=new Set;for(const h of o){if(c.has(h))continue;const p=T(h);if(p){const r=[h];for(let w=p.n+1;;w++){const y=o.find(g=>{const b=!c.has(g)&&g!==h?T(g):null;return!!b&&b.n===w&&b.stem===p.stem&&b.keyStem===p.keyStem&&k(g)===k(h)});if(!y)break;r.push(y)}if(r.length>2){r.forEach(y=>c.add(y));const w=r[r.length-1];l.push({keys:[v(h.key),v(w.key)],run:!0,text:`${u(h)} to ${p.n+r.length-1}${M(h)}`,count:r.length});continue}}const f=o.filter(r=>!c.has(r)&&(S(r)===S(h)||r.key===h.key&&u(r)===u(h)));f.forEach(r=>c.add(r));const R=new Set(f.map(k));l.push({keys:[...new Set(f.map(r=>v(r.key)))],run:!1,text:R.size>1?u(h):S(h),count:f.length})}return{title:n,rows:l}})}const x=t=>t.map(e=>`\`${e}\``).join(" ");function O(t=F.list()){const e=["## Flying","> Heard anywhere but in a text field."];for(const a of D){e.push(`### ${a.title}`),a.note&&e.push(a.note);for(const s of a.rows)e.push(`- ${s.keys?x(s.keys):`**${s.hand}**:`} ${s.does}`)}for(const a of I(t)){e.push(`## ${a.title}`);for(const s of a.rows)e.push(`- ${s.run?`\`${s.keys[0]}\` to \`${s.keys[1]}\``:x(s.keys)} ${s.text}`)}return`
${e.join(`
`)}
`}const d=t=>[t.id,t],G=Object.fromEntries([d({id:i.flying,category:"Getting Started",title:"Flying and orbiting",content:"\nDeep Zoom is a 3D fractal you fly into, 77 decades deep. A decade is ten times closer.\n\n## Fly mode\nThe app starts in Fly mode.\n- `W` `S` go forward and back, `A` `D` left and right, `Space` up and `C` down.\n- **Drag the picture** to look. The further you drag from where you began, the faster the turn.\n- `Q` `E` roll.\n- Hold `Shift` to go four times as fast.\n- **The wheel on the picture** sets the fly speed.\n\nThe speed follows what is in front of you: slow near a surface, fast in open space. So one speed setting works at every depth.\n\n## Orbit mode\nWith the picture focused (click it), `Tab` switches between Fly and Orbit. So does a click on the small fly / orbit pill beside the depth.\n- **Drag** turns the camera about the point under the pointer.\n- **The wheel** flies to the point under the pointer, or back from it. A middle drag does the same by hand.\n- **Right drag** drags the point under the pointer: the camera moves sideways.\n- `Q` `E` roll. The other fly keys do nothing here.\n\n## Getting back\n- `Ctrl+Z` undoes a flight: the camera goes back to where it took off.\n- `Backspace` goes back to the place before the last jump.\n- `Home` is the place the app started with.\n- **Start view**, beside Dive on the picture, shows the whole of the formula from outside. Its settings stay.\n\n> A drag that looks the wrong way up: Settings (the gear) has Invert look Y.\n"}),d({id:i.depth,category:"Getting Started",parentId:i.flying,title:"Depth",content:`
The number at the top left of the picture is the depth: how far the camera is from what is in the middle of the picture. The Mandelbulb is about 2 across, so a depth of 1e-6 is half a millionth of it.

Each step of 1 in the exponent is ten times closer: one decade. Under the number the readout says how many decades are left to the floor.

## The scale
The column at the right edge of the picture is the whole range, 1e0 at the top and 1e-77 at the bottom, with a marker where you are. Click it to dive to that depth.

## Dive
- Type an exponent into **Dive to 1e-** and press **Dive**. \`J\` puts the cursor in the field.
- A dive flies straight ahead until the surface is that close, so point the camera at something first.
- \`Esc\` or **Stop** ends a dive, and so does a fly key that moves the camera. A drag or a roll steers it.

## How deep it goes
- 1e-50 is as deep as the picture has been checked against a second, independent calculation. Deeper works too; the readout says when you are past the checked depth.
- 1e-77 is the floor. The numbers the deep renderer counts with end there, and no dive goes below it.

\`O\` switches what is drawn over the picture: everything, the depth readout alone, or nothing.
`}),d({id:i.places,category:"Getting Started",parentId:i.flying,title:"Places",content:`
A place is where the camera is and which formula it is in. Light, colour and quality are not part of a place: jumping to one leaves them as they are.

## Ready-made
The **Places** tab opens with four sets of cards. Every card jumps to its place in a moment; to dive, use the Dive field.
- **Mandelbulb**: the bulb from outside down to 3.4e-76, at the depth on each card.
- **Mandelbox** and **KaliBox** switch to their formula as they jump.
- **Kept places**, starred, are places kept for what they show.

## Your own
- \`B\`, or **Save this place**, adds the place to **My places**, with a picture and its depth as the name. Double-click the name to change it.
- Click a row to go there. The list is in order of depth.
- The first nine you saved are numbered: \`1\` to \`9\` go to them, and \`Ctrl+1\` to \`Ctrl+9\` replace one with the place on screen. Not while you are flying.
- Every jump is one undo step, and \`Backspace\` takes you back.

## Sharing
At the foot of the tab:
- **Paste link or place** jumps to the place in a link from **Copy link**: its camera and formula, not its light and colour. It takes a place copied as text too.
- **Copy link** makes a link that opens this place with its light and colour.
- **File…** has three more: **Export** saves My places as one file, **Import** adds the places in such a file, and **Copy as text** copies the place on screen as text. A file dropped on the app is added the same way.
`}),d({id:i.routes,category:"Getting Started",parentId:i.flying,title:"Routes",content:`
A route is a camera move through keyframes: views you set along the way. It is kept on the timeline, and the **Route** tab lists it.

## Keyframes
- Fly to a view and press \`K\`, or **Add keyframe**. Fly on and press \`K\` again: the route now runs from the first view to the second.
- Click a row to select it. Its play button goes to its keyframe, playing the leg that arrives there, and stops on it; its other buttons replace the keyframe with the view on screen, and delete it.
- With the playhead stopped on a keyframe before the last, \`K\` gives that keyframe the view on screen: the button then reads **Replace keyframe**.
- A row is red when its leg passes through the solid. Move one of its two keyframes, or add one between them.
- The ⋯ menu beside **Route to here** has **Delete selected**, for the rows you selected, and **Clear route**, for all of it. One undo brings either back.
- \`T\` opens the timeline, where a keyframe can be moved in time.
- With the pointer over the Route tab, as over the timeline, \`Space\` plays and pauses the route and \`Ctrl+Z\` undoes its edits; the fly keys wait until the pointer leaves.

## From the trail
The app remembers how you fly. That is the trail, and its line on the Route tab says how deep and how long it is.
- **Route to here** makes the route from the trail: from where it began to this view, without the dead ends. It replaces the route, and asks first when the route has keyframes you set by hand.
- When a jump ends a trail that went deep, that trail is kept: **Route from the previous trail**, in the ⋯ menu, makes the route from it.
- The **Trail** button switches the remembering off and on.

## Timing
- **As flown** times a route made from the trail the way you flew it.
- **Even** times every leg by its length on screen, half a decade a second. Of the two, the one the route is in is lit.
- **Smooth...** evens out how fast the picture moves, over the whole route or the legs you selected, with a graph of it before and after.
- **Reverse** makes the route run the other way: its last keyframe becomes the first. One undo brings it back.
- The line under them gives the route's keyframes, its length, its first and last depth, and its pace: the decades it goes a second.

## Playing
- **Play** runs the route from the playhead to its last keyframe.
- A fly key that moves, the wheel, or anything in Orbit mode stops it and hands you the camera where it is.
- When the camera is not on the route, the tab says so, and **Return** puts it back.

## Free look
While a route plays in Fly mode, a drag on the picture or \`Q\` \`E\` turns the view, and the route plays on under it. The turn is gone when playback stops, unless the timeline's record button is on: then it is kept with the route, and **Clear** removes it. The record button goes off when that playback stops.

> A scene saved from the File menu keeps the route. A link does not carry it.
`}),d({id:i.rendering,category:"Getting Started",parentId:i.flying,title:"Rendering",content:`
**Render**, on the Route tab and on the timeline (and Render route in the File menu), makes the route into pictures: one for every frame from the first keyframe to the last. With no route it renders the timeline as it is. The dialog opens on what you set the last time, and Escape closes it.

## Video or frames
- **Video MP4** writes one video file as the render goes; so do its higher and best quality, for newer players, and **Video WebM**. A format this browser cannot make at that size says so. **Interrupt Render** holds a video; then **Resume**, **Finish** to keep what is made so far, or **Discard**. A video cannot be continued later.
- **Frames (PNG folder)** and **Frames (JPG folder)** write one picture a frame into a folder you pick. A render you stop loses nothing: the frames written stay, and a later run can go on from them. At the end the dialog gives the ffmpeg line that makes a video of them.
- The files are named after the project, or after the route's depths, such as deep_zoom_2e0_to_1e-3.

## Size and quality
- **Size** offers the picture's own size while it is **Fixed** (**Viewport**), the window (**Screen**) and the usual video sizes; **Width** and **Height** take any other.
- **Fixed**, under the depth readout on the picture, gives the picture a size and a shape of its own: drag the size, or pick a shape from its menu. **Fill** fills the space again. **Frame size** in Quality is still how sharp the picture is drawn, up to that size.
- **Draft** is 320p and 1 sample, for a quick look at the whole route before the real render. **Final** puts back the size and the samples you had.
- **Samples / Frame**: more samples are cleaner and slower. **Internal Scale (SSAA)** draws each frame larger and shrinks it, for finer detail; 2x takes about four times as long.
- Start and End are in seconds; **Step** renders every second frame, or every third, and so on.
- The estimate says how long the render will take once a render at the same size and samples has run; during a render the dialog says about how long is left.

## When frames are already in the folder
The dialog counts them and asks.
- **Overwrite** renders every frame and replaces each file.
- **Continue** renders only the frames that are missing. It is offered when the frames there have the same long edge.
- **Cancel** renders nothing.

The route holds the camera and nothing else, so one route can be rendered with several looks. For one still picture: **Save picture** in the File menu, or \`Alt+S\`. The scene is saved inside the PNG.
`}),d({id:i.formulas,category:"Getting Started",parentId:i.flying,title:"The formulas",content:`
The **Formula** tab chooses what is drawn. Switching the formula shows the whole of the new one from outside, and undo brings back the place you were at.

## Mandelbulb
- **Power** is the exponent in the formula, 2 to 16. 8 is the classic Mandelbulb. \`-\` \`=\` change it by 1.
- **Phase theta** and **Phase phi** shift the formula's two angles.
- **Burning** mirrors every negative coordinate to the positive side at each iteration: another shape at the same place. **Burning mix** says how far, from 0 to 1. The first switch takes about ten seconds, while its renderer is built.

## Mandelbox
- **Scale** is how much each fold scales space. Negative values give another family of shapes. Between -1.02 and 1.02 there is nothing to draw, and the slider passes over that band.
- **Min Radius**, **Folding Limit**, **Fixed Radius** and **Pre-Rotation** shape the folds.
- The first switch to the Mandelbox takes a few seconds, while its renderer is built.
- The **Kleinian** card on the Places tab is the Mandelbox with no inner radius.

## KaliBox
- GMT's Kali Box, with its own **Scale**, **MinRad2**, **Translation** and **Rotation**. It has no whole to show: switching to it lands near its tip. The first switch takes a few seconds, while its renderer is built.
- The **GMT's preset** card on the Places tab is its Julia set as GMT ships it. It holds its shapes at Detail 1 only.

## Julia mode
- **Julia mode** on: the picture is the Julia set of one point. Switching it on brings back the last point you had and shows the whole of its set from outside. The first time, it takes the point at the centre of the view.
- **Constant** shows that point as three numbers, while Julia mode is on. Drag or type one and the set changes as you go; the camera stays where it is. Each can be keyframed.
- **Julia from this place** always takes the point at the centre of the view and shows the whole of its set. Pressed inside a Julia set, it takes the next point from there.
- Undo, or \`Backspace\`, brings back the place you were at.

## Iterations
- **Iterations** is the lowest count; its row also says the count in use. \`[\` \`]\` change it by 1.
- With **Auto iterations** on, the count rises by itself as you go deeper, and never falls. \`I\` switches it.
`}),d({id:i.look,category:"Getting Started",parentId:i.flying,title:"Light, colour and quality",content:`
The three tabs on the right change how the picture looks, never where you are. \`H\` shows what each row does, under the row.

## Light
- **Light type**: Direct, Lamp (a light at the camera that fades with distance) or Both. \`L\` steps through them.
- **Key** and **Lamp** are how bright the key light and the lamp are. The other rows place the key light and set the sky, the shadows, the occlusion, the surface and the haze; **Reflection** tones down a surface that mirrors too much light.
- The fold at the foot of the tab holds the rest. **Occlusion radius** is how far round each point the occlusion looks. **Occlusion samples**: more of them take the grain out of a picture that is moving. **Shading**: Classic is one light fixed to the camera, with no shadows; New, the default, has lights that follow the surface in view, with shadows.

## Colour
- **Plain** is one colour over the whole surface. **Gradient** takes a colour from the gradient for each point.
- **Mapping** is what picks the colour: Orbit trap or Iterations. **Scale** is how often the gradient repeats.
- The star beside the gradient opens My Gradients, and the button next to it the Gradient Studio.
- \`V\` steps through Plain, Iterations and Orbit trap.

## Quality
- When the camera stops, the picture sharpens: **Accumulate** averages up to 64 samples into it.
- **Frame size** is the long edge of the picture in pixels; its row says the size drawn. **Detail** is how close rays get to the surface; \`F\` \`G\` lower and raise it.
- **Accuracy**, folded, holds the finer rows. **Reach** is how far a ray travels before it gives up. **Hit refine** removes cuts and slices that show on a surface before the picture has sharpened.
`}),d({id:i.shortcuts,category:"General",title:"Keyboard Shortcuts",get content(){return O()}}),d({id:i.whatsNew,category:"What's New",title:"What's New",content:"\n## 0.1.0 — Deep Zoom\n- **Fly into a Mandelbulb, a Mandelbox or a KaliBox, down to 1e-77.** Each has a Julia mode.\n- **Fly or Orbit** (`Tab`), or type a depth and **Dive** to it; `B` saves a place and `1` to `9` go back to them.\n- **Schedule by iteration**: the button beside the Mandelbox's rows, the Mandelbulb's phase or the Julia constant gives it other values at chosen iterations, so a dive changes as it goes deeper; each value can be keyframed.\n- **Routes**: `K` drops a keyframe as you fly, and **Play** flies through them.\n- **Render** a route as a video (MP4 or WebM) or as PNG or JPG frames, at GMT's sizes; **Fixed** gives the picture its own size and shape.\n\n### If you used the earlier prototype\n- **Drag the picture to look.** `Q` `E` roll; `Space` and `C` go up and down.\n- `V` is the colouring and `O` the overlays; `1` to `9` are saved places.\n- The trail remembers how you fly: no record key. `Alt+S` saves a PNG.\n"})]),fe=()=>G;export{G as DZ_HELP_TOPICS,fe as dzHelpTopics};
