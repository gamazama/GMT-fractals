var Je=Object.defineProperty;var Xe=(i,e,r)=>e in i?Je(i,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):i[e]=r;var y=(i,e,r)=>Xe(i,typeof e!="symbol"?e+"":e,r);import{c as re,f as L,z as Ke,B as We,H as k,u as b,I as Z,J as we,S as qe,E as Ye,D as $e,l as Ze,P as Qe,n as Ce,T as et,G as tt,x as it,K as rt,M as ot,N as at,O as st,r as nt,y as lt}from"./ui-Bx5ZZs2Y.js";import{r as P,j as d,R as ct}from"./three-fiber-OZZ-CFAc.js";import{u as Ue,a as ut,v as dt,T as pt,V as mt,i as ft,b as ht,c as gt,e as vt,f as xt,g as yt,d as bt}from"./Camera-DwWn0wL9.js";import{c as Mt}from"./three-drei-TKsZgtGL.js";import{H as Tt,a as wt,i as Ct,S as Rt,C as St,b as Dt,c as Ft,d as Et,h as At,e as jt}from"./CompositionOverlayControls-BwLxokZB.js";import{R as Pt}from"./RenderLoop-DnEm2w23.js";import{r as It}from"./cameraKeyRegistry-DP3sK9S4.js";import"./three-CAXFefdI.js";import"./pako-DwGzBETv.js";import"./ModulationEngine-jPJOXoF_.js";const Bt=i=>i.charAt(0).toUpperCase()+i.slice(1).replace(/-/g," "),z=(i,e,r={})=>{const t=r.defaultIndex??0,o=i.map((a,c)=>{var h;return{label:((h=r.optionLabels)==null?void 0:h[a])??Bt(a),value:c}});return{config:{type:"float",default:t,label:e,options:o,...r.extra},fromIndex:a=>{const c=Math.floor(a??t);return c<0||c>=i.length||Number.isNaN(c)?i[t]:i[c]},values:i}},ue=z(["julia","mandelbrot"],"Fractal Kind",{defaultIndex:1}),ne=ue.values,kt=ue.fromIndex,Ut={id:"julia",name:"Fractal",category:"Fractal",tabConfig:{label:"Fractal"},customUI:[{componentId:"julia-c-picker",parentId:"juliaC",condition:{param:"kind",eq:0}}],params:{kind:ue.config,juliaC:{type:"vec2",default:{x:-.36303304426511473,y:.16845183018751916},min:-2,max:2,step:.001,label:"Julia c",description:"Julia constant. Move me to reshape the entire fractal — and the forces it emits."},zoom:{type:"float",default:1.2904749020480561,min:1e-5,max:8,step:1e-4,scale:"log",label:"Zoom",description:"Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001)."},center:{type:"vec2",default:{x:-.8139175130270945,y:-.054649908357858296},min:-2,max:2,step:.01,label:"Center",description:"Pan the fractal window."},maxIter:{type:"int",default:310,min:16,max:512,step:1,label:"Iter",description:"More iterations → sharper escape gradients → finer force detail."},power:{type:"float",default:2,min:2,max:8,step:1,label:"Power",description:"z-power in the iteration. 2 = classic z²+c; higher exponents make more lobes."}}},de=z(["gradient","curl","iterate","c-track","hue"],"Force Mode",{optionLabels:{"c-track":"C-Track"}}),_t=de.values,Ot=de.fromIndex,Lt="How fractal pixels become velocity at each cell. Gradient pushes AWAY from the set. Curl swirls along level sets. Iterate follows z's orbit grain. C-Track reacts to Δc in real time. Hue makes the picture itself the velocity field.",zt={id:"coupling",name:"Coupling",category:"Simulation",tabConfig:{label:"Coupling"},params:{forceMode:{...de.config,description:Lt},forceGain:{type:"float",default:-1200,min:-2e3,max:2e3,step:.1,label:"Force gain",description:"Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid. Negative inverts the force direction."},interiorDamp:{type:"float",default:.59,min:0,max:1,step:.01,label:"Interior damp",description:"How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed."},forceCap:{type:"float",default:40,min:1,max:40,step:.5,label:"Force cap",description:"Per-pixel cap on the fractal force magnitude."},edgeMargin:{type:"float",default:.04,min:0,max:.25,step:.005,label:"Edge margin",description:'Fades force / dye injection near the canvas edges. Fixes "gushing from the borders" under fast c-changes.'},orbitEnabled:{type:"boolean",default:!1,label:"Auto-orbit c",description:"Circles c automatically around its current value. Pair with C-Track to watch the fluid breathe with the fractal's deformation."},orbitRadius:{type:"float",default:.08,min:0,max:.5,step:.001,label:"Radius",condition:{param:"orbitEnabled",bool:!0},description:"Distance c travels from its base position as the orbit circles."},orbitSpeed:{type:"float",default:.25,min:0,max:3,step:.01,label:"Speed",condition:{param:"orbitEnabled",bool:!0},description:"Orbit rate in Hz. 1 = one full circle per second."}}},Gt={colorSpace:"srgb",blendSpace:"oklab",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:.15,color:"#1a0a00",bias:.5,interpolation:"linear"},{id:"2",position:.35,color:"#8b1a00",bias:.5,interpolation:"linear"},{id:"3",position:.6,color:"#ff6b00",bias:.5,interpolation:"linear"},{id:"4",position:.85,color:"#ffdd66",bias:.5,interpolation:"linear"},{id:"5",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},pe=z(["add","screen","max","over"],"Dye blend"),Nt=pe.values,Vt=pe.fromIndex,me=z(["linear","perceptual","vivid"],"Colour space"),Ht=me.values,Jt=me.fromIndex,fe=z(["iterations","angle","magnitude","decomposition","bands","orbit-point","orbit-circle","orbit-cross","orbit-line","stripe","distance","derivative","potential","trap-iter"],"Color mapping",{optionLabels:{decomposition:"Decomp","orbit-point":"Trap · Point","orbit-circle":"Trap · Circle","orbit-cross":"Trap · Cross","orbit-line":"Trap · Line","trap-iter":"Trap Iteration",distance:"Distance Estimate",potential:"Continuous Potential",derivative:"Derivative (log|dz|)"}}),Xt=fe.values,Kt=fe.fromIndex,Wt=5,Re=6,qt=7,Se=8,Yt=9,$t=13,Zt={id:"palette",name:"Palette",category:"Look",tabConfig:{label:"Palette"},params:{gradient:{type:"gradient",default:Gt,label:"Palette",description:"Colors both the fractal AND the dye injected into the fluid. In Hue-mode (Coupling), this IS the vector field."},colorMapping:{...fe.config,description:"How the iteration-space scalar becomes a t-value into the gradient. Each mode exposes its own extra controls below."},gradientRepeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Repetition",description:"Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands."},gradientPhase:{type:"float",default:0,min:0,max:1,step:.005,label:"Phase",description:"Phase shift — rotates the colors without changing their layout."},colorIter:{type:"int",default:310,min:1,max:1024,step:1,label:"Color iter",description:"Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter — reduce for fresher colours."},trapCenter:{type:"vec2",default:{x:0,y:0},min:-2,max:2,step:.01,label:"Trap center",description:"Trap centre (complex coord). Move to pick which point in the orbit to trap against.",condition:{or:[{param:"colorMapping",eq:Wt},{param:"colorMapping",eq:Re},{param:"colorMapping",eq:qt},{param:"colorMapping",eq:$t}]}},trapRadius:{type:"float",default:1,min:.01,max:4,step:.01,label:"Trap radius",condition:{param:"colorMapping",eq:Re},description:"Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring."},trapNormal:{type:"vec2",default:{x:1,y:0},min:-1,max:1,step:.01,label:"Trap normal",condition:{param:"colorMapping",eq:Se},description:"Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length."},trapOffset:{type:"float",default:0,min:-2,max:2,step:.01,label:"Trap offset",condition:{param:"colorMapping",eq:Se},description:"Line-trap offset (scalar position along the normal direction)."},stripeFreq:{type:"float",default:4,min:1,max:16,step:.1,label:"Stripe freq",condition:{param:"colorMapping",eq:Yt},description:"Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration."},interiorColor:{type:"vec3",default:{x:.02,y:.02,z:.04},min:0,max:1,step:.001,label:"Interior color",description:"Colour for bounded points (pixels that never escape the iteration)."},escapeR:{type:"float",default:32,min:2,max:1024,step:.1,label:"Escape R",scale:"log",hidden:!0},dyeBlend:{...pe.config,description:"How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask."}}},Qt={colorSpace:"srgb",blendSpace:"rgb",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:1,color:"#000000",bias:.5,interpolation:"linear"}]},ei={id:"collision",name:"Collision",category:"Simulation",tabConfig:{label:"Collision"},params:{enabled:{type:"boolean",default:!1,label:"Collision walls",description:"Paints solid walls the fluid bounces off, sculpted by the gradient below. Same t-axis mapping as the main palette — edit stops to black = fluid, white = wall."},gradient:{type:"gradient",default:Qt,label:"Collision pattern",condition:{param:"enabled",bool:!0},description:"B&W gradient defining where walls sit along the iteration-space t-axis."},repeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Collision repeat",condition:{param:"enabled",bool:!0},description:"Tile the collision pattern along t — independent of the dye gradient repeat."},phase:{type:"float",default:0,min:0,max:1,step:.001,label:"Collision phase",condition:{param:"enabled",bool:!0},description:"Phase-shift the collision pattern so walls land where the dye doesn't."},preview:{type:"boolean",default:!1,label:"Preview walls on canvas",condition:{param:"enabled",bool:!0},description:"Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient."}}},ti={id:"fluidSim",name:"Fluid",category:"Simulation",tabConfig:{label:"Fluid"},params:{vorticity:{type:"float",default:22.1,min:0,max:50,step:.1,label:"Vorticity",description:"Amplifies existing curl — keeps fractal-induced swirls from smearing away."},vorticityScale:{type:"float",default:1,min:.5,max:8,step:.1,label:"Vorticity scale",condition:{param:"vorticity",gt:0},description:"Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices."},dissipation:{type:"float",default:.17,min:0,max:5,step:.01,label:"Velocity dissipation /s",description:"How fast velocity decays. High = fluid forgets the fractal quickly."},dyeInject:{type:"float",default:1.5,min:0,max:3,step:.01,label:"Dye inject",description:"How much of the fractal's color bleeds into the fluid each frame."},pressureIters:{type:"int",default:50,min:4,max:60,step:1,label:"Pressure iters",description:"Jacobi iterations for incompressibility. More = stricter but slower."},dyeDecayMode:{...me.config,description:"How dye fades over time. Colour space controls whether it greys out (linear) or stays hue-stable (perceptual / vivid)."},dyeDissipation:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Dye dissipation /s",description:"How fast dye fades. In linear mode this is a straight RGB multiply; in perceptual / vivid it's the OKLab luminance fade (chroma fades on its own schedule below)."},dyeChromaDecayHz:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Chroma decay /s",condition:{param:"dyeDecayMode",neq:0},description:"Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright."},dyeSaturationBoost:{type:"float",default:1,min:.5,max:1.1,step:.001,scale:"log",label:"Saturation boost",condition:{param:"dyeDecayMode",eq:2},description:"Per-frame chroma gain. 1 = neutral, <1 washes out, >1 pushes toward max saturation. Gamut-mapped in OKLab so it pegs at the saturation ceiling rather than hue-shifting to white."},simResolution:{type:"int",default:1344,min:128,max:1536,step:32,label:"Sim resolution",description:"Target fluid grid height in cells. More = finer detail, slower."},dt:{type:"float",default:.016,min:.001,max:.05,step:1e-4,label:"Δt (advanced)",description:"Integration timestep. Lower = more stable."},paused:{type:"boolean",default:!1,label:"Pause sim",description:"Freeze the fluid state. Splats and param changes still land; they just don't integrate forward."}}},ii={id:"presets",name:"Presets",category:"Library",tabConfig:{label:"Presets"},customUI:[{componentId:"preset-grid"}],params:{_anchor:{type:"float",default:0,min:0,max:1,step:1,label:"",hidden:!0}}},J=i=>i.map(([e,r],t)=>({id:`s${t}`,position:e,color:r,bias:.5,interpolation:"linear"})),ri=[{id:"coral-gyre",name:"Coral Gyre",desc:"Orbit-point colouring on a negative curl — teal interior feeds a coral halo, with filmic bloom + aberration.",params:{juliaC:[-.8173594132029339,.15279058679706603],center:[0,0],zoom:1.5,maxIter:182,power:2,kind:"julia",forceMode:"curl",forceGain:-760,interiorDamp:.9,dissipation:.1,dyeDissipation:.63,dyeInject:2.28,vorticity:25.9,vorticityScale:4.2,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:1,velocityViz:0,gradientRepeat:.56,gradientPhase:.09,colorMapping:"orbit-point",colorIter:96,trapCenter:[1.17,0],dyeBlend:"add",dyeDecayMode:"vivid",dyeSaturationBoost:1.01,toneMapping:"filmic",exposure:2.295,vibrance:1.87,bloomAmount:1.35,bloomThreshold:1,aberration:1.12,refraction:0,refractSmooth:1,caustics:3.9,interiorColor:[.02,.04,.08],edgeMargin:.04,forceCap:12,collisionEnabled:!0,simResolution:768},gradient:{stops:J([[0,"#000000"],[.202,"#05233d"],[.362,"#0f6884"],[.521,"#56c6c0"],[.681,"#f0fff1"],[.84,"#e7bd69"],[1,"#8a3f19"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.513,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.573,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"ink-canyon",name:"Ink Canyon",desc:"Monochrome dye threading between twin collision walls — one at the near edge, one deep in the field.",params:{juliaC:[-.7763636363636364,.19684858842329547],center:[.019054061889010376,-.007321977964897804],zoom:1.2904749020480561,maxIter:310,power:2,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:0,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0,simResolution:1024},gradient:{stops:J([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.02,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.07,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:.833,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c4",position:.883,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"plasma-vein",name:"Plasma Vein",desc:"Fractional power (1.5) with 7× repeated blue/red bands. Vivid chroma decay keeps the refracted dye electric.",params:{juliaC:[-.1764262149580809,.1951288073545453],center:[.21016359187729639,-.014585098813268887],zoom:.975889617512663,maxIter:310,power:1.5,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.7,dyeMix:1,velocityViz:0,gradientRepeat:7.43,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",dyeDecayMode:"vivid",toneMapping:"filmic",exposure:1.86,vibrance:1.645,aberration:.5,refraction:.006,refractSmooth:11.8,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1344},gradient:{stops:J([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.536,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.586,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"crater-drift",name:"Crater Drift",desc:"Mandelbrot under inward curl, inferno-magenta palette. Slow auto-orbit carves craters through the bloom.",params:{juliaC:[.56053050672182,.468459152016546],center:[-.9313160617349564,-.15288948147190096],zoom:1.1807159194396142,maxIter:604,power:2,kind:"mandelbrot",forceMode:"curl",forceGain:-535.6,interiorDamp:0,dissipation:.16,dyeDissipation:.05,dyeInject:3,vorticity:2.9,vorticityScale:1.2,pressureIters:48,show:"composite",juliaMix:0,dyeMix:1.01,velocityViz:0,gradientRepeat:.66,gradientPhase:0,colorMapping:"iterations",colorIter:263,trapCenter:[1.51,-1.37],dyeBlend:"max",dyeDecayMode:"perceptual",dyeChromaDecayHz:0,toneMapping:"filmic",exposure:20.63,vibrance:1.645,bloomAmount:.63,bloomThreshold:.76,aberration:.4,refraction:0,caustics:0,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:38.5,collisionEnabled:!0,simResolution:768},gradient:{stops:J([[.084,"#000004"],[.215,"#280B54"],[.346,"#65156E"],[.477,"#9F2A63"],[.607,"#D44842"],[.738,"#F52D15"],[.869,"#FA2727"],[1,"#FF7983"]]),colorSpace:"srgb",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.532,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.659,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"quartic-strata",name:"Quartic Strata",desc:"Power-4 Julia drifting on a subtle c-track. Strata of blue/red dye held by a near-edge wall.",params:{juliaC:[.7072727272727275,-.1398788174715911],center:[-.0013928986324417691,-.010035496866822907],zoom:.975889617512663,maxIter:310,power:4,kind:"julia",forceMode:"c-track",forceGain:1,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:1,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:2,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0,simResolution:1344},gradient:{stops:J([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.113,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.163,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.2}},{id:"sunset-bands",name:"Sunset Bands",desc:"Force-gradient mode with hard band colouring — sunset strata pushed inward at 1536 sim.",params:{juliaC:[-.16545454545454558,.6455757279829545],center:[-.1012543995130697,.03079433116134145],zoom:1.086757425434934,maxIter:175,power:2,kind:"julia",forceMode:"gradient",forceGain:1500,interiorDamp:5.8,dissipation:.22,dyeDissipation:.5,dyeInject:.55,vorticity:0,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:2,velocityViz:0,gradientRepeat:1.35,gradientPhase:.055,colorMapping:"bands",colorIter:175,dyeBlend:"over",aberration:.27,refraction:0,caustics:1,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:12,simResolution:1536},gradient:{stops:J([[0,"#04001f"],[.167,"#1a1049"],[.333,"#4e2085"],[.5,"#b13a8a"],[.667,"#ff7657"],[.833,"#ffc569"],[1,"#fff9d0"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"verdant-pulse",name:"Verdant Pulse",desc:"Viridis-to-magenta orbit-circle ring, wide vorticity, slow auto-orbit — the set breathes green and pink.",params:{juliaC:[-.7,.27015],center:[-.15958346356258324,-.09244114001481094],zoom:1.3957783246444389,maxIter:160,power:2,kind:"julia",forceMode:"c-track",forceGain:10,interiorDamp:.45,dissipation:.2,dyeDissipation:.17,dyeInject:.9,vorticity:16,vorticityScale:5.8,pressureIters:30,show:"composite",juliaMix:0,dyeMix:3.805,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"orbit-circle",colorIter:94,dyeBlend:"over",dyeDecayMode:"perceptual",exposure:.35,vibrance:1.645,aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,0,.04],edgeMargin:.04,forceCap:12,collisionEnabled:!0,simResolution:768},gradient:{stops:J([[0,"#000000"],[.061,"#440154"],[.143,"#46327F"],[.286,"#365C8D"],[.429,"#277F8E"],[.571,"#1FA187"],[.714,"#4AC26D"],[.857,"#3ADA62"],[1,"#FD25B6"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.037,color:"#000000",bias:.5,interpolation:"linear"},{id:"c2",position:.943,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:1,color:"#626262",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.035,speed:.02}}],he=z(["none","reinhard","agx","filmic"],"Tone mapping",{optionLabels:{agx:"AgX"}}),oi=he.values,ai=he.fromIndex,ge=z(["plain","electric","liquid"],"Style"),si=ge.values,ni=ge.fromIndex,li={id:"postFx",name:"Post FX",category:"Look",tabConfig:{label:"Post-FX"},params:{fluidStyle:{...ge.config,description:"Post-process pack. Pick a style to preset bloom / aberration / refraction, or mix them yourself below."},bloomAmount:{type:"float",default:0,min:0,max:3,step:.01,label:"Bloom",description:"Bloom strength — wide soft glow on bright pixels. Core of the electric look."},bloomThreshold:{type:"float",default:1,min:0,max:3,step:.01,label:"Bloom threshold",condition:{param:"bloomAmount",gt:0},description:"Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows."},aberration:{type:"float",default:.27,min:0,max:3,step:.01,label:"Aberration",description:"Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp."},refraction:{type:"float",default:.037,min:0,max:.3,step:.001,label:"Refraction",description:"Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass."},refractSmooth:{type:"float",default:3,min:1,max:12,step:.1,label:"Refract smooth",condition:{param:"refraction",gt:0},description:"Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient."},refractRoughness:{type:"float",default:0,min:0,max:1,step:.01,label:"Refract roughness",condition:{param:"refraction",gt:0},description:"Frosted-glass scatter for the refracted fractal. 0 = crisp polished glass (single-tap). 1 = ~5px Vogel-disc blur — light scatters into a cone like real rough surfaces. Mask + walls blur in step so glass edges stay consistent."},caustics:{type:"float",default:1,min:0,max:25,step:.1,label:"Caustics",description:"Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends."},toneMapping:{...he.config,description:"How final colour gets compressed. None = maximally vivid (may clip). AgX = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights."},exposure:{type:"float",default:1,min:.1,max:5,step:.01,label:"Exposure",description:"Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch."},vibrance:{type:"float",default:1.645,min:0,max:1,step:.01,label:"Vibrance",description:"Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones."}}},ve=z(["composite","julia","dye","velocity"],"Show",{optionLabels:{composite:"Mixed",julia:"Fractal"}}),ci=ve.values,ui=ve.fromIndex,ae=0,di={id:"composite",name:"Composite",category:"Look",tabConfig:{label:"Composite"},params:{show:{...ve.config,description:"What you see. The simulation runs the same either way. Mixed = fractal + dye + optional velocity overlay. Fractal = pure fractal, fluid hidden. Dye = fluid dye only (what the fractal wrote). Velocity = per-pixel velocity as a hue wheel."},juliaMix:{type:"float",default:.4,min:0,max:2,step:.01,label:"Julia mix",condition:{param:"show",eq:ae},description:"How much fractal color shows through in Mixed view."},dyeMix:{type:"float",default:2,min:0,max:2,step:.01,label:"Dye mix",condition:{param:"show",eq:ae},description:"How much fluid dye shows through in Mixed view."},velocityViz:{type:"float",default:.02,min:0,max:2,step:.01,label:"Velocity viz",condition:{param:"show",eq:ae},description:"Overlay velocity-hue on top of the composite. Diagnostic."}}},G=(i,e)=>{if(typeof e!="string")return;const r=i.indexOf(e);return r>=0?r:void 0},Q=i=>i?{x:i[0],y:i[1]}:void 0,pi=i=>i?{x:i[0],y:i[1],z:i[2]}:void 0,mi=i=>{const e=globalThis.__store;if(!e){console.warn("[applyRefPreset] store not ready — window.__store is undefined");return}const r=e.getState(),t=i.params,o={},l=G(ne,t.kind);l!==void 0&&(o.kind=l),t.juliaC&&(o.juliaC=Q(t.juliaC)),t.center&&(o.center=Q(t.center)),t.zoom!==void 0&&(o.zoom=t.zoom),t.maxIter!==void 0&&(o.maxIter=t.maxIter),t.power!==void 0&&(o.power=t.power),Object.keys(o).length>0&&r.setJulia(o);const n={},a=G(_t,t.forceMode);a!==void 0&&(n.forceMode=a),t.forceGain!==void 0&&(n.forceGain=t.forceGain),t.interiorDamp!==void 0&&(n.interiorDamp=t.interiorDamp),t.forceCap!==void 0&&(n.forceCap=t.forceCap),t.edgeMargin!==void 0&&(n.edgeMargin=t.edgeMargin),i.orbit?(n.orbitEnabled=i.orbit.enabled,n.orbitRadius=i.orbit.radius,n.orbitSpeed=i.orbit.speed):n.orbitEnabled=!1,r.setCoupling(n);const c={};t.vorticity!==void 0&&(c.vorticity=t.vorticity),t.vorticityScale!==void 0&&(c.vorticityScale=t.vorticityScale),t.dissipation!==void 0&&(c.dissipation=t.dissipation),t.pressureIters!==void 0&&(c.pressureIters=t.pressureIters),t.simResolution!==void 0&&(c.simResolution=t.simResolution),t.dyeInject!==void 0&&(c.dyeInject=t.dyeInject),t.dyeDissipation!==void 0&&(c.dyeDissipation=t.dyeDissipation),t.dyeChromaDecayHz!==void 0&&(c.dyeChromaDecayHz=t.dyeChromaDecayHz),t.dyeSaturationBoost!==void 0&&(c.dyeSaturationBoost=t.dyeSaturationBoost);const h=G(Ht,t.dyeDecayMode);h!==void 0&&(c.dyeDecayMode=h),Object.keys(c).length>0&&r.setFluidSim(c);const v={},w=G(Xt,t.colorMapping);w!==void 0&&(v.colorMapping=w),t.colorIter!==void 0&&(v.colorIter=t.colorIter),t.gradientRepeat!==void 0&&(v.gradientRepeat=t.gradientRepeat),t.gradientPhase!==void 0&&(v.gradientPhase=t.gradientPhase),t.trapCenter&&(v.trapCenter=Q(t.trapCenter)),t.trapRadius!==void 0&&(v.trapRadius=t.trapRadius),t.trapNormal&&(v.trapNormal=Q(t.trapNormal)),t.trapOffset!==void 0&&(v.trapOffset=t.trapOffset),t.stripeFreq!==void 0&&(v.stripeFreq=t.stripeFreq),t.interiorColor&&(v.interiorColor=pi(t.interiorColor));const C=G(Nt,t.dyeBlend);C!==void 0&&(v.dyeBlend=C),i.gradient&&(v.gradient=i.gradient),Object.keys(v).length>0&&r.setPalette(v);const m={enabled:!!t.collisionEnabled};i.collisionGradient&&(m.gradient=i.collisionGradient),r.setCollision(m);const s={},u=G(si,t.fluidStyle);u!==void 0&&(s.fluidStyle=u);const S=G(oi,t.toneMapping);S!==void 0&&(s.toneMapping=S),t.exposure!==void 0&&(s.exposure=t.exposure),t.vibrance!==void 0&&(s.vibrance=t.vibrance),t.bloomAmount!==void 0&&(s.bloomAmount=t.bloomAmount),t.bloomThreshold!==void 0&&(s.bloomThreshold=t.bloomThreshold),t.aberration!==void 0&&(s.aberration=t.aberration),t.refraction!==void 0&&(s.refraction=t.refraction),t.refractSmooth!==void 0&&(s.refractSmooth=t.refractSmooth),t.caustics!==void 0&&(s.caustics=t.caustics),Object.keys(s).length>0&&r.setPostFx(s);const f={},g=G(ci,t.show);g!==void 0&&(f.show=g),t.juliaMix!==void 0&&(f.juliaMix=t.juliaMix),t.dyeMix!==void 0&&(f.dyeMix=t.dyeMix),t.velocityViz!==void 0&&(f.velocityViz=t.velocityViz),Object.keys(f).length>0&&r.setComposite(f)};function xe(i,e){const r=e,t={current:e},o=new Set;let l=0;const n=w=>(o.add(w),()=>{o.delete(w)}),a=()=>{l++,o.forEach(w=>w())};return{name:i,ref:t,useSnapshot:()=>(P.useSyncExternalStore(n,()=>l,()=>l),t.current),subscribe:n,notify:a,reset:()=>{t.current=r,a()}}}const ee=Math.PI*2,se=(i,e,r)=>(r<0&&(r+=1),r>1&&(r-=1),r<1/6?i+(e-i)*6*r:r<1/2?e:r<2/3?i+(e-i)*(2/3-r)*6:i),_e=(i,e,r)=>{if(e===0)return[r,r,r];const t=r<.5?r*(1+e):r+e-r*e,o=2*r-t;return[se(o,t,i+1/3),se(o,t,i),se(o,t,i-1/3)]},fi=(i,e,r)=>{const t=Math.max(i,e,r),o=Math.min(i,e,r),l=(t+o)/2;if(t===o)return[0,0,l];const n=t-o,a=l>.5?n/(2-t-o):n/(t+o);let c;return t===i?c=(e-r)/n+(e<r?6:0):t===e?c=(r-i)/n+2:c=(i-e)/n+4,[c/6,a,l]},hi=(i,e)=>{if(e<=0)return i;const[r,t,o]=fi(i[0],i[1],i[2]),l=(r+(Math.random()-.5)*e+1)%1;return _e(l,t,o)},gi=(i,e)=>{if(!i||i.length<4)return[1,1,1];const r=(e%1+1)%1,t=i.length/4,o=Math.min(t-1,Math.floor(r*t))*4;return[i[o]/255,i[o+1]/255,i[o+2]/255]},Oe=i=>{let e;switch(i.mode){case"solid":e=[i.solidColor[0],i.solidColor[1],i.solidColor[2]];break;case"gradient":e=gi(i.gradientLut,(i.u+i.v)*.5);break;case"velocity":{const r=Math.min(1,Math.hypot(i.vx,i.vy)*.2),t=(Math.atan2(i.vy,i.vx)/ee+1)%1;e=_e(t,.9,.35+.3*r);break}case"rainbow":default:{const r=i.rainbowPhase;e=[.5+.5*Math.cos(ee*r),.5+.5*Math.cos(ee*(r+.33)),.5+.5*Math.cos(ee*(r+.67))];break}}return hi(e,i.jitter)},le=300,vi=(i,e)=>{if(i.length>=le)return;const t=Math.atan2(e.dirY,e.dirX)+(Math.random()-.5)*2*e.particleSpread*Math.PI,o=e.particleVelocity*(.4+Math.random()*.6),l=e.brushSize*.35;i.push({x:e.u+(Math.random()-.5)*l,y:e.v+(Math.random()-.5)*l,vx:Math.cos(t)*o,vy:Math.sin(t)*o,life:e.particleLifetime,lifeMax:e.particleLifetime,color:[e.color[0],e.color[1],e.color[2]],size:e.brushSize*e.particleSizeScale*(.85+Math.random()*.3)})},xi=(i,e,r,t)=>{const o=2*(i*r+e*t);return[i-o*r,e-o*t]},yi=.5,bi=(i,e)=>{const r=Math.exp(-e.particleDrag*e.dtSec),t=e.restitution??.55,o=.01;let l=0;for(let n=i.length-1;n>=0;n--){const a=i[n];a.vx*=r,a.vy*=r,a.vy+=e.particleGravity*e.dtSec;const c=a.x,h=a.y;if(a.x+=a.vx*e.dtSec,a.y+=a.vy*e.dtSec,a.life-=e.dtSec,e.sampleMask&&e.sampleMask(a.x,a.y)>=yi){let v=e.sampleMask(a.x+o,a.y)-e.sampleMask(a.x-o,a.y),w=e.sampleMask(a.x,a.y+o)-e.sampleMask(a.x,a.y-o),C=Math.hypot(v,w);if(C<=1e-6){const u=o*3;v=e.sampleMask(a.x+u,a.y)-e.sampleMask(a.x-u,a.y),w=e.sampleMask(a.x,a.y+u)-e.sampleMask(a.x,a.y-u),C=Math.hypot(v,w)}let m,s;if(C>1e-6)m=-v/C,s=-w/C;else{const u=Math.hypot(a.vx,a.vy);u>1e-6?(m=-a.vx/u,s=-a.vy/u):(m=1,s=0)}[a.vx,a.vy]=xi(a.vx,a.vy,m,s),a.vx*=t,a.vy*=t,a.x=c+m*o,a.y=h+s*o}(a.life<=0||a.x<-.2||a.x>1.2||a.y<-.2||a.y>1.2)&&(i.splice(n,1),l++)}return l},Mi=()=>({particles:[],rainbowPhase:0,distSinceSplat:0,spawnAcc:0}),Ti=(i,e)=>{i.rainbowPhase=e.wallClockMs*.001%1;const r=e.params;if(e.dragging&&r.particleEmitter&&e.cursorUv){i.spawnAcc+=e.dtSec*r.particleRate;const t=e.cursorVelUv??{vx:0,vy:0},o=Math.hypot(t.vx,t.vy),l=o<=1e-4;for(;i.spawnAcc>=1&&i.particles.length<le;){i.spawnAcc-=1;let n,a;if(l){const h=Math.random()*Math.PI*2;n=Math.cos(h),a=Math.sin(h)}else n=t.vx/o,a=t.vy/o;const c=Oe({mode:r.colorMode,solidColor:r.solidColor,gradientLut:r.gradientLut,rainbowPhase:i.rainbowPhase,u:e.cursorUv.u,v:e.cursorUv.v,vx:t.vx,vy:t.vy,jitter:r.jitter});vi(i.particles,{u:e.cursorUv.u,v:e.cursorUv.v,dirX:n,dirY:a,color:c,brushSize:r.size,particleVelocity:r.particleVelocity,particleSpread:r.particleSpread,particleLifetime:r.particleLifetime,particleSizeScale:r.particleSizeScale})}i.particles.length>=le&&(i.spawnAcc=0)}if(i.particles.length>0){bi(i.particles,{dtSec:e.dtSec,particleGravity:r.particleGravity,particleDrag:r.particleDrag,sampleMask:(t,o)=>e.engine.sampleMask(t,o)});for(const t of i.particles){const o=Math.max(0,t.life/t.lifeMax);e.engine.brush(t.x,t.y,t.vx*r.flow,t.vy*r.flow,t.color,t.size,r.hardness,r.strength*o,r.mode)}}},wi=(i,e)=>{const r=e.params;return r.particleEmitter||i.distSinceSplat<Math.max(1e-5,r.spacing)?!1:(i.distSinceSplat=0,Le(i,e),!0)},Ci=(i,e)=>{e.params.particleEmitter||(Le(i,e),i.distSinceSplat=0)},Le=(i,e)=>{i.rainbowPhase=e.wallClockMs*.001%1;const r=e.params,t=Oe({mode:r.colorMode,solidColor:r.solidColor,gradientLut:r.gradientLut,rainbowPhase:i.rainbowPhase,u:e.u,v:e.v,vx:e.dvx,vy:e.dvy,jitter:r.jitter});e.engine.brush(e.u,e.v,e.dvx*r.flow,e.dvy*r.flow,t,r.size,r.hardness,r.strength,r.mode)},Ri=i=>{i.distSinceSplat=1/0,i.spawnAcc=0},ce=xe("fluid-toy.engine",null),V=xe("fluid-toy.brush",{runtime:Mi(),gradientLut:null}),W=xe("fluid-toy.cursor",{dragging:!1,uv:null,velUv:null}),Si=()=>d.jsxs("div",{className:"flex flex-col gap-3 py-2",children:[d.jsx("div",{className:"text-[10px] text-gray-500 leading-snug",children:"Each preset is a curated fractal ↔ fluid coupling. Applying one resets the grid and restores known params."}),d.jsx("div",{className:"grid grid-cols-2 gap-1",children:ri.map(i=>d.jsx("button",{type:"button",title:i.desc,onClick:()=>{var e;mi(i),(e=ce.ref.current)==null||e.resetFluid()},className:"px-2 py-1 text-[10px] rounded border bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-cyan-500/40 transition-colors text-left",children:i.name},i.id))})]}),ze=z(["paint","erase","stamp","smudge"],"Mode"),Ge=ze.fromIndex,Ne=z(["rainbow","solid","gradient","velocity"],"Colour"),Ve=Ne.fromIndex,Di={id:"brush",name:"Brush",category:"Input",tabConfig:{label:"Brush"},params:{mode:{...ze.config,description:"What left-drag does on the canvas. Paint = dye + force; Erase subtracts dye; Stamp deposits dye only; Smudge pushes velocity without adding dye."},size:{type:"float",default:.15,min:.003,max:.4,step:.001,label:"Size (UV)",description:"Radius in UV units (0..1 across the canvas). B+drag the canvas to resize live."},hardness:{type:"float",default:0,min:0,max:1,step:.01,label:"Hardness",description:"0 = soft gaussian edge (airbrush). 1 = hard disc (stamp)."},strength:{type:"float",default:1,min:0,max:3,step:.01,label:"Strength",description:"Dye amount per splat. 0 = dry brush, 3 = saturated. Erase mode: how much dye each splat removes."},flow:{type:"float",default:50,min:0,max:200,step:.5,label:"Flow",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:3}]},description:"How much of the pointer's velocity is injected into the force field. Low = delicate, 50 = paints, 200 = whip."},spacing:{type:"float",default:.005,min:0,max:.1,step:.001,label:"Spacing (UV)",condition:{param:"particleEmitter",bool:!1},description:"Minimum travel between splats along a drag. Low = smooth stroke, high = dotted trail."},colorMode:{...Ne.config,condition:{or:[{param:"mode",eq:0},{param:"mode",eq:2}]},description:"Where each splat gets its RGB. Gradient samples the palette; Solid uses the picker below; Rainbow cycles hue on its own clock."},solidColor:{type:"vec3",default:{x:1,y:1,z:1},min:0,max:1,step:.001,label:"Solid color",condition:{param:"colorMode",eq:1},description:"Explicit colour for Solid mode. Hue jitter still applies."},jitter:{type:"float",default:0,min:0,max:1,step:.01,label:"Hue jitter",condition:{and:[{param:"mode",neq:1},{param:"mode",neq:3}]},description:"Random hue wiggle per splat. 0 = exact colour, 1 = full hue wheel. Builds natural variation in long strokes. Stacks on rainbow/velocity mode too."},particleEmitter:{type:"boolean",default:!1,label:"Particle emitter",description:"Dragging spawns independent particles on their own layer. Each live particle flies with its own velocity / lifespan and acts as a mini brush — painting into the fluid with the selected mode at its own position."},particleRate:{type:"float",default:120,min:1,max:600,step:1,label:"Rate /s",condition:{param:"particleEmitter",bool:!0},description:"Particles emitted per second while dragging. Hard-capped at 300 live at once."},particleVelocity:{type:"float",default:.3,min:0,max:3,step:.01,label:"Velocity",condition:{param:"particleEmitter",bool:!0},description:"Initial speed in UV/sec. 0.3 = gentle spray, 2 = shotgun."},particleSpread:{type:"float",default:.35,min:0,max:1,step:.01,label:"Spread",condition:{param:"particleEmitter",bool:!0},description:"Angular spread around the drag direction. 0 = beam, 1 = full 360° burst."},particleGravity:{type:"float",default:0,min:-3,max:3,step:.01,label:"Gravity",condition:{param:"particleEmitter",bool:!0},description:"UV/sec² acceleration. Negative = falls down the canvas, positive = rises."},particleDrag:{type:"float",default:.6,min:0,max:4,step:.01,label:"Drag /s",condition:{param:"particleEmitter",bool:!0},description:"Air drag — 0 = ballistic (keeps speed), 2 = quickly slows, 4 = fast stop."},particleLifetime:{type:"float",default:1.2,min:.1,max:6,step:.05,label:"Lifetime",condition:{param:"particleEmitter",bool:!0},description:"Seconds before each particle is culled. Longer = more persistent streaks."},particleSizeScale:{type:"float",default:.35,min:.05,max:1.5,step:.01,label:"Size ×",condition:{param:"particleEmitter",bool:!0},description:"Per-particle stamp size as a fraction of the brush size. 0.35 = dabs a third of the brush."}}},De=96,Fi=(i,e)=>{const t=(e-Math.floor(e))*256,o=Math.floor(t)%256,l=(o+1)%256,n=t-Math.floor(t),a=i[o*4+0]*(1-n)+i[l*4+0]*n,c=i[o*4+1]*(1-n)+i[l*4+1]*n,h=i[o*4+2]*(1-n)+i[l*4+2]*n;return[a,c,h]},Ei=16,X=new Map,Fe=new WeakMap;let Ai=0;const ji=i=>{const e=Fe.get(i);if(e!==void 0)return e;const r=`lut${Ai++}`;return Fe.set(i,r),r},Pi=(i,e,r,t,o,l,n,a,c)=>`${i}|${e}|${r}|${t}|${ji(o)}|${l}|${n}|${a[0]},${a[1]},${a[2]}|${c}`,Ii=(i,e,r,t,o,l,n,a,c)=>{const h=new ImageData(i,i),v=h.data,w=Math.round(a[0]*255),C=Math.round(a[1]*255),m=Math.round(a[2]*255),s=Math.round(c),u=Math.abs(c-s)<.01&&s>=2&&s<=8;for(let S=0;S<i;S++){const f=r+(S/i*2-1)*t;for(let g=0;g<i;g++){const D=e+(g/i*2-1)*t;let M=0,x=0,R=0;for(;R<De;R++){const I=M*M,p=x*x;if(I+p>16)break;let T,F;if(u){let A=M,E=x;for(let B=1;B<s;B++){const U=A*M-E*x;E=A*x+E*M,A=U}T=A,F=E}else{const A=Math.sqrt(I+p),E=Math.atan2(x,M),B=Math.pow(A,c),U=E*c;T=B*Math.cos(U),F=B*Math.sin(U)}M=T+D,x=F+f}const j=((i-1-S)*i+g)*4;if(R>=De)v[j+0]=w,v[j+1]=C,v[j+2]=m;else{const T=(R+1-Math.log2(Math.max(1e-6,.5*Math.log2(M*M+x*x))))*.05*l+n,[F,A,E]=Fi(o,T);v[j+0]=Math.round(F),v[j+1]=Math.round(A),v[j+2]=Math.round(E)}v[j+3]=255}}return h},Bi=(i,e,r,t,o,l,n,a,c)=>{const h=Pi(i,e,r,t,o,l,n,a,c),v=X.get(h);if(v)return X.delete(h),X.set(h,v),v;const w=Ii(i,e,r,t,o,l,n,a,c);for(X.set(h,w);X.size>Ei;){const C=X.keys().next().value;if(C===void 0)break;X.delete(C)}return w},ki=(()=>{const i=new Uint8Array(1024);for(let e=0;e<256;e++)i[e*4]=i[e*4+1]=i[e*4+2]=e,i[e*4+3]=255;return i})(),Ui=({cx:i,cy:e,onChange:r,halfExtent:t=1.6,centerX:o=-.5,centerY:l=0,size:n=220,gradientLut:a,gradientRepeat:c=1,gradientPhase:h=0,interiorColor:v=[.04,.04,.06],power:w=2})=>{const C=P.useRef(null),m=P.useRef(null),s=P.useRef(!1);P.useEffect(()=>{const f=C.current;if(!f)return;const g=f.getContext("2d");if(!g)return;f.width=n,f.height=n;const M=Bi(n,o,l,t,a??ki,c,h,v,w);m.current=M,g.putImageData(M,0,0),u()},[n,o,l,t,a,c,h,v[0],v[1],v[2],w]);const u=P.useCallback(()=>{const f=C.current;if(!f||!m.current)return;const g=f.getContext("2d");if(!g)return;g.putImageData(m.current,0,0);const D=(i-o)/t*.5+.5,M=(e-l)/t*.5+.5,x=D*n,R=(1-M)*n;g.strokeStyle="#fff",g.lineWidth=1,g.beginPath(),g.moveTo(x-8,R),g.lineTo(x-2,R),g.moveTo(x+2,R),g.lineTo(x+8,R),g.moveTo(x,R-8),g.lineTo(x,R-2),g.moveTo(x,R+2),g.lineTo(x,R+8),g.stroke(),g.strokeStyle="rgba(0,255,200,0.9)",g.beginPath(),g.arc(x,R,4,0,2*Math.PI),g.stroke()},[i,e,o,l,t,n]);P.useEffect(()=>{u()},[u]);const S=f=>{const g=C.current;if(!g)return;const D=g.getBoundingClientRect(),M=(f.clientX-D.left)/D.width,x=1-(f.clientY-D.top)/D.height,R=o+(M*2-1)*t,j=l+(x*2-1)*t;r(R,j)};return d.jsxs("div",{className:"flex flex-col gap-1",children:[d.jsx("div",{className:"text-[10px] text-gray-400 uppercase tracking-wide",children:"Pick Julia c"}),d.jsx("canvas",{ref:C,className:"rounded border border-white/10 cursor-crosshair",style:{width:n,height:n,imageRendering:"pixelated"},onPointerDown:f=>{s.current=!0,f.target.setPointerCapture(f.pointerId),S(f)},onPointerMove:f=>{s.current&&S(f)},onPointerUp:f=>{s.current=!1;try{f.target.releasePointerCapture(f.pointerId)}catch{}}}),d.jsxs("div",{className:"text-[10px] font-mono text-gray-500",children:["c = (",i.toFixed(4),", ",e.toFixed(4),")"]})]})},_i=({sliceState:i,actions:e})=>{const r=i.juliaC??{x:-.36303304426511473,y:.16845183018751916},t=i.power??2,o=P.useMemo(()=>{},[]);return d.jsx(Ui,{cx:r.x,cy:r.y,power:t,gradientLut:o,onChange:(l,n)=>e.setJulia({juliaC:{x:l,y:n}})})};re.register("julia-c-picker",_i);re.register("preset-grid",Si);L.register(Ut);L.register(zt);L.register(Zt);L.register(ei);L.register(ti);L.register(li);L.register(di);L.register(Di);L.register(ii);Ke({version:1,id:"fluid-toy.tab-parity-restructure",apply:i=>(i!=null&&i.features&&(We(i,"dye","palette"),k(i,"palette.collisionEnabled","collision.enabled"),k(i,"palette.collisionPreview","collision.preview"),k(i,"palette.collisionGradient","collision.gradient"),k(i,"palette.collisionRepeat","collision.repeat"),k(i,"palette.collisionPhase","collision.phase"),k(i,"palette.dyeMix","composite.dyeMix"),k(i,"palette.dyeInject","fluidSim.dyeInject"),k(i,"palette.dyeDissipation","fluidSim.dyeDissipation"),k(i,"palette.dyeDecayMode","fluidSim.dyeDecayMode"),k(i,"palette.dyeChromaDecayHz","fluidSim.dyeChromaDecayHz"),k(i,"palette.dyeSaturationBoost","fluidSim.dyeSaturationBoost"),k(i,"fluidSim.forceMode","coupling.forceMode"),k(i,"fluidSim.forceGain","coupling.forceGain"),k(i,"fluidSim.interiorDamp","coupling.interiorDamp"),k(i,"fluidSim.forceCap","coupling.forceCap"),k(i,"fluidSim.edgeMargin","coupling.edgeMargin"),k(i,"orbit.enabled","coupling.orbitEnabled"),k(i,"orbit.radius","coupling.orbitRadius"),k(i,"orbit.speed","coupling.orbitSpeed"),i.features.orbit&&Object.keys(i.features.orbit).length===0&&delete i.features.orbit,k(i,"sceneCamera.center","julia.center"),k(i,"sceneCamera.zoom","julia.zoom"),i.features.sceneCamera&&Object.keys(i.features.sceneCamera).length===0&&delete i.features.sceneCamera),i)});const Oi=`
// Uniforms are auto-generated by Schema

// R2 Quasi-Random Sequence (Martin Roberts, 2018)
// Uses the plastic constant for optimal 2D coverage — no directional bias.
// PHI_2D ≈ 1.32472 is the unique real root of x³ = x + 1.
const float R2_A1 = 0.7548776662466927;  // 1/PHI_2D
const float R2_A2 = 0.5698402909980532;  // 1/PHI_2D²

vec4 getBlueNoise4(vec2 screenCoord) {
    vec2 res = max(uBlueNoiseResolution, vec2(64.0));

    // 1. R2 Temporal Offset — shifts texture uniformly in 2D each frame
    float time = float(uFrameCount);
    vec2 temporalOffset = vec2(
        fract(time * R2_A1),
        fract(time * R2_A2)
    );

    // 2. Spatial Lookup with Temporal Offset
    vec2 uv = mod(screenCoord + temporalOffset * res, res) / res;

    // 3. Fetch RGBA Blue Noise (each channel independently distributed)
    vec4 blue = textureLod(uBlueNoiseTexture, uv, 0.0);

    // 4. Channel-Wise Temporal Animation for accumulation convergence
    float frameOffset  = time * R2_A1;
    float frameOffsetG = time * R2_A2;
    float frameOffsetB = time * (R2_A1 + R2_A2);
    float frameOffsetA = time * (R2_A1 * R2_A2);

    return vec4(
        fract(blue.r + frameOffset),
        fract(blue.g + frameOffsetG),
        fract(blue.b + frameOffsetB),
        fract(blue.a + frameOffsetA)
    );
}

float getBlueNoise(vec2 screenCoord) {
    return getBlueNoise4(screenCoord).r;
}

// Stable blue noise for DOF - does not animate with frame count
// This prevents screen shake during navigation while still providing good distribution
vec4 getStableBlueNoise4(vec2 screenCoord) {
    vec2 res = max(uBlueNoiseResolution, vec2(64.0));
    vec2 uv = mod(screenCoord, res) / res;
    return textureLod(uBlueNoiseTexture, uv, 0.0);
}
`,Li=`
// Sub-pixel jitter for progressive AA. Returns offset in pixel fractions,
// centered in [-0.5, 0.5]. Blue-noise distribution converges evenly over
// ~16 frames — smoother than uniform random, cheaper than Halton.
vec2 tsaaJitter(vec2 screenCoord) {
    vec4 bn = getBlueNoise4(screenCoord);
    return bn.xy - 0.5;
}

// Progressive accumulation. \`n\` is the current sample count starting at
// 1 on the first frame after a reset; on frame N, the new sample is
// weighted 1/N and the history is weighted (N-1)/N. Converges to a true
// average of the N jittered samples.
vec4 tsaaAccumulate(vec4 history, vec4 current, int n) {
    float w = 1.0 / float(max(n, 1));
    return mix(history, current, w);
}
`,zi=`
vec3 rgbToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325372 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  float lc = pow(max(l, 0.0), 1.0/3.0);
  float mc = pow(max(m, 0.0), 1.0/3.0);
  float sc = pow(max(s, 0.0), 1.0/3.0);
  return vec3(
    0.2104542553*lc + 0.7936177850*mc - 0.0040720468*sc,
    1.9779984951*lc - 2.4285922050*mc + 0.4505937099*sc,
    0.0259040371*lc + 0.7827717662*mc - 0.8086757660*sc
  );
}
vec3 oklabToRgb(vec3 c) {
  float lc = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float mc = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float sc = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  float l = lc * lc * lc;
  float m = mc * mc * mc;
  float s = sc * sc * sc;
  return vec3(
    +4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
    -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
    -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
  );
}
`,oe=`
// Convert the fractal's per-pixel data into a 0..1-ish scalar along which to sample the gradient.
// j   = main  tex: rg = final z, b = smooth iter, a = escaped
// aux = aux   tex: r = minT (orbit trap),  g = stripe avg,  b = log|dz|,  a = trapIter (norm)
float colorMappingT(vec4 j, vec4 aux) {
  if (uColorMapping == 0)  return j.b * 0.05;                                    // Iterations (smooth)
  if (uColorMapping == 1)  return atan(j.g, j.r) * 0.15915494 + 0.5;             // Angle (arg z)
  if (uColorMapping == 2)  return clamp(length(j.rg) * 0.08, 0.0, 1.0);          // Magnitude
  if (uColorMapping == 3)  return step(0.0, j.g) * 0.5 + 0.25;                   // Decomposition
  if (uColorMapping == 4)  return floor(j.b) * 0.0625;                           // Hard Bands
  // Orbit traps share aux.r but the distance FORMULA differs per shape; the Julia
  // shader already knows which one to compute via uTrapMode, so the four trap
  // mapping IDs below just select how to stretch that distance to a [0,1] colour t.
  if (uColorMapping == 5)  return 1.0 - clamp(aux.r * 0.6, 0.0, 1.0);            // Orbit Trap (point)
  if (uColorMapping == 6)  return 1.0 - clamp(aux.r * 0.8, 0.0, 1.0);            // Orbit Trap (circle)
  if (uColorMapping == 7)  return 1.0 - clamp(aux.r * 1.2, 0.0, 1.0);            // Orbit Trap (cross)
  if (uColorMapping == 8)  return 1.0 - clamp(aux.r * 0.8, 0.0, 1.0);            // Orbit Trap (line)
  if (uColorMapping == 9)  return clamp(aux.g, 0.0, 1.0);                        // Stripe Average
  if (uColorMapping == 10) {                                                    // Distance Estimate
    // d ≈ 0.5 * |z| * log|z| / |dz|  →  aux.b stores log(1+|dz|).
    float absZ = max(length(j.rg), 1e-6);
    float absDz = max(exp(aux.b) - 1.0, 1e-6);
    float d = 0.5 * absZ * log(absZ) / absDz;
    return 1.0 - exp(-d * 4.0);
  }
  if (uColorMapping == 11) return clamp(aux.b * 0.25, 0.0, 1.0);                // Derivative (log|dz|)
  if (uColorMapping == 12) {                                                    // Continuous Potential
    float r2 = max(dot(j.rg, j.rg), 1.0001);
    return fract(log2(log2(r2)) * 0.5);
  }
  if (uColorMapping == 13) return aux.a;                                        // Trap Iteration
  return j.b * 0.05;
}

vec4 gradientForJuliaRgba(vec4 j, vec4 aux) {
  float t0 = colorMappingT(j, aux);
  float t = fract(t0 * uGradientRepeat + uGradientPhase);
  return texture(uGradient, vec2(t, 0.5));
}

vec3 gradientForJulia(vec4 j, vec4 aux) { return gradientForJuliaRgba(j, aux).rgb; }
`,_=`#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUv;
out vec2 vL; // left
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 uTexel;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`,Gi=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outAux;

uniform int   uKind;          // 0 julia, 1 mandelbrot
uniform vec2  uJuliaC;
uniform vec2  uCenter;        // center in fractal coords
uniform float uScale;         // world-units per uv-unit (height)
uniform float uAspect;
uniform int   uMaxIter;
uniform int   uColorIter;     // iterations used for coloring accumulators (≤ uMaxIter)
uniform float uEscapeR2;      // escape radius squared
uniform float uPower;         // integer power of z (2..8)

// Orbit-trap params — trap SHAPE is driven by uTrapMode:
//   0 = point (at uTrapCenter)
//   1 = circle (|z-center| - radius)
//   2 = cross (min of distances to X/Y axes shifted by center)
//   3 = line (signed distance to ax+by=d line)
uniform int   uTrapMode;
uniform vec2  uTrapCenter;
uniform float uTrapRadius;
uniform vec2  uTrapNormal;    // unit normal for line trap
uniform float uTrapOffset;    // d for line trap
uniform float uStripeFreq;    // k in sin(k·arg z)

// TSAA sub-pixel jitter — when > 0, primary sample position is jittered
// by blue-noise to drive temporal anti-aliasing. Value is the jitter
// AMPLITUDE in pixel fractions (1.0 = ±0.5 px). Set to 0 to disable.
uniform float uJitterScale;
uniform vec2  uResolution;
uniform sampler2D uBlueNoiseTexture;
uniform vec2  uBlueNoiseResolution;
uniform int   uFrameCount;
// K-sampling: number of jittered Julia evaluations per frame, raw-
// averaged before pushed to the TSAA accumulator.
uniform int   uPerFrameSamples;

// Total grid cells covered across one full "round" of frames. Always
// a perfect square (4, 9, 16, 25). Default 16 = 4×4 grid. Combined
// with uPerFrameSamples (cells visited per frame) this gives:
//   framesPerRound = uGridSize / uPerFrameSamples
// e.g. K=4, gridSize=16 → 4 frames per round; after frame 4 the TSAA
// accumulator has averaged all 16 cell centres → identical to a
// single-frame K=16 grid. K=16, gridSize=16 → 1 frame per round.
uniform int   uGridSize;

// Current TSAA accumulator frame index (0 on first frame after a
// reset). Drives the cell-cycling and the round-based progressive
// sub-cell refinement in grid mode.
uniform int   uTsaaSampleIndex;

// Jitter mode:
//   0 — blue noise: each sub-sample reads a different texel of the
//       per-frame R2-animated blue-noise texture. Random within a
//       frame, decorrelated across frames; converges in expectation
//       but the accumulator shimmers as the running mean settles.
//   1 — grid (default): each frame places K sub-samples at the
//       centres of K cells in a √gridSize × √gridSize lattice. The
//       cells visited cycle across frames so a full round of
//       (gridSize/K) frames covers every cell exactly once. After
//       round 0 the accumulator equals the centre-grid average.
//       Round 1+ shifts samples to deterministic blue-noise-indexed
//       sub-cell positions — same offset for every pixel at a given
//       round (no shimmer), but consecutive rounds pull spatially
//       decorrelated taps so progressive refinement looks organic.
uniform int   uJitterMode;

${Oi}
${Li}

// complex multiply
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }

// z -> z^p for small integer p (unrolled for speed; fallback for non-int powers)
vec2 cpow(vec2 z, float p) {
  int pi = int(p + 0.5);
  if (abs(p - float(pi)) < 0.01) {
    vec2 r = vec2(1.0, 0.0);
    vec2 b = z;
    int e = pi;
    if (e <= 0) return vec2(1.0, 0.0);
    for (int i = 0; i < 8; ++i) {
      if ((e & 1) == 1) r = cmul(r, b);
      e >>= 1;
      if (e == 0) break;
      b = cmul(b, b);
    }
    return r;
  }
  float mag = length(z);
  float ang = atan(z.y, z.x);
  float rm = pow(mag, p);
  float ra = ang * p;
  return rm * vec2(cos(ra), sin(ra));
}

// Distance of point q to the currently-selected trap shape.
float trapDistance(vec2 q) {
  vec2 d = q - uTrapCenter;
  if (uTrapMode == 0) return length(d);                                      // point
  if (uTrapMode == 1) return abs(length(d) - uTrapRadius);                   // circle
  if (uTrapMode == 2) return min(abs(d.x), abs(d.y));                        // cross
  if (uTrapMode == 3) return abs(dot(q, uTrapNormal) - uTrapOffset);         // line
  return length(d);
}

// One Julia evaluation at the given (jittered) UV. Out-params return
// the (outMain, outAux) data. Extracted so K-sampling can call it K
// times with different jitter offsets without inlining the iteration
// loop K times in source.
void evalJulia(vec2 uvJ, out vec4 outM, out vec4 outA) {
  vec2 uv = uvJ * 2.0 - 1.0;
  uv.x *= uAspect;
  vec2 p = uCenter + uv * uScale;

  vec2 z, c;
  if (uKind == 0) { z = p; c = uJuliaC; }
  else            { z = vec2(0.0); c = p; }

  float escaped = 0.0;
  float iters = float(uMaxIter);

  float minT      = 1e9;
  float trapIter  = 0.0;
  float stripeSum = 0.0;
  int   stripeCount = 0;
  vec2  dz = vec2(1.0, 0.0);

  for (int i = 0; i < 4096; ++i) {
    if (i >= uMaxIter) break;
    dz = cmul(2.0 * z, dz) + vec2(1.0, 0.0);
    z = cpow(z, uPower) + c;
    if (i < uColorIter) {
      float td = trapDistance(z);
      if (td < minT) { minT = td; trapIter = float(i); }
      stripeSum += 0.5 + 0.5 * sin(uStripeFreq * atan(z.y, z.x));
      stripeCount++;
    }
    float r2 = dot(z, z);
    if (r2 > uEscapeR2) {
      float smoothI = float(i) + 1.0 - log2(0.5 * log2(r2));
      iters = smoothI;
      escaped = 1.0;
      break;
    }
  }

  float stripeAvg = stripeCount > 0 ? stripeSum / float(stripeCount) : 0.0;
  float logDz     = log(1.0 + length(dz));
  float trapIterN = float(uMaxIter) > 0.0 ? trapIter / float(uMaxIter) : 0.0;

  outM = vec4(z, iters, escaped);
  outA = vec4(minT, stripeAvg, logDz, trapIterN);
}

void main() {
  // K-sampling: do K jittered Julia evaluations per frame, average
  // the raw outputs, then push to the TSAA accumulator. Effective
  // samples per blend = K × frames, so a fixed sample-cap is reached
  // K× faster (at K× per-frame cost). When uJitterScale is 0 (TSAA
  // disabled), K collapses to 1 — no extra cost.
  const int K_MAX = 16;
  int K = max(1, min(uPerFrameSamples, K_MAX));
  if (uJitterScale <= 0.0) K = 1;

  vec2 invRes = 1.0 / max(uResolution, vec2(1.0));
  // Blue-noise mode helpers.
  vec2 r2Step = vec2(R2_A1, R2_A2) * uBlueNoiseResolution.x;
  // Grid mode geometry — the lattice size is gridSize = gridDim².
  int gridSize = max(uGridSize, 1);
  int gridDim = int(floor(sqrt(float(gridSize)) + 0.5));
  if (gridDim < 1) gridDim = 1;
  gridSize = gridDim * gridDim;
  // Frames per round (one round = each lattice cell visited once).
  int framesPerRound = max(gridSize / max(K, 1), 1);
  int frameIdx = max(uTsaaSampleIndex, 0);
  int round = frameIdx / framesPerRound;
  int frameInRound = frameIdx - round * framesPerRound;
  // Sub-cell offset progressive refinement. Round 0 = cell centre
  // (matches a single-frame K=gridSize grid). Round 1+ pulls a
  // deterministic blue-noise tap indexed by round number — same
  // offset for every pixel at a given round (no shimmer; the whole
  // image jitters as one), but consecutive rounds walk through the
  // blue-noise texture via R2 so the offset sequence has good 2D
  // coverage without low-discrepancy patterning.
  vec2 subOffset = vec2(0.0);
  if (round > 0) {
    vec2 roundCoord = vec2(R2_A1, R2_A2) * float(round) * uBlueNoiseResolution.x;
    vec4 bn = getStableBlueNoise4(roundCoord);
    subOffset = (bn.xy - 0.5) / float(gridDim);
  }
  int cellOffset = frameInRound * K;

  vec4 accM = vec4(0.0);
  vec4 accA = vec4(0.0);

  for (int s = 0; s < K_MAX; ++s) {
    if (s >= K) break;

    vec2 jitter01;
    if (uJitterMode == 1) {
      // Cycle through gridSize cells across (gridSize/K) frames.
      int cellIdx = cellOffset + s;
      cellIdx = cellIdx - (cellIdx / gridSize) * gridSize;  // % gridSize
      int sx = cellIdx - (cellIdx / gridDim) * gridDim;
      int sy = cellIdx / gridDim;
      jitter01 = (vec2(float(sx), float(sy)) + 0.5) / float(gridDim) + subOffset;
    } else {
      // Blue-noise mode (unchanged): tsaaJitter returns offset in
      // [-0.5, 0.5]; shift to [0, 1] cell coords for unified handling.
      vec2 sampleCoord = gl_FragCoord.xy + r2Step * float(s);
      jitter01 = tsaaJitter(sampleCoord) + 0.5;
    }

    vec2 jitter = (uJitterScale > 0.0)
        ? (jitter01 - 0.5) * uJitterScale
        : vec2(0.0);
    vec2 uvJ = vUv + jitter * invRes;

    vec4 sM, sA;
    evalJulia(uvJ, sM, sA);
    accM += sM;
    accA += sA;
  }

  float invK = 1.0 / float(K);
  outMain = accM * invK;
  outAux  = accA * invK;
}`,Ni=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;

uniform sampler2D uJulia;
uniform sampler2D uJuliaPrev;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;
uniform sampler2D uMask;
uniform vec2  uTexel;
uniform int   uMode;
uniform float uGain;
uniform float uDt;
uniform float uInteriorDamp;  // 0..1 : how much to damp inside the set (escaped=0)
uniform float uDyeGain;       // multiplier for dye injection from fractal color
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
uniform float uEdgeMargin;    // 0..0.25 : force fade-to-zero margin near sim boundaries
uniform float uForceCap;      // absolute clamp on final force magnitude (per-pixel)
${oe}

void main() {
  vec4 c  = texture(uJulia, vUv);
  vec4 l  = texture(uJulia, vL);
  vec4 r  = texture(uJulia, vR);
  vec4 t  = texture(uJulia, vT);
  vec4 b  = texture(uJulia, vB);
  vec4 cp = texture(uJuliaPrev, vUv);

  float smoothI = c.b;
  float escaped = c.a;

  // gradient of smooth iteration count (finite diff)
  vec2 grad = vec2(r.b - l.b, t.b - b.b) * 0.5;

  vec2 force = vec2(0.0);
  vec3 injectColor = vec3(0.0);

  if (uMode == 0) {
    // Outward burst: normalize gradient; magnitude = min(|grad|, 1)
    float g = length(grad);
    force = (g > 1e-6) ? grad / g : vec2(0.0);
    force *= clamp(g * 0.6, 0.0, 1.5);
  } else if (uMode == 1) {
    // Divergence-free: perp of gradient — swirls along level sets
    vec2 perp = vec2(-grad.y, grad.x);
    float g = length(perp);
    force = (g > 1e-6) ? perp / g : vec2(0.0);
    force *= clamp(g * 0.8, 0.0, 1.8);
  } else if (uMode == 2) {
    // Final iterate direction (Böttcher flow): use z normalized, weighted by escape speed
    vec2 z = c.rg;
    float zm = length(z);
    vec2 dir = (zm > 1e-6) ? z / zm : vec2(0.0);
    // grow rate proxy: smoothI delta vs neighbor = "how fast are we escaping here"
    float g = length(grad);
    force = dir * clamp(g * 0.8, 0.0, 2.0);
  } else if (uMode == 3) {
    // C-Track: temporal derivative — how did this pixel's fractal identity shift
    // between the previous c and the current c? That delta direction IS a motion
    // vector that follows the Julia deformation.
    vec2 dz = c.rg - cp.rg;
    float ds = c.b - cp.b;
    // combine: direction from z-delta weighted by smooth-iter delta
    float mm = length(dz);
    vec2 dir = (mm > 1e-6) ? dz / mm : vec2(0.0);
    force = dir * clamp(mm * 3.0 + abs(ds) * 0.2, 0.0, 3.0);
    // Clamp 1/dt so tiny frames don't blow up the c-track magnitude.
    force *= clamp(1.0 / max(uDt, 0.016), 0.0, 40.0);
  } else if (uMode == 4) {
    // Hue flow: treat rendered palette color as vector field
    vec4 aux = texture(uJuliaAux, vUv);
    vec3 col = gradientForJulia(c, aux);
    float hueAngle = atan(col.g - col.b, col.r - 0.5);
    float val = length(col);
    force = vec2(cos(hueAngle), sin(hueAngle)) * val;
  }

  // Optionally damp inside the set (escaped = 0) — the interior is a "still lake"
  float damp = mix(1.0 - uInteriorDamp, 1.0, escaped);
  force *= damp;

  // Edge fade: prevents boundary artefacts from the pressure-Jacobi solve
  // reading clamped-edge neighbours. Tapers force to 0 in a thin margin.
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin, dEdge);
  force *= edgeFade;

  // Per-pixel magnitude cap — stops fast c-moves from spawning impulses that dominate.
  float fMag = length(force);
  if (fMag > uForceCap && fMag > 1e-6) {
    force *= uForceCap / fMag;
  }

  // Dye injection: a bit of the Julia-escape color bleeds into the fluid dye.
  // Edge-faded so the border doesn't paint itself in.
  {
    vec4 auxHere = texture(uJuliaAux, vUv);
    injectColor = gradientForJulia(c, auxHere) * escaped * uDyeGain * edgeFade;
  }

  // Solid obstacles emit no force into the fluid (and carry no dye injection).
  float solid = texture(uMask, vUv).r;
  force *= (1.0 - solid);
  injectColor *= (1.0 - solid);

  fragColor = vec4(force * uGain, injectColor.r, injectColor.g + injectColor.b * 0.5);
}`,Vi=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uForce;
uniform sampler2D uMask;
uniform float uDt;
void main() {
  vec2 v = texture(uVelocity, vUv).rg;
  vec2 f = texture(uForce, vUv).rg;
  float solid = texture(uMask, vUv).r;
  fragColor = vec4((v + f * uDt) * (1.0 - solid), 0.0, 1.0);
}`,Hi=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;
uniform sampler2D uMask;
uniform float uDyeGain;
uniform float uDyeFadeHz;
uniform float uDt;
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
uniform float uEdgeMargin;
uniform int   uDyeBlend;        // 0 add, 1 screen, 2 max, 3 over (alpha)
uniform int   uDyeDecayMode;    // 0 linear, 1 perceptual (OKLab L-decay), 2 vivid (chroma-boost)
uniform float uDyeChromaFadeHz; // per-second chroma decay rate (perceptual / vivid only)
uniform float uDyeSatBoost;     // per-frame chroma multiplier applied after decay
${oe}
${zi}

/** Apply this frame's dissipation to existing dye. Lightness and chroma decay
 *  on independent schedules, then chroma is scaled by uDyeSatBoost. In "vivid"
 *  mode chroma also gets an inverse-lightness boost so colours stay punchy as
 *  they dim. */
vec3 decayDye(vec3 c) {
  float decayL = exp(-uDyeFadeHz * uDt);
  if (uDyeDecayMode == 0) return c * decayL;
  vec3 lab = rgbToOklab(c);
  float decayC = exp(-uDyeChromaFadeHz * uDt);
  lab.x *= decayL;
  lab.yz *= decayC * uDyeSatBoost;
  if (uDyeDecayMode == 2) {
    lab.yz *= clamp(1.0 / max(decayL, 0.01), 1.0, 2.0);
  }
  return max(oklabToRgb(lab), 0.0);
}

void main() {
  vec4 d = texture(uDye, vUv);
  vec4 j = texture(uJulia, vUv);
  vec4 a = texture(uJuliaAux, vUv);
  vec4 grad = gradientForJuliaRgba(j, a);        // RGBA — α is the per-stop alpha from the editor
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin, dEdge);

  // Base amount of colour to introduce this frame at this pixel.
  // j.a gates on "escaped", grad.a gates on gradient-stop alpha, edgeFade/etc on borders.
  float rate = j.a * uDyeGain * uDt * edgeFade * grad.a;
  vec3 injectAdd = grad.rgb * rate;
  vec3 aged      = decayDye(d.rgb);           // dye after this frame's dissipation, in chosen colour space
  vec3 col;

  if (uDyeBlend == 0) {
    // Add: classic accumulation. Simple, bright, can clip to 1.0 at heavy injection.
    col = aged + injectAdd;
  } else if (uDyeBlend == 1) {
    // Screen: 1 − (1−d)(1−i). Overlaps glow; never exceeds 1.0 mathematically.
    vec3 i = clamp(injectAdd, 0.0, 1.0);
    col = 1.0 - (1.0 - aged) * (1.0 - i);
  } else if (uDyeBlend == 2) {
    // Max: hold the brightest. Good for preserving vivid strokes over faded ones.
    col = max(aged, injectAdd);
  } else {
    // Over (alpha-compositing): uses grad.α + rate to mask the new colour onto old.
    float a = clamp(rate * 8.0, 0.0, 1.0);   // scale so "rate" reads like a visible alpha
    col = aged * (1.0 - a) + grad.rgb * a;
  }

  // Solid obstacles: no dye inside — they're walls, not flowing medium.
  float solid = texture(uMask, vUv).r;
  col *= (1.0 - solid);

  fragColor = vec4(col, 1.0);
}`,Ji=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;      // field to advect (could be velocity itself)
uniform sampler2D uMask;        // collision mask; 1 = solid wall
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;     // per-second decay
uniform float uEdgeMargin;      // soft no-slip wall — only applies in the outer half of this margin
void main() {
  vec2 v = texture(uVelocity, vUv).rg;
  vec2 prev = vUv - v * uDt * uTexel;   // backtrace in UV-space
  vec4 val = texture(uSource, prev);
  float decay = 1.0 / (1.0 + uDissipation * uDt);
  // Soft no-slip at the canvas border (last ~half of the edge margin).
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin * 0.5, dEdge);
  // Solid obstacles: fluid goes to zero inside them so nothing advects through.
  float solid = texture(uMask, vUv).r;
  fragColor = val * decay * edgeFade * (1.0 - solid);
}`,Xi=`#version 300 es
precision highp float;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).r;
  float R = texture(uVelocity, vR).r;
  float T = texture(uVelocity, vT).g;
  float B = texture(uVelocity, vB).g;
  float div = 0.5 * ((R - L) + (T - B));
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}`,Ki=`#version 300 es
precision highp float;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).g;
  float R = texture(uVelocity, vR).g;
  float T = texture(uVelocity, vT).r;
  float B = texture(uVelocity, vB).r;
  float curl = 0.5 * ((R - L) - (T - B));
  fragColor = vec4(curl, 0.0, 0.0, 1.0);
}`,Wi=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2  uTexel;
uniform float uStrength;
uniform float uScale;      // stencil width in texels — wider = larger organised vortices
uniform float uDt;
void main() {
  // Compute the curl-magnitude gradient with a variable-width stencil. The vertex-
  // shader's 1-texel neighbours aren't used here because we want uScale control.
  vec2 t = uTexel * max(uScale, 1.0);
  float L = texture(uCurl, vUv - vec2(t.x, 0.0)).r;
  float R = texture(uCurl, vUv + vec2(t.x, 0.0)).r;
  float T = texture(uCurl, vUv + vec2(0.0, t.y)).r;
  float B = texture(uCurl, vUv - vec2(0.0, t.y)).r;
  float C = texture(uCurl, vUv).r;
  vec2 eta = vec2(abs(T) - abs(B), abs(R) - abs(L));
  float mag = length(eta) + 1e-5;
  eta /= mag;
  eta.y = -eta.y;
  vec2 force = eta * C * uStrength;
  vec2 v = texture(uVelocity, vUv).rg;
  fragColor = vec4(v + force * uDt, 0.0, 1.0);
}`,qi=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).r;
  float R = texture(uPressure, vR).r;
  float T = texture(uPressure, vT).r;
  float B = texture(uPressure, vB).r;
  float div = texture(uDivergence, vUv).r;
  float p = (L + R + T + B - div) * 0.25;
  fragColor = vec4(p, 0.0, 0.0, 1.0);
}`,Yi=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform sampler2D uMask;
void main() {
  float L = texture(uPressure, vL).r;
  float R = texture(uPressure, vR).r;
  float T = texture(uPressure, vT).r;
  float B = texture(uPressure, vB).r;
  vec2 v = texture(uVelocity, vUv).rg;
  v -= vec2(R - L, T - B) * 0.5;
  float solid = texture(uMask, vUv).r;
  fragColor = vec4(v * (1.0 - solid), 0.0, 1.0);
}`,$i=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform vec2  uPoint;
uniform vec3  uValue;
uniform float uRadius;     // soft-mode gaussian sigma² (smaller = tighter)
uniform float uDiscR;      // hard-mode disc radius in UV (x-aspect-corrected)
uniform float uHardness;   // 0..1 blend between soft / hard profile
uniform float uAspect;
uniform float uOp;         // 0 add, 1 subtract
void main() {
  vec2 d = vUv - uPoint;
  d.x *= uAspect;
  float r2 = dot(d, d);
  float soft = exp(-r2 / uRadius);
  float hard = 1.0 - smoothstep(uDiscR * 0.9, uDiscR, sqrt(r2));
  float w = mix(soft, hard, uHardness);
  vec4 base = texture(uTarget, vUv);
  vec3 delta = uValue * w;
  vec3 next = base.rgb + mix(delta, -delta, uOp);
  // Clamp to ≥0 ONLY for the eraser op. Velocity splats carry signed deltas —
  // clamping them would wipe out negative components under the brush radius,
  // which visually looks like flow reversing wherever the brush touches.
  base.rgb = (uOp > 0.5) ? max(next, 0.0) : next;
  fragColor = base;
}`,Zi=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform sampler2D uGradient;
uniform sampler2D uMask;
uniform sampler2D uBloom;      // pre-computed bloom texture (black if bloom disabled)
uniform vec2  uTexelDisplay;   // 1/width, 1/height of the DISPLAY canvas
uniform vec2  uTexelDye;       // 1/width, 1/height of the dye (sim) grid
uniform int   uShowMode;       // 0 composite, 1 julia-only, 2 dye-only, 3 velocity-only
uniform float uJuliaMix;
uniform float uDyeMix;
uniform float uVelocityViz;
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
uniform vec3  uInteriorColor;

// Post-processing knobs
uniform int   uToneMapping;    // 0 none, 1 reinhard, 2 agx, 3 filmic
uniform float uExposure;
uniform float uVibrance;       // 0..1
uniform float uBloomAmount;    // 0..3
uniform float uAberration;     // 0..1 — velocity-keyed RGB shift
uniform float uRefraction;     // 0..0.3 — dye-gradient UV offset for the fractal
uniform float uRefractSmooth;  // stencil width (in dye texels) — smooths the gradient
uniform float uRefractRoughness; // 0..1 — frosted-glass effect: scatters the
                                 // refracted sample across a Vogel-disc kernel.
                                 // 0 = single-tap (crisp). 1 = ~5px blur radius.
uniform float uCaustics;       // 0..25 — laplacian-of-dye highlight
uniform int   uCollisionPreview; // 1 = overlay the mask with diagonal hatching so walls are visible
${oe}

const vec3 LUM_REC601 = vec3(0.299, 0.587, 0.114);   // used for dye luminance + vibrance
const float PI  = 3.14159265359;
const float TAU = 6.28318530718;

vec3 velocityToColor(vec2 v) {
  float ang = atan(v.y, v.x);
  float mag = clamp(length(v) * 0.5, 0.0, 1.0);
  float hue = (ang + PI) / TAU;
  vec3 c = abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0;
  return clamp(c, 0.0, 1.0) * mag;
}

// ── Tone-mapping family. ────────────────────────────────────────────────────
// Reinhard: c/(1+c). Smooth but desaturates highlights.
// AgX: Sobotka's log/sigmoid in a rotated basis. Hue-stable, vibrant.
// Filmic: Hable's Uncharted 2 filmic — cinematic s-curve.
vec3 tmReinhard(vec3 c) { return c / (1.0 + c); }

vec3 tmAgX(vec3 c) {
  const mat3 M = mat3(
    0.842, 0.078, 0.088,
    0.042, 0.878, 0.088,
    0.042, 0.078, 0.880
  );
  c = M * c;
  c = clamp((log2(max(c, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
  vec3 x2 = c * c;
  vec3 x4 = x2 * x2;
  return 15.5*x4*x2 - 40.14*x4*c + 31.96*x4 - 6.868*x2*c + 0.4298*x2 + 0.1191*c - 0.00232;
}

vec3 tmFilmic(vec3 c) {
  // Hable / Uncharted 2: F(x) = ((x(Ax+CB)+DE)/(x(Ax+B)+DF)) - E/F
  const float A = 0.15, B = 0.50, C = 0.10, D = 0.20, E = 0.02, F = 0.30;
  vec3 num = c * (A*c + C*B) + D*E;
  vec3 den = c * (A*c + B)   + D*F;
  return num/den - E/F;
}

vec3 applyToneMapping(vec3 c) {
  if (uToneMapping == 0) return c;
  if (uToneMapping == 1) return tmReinhard(c);
  if (uToneMapping == 2) return tmAgX(c);
  return tmFilmic(c) / tmFilmic(vec3(11.2));   // Filmic wants a fixed white-point divide
}

// Vibrance: chroma-aware saturation. Pushes low-saturation pixels without
// posterising already-vivid ones.
vec3 applyVibrance(vec3 c, float amount) {
  if (amount <= 0.0) return c;
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float sat = mx - mn;
  vec3 gray = vec3(dot(c, LUM_REC601));
  return mix(gray, c, 1.0 + amount * (1.0 - sat));
}

void main() {
  vec2 uv = vUv;

  // ── Liquid-look refraction. The gradient of dye luminance acts as a
  // fake height-field slope; we offset the fractal sample by that
  // gradient. Use a Sobel 3×3 — mathematically a Gaussian (1,2,1)
  // blur composed with a central difference, so it actually SMOOTHS
  // the gradient instead of just spreading two taps further apart.
  // uRefractSmooth controls the stencil width (in dye texels);
  // larger values give a lower-frequency, calmer slope.
  vec2 refractOffset = vec2(0.0);
  float caustic = 0.0;
  if (uRefraction > 0.0 || uCaustics > 0.0) {
    vec2 t = uTexelDye * max(uRefractSmooth, 1.0);
    float lTL = dot(texture(uDye, vUv + vec2(-t.x, -t.y)).rgb, LUM_REC601);
    float lT  = dot(texture(uDye, vUv + vec2( 0.0, -t.y)).rgb, LUM_REC601);
    float lTR = dot(texture(uDye, vUv + vec2( t.x, -t.y)).rgb, LUM_REC601);
    float lL  = dot(texture(uDye, vUv + vec2(-t.x,  0.0)).rgb, LUM_REC601);
    float lC  = dot(texture(uDye, vUv                  ).rgb, LUM_REC601);
    float lR  = dot(texture(uDye, vUv + vec2( t.x,  0.0)).rgb, LUM_REC601);
    float lBL = dot(texture(uDye, vUv + vec2(-t.x,  t.y)).rgb, LUM_REC601);
    float lB  = dot(texture(uDye, vUv + vec2( 0.0,  t.y)).rgb, LUM_REC601);
    float lBR = dot(texture(uDye, vUv + vec2( t.x,  t.y)).rgb, LUM_REC601);
    // Sobel — divide by 8 (sum of positive weights on one side) to
    // normalise. y-axis: vUv.y grows downward in this texture, so
    // "up" in screen space is -t.y; keep the original sign convention
    // that bright dye refracts the fractal toward the light.
    float gx = (lTR + 2.0 * lR + lBR) - (lTL + 2.0 * lL + lBL);
    float gy = (lBL + 2.0 * lB + lBR) - (lTL + 2.0 * lT + lTR);
    refractOffset = vec2(gx, gy) * (uRefraction * 0.125);
    // 9-point Laplacian — better isotropy than the 5-point version
    // (no preferential x/y axis bias). Divide by smoothness so the
    // caustic magnitude stays roughly invariant as the stencil grows.
    float neigh = lTL + lT + lTR + lL + lR + lBL + lB + lBR;
    caustic = max(0.0, neigh - 8.0 * lC) / (8.0 * max(uRefractSmooth, 1.0));
  }

  // ── Refracted fractal sample. With uRefractRoughness > 0 we
  // scatter the sample across an 8-tap Vogel-disc kernel (golden-
  // angle spiral — even disc coverage at small N, no clumping).
  // Each tap is gradient-mapped INDIVIDUALLY before averaging,
  // because averaging raw j/aux at the fractal boundary gives
  // meaningless intermediate iterations (same reasoning as the
  // K-sample loop in the Julia shader). Per-tap colours blend
  // cleanly. The mask (wall solid) also reads the same kernel so
  // walls get the same frosted-glass blur, keeping their edges
  // consistent with the refracted fractal behind them. Dye and
  // velocity stay sharp — they're "near-surface" and shouldn't
  // pick up glass-roughness blur.
  vec2 refractedBase = uv + refractOffset;
  vec3 juliaColor;
  vec3 wallColor;        // gradient colour at refracted UV — used for solid-wall override below
  float solid;
  {
    vec4 j = texture(uJulia, refractedBase);
    vec4 aux = texture(uJuliaAux, refractedBase);
    vec3 grad = gradientForJulia(j, aux);
    juliaColor = mix(uInteriorColor, grad * j.a, j.a);
    wallColor = grad;
    solid = texture(uMask, refractedBase).r;
    if (uRefractRoughness > 0.0) {
      const float GOLDEN_ANGLE = 2.39996323;
      const int VOGEL_N = 8;
      // 0..1 roughness → 0..5 px disc radius (in dye-grid texels).
      vec2 radius = uTexelDye * (uRefractRoughness * 5.0);
      vec3 cAcc = juliaColor;
      vec3 wAcc = wallColor;
      float sAcc = solid;
      for (int i = 0; i < VOGEL_N; ++i) {
        float r = sqrt((float(i) + 0.5) / float(VOGEL_N));
        float theta = float(i) * GOLDEN_ANGLE;
        vec2 ofs = r * vec2(cos(theta), sin(theta)) * radius;
        vec4 j_t = texture(uJulia, refractedBase + ofs);
        vec4 a_t = texture(uJuliaAux, refractedBase + ofs);
        vec3 grad_t = gradientForJulia(j_t, a_t);
        cAcc += mix(uInteriorColor, grad_t * j_t.a, j_t.a);
        wAcc += grad_t;
        sAcc += texture(uMask, refractedBase + ofs).r;
      }
      float invN = 1.0 / float(VOGEL_N + 1);  // +1 for the original centre tap
      juliaColor = cAcc * invN;
      wallColor = wAcc * invN;
      solid = sAcc * invN;
    }
  }

  vec3 dye = texture(uDye, uv).rgb;
  vec2 v = texture(uVelocity, uv).rg;

  // ── Chromatic aberration (electric look).
  // Applied to DYE ONLY — shifting the fractal itself caused distracting
  // double-vision. Magnitude is bounded (clamped) and direction is the
  // normalised local velocity, so fast regions get a clean plasma fringe
  // without the fractal fracturing. Kicks in only where the fluid is moving.
  if (uAberration > 0.0 && uShowMode == 0) {
    float vMag = length(v);
    if (vMag > 1e-4) {
      vec2 vn = v / vMag;
      float amt = clamp(vMag * 0.04, 0.0, 1.0) * uAberration * 0.006;
      vec2 off = vn * amt;
      dye.r = texture(uDye, uv + off).r;
      dye.b = texture(uDye, uv - off).b;
    }
  }

  vec3 col;
  if (uShowMode == 1) col = juliaColor;
  else if (uShowMode == 2) col = dye;
  else if (uShowMode == 3) col = velocityToColor(v);
  else {
    col = juliaColor * uJuliaMix + dye * uDyeMix;
    col += velocityToColor(v) * uVelocityViz * 0.5;
  }

  // Caustics: additive highlight on focused-surface regions.
  col += vec3(caustic) * uCaustics;

  // Solid obstacles: override the composite with the raw (untoned)
  // gradient colour so walls read as crisp objects, not as "dyed
  // fluid near a wall." solid and wallColor were sampled above
  // through the same Vogel-disc kernel as the fractal so the wall
  // edges blur in step with the refracted fractal behind them.
  if (solid > 0.01) {
    col = mix(col, wallColor, solid);
  }

  // Collision preview: diagonal cyan hatching over solid cells. Uses screen
  // pixels (not UV) so stripes stay a constant width at any zoom level.
  if (uCollisionPreview == 1 && solid > 0.01) {
    vec2 screenPx = vUv / uTexelDisplay;
    float hatch = step(4.0, mod(screenPx.x + screenPx.y, 8.0));
    vec3 preview = mix(vec3(0.0, 0.95, 1.0), vec3(0.0, 0.25, 0.35), hatch);
    col = mix(col, preview, solid * 0.55);
  }

  // Bloom: an HDR pre-blurred energy texture we add on top.
  if (uBloomAmount > 0.0) {
    col += texture(uBloom, vUv).rgb * uBloomAmount;
  }

  // Exposure → tone map → vibrance → gamma.
  col *= uExposure;
  col = applyToneMapping(col);
  col = applyVibrance(col, uVibrance);
  col = pow(max(col, 0.0), vec3(1.0/2.2));
  fragColor = vec4(col, 1.0);
}`,Qi=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;            // main gradient (needed for helper symbol linkage)
uniform sampler2D uCollisionGradient;   // user-authored B&W LUT: black = fluid, white = wall
uniform int   uColorMapping;
// Main-gradient repeat/phase are also uniforms of this program because
// the shared GRADIENT_SAMPLE_GLSL helper references them — they're
// kept in sync with the dye panel so colorMappingT() stays canonical.
uniform float uGradientRepeat;
uniform float uGradientPhase;
// Collision-specific repeat/phase — independent of the dye gradient.
// User can tile the wall pattern at a different density from the dye
// palette, or phase-shift it to place walls where the dye doesn't go.
uniform float uCollisionRepeat;
uniform float uCollisionPhase;
${oe}
void main() {
  vec4 j = texture(uJulia, vUv);
  vec4 a = texture(uJuliaAux, vUv);
  // Same mapping → t pipeline the main gradient uses, so walls track colour-mapping
  // changes exactly (angle / orbit trap / stripe / bands / whatever). Then the
  // collision knobs remap t before the LUT lookup so walls can have their own tiling.
  float t0 = colorMappingT(j, a);
  float t = fract(t0 * uCollisionRepeat + uCollisionPhase);
  vec4 m = texture(uCollisionGradient, vec2(t, 0.5));
  float mask = dot(m.rgb, vec3(0.299, 0.587, 0.114));  // b&w → luma; also works if user uses colour
  // Interior points aren't walls (no escape → no fluid-side colour to collide with).
  mask *= j.a;
  fragColor = vec4(clamp(mask, 0.0, 1.0), 0.0, 0.0, 1.0);
}`,er=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`,tr=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform float uThreshold;
uniform float uSoftKnee;
void main() {
  vec3 c = texture(uSource, vUv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Soft-knee: smooth ramp between (threshold - softKnee) and threshold.
  float lo = uThreshold - uSoftKnee;
  float t = smoothstep(lo, uThreshold, luma);
  fragColor = vec4(c * t, 1.0);
}`,ir=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform vec2 uTexel;   // 1/width, 1/height of the SOURCE
void main() {
  vec2 px = uTexel;
  vec3 c =
      texture(uSource, vUv).rgb * 0.5
    + texture(uSource, vUv + vec2(-px.x, -px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x, -px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2(-px.x,  px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x,  px.y)).rgb * 0.125;
  fragColor = vec4(c, 1.0);
}`,rr=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;   // coarser mip being upsampled
uniform sampler2D uPrev;     // this-level's existing texture (we add onto it)
uniform vec2 uTexel;         // 1/size of SOURCE (the coarser texture)
uniform float uIntensity;    // per-upsample scale
void main() {
  vec2 px = uTexel;
  // 3x3 tent filter on the coarse mip
  vec3 s =
      texture(uSource, vUv + vec2(-px.x, -px.y)).rgb * 0.0625
    + texture(uSource, vUv + vec2( 0.0,  -px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x, -px.y)).rgb * 0.0625
    + texture(uSource, vUv + vec2(-px.x,  0.0 )).rgb * 0.125
    + texture(uSource, vUv).rgb                     * 0.25
    + texture(uSource, vUv + vec2( px.x,  0.0 )).rgb * 0.125
    + texture(uSource, vUv + vec2(-px.x,  px.y)).rgb * 0.0625
    + texture(uSource, vUv + vec2( 0.0,   px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x,  px.y)).rgb * 0.0625;
  vec3 base = texture(uPrev, vUv).rgb;
  fragColor = vec4(base + s * uIntensity, 1.0);
}`,or=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform vec2  uNewCenter;
uniform vec2  uOldCenter;
uniform float uNewZoom;
uniform float uOldZoom;
uniform float uAspect;
void main() {
  // UV → world (new camera)
  vec2 pix = vec2((vUv.x * 2.0 - 1.0) * uAspect, vUv.y * 2.0 - 1.0);
  vec2 worldPos = uNewCenter + pix * uNewZoom;
  // World → UV (old camera)
  vec2 oldPix = (worldPos - uOldCenter) / uOldZoom;
  vec2 oldUv = vec2(oldPix.x / uAspect * 0.5 + 0.5, oldPix.y * 0.5 + 0.5);
  // If outside [0,1], fade to zero instead of clamping to the edge sample — that
  // avoids streaks of stale dye being stamped into the newly-exposed area.
  vec2 inside = step(vec2(0.0), oldUv) * step(oldUv, vec2(1.0));
  float inside01 = inside.x * inside.y;
  fragColor = texture(uSource, oldUv) * inside01;
}`,ar=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outAux;

uniform sampler2D uCurrentMain;
uniform sampler2D uCurrentAux;
uniform sampler2D uHistoryMain;
uniform sampler2D uHistoryAux;
uniform int uSampleIndex;

void main() {
    vec4 curMain = texture(uCurrentMain, vUv);
    vec4 curAux  = texture(uCurrentAux,  vUv);
    // Frame-1 safety: when uSampleIndex is 1 the history texture hasn't
    // been written yet (MRT FBOs allocate with undefined contents in
    // WebGL2 — some drivers return NaN for RGBA16F). Skip the history
    // read entirely and just pass the current sample through.
    if (uSampleIndex <= 1) {
        outMain = curMain;
        outAux  = curAux;
        return;
    }
    vec4 histMain = texture(uHistoryMain, vUv);
    vec4 histAux  = texture(uHistoryAux,  vUv);
    float w = 1.0 / float(uSampleIndex);
    outMain = mix(histMain, curMain, w);
    outAux  = mix(histAux,  curAux,  w);
}`,Ee=1e-5,Ae=8,sr=5,nr=.002,lr=.005,cr=5,ur=.2,te=256,dr=.5,pr=(i,e="/blueNoise.png",r)=>{const t=i.createTexture();if(!t)throw new Error("[createBlueNoiseWebGL2] failed to allocate texture");i.bindTexture(i.TEXTURE_2D,t),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,new Uint8Array([128,128,128,128])),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.REPEAT),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.REPEAT);let o=[64,64];const l=new Image;return l.crossOrigin="anonymous",l.onload=()=>{i.isContextLost()||!i.isTexture(t)||(i.bindTexture(i.TEXTURE_2D,t),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,i.RGBA,i.UNSIGNED_BYTE,l),o=[l.naturalWidth,l.naturalHeight])},l.onerror=n=>{console.warn("[createBlueNoiseWebGL2] failed to load",e,n)},l.src=e,{texture:t,getResolution:()=>o}};function mr(i){switch(i){case"linear":return 0;case"perceptual":return 1;case"vivid":return 2}}function fr(i){switch(i){case"none":return 0;case"reinhard":return 1;case"agx":return 2;case"filmic":return 3}}function hr(i){switch(i){case"add":return 0;case"screen":return 1;case"max":return 2;case"over":return 3}}function ie(i){switch(i){case"iterations":return 0;case"angle":return 1;case"magnitude":return 2;case"decomposition":return 3;case"bands":return 4;case"orbit-point":return 5;case"orbit-circle":return 6;case"orbit-cross":return 7;case"orbit-line":return 8;case"stripe":return 9;case"distance":return 10;case"derivative":return 11;case"potential":return 12;case"trap-iter":return 13}}function gr(i){switch(i){case"orbit-point":return 0;case"orbit-circle":return 1;case"orbit-cross":return 2;case"orbit-line":return 3;case"trap-iter":return 0;default:return 0}}const vr={juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],zoom:1.2904749020480561,maxIter:310,escapeR:32,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:-1200,interiorDamp:.59,dt:.016,dissipation:.17,dyeDissipation:1.03,dyeInject:8,vorticity:22.1,pressureIters:50,show:"composite",juliaMix:.4,dyeMix:2,velocityViz:.02,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:1.03,dyeSaturationBoost:1,vorticityScale:1,toneMapping:"none",exposure:1,vibrance:1.645,fluidStyle:"plain",bloomAmount:0,bloomThreshold:1,aberration:.27,refraction:.037,refractSmooth:3,refractRoughness:0,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!1,collisionPreview:!1,collisionRepeat:1,collisionPhase:0,paused:!1,simResolution:1344,autoQuality:!0,tsaa:!0,tsaaJitterAmount:1,tsaaSampleCap:64,tsaaPerFrameSamples:4,tsaaGridSize:16,tsaaJitterMode:"grid"};class xr{constructor(e,r={}){y(this,"gl");y(this,"canvas");y(this,"quadVbo");y(this,"progJulia");y(this,"progMotion");y(this,"progAddForce");y(this,"progInjectDye");y(this,"progAdvect");y(this,"progDivergence");y(this,"progCurl");y(this,"progVorticity");y(this,"progPressure");y(this,"progGradSub");y(this,"progSplat");y(this,"progDisplay");y(this,"progClear");y(this,"progReproject");y(this,"progBloomExtract");y(this,"progBloomDown");y(this,"progBloomUp");y(this,"progMask");y(this,"progTsaaBlend");y(this,"juliaTsaa");y(this,"juliaTsaaPrev");y(this,"tsaaSampleIndex",0);y(this,"tsaaParamHash","");y(this,"blueNoise",null);y(this,"frameCount",0);y(this,"bloomA");y(this,"bloomB");y(this,"bloomC");y(this,"bloomDirty",!0);y(this,"lastCenter",[0,0]);y(this,"lastZoom",1.5);y(this,"firstFrame",!0);y(this,"simW",0);y(this,"simH",0);y(this,"juliaCur");y(this,"juliaPrev");y(this,"forceTex");y(this,"velocity");y(this,"dye");y(this,"divergence");y(this,"pressure");y(this,"curl");y(this,"maskTex");y(this,"gradientTex",null);y(this,"collisionGradientTex",null);y(this,"params",{...vr});y(this,"lastTimeMs",0);y(this,"framebufferFormat");y(this,"maskReadFBO",null);y(this,"maskCpuBuf",new Uint8Array(0));y(this,"MASK_CPU_W",128);y(this,"MASK_CPU_H",128);y(this,"onFrameEnd");this.canvas=e,this.onFrameEnd=r.onFrameEnd;const t=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!t)throw new Error("WebGL2 required — your browser does not support it.");this.gl=t;const o=t.getExtension("EXT_color_buffer_float"),l=t.getExtension("EXT_color_buffer_half_float");if(!o&&!l)throw new Error("Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.");this.framebufferFormat=this.detectFormat(),this.quadVbo=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.quadVbo),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),this.compileAll(),this.allocateTextures(this.params.simResolution),this.blueNoise=pr(t)}detectFormat(){const e=this.gl,r=[{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,name:"RGBA16F half_float"},{internal:e.RGBA32F,format:e.RGBA,type:e.FLOAT,name:"RGBA32F float"},{internal:e.RGBA8,format:e.RGBA,type:e.UNSIGNED_BYTE,name:"RGBA8 fallback"}];for(const t of r){const o=e.createTexture();e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,t.internal,4,4,0,t.format,t.type,null);const l=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,l),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0);const n=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(l),e.deleteTexture(o),n===e.FRAMEBUFFER_COMPLETE)return console.info(`[FluidEngine] Using ${t.name} render targets.`),t}throw new Error("No renderable texture format supported (not even RGBA8).")}compileShader(e,r){const t=this.gl,o=t.createShader(e);if(t.shaderSource(o,r),t.compileShader(o),!t.getShaderParameter(o,t.COMPILE_STATUS)){const l=t.getShaderInfoLog(o)||"",n=r.split(`
`).map((a,c)=>`${String(c+1).padStart(4)}: ${a}`).join(`
`);throw console.error(`Shader compile error:
${l}
${n}`),new Error(`Shader compile error: ${l}`)}return o}linkProgram(e,r,t){const o=this.gl,l=this.compileShader(o.VERTEX_SHADER,e),n=this.compileShader(o.FRAGMENT_SHADER,r),a=o.createProgram();if(o.attachShader(a,l),o.attachShader(a,n),o.bindAttribLocation(a,0,"aPos"),o.linkProgram(a),!o.getProgramParameter(a,o.LINK_STATUS))throw new Error(`Program link error: ${o.getProgramInfoLog(a)}`);o.deleteShader(l),o.deleteShader(n);const c={};for(const h of t)c[h]=o.getUniformLocation(a,h);return{prog:a,uniforms:c}}compileAll(){this.progJulia=this.linkProgram(_,Gi,["uTexel","uKind","uJuliaC","uCenter","uScale","uAspect","uMaxIter","uEscapeR2","uPower","uColorIter","uTrapMode","uTrapCenter","uTrapRadius","uTrapNormal","uTrapOffset","uStripeFreq","uJitterScale","uResolution","uBlueNoiseTexture","uBlueNoiseResolution","uFrameCount","uPerFrameSamples","uJitterMode","uGridSize","uTsaaSampleIndex"]),this.progTsaaBlend=this.linkProgram(_,ar,["uCurrentMain","uCurrentAux","uHistoryMain","uHistoryAux","uSampleIndex"]),this.progMotion=this.linkProgram(_,Ni,["uTexel","uJulia","uJuliaPrev","uJuliaAux","uGradient","uMask","uMode","uGain","uDt","uInteriorDamp","uDyeGain","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uForceCap"]),this.progAddForce=this.linkProgram(_,Vi,["uTexel","uVelocity","uForce","uMask","uDt"]),this.progInjectDye=this.linkProgram(_,Hi,["uTexel","uDye","uJulia","uJuliaAux","uGradient","uMask","uDyeGain","uDyeFadeHz","uDt","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uDyeBlend","uDyeDecayMode","uDyeChromaFadeHz","uDyeSatBoost"]),this.progAdvect=this.linkProgram(_,Ji,["uTexel","uVelocity","uSource","uMask","uDt","uDissipation","uEdgeMargin"]),this.progDivergence=this.linkProgram(_,Xi,["uTexel","uVelocity"]),this.progCurl=this.linkProgram(_,Ki,["uTexel","uVelocity"]),this.progVorticity=this.linkProgram(_,Wi,["uTexel","uVelocity","uCurl","uStrength","uScale","uDt"]),this.progPressure=this.linkProgram(_,qi,["uTexel","uPressure","uDivergence"]),this.progGradSub=this.linkProgram(_,Yi,["uTexel","uPressure","uVelocity","uMask"]),this.progSplat=this.linkProgram(_,$i,["uTexel","uTarget","uPoint","uValue","uRadius","uDiscR","uHardness","uAspect","uOp"]),this.progDisplay=this.linkProgram(_,Zi,["uTexel","uTexelDisplay","uTexelDye","uJulia","uJuliaAux","uDye","uVelocity","uGradient","uBloom","uMask","uShowMode","uJuliaMix","uDyeMix","uVelocityViz","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uToneMapping","uExposure","uVibrance","uBloomAmount","uAberration","uRefraction","uRefractSmooth","uRefractRoughness","uCaustics","uCollisionPreview"]),this.progClear=this.linkProgram(_,er,["uValue"]),this.progReproject=this.linkProgram(_,or,["uTexel","uSource","uNewCenter","uOldCenter","uNewZoom","uOldZoom","uAspect"]),this.progBloomExtract=this.linkProgram(_,tr,["uTexel","uSource","uThreshold","uSoftKnee"]),this.progBloomDown=this.linkProgram(_,ir,["uTexel","uSource"]),this.progBloomUp=this.linkProgram(_,rr,["uTexel","uSource","uPrev","uIntensity"]),this.progMask=this.linkProgram(_,Qi,["uTexel","uJulia","uJuliaAux","uGradient","uCollisionGradient","uCollisionRepeat","uCollisionPhase","uColorMapping","uGradientRepeat","uGradientPhase"])}createFBO(e,r){const t=this.gl,o=t.createTexture();t.bindTexture(t.TEXTURE_2D,o),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,r,0,this.framebufferFormat.format,this.framebufferFormat.type,null);const l=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,l),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,o,0),t.viewport(0,0,e,r),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{tex:o,fbo:l,width:e,height:r,texel:[1/e,1/r]}}createMrtFbo(e,r){const t=this.gl,o=()=>{const c=t.createTexture();return t.bindTexture(t.TEXTURE_2D,c),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,r,0,this.framebufferFormat.format,this.framebufferFormat.type,null),c},l=o(),n=o(),a=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,a),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,l,0),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT1,t.TEXTURE_2D,n,0),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1]),t.viewport(0,0,e,r),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{texMain:l,texAux:n,fbo:a,width:e,height:r,texel:[1/e,1/r]}}deleteMrtFbo(e){if(!e)return;const r=this.gl;r.deleteTexture(e.texMain),r.deleteTexture(e.texAux),r.deleteFramebuffer(e.fbo)}createDoubleFBO(e,r){let t=this.createFBO(e,r),o=this.createFBO(e,r);return{width:e,height:r,texel:[1/e,1/r],get read(){return t},get write(){return o},swap(){const n=t;t=o,o=n}}}deleteFBO(e){if(!e)return;const r=this.gl;r.deleteTexture(e.tex),r.deleteFramebuffer(e.fbo)}deleteDoubleFBO(e){e&&(this.deleteFBO(e.read),this.deleteFBO(e.write))}allocateTextures(e){const r=this.canvas.width/Math.max(1,this.canvas.height),t=Math.max(32,e|0),o=Math.max(32,Math.round(t*r));o===this.simW&&t===this.simH&&this.juliaCur||(this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.simW=o,this.simH=t,this.juliaCur=this.createMrtFbo(o,t),this.juliaPrev=this.createMrtFbo(o,t),this.juliaTsaa=this.createMrtFbo(o,t),this.juliaTsaaPrev=this.createMrtFbo(o,t),this.tsaaSampleIndex=0,this.forceTex=this.createFBO(o,t),this.velocity=this.createDoubleFBO(o,t),this.dye=this.createDoubleFBO(o,t),this.divergence=this.createFBO(o,t),this.pressure=this.createDoubleFBO(o,t),this.curl=this.createFBO(o,t),this.maskTex=this.createFBO(o,t),this.firstFrame=!0)}bindFBO(e){const r=this.gl;r.bindFramebuffer(r.FRAMEBUFFER,e.fbo),r.viewport(0,0,e.width,e.height)}useProgram(e){const r=this.gl;r.useProgram(e.prog),r.bindBuffer(r.ARRAY_BUFFER,this.quadVbo),r.enableVertexAttribArray(0),r.vertexAttribPointer(0,2,r.FLOAT,!1,0,0)}drawQuad(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}setTexel(e,r,t){const o=this.gl,l=e.uniforms.uTexel;l&&o.uniform2f(l,1/r,1/t)}bindTex(e,r,t){const o=this.gl;o.activeTexture(o.TEXTURE0+e),o.bindTexture(o.TEXTURE_2D,r),t&&o.uniform1i(t,e)}setParams(e){this.params={...this.params,...e},e.simResolution&&e.simResolution!==this.simH&&this.allocateTextures(e.simResolution)}uploadLut(e,r){const t=this.gl,o=te*4;r.length!==o&&console.warn(`[FluidEngine] ${e} gradient buffer unexpected length ${r.length} (want ${o})`);let l=e==="main"?this.gradientTex:this.collisionGradientTex;l||(l=t.createTexture(),e==="main"?this.gradientTex=l:this.collisionGradientTex=l),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,l),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,te,1,0,t.RGBA,t.UNSIGNED_BYTE,r)}setGradientBuffer(e){this.uploadLut("main",e)}setCollisionGradientBuffer(e){this.uploadLut("collision",e)}ensureGradient(){if(this.gradientTex)return;const e=te,r=new Uint8Array(e*4);for(let t=0;t<e;++t)r[t*4+0]=t,r[t*4+1]=t,r[t*4+2]=t,r[t*4+3]=255;this.setGradientBuffer(r)}ensureCollisionGradient(){if(this.collisionGradientTex)return;const e=te,r=new Uint8Array(e*4);for(let t=0;t<e;++t)r[t*4+0]=0,r[t*4+1]=0,r[t*4+2]=0,r[t*4+3]=255;this.setCollisionGradientBuffer(r)}resize(e,r){const t=Math.min(window.devicePixelRatio||1,2),o=Math.max(1,Math.round(e*t)),l=Math.max(1,Math.round(r*t));(this.canvas.width!==o||this.canvas.height!==l)&&(this.canvas.width=o,this.canvas.height=l,this.allocateTextures(this.params.simResolution),this.bloomDirty=!0)}ensureBloomFbos(){if(!this.bloomDirty&&this.bloomA)return;this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC);const e=this.canvas.width,r=this.canvas.height,t=Math.max(4,e>>1&-2),o=Math.max(4,r>>1&-2),l=Math.max(2,e>>2&-2),n=Math.max(2,r>>2&-2),a=Math.max(2,e>>3&-2),c=Math.max(2,r>>3&-2);this.bloomA=this.createFBO(t,o),this.bloomB=this.createFBO(l,n),this.bloomC=this.createFBO(a,c),this.bloomDirty=!1}markFirstFrame(){this.firstFrame=!0}resetFluid(){const e=this.gl;for(const r of[this.velocity,this.dye,this.pressure])for(const t of[r.read,r.write])this.bindFBO(t),this.useProgram(this.progClear),e.uniform4f(this.progClear.uniforms.uValue,0,0,0,1),this.drawQuad();e.bindFramebuffer(e.FRAMEBUFFER,null),this.markFirstFrame()}splat(e,r,t,o,l,n,a){const c=this.gl;this.bindFBO(e.write),this.useProgram(this.progSplat),this.bindTex(0,e.read.tex,this.progSplat.uniforms.uTarget),c.uniform2f(this.progSplat.uniforms.uPoint,r,t),c.uniform3f(this.progSplat.uniforms.uValue,o[0],o[1],o[2]),c.uniform1f(this.progSplat.uniforms.uRadius,Math.max(1e-6,l*.5*(l*.5))),c.uniform1f(this.progSplat.uniforms.uDiscR,Math.max(1e-6,l)),c.uniform1f(this.progSplat.uniforms.uHardness,n),c.uniform1f(this.progSplat.uniforms.uAspect,this.simW/this.simH),c.uniform1f(this.progSplat.uniforms.uOp,a==="sub"?1:0),this.drawQuad(),e.swap()}brush(e,r,t,o,l,n,a,c,h){e=Math.max(0,Math.min(1,e)),r=Math.max(0,Math.min(1,r));const v=[l[0]*c,l[1]*c,l[2]*c],w=[t,o,0];switch(h){case"paint":this.splat(this.velocity,e,r,w,n,a,"add"),this.splat(this.dye,e,r,v,n,a,"add");break;case"erase":this.splat(this.dye,e,r,[c,c,c],n,a,"sub");break;case"stamp":this.splat(this.dye,e,r,v,n,a,"add");break;case"smudge":this.splat(this.velocity,e,r,w,n,a,"add");break}this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}ensureMaskReadFBO(){if(this.maskReadFBO)return;const e=this.gl,r=e.createTexture();e.bindTexture(e.TEXTURE_2D,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,this.MASK_CPU_W,this.MASK_CPU_H,0,e.RGBA,e.UNSIGNED_BYTE,null);const t=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,t),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),this.maskReadFBO={tex:r,fbo:t,width:this.MASK_CPU_W,height:this.MASK_CPU_H,texel:[1/this.MASK_CPU_W,1/this.MASK_CPU_H]},this.maskCpuBuf=new Uint8Array(this.MASK_CPU_W*this.MASK_CPU_H*4)}readMaskToCPU(){if(!this.params.collisionEnabled)return;const e=this.gl;this.ensureMaskReadFBO(),e.bindFramebuffer(e.READ_FRAMEBUFFER,this.maskTex.fbo),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,this.maskReadFBO.fbo),e.blitFramebuffer(0,0,this.simW,this.simH,0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.COLOR_BUFFER_BIT,e.LINEAR),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.FRAMEBUFFER,this.maskReadFBO.fbo),e.readPixels(0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.RGBA,e.UNSIGNED_BYTE,this.maskCpuBuf),e.bindFramebuffer(e.FRAMEBUFFER,null)}sampleMask(e,r){if(!this.params.collisionEnabled||this.maskCpuBuf.length===0)return 0;const t=this.MASK_CPU_W,o=this.MASK_CPU_H;if(e<0||e>1||r<0||r>1)return 0;const l=Math.min(t-1,Math.max(0,Math.floor(e*t))),n=Math.min(o-1,Math.max(0,Math.floor(r*o)));return this.maskCpuBuf[(n*t+l)*4]/255}renderJulia(){const e=this.gl,r=this.juliaCur;this.juliaCur=this.juliaPrev,this.juliaPrev=r,e.bindFramebuffer(e.FRAMEBUFFER,this.juliaCur.fbo),e.viewport(0,0,this.juliaCur.width,this.juliaCur.height),this.useProgram(this.progJulia),this.setTexel(this.progJulia,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uKind,this.params.kind==="julia"?0:1),e.uniform2f(this.progJulia.uniforms.uJuliaC,this.params.juliaC[0],this.params.juliaC[1]),e.uniform2f(this.progJulia.uniforms.uCenter,this.params.center[0],this.params.center[1]),e.uniform1f(this.progJulia.uniforms.uScale,this.params.zoom),e.uniform1f(this.progJulia.uniforms.uAspect,this.simW/this.simH);const t=Math.max(4,this.params.maxIter|0);e.uniform1i(this.progJulia.uniforms.uMaxIter,t),e.uniform1i(this.progJulia.uniforms.uColorIter,Math.max(1,Math.min(t,this.params.colorIter|0))),e.uniform1f(this.progJulia.uniforms.uEscapeR2,this.params.escapeR*this.params.escapeR),e.uniform1f(this.progJulia.uniforms.uPower,this.params.power),e.uniform1i(this.progJulia.uniforms.uTrapMode,gr(this.params.colorMapping)),e.uniform2f(this.progJulia.uniforms.uTrapCenter,this.params.trapCenter[0],this.params.trapCenter[1]),e.uniform1f(this.progJulia.uniforms.uTrapRadius,this.params.trapRadius),e.uniform2f(this.progJulia.uniforms.uTrapNormal,this.params.trapNormal[0],this.params.trapNormal[1]),e.uniform1f(this.progJulia.uniforms.uTrapOffset,this.params.trapOffset),e.uniform1f(this.progJulia.uniforms.uStripeFreq,this.params.stripeFreq);const l=this.params.tsaa&&this.tsaaSampleIndex<this.params.tsaaSampleCap?this.params.tsaaJitterAmount:0;if(e.uniform1f(this.progJulia.uniforms.uJitterScale,l),e.uniform2f(this.progJulia.uniforms.uResolution,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uFrameCount,this.frameCount),e.uniform1i(this.progJulia.uniforms.uPerFrameSamples,this.params.tsaaPerFrameSamples??1),e.uniform1i(this.progJulia.uniforms.uJitterMode,this.params.tsaaJitterMode==="grid"?1:0),e.uniform1i(this.progJulia.uniforms.uGridSize,this.params.tsaaGridSize??16),e.uniform1i(this.progJulia.uniforms.uTsaaSampleIndex,this.tsaaSampleIndex),this.blueNoise){this.bindTex(5,this.blueNoise.texture,this.progJulia.uniforms.uBlueNoiseTexture);const[n,a]=this.blueNoise.getResolution();e.uniform2f(this.progJulia.uniforms.uBlueNoiseResolution,n,a)}this.drawQuad()}runTsaaBlend(){if(this.tsaaSampleIndex>=this.params.tsaaSampleCap)return;const e=this.gl;this.tsaaSampleIndex=Math.min(this.tsaaSampleIndex+1,this.params.tsaaSampleCap),e.bindFramebuffer(e.FRAMEBUFFER,this.juliaTsaaPrev.fbo),e.viewport(0,0,this.juliaTsaaPrev.width,this.juliaTsaaPrev.height),this.useProgram(this.progTsaaBlend),this.bindTex(0,this.juliaCur.texMain,this.progTsaaBlend.uniforms.uCurrentMain),this.bindTex(1,this.juliaCur.texAux,this.progTsaaBlend.uniforms.uCurrentAux),this.bindTex(2,this.juliaTsaa.texMain,this.progTsaaBlend.uniforms.uHistoryMain),this.bindTex(3,this.juliaTsaa.texAux,this.progTsaaBlend.uniforms.uHistoryAux),e.uniform1i(this.progTsaaBlend.uniforms.uSampleIndex,this.tsaaSampleIndex),this.drawQuad();const r=this.juliaTsaa;this.juliaTsaa=this.juliaTsaaPrev,this.juliaTsaaPrev=r}juliaReadFbo(){return this.params.tsaa?this.juliaTsaa:this.juliaCur}updateTsaaHash(){const e=this.params,r=`${e.kind}|${e.juliaC[0]}|${e.juliaC[1]}|${e.center[0]}|${e.center[1]}|${e.zoom}|${e.power}|${e.maxIter}|${e.colorIter}|${e.escapeR}|${e.colorMapping}|${e.trapCenter[0]}|${e.trapCenter[1]}|${e.trapRadius}|${e.trapNormal[0]}|${e.trapNormal[1]}|${e.trapOffset}|${e.stripeFreq}`;r!==this.tsaaParamHash&&(this.tsaaParamHash=r,this.tsaaSampleIndex=0)}computeMask(){const e=this.gl;if(this.ensureGradient(),this.ensureCollisionGradient(),this.bindFBO(this.maskTex),!this.params.collisionEnabled){e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);return}this.useProgram(this.progMask),this.setTexel(this.progMask,this.simW,this.simH);const r=this.juliaReadFbo();this.bindTex(0,r.texMain,this.progMask.uniforms.uJulia),this.bindTex(1,r.texAux,this.progMask.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMask.uniforms.uGradient),this.bindTex(3,this.collisionGradientTex,this.progMask.uniforms.uCollisionGradient),e.uniform1i(this.progMask.uniforms.uColorMapping,ie(this.params.colorMapping)),e.uniform1f(this.progMask.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMask.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMask.uniforms.uCollisionRepeat,this.params.collisionRepeat),e.uniform1f(this.progMask.uniforms.uCollisionPhase,this.params.collisionPhase),this.drawQuad()}computeForce(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.forceTex),this.useProgram(this.progMotion),this.setTexel(this.progMotion,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMotion.uniforms.uJulia),this.bindTex(1,this.juliaPrev.texMain,this.progMotion.uniforms.uJuliaPrev),this.bindTex(4,this.juliaCur.texAux,this.progMotion.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMotion.uniforms.uGradient),this.bindTex(5,this.maskTex.tex,this.progMotion.uniforms.uMask),e.uniform1i(this.progMotion.uniforms.uMode,yr(this.params.forceMode)),e.uniform1f(this.progMotion.uniforms.uGain,this.params.forceGain),e.uniform1f(this.progMotion.uniforms.uDt,this.params.dt),e.uniform1f(this.progMotion.uniforms.uInteriorDamp,this.params.interiorDamp),e.uniform1f(this.progMotion.uniforms.uDyeGain,this.params.dyeInject),e.uniform1i(this.progMotion.uniforms.uColorMapping,ie(this.params.colorMapping)),e.uniform1f(this.progMotion.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMotion.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMotion.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1f(this.progMotion.uniforms.uForceCap,this.params.forceCap),this.drawQuad()}addForceToVelocity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progAddForce),this.setTexel(this.progAddForce,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAddForce.uniforms.uVelocity),this.bindTex(1,this.forceTex.tex,this.progAddForce.uniforms.uForce),this.bindTex(2,this.maskTex.tex,this.progAddForce.uniforms.uMask),e.uniform1f(this.progAddForce.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}injectDye(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.dye.write),this.useProgram(this.progInjectDye),this.setTexel(this.progInjectDye,this.simW,this.simH);const r=this.juliaReadFbo();this.bindTex(0,this.dye.read.tex,this.progInjectDye.uniforms.uDye),this.bindTex(1,r.texMain,this.progInjectDye.uniforms.uJulia),this.bindTex(2,this.gradientTex,this.progInjectDye.uniforms.uGradient),this.bindTex(4,r.texAux,this.progInjectDye.uniforms.uJuliaAux),this.bindTex(5,this.maskTex.tex,this.progInjectDye.uniforms.uMask),e.uniform1f(this.progInjectDye.uniforms.uDyeGain,this.params.dyeInject),e.uniform1f(this.progInjectDye.uniforms.uDyeFadeHz,this.params.dyeDissipation),e.uniform1f(this.progInjectDye.uniforms.uDt,this.params.dt),e.uniform1i(this.progInjectDye.uniforms.uColorMapping,ie(this.params.colorMapping)),e.uniform1f(this.progInjectDye.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progInjectDye.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progInjectDye.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1i(this.progInjectDye.uniforms.uDyeBlend,hr(this.params.dyeBlend)),e.uniform1i(this.progInjectDye.uniforms.uDyeDecayMode,mr(this.params.dyeDecayMode)),e.uniform1f(this.progInjectDye.uniforms.uDyeChromaFadeHz,this.params.dyeChromaDecayHz),e.uniform1f(this.progInjectDye.uniforms.uDyeSatBoost,this.params.dyeSaturationBoost),this.drawQuad(),this.dye.swap()}computeCurl(){this.bindFBO(this.curl),this.useProgram(this.progCurl),this.setTexel(this.progCurl,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progCurl.uniforms.uVelocity),this.drawQuad()}applyVorticity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progVorticity),this.setTexel(this.progVorticity,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progVorticity.uniforms.uVelocity),this.bindTex(1,this.curl.tex,this.progVorticity.uniforms.uCurl),e.uniform1f(this.progVorticity.uniforms.uStrength,this.params.vorticity),e.uniform1f(this.progVorticity.uniforms.uScale,this.params.vorticityScale),e.uniform1f(this.progVorticity.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}computeDivergence(){this.bindFBO(this.divergence),this.useProgram(this.progDivergence),this.setTexel(this.progDivergence,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progDivergence.uniforms.uVelocity),this.drawQuad()}solvePressure(){const e=this.gl;this.bindFBO(this.pressure.read),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);for(let r=0;r<this.params.pressureIters;++r)this.bindFBO(this.pressure.write),this.useProgram(this.progPressure),this.setTexel(this.progPressure,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progPressure.uniforms.uPressure),this.bindTex(1,this.divergence.tex,this.progPressure.uniforms.uDivergence),this.drawQuad(),this.pressure.swap()}subtractPressureGradient(){this.bindFBO(this.velocity.write),this.useProgram(this.progGradSub),this.setTexel(this.progGradSub,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progGradSub.uniforms.uPressure),this.bindTex(1,this.velocity.read.tex,this.progGradSub.uniforms.uVelocity),this.bindTex(2,this.maskTex.tex,this.progGradSub.uniforms.uMask),this.drawQuad(),this.velocity.swap()}advect(e,r){const t=this.gl;this.bindFBO(e.write),this.useProgram(this.progAdvect),this.setTexel(this.progAdvect,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAdvect.uniforms.uVelocity),this.bindTex(1,e.read.tex,this.progAdvect.uniforms.uSource),this.bindTex(2,this.maskTex.tex,this.progAdvect.uniforms.uMask),t.uniform1f(this.progAdvect.uniforms.uDt,this.params.dt),t.uniform1f(this.progAdvect.uniforms.uDissipation,r),t.uniform1f(this.progAdvect.uniforms.uEdgeMargin,this.params.edgeMargin),this.drawQuad(),e.swap()}reprojectTexture(e,r,t){const o=this.gl;this.bindFBO(e.write),this.useProgram(this.progReproject),this.setTexel(this.progReproject,this.simW,this.simH),this.bindTex(0,e.read.tex,this.progReproject.uniforms.uSource),o.uniform2f(this.progReproject.uniforms.uNewCenter,this.params.center[0],this.params.center[1]),o.uniform2f(this.progReproject.uniforms.uOldCenter,r[0],r[1]),o.uniform1f(this.progReproject.uniforms.uNewZoom,this.params.zoom),o.uniform1f(this.progReproject.uniforms.uOldZoom,t),o.uniform1f(this.progReproject.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}maybeReprojectForCamera(){if(this.firstFrame){this.firstFrame=!1,this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom;return}const e=this.params.center[0]-this.lastCenter[0],r=this.params.center[1]-this.lastCenter[1],t=this.params.zoom-this.lastZoom;if(Math.abs(e)<1e-7&&Math.abs(r)<1e-7&&Math.abs(t)<1e-7)return;const o=[this.lastCenter[0],this.lastCenter[1]],l=this.lastZoom;this.reprojectTexture(this.dye,o,l),this.reprojectTexture(this.velocity,o,l),this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom}displayToScreen(){const e=this.gl;this.ensureGradient();const r=this.params.bloomAmount>.001;r&&(this.ensureBloomFbos(),this.bindFBO(this.bloomA),this.setDisplayUniforms(null,!0),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomExtract),e.uniform2f(this.progBloomExtract.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomA.tex,this.progBloomExtract.uniforms.uSource),e.uniform1f(this.progBloomExtract.uniforms.uThreshold,this.params.bloomThreshold),e.uniform1f(this.progBloomExtract.uniforms.uSoftKnee,dr),this.drawQuad(),this.bindFBO(this.bloomC),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomA),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomUp),e.uniform2f(this.progBloomUp.uniforms.uTexel,this.bloomC.texel[0],this.bloomC.texel[1]),this.bindTex(0,this.bloomC.tex,this.progBloomUp.uniforms.uSource),this.bindTex(1,this.bloomA.tex,this.progBloomUp.uniforms.uPrev),e.uniform1f(this.progBloomUp.uniforms.uIntensity,1),this.drawQuad()),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.setDisplayUniforms(r?this.bloomB:null,!1),this.drawQuad()}setDisplayUniforms(e,r=!1){const t=this.gl;this.useProgram(this.progDisplay),t.uniform2f(this.progDisplay.uniforms.uTexelDisplay,1/this.canvas.width,1/this.canvas.height),t.uniform2f(this.progDisplay.uniforms.uTexelDye,1/this.simW,1/this.simH);const o=this.juliaReadFbo();this.bindTex(0,o.texMain,this.progDisplay.uniforms.uJulia),this.bindTex(4,o.texAux,this.progDisplay.uniforms.uJuliaAux),this.bindTex(1,this.dye.read.tex,this.progDisplay.uniforms.uDye),this.bindTex(2,this.velocity.read.tex,this.progDisplay.uniforms.uVelocity),this.bindTex(3,this.gradientTex,this.progDisplay.uniforms.uGradient),this.bindTex(5,(e==null?void 0:e.tex)??this.gradientTex,this.progDisplay.uniforms.uBloom),this.bindTex(6,this.maskTex.tex,this.progDisplay.uniforms.uMask),t.uniform1i(this.progDisplay.uniforms.uShowMode,br(this.params.show)),t.uniform1f(this.progDisplay.uniforms.uJuliaMix,this.params.juliaMix),t.uniform1f(this.progDisplay.uniforms.uDyeMix,this.params.dyeMix),t.uniform1f(this.progDisplay.uniforms.uVelocityViz,this.params.velocityViz),t.uniform1i(this.progDisplay.uniforms.uColorMapping,ie(this.params.colorMapping)),t.uniform1f(this.progDisplay.uniforms.uGradientRepeat,this.params.gradientRepeat),t.uniform1f(this.progDisplay.uniforms.uGradientPhase,this.params.gradientPhase),t.uniform3f(this.progDisplay.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),r?(t.uniform1i(this.progDisplay.uniforms.uToneMapping,0),t.uniform1f(this.progDisplay.uniforms.uExposure,1),t.uniform1f(this.progDisplay.uniforms.uVibrance,0),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,0),t.uniform1f(this.progDisplay.uniforms.uAberration,0),t.uniform1f(this.progDisplay.uniforms.uRefraction,0),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,1),t.uniform1f(this.progDisplay.uniforms.uRefractRoughness,0),t.uniform1f(this.progDisplay.uniforms.uCaustics,0),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,0)):(t.uniform1i(this.progDisplay.uniforms.uToneMapping,fr(this.params.toneMapping)),t.uniform1f(this.progDisplay.uniforms.uExposure,this.params.exposure),t.uniform1f(this.progDisplay.uniforms.uVibrance,this.params.vibrance),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,e?this.params.bloomAmount:0),t.uniform1f(this.progDisplay.uniforms.uAberration,this.params.aberration),t.uniform1f(this.progDisplay.uniforms.uRefraction,this.params.refraction),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,this.params.refractSmooth),t.uniform1f(this.progDisplay.uniforms.uRefractRoughness,this.params.refractRoughness),t.uniform1f(this.progDisplay.uniforms.uCaustics,this.params.caustics),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,this.params.collisionPreview?1:0))}frame(e){const r=this.gl,t=this.lastTimeMs===0?.016:Math.min(.05,(e-this.lastTimeMs)/1e3);this.lastTimeMs=e,this.params.dt=t,this.updateTsaaHash(),this.frameCount++,this.renderJulia(),this.params.tsaa&&this.runTsaaBlend(),this.computeMask(),this.readMaskToCPU(),this.params.paused||(this.maybeReprojectForCamera(),this.computeForce(),this.addForceToVelocity(),this.params.vorticity>0&&(this.computeCurl(),this.applyVorticity()),this.computeDivergence(),this.solvePressure(),this.subtractPressureGradient(),this.advect(this.velocity,this.params.dissipation),this.injectDye(),this.advect(this.dye,this.params.dyeDissipation)),this.displayToScreen(),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,null),this.onFrameEnd&&this.onFrameEnd()}dispose(){const e=this.gl;this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.maskReadFBO&&(this.deleteFBO(this.maskReadFBO),this.maskReadFBO=null),this.gradientTex&&(e.deleteTexture(this.gradientTex),this.gradientTex=null),this.collisionGradientTex&&(e.deleteTexture(this.collisionGradientTex),this.collisionGradientTex=null),this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC),e.deleteBuffer(this.quadVbo);for(const r of[this.progJulia,this.progMotion,this.progAddForce,this.progInjectDye,this.progAdvect,this.progDivergence,this.progCurl,this.progVorticity,this.progPressure,this.progGradSub,this.progSplat,this.progDisplay,this.progClear,this.progReproject,this.progMask,this.progTsaaBlend,this.progBloomExtract,this.progBloomDown,this.progBloomUp])r!=null&&r.prog&&e.deleteProgram(r.prog);this.blueNoise&&(e.deleteTexture(this.blueNoise.texture),this.blueNoise=null)}canvasToFractal(e,r){const t=this.canvas.getBoundingClientRect(),o=(e-t.left)/t.width,l=1-(r-t.top)/t.height,n=this.canvas.width/this.canvas.height,a=(o*2-1)*n*this.params.zoom+this.params.center[0],c=(l*2-1)*this.params.zoom+this.params.center[1];return[a,c]}canvasToUv(e,r){const t=this.canvas.getBoundingClientRect();return[(e-t.left)/t.width,1-(r-t.top)/t.height]}}function yr(i){switch(i){case"gradient":return 0;case"curl":return 1;case"iterate":return 2;case"c-track":return 3;case"hue":return 4}}function br(i){switch(i){case"composite":return 0;case"julia":return 1;case"dye":return 2;case"velocity":return 3}}const je=()=>{var e,r,t;const i=b.getState().brush??{};return{mode:Ge(i.mode),colorMode:Ve(i.colorMode),solidColor:[((e=i.solidColor)==null?void 0:e.x)??1,((r=i.solidColor)==null?void 0:r.y)??1,((t=i.solidColor)==null?void 0:t.z)??1],gradientLut:V.ref.current.gradientLut,size:i.size??.1,hardness:i.hardness??0,strength:i.strength??1,flow:i.flow??50,spacing:i.spacing??.005,jitter:i.jitter??0,particleEmitter:!!i.particleEmitter,particleRate:i.particleRate??120,particleVelocity:i.particleVelocity??.3,particleSpread:i.particleSpread??.35,particleGravity:i.particleGravity??0,particleDrag:i.particleDrag??.6,particleLifetime:i.particleLifetime??1.2,particleSizeScale:i.particleSizeScale??.35}},N={b:!1,c:!1},$=(i,e)=>i?cr:e?ur:1,Mr=({canvasRef:i,engineRef:e})=>{const r=P.useRef({mode:"idle",pointerId:-1,lastX:0,lastY:0,lastT:0,startX:0,startY:0,startCx:0,startCy:0,startZoom:1,zoomAnchorX:0,zoomAnchorY:0,zoomAnchorU:.5,zoomAnchorV:.5,rightDragged:!1,startBrushSize:.15}),t=b(a=>a.handleInteractionStart),o=b(a=>a.handleInteractionEnd),l=b(a=>a.openContextMenu),n=P.useRef(null);return P.useEffect(()=>{const a=()=>{const w=document.activeElement;if(!w)return!1;const C=w.tagName;return C==="INPUT"||C==="TEXTAREA"||w.isContentEditable},c=w=>{a()||(w.code==="KeyB"&&(N.b=!0),w.code==="KeyC"&&(N.c=!0))},h=w=>{w.code==="KeyB"&&(N.b=!1),w.code==="KeyC"&&(N.c=!1)},v=()=>{N.b=!1,N.c=!1};return window.addEventListener("keydown",c),window.addEventListener("keyup",h),window.addEventListener("blur",v),()=>{window.removeEventListener("keydown",c),window.removeEventListener("keyup",h),window.removeEventListener("blur",v)}},[]),P.useEffect(()=>{const a=i.current;if(!a)return;const c=h=>{var S,f,g,D,M;h.preventDefault();const v=r.current;if(v.rightDragged){v.rightDragged=!1;return}const w=b.getState(),C=(S=w.julia)==null?void 0:S.juliaC,m=!!((f=w.coupling)!=null&&f.orbitEnabled),s=!!((g=w.fluidSim)!=null&&g.paused),u=[{label:`Copy Julia c (${((D=C==null?void 0:C.x)==null?void 0:D.toFixed(3))??"?"}, ${((M=C==null?void 0:C.y)==null?void 0:M.toFixed(3))??"?"})`,action:()=>{var R;if(!C)return;const x=`${C.x.toFixed(6)}, ${C.y.toFixed(6)}`;(R=navigator.clipboard)==null||R.writeText(x).catch(()=>{})}},{label:s?"Resume Sim":"Pause Sim",action:()=>{w.setFluidSim({paused:!s})}},{label:m?"Stop Auto Orbit":"Start Auto Orbit",action:()=>{w.setCoupling({orbitEnabled:!m})}},{label:"Recenter View",action:()=>{w.setJulia({center:{x:0,y:0},zoom:1.5})}},{label:"Reset Fluid Fields",action:()=>{var x;(x=e.current)==null||x.resetFluid()}}];l(h.clientX,h.clientY,u,["ui.fluid-canvas"])};return a.addEventListener("contextmenu",c),()=>a.removeEventListener("contextmenu",c)},[i,e,l]),P.useEffect(()=>{const a=i.current;if(!a)return;const c=m=>{var u,S,f,g,D,M,x,R,j,I,p;const s=r.current;if(s.pointerId=m.pointerId,s.lastX=m.clientX,s.lastY=m.clientY,s.lastT=performance.now(),s.startX=m.clientX,s.startY=m.clientY,m.button===2){const T=b.getState();s.mode="pan-pending",s.startCx=((S=(u=T.julia)==null?void 0:u.center)==null?void 0:S.x)??0,s.startCy=((g=(f=T.julia)==null?void 0:f.center)==null?void 0:g.y)??0,s.rightDragged=!1,a.setPointerCapture(m.pointerId),t("camera");return}if(m.button===1){m.preventDefault();const T=a.getBoundingClientRect();if(T.width<1||T.height<1)return;const F=b.getState(),A=((D=F.julia)==null?void 0:D.center)??{x:0,y:0},E=((M=F.julia)==null?void 0:M.zoom)??1.5,B=(m.clientX-T.left)/T.width,U=1-(m.clientY-T.top)/T.height,H=T.width/T.height;s.mode="zoom",s.startZoom=E,s.zoomAnchorU=B,s.zoomAnchorV=U,s.zoomAnchorX=A.x+(B*2-1)*H*E,s.zoomAnchorY=A.y+(U*2-1)*E,a.setPointerCapture(m.pointerId),t("camera");return}if(m.button===0){a.setPointerCapture(m.pointerId);const T=b.getState();if(N.c){s.mode="pick-c",s.startCx=((R=(x=T.julia)==null?void 0:x.juliaC)==null?void 0:R.x)??0,s.startCy=((I=(j=T.julia)==null?void 0:j.juliaC)==null?void 0:I.y)??0,t("param");return}if(N.b){s.mode="resize-brush",s.startBrushSize=((p=T.brush)==null?void 0:p.size)??.15,t("param");return}s.mode="splat",t("param"),Ri(V.ref.current.runtime),W.ref.current.dragging=!0;const F=a.getBoundingClientRect();if(F.width>=1&&F.height>=1&&e.current){const A=(m.clientX-F.left)/F.width,E=1-(m.clientY-F.top)/F.height;W.ref.current.uv={u:A,v:E},W.ref.current.velUv=null,Ci(V.ref.current.runtime,{u:A,v:E,dvx:0,dvy:0,params:je(),engine:e.current,wallClockMs:performance.now()})}return}},h=m=>{var S,f,g,D;const s=r.current;if(s.mode==="idle")return;const u=a.getBoundingClientRect();if(!(u.width<1||u.height<1)){if(s.mode==="pick-c"){const M=b.getState(),x=((S=M.julia)==null?void 0:S.zoom)??1.5,R=u.width/u.height,j=$(m.shiftKey,m.altKey),I=m.clientX-s.startX,p=m.clientY-s.startY,T=I/u.width*2*R*x*j,F=-(p/u.height)*2*x*j;M.setJulia({juliaC:{x:s.startCx+T,y:s.startCy+F}}),s.lastX=m.clientX,s.lastY=m.clientY;return}if(s.mode==="resize-brush"){const M=b.getState(),x=$(m.shiftKey,m.altKey),R=m.clientX-s.startX,j=Math.exp(R*.0033*x),I=Math.max(.003,Math.min(.4,s.startBrushSize*j));M.setBrush({size:I}),s.lastX=m.clientX,s.lastY=m.clientY;return}if(s.mode==="pan-pending")if(Math.hypot(m.clientX-s.startX,m.clientY-s.startY)>sr)s.mode="pan",s.rightDragged=!0;else return;if(s.mode==="pan"){const x=((f=b.getState().julia)==null?void 0:f.zoom)??1.5,R=u.width/u.height,j=$(m.shiftKey,m.altKey),I=m.clientX-s.startX,p=m.clientY-s.startY,T=-(I/u.width)*2*R*x*j,F=p/u.height*2*x*j,A=s.startCx+T,E=s.startCy+F;n.current={center:{x:A,y:E},zoom:x},(g=e.current)==null||g.setParams({center:[A,E]}),s.lastX=m.clientX,s.lastY=m.clientY;return}if(s.mode==="zoom"){const M=$(m.shiftKey,m.altKey),x=m.clientY-s.startY,R=Math.exp(x*lr*M),j=Math.max(Ee,Math.min(Ae,s.startZoom*R)),I=u.width/u.height,p=s.zoomAnchorX-(s.zoomAnchorU*2-1)*I*j,T=s.zoomAnchorY-(s.zoomAnchorV*2-1)*j;n.current={center:{x:p,y:T},zoom:j},(D=e.current)==null||D.setParams({center:[p,T],zoom:j}),s.lastX=m.clientX,s.lastY=m.clientY;return}if(s.mode==="splat"){const M=e.current;if(!M)return;const x=performance.now(),R=Math.max(.001,(x-s.lastT)/1e3),j=m.clientX-s.lastX,I=m.clientY-s.lastY,p=(m.clientX-u.left)/u.width,T=1-(m.clientY-u.top)/u.height,F=j/u.width/R,A=-(I/u.height)/R,E=Math.hypot(j/u.width,I/u.height);V.ref.current.runtime.distSinceSplat+=E,W.ref.current.uv={u:p,v:T},W.ref.current.velUv={vx:F,vy:A},wi(V.ref.current.runtime,{u:p,v:T,dvx:F,dvy:A,params:je(),engine:M,wallClockMs:x}),s.lastX=m.clientX,s.lastY=m.clientY,s.lastT=x;return}}},v=m=>{const s=r.current;if(s.pointerId===m.pointerId){try{a.releasePointerCapture(m.pointerId)}catch{}s.pointerId=-1}if(n.current){const u=n.current;n.current=null,b.getState().setJulia({center:u.center,zoom:u.zoom})}s.mode="idle",W.ref.current.dragging=!1,o()};let w=null;const C=m=>{var A;m.preventDefault();const s=a.getBoundingClientRect();if(s.width<1||s.height<1)return;const u=n.current??(()=>{var B,U;const E=b.getState();return{center:((B=E.julia)==null?void 0:B.center)??{x:0,y:0},zoom:((U=E.julia)==null?void 0:U.zoom)??1.5}})(),S=u.center,f=u.zoom,g=$(m.shiftKey,m.altKey),D=Math.pow(.9,-m.deltaY*nr*g),M=(m.clientX-s.left)/s.width,x=1-(m.clientY-s.top)/s.height,R=s.width/s.height,j=S.x+(M*2-1)*R*f,I=S.y+(x*2-1)*f,p=Math.max(Ee,Math.min(Ae,f*D)),T=j-(M*2-1)*R*p,F=I-(x*2-1)*p;n.current={center:{x:T,y:F},zoom:p},(A=e.current)==null||A.setParams({center:[T,F],zoom:p}),w!==null&&window.clearTimeout(w),w=window.setTimeout(()=>{if(w=null,!n.current)return;const E=n.current;n.current=null,b.getState().setJulia({center:E.center,zoom:E.zoom})},100)};return a.addEventListener("pointerdown",c),a.addEventListener("pointermove",h),a.addEventListener("pointerup",v),a.addEventListener("pointercancel",v),a.addEventListener("pointerleave",v),a.addEventListener("wheel",C,{passive:!1}),()=>{a.removeEventListener("pointerdown",c),a.removeEventListener("pointermove",h),a.removeEventListener("pointerup",v),a.removeEventListener("pointercancel",v),a.removeEventListener("pointerleave",v),a.removeEventListener("wheel",C),w!==null&&window.clearTimeout(w)}},[i,e,t,o]),null},Tr=i=>{Z.register({id:"fluid-toy.pause",key:"Space",description:"Pause / resume the fluid simulation",category:"Playback",handler:()=>{var r;const e=b.getState();e.setFluidSim({paused:!((r=e.fluidSim)!=null&&r.paused)})}}),Z.register({id:"fluid-toy.reset",key:"R",description:"Reset fluid fields (dye + velocity → zero)",category:"Playback",handler:()=>{var e;(e=i.current)==null||e.resetFluid()}}),Z.register({id:"fluid-toy.orbit-toggle",key:"O",description:"Toggle Julia-c auto-orbit",category:"Simulation",handler:()=>{var r;const e=b.getState();e.setCoupling({orbitEnabled:!((r=e.coupling)!=null&&r.orbitEnabled)})}}),Z.register({id:"fluid-toy.home",key:"Home",description:"Recenter view (center=[0,0], zoom=1.5)",category:"View",handler:()=>{b.getState().setJulia({center:{x:0,y:0},zoom:1.5})}})},K=i=>b(e=>e[i]),wr=()=>{var e,r,t;const i=b.getState().brush??{};return{mode:Ge(i.mode),colorMode:Ve(i.colorMode),solidColor:[((e=i.solidColor)==null?void 0:e.x)??1,((r=i.solidColor)==null?void 0:r.y)??1,((t=i.solidColor)==null?void 0:t.z)??1],gradientLut:V.ref.current.gradientLut,size:i.size??.15,hardness:i.hardness??0,strength:i.strength??1,flow:i.flow??50,spacing:i.spacing??.005,jitter:i.jitter??0,particleEmitter:!!i.particleEmitter,particleRate:i.particleRate??120,particleVelocity:i.particleVelocity??.3,particleSpread:i.particleSpread??.35,particleGravity:i.particleGravity??0,particleDrag:i.particleDrag??.6,particleLifetime:i.particleLifetime??1.2,particleSizeScale:i.particleSizeScale??.35}},Cr=()=>{const i=L.getViewportOverlays().filter(e=>e.type==="dom");return d.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:i.map(e=>{const r=re.get(e.componentId);return r?d.jsx(Rr,{cfg:e,Component:r},e.id):null})})},Rr=({cfg:i,Component:e})=>{const r=b(o=>o[i.id]);if(!r)return null;const t=b.getState();return d.jsx(e,{featureId:i.id,sliceState:r,actions:t})},Sr=Object.freeze({}),Dr=()=>{const i=b(p=>p.panels),e=b(p=>p.contextMenu),r=b(p=>p.handleInteractionStart),t=b(p=>p.handleInteractionEnd),o=b(p=>p.openContextMenu),l=b(p=>p.closeContextMenu),n=b(p=>p.togglePanel),a=b(p=>p.openHelp),c=P.useRef(null),h=P.useRef(null),v=P.useRef(null),w=Object.values(i).filter(p=>p.location==="float"&&p.isOpen),C=P.useMemo(()=>({handleInteractionStart:r,handleInteractionEnd:t,openContextMenu:o}),[r,t,o]),m=b(p=>p.canvasPixelSize),s=Ue();ut();const u=K("julia"),S=K("coupling"),f=K("palette"),g=K("collision"),D=K("fluidSim"),M=K("postFx"),x=K("composite"),R=b(p=>p.accumulation),j=b(p=>p.isPaused),I=b(p=>p.liveModulations??Sr);return P.useEffect(()=>{const p=c.current;if(p){try{const T=new xr(p,{onFrameEnd:()=>dt.frameTick()});h.current=T,ce.ref.current=T;let F=-1;const A=E=>{const B=F<0?0:Math.min(.1,(E-F)/1e3);if(F=E,h.current){const U=W.ref.current;Ti(V.ref.current.runtime,{dtSec:B,wallClockMs:E,dragging:U.dragging,cursorUv:U.uv,cursorVelUv:U.velUv,params:wr(),engine:h.current}),h.current.frame(E)}v.current=requestAnimationFrame(A)};v.current=requestAnimationFrame(A)}catch(T){console.error("[FluidToy] failed to start engine:",T)}return Tr(h),()=>{var T;v.current!==null&&cancelAnimationFrame(v.current),(T=h.current)==null||T.dispose(),h.current=null,ce.ref.current=null}}},[]),P.useEffect(()=>{var U,H;const p=h.current;if(!p||!u)return;const T=((U=u.juliaC)==null?void 0:U.x)??0,F=((H=u.juliaC)==null?void 0:H.y)??0,A=I["julia.juliaC_x"]??T,E=I["julia.juliaC_y"]??F,B=u.center??{x:0,y:0};p.setParams({kind:kt(u.kind),juliaC:[A,E],maxIter:u.maxIter??310,power:u.power??2,center:[B.x??0,B.y??0],zoom:u.zoom??1.5})},[u,I]),P.useEffect(()=>{var U,H,be,Me;const p=h.current;if(!p||!f)return;const T=((U=f.trapNormal)==null?void 0:U.x)??1,F=((H=f.trapNormal)==null?void 0:H.y)??0,A=Math.hypot(T,F),E=A>1e-6?[T/A,F/A]:[1,0],B=f.interiorColor??{x:.02,y:.02,z:.04};if(p.setParams({colorMapping:Kt(f.colorMapping),colorIter:f.colorIter??310,escapeR:f.escapeR??32,interiorColor:[B.x??.02,B.y??.02,B.z??.04],trapCenter:[((be=f.trapCenter)==null?void 0:be.x)??0,((Me=f.trapCenter)==null?void 0:Me.y)??0],trapRadius:f.trapRadius??1,trapNormal:E,trapOffset:f.trapOffset??0,stripeFreq:f.stripeFreq??4,dyeBlend:Vt(f.dyeBlend),gradientRepeat:f.gradientRepeat??1,gradientPhase:f.gradientPhase??0}),f.gradient){const Te=we(f.gradient);p.setGradientBuffer(Te),V.ref.current.gradientLut=Te}},[f]),P.useEffect(()=>{const p=h.current;if(!(!p||!g)&&(p.setParams({collisionEnabled:!!g.enabled,collisionPreview:!!g.preview,collisionRepeat:g.repeat??1,collisionPhase:g.phase??0}),g.gradient)){const T=we(g.gradient);p.setCollisionGradientBuffer(T)}},[g]),P.useEffect(()=>{const p=h.current;!p||!D||!S||p.setParams({simResolution:Math.max(64,Math.floor((D.simResolution??1344)*s)),vorticity:D.vorticity??22.1,vorticityScale:D.vorticityScale??1,pressureIters:D.pressureIters??50,dissipation:D.dissipation??.17,paused:!!D.paused,dt:D.dt??.016,dyeInject:D.dyeInject??8,dyeDecayMode:Jt(D.dyeDecayMode),dyeDissipation:D.dyeDissipation??1.03,dyeChromaDecayHz:D.dyeChromaDecayHz??1.03,dyeSaturationBoost:D.dyeSaturationBoost??1,forceMode:Ot(S.forceMode),forceGain:S.forceGain??-1200,interiorDamp:S.interiorDamp??.59,forceCap:S.forceCap??40,edgeMargin:S.edgeMargin??.04,autoQuality:!1})},[D,S,s]),P.useEffect(()=>{const p=h.current;!p||!M||p.setParams({fluidStyle:ni(M.fluidStyle),toneMapping:ai(M.toneMapping),exposure:M.exposure??1,vibrance:M.vibrance??1.645,bloomAmount:M.bloomAmount??0,bloomThreshold:M.bloomThreshold??.9,aberration:M.aberration??0,refraction:M.refraction??0,refractSmooth:M.refractSmooth??3,refractRoughness:M.refractRoughness??0,caustics:M.caustics??0})},[M]),P.useEffect(()=>{const p=h.current;!p||!x||p.setParams({show:ui(x.show),juliaMix:x.juliaMix??.4,dyeMix:x.dyeMix??2,velocityViz:x.velocityViz??.02})},[x]),P.useEffect(()=>{const p=h.current;p&&p.setParams({tsaa:R??!0,tsaaSampleCap:64,paused:!!j})},[R,j]),P.useEffect(()=>{const p=h.current,[T,F]=m;if(!p||T<1||F<1)return;const A=window.devicePixelRatio||1,E=Math.max(1,Math.floor(T/A*s)),B=Math.max(1,Math.floor(F/A*s));p.resize(E,B)},[m,s]),d.jsx(qe,{value:C,children:d.jsxs("div",{className:"fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col",children:[d.jsx(Ye,{}),d.jsx(Pt,{}),d.jsx($e,{}),w.map(p=>d.jsx(Ze,{id:p.id,title:p.id,children:d.jsx(Qe,{activeTab:p.id,state:b.getState(),actions:b.getState(),onSwitchTab:T=>n(T,!0)})},p.id)),d.jsx(pt,{}),d.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[d.jsx(Ce,{side:"left"}),d.jsxs(mt,{className:"flex-1",children:[d.jsx("canvas",{ref:c,className:"absolute inset-0 w-full h-full block touch-none"}),d.jsx(Mr,{canvasRef:c,engineRef:h}),d.jsx(Tt,{}),d.jsx(Cr,{})]}),d.jsx(Ce,{side:"right"})]}),d.jsx(et,{}),d.jsx(wt,{}),e.visible&&d.jsx(tt,{x:e.x,y:e.y,items:e.items,targetHelpIds:e.targetHelpIds,onClose:l,onOpenHelp:a})]})})},Fr=[{id:"Fractal",dock:"right",order:0,active:!0,features:["julia"]},{id:"Coupling",dock:"right",order:1,features:["coupling"]},{id:"Fluid",dock:"right",order:2,features:["fluidSim"]},{id:"Brush",dock:"right",order:3,features:["brush"]},{id:"Palette",dock:"right",order:4,features:["palette"]},{id:"Post-FX",dock:"right",order:5,features:["postFx"]},{id:"Collision",dock:"right",order:6,features:["collision"]},{id:"Composite",dock:"right",order:7,features:["composite"]},{id:"Presets",dock:"right",order:8,features:["presets"]},{id:"Views",dock:"left",order:20,component:"panel-views",label:"View Manager"}],Er=()=>it(Fr),Ar=()=>{const i=Ue();return d.jsxs("span",{className:"text-[10px] text-white/40 font-mono pointer-events-none",children:["q",(i*100).toFixed(0),"%"]})},O=({children:i})=>d.jsx("span",{className:"inline-block px-1 py-px text-[9px] font-mono border border-white/20 rounded bg-white/10 text-white/90 mx-0.5",children:i}),jr=()=>{const[i,e]=P.useState(!0);return i?d.jsxs("div",{className:"px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[360px] pointer-events-auto shadow-xl",children:[d.jsxs("div",{className:"flex items-center justify-between mb-1",children:[d.jsx("div",{className:"text-[10px] uppercase text-cyan-300 tracking-wide",children:"Hotkeys"}),d.jsx("button",{onClick:()=>e(!1),className:"text-gray-500 hover:text-gray-200 text-[12px] px-1 leading-none",title:"Hide (click ? to reopen)",children:"×"})]}),d.jsxs("ul",{className:"space-y-0.5 leading-snug",children:[d.jsxs("li",{children:[d.jsx(O,{children:"Drag"})," inject force + dye into the fluid"]}),d.jsxs("li",{children:[d.jsx(O,{children:"B"}),"+",d.jsx(O,{children:"Drag"})," resize the brush live (horizontal = scale)"]}),d.jsxs("li",{children:[d.jsx(O,{children:"C"}),"+",d.jsx(O,{children:"Drag"})," pick Julia c directly on the canvas"]}),d.jsxs("li",{children:[d.jsx(O,{children:"Right-click"}),"+",d.jsx(O,{children:"Drag"})," pan the fractal view"]}),d.jsxs("li",{children:[d.jsx(O,{children:"Right-click"})," (tap) canvas for quick actions menu"]}),d.jsxs("li",{children:[d.jsx(O,{children:"Shift"}),"/",d.jsx(O,{children:"Alt"})," precision modifiers (5× / 0.2×) for any drag"]}),d.jsxs("li",{children:[d.jsx(O,{children:"Wheel"})," zoom · ",d.jsx(O,{children:"Middle"}),"+",d.jsx(O,{children:"Drag"})," smooth zoom · ",d.jsx(O,{children:"Home"})," recenter"]}),d.jsxs("li",{children:[d.jsx(O,{children:"Space"})," pause sim · ",d.jsx(O,{children:"R"})," clear fluid · ",d.jsx(O,{children:"O"})," toggle c-orbit · ",d.jsx(O,{children:"H"})," hide hints"]})]})]}):d.jsx("button",{onClick:()=>e(!0),className:"px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70 pointer-events-auto",title:"Show hotkeys",children:"? hotkeys"})},Pe="fluid-toy.orbit.juliaC.x",Ie="fluid-toy.orbit.juliaC.y";let Be=null;const ke=()=>{const i=b.getState(),e=i.coupling,r=i.animations??[],t=r.filter(h=>h.id!==Pe&&h.id!==Ie);if(!(e!=null&&e.orbitEnabled)){t.length!==r.length&&i.setAnimations(t);return}const o=e.orbitRadius??.1,n=1/Math.max(.001,e.orbitSpeed??.25),a="Sine",c=[...t,{id:Pe,target:"julia.juliaC_x",shape:a,period:n,phase:0,amplitude:o,smoothing:0,enabled:!0},{id:Ie,target:"julia.juliaC_y",shape:a,period:n,phase:.25,amplitude:o,smoothing:0,enabled:!0}];i.setAnimations(c)},Pr=()=>{Be||(ke(),Be=b.subscribe(i=>i.coupling,ke))},q=(i,e,r)=>i+(e-i)*r,Ir=i=>i<.5?2*i*i:1-Math.pow(-2*i+2,2)/2,ye=()=>{const i=b.getState().julia;return{kind:i.kind,juliaC:{...i.juliaC},center:{...i.center},zoom:i.zoom,maxIter:i.maxIter,power:i.power}},Br=500;let Y=null;const kr=i=>{const e=b.getState().setJulia;if(!e)return;Y!==null&&(cancelAnimationFrame(Y),Y=null);const r=ye();e({kind:i.kind,maxIter:i.maxIter});const t=Math.log(Math.max(r.zoom,1e-12)),o=Math.log(Math.max(i.zoom,1e-12)),l=performance.now(),n=()=>{const a=(performance.now()-l)/Br;if(a>=1){e({center:{x:i.center.x,y:i.center.y},juliaC:{x:i.juliaC.x,y:i.juliaC.y},zoom:i.zoom,power:i.power}),Y=null;return}const c=Ir(a);e({center:{x:q(r.center.x,i.center.x,c),y:q(r.center.y,i.center.y,c)},juliaC:{x:q(r.juliaC.x,i.juliaC.x,c),y:q(r.juliaC.y,i.juliaC.y,c)},zoom:Math.exp(q(t,o,c)),power:q(r.power,i.power,c)}),Y=requestAnimationFrame(n)};Y=requestAnimationFrame(n)},Ur=i=>{kr(i)},_r=i=>{const e=ye();return e.kind!==i.kind||e.maxIter!==i.maxIter||e.power!==i.power||Math.abs(e.zoom-i.zoom)>1e-5||Math.abs(e.center.x-i.center.x)+Math.abs(e.center.y-i.center.y)>1e-4||Math.abs(e.juliaC.x-i.juliaC.x)+Math.abs(e.juliaC.y-i.juliaC.y)>1e-4},Or=async()=>{try{const i=document.querySelector("canvas");if(!i)return;const e=128,r=document.createElement("canvas");r.width=e,r.height=e;const t=r.getContext("2d");if(!t)return;const o=Math.min(i.width,i.height),l=(i.width-o)/2,n=(i.height-o)/2;return t.drawImage(i,l,n,o,o,0,0,e,e),r.toDataURL("image/jpeg",.7)}catch{return}},Lr=()=>{const i=b.getState().setJulia;i&&i({center:{x:0,y:0},zoom:1.5})},zr=()=>{Ct({panelId:"Views",arrayKey:"savedViews",activeIdKey:"activeViewId",actions:{add:"addView",update:"updateView",delete:"deleteView",duplicate:"duplicateView",select:"selectView",reorder:"reorderViews",saveToSlot:"saveViewToSlot",reset:"resetView"},defaultLabelPrefix:"View",capture:ye,apply:Ur,isModified:_r,captureThumbnail:Or,onReset:Lr,slotShortcuts:{count:9,category:"Views"},menu:{menuId:"camera",slot:"right",order:29,icon:rt,title:"Camera",align:"end",width:"w-48",openItem:{label:"View Manager…",title:"Open the saved-views library"},resetItem:{label:"Reset View",title:"Reset to default fractal view"},slotLabelPrefix:"View"}})},Gr=({activeIdKey:i,featureIds:e,label:r="Active",groupFilter:t,excludeParams:o,whitelistParams:l,onDeselect:n,inactiveLabel:a=null})=>{const c=b(h=>h[i]);return!c&&a===null?null:d.jsxs("div",{className:"border-t border-white/10 bg-black/40 p-2 space-y-2",children:[d.jsxs("div",{className:"flex items-center justify-between",children:[d.jsx(ot,{children:c?r:a??""}),c&&n&&d.jsx("button",{type:"button",onClick:n,className:"text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors",children:"Deselect"})]}),c&&e.map(h=>d.jsx("div",{className:"bg-white/5 rounded p-1",children:d.jsx(at,{featureId:h,groupFilter:t,excludeParams:o,whitelistParams:l})},h))]})},Nr=()=>{const i=b(u=>u.savedViews??[]),e=b(u=>u.activeViewId),r=b(u=>u.addView),t=b(u=>u.updateView),o=b(u=>u.deleteView),l=b(u=>u.duplicateView),n=b(u=>u.selectView),a=b(u=>u.reorderViews),c=b(u=>u.resetView);b(u=>u.julia);const h=P.useCallback(async()=>{await(r==null?void 0:r())},[r]),v=P.useCallback((u,S)=>t==null?void 0:t(u,{label:S}),[t]),w=P.useCallback(u=>t==null?void 0:t(u),[t]),C=P.useCallback(()=>c==null?void 0:c(),[c]),m=P.useCallback(u=>{const S=b.getState()._viewIsModified;if(S)return S(u.state);const f=b.getState().julia,g=u.state;return f.kind!==g.kind||f.maxIter!==g.maxIter||f.power!==g.power||Math.abs(f.zoom-g.zoom)>1e-5||Math.abs(f.center.x-g.center.x)+Math.abs(f.center.y-g.center.y)>1e-4||Math.abs(f.juliaC.x-g.juliaC.x)+Math.abs(f.juliaC.y-g.juliaC.y)>1e-4},[]),s=P.useMemo(()=>{const u=b.getState().setJulia,S=D=>{var x;const M=((x=b.getState().julia)==null?void 0:x.center)??{x:0,y:0};u==null||u({center:{x:M.x,y:M.y},zoom:D})},f=ne.indexOf("mandelbrot"),g=ne.indexOf("julia");return[{id:"reset",label:"RESET",onSelect:()=>C(),title:"Reset view to defaults"},{id:"home",label:"HOME",onSelect:()=>u==null?void 0:u({center:{x:0,y:0}}),title:"Center to (0, 0); keep zoom"},{id:"1x",label:"1:1",onSelect:()=>S(1),title:"Zoom 1×"},{id:"wide",label:"WIDE",onSelect:()=>S(.5),title:"Zoom out"},{id:"mand",label:"MAND",onSelect:()=>u==null?void 0:u({kind:f>=0?f:1}),title:"Switch to Mandelbrot kind"},{id:"julia",label:"JULIA",onSelect:()=>u==null?void 0:u({kind:g>=0?g:0}),title:"Switch to Julia kind"}]},[C]);return r?d.jsx(Rt,{className:"flex flex-col bg-[#080808] -m-3",snapshots:i,activeId:e,onSelect:n,onRename:v,onUpdate:w,onDuplicate:l,onDelete:o,onReorder:a,isModified:m,emptyState:"No saved views — pan, zoom, tweak, then click New View",slotHintPrefix:null,presets:s,presetGridCols:3,toolbarBefore:d.jsx("div",{className:"px-2 pb-2 bg-black/40 border-b border-white/10",children:d.jsxs("button",{type:"button",onClick:h,className:"w-full bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1",children:[d.jsx(st,{})," New View"]})}),footer:d.jsxs(d.Fragment,{children:[d.jsx(Gr,{activeIdKey:"activeViewId",featureIds:["julia"],label:"Active View",onDeselect:()=>n==null?void 0:n(null)}),d.jsx("div",{className:"border-t border-white/10 bg-black/40 p-2",children:d.jsx(St,{})})]})}):d.jsx("div",{className:"p-4 text-[10px] text-gray-600 italic",children:"View library not initialized."})};nt();ft({enabled:!0,alwaysActive:!0,targetFps:45,minQuality:.4,interactionDownsample:.5,activityGraceMs:100});ht();Dt();gt({getCanvas:()=>document.querySelector("canvas")});It(["julia.center_x","julia.center_y","julia.zoom"]);Ft();lt();vt();xt({hideShortcuts:!0});yt.register({featureId:"julia",captureState:()=>{var e,r;const i=b.getState();return{center:{...(e=i.julia)==null?void 0:e.center},zoom:(r=i.julia)==null?void 0:r.zoom}},applyState:i=>{b.getState().setJulia({center:i.center,zoom:i.zoom})}});bt();Et();At.registerHudHint({id:"fluid-toy-controls",slot:"bottom-left",order:0,component:jr});jt.register({id:"fluid-toy.quality",slot:"bottom-left",order:10,component:Ar});Pr();zr();re.register("panel-views",Nr);Er();const He=document.getElementById("root");if(!He)throw new Error("Could not find root element to mount to");const Vr=Mt.createRoot(He);Vr.render(d.jsx(ct.StrictMode,{children:d.jsx(Dr,{})}));
