var ze=Object.defineProperty;var Ge=(i,e,r)=>e in i?ze(i,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):i[e]=r;var y=(i,e,r)=>Ge(i,typeof e!="symbol"?e+"":e,r);import{c as te,f as _,z as Ve,B as Ne,H as A,t as He,v as Je,u as M,I as $,J as ve,S as Xe,E as $e,D as We,l as qe,P as Ke,n as xe,T as Ye,G as Ze,x as Qe,K as et,M as tt,N as it,O as rt,r as ot,y as at}from"./ui-BCzb-_pD.js";import{r as D,j as p,R as st}from"./three-fiber-OZZ-CFAc.js";import{u as Ae,a as nt,v as lt,T as ct,V as ut,m as W,i as dt,b as pt,c as mt,e as ft,f as ht,g as gt,d as vt}from"./Camera-lxNz6s33.js";import{c as xt}from"./three-drei-TKsZgtGL.js";import{H as bt,a as yt,i as Mt,S as Tt,C as wt,b as Ct,c as Rt,d as St,h as Ft,e as Dt}from"./CompositionOverlayControls-CnJ6h8TJ.js";import{R as Et}from"./RenderLoop-ARhFypKj.js";import{r as At}from"./cameraKeyRegistry-DPlaVrE0.js";import"./three-CAXFefdI.js";import"./pako-DwGzBETv.js";import"./ModulationEngine-jPJOXoF_.js";const It=i=>i.charAt(0).toUpperCase()+i.slice(1).replace(/-/g," "),O=(i,e,r={})=>{const t=r.defaultIndex??0,o=i.map((s,c)=>{var h;return{label:((h=r.optionLabels)==null?void 0:h[s])??It(s),value:c}});return{config:{type:"float",default:t,label:e,options:o,...r.extra},fromIndex:s=>{const c=Math.floor(s??t);return c<0||c>=i.length||Number.isNaN(c)?i[t]:i[c]},values:i}},le=O(["julia","mandelbrot"],"Fractal Kind",{defaultIndex:1}),ae=le.values,Pt=le.fromIndex,jt={id:"julia",name:"Fractal",category:"Fractal",tabConfig:{label:"Fractal"},customUI:[{componentId:"julia-c-picker",parentId:"juliaC",condition:{param:"kind",eq:0}}],params:{kind:le.config,juliaC:{type:"vec2",default:{x:-.36303304426511473,y:.16845183018751916},min:-2,max:2,step:.001,label:"Julia c",description:"Julia constant. Move me to reshape the entire fractal — and the forces it emits."},zoom:{type:"float",default:1.2904749020480561,min:1e-5,max:8,step:1e-4,scale:"log",label:"Zoom",description:"Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001)."},center:{type:"vec2",default:{x:-.8139175130270945,y:-.054649908357858296},min:-2,max:2,step:.01,label:"Center",description:"Pan the fractal window."},maxIter:{type:"int",default:310,min:16,max:512,step:1,label:"Iter",description:"More iterations → sharper escape gradients → finer force detail."},power:{type:"float",default:2,min:2,max:8,step:1,label:"Power",description:"z-power in the iteration. 2 = classic z²+c; higher exponents make more lobes."}}},ce=O(["gradient","curl","iterate","c-track","hue"],"Force Mode",{optionLabels:{"c-track":"C-Track"}}),Bt=ce.values,kt=ce.fromIndex,Ut="How fractal pixels become velocity at each cell. Gradient pushes AWAY from the set. Curl swirls along level sets. Iterate follows z's orbit grain. C-Track reacts to Δc in real time. Hue makes the picture itself the velocity field.",_t={id:"coupling",name:"Coupling",category:"Simulation",tabConfig:{label:"Coupling"},params:{forceMode:{...ce.config,description:Ut},forceGain:{type:"float",default:-1200,min:-2e3,max:2e3,step:.1,label:"Force gain",description:"Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid. Negative inverts the force direction."},interiorDamp:{type:"float",default:.59,min:0,max:1,step:.01,label:"Interior damp",description:"How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed."},forceCap:{type:"float",default:40,min:1,max:40,step:.5,label:"Force cap",description:"Per-pixel cap on the fractal force magnitude."},edgeMargin:{type:"float",default:.04,min:0,max:.25,step:.005,label:"Edge margin",description:'Fades force / dye injection near the canvas edges. Fixes "gushing from the borders" under fast c-changes.'},orbitEnabled:{type:"boolean",default:!1,label:"Auto-orbit c",description:"Circles c automatically around its current value. Pair with C-Track to watch the fluid breathe with the fractal's deformation."},orbitRadius:{type:"float",default:.08,min:0,max:.5,step:.001,label:"Radius",condition:{param:"orbitEnabled",bool:!0},description:"Distance c travels from its base position as the orbit circles."},orbitSpeed:{type:"float",default:.25,min:0,max:3,step:.01,label:"Speed",condition:{param:"orbitEnabled",bool:!0},description:"Orbit rate in Hz. 1 = one full circle per second."}}},Ot={colorSpace:"srgb",blendSpace:"oklab",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:.15,color:"#1a0a00",bias:.5,interpolation:"linear"},{id:"2",position:.35,color:"#8b1a00",bias:.5,interpolation:"linear"},{id:"3",position:.6,color:"#ff6b00",bias:.5,interpolation:"linear"},{id:"4",position:.85,color:"#ffdd66",bias:.5,interpolation:"linear"},{id:"5",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},ue=O(["add","screen","max","over"],"Dye blend"),Lt=ue.values,zt=ue.fromIndex,de=O(["linear","perceptual","vivid"],"Colour space"),Gt=de.values,Vt=de.fromIndex,pe=O(["iterations","angle","magnitude","decomposition","bands","orbit-point","orbit-circle","orbit-cross","orbit-line","stripe","distance","derivative","potential","trap-iter"],"Color mapping",{optionLabels:{decomposition:"Decomp","orbit-point":"Trap · Point","orbit-circle":"Trap · Circle","orbit-cross":"Trap · Cross","orbit-line":"Trap · Line","trap-iter":"Trap Iteration",distance:"Distance Estimate",potential:"Continuous Potential",derivative:"Derivative (log|dz|)"}}),Nt=pe.values,Ht=pe.fromIndex,Jt=5,be=6,Xt=7,ye=8,$t=9,Wt=13,qt={id:"palette",name:"Palette",category:"Look",tabConfig:{label:"Palette"},params:{gradient:{type:"gradient",default:Ot,label:"Palette",description:"Colors both the fractal AND the dye injected into the fluid. In Hue-mode (Coupling), this IS the vector field."},colorMapping:{...pe.config,description:"How the iteration-space scalar becomes a t-value into the gradient. Each mode exposes its own extra controls below."},gradientRepeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Repetition",description:"Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands."},gradientPhase:{type:"float",default:0,min:0,max:1,step:.005,label:"Phase",description:"Phase shift — rotates the colors without changing their layout."},colorIter:{type:"int",default:310,min:1,max:1024,step:1,label:"Color iter",description:"Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter — reduce for fresher colours."},trapCenter:{type:"vec2",default:{x:0,y:0},min:-2,max:2,step:.01,label:"Trap center",description:"Trap centre (complex coord). Move to pick which point in the orbit to trap against.",condition:{or:[{param:"colorMapping",eq:Jt},{param:"colorMapping",eq:be},{param:"colorMapping",eq:Xt},{param:"colorMapping",eq:Wt}]}},trapRadius:{type:"float",default:1,min:.01,max:4,step:.01,label:"Trap radius",condition:{param:"colorMapping",eq:be},description:"Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring."},trapNormal:{type:"vec2",default:{x:1,y:0},min:-1,max:1,step:.01,label:"Trap normal",condition:{param:"colorMapping",eq:ye},description:"Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length."},trapOffset:{type:"float",default:0,min:-2,max:2,step:.01,label:"Trap offset",condition:{param:"colorMapping",eq:ye},description:"Line-trap offset (scalar position along the normal direction)."},stripeFreq:{type:"float",default:4,min:1,max:16,step:.1,label:"Stripe freq",condition:{param:"colorMapping",eq:$t},description:"Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration."},interiorColor:{type:"vec3",default:{x:.02,y:.02,z:.04},min:0,max:1,step:.001,label:"Interior color",description:"Colour for bounded points (pixels that never escape the iteration)."},escapeR:{type:"float",default:32,min:2,max:1024,step:.1,label:"Escape R",scale:"log",hidden:!0},dyeBlend:{...ue.config,description:"How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask."}}},Kt={colorSpace:"srgb",blendSpace:"rgb",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:1,color:"#000000",bias:.5,interpolation:"linear"}]},Yt={id:"collision",name:"Collision",category:"Simulation",tabConfig:{label:"Collision"},params:{enabled:{type:"boolean",default:!1,label:"Collision walls",description:"Paints solid walls the fluid bounces off, sculpted by the gradient below. Same t-axis mapping as the main palette — edit stops to black = fluid, white = wall."},gradient:{type:"gradient",default:Kt,label:"Collision pattern",condition:{param:"enabled",bool:!0},description:"B&W gradient defining where walls sit along the iteration-space t-axis."},repeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Collision repeat",condition:{param:"enabled",bool:!0},description:"Tile the collision pattern along t — independent of the dye gradient repeat."},phase:{type:"float",default:0,min:0,max:1,step:.001,label:"Collision phase",condition:{param:"enabled",bool:!0},description:"Phase-shift the collision pattern so walls land where the dye doesn't."},preview:{type:"boolean",default:!1,label:"Preview walls on canvas",condition:{param:"enabled",bool:!0},description:"Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient."}}},Zt={id:"fluidSim",name:"Fluid",category:"Simulation",tabConfig:{label:"Fluid"},params:{vorticity:{type:"float",default:22.1,min:0,max:50,step:.1,label:"Vorticity",description:"Amplifies existing curl — keeps fractal-induced swirls from smearing away."},vorticityScale:{type:"float",default:1,min:.5,max:8,step:.1,label:"Vorticity scale",condition:{param:"vorticity",gt:0},description:"Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices."},dissipation:{type:"float",default:.17,min:0,max:5,step:.01,label:"Velocity dissipation /s",description:"How fast velocity decays. High = fluid forgets the fractal quickly."},dyeInject:{type:"float",default:1.5,min:0,max:3,step:.01,label:"Dye inject",description:"How much of the fractal's color bleeds into the fluid each frame."},pressureIters:{type:"int",default:50,min:4,max:60,step:1,label:"Pressure iters",description:"Jacobi iterations for incompressibility. More = stricter but slower."},dyeDecayMode:{...de.config,description:"How dye fades over time. Colour space controls whether it greys out (linear) or stays hue-stable (perceptual / vivid)."},dyeDissipation:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Dye dissipation /s",description:"How fast dye fades. In linear mode this is a straight RGB multiply; in perceptual / vivid it's the OKLab luminance fade (chroma fades on its own schedule below)."},dyeChromaDecayHz:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Chroma decay /s",condition:{param:"dyeDecayMode",neq:0},description:"Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright."},dyeSaturationBoost:{type:"float",default:1,min:.5,max:1.1,step:.001,scale:"log",label:"Saturation boost",condition:{param:"dyeDecayMode",eq:2},description:"Per-frame chroma gain. 1 = neutral, <1 washes out, >1 pushes toward max saturation. Gamut-mapped in OKLab so it pegs at the saturation ceiling rather than hue-shifting to white."},simResolution:{type:"int",default:1344,min:128,max:1536,step:32,label:"Sim resolution",description:"Target fluid grid height in cells. More = finer detail, slower."},dt:{type:"float",default:.016,min:.001,max:.05,step:1e-4,label:"Δt (advanced)",description:"Integration timestep. Lower = more stable."},paused:{type:"boolean",default:!1,label:"Pause sim",description:"Freeze the fluid state. Splats and param changes still land; they just don't integrate forward."}}},Qt={id:"presets",name:"Presets",category:"Library",tabConfig:{label:"Presets"},customUI:[{componentId:"preset-grid"}],params:{_anchor:{type:"float",default:0,min:0,max:1,step:1,label:"",hidden:!0}}},N=i=>i.map(([e,r],t)=>({id:`s${t}`,position:e,color:r,bias:.5,interpolation:"linear"})),ei=[{id:"coral-gyre",name:"Coral Gyre",desc:"Orbit-point colouring on a negative curl — teal interior feeds a coral halo, with filmic bloom + aberration.",params:{juliaC:[-.8173594132029339,.15279058679706603],center:[0,0],zoom:1.5,maxIter:182,power:2,kind:"julia",forceMode:"curl",forceGain:-760,interiorDamp:.9,dissipation:.1,dyeDissipation:.63,dyeInject:2.28,vorticity:25.9,vorticityScale:4.2,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:1,velocityViz:0,gradientRepeat:.56,gradientPhase:.09,colorMapping:"orbit-point",colorIter:96,trapCenter:[1.17,0],dyeBlend:"add",dyeDecayMode:"vivid",dyeSaturationBoost:1.01,toneMapping:"filmic",exposure:2.295,vibrance:1.87,bloomAmount:1.35,bloomThreshold:1,aberration:1.12,refraction:0,refractSmooth:1,caustics:3.9,interiorColor:[.02,.04,.08],edgeMargin:.04,forceCap:12,collisionEnabled:!0,simResolution:768},gradient:{stops:N([[0,"#000000"],[.202,"#05233d"],[.362,"#0f6884"],[.521,"#56c6c0"],[.681,"#f0fff1"],[.84,"#e7bd69"],[1,"#8a3f19"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.513,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.573,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"ink-canyon",name:"Ink Canyon",desc:"Monochrome dye threading between twin collision walls — one at the near edge, one deep in the field.",params:{juliaC:[-.7763636363636364,.19684858842329547],center:[.019054061889010376,-.007321977964897804],zoom:1.2904749020480561,maxIter:310,power:2,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:0,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0,simResolution:1024},gradient:{stops:N([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.02,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.07,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:.833,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c4",position:.883,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"plasma-vein",name:"Plasma Vein",desc:"Fractional power (1.5) with 7× repeated blue/red bands. Vivid chroma decay keeps the refracted dye electric.",params:{juliaC:[-.1764262149580809,.1951288073545453],center:[.21016359187729639,-.014585098813268887],zoom:.975889617512663,maxIter:310,power:1.5,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.7,dyeMix:1,velocityViz:0,gradientRepeat:7.43,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",dyeDecayMode:"vivid",toneMapping:"filmic",exposure:1.86,vibrance:1.645,aberration:.5,refraction:.006,refractSmooth:11.8,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1344},gradient:{stops:N([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.536,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.586,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"crater-drift",name:"Crater Drift",desc:"Mandelbrot under inward curl, inferno-magenta palette. Slow auto-orbit carves craters through the bloom.",params:{juliaC:[.56053050672182,.468459152016546],center:[-.9313160617349564,-.15288948147190096],zoom:1.1807159194396142,maxIter:604,power:2,kind:"mandelbrot",forceMode:"curl",forceGain:-535.6,interiorDamp:0,dissipation:.16,dyeDissipation:.05,dyeInject:3,vorticity:2.9,vorticityScale:1.2,pressureIters:48,show:"composite",juliaMix:0,dyeMix:1.01,velocityViz:0,gradientRepeat:.66,gradientPhase:0,colorMapping:"iterations",colorIter:263,trapCenter:[1.51,-1.37],dyeBlend:"max",dyeDecayMode:"perceptual",dyeChromaDecayHz:0,toneMapping:"filmic",exposure:20.63,vibrance:1.645,bloomAmount:.63,bloomThreshold:.76,aberration:.4,refraction:0,caustics:0,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:38.5,collisionEnabled:!0,simResolution:768},gradient:{stops:N([[.084,"#000004"],[.215,"#280B54"],[.346,"#65156E"],[.477,"#9F2A63"],[.607,"#D44842"],[.738,"#F52D15"],[.869,"#FA2727"],[1,"#FF7983"]]),colorSpace:"srgb",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.532,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.659,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"quartic-strata",name:"Quartic Strata",desc:"Power-4 Julia drifting on a subtle c-track. Strata of blue/red dye held by a near-edge wall.",params:{juliaC:[.7072727272727275,-.1398788174715911],center:[-.0013928986324417691,-.010035496866822907],zoom:.975889617512663,maxIter:310,power:4,kind:"julia",forceMode:"c-track",forceGain:1,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:1,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:2,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0,simResolution:1344},gradient:{stops:N([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.113,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.163,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.2}},{id:"sunset-bands",name:"Sunset Bands",desc:"Force-gradient mode with hard band colouring — sunset strata pushed inward at 1536 sim.",params:{juliaC:[-.16545454545454558,.6455757279829545],center:[-.1012543995130697,.03079433116134145],zoom:1.086757425434934,maxIter:175,power:2,kind:"julia",forceMode:"gradient",forceGain:1500,interiorDamp:5.8,dissipation:.22,dyeDissipation:.5,dyeInject:.55,vorticity:0,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:2,velocityViz:0,gradientRepeat:1.35,gradientPhase:.055,colorMapping:"bands",colorIter:175,dyeBlend:"over",aberration:.27,refraction:0,caustics:1,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:12,simResolution:1536},gradient:{stops:N([[0,"#04001f"],[.167,"#1a1049"],[.333,"#4e2085"],[.5,"#b13a8a"],[.667,"#ff7657"],[.833,"#ffc569"],[1,"#fff9d0"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"verdant-pulse",name:"Verdant Pulse",desc:"Viridis-to-magenta orbit-circle ring, wide vorticity, slow auto-orbit — the set breathes green and pink.",params:{juliaC:[-.7,.27015],center:[-.15958346356258324,-.09244114001481094],zoom:1.3957783246444389,maxIter:160,power:2,kind:"julia",forceMode:"c-track",forceGain:10,interiorDamp:.45,dissipation:.2,dyeDissipation:.17,dyeInject:.9,vorticity:16,vorticityScale:5.8,pressureIters:30,show:"composite",juliaMix:0,dyeMix:3.805,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"orbit-circle",colorIter:94,dyeBlend:"over",dyeDecayMode:"perceptual",exposure:.35,vibrance:1.645,aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,0,.04],edgeMargin:.04,forceCap:12,collisionEnabled:!0,simResolution:768},gradient:{stops:N([[0,"#000000"],[.061,"#440154"],[.143,"#46327F"],[.286,"#365C8D"],[.429,"#277F8E"],[.571,"#1FA187"],[.714,"#4AC26D"],[.857,"#3ADA62"],[1,"#FD25B6"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.037,color:"#000000",bias:.5,interpolation:"linear"},{id:"c2",position:.943,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:1,color:"#626262",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.035,speed:.02}}],me=O(["none","reinhard","agx","filmic"],"Tone mapping",{optionLabels:{agx:"AgX"}}),ti=me.values,ii=me.fromIndex,fe=O(["plain","electric","liquid"],"Style"),ri=fe.values,oi=fe.fromIndex,ai={id:"postFx",name:"Post FX",category:"Look",tabConfig:{label:"Post-FX"},params:{fluidStyle:{...fe.config,description:"Post-process pack. Pick a style to preset bloom / aberration / refraction, or mix them yourself below."},bloomAmount:{type:"float",default:0,min:0,max:3,step:.01,label:"Bloom",description:"Bloom strength — wide soft glow on bright pixels. Core of the electric look."},bloomThreshold:{type:"float",default:1,min:0,max:3,step:.01,label:"Bloom threshold",condition:{param:"bloomAmount",gt:0},description:"Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows."},aberration:{type:"float",default:.27,min:0,max:3,step:.01,label:"Aberration",description:"Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp."},refraction:{type:"float",default:.037,min:0,max:.3,step:.001,label:"Refraction",description:"Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass."},refractSmooth:{type:"float",default:3,min:1,max:12,step:.1,label:"Refract smooth",condition:{param:"refraction",gt:0},description:"Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient."},caustics:{type:"float",default:1,min:0,max:25,step:.1,label:"Caustics",description:"Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends."},toneMapping:{...me.config,description:"How final colour gets compressed. None = maximally vivid (may clip). AgX = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights."},exposure:{type:"float",default:1,min:.1,max:5,step:.01,label:"Exposure",description:"Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch."},vibrance:{type:"float",default:1.645,min:0,max:1,step:.01,label:"Vibrance",description:"Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones."}}},he=O(["composite","julia","dye","velocity"],"Show",{optionLabels:{composite:"Mixed",julia:"Fractal"}}),si=he.values,ni=he.fromIndex,re=0,li={id:"composite",name:"Composite",category:"Look",tabConfig:{label:"Composite"},params:{show:{...he.config,description:"What you see. The simulation runs the same either way. Mixed = fractal + dye + optional velocity overlay. Fractal = pure fractal, fluid hidden. Dye = fluid dye only (what the fractal wrote). Velocity = per-pixel velocity as a hue wheel."},juliaMix:{type:"float",default:.4,min:0,max:2,step:.01,label:"Julia mix",condition:{param:"show",eq:re},description:"How much fractal color shows through in Mixed view."},dyeMix:{type:"float",default:2,min:0,max:2,step:.01,label:"Dye mix",condition:{param:"show",eq:re},description:"How much fluid dye shows through in Mixed view."},velocityViz:{type:"float",default:.02,min:0,max:2,step:.01,label:"Velocity viz",condition:{param:"show",eq:re},description:"Overlay velocity-hue on top of the composite. Diagnostic."}}},L=(i,e)=>{if(typeof e!="string")return;const r=i.indexOf(e);return r>=0?r:void 0},Y=i=>i?{x:i[0],y:i[1]}:void 0,ci=i=>i?{x:i[0],y:i[1],z:i[2]}:void 0,ui=i=>{const e=globalThis.__store;if(!e){console.warn("[applyRefPreset] store not ready — window.__store is undefined");return}const r=e.getState(),t=i.params,o={},n=L(ae,t.kind);n!==void 0&&(o.kind=n),t.juliaC&&(o.juliaC=Y(t.juliaC)),t.center&&(o.center=Y(t.center)),t.zoom!==void 0&&(o.zoom=t.zoom),t.maxIter!==void 0&&(o.maxIter=t.maxIter),t.power!==void 0&&(o.power=t.power),Object.keys(o).length>0&&r.setJulia(o);const a={},s=L(Bt,t.forceMode);s!==void 0&&(a.forceMode=s),t.forceGain!==void 0&&(a.forceGain=t.forceGain),t.interiorDamp!==void 0&&(a.interiorDamp=t.interiorDamp),t.forceCap!==void 0&&(a.forceCap=t.forceCap),t.edgeMargin!==void 0&&(a.edgeMargin=t.edgeMargin),i.orbit?(a.orbitEnabled=i.orbit.enabled,a.orbitRadius=i.orbit.radius,a.orbitSpeed=i.orbit.speed):a.orbitEnabled=!1,r.setCoupling(a);const c={};t.vorticity!==void 0&&(c.vorticity=t.vorticity),t.vorticityScale!==void 0&&(c.vorticityScale=t.vorticityScale),t.dissipation!==void 0&&(c.dissipation=t.dissipation),t.pressureIters!==void 0&&(c.pressureIters=t.pressureIters),t.simResolution!==void 0&&(c.simResolution=t.simResolution),t.dyeInject!==void 0&&(c.dyeInject=t.dyeInject),t.dyeDissipation!==void 0&&(c.dyeDissipation=t.dyeDissipation),t.dyeChromaDecayHz!==void 0&&(c.dyeChromaDecayHz=t.dyeChromaDecayHz),t.dyeSaturationBoost!==void 0&&(c.dyeSaturationBoost=t.dyeSaturationBoost);const h=L(Gt,t.dyeDecayMode);h!==void 0&&(c.dyeDecayMode=h),Object.keys(c).length>0&&r.setFluidSim(c);const d={},u=L(Nt,t.colorMapping);u!==void 0&&(d.colorMapping=u),t.colorIter!==void 0&&(d.colorIter=t.colorIter),t.gradientRepeat!==void 0&&(d.gradientRepeat=t.gradientRepeat),t.gradientPhase!==void 0&&(d.gradientPhase=t.gradientPhase),t.trapCenter&&(d.trapCenter=Y(t.trapCenter)),t.trapRadius!==void 0&&(d.trapRadius=t.trapRadius),t.trapNormal&&(d.trapNormal=Y(t.trapNormal)),t.trapOffset!==void 0&&(d.trapOffset=t.trapOffset),t.stripeFreq!==void 0&&(d.stripeFreq=t.stripeFreq),t.interiorColor&&(d.interiorColor=ci(t.interiorColor));const l=L(Lt,t.dyeBlend);l!==void 0&&(d.dyeBlend=l),i.gradient&&(d.gradient=i.gradient),Object.keys(d).length>0&&r.setPalette(d);const b={enabled:!!t.collisionEnabled};i.collisionGradient&&(b.gradient=i.collisionGradient),r.setCollision(b);const w={},f=L(ri,t.fluidStyle);f!==void 0&&(w.fluidStyle=f);const C=L(ti,t.toneMapping);C!==void 0&&(w.toneMapping=C),t.exposure!==void 0&&(w.exposure=t.exposure),t.vibrance!==void 0&&(w.vibrance=t.vibrance),t.bloomAmount!==void 0&&(w.bloomAmount=t.bloomAmount),t.bloomThreshold!==void 0&&(w.bloomThreshold=t.bloomThreshold),t.aberration!==void 0&&(w.aberration=t.aberration),t.refraction!==void 0&&(w.refraction=t.refraction),t.refractSmooth!==void 0&&(w.refractSmooth=t.refractSmooth),t.caustics!==void 0&&(w.caustics=t.caustics),Object.keys(w).length>0&&r.setPostFx(w);const v={},g=L(si,t.show);g!==void 0&&(v.show=g),t.juliaMix!==void 0&&(v.juliaMix=t.juliaMix),t.dyeMix!==void 0&&(v.dyeMix=t.dyeMix),t.velocityViz!==void 0&&(v.velocityViz=t.velocityViz),Object.keys(v).length>0&&r.setComposite(v)};function ge(i,e){const r=e,t={current:e},o=new Set;let n=0;const a=u=>(o.add(u),()=>{o.delete(u)}),s=()=>{n++,o.forEach(u=>u())};return{name:i,ref:t,useSnapshot:()=>(D.useSyncExternalStore(a,()=>n,()=>n),t.current),subscribe:a,notify:s,reset:()=>{t.current=r,s()}}}const Z=Math.PI*2,oe=(i,e,r)=>(r<0&&(r+=1),r>1&&(r-=1),r<1/6?i+(e-i)*6*r:r<1/2?e:r<2/3?i+(e-i)*(2/3-r)*6:i),Ie=(i,e,r)=>{if(e===0)return[r,r,r];const t=r<.5?r*(1+e):r+e-r*e,o=2*r-t;return[oe(o,t,i+1/3),oe(o,t,i),oe(o,t,i-1/3)]},di=(i,e,r)=>{const t=Math.max(i,e,r),o=Math.min(i,e,r),n=(t+o)/2;if(t===o)return[0,0,n];const a=t-o,s=n>.5?a/(2-t-o):a/(t+o);let c;return t===i?c=(e-r)/a+(e<r?6:0):t===e?c=(r-i)/a+2:c=(i-e)/a+4,[c/6,s,n]},pi=(i,e)=>{if(e<=0)return i;const[r,t,o]=di(i[0],i[1],i[2]),n=(r+(Math.random()-.5)*e+1)%1;return Ie(n,t,o)},mi=(i,e)=>{if(!i||i.length<4)return[1,1,1];const r=(e%1+1)%1,t=i.length/4,o=Math.min(t-1,Math.floor(r*t))*4;return[i[o]/255,i[o+1]/255,i[o+2]/255]},Pe=i=>{let e;switch(i.mode){case"solid":e=[i.solidColor[0],i.solidColor[1],i.solidColor[2]];break;case"gradient":e=mi(i.gradientLut,(i.u+i.v)*.5);break;case"velocity":{const r=Math.min(1,Math.hypot(i.vx,i.vy)*.2),t=(Math.atan2(i.vy,i.vx)/Z+1)%1;e=Ie(t,.9,.35+.3*r);break}case"rainbow":default:{const r=i.rainbowPhase;e=[.5+.5*Math.cos(Z*r),.5+.5*Math.cos(Z*(r+.33)),.5+.5*Math.cos(Z*(r+.67))];break}}return pi(e,i.jitter)},se=300,fi=(i,e)=>{if(i.length>=se)return;const t=Math.atan2(e.dirY,e.dirX)+(Math.random()-.5)*2*e.particleSpread*Math.PI,o=e.particleVelocity*(.4+Math.random()*.6),n=e.brushSize*.35;i.push({x:e.u+(Math.random()-.5)*n,y:e.v+(Math.random()-.5)*n,vx:Math.cos(t)*o,vy:Math.sin(t)*o,life:e.particleLifetime,lifeMax:e.particleLifetime,color:[e.color[0],e.color[1],e.color[2]],size:e.brushSize*e.particleSizeScale*(.85+Math.random()*.3)})},hi=(i,e,r,t)=>{const o=2*(i*r+e*t);return[i-o*r,e-o*t]},gi=.5,vi=(i,e)=>{const r=Math.exp(-e.particleDrag*e.dtSec),t=e.restitution??.55,o=.01;let n=0;for(let a=i.length-1;a>=0;a--){const s=i[a];s.vx*=r,s.vy*=r,s.vy+=e.particleGravity*e.dtSec;const c=s.x,h=s.y;if(s.x+=s.vx*e.dtSec,s.y+=s.vy*e.dtSec,s.life-=e.dtSec,e.sampleMask&&e.sampleMask(s.x,s.y)>=gi){let d=e.sampleMask(s.x+o,s.y)-e.sampleMask(s.x-o,s.y),u=e.sampleMask(s.x,s.y+o)-e.sampleMask(s.x,s.y-o),l=Math.hypot(d,u);if(l<=1e-6){const f=o*3;d=e.sampleMask(s.x+f,s.y)-e.sampleMask(s.x-f,s.y),u=e.sampleMask(s.x,s.y+f)-e.sampleMask(s.x,s.y-f),l=Math.hypot(d,u)}let b,w;if(l>1e-6)b=-d/l,w=-u/l;else{const f=Math.hypot(s.vx,s.vy);f>1e-6?(b=-s.vx/f,w=-s.vy/f):(b=1,w=0)}[s.vx,s.vy]=hi(s.vx,s.vy,b,w),s.vx*=t,s.vy*=t,s.x=c+b*o,s.y=h+w*o}(s.life<=0||s.x<-.2||s.x>1.2||s.y<-.2||s.y>1.2)&&(i.splice(a,1),n++)}return n},xi=()=>({particles:[],rainbowPhase:0,distSinceSplat:0,spawnAcc:0}),bi=(i,e)=>{i.rainbowPhase=e.wallClockMs*.001%1;const r=e.params;if(e.dragging&&r.particleEmitter&&e.cursorUv){i.spawnAcc+=e.dtSec*r.particleRate;const t=e.cursorVelUv??{vx:0,vy:0},o=Math.hypot(t.vx,t.vy),n=o<=1e-4;for(;i.spawnAcc>=1&&i.particles.length<se;){i.spawnAcc-=1;let a,s;if(n){const h=Math.random()*Math.PI*2;a=Math.cos(h),s=Math.sin(h)}else a=t.vx/o,s=t.vy/o;const c=Pe({mode:r.colorMode,solidColor:r.solidColor,gradientLut:r.gradientLut,rainbowPhase:i.rainbowPhase,u:e.cursorUv.u,v:e.cursorUv.v,vx:t.vx,vy:t.vy,jitter:r.jitter});fi(i.particles,{u:e.cursorUv.u,v:e.cursorUv.v,dirX:a,dirY:s,color:c,brushSize:r.size,particleVelocity:r.particleVelocity,particleSpread:r.particleSpread,particleLifetime:r.particleLifetime,particleSizeScale:r.particleSizeScale})}i.particles.length>=se&&(i.spawnAcc=0)}if(i.particles.length>0){vi(i.particles,{dtSec:e.dtSec,particleGravity:r.particleGravity,particleDrag:r.particleDrag,sampleMask:(t,o)=>e.engine.sampleMask(t,o)});for(const t of i.particles){const o=Math.max(0,t.life/t.lifeMax);e.engine.brush(t.x,t.y,t.vx*r.flow,t.vy*r.flow,t.color,t.size,r.hardness,r.strength*o,r.mode)}}},yi=(i,e)=>{const r=e.params;return r.particleEmitter||i.distSinceSplat<Math.max(1e-5,r.spacing)?!1:(i.distSinceSplat=0,je(i,e),!0)},Mi=(i,e)=>{e.params.particleEmitter||(je(i,e),i.distSinceSplat=0)},je=(i,e)=>{i.rainbowPhase=e.wallClockMs*.001%1;const r=e.params,t=Pe({mode:r.colorMode,solidColor:r.solidColor,gradientLut:r.gradientLut,rainbowPhase:i.rainbowPhase,u:e.u,v:e.v,vx:e.dvx,vy:e.dvy,jitter:r.jitter});e.engine.brush(e.u,e.v,e.dvx*r.flow,e.dvy*r.flow,t,r.size,r.hardness,r.strength,r.mode)},Ti=i=>{i.distSinceSplat=1/0,i.spawnAcc=0},ne=ge("fluid-toy.engine",null),G=ge("fluid-toy.brush",{runtime:xi(),gradientLut:null}),X=ge("fluid-toy.cursor",{dragging:!1,uv:null,velUv:null}),wi=()=>p.jsxs("div",{className:"flex flex-col gap-3 py-2",children:[p.jsx("div",{className:"text-[10px] text-gray-500 leading-snug",children:"Each preset is a curated fractal ↔ fluid coupling. Applying one resets the grid and restores known params."}),p.jsx("div",{className:"grid grid-cols-2 gap-1",children:ei.map(i=>p.jsx("button",{type:"button",title:i.desc,onClick:()=>{var e;ui(i),(e=ne.ref.current)==null||e.resetFluid()},className:"px-2 py-1 text-[10px] rounded border bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-cyan-500/40 transition-colors text-left",children:i.name},i.id))})]}),Be=O(["paint","erase","stamp","smudge"],"Mode"),ke=Be.fromIndex,Ue=O(["rainbow","solid","gradient","velocity"],"Colour"),_e=Ue.fromIndex,Ci={id:"brush",name:"Brush",category:"Input",tabConfig:{label:"Brush"},params:{mode:{...Be.config,description:"What left-drag does on the canvas. Paint = dye + force; Erase subtracts dye; Stamp deposits dye only; Smudge pushes velocity without adding dye."},size:{type:"float",default:.15,min:.003,max:.4,step:.001,label:"Size (UV)",description:"Radius in UV units (0..1 across the canvas). B+drag the canvas to resize live."},hardness:{type:"float",default:0,min:0,max:1,step:.01,label:"Hardness",description:"0 = soft gaussian edge (airbrush). 1 = hard disc (stamp)."},strength:{type:"float",default:1,min:0,max:3,step:.01,label:"Strength",description:"Dye amount per splat. 0 = dry brush, 3 = saturated. Erase mode: how much dye each splat removes."},flow:{type:"float",default:50,min:0,max:200,step:.5,label:"Flow",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:3}]},description:"How much of the pointer's velocity is injected into the force field. Low = delicate, 50 = paints, 200 = whip."},spacing:{type:"float",default:.005,min:0,max:.1,step:.001,label:"Spacing (UV)",condition:{param:"particleEmitter",bool:!1},description:"Minimum travel between splats along a drag. Low = smooth stroke, high = dotted trail."},colorMode:{...Ue.config,condition:{or:[{param:"mode",eq:0},{param:"mode",eq:2}]},description:"Where each splat gets its RGB. Gradient samples the palette; Solid uses the picker below; Rainbow cycles hue on its own clock."},solidColor:{type:"vec3",default:{x:1,y:1,z:1},min:0,max:1,step:.001,label:"Solid color",condition:{param:"colorMode",eq:1},description:"Explicit colour for Solid mode. Hue jitter still applies."},jitter:{type:"float",default:0,min:0,max:1,step:.01,label:"Hue jitter",condition:{and:[{param:"mode",neq:1},{param:"mode",neq:3}]},description:"Random hue wiggle per splat. 0 = exact colour, 1 = full hue wheel. Builds natural variation in long strokes. Stacks on rainbow/velocity mode too."},particleEmitter:{type:"boolean",default:!1,label:"Particle emitter",description:"Dragging spawns independent particles on their own layer. Each live particle flies with its own velocity / lifespan and acts as a mini brush — painting into the fluid with the selected mode at its own position."},particleRate:{type:"float",default:120,min:1,max:600,step:1,label:"Rate /s",condition:{param:"particleEmitter",bool:!0},description:"Particles emitted per second while dragging. Hard-capped at 300 live at once."},particleVelocity:{type:"float",default:.3,min:0,max:3,step:.01,label:"Velocity",condition:{param:"particleEmitter",bool:!0},description:"Initial speed in UV/sec. 0.3 = gentle spray, 2 = shotgun."},particleSpread:{type:"float",default:.35,min:0,max:1,step:.01,label:"Spread",condition:{param:"particleEmitter",bool:!0},description:"Angular spread around the drag direction. 0 = beam, 1 = full 360° burst."},particleGravity:{type:"float",default:0,min:-3,max:3,step:.01,label:"Gravity",condition:{param:"particleEmitter",bool:!0},description:"UV/sec² acceleration. Negative = falls down the canvas, positive = rises."},particleDrag:{type:"float",default:.6,min:0,max:4,step:.01,label:"Drag /s",condition:{param:"particleEmitter",bool:!0},description:"Air drag — 0 = ballistic (keeps speed), 2 = quickly slows, 4 = fast stop."},particleLifetime:{type:"float",default:1.2,min:.1,max:6,step:.05,label:"Lifetime",condition:{param:"particleEmitter",bool:!0},description:"Seconds before each particle is culled. Longer = more persistent streaks."},particleSizeScale:{type:"float",default:.35,min:.05,max:1.5,step:.01,label:"Size ×",condition:{param:"particleEmitter",bool:!0},description:"Per-particle stamp size as a fraction of the brush size. 0.35 = dabs a third of the brush."}}},Me=96,Ri=(i,e)=>{const t=(e-Math.floor(e))*256,o=Math.floor(t)%256,n=(o+1)%256,a=t-Math.floor(t),s=i[o*4+0]*(1-a)+i[n*4+0]*a,c=i[o*4+1]*(1-a)+i[n*4+1]*a,h=i[o*4+2]*(1-a)+i[n*4+2]*a;return[s,c,h]},Si=16,H=new Map,Te=new WeakMap;let Fi=0;const Di=i=>{const e=Te.get(i);if(e!==void 0)return e;const r=`lut${Fi++}`;return Te.set(i,r),r},Ei=(i,e,r,t,o,n,a,s,c)=>`${i}|${e}|${r}|${t}|${Di(o)}|${n}|${a}|${s[0]},${s[1]},${s[2]}|${c}`,Ai=(i,e,r,t,o,n,a,s,c)=>{const h=new ImageData(i,i),d=h.data,u=Math.round(s[0]*255),l=Math.round(s[1]*255),b=Math.round(s[2]*255),w=Math.round(c),f=Math.abs(c-w)<.01&&w>=2&&w<=8;for(let C=0;C<i;C++){const v=r+(C/i*2-1)*t;for(let g=0;g<i;g++){const m=e+(g/i*2-1)*t;let x=0,T=0,R=0;for(;R<Me;R++){const F=x*x,E=T*T;if(F+E>16)break;let I,j;if(f){let k=x,U=T;for(let V=1;V<w;V++){const K=k*x-U*T;U=k*T+U*x,k=K}I=k,j=U}else{const k=Math.sqrt(F+E),U=Math.atan2(T,x),V=Math.pow(k,c),K=U*c;I=V*Math.cos(K),j=V*Math.sin(K)}x=I+m,T=j+v}const S=((i-1-C)*i+g)*4;if(R>=Me)d[S+0]=u,d[S+1]=l,d[S+2]=b;else{const I=(R+1-Math.log2(Math.max(1e-6,.5*Math.log2(x*x+T*T))))*.05*n+a,[j,k,U]=Ri(o,I);d[S+0]=Math.round(j),d[S+1]=Math.round(k),d[S+2]=Math.round(U)}d[S+3]=255}}return h},Ii=(i,e,r,t,o,n,a,s,c)=>{const h=Ei(i,e,r,t,o,n,a,s,c),d=H.get(h);if(d)return H.delete(h),H.set(h,d),d;const u=Ai(i,e,r,t,o,n,a,s,c);for(H.set(h,u);H.size>Si;){const l=H.keys().next().value;if(l===void 0)break;H.delete(l)}return u},Pi=(()=>{const i=new Uint8Array(1024);for(let e=0;e<256;e++)i[e*4]=i[e*4+1]=i[e*4+2]=e,i[e*4+3]=255;return i})(),ji=({cx:i,cy:e,onChange:r,halfExtent:t=1.6,centerX:o=-.5,centerY:n=0,size:a=220,gradientLut:s,gradientRepeat:c=1,gradientPhase:h=0,interiorColor:d=[.04,.04,.06],power:u=2})=>{const l=D.useRef(null),b=D.useRef(null),w=D.useRef(!1);D.useEffect(()=>{const v=l.current;if(!v)return;const g=v.getContext("2d");if(!g)return;v.width=a,v.height=a;const x=Ii(a,o,n,t,s??Pi,c,h,d,u);b.current=x,g.putImageData(x,0,0),f()},[a,o,n,t,s,c,h,d[0],d[1],d[2],u]);const f=D.useCallback(()=>{const v=l.current;if(!v||!b.current)return;const g=v.getContext("2d");if(!g)return;g.putImageData(b.current,0,0);const m=(i-o)/t*.5+.5,x=(e-n)/t*.5+.5,T=m*a,R=(1-x)*a;g.strokeStyle="#fff",g.lineWidth=1,g.beginPath(),g.moveTo(T-8,R),g.lineTo(T-2,R),g.moveTo(T+2,R),g.lineTo(T+8,R),g.moveTo(T,R-8),g.lineTo(T,R-2),g.moveTo(T,R+2),g.lineTo(T,R+8),g.stroke(),g.strokeStyle="rgba(0,255,200,0.9)",g.beginPath(),g.arc(T,R,4,0,2*Math.PI),g.stroke()},[i,e,o,n,t,a]);D.useEffect(()=>{f()},[f]);const C=v=>{const g=l.current;if(!g)return;const m=g.getBoundingClientRect(),x=(v.clientX-m.left)/m.width,T=1-(v.clientY-m.top)/m.height,R=o+(x*2-1)*t,S=n+(T*2-1)*t;r(R,S)};return p.jsxs("div",{className:"flex flex-col gap-1",children:[p.jsx("div",{className:"text-[10px] text-gray-400 uppercase tracking-wide",children:"Pick Julia c"}),p.jsx("canvas",{ref:l,className:"rounded border border-white/10 cursor-crosshair",style:{width:a,height:a,imageRendering:"pixelated"},onPointerDown:v=>{w.current=!0,v.target.setPointerCapture(v.pointerId),C(v)},onPointerMove:v=>{w.current&&C(v)},onPointerUp:v=>{w.current=!1;try{v.target.releasePointerCapture(v.pointerId)}catch{}}}),p.jsxs("div",{className:"text-[10px] font-mono text-gray-500",children:["c = (",i.toFixed(4),", ",e.toFixed(4),")"]})]})},Bi=({sliceState:i,actions:e})=>{const r=i.juliaC??{x:-.36303304426511473,y:.16845183018751916},t=i.power??2,o=D.useMemo(()=>{},[]);return p.jsx(ji,{cx:r.x,cy:r.y,power:t,gradientLut:o,onChange:(n,a)=>e.setJulia({juliaC:{x:n,y:a}})})};te.register("julia-c-picker",Bi);te.register("preset-grid",wi);_.register(jt);_.register(_t);_.register(qt);_.register(Yt);_.register(Zt);_.register(ai);_.register(li);_.register(Ci);_.register(Qt);Ve({version:1,id:"fluid-toy.tab-parity-restructure",apply:i=>(i!=null&&i.features&&(Ne(i,"dye","palette"),A(i,"palette.collisionEnabled","collision.enabled"),A(i,"palette.collisionPreview","collision.preview"),A(i,"palette.collisionGradient","collision.gradient"),A(i,"palette.collisionRepeat","collision.repeat"),A(i,"palette.collisionPhase","collision.phase"),A(i,"palette.dyeMix","composite.dyeMix"),A(i,"palette.dyeInject","fluidSim.dyeInject"),A(i,"palette.dyeDissipation","fluidSim.dyeDissipation"),A(i,"palette.dyeDecayMode","fluidSim.dyeDecayMode"),A(i,"palette.dyeChromaDecayHz","fluidSim.dyeChromaDecayHz"),A(i,"palette.dyeSaturationBoost","fluidSim.dyeSaturationBoost"),A(i,"fluidSim.forceMode","coupling.forceMode"),A(i,"fluidSim.forceGain","coupling.forceGain"),A(i,"fluidSim.interiorDamp","coupling.interiorDamp"),A(i,"fluidSim.forceCap","coupling.forceCap"),A(i,"fluidSim.edgeMargin","coupling.edgeMargin"),A(i,"orbit.enabled","coupling.orbitEnabled"),A(i,"orbit.radius","coupling.orbitRadius"),A(i,"orbit.speed","coupling.orbitSpeed"),i.features.orbit&&Object.keys(i.features.orbit).length===0&&delete i.features.orbit,A(i,"sceneCamera.center","julia.center"),A(i,"sceneCamera.zoom","julia.zoom"),i.features.sceneCamera&&Object.keys(i.features.sceneCamera).length===0&&delete i.features.sceneCamera),i)});const ki=`
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
`,Ui=`
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
`,_i=`
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
`,ie=`
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
`,P=`#version 300 es
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
}`,Oi=`#version 300 es
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

${ki}
${Ui}

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

void main() {
  // TSAA sub-pixel jitter — offset vUv by blue-noise-driven sub-pixel
  // amount before mapping into fractal space. Over successive frames the
  // accumulator in FluidEngine averages jittered samples, producing AA.
  // When uJitterScale is 0, the offset is zero and we render un-jittered.
  vec2 jitter = (uJitterScale > 0.0)
      ? tsaaJitter(gl_FragCoord.xy) * uJitterScale
      : vec2(0.0);
  vec2 uvJ = vUv + jitter / max(uResolution, vec2(1.0));

  vec2 uv = uvJ * 2.0 - 1.0;
  uv.x *= uAspect;
  vec2 p = uCenter + uv * uScale;

  vec2 z, c;
  if (uKind == 0) { z = p; c = uJuliaC; }
  else            { z = vec2(0.0); c = p; }

  float escaped = 0.0;
  float iters = float(uMaxIter);

  // Accumulators for coloring modes
  float minT      = 1e9;
  float trapIter  = 0.0;
  float stripeSum = 0.0;
  int   stripeCount = 0;
  // dz for derivative / DE (only correct for power 2; close enough for general use)
  vec2  dz = vec2(1.0, 0.0);

  for (int i = 0; i < 4096; ++i) {
    if (i >= uMaxIter) break;

    // Derivative update: dz = p·z^(p-1)·dz + 1 (approximated for p=2 as 2·z·dz + 1).
    // For other powers this slightly mis-estimates |dz| but keeps the feature alive.
    dz = cmul(2.0 * z, dz) + vec2(1.0, 0.0);

    z = cpow(z, uPower) + c;

    // Coloring accumulators — capped at uColorIter so the user can tune how much
    // of the orbit feeds colour vs escape testing.
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

  outMain = vec4(z, iters, escaped);
  outAux  = vec4(minT, stripeAvg, logDz, trapIterN);
}`,Li=`#version 300 es
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
${ie}

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
}`,zi=`#version 300 es
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
}`,Gi=`#version 300 es
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
${ie}
${_i}

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
}`,Vi=`#version 300 es
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
}`,Ni=`#version 300 es
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
}`,Hi=`#version 300 es
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
}`,Ji=`#version 300 es
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
}`,Xi=`#version 300 es
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
}`,$i=`#version 300 es
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
}`,Wi=`#version 300 es
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
}`,qi=`#version 300 es
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
uniform float uCaustics;       // 0..25 — laplacian-of-dye highlight
uniform int   uCollisionPreview; // 1 = overlay the mask with diagonal hatching so walls are visible
${ie}

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

  // ── Liquid-look refraction. The gradient of dye luminance acts as a fake
  // height-field slope; we offset the fractal sample by that gradient. The
  // stencil width (uRefractSmooth, in dye texels) controls smoothness:
  // larger values sample further-apart neighbours → lower-frequency gradient
  // → smoother refraction without the per-pixel jitter of a raw 1-texel diff.
  vec2 refractOffset = vec2(0.0);
  float caustic = 0.0;
  if (uRefraction > 0.0 || uCaustics > 0.0) {
    vec2 t = uTexelDye * max(uRefractSmooth, 1.0);
    float lC = dot(texture(uDye, vUv).rgb,                  LUM_REC601);
    float lL = dot(texture(uDye, vUv - vec2(t.x, 0.0)).rgb, LUM_REC601);
    float lR = dot(texture(uDye, vUv + vec2(t.x, 0.0)).rgb, LUM_REC601);
    float lD = dot(texture(uDye, vUv - vec2(0.0, t.y)).rgb, LUM_REC601);
    float lU = dot(texture(uDye, vUv + vec2(0.0, t.y)).rgb, LUM_REC601);
    refractOffset = vec2(lR - lL, lU - lD) * uRefraction;
    // Laplacian for caustics. Dividing by the stencil scale keeps the
    // caustic magnitude roughly invariant when the user tweaks smoothness.
    caustic = max(0.0, (lL + lR + lU + lD - 4.0 * lC)) / max(uRefractSmooth, 1.0);
  }

  vec4 j = texture(uJulia, uv + refractOffset);
  vec4 aux = texture(uJuliaAux, uv + refractOffset);
  vec3 dye = texture(uDye, uv).rgb;
  vec2 v = texture(uVelocity, uv).rg;

  vec3 juliaColor = gradientForJulia(j, aux) * j.a;
  juliaColor = mix(uInteriorColor, juliaColor, j.a);

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

  // Solid obstacles: override the composite with the raw (untoned) gradient
  // colour so walls read as crisp objects, not as "dyed fluid near a wall."
  float solid = texture(uMask, uv + refractOffset).r;
  if (solid > 0.01) {
    col = mix(col, gradientForJulia(j, aux), solid);
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
}`,Ki=`#version 300 es
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
${ie}
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
}`,Yi=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`,Zi=`#version 300 es
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
}`,Qi=`#version 300 es
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
}`,er=`#version 300 es
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
}`,tr=`#version 300 es
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
}`,ir=`#version 300 es
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
}`,we=1e-5,Ce=8,rr=5,or=.002,ar=.005,sr=5,nr=.2,Q=256,lr=.5,cr=(i,e="/blueNoise.png",r)=>{const t=i.createTexture();if(!t)throw new Error("[createBlueNoiseWebGL2] failed to allocate texture");i.bindTexture(i.TEXTURE_2D,t),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,new Uint8Array([128,128,128,128])),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.REPEAT),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.REPEAT);let o=[64,64];const n=new Image;return n.crossOrigin="anonymous",n.onload=()=>{i.bindTexture(i.TEXTURE_2D,t),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,i.RGBA,i.UNSIGNED_BYTE,n),o=[n.naturalWidth,n.naturalHeight]},n.onerror=a=>{console.warn("[createBlueNoiseWebGL2] failed to load",e,a)},n.src=e,{texture:t,getResolution:()=>o}};function ur(i){switch(i){case"linear":return 0;case"perceptual":return 1;case"vivid":return 2}}function dr(i){switch(i){case"none":return 0;case"reinhard":return 1;case"agx":return 2;case"filmic":return 3}}function pr(i){switch(i){case"add":return 0;case"screen":return 1;case"max":return 2;case"over":return 3}}function ee(i){switch(i){case"iterations":return 0;case"angle":return 1;case"magnitude":return 2;case"decomposition":return 3;case"bands":return 4;case"orbit-point":return 5;case"orbit-circle":return 6;case"orbit-cross":return 7;case"orbit-line":return 8;case"stripe":return 9;case"distance":return 10;case"derivative":return 11;case"potential":return 12;case"trap-iter":return 13}}function mr(i){switch(i){case"orbit-point":return 0;case"orbit-circle":return 1;case"orbit-cross":return 2;case"orbit-line":return 3;case"trap-iter":return 0;default:return 0}}const fr={juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],zoom:1.2904749020480561,maxIter:310,escapeR:32,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:-1200,interiorDamp:.59,dt:.016,dissipation:.17,dyeDissipation:1.03,dyeInject:8,vorticity:22.1,pressureIters:50,show:"composite",juliaMix:.4,dyeMix:2,velocityViz:.02,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:1.03,dyeSaturationBoost:1,vorticityScale:1,toneMapping:"none",exposure:1,vibrance:1.645,fluidStyle:"plain",bloomAmount:0,bloomThreshold:1,aberration:.27,refraction:.037,refractSmooth:3,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!1,collisionPreview:!1,collisionRepeat:1,collisionPhase:0,paused:!1,simResolution:1344,autoQuality:!0,tsaa:!0,tsaaJitterAmount:1,tsaaSampleCap:64};class hr{constructor(e,r={}){y(this,"gl");y(this,"canvas");y(this,"quadVbo");y(this,"progJulia");y(this,"progMotion");y(this,"progAddForce");y(this,"progInjectDye");y(this,"progAdvect");y(this,"progDivergence");y(this,"progCurl");y(this,"progVorticity");y(this,"progPressure");y(this,"progGradSub");y(this,"progSplat");y(this,"progDisplay");y(this,"progClear");y(this,"progReproject");y(this,"progBloomExtract");y(this,"progBloomDown");y(this,"progBloomUp");y(this,"progMask");y(this,"progTsaaBlend");y(this,"juliaTsaa");y(this,"juliaTsaaPrev");y(this,"tsaaSampleIndex",0);y(this,"tsaaParamHash","");y(this,"blueNoise",null);y(this,"frameCount",0);y(this,"resetAccumUnsub",null);y(this,"bloomA");y(this,"bloomB");y(this,"bloomC");y(this,"bloomDirty",!0);y(this,"lastCenter",[0,0]);y(this,"lastZoom",1.5);y(this,"firstFrame",!0);y(this,"simW",0);y(this,"simH",0);y(this,"juliaCur");y(this,"juliaPrev");y(this,"forceTex");y(this,"velocity");y(this,"dye");y(this,"divergence");y(this,"pressure");y(this,"curl");y(this,"maskTex");y(this,"gradientTex",null);y(this,"collisionGradientTex",null);y(this,"params",{...fr});y(this,"lastTimeMs",0);y(this,"framebufferFormat");y(this,"maskReadFBO",null);y(this,"maskCpuBuf",new Uint8Array(0));y(this,"MASK_CPU_W",128);y(this,"MASK_CPU_H",128);y(this,"onFrameEnd");this.canvas=e,this.onFrameEnd=r.onFrameEnd;const t=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!t)throw new Error("WebGL2 required — your browser does not support it.");this.gl=t;const o=t.getExtension("EXT_color_buffer_float"),n=t.getExtension("EXT_color_buffer_half_float");if(!o&&!n)throw new Error("Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.");this.framebufferFormat=this.detectFormat(),this.quadVbo=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.quadVbo),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),this.compileAll(),this.allocateTextures(this.params.simResolution),this.blueNoise=cr(t),this.resetAccumUnsub=He.on(Je.RESET_ACCUM,()=>{this.tsaaSampleIndex=0})}detectFormat(){const e=this.gl,r=[{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,name:"RGBA16F half_float"},{internal:e.RGBA32F,format:e.RGBA,type:e.FLOAT,name:"RGBA32F float"},{internal:e.RGBA8,format:e.RGBA,type:e.UNSIGNED_BYTE,name:"RGBA8 fallback"}];for(const t of r){const o=e.createTexture();e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,t.internal,4,4,0,t.format,t.type,null);const n=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0);const a=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(n),e.deleteTexture(o),a===e.FRAMEBUFFER_COMPLETE)return console.info(`[FluidEngine] Using ${t.name} render targets.`),t}throw new Error("No renderable texture format supported (not even RGBA8).")}compileShader(e,r){const t=this.gl,o=t.createShader(e);if(t.shaderSource(o,r),t.compileShader(o),!t.getShaderParameter(o,t.COMPILE_STATUS)){const n=t.getShaderInfoLog(o)||"",a=r.split(`
`).map((s,c)=>`${String(c+1).padStart(4)}: ${s}`).join(`
`);throw console.error(`Shader compile error:
${n}
${a}`),new Error(`Shader compile error: ${n}`)}return o}linkProgram(e,r,t){const o=this.gl,n=this.compileShader(o.VERTEX_SHADER,e),a=this.compileShader(o.FRAGMENT_SHADER,r),s=o.createProgram();if(o.attachShader(s,n),o.attachShader(s,a),o.bindAttribLocation(s,0,"aPos"),o.linkProgram(s),!o.getProgramParameter(s,o.LINK_STATUS))throw new Error(`Program link error: ${o.getProgramInfoLog(s)}`);o.deleteShader(n),o.deleteShader(a);const c={};for(const h of t)c[h]=o.getUniformLocation(s,h);return{prog:s,uniforms:c}}compileAll(){this.progJulia=this.linkProgram(P,Oi,["uTexel","uKind","uJuliaC","uCenter","uScale","uAspect","uMaxIter","uEscapeR2","uPower","uColorIter","uTrapMode","uTrapCenter","uTrapRadius","uTrapNormal","uTrapOffset","uStripeFreq","uJitterScale","uResolution","uBlueNoiseTexture","uBlueNoiseResolution","uFrameCount"]),this.progTsaaBlend=this.linkProgram(P,ir,["uCurrentMain","uCurrentAux","uHistoryMain","uHistoryAux","uSampleIndex"]),this.progMotion=this.linkProgram(P,Li,["uTexel","uJulia","uJuliaPrev","uJuliaAux","uGradient","uMask","uMode","uGain","uDt","uInteriorDamp","uDyeGain","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uForceCap"]),this.progAddForce=this.linkProgram(P,zi,["uTexel","uVelocity","uForce","uMask","uDt"]),this.progInjectDye=this.linkProgram(P,Gi,["uTexel","uDye","uJulia","uJuliaAux","uGradient","uMask","uDyeGain","uDyeFadeHz","uDt","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uDyeBlend","uDyeDecayMode","uDyeChromaFadeHz","uDyeSatBoost"]),this.progAdvect=this.linkProgram(P,Vi,["uTexel","uVelocity","uSource","uMask","uDt","uDissipation","uEdgeMargin"]),this.progDivergence=this.linkProgram(P,Ni,["uTexel","uVelocity"]),this.progCurl=this.linkProgram(P,Hi,["uTexel","uVelocity"]),this.progVorticity=this.linkProgram(P,Ji,["uTexel","uVelocity","uCurl","uStrength","uScale","uDt"]),this.progPressure=this.linkProgram(P,Xi,["uTexel","uPressure","uDivergence"]),this.progGradSub=this.linkProgram(P,$i,["uTexel","uPressure","uVelocity","uMask"]),this.progSplat=this.linkProgram(P,Wi,["uTexel","uTarget","uPoint","uValue","uRadius","uDiscR","uHardness","uAspect","uOp"]),this.progDisplay=this.linkProgram(P,qi,["uTexel","uTexelDisplay","uTexelDye","uJulia","uJuliaAux","uDye","uVelocity","uGradient","uBloom","uMask","uShowMode","uJuliaMix","uDyeMix","uVelocityViz","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uToneMapping","uExposure","uVibrance","uBloomAmount","uAberration","uRefraction","uRefractSmooth","uCaustics","uCollisionPreview"]),this.progClear=this.linkProgram(P,Yi,["uValue"]),this.progReproject=this.linkProgram(P,tr,["uTexel","uSource","uNewCenter","uOldCenter","uNewZoom","uOldZoom","uAspect"]),this.progBloomExtract=this.linkProgram(P,Zi,["uTexel","uSource","uThreshold","uSoftKnee"]),this.progBloomDown=this.linkProgram(P,Qi,["uTexel","uSource"]),this.progBloomUp=this.linkProgram(P,er,["uTexel","uSource","uPrev","uIntensity"]),this.progMask=this.linkProgram(P,Ki,["uTexel","uJulia","uJuliaAux","uGradient","uCollisionGradient","uCollisionRepeat","uCollisionPhase","uColorMapping","uGradientRepeat","uGradientPhase"])}createFBO(e,r){const t=this.gl,o=t.createTexture();t.bindTexture(t.TEXTURE_2D,o),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,r,0,this.framebufferFormat.format,this.framebufferFormat.type,null);const n=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,n),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,o,0),t.viewport(0,0,e,r),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{tex:o,fbo:n,width:e,height:r,texel:[1/e,1/r]}}createMrtFbo(e,r){const t=this.gl,o=()=>{const c=t.createTexture();return t.bindTexture(t.TEXTURE_2D,c),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,r,0,this.framebufferFormat.format,this.framebufferFormat.type,null),c},n=o(),a=o(),s=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,s),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,n,0),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT1,t.TEXTURE_2D,a,0),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1]),t.viewport(0,0,e,r),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{texMain:n,texAux:a,fbo:s,width:e,height:r,texel:[1/e,1/r]}}deleteMrtFbo(e){if(!e)return;const r=this.gl;r.deleteTexture(e.texMain),r.deleteTexture(e.texAux),r.deleteFramebuffer(e.fbo)}createDoubleFBO(e,r){let t=this.createFBO(e,r),o=this.createFBO(e,r);return{width:e,height:r,texel:[1/e,1/r],get read(){return t},get write(){return o},swap(){const a=t;t=o,o=a}}}deleteFBO(e){if(!e)return;const r=this.gl;r.deleteTexture(e.tex),r.deleteFramebuffer(e.fbo)}deleteDoubleFBO(e){e&&(this.deleteFBO(e.read),this.deleteFBO(e.write))}allocateTextures(e){const r=this.canvas.width/Math.max(1,this.canvas.height),t=Math.max(32,e|0),o=Math.max(32,Math.round(t*r));o===this.simW&&t===this.simH&&this.juliaCur||(this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.simW=o,this.simH=t,this.juliaCur=this.createMrtFbo(o,t),this.juliaPrev=this.createMrtFbo(o,t),this.juliaTsaa=this.createMrtFbo(o,t),this.juliaTsaaPrev=this.createMrtFbo(o,t),this.tsaaSampleIndex=0,this.forceTex=this.createFBO(o,t),this.velocity=this.createDoubleFBO(o,t),this.dye=this.createDoubleFBO(o,t),this.divergence=this.createFBO(o,t),this.pressure=this.createDoubleFBO(o,t),this.curl=this.createFBO(o,t),this.maskTex=this.createFBO(o,t),this.firstFrame=!0)}bindFBO(e){const r=this.gl;r.bindFramebuffer(r.FRAMEBUFFER,e.fbo),r.viewport(0,0,e.width,e.height)}useProgram(e){const r=this.gl;r.useProgram(e.prog),r.bindBuffer(r.ARRAY_BUFFER,this.quadVbo),r.enableVertexAttribArray(0),r.vertexAttribPointer(0,2,r.FLOAT,!1,0,0)}drawQuad(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}setTexel(e,r,t){const o=this.gl,n=e.uniforms.uTexel;n&&o.uniform2f(n,1/r,1/t)}bindTex(e,r,t){const o=this.gl;o.activeTexture(o.TEXTURE0+e),o.bindTexture(o.TEXTURE_2D,r),t&&o.uniform1i(t,e)}setParams(e){this.params={...this.params,...e},e.simResolution&&e.simResolution!==this.simH&&this.allocateTextures(e.simResolution)}uploadLut(e,r){const t=this.gl,o=Q*4;r.length!==o&&console.warn(`[FluidEngine] ${e} gradient buffer unexpected length ${r.length} (want ${o})`);let n=e==="main"?this.gradientTex:this.collisionGradientTex;n||(n=t.createTexture(),e==="main"?this.gradientTex=n:this.collisionGradientTex=n),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,Q,1,0,t.RGBA,t.UNSIGNED_BYTE,r)}setGradientBuffer(e){this.uploadLut("main",e)}setCollisionGradientBuffer(e){this.uploadLut("collision",e)}ensureGradient(){if(this.gradientTex)return;const e=Q,r=new Uint8Array(e*4);for(let t=0;t<e;++t)r[t*4+0]=t,r[t*4+1]=t,r[t*4+2]=t,r[t*4+3]=255;this.setGradientBuffer(r)}ensureCollisionGradient(){if(this.collisionGradientTex)return;const e=Q,r=new Uint8Array(e*4);for(let t=0;t<e;++t)r[t*4+0]=0,r[t*4+1]=0,r[t*4+2]=0,r[t*4+3]=255;this.setCollisionGradientBuffer(r)}resize(e,r){const t=Math.min(window.devicePixelRatio||1,2),o=Math.max(1,Math.round(e*t)),n=Math.max(1,Math.round(r*t));(this.canvas.width!==o||this.canvas.height!==n)&&(this.canvas.width=o,this.canvas.height=n,this.allocateTextures(this.params.simResolution),this.bloomDirty=!0)}ensureBloomFbos(){if(!this.bloomDirty&&this.bloomA)return;this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC);const e=this.canvas.width,r=this.canvas.height,t=Math.max(4,e>>1&-2),o=Math.max(4,r>>1&-2),n=Math.max(2,e>>2&-2),a=Math.max(2,r>>2&-2),s=Math.max(2,e>>3&-2),c=Math.max(2,r>>3&-2);this.bloomA=this.createFBO(t,o),this.bloomB=this.createFBO(n,a),this.bloomC=this.createFBO(s,c),this.bloomDirty=!1}markFirstFrame(){this.firstFrame=!0}resetFluid(){const e=this.gl;for(const r of[this.velocity,this.dye,this.pressure])for(const t of[r.read,r.write])this.bindFBO(t),this.useProgram(this.progClear),e.uniform4f(this.progClear.uniforms.uValue,0,0,0,1),this.drawQuad();e.bindFramebuffer(e.FRAMEBUFFER,null),this.markFirstFrame()}splat(e,r,t,o,n,a,s){const c=this.gl;this.bindFBO(e.write),this.useProgram(this.progSplat),this.bindTex(0,e.read.tex,this.progSplat.uniforms.uTarget),c.uniform2f(this.progSplat.uniforms.uPoint,r,t),c.uniform3f(this.progSplat.uniforms.uValue,o[0],o[1],o[2]),c.uniform1f(this.progSplat.uniforms.uRadius,Math.max(1e-6,n*.5*(n*.5))),c.uniform1f(this.progSplat.uniforms.uDiscR,Math.max(1e-6,n)),c.uniform1f(this.progSplat.uniforms.uHardness,a),c.uniform1f(this.progSplat.uniforms.uAspect,this.simW/this.simH),c.uniform1f(this.progSplat.uniforms.uOp,s==="sub"?1:0),this.drawQuad(),e.swap()}brush(e,r,t,o,n,a,s,c,h){e=Math.max(0,Math.min(1,e)),r=Math.max(0,Math.min(1,r));const d=[n[0]*c,n[1]*c,n[2]*c],u=[t,o,0];switch(h){case"paint":this.splat(this.velocity,e,r,u,a,s,"add"),this.splat(this.dye,e,r,d,a,s,"add");break;case"erase":this.splat(this.dye,e,r,[c,c,c],a,s,"sub");break;case"stamp":this.splat(this.dye,e,r,d,a,s,"add");break;case"smudge":this.splat(this.velocity,e,r,u,a,s,"add");break}this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}ensureMaskReadFBO(){if(this.maskReadFBO)return;const e=this.gl,r=e.createTexture();e.bindTexture(e.TEXTURE_2D,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,this.MASK_CPU_W,this.MASK_CPU_H,0,e.RGBA,e.UNSIGNED_BYTE,null);const t=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,t),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),this.maskReadFBO={tex:r,fbo:t,width:this.MASK_CPU_W,height:this.MASK_CPU_H,texel:[1/this.MASK_CPU_W,1/this.MASK_CPU_H]},this.maskCpuBuf=new Uint8Array(this.MASK_CPU_W*this.MASK_CPU_H*4)}readMaskToCPU(){if(!this.params.collisionEnabled)return;const e=this.gl;this.ensureMaskReadFBO(),e.bindFramebuffer(e.READ_FRAMEBUFFER,this.maskTex.fbo),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,this.maskReadFBO.fbo),e.blitFramebuffer(0,0,this.simW,this.simH,0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.COLOR_BUFFER_BIT,e.LINEAR),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.FRAMEBUFFER,this.maskReadFBO.fbo),e.readPixels(0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.RGBA,e.UNSIGNED_BYTE,this.maskCpuBuf),e.bindFramebuffer(e.FRAMEBUFFER,null)}sampleMask(e,r){if(!this.params.collisionEnabled||this.maskCpuBuf.length===0)return 0;const t=this.MASK_CPU_W,o=this.MASK_CPU_H;if(e<0||e>1||r<0||r>1)return 0;const n=Math.min(t-1,Math.max(0,Math.floor(e*t))),a=Math.min(o-1,Math.max(0,Math.floor(r*o)));return this.maskCpuBuf[(a*t+n)*4]/255}renderJulia(){const e=this.gl,r=this.juliaCur;this.juliaCur=this.juliaPrev,this.juliaPrev=r,e.bindFramebuffer(e.FRAMEBUFFER,this.juliaCur.fbo),e.viewport(0,0,this.juliaCur.width,this.juliaCur.height),this.useProgram(this.progJulia),this.setTexel(this.progJulia,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uKind,this.params.kind==="julia"?0:1),e.uniform2f(this.progJulia.uniforms.uJuliaC,this.params.juliaC[0],this.params.juliaC[1]),e.uniform2f(this.progJulia.uniforms.uCenter,this.params.center[0],this.params.center[1]),e.uniform1f(this.progJulia.uniforms.uScale,this.params.zoom),e.uniform1f(this.progJulia.uniforms.uAspect,this.simW/this.simH);const t=Math.max(4,this.params.maxIter|0);e.uniform1i(this.progJulia.uniforms.uMaxIter,t),e.uniform1i(this.progJulia.uniforms.uColorIter,Math.max(1,Math.min(t,this.params.colorIter|0))),e.uniform1f(this.progJulia.uniforms.uEscapeR2,this.params.escapeR*this.params.escapeR),e.uniform1f(this.progJulia.uniforms.uPower,this.params.power),e.uniform1i(this.progJulia.uniforms.uTrapMode,mr(this.params.colorMapping)),e.uniform2f(this.progJulia.uniforms.uTrapCenter,this.params.trapCenter[0],this.params.trapCenter[1]),e.uniform1f(this.progJulia.uniforms.uTrapRadius,this.params.trapRadius),e.uniform2f(this.progJulia.uniforms.uTrapNormal,this.params.trapNormal[0],this.params.trapNormal[1]),e.uniform1f(this.progJulia.uniforms.uTrapOffset,this.params.trapOffset),e.uniform1f(this.progJulia.uniforms.uStripeFreq,this.params.stripeFreq);const n=this.params.tsaa&&this.tsaaSampleIndex<this.params.tsaaSampleCap?this.params.tsaaJitterAmount:0;if(e.uniform1f(this.progJulia.uniforms.uJitterScale,n),e.uniform2f(this.progJulia.uniforms.uResolution,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uFrameCount,this.frameCount),this.blueNoise){this.bindTex(5,this.blueNoise.texture,this.progJulia.uniforms.uBlueNoiseTexture);const[a,s]=this.blueNoise.getResolution();e.uniform2f(this.progJulia.uniforms.uBlueNoiseResolution,a,s)}this.drawQuad()}runTsaaBlend(){if(this.tsaaSampleIndex>=this.params.tsaaSampleCap)return;const e=this.gl;this.tsaaSampleIndex=Math.min(this.tsaaSampleIndex+1,this.params.tsaaSampleCap),e.bindFramebuffer(e.FRAMEBUFFER,this.juliaTsaaPrev.fbo),e.viewport(0,0,this.juliaTsaaPrev.width,this.juliaTsaaPrev.height),this.useProgram(this.progTsaaBlend),this.bindTex(0,this.juliaCur.texMain,this.progTsaaBlend.uniforms.uCurrentMain),this.bindTex(1,this.juliaCur.texAux,this.progTsaaBlend.uniforms.uCurrentAux),this.bindTex(2,this.juliaTsaa.texMain,this.progTsaaBlend.uniforms.uHistoryMain),this.bindTex(3,this.juliaTsaa.texAux,this.progTsaaBlend.uniforms.uHistoryAux),e.uniform1i(this.progTsaaBlend.uniforms.uSampleIndex,this.tsaaSampleIndex),this.drawQuad();const r=this.juliaTsaa;this.juliaTsaa=this.juliaTsaaPrev,this.juliaTsaaPrev=r}juliaReadFbo(){return this.params.tsaa?this.juliaTsaa:this.juliaCur}updateTsaaHash(){const e=this.params,r=`${e.kind}|${e.juliaC[0]}|${e.juliaC[1]}|${e.center[0]}|${e.center[1]}|${e.zoom}|${e.power}|${e.maxIter}|${e.colorIter}|${e.escapeR}|${e.colorMapping}|${e.trapCenter[0]}|${e.trapCenter[1]}|${e.trapRadius}|${e.trapNormal[0]}|${e.trapNormal[1]}|${e.trapOffset}|${e.stripeFreq}`;r!==this.tsaaParamHash&&(this.tsaaParamHash=r,this.tsaaSampleIndex=0)}computeMask(){const e=this.gl;if(this.ensureGradient(),this.ensureCollisionGradient(),this.bindFBO(this.maskTex),!this.params.collisionEnabled){e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);return}this.useProgram(this.progMask),this.setTexel(this.progMask,this.simW,this.simH);const r=this.juliaReadFbo();this.bindTex(0,r.texMain,this.progMask.uniforms.uJulia),this.bindTex(1,r.texAux,this.progMask.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMask.uniforms.uGradient),this.bindTex(3,this.collisionGradientTex,this.progMask.uniforms.uCollisionGradient),e.uniform1i(this.progMask.uniforms.uColorMapping,ee(this.params.colorMapping)),e.uniform1f(this.progMask.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMask.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMask.uniforms.uCollisionRepeat,this.params.collisionRepeat),e.uniform1f(this.progMask.uniforms.uCollisionPhase,this.params.collisionPhase),this.drawQuad()}computeForce(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.forceTex),this.useProgram(this.progMotion),this.setTexel(this.progMotion,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMotion.uniforms.uJulia),this.bindTex(1,this.juliaPrev.texMain,this.progMotion.uniforms.uJuliaPrev),this.bindTex(4,this.juliaCur.texAux,this.progMotion.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMotion.uniforms.uGradient),this.bindTex(5,this.maskTex.tex,this.progMotion.uniforms.uMask),e.uniform1i(this.progMotion.uniforms.uMode,gr(this.params.forceMode)),e.uniform1f(this.progMotion.uniforms.uGain,this.params.forceGain),e.uniform1f(this.progMotion.uniforms.uDt,this.params.dt),e.uniform1f(this.progMotion.uniforms.uInteriorDamp,this.params.interiorDamp),e.uniform1f(this.progMotion.uniforms.uDyeGain,this.params.dyeInject),e.uniform1i(this.progMotion.uniforms.uColorMapping,ee(this.params.colorMapping)),e.uniform1f(this.progMotion.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMotion.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMotion.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1f(this.progMotion.uniforms.uForceCap,this.params.forceCap),this.drawQuad()}addForceToVelocity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progAddForce),this.setTexel(this.progAddForce,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAddForce.uniforms.uVelocity),this.bindTex(1,this.forceTex.tex,this.progAddForce.uniforms.uForce),this.bindTex(2,this.maskTex.tex,this.progAddForce.uniforms.uMask),e.uniform1f(this.progAddForce.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}injectDye(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.dye.write),this.useProgram(this.progInjectDye),this.setTexel(this.progInjectDye,this.simW,this.simH);const r=this.juliaReadFbo();this.bindTex(0,this.dye.read.tex,this.progInjectDye.uniforms.uDye),this.bindTex(1,r.texMain,this.progInjectDye.uniforms.uJulia),this.bindTex(2,this.gradientTex,this.progInjectDye.uniforms.uGradient),this.bindTex(4,r.texAux,this.progInjectDye.uniforms.uJuliaAux),this.bindTex(5,this.maskTex.tex,this.progInjectDye.uniforms.uMask),e.uniform1f(this.progInjectDye.uniforms.uDyeGain,this.params.dyeInject),e.uniform1f(this.progInjectDye.uniforms.uDyeFadeHz,this.params.dyeDissipation),e.uniform1f(this.progInjectDye.uniforms.uDt,this.params.dt),e.uniform1i(this.progInjectDye.uniforms.uColorMapping,ee(this.params.colorMapping)),e.uniform1f(this.progInjectDye.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progInjectDye.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progInjectDye.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1i(this.progInjectDye.uniforms.uDyeBlend,pr(this.params.dyeBlend)),e.uniform1i(this.progInjectDye.uniforms.uDyeDecayMode,ur(this.params.dyeDecayMode)),e.uniform1f(this.progInjectDye.uniforms.uDyeChromaFadeHz,this.params.dyeChromaDecayHz),e.uniform1f(this.progInjectDye.uniforms.uDyeSatBoost,this.params.dyeSaturationBoost),this.drawQuad(),this.dye.swap()}computeCurl(){this.bindFBO(this.curl),this.useProgram(this.progCurl),this.setTexel(this.progCurl,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progCurl.uniforms.uVelocity),this.drawQuad()}applyVorticity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progVorticity),this.setTexel(this.progVorticity,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progVorticity.uniforms.uVelocity),this.bindTex(1,this.curl.tex,this.progVorticity.uniforms.uCurl),e.uniform1f(this.progVorticity.uniforms.uStrength,this.params.vorticity),e.uniform1f(this.progVorticity.uniforms.uScale,this.params.vorticityScale),e.uniform1f(this.progVorticity.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}computeDivergence(){this.bindFBO(this.divergence),this.useProgram(this.progDivergence),this.setTexel(this.progDivergence,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progDivergence.uniforms.uVelocity),this.drawQuad()}solvePressure(){const e=this.gl;this.bindFBO(this.pressure.read),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);for(let r=0;r<this.params.pressureIters;++r)this.bindFBO(this.pressure.write),this.useProgram(this.progPressure),this.setTexel(this.progPressure,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progPressure.uniforms.uPressure),this.bindTex(1,this.divergence.tex,this.progPressure.uniforms.uDivergence),this.drawQuad(),this.pressure.swap()}subtractPressureGradient(){this.bindFBO(this.velocity.write),this.useProgram(this.progGradSub),this.setTexel(this.progGradSub,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progGradSub.uniforms.uPressure),this.bindTex(1,this.velocity.read.tex,this.progGradSub.uniforms.uVelocity),this.bindTex(2,this.maskTex.tex,this.progGradSub.uniforms.uMask),this.drawQuad(),this.velocity.swap()}advect(e,r){const t=this.gl;this.bindFBO(e.write),this.useProgram(this.progAdvect),this.setTexel(this.progAdvect,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAdvect.uniforms.uVelocity),this.bindTex(1,e.read.tex,this.progAdvect.uniforms.uSource),this.bindTex(2,this.maskTex.tex,this.progAdvect.uniforms.uMask),t.uniform1f(this.progAdvect.uniforms.uDt,this.params.dt),t.uniform1f(this.progAdvect.uniforms.uDissipation,r),t.uniform1f(this.progAdvect.uniforms.uEdgeMargin,this.params.edgeMargin),this.drawQuad(),e.swap()}reprojectTexture(e,r,t){const o=this.gl;this.bindFBO(e.write),this.useProgram(this.progReproject),this.setTexel(this.progReproject,this.simW,this.simH),this.bindTex(0,e.read.tex,this.progReproject.uniforms.uSource),o.uniform2f(this.progReproject.uniforms.uNewCenter,this.params.center[0],this.params.center[1]),o.uniform2f(this.progReproject.uniforms.uOldCenter,r[0],r[1]),o.uniform1f(this.progReproject.uniforms.uNewZoom,this.params.zoom),o.uniform1f(this.progReproject.uniforms.uOldZoom,t),o.uniform1f(this.progReproject.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}maybeReprojectForCamera(){if(this.firstFrame){this.firstFrame=!1,this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom;return}const e=this.params.center[0]-this.lastCenter[0],r=this.params.center[1]-this.lastCenter[1],t=this.params.zoom-this.lastZoom;if(Math.abs(e)<1e-7&&Math.abs(r)<1e-7&&Math.abs(t)<1e-7)return;const o=[this.lastCenter[0],this.lastCenter[1]],n=this.lastZoom;this.reprojectTexture(this.dye,o,n),this.reprojectTexture(this.velocity,o,n),this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom}displayToScreen(){const e=this.gl;this.ensureGradient();const r=this.params.bloomAmount>.001;r&&(this.ensureBloomFbos(),this.bindFBO(this.bloomA),this.setDisplayUniforms(null,!0),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomExtract),e.uniform2f(this.progBloomExtract.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomA.tex,this.progBloomExtract.uniforms.uSource),e.uniform1f(this.progBloomExtract.uniforms.uThreshold,this.params.bloomThreshold),e.uniform1f(this.progBloomExtract.uniforms.uSoftKnee,lr),this.drawQuad(),this.bindFBO(this.bloomC),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomA),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomUp),e.uniform2f(this.progBloomUp.uniforms.uTexel,this.bloomC.texel[0],this.bloomC.texel[1]),this.bindTex(0,this.bloomC.tex,this.progBloomUp.uniforms.uSource),this.bindTex(1,this.bloomA.tex,this.progBloomUp.uniforms.uPrev),e.uniform1f(this.progBloomUp.uniforms.uIntensity,1),this.drawQuad()),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.setDisplayUniforms(r?this.bloomB:null,!1),this.drawQuad()}setDisplayUniforms(e,r=!1){const t=this.gl;this.useProgram(this.progDisplay),t.uniform2f(this.progDisplay.uniforms.uTexelDisplay,1/this.canvas.width,1/this.canvas.height),t.uniform2f(this.progDisplay.uniforms.uTexelDye,1/this.simW,1/this.simH);const o=this.juliaReadFbo();this.bindTex(0,o.texMain,this.progDisplay.uniforms.uJulia),this.bindTex(4,o.texAux,this.progDisplay.uniforms.uJuliaAux),this.bindTex(1,this.dye.read.tex,this.progDisplay.uniforms.uDye),this.bindTex(2,this.velocity.read.tex,this.progDisplay.uniforms.uVelocity),this.bindTex(3,this.gradientTex,this.progDisplay.uniforms.uGradient),this.bindTex(5,(e==null?void 0:e.tex)??this.gradientTex,this.progDisplay.uniforms.uBloom),this.bindTex(6,this.maskTex.tex,this.progDisplay.uniforms.uMask),t.uniform1i(this.progDisplay.uniforms.uShowMode,vr(this.params.show)),t.uniform1f(this.progDisplay.uniforms.uJuliaMix,this.params.juliaMix),t.uniform1f(this.progDisplay.uniforms.uDyeMix,this.params.dyeMix),t.uniform1f(this.progDisplay.uniforms.uVelocityViz,this.params.velocityViz),t.uniform1i(this.progDisplay.uniforms.uColorMapping,ee(this.params.colorMapping)),t.uniform1f(this.progDisplay.uniforms.uGradientRepeat,this.params.gradientRepeat),t.uniform1f(this.progDisplay.uniforms.uGradientPhase,this.params.gradientPhase),t.uniform3f(this.progDisplay.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),r?(t.uniform1i(this.progDisplay.uniforms.uToneMapping,0),t.uniform1f(this.progDisplay.uniforms.uExposure,1),t.uniform1f(this.progDisplay.uniforms.uVibrance,0),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,0),t.uniform1f(this.progDisplay.uniforms.uAberration,0),t.uniform1f(this.progDisplay.uniforms.uRefraction,0),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,1),t.uniform1f(this.progDisplay.uniforms.uCaustics,0),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,0)):(t.uniform1i(this.progDisplay.uniforms.uToneMapping,dr(this.params.toneMapping)),t.uniform1f(this.progDisplay.uniforms.uExposure,this.params.exposure),t.uniform1f(this.progDisplay.uniforms.uVibrance,this.params.vibrance),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,e?this.params.bloomAmount:0),t.uniform1f(this.progDisplay.uniforms.uAberration,this.params.aberration),t.uniform1f(this.progDisplay.uniforms.uRefraction,this.params.refraction),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,this.params.refractSmooth),t.uniform1f(this.progDisplay.uniforms.uCaustics,this.params.caustics),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,this.params.collisionPreview?1:0))}frame(e){const r=this.gl,t=this.lastTimeMs===0?.016:Math.min(.05,(e-this.lastTimeMs)/1e3);this.lastTimeMs=e,this.params.dt=t,this.updateTsaaHash(),this.frameCount++,this.renderJulia(),this.params.tsaa&&this.runTsaaBlend(),this.computeMask(),this.readMaskToCPU(),this.params.paused||(this.maybeReprojectForCamera(),this.computeForce(),this.addForceToVelocity(),this.params.vorticity>0&&(this.computeCurl(),this.applyVorticity()),this.computeDivergence(),this.solvePressure(),this.subtractPressureGradient(),this.advect(this.velocity,this.params.dissipation),this.injectDye(),this.advect(this.dye,this.params.dyeDissipation)),this.displayToScreen(),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,null),this.onFrameEnd&&this.onFrameEnd()}dispose(){const e=this.gl;this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.maskReadFBO&&(this.deleteFBO(this.maskReadFBO),this.maskReadFBO=null),this.gradientTex&&(e.deleteTexture(this.gradientTex),this.gradientTex=null),this.collisionGradientTex&&(e.deleteTexture(this.collisionGradientTex),this.collisionGradientTex=null),this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC),e.deleteBuffer(this.quadVbo);for(const r of[this.progJulia,this.progMotion,this.progAddForce,this.progInjectDye,this.progAdvect,this.progDivergence,this.progCurl,this.progVorticity,this.progPressure,this.progGradSub,this.progSplat,this.progDisplay,this.progClear,this.progReproject,this.progMask,this.progTsaaBlend,this.progBloomExtract,this.progBloomDown,this.progBloomUp])r!=null&&r.prog&&e.deleteProgram(r.prog);this.blueNoise&&(e.deleteTexture(this.blueNoise.texture),this.blueNoise=null),this.resetAccumUnsub&&(this.resetAccumUnsub(),this.resetAccumUnsub=null)}canvasToFractal(e,r){const t=this.canvas.getBoundingClientRect(),o=(e-t.left)/t.width,n=1-(r-t.top)/t.height,a=this.canvas.width/this.canvas.height,s=(o*2-1)*a*this.params.zoom+this.params.center[0],c=(n*2-1)*this.params.zoom+this.params.center[1];return[s,c]}canvasToUv(e,r){const t=this.canvas.getBoundingClientRect();return[(e-t.left)/t.width,1-(r-t.top)/t.height]}}function gr(i){switch(i){case"gradient":return 0;case"curl":return 1;case"iterate":return 2;case"c-track":return 3;case"hue":return 4}}function vr(i){switch(i){case"composite":return 0;case"julia":return 1;case"dye":return 2;case"velocity":return 3}}const Re=()=>{var e,r,t;const i=M.getState().brush??{};return{mode:ke(i.mode),colorMode:_e(i.colorMode),solidColor:[((e=i.solidColor)==null?void 0:e.x)??1,((r=i.solidColor)==null?void 0:r.y)??1,((t=i.solidColor)==null?void 0:t.z)??1],gradientLut:G.ref.current.gradientLut,size:i.size??.1,hardness:i.hardness??0,strength:i.strength??1,flow:i.flow??50,spacing:i.spacing??.005,jitter:i.jitter??0,particleEmitter:!!i.particleEmitter,particleRate:i.particleRate??120,particleVelocity:i.particleVelocity??.3,particleSpread:i.particleSpread??.35,particleGravity:i.particleGravity??0,particleDrag:i.particleDrag??.6,particleLifetime:i.particleLifetime??1.2,particleSizeScale:i.particleSizeScale??.35}},z={b:!1,c:!1},q=(i,e)=>i?sr:e?nr:1,xr=({canvasRef:i,engineRef:e})=>{const r=D.useRef({mode:"idle",pointerId:-1,lastX:0,lastY:0,lastT:0,startX:0,startY:0,startCx:0,startCy:0,startZoom:1,zoomAnchorX:0,zoomAnchorY:0,zoomAnchorU:.5,zoomAnchorV:.5,rightDragged:!1,startBrushSize:.15}),t=M(a=>a.handleInteractionStart),o=M(a=>a.handleInteractionEnd),n=M(a=>a.openContextMenu);return D.useEffect(()=>{const a=()=>{const d=document.activeElement;if(!d)return!1;const u=d.tagName;return u==="INPUT"||u==="TEXTAREA"||d.isContentEditable},s=d=>{a()||(d.code==="KeyB"&&(z.b=!0),d.code==="KeyC"&&(z.c=!0))},c=d=>{d.code==="KeyB"&&(z.b=!1),d.code==="KeyC"&&(z.c=!1)},h=()=>{z.b=!1,z.c=!1};return window.addEventListener("keydown",s),window.addEventListener("keyup",c),window.addEventListener("blur",h),()=>{window.removeEventListener("keydown",s),window.removeEventListener("keyup",c),window.removeEventListener("blur",h)}},[]),D.useEffect(()=>{const a=i.current;if(!a)return;const s=c=>{var f,C,v,g,m;c.preventDefault();const h=r.current;if(h.rightDragged){h.rightDragged=!1;return}const d=M.getState(),u=(f=d.julia)==null?void 0:f.juliaC,l=!!((C=d.coupling)!=null&&C.orbitEnabled),b=!!((v=d.fluidSim)!=null&&v.paused),w=[{label:`Copy Julia c (${((g=u==null?void 0:u.x)==null?void 0:g.toFixed(3))??"?"}, ${((m=u==null?void 0:u.y)==null?void 0:m.toFixed(3))??"?"})`,action:()=>{var T;if(!u)return;const x=`${u.x.toFixed(6)}, ${u.y.toFixed(6)}`;(T=navigator.clipboard)==null||T.writeText(x).catch(()=>{})}},{label:b?"Resume Sim":"Pause Sim",action:()=>{d.setFluidSim({paused:!b})}},{label:l?"Stop Auto Orbit":"Start Auto Orbit",action:()=>{d.setCoupling({orbitEnabled:!l})}},{label:"Recenter View",action:()=>{d.setJulia({center:{x:0,y:0},zoom:1.5})}},{label:"Reset Fluid Fields",action:()=>{var x;(x=e.current)==null||x.resetFluid()}}];n(c.clientX,c.clientY,w,["ui.fluid-canvas"])};return a.addEventListener("contextmenu",s),()=>a.removeEventListener("contextmenu",s)},[i,e,n]),D.useEffect(()=>{const a=i.current;if(!a)return;const s=u=>{var b,w,f,C,v,g,m,x,T,R,S;const l=r.current;if(l.pointerId=u.pointerId,l.lastX=u.clientX,l.lastY=u.clientY,l.lastT=performance.now(),l.startX=u.clientX,l.startY=u.clientY,u.button===2){const F=M.getState();l.mode="pan-pending",l.startCx=((w=(b=F.julia)==null?void 0:b.center)==null?void 0:w.x)??0,l.startCy=((C=(f=F.julia)==null?void 0:f.center)==null?void 0:C.y)??0,l.rightDragged=!1,a.setPointerCapture(u.pointerId),t("camera");return}if(u.button===1){u.preventDefault();const F=a.getBoundingClientRect();if(F.width<1||F.height<1)return;const E=M.getState(),I=((v=E.julia)==null?void 0:v.center)??{x:0,y:0},j=((g=E.julia)==null?void 0:g.zoom)??1.5,k=(u.clientX-F.left)/F.width,U=1-(u.clientY-F.top)/F.height,V=F.width/F.height;l.mode="zoom",l.startZoom=j,l.zoomAnchorU=k,l.zoomAnchorV=U,l.zoomAnchorX=I.x+(k*2-1)*V*j,l.zoomAnchorY=I.y+(U*2-1)*j,a.setPointerCapture(u.pointerId),t("camera");return}if(u.button===0){a.setPointerCapture(u.pointerId);const F=M.getState();if(z.c){l.mode="pick-c",l.startCx=((x=(m=F.julia)==null?void 0:m.juliaC)==null?void 0:x.x)??0,l.startCy=((R=(T=F.julia)==null?void 0:T.juliaC)==null?void 0:R.y)??0,t("param");return}if(z.b){l.mode="resize-brush",l.startBrushSize=((S=F.brush)==null?void 0:S.size)??.15,t("param");return}l.mode="splat",t("param"),Ti(G.ref.current.runtime),X.ref.current.dragging=!0;const E=a.getBoundingClientRect();if(E.width>=1&&E.height>=1&&e.current){const I=(u.clientX-E.left)/E.width,j=1-(u.clientY-E.top)/E.height;X.ref.current.uv={u:I,v:j},X.ref.current.velUv=null,Mi(G.ref.current.runtime,{u:I,v:j,dvx:0,dvy:0,params:Re(),engine:e.current,wallClockMs:performance.now()})}return}},c=u=>{var w,f;const l=r.current;if(l.mode==="idle")return;const b=a.getBoundingClientRect();if(!(b.width<1||b.height<1)){if(l.mode==="pick-c"){const C=M.getState(),v=((w=C.julia)==null?void 0:w.zoom)??1.5,g=b.width/b.height,m=q(u.shiftKey,u.altKey),x=u.clientX-l.startX,T=u.clientY-l.startY,R=x/b.width*2*g*v*m,S=-(T/b.height)*2*v*m;C.setJulia({juliaC:{x:l.startCx+R,y:l.startCy+S}}),l.lastX=u.clientX,l.lastY=u.clientY;return}if(l.mode==="resize-brush"){const C=M.getState(),v=q(u.shiftKey,u.altKey),g=u.clientX-l.startX,m=Math.exp(g*.0033*v),x=Math.max(.003,Math.min(.4,l.startBrushSize*m));C.setBrush({size:x}),l.lastX=u.clientX,l.lastY=u.clientY;return}if(l.mode==="pan-pending")if(Math.hypot(u.clientX-l.startX,u.clientY-l.startY)>rr)l.mode="pan",l.rightDragged=!0;else return;if(l.mode==="pan"){const C=M.getState(),v=((f=C.julia)==null?void 0:f.zoom)??1.5,g=b.width/b.height,m=q(u.shiftKey,u.altKey),x=u.clientX-l.startX,T=u.clientY-l.startY,R=-(x/b.width)*2*g*v*m,S=T/b.height*2*v*m;C.setJulia({center:{x:l.startCx+R,y:l.startCy+S}}),l.lastX=u.clientX,l.lastY=u.clientY;return}if(l.mode==="zoom"){const C=M.getState(),v=q(u.shiftKey,u.altKey),g=u.clientY-l.startY,m=Math.exp(g*ar*v),x=Math.max(we,Math.min(Ce,l.startZoom*m)),T=b.width/b.height,R=l.zoomAnchorX-(l.zoomAnchorU*2-1)*T*x,S=l.zoomAnchorY-(l.zoomAnchorV*2-1)*x;C.setJulia({center:{x:R,y:S},zoom:x}),l.lastX=u.clientX,l.lastY=u.clientY;return}if(l.mode==="splat"){const C=e.current;if(!C)return;const v=performance.now(),g=Math.max(.001,(v-l.lastT)/1e3),m=u.clientX-l.lastX,x=u.clientY-l.lastY,T=(u.clientX-b.left)/b.width,R=1-(u.clientY-b.top)/b.height,S=m/b.width/g,F=-(x/b.height)/g,E=Math.hypot(m/b.width,x/b.height);G.ref.current.runtime.distSinceSplat+=E,X.ref.current.uv={u:T,v:R},X.ref.current.velUv={vx:S,vy:F},yi(G.ref.current.runtime,{u:T,v:R,dvx:S,dvy:F,params:Re(),engine:C,wallClockMs:v}),l.lastX=u.clientX,l.lastY=u.clientY,l.lastT=v;return}}},h=u=>{const l=r.current;if(l.pointerId===u.pointerId){try{a.releasePointerCapture(u.pointerId)}catch{}l.pointerId=-1}l.mode="idle",X.ref.current.dragging=!1,o()},d=u=>{var I,j;u.preventDefault();const l=a.getBoundingClientRect();if(l.width<1||l.height<1)return;const b=M.getState(),w=((I=b.julia)==null?void 0:I.center)??{x:0,y:0},f=((j=b.julia)==null?void 0:j.zoom)??1.5,C=q(u.shiftKey,u.altKey),v=Math.pow(.9,-u.deltaY*or*C),g=(u.clientX-l.left)/l.width,m=1-(u.clientY-l.top)/l.height,x=l.width/l.height,T=w.x+(g*2-1)*x*f,R=w.y+(m*2-1)*f,S=Math.max(we,Math.min(Ce,f*v)),F=T-(g*2-1)*x*S,E=R-(m*2-1)*S;b.setJulia({center:{x:F,y:E},zoom:S})};return a.addEventListener("pointerdown",s),a.addEventListener("pointermove",c),a.addEventListener("pointerup",h),a.addEventListener("pointercancel",h),a.addEventListener("pointerleave",h),a.addEventListener("wheel",d,{passive:!1}),()=>{a.removeEventListener("pointerdown",s),a.removeEventListener("pointermove",c),a.removeEventListener("pointerup",h),a.removeEventListener("pointercancel",h),a.removeEventListener("pointerleave",h),a.removeEventListener("wheel",d)}},[i,e,t,o]),null},br=i=>{$.register({id:"fluid-toy.pause",key:"Space",description:"Pause / resume the fluid simulation",category:"Playback",handler:()=>{var r;const e=M.getState();e.setFluidSim({paused:!((r=e.fluidSim)!=null&&r.paused)})}}),$.register({id:"fluid-toy.reset",key:"R",description:"Reset fluid fields (dye + velocity → zero)",category:"Playback",handler:()=>{var e;(e=i.current)==null||e.resetFluid()}}),$.register({id:"fluid-toy.orbit-toggle",key:"O",description:"Toggle Julia-c auto-orbit",category:"Simulation",handler:()=>{var r;const e=M.getState();e.setCoupling({orbitEnabled:!((r=e.coupling)!=null&&r.orbitEnabled)})}}),$.register({id:"fluid-toy.home",key:"Home",description:"Recenter view (center=[0,0], zoom=1.5)",category:"View",handler:()=>{M.getState().setJulia({center:{x:0,y:0},zoom:1.5})}})},J=i=>M(e=>e[i]),yr=()=>{var e,r,t;const i=M.getState().brush??{};return{mode:ke(i.mode),colorMode:_e(i.colorMode),solidColor:[((e=i.solidColor)==null?void 0:e.x)??1,((r=i.solidColor)==null?void 0:r.y)??1,((t=i.solidColor)==null?void 0:t.z)??1],gradientLut:G.ref.current.gradientLut,size:i.size??.15,hardness:i.hardness??0,strength:i.strength??1,flow:i.flow??50,spacing:i.spacing??.005,jitter:i.jitter??0,particleEmitter:!!i.particleEmitter,particleRate:i.particleRate??120,particleVelocity:i.particleVelocity??.3,particleSpread:i.particleSpread??.35,particleGravity:i.particleGravity??0,particleDrag:i.particleDrag??.6,particleLifetime:i.particleLifetime??1.2,particleSizeScale:i.particleSizeScale??.35}},Mr=()=>{const i=_.getViewportOverlays().filter(r=>r.type==="dom"),e=M();return p.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:i.map(r=>{const t=te.get(r.componentId),o=e[r.id];return t&&o?p.jsx(t,{featureId:r.id,sliceState:o,actions:e},r.id):null})})},Tr=()=>{const i=M(),e=D.useRef(null),r=D.useRef(null),t=D.useRef(null),o=Object.values(i.panels).filter(m=>m.location==="float"&&m.isOpen),n=D.useMemo(()=>({handleInteractionStart:i.handleInteractionStart,handleInteractionEnd:i.handleInteractionEnd,openContextMenu:i.openContextMenu}),[i.handleInteractionStart,i.handleInteractionEnd,i.openContextMenu]),a=M(m=>m.canvasPixelSize),s=Ae();nt();const c=J("julia"),h=J("coupling"),d=J("palette"),u=J("collision"),l=J("fluidSim"),b=J("postFx"),w=J("composite"),f=M(m=>m.accumulation),C=M(m=>m.sampleCap),v=M(m=>m.isPaused),g=M(m=>m.liveModulations??{});return D.useEffect(()=>{const m=e.current;if(m){try{const x=new hr(m,{onFrameEnd:()=>lt.frameTick()});r.current=x,ne.ref.current=x;let T=-1;const R=S=>{const F=T<0?0:Math.min(.1,(S-T)/1e3);if(T=S,r.current){const E=X.ref.current;bi(G.ref.current.runtime,{dtSec:F,wallClockMs:S,dragging:E.dragging,cursorUv:E.uv,cursorVelUv:E.velUv,params:yr(),engine:r.current}),r.current.frame(S)}t.current=requestAnimationFrame(R)};t.current=requestAnimationFrame(R)}catch(x){console.error("[FluidToy] failed to start engine:",x)}return br(r),()=>{var x;t.current!==null&&cancelAnimationFrame(t.current),(x=r.current)==null||x.dispose(),r.current=null,ne.ref.current=null}}},[]),D.useEffect(()=>{var E,I;const m=r.current;if(!m||!c)return;const x=((E=c.juliaC)==null?void 0:E.x)??0,T=((I=c.juliaC)==null?void 0:I.y)??0,R=g["julia.juliaC_x"]??x,S=g["julia.juliaC_y"]??T,F=c.center??{x:0,y:0};m.setParams({kind:Pt(c.kind),juliaC:[R,S],maxIter:c.maxIter??310,power:c.power??2,center:[F.x??0,F.y??0],zoom:c.zoom??1.5})},[c,g]),D.useEffect(()=>{var E,I,j,k;const m=r.current;if(!m||!d)return;const x=((E=d.trapNormal)==null?void 0:E.x)??1,T=((I=d.trapNormal)==null?void 0:I.y)??0,R=Math.hypot(x,T),S=R>1e-6?[x/R,T/R]:[1,0],F=d.interiorColor??{x:.02,y:.02,z:.04};if(m.setParams({colorMapping:Ht(d.colorMapping),colorIter:d.colorIter??310,escapeR:d.escapeR??32,interiorColor:[F.x??.02,F.y??.02,F.z??.04],trapCenter:[((j=d.trapCenter)==null?void 0:j.x)??0,((k=d.trapCenter)==null?void 0:k.y)??0],trapRadius:d.trapRadius??1,trapNormal:S,trapOffset:d.trapOffset??0,stripeFreq:d.stripeFreq??4,dyeBlend:zt(d.dyeBlend),gradientRepeat:d.gradientRepeat??1,gradientPhase:d.gradientPhase??0}),d.gradient){const U=ve(d.gradient);m.setGradientBuffer(U),G.ref.current.gradientLut=U}},[d]),D.useEffect(()=>{const m=r.current;if(!(!m||!u)&&(m.setParams({collisionEnabled:!!u.enabled,collisionPreview:!!u.preview,collisionRepeat:u.repeat??1,collisionPhase:u.phase??0}),u.gradient)){const x=ve(u.gradient);m.setCollisionGradientBuffer(x)}},[u]),D.useEffect(()=>{const m=r.current;!m||!l||!h||m.setParams({simResolution:Math.max(64,Math.floor((l.simResolution??1344)*s)),vorticity:l.vorticity??22.1,vorticityScale:l.vorticityScale??1,pressureIters:l.pressureIters??50,dissipation:l.dissipation??.17,paused:!!l.paused,dt:l.dt??.016,dyeInject:l.dyeInject??8,dyeDecayMode:Vt(l.dyeDecayMode),dyeDissipation:l.dyeDissipation??1.03,dyeChromaDecayHz:l.dyeChromaDecayHz??1.03,dyeSaturationBoost:l.dyeSaturationBoost??1,forceMode:kt(h.forceMode),forceGain:h.forceGain??-1200,interiorDamp:h.interiorDamp??.59,forceCap:h.forceCap??40,edgeMargin:h.edgeMargin??.04,autoQuality:!1})},[l,h,s]),D.useEffect(()=>{const m=r.current;!m||!b||m.setParams({fluidStyle:oi(b.fluidStyle),toneMapping:ii(b.toneMapping),exposure:b.exposure??1,vibrance:b.vibrance??1.645,bloomAmount:b.bloomAmount??0,bloomThreshold:b.bloomThreshold??.9,aberration:b.aberration??0,refraction:b.refraction??0,refractSmooth:b.refractSmooth??3,caustics:b.caustics??0})},[b]),D.useEffect(()=>{const m=r.current;!m||!w||m.setParams({show:ni(w.show),juliaMix:w.juliaMix??.4,dyeMix:w.dyeMix??2,velocityViz:w.velocityViz??.02})},[w]),D.useEffect(()=>{const m=r.current;m&&m.setParams({tsaa:f??!0,tsaaSampleCap:Math.max(1,C??64),paused:!!v})},[f,C,v]),D.useEffect(()=>{const m=r.current,[x,T]=a;if(!m||x<1||T<1)return;const R=window.devicePixelRatio||1,S=Math.max(1,Math.floor(x/R*s)),F=Math.max(1,Math.floor(T/R*s));m.resize(S,F)},[a,s]),p.jsx(Xe,{value:n,children:p.jsxs("div",{className:"fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col",children:[p.jsx($e,{}),p.jsx(Et,{}),p.jsx(We,{}),o.map(m=>p.jsx(qe,{id:m.id,title:m.id,children:p.jsx(Ke,{activeTab:m.id,state:i,actions:i,onSwitchTab:x=>i.togglePanel(x,!0)})},m.id)),p.jsx(ct,{}),p.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[p.jsx(xe,{side:"left"}),p.jsxs(ut,{className:"flex-1",children:[p.jsx("canvas",{ref:e,className:"absolute inset-0 w-full h-full block touch-none"}),p.jsx(xr,{canvasRef:e,engineRef:r}),p.jsx(bt,{}),p.jsx(Mr,{})]}),p.jsx(xe,{side:"right"})]}),p.jsx(Ye,{}),p.jsx(yt,{}),i.contextMenu.visible&&p.jsx(Ze,{x:i.contextMenu.x,y:i.contextMenu.y,items:i.contextMenu.items,targetHelpIds:i.contextMenu.targetHelpIds,onClose:i.closeContextMenu,onOpenHelp:i.openHelp})]})})},wr=[{id:"Fractal",dock:"right",order:0,active:!0,features:["julia"]},{id:"Coupling",dock:"right",order:1,features:["coupling"]},{id:"Fluid",dock:"right",order:2,features:["fluidSim"]},{id:"Brush",dock:"right",order:3,features:["brush"]},{id:"Palette",dock:"right",order:4,features:["palette"]},{id:"Post-FX",dock:"right",order:5,features:["postFx"]},{id:"Collision",dock:"right",order:6,features:["collision"]},{id:"Composite",dock:"right",order:7,features:["composite"]},{id:"Presets",dock:"right",order:8,features:["presets"]},{id:"Views",dock:"left",order:20,component:"panel-views",label:"View Manager"}],Cr=()=>Qe(wr),Rr=()=>{const i=Ae();return p.jsxs("span",{className:"text-[10px] text-white/40 font-mono pointer-events-none",children:["q",(i*100).toFixed(0),"%"]})},B=({children:i})=>p.jsx("span",{className:"inline-block px-1 py-px text-[9px] font-mono border border-white/20 rounded bg-white/10 text-white/90 mx-0.5",children:i}),Sr=()=>{const[i,e]=D.useState(!0);return i?p.jsxs("div",{className:"px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[360px] pointer-events-auto shadow-xl",children:[p.jsxs("div",{className:"flex items-center justify-between mb-1",children:[p.jsx("div",{className:"text-[10px] uppercase text-cyan-300 tracking-wide",children:"Hotkeys"}),p.jsx("button",{onClick:()=>e(!1),className:"text-gray-500 hover:text-gray-200 text-[12px] px-1 leading-none",title:"Hide (click ? to reopen)",children:"×"})]}),p.jsxs("ul",{className:"space-y-0.5 leading-snug",children:[p.jsxs("li",{children:[p.jsx(B,{children:"Drag"})," inject force + dye into the fluid"]}),p.jsxs("li",{children:[p.jsx(B,{children:"B"}),"+",p.jsx(B,{children:"Drag"})," resize the brush live (horizontal = scale)"]}),p.jsxs("li",{children:[p.jsx(B,{children:"C"}),"+",p.jsx(B,{children:"Drag"})," pick Julia c directly on the canvas"]}),p.jsxs("li",{children:[p.jsx(B,{children:"Right-click"}),"+",p.jsx(B,{children:"Drag"})," pan the fractal view"]}),p.jsxs("li",{children:[p.jsx(B,{children:"Right-click"})," (tap) canvas for quick actions menu"]}),p.jsxs("li",{children:[p.jsx(B,{children:"Shift"}),"/",p.jsx(B,{children:"Alt"})," precision modifiers (5× / 0.2×) for any drag"]}),p.jsxs("li",{children:[p.jsx(B,{children:"Wheel"})," zoom · ",p.jsx(B,{children:"Middle"}),"+",p.jsx(B,{children:"Drag"})," smooth zoom · ",p.jsx(B,{children:"Home"})," recenter"]}),p.jsxs("li",{children:[p.jsx(B,{children:"Space"})," pause sim · ",p.jsx(B,{children:"R"})," clear fluid · ",p.jsx(B,{children:"O"})," toggle c-orbit · ",p.jsx(B,{children:"H"})," hide hints"]})]})]}):p.jsx("button",{onClick:()=>e(!0),className:"px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70 pointer-events-auto",title:"Show hotkeys",children:"? hotkeys"})},Se="fluid-toy.orbit.juliaC.x",Fe="fluid-toy.orbit.juliaC.y";let De=null;const Ee=()=>{const i=M.getState(),e=i.coupling,r=i.animations??[],t=r.filter(h=>h.id!==Se&&h.id!==Fe);if(!(e!=null&&e.orbitEnabled)){t.length!==r.length&&i.setAnimations(t);return}const o=e.orbitRadius??.1,a=1/Math.max(.001,e.orbitSpeed??.25),s="Sine",c=[...t,{id:Se,target:"julia.juliaC_x",shape:s,period:a,phase:0,amplitude:o,smoothing:0,enabled:!0},{id:Fe,target:"julia.juliaC_y",shape:s,period:a,phase:.25,amplitude:o,smoothing:0,enabled:!0}];i.setAnimations(c)},Fr=()=>{De||(Ee(),De=M.subscribe(i=>i.coupling,Ee))},Dr=i=>i===!1?null:i===!0||i===void 0?{}:i;function Er(i){Mt(i);const e=Dr(i.slotShortcuts);e&&Ar(i,e),i.menu&&Ir(i,i.menu)}function Ar(i,e){const r=e.count??9,t=e.category??"Camera",o=e.saveModifier??"Mod",n=e.savePrefix??"Save to slot",a=e.recallPrefix??"Recall slot",s=i.actions.saveToSlot;for(let c=1;c<=r;c++){const h=c-1;$.register({id:`${s}.save.${c}`,key:`${o}+${c}`,description:`${n} ${c}`,category:t,handler:()=>{const d=M.getState()[i.actions.saveToSlot];d==null||d(h)}}),$.register({id:`${s}.recall.${c}`,key:`${c}`,description:`${a} ${c}`,category:t,handler:()=>{const d=M.getState()[i.arrayKey],u=d==null?void 0:d[h];if(!u)return;const l=M.getState()[i.actions.select];l==null||l(u.id)}})}}function Ir(i,e){var r;if(W.register({id:e.menuId,slot:e.slot,order:e.order,icon:e.icon,title:e.title,label:e.label,align:e.align,width:e.width}),e.openItem!==null){const t=e.openItem??{id:`${e.menuId}-open`,label:`${i.panelId}…`};W.registerItem(e.menuId,{id:t.id??`${e.menuId}-open`,type:"button",label:t.label,title:t.title,onSelect:()=>{var o,n;(n=(o=M.getState()).togglePanel)==null||n.call(o,i.panelId,!0)}})}if(e.resetItem!==null&&e.resetItem!==void 0&&W.registerItem(e.menuId,{id:e.resetItem.id??`${e.menuId}-reset`,type:"button",label:e.resetItem.label,title:e.resetItem.title,onSelect:()=>{const t=M.getState()[i.actions.reset];t==null||t()}}),e.slotItems!==!1){W.registerItem(e.menuId,{id:`${e.menuId}-sep-slots`,type:"separator"});const t=e.slotLabelPrefix??"Slot",o=typeof i.slotShortcuts=="object"&&((r=i.slotShortcuts)==null?void 0:r.count)||9;for(let n=1;n<=o;n++){const a=n-1;W.registerItem(e.menuId,{id:`${e.menuId}-slot-${n}`,type:"button",label:`${t} ${n}`,shortcut:`${n}`,title:`Click to recall • Ctrl+${n} saves`,onSelect:()=>{const s=M.getState()[i.arrayKey],c=s==null?void 0:s[a];if(c){const h=M.getState()[i.actions.select];h==null||h(c.id)}else{const h=M.getState()[i.actions.saveToSlot];h==null||h(a)}}})}}}const Oe=()=>{const i=M.getState().julia;return{kind:i.kind,juliaC:{...i.juliaC},center:{...i.center},zoom:i.zoom,maxIter:i.maxIter,power:i.power}},Pr=i=>{const e=M.getState().setJulia;e&&e(i)},jr=i=>{const e=Oe();return e.kind!==i.kind||e.maxIter!==i.maxIter||e.power!==i.power||Math.abs(e.zoom-i.zoom)>1e-5||Math.abs(e.center.x-i.center.x)+Math.abs(e.center.y-i.center.y)>1e-4||Math.abs(e.juliaC.x-i.juliaC.x)+Math.abs(e.juliaC.y-i.juliaC.y)>1e-4},Br=async()=>{try{const i=document.querySelector("canvas");if(!i)return;const e=128,r=document.createElement("canvas");r.width=e,r.height=e;const t=r.getContext("2d");if(!t)return;const o=Math.min(i.width,i.height),n=(i.width-o)/2,a=(i.height-o)/2;return t.drawImage(i,n,a,o,o,0,0,e,e),r.toDataURL("image/jpeg",.7)}catch{return}},kr=()=>{const i=M.getState().setJulia;i&&i({center:{x:0,y:0},zoom:1.5})},Ur=()=>{Er({panelId:"Views",arrayKey:"savedViews",activeIdKey:"activeViewId",actions:{add:"addView",update:"updateView",delete:"deleteView",duplicate:"duplicateView",select:"selectView",reorder:"reorderViews",saveToSlot:"saveViewToSlot",reset:"resetView"},defaultLabelPrefix:"View",capture:Oe,apply:Pr,isModified:jr,captureThumbnail:Br,onReset:kr,slotShortcuts:{count:9,category:"Views"},menu:{menuId:"camera",slot:"right",order:29,icon:et,title:"Camera",align:"end",width:"w-48",openItem:{label:"View Manager…",title:"Open the saved-views library"},resetItem:{label:"Reset View",title:"Reset to default fractal view"},slotLabelPrefix:"View"}})},_r=({activeIdKey:i,featureIds:e,label:r="Active",groupFilter:t,excludeParams:o,whitelistParams:n,onDeselect:a,inactiveLabel:s=null})=>{const c=M(h=>h[i]);return!c&&s===null?null:p.jsxs("div",{className:"border-t border-white/10 bg-black/40 p-2 space-y-2",children:[p.jsxs("div",{className:"flex items-center justify-between",children:[p.jsx(tt,{children:c?r:s??""}),c&&a&&p.jsx("button",{type:"button",onClick:a,className:"text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors",children:"Deselect"})]}),c&&e.map(h=>p.jsx("div",{className:"bg-white/5 rounded p-1",children:p.jsx(it,{featureId:h,groupFilter:t,excludeParams:o,whitelistParams:n})},h))]})},Or=()=>{const i=M(f=>f.savedViews??[]),e=M(f=>f.activeViewId),r=M(f=>f.addView),t=M(f=>f.updateView),o=M(f=>f.deleteView),n=M(f=>f.duplicateView),a=M(f=>f.selectView),s=M(f=>f.reorderViews),c=M(f=>f.resetView);M(f=>f.julia);const h=D.useCallback(async()=>{await(r==null?void 0:r())},[r]),d=D.useCallback((f,C)=>t==null?void 0:t(f,{label:C}),[t]),u=D.useCallback(f=>t==null?void 0:t(f),[t]),l=D.useCallback(()=>c==null?void 0:c(),[c]),b=D.useCallback(f=>{const C=M.getState()._viewIsModified;if(C)return C(f.state);const v=M.getState().julia,g=f.state;return v.kind!==g.kind||v.maxIter!==g.maxIter||v.power!==g.power||Math.abs(v.zoom-g.zoom)>1e-5||Math.abs(v.center.x-g.center.x)+Math.abs(v.center.y-g.center.y)>1e-4||Math.abs(v.juliaC.x-g.juliaC.x)+Math.abs(v.juliaC.y-g.juliaC.y)>1e-4},[]),w=D.useMemo(()=>{const f=M.getState().setJulia,C=m=>{var T;const x=((T=M.getState().julia)==null?void 0:T.center)??{x:0,y:0};f==null||f({center:{x:x.x,y:x.y},zoom:m})},v=ae.indexOf("mandelbrot"),g=ae.indexOf("julia");return[{id:"reset",label:"RESET",onSelect:()=>l(),title:"Reset view to defaults"},{id:"home",label:"HOME",onSelect:()=>f==null?void 0:f({center:{x:0,y:0}}),title:"Center to (0, 0); keep zoom"},{id:"1x",label:"1:1",onSelect:()=>C(1),title:"Zoom 1×"},{id:"wide",label:"WIDE",onSelect:()=>C(.5),title:"Zoom out"},{id:"mand",label:"MAND",onSelect:()=>f==null?void 0:f({kind:v>=0?v:1}),title:"Switch to Mandelbrot kind"},{id:"julia",label:"JULIA",onSelect:()=>f==null?void 0:f({kind:g>=0?g:0}),title:"Switch to Julia kind"}]},[l]);return r?p.jsx(Tt,{className:"flex flex-col bg-[#080808] -m-3",snapshots:i,activeId:e,onSelect:a,onRename:d,onUpdate:u,onDuplicate:n,onDelete:o,onReorder:s,isModified:b,emptyState:"No saved views — pan, zoom, tweak, then click New View",slotHintPrefix:null,presets:w,presetGridCols:3,toolbarBefore:p.jsx("div",{className:"px-2 pb-2 bg-black/40 border-b border-white/10",children:p.jsxs("button",{type:"button",onClick:h,className:"w-full bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1",children:[p.jsx(rt,{})," New View"]})}),footer:p.jsxs(p.Fragment,{children:[p.jsx(_r,{activeIdKey:"activeViewId",featureIds:["julia"],label:"Active View",onDeselect:()=>a==null?void 0:a(null)}),p.jsx("div",{className:"border-t border-white/10 bg-black/40 p-2",children:p.jsx(wt,{})})]})}):p.jsx("div",{className:"p-4 text-[10px] text-gray-600 italic",children:"View library not initialized."})};ot();dt({enabled:!0,alwaysActive:!0,targetFps:45,minQuality:.4,interactionDownsample:.5,activityGraceMs:100});pt();Ct();mt({getCanvas:()=>document.querySelector("canvas")});At(["julia.center_x","julia.center_y","julia.zoom"]);Rt();at();ft();ht({hideShortcuts:!0});gt.register({featureId:"julia",captureState:()=>{var e,r;const i=M.getState();return{center:{...(e=i.julia)==null?void 0:e.center},zoom:(r=i.julia)==null?void 0:r.zoom}},applyState:i=>{M.getState().setJulia({center:i.center,zoom:i.zoom})}});vt();St();Ft.registerHudHint({id:"fluid-toy-controls",slot:"bottom-left",order:0,component:Sr});Dt.register({id:"fluid-toy.quality",slot:"bottom-left",order:10,component:Rr});Fr();Ur();te.register("panel-views",Or);Cr();const Le=document.getElementById("root");if(!Le)throw new Error("Could not find root element to mount to");const Lr=xt.createRoot(Le);Lr.render(p.jsx(st.StrictMode,{children:p.jsx(Tr,{})}));
