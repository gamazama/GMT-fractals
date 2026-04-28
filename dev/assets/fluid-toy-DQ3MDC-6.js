var mt=Object.defineProperty;var gt=(i,e,r)=>e in i?mt(i,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):i[e]=r;var m=(i,e,r)=>gt(i,typeof e!="symbol"?e+"":e,r);import{U as ot,i as Me,f as H,V as xt,W as bt,X as z,u as v,r as me,N as vt,M as at,O as yt,S as Tt,E as wt,D as Mt,l as Ct,P as At,T as Rt,n as Xe,o as Et,G as St,q as Ft,Y as Dt,Z as jt,_ as Lt,$ as Pt,t as It,Q as kt,v as _t,w as zt,x as Bt,y as Ot,R as Ut}from"./Undo-ZT1vKsQw.js";import{r as C,j as d,R as Gt}from"./three-fiber-OZZ-CFAc.js";import{V as Nt,i as Vt,c as Jt}from"./Camera-17nA4u8f.js";import{c as Ht}from"./three-drei-B0ZqTV5-.js";import{R as Xt,H as Zt,a as Wt,b as Kt,i as qt,h as $t,c as Yt}from"./modulationTick-D3RA67sE.js";import{a as W,u as Qt}from"./typedSlices-Cbvk9wU-.js";import{i as ei,S as ti,C as ii,a as ri}from"./CompositionOverlayControls-D1pJBRVm.js";import{r as oi}from"./cameraKeyRegistry-RijtvO-I.js";import"./three-CAXFefdI.js";import"./pako-DwGzBETv.js";import"./ModulationEngine-VqzgNlCN.js";const ai=i=>i.charAt(0).toUpperCase()+i.slice(1).replace(/-/g," "),X=(i,e,r={})=>{const t=r.defaultIndex??0,o=i.map((n,l)=>{var u;return{label:((u=r.optionLabels)==null?void 0:u[n])??ai(n),value:l}});return{config:{type:"float",default:t,label:e,options:o,...r.extra},fromIndex:n=>{const l=Math.floor(n??t);return l<0||l>=i.length||Number.isNaN(l)?i[t]:i[l]},values:i}},ke=X(["julia","mandelbrot"],"Fractal Kind",{defaultIndex:1}),je=ke.values,si=ke.fromIndex,ni={id:"julia",name:"Fractal",category:"Fractal",tabConfig:{label:"Fractal"},customUI:[{componentId:"julia-c-picker",parentId:"juliaC",condition:{param:"kind",eq:0}}],params:{kind:ke.config,juliaC:{type:"vec2",default:{x:-.36303304426511473,y:.16845183018751916},min:-2,max:2,step:.001,label:"Julia c",description:"Julia constant. Move me to reshape the entire fractal — and the forces it emits."},zoom:{type:"float",default:1.2904749020480561,min:1e-5,max:8,step:1e-4,scale:"log",label:"Zoom",description:"Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001)."},center:{type:"vec2",default:{x:-.8139175130270945,y:-.054649908357858296},min:-2,max:2,step:.01,label:"Center",description:"Pan the fractal window."},centerLow:{type:"vec2",default:{x:0,y:0},min:-1,max:1,step:1e-12,label:"Center (low bits)",description:"Internal — sub-f64 pan accumulator.",hidden:!0},maxIter:{type:"int",default:310,min:16,max:512,step:1,label:"Iter",description:"More iterations → sharper escape gradients → finer force detail."},power:{type:"float",default:2,min:2,max:8,step:1,label:"Power",description:"z-power in the iteration. 2 = classic z²+c; higher exponents make more lobes."}}},li=(i,e,r)=>{var n,l;const t=e.juliaC.x,o=e.juliaC.y,a=r["julia.juliaC_x"]??t,s=r["julia.juliaC_y"]??o;i.setParams({kind:si(e.kind),juliaC:[a,s],maxIter:e.maxIter,power:e.power,center:[e.center.x,e.center.y],centerLow:[((n=e.centerLow)==null?void 0:n.x)??0,((l=e.centerLow)==null?void 0:l.y)??0],zoom:e.zoom})},ci={id:"deepZoom",name:"Deep Zoom",category:"Fractal",tabConfig:{label:"Deep Zoom"},params:{enabled:{type:"boolean",default:!1,label:"Enable deep zoom",description:"Master toggle. Switches the iteration kernel to perturbation + LA, unlocking zoom past 1e-5 (eventually past 1e-300). Off by default — costs nothing when off."},useLA:{type:"boolean",default:!0,label:"Use Linear Approximation",condition:{param:"enabled",bool:!0},description:"Skip iterations via the LA stage table. 10–100× faster at depth. Off = pure perturbation (slow, but useful for sanity-checking LA output)."},useAT:{type:"boolean",default:!0,label:"Use AT front-load",condition:{param:"enabled",bool:!0},description:"Fast-forward the front of the orbit via Approximation Terms (a single z²+c loop in plain f32). Free perf when applicable. No effect when LA is off."},maxRefIter:{type:"int",default:5e4,min:5e3,max:5e5,step:1e3,label:"Reference orbit length",condition:{param:"enabled",bool:!0},description:"Maximum iterations the high-precision reference orbit runs to. Higher = supports deeper zooms but costs CPU at build time and GPU memory at runtime. Auto-suggested per zoom depth in later phases."},deepMaxIter:{type:"int",default:2e3,min:200,max:5e4,step:100,label:"Iter (deep)",condition:{param:"enabled",bool:!0},description:"Maximum iterations per pixel when deep zoom is on. Overrides the Fractal-tab Iter slider while deep is enabled. Without LA every iteration costs the full HDR step — push gently until phase 6 (LA runtime) lands."},showStats:{type:"boolean",default:!1,label:"Show stats",condition:{param:"enabled",bool:!0},description:"Overlay reference-orbit length, LA stage count, table size, and build time. Diagnostic."},disableFluid:{type:"boolean",default:!1,label:"Disable fluid sim (debug)",condition:{param:"enabled",bool:!0},description:"Skip every fluid pass (motion, advect, pressure, dye decay) so render time reflects the fractal kernel only. Use to isolate deep-zoom perf from fluid sim cost."}}},ui=(i,e,r)=>{e.enabled?(i.setParams({deepZoomEnabled:!0,maxIter:e.deepMaxIter}),i.setForceFluidPaused(e.disableFluid)):(i.setParams({deepZoomEnabled:!1,maxIter:r.maxIter}),i.clearReferenceOrbit(),i.clearLATable(),i.setLAEnabled(!1),i.clearAT(),i.setForceFluidPaused(!1))},_e=X(["gradient","curl","iterate","c-track","hue"],"Force Mode",{optionLabels:{"c-track":"C-Track"}}),di=_e.values,pi=_e.fromIndex,fi="How fractal pixels become velocity at each cell. Gradient pushes AWAY from the set. Curl swirls along level sets. Iterate follows z's orbit grain. C-Track reacts to Δc in real time. Hue makes the picture itself the velocity field.",hi={id:"coupling",name:"Coupling",category:"Simulation",tabConfig:{label:"Coupling"},params:{forceMode:{..._e.config,description:fi},forceGain:{type:"float",default:-1200,min:-2e3,max:2e3,step:.1,label:"Force gain",description:"Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid. Negative inverts the force direction."},interiorDamp:{type:"float",default:.59,min:0,max:1,step:.01,label:"Interior damp",description:"How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed."},forceCap:{type:"float",default:40,min:1,max:40,step:.5,label:"Force cap",description:"Per-pixel cap on the fractal force magnitude."},edgeMargin:{type:"float",default:.04,min:0,max:.25,step:.005,label:"Edge margin",description:'Fades force / dye injection near the canvas edges. Fixes "gushing from the borders" under fast c-changes.'},orbitEnabled:{type:"boolean",default:!1,label:"Auto-orbit c",description:"Circles c automatically around its current value. Pair with C-Track to watch the fluid breathe with the fractal's deformation."},orbitRadius:{type:"float",default:.08,min:0,max:.5,step:.001,label:"Radius",condition:{param:"orbitEnabled",bool:!0},description:"Distance c travels from its base position as the orbit circles."},orbitSpeed:{type:"float",default:.25,min:0,max:3,step:.01,label:"Speed",condition:{param:"orbitEnabled",bool:!0},description:"Orbit rate in Hz. 1 = one full circle per second."}}};function ze(i,e){const r=e,t={current:e},o=new Set;let a=0;const s=y=>(o.add(y),()=>{o.delete(y)}),n=()=>{a++,o.forEach(y=>y())};return{name:i,ref:t,useSnapshot:()=>(C.useSyncExternalStore(s,()=>a,()=>a),t.current),subscribe:s,notify:n,reset:()=>{t.current=r,n()}}}const ge=Math.PI*2,Ee=(i,e,r)=>(r<0&&(r+=1),r>1&&(r-=1),r<1/6?i+(e-i)*6*r:r<1/2?e:r<2/3?i+(e-i)*(2/3-r)*6:i),st=(i,e,r)=>{if(e===0)return[r,r,r];const t=r<.5?r*(1+e):r+e-r*e,o=2*r-t;return[Ee(o,t,i+1/3),Ee(o,t,i),Ee(o,t,i-1/3)]},mi=(i,e,r)=>{const t=Math.max(i,e,r),o=Math.min(i,e,r),a=(t+o)/2;if(t===o)return[0,0,a];const s=t-o,n=a>.5?s/(2-t-o):s/(t+o);let l;return t===i?l=(e-r)/s+(e<r?6:0):t===e?l=(r-i)/s+2:l=(i-e)/s+4,[l/6,n,a]},gi=(i,e)=>{if(e<=0)return i;const[r,t,o]=mi(i[0],i[1],i[2]),a=(r+(Math.random()-.5)*e+1)%1;return st(a,t,o)},xi=(i,e)=>{if(!i||i.length<4)return[1,1,1];const r=(e%1+1)%1,t=i.length/4,o=Math.min(t-1,Math.floor(r*t))*4;return[i[o]/255,i[o+1]/255,i[o+2]/255]},nt=i=>{let e;switch(i.mode){case"solid":e=[i.solidColor[0],i.solidColor[1],i.solidColor[2]];break;case"gradient":e=xi(i.gradientLut,(i.u+i.v)*.5);break;case"velocity":{const r=Math.min(1,Math.hypot(i.vx,i.vy)*.2),t=(Math.atan2(i.vy,i.vx)/ge+1)%1;e=st(t,.9,.35+.3*r);break}case"rainbow":default:{const r=i.rainbowPhase;e=[.5+.5*Math.cos(ge*r),.5+.5*Math.cos(ge*(r+.33)),.5+.5*Math.cos(ge*(r+.67))];break}}return gi(e,i.jitter)},Le=300,bi=(i,e)=>{if(i.length>=Le)return;const t=Math.atan2(e.dirY,e.dirX)+(Math.random()-.5)*2*e.particleSpread*Math.PI,o=e.particleVelocity*(.4+Math.random()*.6),a=e.brushSize*.35;i.push({x:e.u+(Math.random()-.5)*a,y:e.v+(Math.random()-.5)*a,vx:Math.cos(t)*o,vy:Math.sin(t)*o,life:e.particleLifetime,lifeMax:e.particleLifetime,color:[e.color[0],e.color[1],e.color[2]],size:e.brushSize*e.particleSizeScale*(.85+Math.random()*.3)})},vi=(i,e,r,t)=>{const o=2*(i*r+e*t);return[i-o*r,e-o*t]},yi=.5,Ti=(i,e)=>{const r=Math.exp(-e.particleDrag*e.dtSec),t=e.restitution??.55,o=.01;let a=0;for(let s=i.length-1;s>=0;s--){const n=i[s];n.vx*=r,n.vy*=r,n.vy+=e.particleGravity*e.dtSec;const l=n.x,u=n.y;if(n.x+=n.vx*e.dtSec,n.y+=n.vy*e.dtSec,n.life-=e.dtSec,e.sampleMask&&e.sampleMask(n.x,n.y)>=yi){let b=e.sampleMask(n.x+o,n.y)-e.sampleMask(n.x-o,n.y),y=e.sampleMask(n.x,n.y+o)-e.sampleMask(n.x,n.y-o),M=Math.hypot(b,y);if(M<=1e-6){const p=o*3;b=e.sampleMask(n.x+p,n.y)-e.sampleMask(n.x-p,n.y),y=e.sampleMask(n.x,n.y+p)-e.sampleMask(n.x,n.y-p),M=Math.hypot(b,y)}let h,c;if(M>1e-6)h=-b/M,c=-y/M;else{const p=Math.hypot(n.vx,n.vy);p>1e-6?(h=-n.vx/p,c=-n.vy/p):(h=1,c=0)}[n.vx,n.vy]=vi(n.vx,n.vy,h,c),n.vx*=t,n.vy*=t,n.x=l+h*o,n.y=u+c*o}(n.life<=0||n.x<-.2||n.x>1.2||n.y<-.2||n.y>1.2)&&(i.splice(s,1),a++)}return a},wi=()=>({particles:[],rainbowPhase:0,distSinceSplat:0,spawnAcc:0}),Mi=(i,e)=>{i.rainbowPhase=e.wallClockMs*.001%1;const r=e.params;if(e.dragging&&r.particleEmitter&&e.cursorUv){i.spawnAcc+=e.dtSec*r.particleRate;const t=e.cursorVelUv??{vx:0,vy:0},o=Math.hypot(t.vx,t.vy),a=o<=1e-4;for(;i.spawnAcc>=1&&i.particles.length<Le;){i.spawnAcc-=1;let s,n;if(a){const u=Math.random()*Math.PI*2;s=Math.cos(u),n=Math.sin(u)}else s=t.vx/o,n=t.vy/o;const l=nt({mode:r.colorMode,solidColor:r.solidColor,gradientLut:r.gradientLut,rainbowPhase:i.rainbowPhase,u:e.cursorUv.u,v:e.cursorUv.v,vx:t.vx,vy:t.vy,jitter:r.jitter});bi(i.particles,{u:e.cursorUv.u,v:e.cursorUv.v,dirX:s,dirY:n,color:l,brushSize:r.size,particleVelocity:r.particleVelocity,particleSpread:r.particleSpread,particleLifetime:r.particleLifetime,particleSizeScale:r.particleSizeScale})}i.particles.length>=Le&&(i.spawnAcc=0)}if(i.particles.length>0){Ti(i.particles,{dtSec:e.dtSec,particleGravity:r.particleGravity,particleDrag:r.particleDrag,sampleMask:(t,o)=>e.engine.sampleMask(t,o)});for(const t of i.particles){const o=Math.max(0,t.life/t.lifeMax);e.engine.brush(t.x,t.y,t.vx*r.flow,t.vy*r.flow,t.color,t.size,r.hardness,r.strength*o,r.mode)}}},Ci=(i,e)=>{const r=e.params;return r.particleEmitter||i.distSinceSplat<Math.max(1e-5,r.spacing)?!1:(i.distSinceSplat=0,lt(i,e),!0)},Ai=(i,e)=>{e.params.particleEmitter||(lt(i,e),i.distSinceSplat=0)},lt=(i,e)=>{i.rainbowPhase=e.wallClockMs*.001%1;const r=e.params,t=nt({mode:r.colorMode,solidColor:r.solidColor,gradientLut:r.gradientLut,rainbowPhase:i.rainbowPhase,u:e.u,v:e.v,vx:e.dvx,vy:e.dvy,jitter:r.jitter});e.engine.brush(e.u,e.v,e.dvx*r.flow,e.dvy*r.flow,t,r.size,r.hardness,r.strength,r.mode)},Ri=i=>{i.distSinceSplat=1/0,i.spawnAcc=0},Pe=ze("fluid-toy.engine",null),re=ze("fluid-toy.brush",{runtime:wi(),gradientLut:null}),ie=ze("fluid-toy.cursor",{dragging:!1,uv:null,velUv:null}),Ei={colorSpace:"srgb",blendSpace:"oklab",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:.15,color:"#1a0a00",bias:.5,interpolation:"linear"},{id:"2",position:.35,color:"#8b1a00",bias:.5,interpolation:"linear"},{id:"3",position:.6,color:"#ff6b00",bias:.5,interpolation:"linear"},{id:"4",position:.85,color:"#ffdd66",bias:.5,interpolation:"linear"},{id:"5",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},Be=X(["add","screen","max","over"],"Dye blend"),Si=Be.values,Fi=Be.fromIndex,Oe=X(["linear","perceptual","vivid"],"Colour space"),Di=Oe.values,ji=Oe.fromIndex,Ue=X(["iterations","angle","magnitude","decomposition","bands","orbit-point","orbit-circle","orbit-cross","orbit-line","stripe","distance","derivative","potential","trap-iter"],"Color mapping",{optionLabels:{decomposition:"Decomp","orbit-point":"Trap · Point","orbit-circle":"Trap · Circle","orbit-cross":"Trap · Cross","orbit-line":"Trap · Line","trap-iter":"Trap Iteration",distance:"Distance Estimate",potential:"Continuous Potential",derivative:"Derivative (log|dz|)"}}),Li=Ue.values,Pi=Ue.fromIndex,Ii=5,Ze=6,ki=7,We=8,_i=9,zi=13,Bi={id:"palette",name:"Palette",category:"Look",tabConfig:{label:"Palette"},params:{gradient:{type:"gradient",default:Ei,label:"Palette",description:"Colors both the fractal AND the dye injected into the fluid. In Hue-mode (Coupling), this IS the vector field."},colorMapping:{...Ue.config,description:"How the iteration-space scalar becomes a t-value into the gradient. Each mode exposes its own extra controls below."},gradientRepeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Repetition",description:"Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands."},gradientPhase:{type:"float",default:0,min:0,max:1,step:.005,label:"Phase",description:"Phase shift — rotates the colors without changing their layout."},colorIter:{type:"int",default:310,min:1,max:1024,step:1,label:"Color iter",description:"Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter — reduce for fresher colours."},trapCenter:{type:"vec2",default:{x:0,y:0},min:-2,max:2,step:.01,label:"Trap center",description:"Trap centre (complex coord). Move to pick which point in the orbit to trap against.",condition:{or:[{param:"colorMapping",eq:Ii},{param:"colorMapping",eq:Ze},{param:"colorMapping",eq:ki},{param:"colorMapping",eq:zi}]}},trapRadius:{type:"float",default:1,min:.01,max:4,step:.01,label:"Trap radius",condition:{param:"colorMapping",eq:Ze},description:"Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring."},trapNormal:{type:"vec2",default:{x:1,y:0},min:-1,max:1,step:.01,label:"Trap normal",condition:{param:"colorMapping",eq:We},description:"Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length."},trapOffset:{type:"float",default:0,min:-2,max:2,step:.01,label:"Trap offset",condition:{param:"colorMapping",eq:We},description:"Line-trap offset (scalar position along the normal direction)."},stripeFreq:{type:"float",default:4,min:1,max:16,step:.1,label:"Stripe freq",condition:{param:"colorMapping",eq:_i},description:"Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration."},interiorColor:{type:"vec3",default:{x:.02,y:.02,z:.04},min:0,max:1,step:.001,label:"Interior color",description:"Colour for bounded points (pixels that never escape the iteration)."},escapeR:{type:"float",default:32,min:2,max:1024,step:.1,label:"Escape R",scale:"log",hidden:!0},dyeBlend:{...Be.config,description:"How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask."}}},Oi=(i,e)=>{const r=e.trapNormal.x,t=e.trapNormal.y,o=Math.hypot(r,t),a=o>1e-6?[r/o,t/o]:[1,0],s=e.interiorColor;if(i.setParams({colorMapping:Pi(e.colorMapping),colorIter:e.colorIter,escapeR:e.escapeR,interiorColor:[s.x,s.y,s.z],trapCenter:[e.trapCenter.x,e.trapCenter.y],trapRadius:e.trapRadius,trapNormal:a,trapOffset:e.trapOffset,stripeFreq:e.stripeFreq,dyeBlend:Fi(e.dyeBlend),gradientRepeat:e.gradientRepeat,gradientPhase:e.gradientPhase}),e.gradient){const n=ot(e.gradient);i.setGradientBuffer(n),re.ref.current.gradientLut=n}},Ui={colorSpace:"srgb",blendSpace:"rgb",stops:[{id:"0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1",position:1,color:"#000000",bias:.5,interpolation:"linear"}]},Gi={id:"collision",name:"Collision",category:"Simulation",tabConfig:{label:"Collision"},params:{enabled:{type:"boolean",default:!1,label:"Collision walls",description:"Paints solid walls the fluid bounces off, sculpted by the gradient below. Same t-axis mapping as the main palette — edit stops to black = fluid, white = wall."},gradient:{type:"gradient",default:Ui,label:"Collision pattern",condition:{param:"enabled",bool:!0},description:"B&W gradient defining where walls sit along the iteration-space t-axis."},repeat:{type:"float",default:1,min:.1,max:8,step:.01,label:"Collision repeat",condition:{param:"enabled",bool:!0},description:"Tile the collision pattern along t — independent of the dye gradient repeat."},phase:{type:"float",default:0,min:0,max:1,step:.001,label:"Collision phase",condition:{param:"enabled",bool:!0},description:"Phase-shift the collision pattern so walls land where the dye doesn't."},preview:{type:"boolean",default:!1,label:"Preview walls on canvas",condition:{param:"enabled",bool:!0},description:"Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient."}}},Ni=(i,e)=>{if(i.setParams({collisionEnabled:e.enabled,collisionPreview:e.preview,collisionRepeat:e.repeat,collisionPhase:e.phase}),e.gradient){const r=ot(e.gradient);i.setCollisionGradientBuffer(r)}},Vi={id:"fluidSim",name:"Fluid",category:"Simulation",tabConfig:{label:"Fluid"},params:{vorticity:{type:"float",default:22.1,min:0,max:50,step:.1,label:"Vorticity",description:"Amplifies existing curl — keeps fractal-induced swirls from smearing away."},vorticityScale:{type:"float",default:1,min:.5,max:8,step:.1,label:"Vorticity scale",condition:{param:"vorticity",gt:0},description:"Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices."},dissipation:{type:"float",default:.17,min:0,max:5,step:.01,label:"Velocity dissipation /s",description:"How fast velocity decays. High = fluid forgets the fractal quickly."},dyeInject:{type:"float",default:1.5,min:0,max:3,step:.01,label:"Dye inject",description:"How much of the fractal's color bleeds into the fluid each frame."},pressureIters:{type:"int",default:50,min:4,max:60,step:1,label:"Pressure iters",description:"Jacobi iterations for incompressibility. More = stricter but slower."},dyeDecayMode:{...Oe.config,description:"How dye fades over time. Colour space controls whether it greys out (linear) or stays hue-stable (perceptual / vivid)."},dyeDissipation:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Dye dissipation /s",description:"How fast dye fades. In linear mode this is a straight RGB multiply; in perceptual / vivid it's the OKLab luminance fade (chroma fades on its own schedule below)."},dyeChromaDecayHz:{type:"float",default:1.03,min:0,max:5,step:.01,label:"Chroma decay /s",condition:{param:"dyeDecayMode",neq:0},description:"Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright."},dyeSaturationBoost:{type:"float",default:1,min:.5,max:1.1,step:.001,scale:"log",label:"Saturation boost",condition:{param:"dyeDecayMode",eq:2},description:"Per-frame chroma gain. 1 = neutral, <1 washes out, >1 pushes toward max saturation. Gamut-mapped in OKLab so it pegs at the saturation ceiling rather than hue-shifting to white."},dt:{type:"float",default:.016,min:.001,max:.05,step:1e-4,label:"Δt (advanced)",description:"Integration timestep. Lower = more stable."},paused:{type:"boolean",default:!1,label:"Pause sim",description:"Freeze the fluid state. Splats and param changes still land; they just don't integrate forward."}}},Ji=(i,e,r)=>{i.setParams({vorticity:e.vorticity,vorticityScale:e.vorticityScale,pressureIters:e.pressureIters,dissipation:e.dissipation,paused:e.paused,dt:e.dt,dyeInject:e.dyeInject,dyeDecayMode:ji(e.dyeDecayMode),dyeDissipation:e.dyeDissipation,dyeChromaDecayHz:e.dyeChromaDecayHz,dyeSaturationBoost:e.dyeSaturationBoost,forceMode:pi(r.forceMode),forceGain:r.forceGain,interiorDamp:r.interiorDamp,forceCap:r.forceCap,edgeMargin:r.edgeMargin})},Hi={id:"presets",name:"Presets",category:"Library",tabConfig:{label:"Presets"},customUI:[{componentId:"preset-grid"}],params:{_anchor:{type:"float",default:0,min:0,max:1,step:1,label:"",hidden:!0}}},K=i=>i.map(([e,r],t)=>({id:`s${t}`,position:e,color:r,bias:.5,interpolation:"linear"})),Xi=[{id:"bench-julia-only",name:"Bench (Julia only)",desc:"Isolation preset for performance benchmarking. All post-FX, fluid coupling, dye, collision, and palette tricks are off — only the raw Julia/Mandelbrot fractal layer renders. Pair with the Disable-fluid-sim toggle on the Deep Zoom panel and accumulation off (topbar) for a clean GPU-time read.",params:{juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],zoom:1.2904749020480561,maxIter:310,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:0,interiorDamp:1,dissipation:0,dyeDissipation:0,dyeInject:0,vorticity:0,vorticityScale:1,pressureIters:1,show:"julia",juliaMix:1,dyeMix:0,velocityViz:0,gradientRepeat:.1,gradientPhase:0,colorMapping:"iterations",colorIter:310,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:0,dyeSaturationBoost:1,toneMapping:"none",exposure:1,vibrance:1,bloomAmount:0,bloomThreshold:1,aberration:0,refraction:0,refractSmooth:1,refractRoughness:0,caustics:0,interiorColor:[0,0,0],edgeMargin:0,forceCap:1,collisionEnabled:!1,paused:!0},gradient:{stops:K([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"rgb"}},{id:"coral-gyre",name:"Coral Gyre",desc:"Orbit-point colouring on a negative curl — teal interior feeds a coral halo, with filmic bloom + aberration.",params:{juliaC:[-.8173594132029339,.15279058679706603],center:[0,0],zoom:1.5,maxIter:182,power:2,kind:"julia",forceMode:"curl",forceGain:-760,interiorDamp:.9,dissipation:.1,dyeDissipation:.63,dyeInject:2.28,vorticity:25.9,vorticityScale:4.2,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:1,velocityViz:0,gradientRepeat:.56,gradientPhase:.09,colorMapping:"orbit-point",colorIter:96,trapCenter:[1.17,0],dyeBlend:"add",dyeDecayMode:"vivid",dyeSaturationBoost:1.01,toneMapping:"filmic",exposure:2.295,vibrance:1.87,bloomAmount:1.35,bloomThreshold:1,aberration:1.12,refraction:0,refractSmooth:1,caustics:3.9,interiorColor:[.02,.04,.08],edgeMargin:.04,forceCap:12,collisionEnabled:!0},gradient:{stops:K([[0,"#000000"],[.202,"#05233d"],[.362,"#0f6884"],[.521,"#56c6c0"],[.681,"#f0fff1"],[.84,"#e7bd69"],[1,"#8a3f19"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.513,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.573,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"ink-canyon",name:"Ink Canyon",desc:"Monochrome dye threading between twin collision walls — one at the near edge, one deep in the field.",params:{juliaC:[-.7763636363636364,.19684858842329547],center:[.019054061889010376,-.007321977964897804],zoom:1.2904749020480561,maxIter:310,power:2,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:0,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0},gradient:{stops:K([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.02,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.07,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:.833,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c4",position:.883,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"plasma-vein",name:"Plasma Vein",desc:"Fractional power (1.5) with 7× repeated blue/red bands. Vivid chroma decay keeps the refracted dye electric.",params:{juliaC:[-.1764262149580809,.1951288073545453],center:[.21016359187729639,-.014585098813268887],zoom:.975889617512663,maxIter:310,power:1.5,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.7,dyeMix:1,velocityViz:0,gradientRepeat:7.43,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",dyeDecayMode:"vivid",toneMapping:"filmic",exposure:1.86,vibrance:1.645,aberration:.5,refraction:.006,refractSmooth:11.8,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40},gradient:{stops:K([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.536,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.586,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"crater-drift",name:"Crater Drift",desc:"Mandelbrot under inward curl, inferno-magenta palette. Slow auto-orbit carves craters through the bloom.",params:{juliaC:[.56053050672182,.468459152016546],center:[-.9313160617349564,-.15288948147190096],zoom:1.1807159194396142,maxIter:604,power:2,kind:"mandelbrot",forceMode:"curl",forceGain:-535.6,interiorDamp:0,dissipation:.16,dyeDissipation:.05,dyeInject:3,vorticity:2.9,vorticityScale:1.2,pressureIters:48,show:"composite",juliaMix:0,dyeMix:1.01,velocityViz:0,gradientRepeat:.66,gradientPhase:0,colorMapping:"iterations",colorIter:263,trapCenter:[1.51,-1.37],dyeBlend:"max",dyeDecayMode:"perceptual",dyeChromaDecayHz:0,toneMapping:"filmic",exposure:20.63,vibrance:1.645,bloomAmount:.63,bloomThreshold:.76,aberration:.4,refraction:0,caustics:0,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:38.5,collisionEnabled:!0},gradient:{stops:K([[.084,"#000004"],[.215,"#280B54"],[.346,"#65156E"],[.477,"#9F2A63"],[.607,"#D44842"],[.738,"#F52D15"],[.869,"#FA2727"],[1,"#FF7983"]]),colorSpace:"srgb",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.532,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.659,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"quartic-strata",name:"Quartic Strata",desc:"Power-4 Julia drifting on a subtle c-track. Strata of blue/red dye held by a near-edge wall.",params:{juliaC:[.7072727272727275,-.1398788174715911],center:[-.0013928986324417691,-.010035496866822907],zoom:.975889617512663,maxIter:310,power:4,kind:"julia",forceMode:"c-track",forceGain:1,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:1,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:2,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0},gradient:{stops:K([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.113,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.163,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.2}},{id:"sunset-bands",name:"Sunset Bands",desc:"Force-gradient mode with hard band colouring — sunset strata pushed inward at 1536 sim.",params:{juliaC:[-.16545454545454558,.6455757279829545],center:[-.1012543995130697,.03079433116134145],zoom:1.086757425434934,maxIter:175,power:2,kind:"julia",forceMode:"gradient",forceGain:1500,interiorDamp:5.8,dissipation:.22,dyeDissipation:.5,dyeInject:.55,vorticity:0,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:2,velocityViz:0,gradientRepeat:1.35,gradientPhase:.055,colorMapping:"bands",colorIter:175,dyeBlend:"over",aberration:.27,refraction:0,caustics:1,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:12},gradient:{stops:K([[0,"#04001f"],[.167,"#1a1049"],[.333,"#4e2085"],[.5,"#b13a8a"],[.667,"#ff7657"],[.833,"#ffc569"],[1,"#fff9d0"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"verdant-pulse",name:"Verdant Pulse",desc:"Viridis-to-magenta orbit-circle ring, wide vorticity, slow auto-orbit — the set breathes green and pink.",params:{juliaC:[-.7,.27015],center:[-.15958346356258324,-.09244114001481094],zoom:1.3957783246444389,maxIter:160,power:2,kind:"julia",forceMode:"c-track",forceGain:10,interiorDamp:.45,dissipation:.2,dyeDissipation:.17,dyeInject:.9,vorticity:16,vorticityScale:5.8,pressureIters:30,show:"composite",juliaMix:0,dyeMix:3.805,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"orbit-circle",colorIter:94,dyeBlend:"over",dyeDecayMode:"perceptual",exposure:.35,vibrance:1.645,aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,0,.04],edgeMargin:.04,forceCap:12,collisionEnabled:!0},gradient:{stops:K([[0,"#000000"],[.061,"#440154"],[.143,"#46327F"],[.286,"#365C8D"],[.429,"#277F8E"],[.571,"#1FA187"],[.714,"#4AC26D"],[.857,"#3ADA62"],[1,"#FD25B6"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.037,color:"#000000",bias:.5,interpolation:"linear"},{id:"c2",position:.943,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:1,color:"#626262",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.035,speed:.02}}],Ge=X(["none","reinhard","agx","filmic"],"Tone mapping",{optionLabels:{agx:"AgX"}}),Zi=Ge.values,Wi=Ge.fromIndex,Ne=X(["plain","electric","liquid"],"Style"),Ki=Ne.values,qi=Ne.fromIndex,$i={id:"postFx",name:"Post FX",category:"Look",tabConfig:{label:"Post-FX"},params:{fluidStyle:{...Ne.config,description:"Post-process pack. Pick a style to preset bloom / aberration / refraction, or mix them yourself below."},bloomAmount:{type:"float",default:0,min:0,max:3,step:.01,label:"Bloom",description:"Bloom strength — wide soft glow on bright pixels. Core of the electric look."},bloomThreshold:{type:"float",default:1,min:0,max:3,step:.01,label:"Bloom threshold",condition:{param:"bloomAmount",gt:0},description:"Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows."},aberration:{type:"float",default:.27,min:0,max:3,step:.01,label:"Aberration",description:"Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp."},refraction:{type:"float",default:.037,min:0,max:.3,step:.001,label:"Refraction",description:"Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass."},refractSmooth:{type:"float",default:3,min:1,max:12,step:.1,label:"Refract smooth",condition:{param:"refraction",gt:0},description:"Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient."},refractRoughness:{type:"float",default:0,min:0,max:1,step:.01,label:"Refract roughness",condition:{param:"refraction",gt:0},description:"Frosted-glass scatter for the refracted fractal. 0 = crisp polished glass (single-tap). 1 = ~5px Vogel-disc blur — light scatters into a cone like real rough surfaces. Mask + walls blur in step so glass edges stay consistent."},caustics:{type:"float",default:1,min:0,max:25,step:.1,label:"Caustics",description:"Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends."},toneMapping:{...Ge.config,description:"How final colour gets compressed. None = maximally vivid (may clip). AgX = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights."},exposure:{type:"float",default:1,min:.1,max:5,step:.01,label:"Exposure",description:"Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch."},vibrance:{type:"float",default:1.645,min:0,max:1,step:.01,label:"Vibrance",description:"Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones."}}},Yi=(i,e)=>{i.setParams({fluidStyle:qi(e.fluidStyle),toneMapping:Wi(e.toneMapping),exposure:e.exposure,vibrance:e.vibrance,bloomAmount:e.bloomAmount,bloomThreshold:e.bloomThreshold,aberration:e.aberration,refraction:e.refraction,refractSmooth:e.refractSmooth,refractRoughness:e.refractRoughness,caustics:e.caustics})},Ve=X(["composite","julia","dye","velocity"],"Show",{optionLabels:{composite:"Mixed",julia:"Fractal"}}),Qi=Ve.values,er=Ve.fromIndex,Se=0,tr={id:"composite",name:"Composite",category:"Look",tabConfig:{label:"Composite"},params:{show:{...Ve.config,description:"What you see. The simulation runs the same either way. Mixed = fractal + dye + optional velocity overlay. Fractal = pure fractal, fluid hidden. Dye = fluid dye only (what the fractal wrote). Velocity = per-pixel velocity as a hue wheel."},juliaMix:{type:"float",default:.4,min:0,max:2,step:.01,label:"Julia mix",condition:{param:"show",eq:Se},description:"How much fractal color shows through in Mixed view."},dyeMix:{type:"float",default:2,min:0,max:2,step:.01,label:"Dye mix",condition:{param:"show",eq:Se},description:"How much fluid dye shows through in Mixed view."},velocityViz:{type:"float",default:.02,min:0,max:2,step:.01,label:"Velocity viz",condition:{param:"show",eq:Se},description:"Overlay velocity-hue on top of the composite. Diagnostic."}}},ir=(i,e)=>{i.setParams({show:er(e.show),juliaMix:e.juliaMix,dyeMix:e.dyeMix,velocityViz:e.velocityViz})},q=(i,e)=>{if(typeof e!="string")return;const r=i.indexOf(e);return r>=0?r:void 0},xe=i=>i?{x:i[0],y:i[1]}:void 0,rr=i=>i?{x:i[0],y:i[1],z:i[2]}:void 0,or=i=>{const e=globalThis.__store;if(!e){console.warn("[applyRefPreset] store not ready — window.__store is undefined");return}const r=e.getState(),t=i.params,o={},a=q(je,t.kind);a!==void 0&&(o.kind=a),t.juliaC&&(o.juliaC=xe(t.juliaC)),t.center&&(o.center=xe(t.center)),t.zoom!==void 0&&(o.zoom=t.zoom),t.maxIter!==void 0&&(o.maxIter=t.maxIter),t.power!==void 0&&(o.power=t.power),Object.keys(o).length>0&&r.setJulia(o);const s={},n=q(di,t.forceMode);n!==void 0&&(s.forceMode=n),t.forceGain!==void 0&&(s.forceGain=t.forceGain),t.interiorDamp!==void 0&&(s.interiorDamp=t.interiorDamp),t.forceCap!==void 0&&(s.forceCap=t.forceCap),t.edgeMargin!==void 0&&(s.edgeMargin=t.edgeMargin),i.orbit?(s.orbitEnabled=i.orbit.enabled,s.orbitRadius=i.orbit.radius,s.orbitSpeed=i.orbit.speed):s.orbitEnabled=!1,r.setCoupling(s);const l={};t.vorticity!==void 0&&(l.vorticity=t.vorticity),t.vorticityScale!==void 0&&(l.vorticityScale=t.vorticityScale),t.dissipation!==void 0&&(l.dissipation=t.dissipation),t.pressureIters!==void 0&&(l.pressureIters=t.pressureIters),t.dyeInject!==void 0&&(l.dyeInject=t.dyeInject),t.dyeDissipation!==void 0&&(l.dyeDissipation=t.dyeDissipation),t.dyeChromaDecayHz!==void 0&&(l.dyeChromaDecayHz=t.dyeChromaDecayHz),t.dyeSaturationBoost!==void 0&&(l.dyeSaturationBoost=t.dyeSaturationBoost);const u=q(Di,t.dyeDecayMode);u!==void 0&&(l.dyeDecayMode=u),Object.keys(l).length>0&&r.setFluidSim(l);const b={},y=q(Li,t.colorMapping);y!==void 0&&(b.colorMapping=y),t.colorIter!==void 0&&(b.colorIter=t.colorIter),t.gradientRepeat!==void 0&&(b.gradientRepeat=t.gradientRepeat),t.gradientPhase!==void 0&&(b.gradientPhase=t.gradientPhase),t.trapCenter&&(b.trapCenter=xe(t.trapCenter)),t.trapRadius!==void 0&&(b.trapRadius=t.trapRadius),t.trapNormal&&(b.trapNormal=xe(t.trapNormal)),t.trapOffset!==void 0&&(b.trapOffset=t.trapOffset),t.stripeFreq!==void 0&&(b.stripeFreq=t.stripeFreq),t.interiorColor&&(b.interiorColor=rr(t.interiorColor));const M=q(Si,t.dyeBlend);M!==void 0&&(b.dyeBlend=M),i.gradient&&(b.gradient=i.gradient),Object.keys(b).length>0&&r.setPalette(b);const h={enabled:!!t.collisionEnabled};i.collisionGradient&&(h.gradient=i.collisionGradient),r.setCollision(h);const c={},p=q(Ki,t.fluidStyle);p!==void 0&&(c.fluidStyle=p);const R=q(Zi,t.toneMapping);R!==void 0&&(c.toneMapping=R),t.exposure!==void 0&&(c.exposure=t.exposure),t.vibrance!==void 0&&(c.vibrance=t.vibrance),t.bloomAmount!==void 0&&(c.bloomAmount=t.bloomAmount),t.bloomThreshold!==void 0&&(c.bloomThreshold=t.bloomThreshold),t.aberration!==void 0&&(c.aberration=t.aberration),t.refraction!==void 0&&(c.refraction=t.refraction),t.refractSmooth!==void 0&&(c.refractSmooth=t.refractSmooth),t.caustics!==void 0&&(c.caustics=t.caustics),Object.keys(c).length>0&&r.setPostFx(c);const g={},x=q(Qi,t.show);x!==void 0&&(g.show=x),t.juliaMix!==void 0&&(g.juliaMix=t.juliaMix),t.dyeMix!==void 0&&(g.dyeMix=t.dyeMix),t.velocityViz!==void 0&&(g.velocityViz=t.velocityViz),Object.keys(g).length>0&&r.setComposite(g),t.paused!==void 0&&typeof r.setIsPaused=="function"&&r.setIsPaused(t.paused),t.accumulation!==void 0&&typeof r.setAccumulation=="function"&&r.setAccumulation(t.accumulation)},ar=()=>d.jsxs("div",{className:"flex flex-col gap-3 py-2",children:[d.jsx("div",{className:"text-[10px] text-gray-500 leading-snug",children:"Each preset is a curated fractal ↔ fluid coupling. Applying one resets the grid and restores known params."}),d.jsx("div",{className:"grid grid-cols-2 gap-1",children:Xi.map(i=>d.jsx("button",{type:"button",title:i.desc,onClick:()=>{var e;or(i),(e=Pe.ref.current)==null||e.resetFluid()},className:"px-2 py-1 text-[10px] rounded border bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-cyan-500/40 transition-colors text-left",children:i.name},i.id))})]}),ct=X(["paint","erase","stamp","smudge"],"Mode"),sr=ct.fromIndex,ut=X(["rainbow","solid","gradient","velocity"],"Colour"),nr=ut.fromIndex,lr={id:"brush",name:"Brush",category:"Input",tabConfig:{label:"Brush"},params:{mode:{...ct.config,description:"What left-drag does on the canvas. Paint = dye + force; Erase subtracts dye; Stamp deposits dye only; Smudge pushes velocity without adding dye."},size:{type:"float",default:.15,min:.003,max:.4,step:.001,label:"Size (UV)",description:"Radius in UV units (0..1 across the canvas). B+drag the canvas to resize live."},hardness:{type:"float",default:0,min:0,max:1,step:.01,label:"Hardness",description:"0 = soft gaussian edge (airbrush). 1 = hard disc (stamp)."},strength:{type:"float",default:1,min:0,max:3,step:.01,label:"Strength",description:"Dye amount per splat. 0 = dry brush, 3 = saturated. Erase mode: how much dye each splat removes."},flow:{type:"float",default:50,min:0,max:200,step:.5,label:"Flow",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:3}]},description:"How much of the pointer's velocity is injected into the force field. Low = delicate, 50 = paints, 200 = whip."},spacing:{type:"float",default:.005,min:0,max:.1,step:.001,label:"Spacing (UV)",condition:{param:"particleEmitter",bool:!1},description:"Minimum travel between splats along a drag. Low = smooth stroke, high = dotted trail."},colorMode:{...ut.config,condition:{or:[{param:"mode",eq:0},{param:"mode",eq:2}]},description:"Where each splat gets its RGB. Gradient samples the palette; Solid uses the picker below; Rainbow cycles hue on its own clock."},solidColor:{type:"vec3",default:{x:1,y:1,z:1},min:0,max:1,step:.001,label:"Solid color",condition:{param:"colorMode",eq:1},description:"Explicit colour for Solid mode. Hue jitter still applies."},jitter:{type:"float",default:0,min:0,max:1,step:.01,label:"Hue jitter",condition:{and:[{param:"mode",neq:1},{param:"mode",neq:3}]},description:"Random hue wiggle per splat. 0 = exact colour, 1 = full hue wheel. Builds natural variation in long strokes. Stacks on rainbow/velocity mode too."},particleEmitter:{type:"boolean",default:!1,label:"Particle emitter",description:"Dragging spawns independent particles on their own layer. Each live particle flies with its own velocity / lifespan and acts as a mini brush — painting into the fluid with the selected mode at its own position."},particleRate:{type:"float",default:120,min:1,max:600,step:1,label:"Rate /s",condition:{param:"particleEmitter",bool:!0},description:"Particles emitted per second while dragging. Hard-capped at 300 live at once."},particleVelocity:{type:"float",default:.3,min:0,max:3,step:.01,label:"Velocity",condition:{param:"particleEmitter",bool:!0},description:"Initial speed in UV/sec. 0.3 = gentle spray, 2 = shotgun."},particleSpread:{type:"float",default:.35,min:0,max:1,step:.01,label:"Spread",condition:{param:"particleEmitter",bool:!0},description:"Angular spread around the drag direction. 0 = beam, 1 = full 360° burst."},particleGravity:{type:"float",default:0,min:-3,max:3,step:.01,label:"Gravity",condition:{param:"particleEmitter",bool:!0},description:"UV/sec² acceleration. Negative = falls down the canvas, positive = rises."},particleDrag:{type:"float",default:.6,min:0,max:4,step:.01,label:"Drag /s",condition:{param:"particleEmitter",bool:!0},description:"Air drag — 0 = ballistic (keeps speed), 2 = quickly slows, 4 = fast stop."},particleLifetime:{type:"float",default:1.2,min:.1,max:6,step:.05,label:"Lifetime",condition:{param:"particleEmitter",bool:!0},description:"Seconds before each particle is culled. Longer = more persistent streaks."},particleSizeScale:{type:"float",default:.35,min:.05,max:1.5,step:.01,label:"Size ×",condition:{param:"particleEmitter",bool:!0},description:"Per-particle stamp size as a fraction of the brush size. 0.35 = dabs a third of the brush."}}},Ke=96,cr=(i,e)=>{const t=(e-Math.floor(e))*256,o=Math.floor(t)%256,a=(o+1)%256,s=t-Math.floor(t),n=i[o*4+0]*(1-s)+i[a*4+0]*s,l=i[o*4+1]*(1-s)+i[a*4+1]*s,u=i[o*4+2]*(1-s)+i[a*4+2]*s;return[n,l,u]},ur=16,ee=new Map,qe=new WeakMap;let dr=0;const pr=i=>{const e=qe.get(i);if(e!==void 0)return e;const r=`lut${dr++}`;return qe.set(i,r),r},fr=(i,e,r,t,o,a,s,n,l)=>`${i}|${e}|${r}|${t}|${pr(o)}|${a}|${s}|${n[0]},${n[1]},${n[2]}|${l}`,hr=(i,e,r,t,o,a,s,n,l)=>{const u=new ImageData(i,i),b=u.data,y=Math.round(n[0]*255),M=Math.round(n[1]*255),h=Math.round(n[2]*255),c=Math.round(l),p=Math.abs(l-c)<.01&&c>=2&&c<=8;for(let R=0;R<i;R++){const g=r+(R/i*2-1)*t;for(let x=0;x<i;x++){const S=e+(x/i*2-1)*t;let w=0,T=0,E=0;for(;E<Ke;E++){const P=w*w,_=T*T;if(P+_>16)break;let k,I;if(p){let D=w,j=T;for(let O=1;O<c;O++){const f=D*w-j*T;j=D*T+j*w,D=f}k=D,I=j}else{const D=Math.sqrt(P+_),j=Math.atan2(T,w),O=Math.pow(D,l),f=j*l;k=O*Math.cos(f),I=O*Math.sin(f)}w=k+S,T=I+g}const F=((i-1-R)*i+x)*4;if(E>=Ke)b[F+0]=y,b[F+1]=M,b[F+2]=h;else{const k=(E+1-Math.log2(Math.max(1e-6,.5*Math.log2(w*w+T*T))))*.05*a+s,[I,D,j]=cr(o,k);b[F+0]=Math.round(I),b[F+1]=Math.round(D),b[F+2]=Math.round(j)}b[F+3]=255}}return u},mr=(i,e,r,t,o,a,s,n,l)=>{const u=fr(i,e,r,t,o,a,s,n,l),b=ee.get(u);if(b)return ee.delete(u),ee.set(u,b),b;const y=hr(i,e,r,t,o,a,s,n,l);for(ee.set(u,y);ee.size>ur;){const M=ee.keys().next().value;if(M===void 0)break;ee.delete(M)}return y},gr=(()=>{const i=new Uint8Array(1024);for(let e=0;e<256;e++)i[e*4]=i[e*4+1]=i[e*4+2]=e,i[e*4+3]=255;return i})(),xr=({cx:i,cy:e,onChange:r,halfExtent:t=1.6,centerX:o=-.5,centerY:a=0,size:s=220,gradientLut:n,gradientRepeat:l=1,gradientPhase:u=0,interiorColor:b=[.04,.04,.06],power:y=2})=>{const M=C.useRef(null),h=C.useRef(null),c=C.useRef(!1);C.useEffect(()=>{const g=M.current;if(!g)return;const x=g.getContext("2d");if(!x)return;g.width=s,g.height=s;const w=mr(s,o,a,t,n??gr,l,u,b,y);h.current=w,x.putImageData(w,0,0),p()},[s,o,a,t,n,l,u,b[0],b[1],b[2],y]);const p=C.useCallback(()=>{const g=M.current;if(!g||!h.current)return;const x=g.getContext("2d");if(!x)return;x.putImageData(h.current,0,0);const S=(i-o)/t*.5+.5,w=(e-a)/t*.5+.5,T=S*s,E=(1-w)*s;x.strokeStyle="#fff",x.lineWidth=1,x.beginPath(),x.moveTo(T-8,E),x.lineTo(T-2,E),x.moveTo(T+2,E),x.lineTo(T+8,E),x.moveTo(T,E-8),x.lineTo(T,E-2),x.moveTo(T,E+2),x.lineTo(T,E+8),x.stroke(),x.strokeStyle="rgba(0,255,200,0.9)",x.beginPath(),x.arc(T,E,4,0,2*Math.PI),x.stroke()},[i,e,o,a,t,s]);C.useEffect(()=>{p()},[p]);const R=g=>{const x=M.current;if(!x)return;const S=x.getBoundingClientRect(),w=(g.clientX-S.left)/S.width,T=1-(g.clientY-S.top)/S.height,E=o+(w*2-1)*t,F=a+(T*2-1)*t;r(E,F)};return d.jsxs("div",{className:"flex flex-col gap-1",children:[d.jsx("div",{className:"text-[10px] text-gray-400 uppercase tracking-wide",children:"Pick Julia c"}),d.jsx("canvas",{ref:M,className:"rounded border border-white/10 cursor-crosshair",style:{width:s,height:s,imageRendering:"pixelated"},onPointerDown:g=>{c.current=!0,g.target.setPointerCapture(g.pointerId),R(g)},onPointerMove:g=>{c.current&&R(g)},onPointerUp:g=>{c.current=!1;try{g.target.releasePointerCapture(g.pointerId)}catch{}}}),d.jsxs("div",{className:"text-[10px] font-mono text-gray-500",children:["c = (",i.toFixed(4),", ",e.toFixed(4),")"]})]})},br=({sliceState:i,actions:e})=>{const r=i.juliaC??{x:-.36303304426511473,y:.16845183018751916},t=i.power??2,o=C.useMemo(()=>{},[]);return d.jsx(xr,{cx:r.x,cy:r.y,power:t,gradientLut:o,onChange:(a,s)=>e.setJulia({juliaC:{x:a,y:s}})})};Me.register("julia-c-picker",br);Me.register("preset-grid",ar);H.register(ni);H.register(ci);H.register(hi);H.register(Bi);H.register(Gi);H.register(Vi);H.register($i);H.register(tr);H.register(lr);H.register(Hi);xt({version:1,id:"fluid-toy.tab-parity-restructure",apply:i=>(i!=null&&i.features&&(bt(i,"dye","palette"),z(i,"palette.collisionEnabled","collision.enabled"),z(i,"palette.collisionPreview","collision.preview"),z(i,"palette.collisionGradient","collision.gradient"),z(i,"palette.collisionRepeat","collision.repeat"),z(i,"palette.collisionPhase","collision.phase"),z(i,"palette.dyeMix","composite.dyeMix"),z(i,"palette.dyeInject","fluidSim.dyeInject"),z(i,"palette.dyeDissipation","fluidSim.dyeDissipation"),z(i,"palette.dyeDecayMode","fluidSim.dyeDecayMode"),z(i,"palette.dyeChromaDecayHz","fluidSim.dyeChromaDecayHz"),z(i,"palette.dyeSaturationBoost","fluidSim.dyeSaturationBoost"),z(i,"fluidSim.forceMode","coupling.forceMode"),z(i,"fluidSim.forceGain","coupling.forceGain"),z(i,"fluidSim.interiorDamp","coupling.interiorDamp"),z(i,"fluidSim.forceCap","coupling.forceCap"),z(i,"fluidSim.edgeMargin","coupling.edgeMargin"),z(i,"orbit.enabled","coupling.orbitEnabled"),z(i,"orbit.radius","coupling.orbitRadius"),z(i,"orbit.speed","coupling.orbitSpeed"),i.features.orbit&&Object.keys(i.features.orbit).length===0&&delete i.features.orbit,z(i,"sceneCamera.center","julia.center"),z(i,"sceneCamera.zoom","julia.zoom"),i.features.sceneCamera&&Object.keys(i.features.sceneCamera).length===0&&delete i.features.sceneCamera),i)});class vr{constructor(){m(this,"worker",null);m(this,"nextId",1);m(this,"pending",new Map)}ensureWorker(){if(this.worker)return this.worker;const e=new Worker(new URL(""+new URL("deepZoomWorker-CEHSx2aH.js",import.meta.url).href,import.meta.url),{type:"module"});return e.onmessage=r=>{const t=r.data,o=this.pending.get(t.id);o&&(this.pending.delete(t.id),t.type==="orbit"?o.resolve({orbit:new Float32Array(t.orbit),length:t.length,escaped:t.escaped,precisionBits:t.precisionBits,buildMs:t.buildMs,laBuildMs:t.laBuildMs??0,laTable:t.laTable?new Float32Array(t.laTable):void 0,laStages:t.laStages?new Float32Array(t.laStages):void 0,laCount:t.laCount??0,laStageCount:t.laStageCount??0,at:t.at}):o.reject(new Error(t.message)))},e.onerror=r=>{var o;const t=new Error(`deep-zoom worker crashed: ${r.message}`);for(const a of this.pending.values())a.reject(t);this.pending.clear(),(o=this.worker)==null||o.terminate(),this.worker=null},this.worker=e,e}computeReferenceOrbit(e){const r=this.ensureWorker(),t=this.nextId++;return new Promise((o,a)=>{this.pending.set(t,{resolve:o,reject:a});const s={type:"computeOrbit",id:t,...e};r.postMessage(s)})}cancel(e){if(!this.worker)return;const r={type:"cancel",id:e};this.worker.postMessage(r),this.pending.delete(e)}dispose(){this.worker&&(this.worker.terminate(),this.worker=null),this.pending.clear()}}let Fe=null;const yr=()=>(Fe||(Fe=new vr),Fe),dt={orbitLength:0,precisionBits:0,orbitBuildMs:0,laStageCount:0,laCount:0,laBuildMs:0,laStagesPerLevel:[],juliaMs:0};let se=dt;const Te=new Set,pt=i=>{se=i,Te.forEach(e=>e(i))},Tr=i=>{Math.abs(se.juliaMs-i)<.05||(se={...se,juliaMs:i},Te.forEach(e=>e(se)))},wr=()=>{pt(dt)},Mr=()=>{const[i,e]=C.useState(se);return C.useEffect(()=>(Te.add(e),()=>{Te.delete(e)}),[]),i},Cr=()=>({mode:"idle",pointerId:-1,lastX:0,lastY:0,lastT:0,startX:0,startY:0,startCx:0,startCy:0,startCxLow:0,startCyLow:0,startZoom:1,zoomAnchorX:0,zoomAnchorY:0,zoomAnchorXLow:0,zoomAnchorYLow:0,zoomAnchorU:.5,zoomAnchorV:.5,rightDragged:!1,startBrushSize:.15}),Ar=1e-5,$e=8,Rr=1e-300,Er=5,Sr=.002,Fr=.005,Dr=5,jr=.2,be=256,Lr=.5,Q={b:!1,c:!1},Pr=()=>{const i=document.activeElement;if(!i)return!1;const e=i.tagName;return e==="INPUT"||e==="TEXTAREA"||i.isContentEditable},Ir=()=>{C.useEffect(()=>{const i=t=>{Pr()||(t.code==="KeyB"&&(Q.b=!0),t.code==="KeyC"&&(Q.c=!0))},e=t=>{t.code==="KeyB"&&(Q.b=!1),t.code==="KeyC"&&(Q.c=!1)},r=()=>{Q.b=!1,Q.c=!1};return window.addEventListener("keydown",i),window.addEventListener("keyup",e),window.addEventListener("blur",r),()=>{window.removeEventListener("keydown",i),window.removeEventListener("keyup",e),window.removeEventListener("blur",r)}},[])},de=(i,e)=>i?Dr:e?jr:1,kr=(i,e,r)=>{const t=v(o=>o.openContextMenu);C.useEffect(()=>{const o=i.current;if(!o)return;const a=s=>{var h,c,p,R,g;s.preventDefault();const n=r.current;if(!n)return;if(n.rightDragged){n.rightDragged=!1;return}const l=v.getState(),u=(h=l.julia)==null?void 0:h.juliaC,b=!!((c=l.coupling)!=null&&c.orbitEnabled),y=!!((p=l.fluidSim)!=null&&p.paused),M=[{label:`Copy Julia c (${((R=u==null?void 0:u.x)==null?void 0:R.toFixed(3))??"?"}, ${((g=u==null?void 0:u.y)==null?void 0:g.toFixed(3))??"?"})`,action:()=>{var S;if(!u)return;const x=`${u.x.toFixed(6)}, ${u.y.toFixed(6)}`;(S=navigator.clipboard)==null||S.writeText(x).catch(()=>{})}},{label:y?"Resume Sim":"Pause Sim",action:()=>{l.setFluidSim({paused:!y})}},{label:b?"Stop Auto Orbit":"Start Auto Orbit",action:()=>{l.setCoupling({orbitEnabled:!b})}},{label:"Recenter View",action:()=>{l.setJulia({center:{x:0,y:0},zoom:1.5})}},{label:"Reset Fluid Fields",action:()=>{var x;(x=e.current)==null||x.resetFluid()}}];t(s.clientX,s.clientY,M,["ui.fluid-canvas"])};return o.addEventListener("contextmenu",a),()=>o.removeEventListener("contextmenu",a)},[i,e,r,t])},Ie=()=>{const i=v.getState().brush;return{mode:sr(i.mode),colorMode:nr(i.colorMode),solidColor:[i.solidColor.x,i.solidColor.y,i.solidColor.z],gradientLut:re.ref.current.gradientLut,size:i.size,hardness:i.hardness,strength:i.strength,flow:i.flow,spacing:i.spacing,jitter:i.jitter,particleEmitter:i.particleEmitter,particleRate:i.particleRate,particleVelocity:i.particleVelocity,particleSpread:i.particleSpread,particleGravity:i.particleGravity,particleDrag:i.particleDrag,particleLifetime:i.particleLifetime,particleSizeScale:i.particleSizeScale}},we=(i,e)=>{const r=i+e,t=r-i,o=i-(r-t)+(e-t);return[r,o]},$=(i,e,r)=>{const[t,o]=we(i,r),[a,s]=we(t,e+o);return[a,s]},Ye=(i,e,r,t)=>{const[o,a]=we(i,-r),[s,n]=we(o,a+(e-t));return[s,n]},Qe=()=>{const i=v.getState().deepZoom;return i&&i.enabled?Rr:Ar},_r=(i,e,r,t)=>{const o=v(s=>s.handleInteractionStart),a=v(s=>s.handleInteractionEnd);C.useEffect(()=>{const s=i.current;if(!s||!r.current)return;const l=h=>{var p,R,g,x,S,w,T,E,F,P,_,k,I,D,j,O,f,V,U;const c=r.current;if(c.pointerId=h.pointerId,c.lastX=h.clientX,c.lastY=h.clientY,c.lastT=performance.now(),c.startX=h.clientX,c.startY=h.clientY,h.button===2){const L=v.getState();c.mode="pan-pending",c.startCx=((R=(p=L.julia)==null?void 0:p.center)==null?void 0:R.x)??0,c.startCy=((x=(g=L.julia)==null?void 0:g.center)==null?void 0:x.y)??0,c.startCxLow=((w=(S=L.julia)==null?void 0:S.centerLow)==null?void 0:w.x)??0,c.startCyLow=((E=(T=L.julia)==null?void 0:T.centerLow)==null?void 0:E.y)??0,c.rightDragged=!1,s.setPointerCapture(h.pointerId),o("camera");return}if(h.button===1){h.preventDefault();const L=s.getBoundingClientRect();if(L.width<1||L.height<1)return;const G=v.getState(),J=((F=G.julia)==null?void 0:F.center)??{x:0,y:0},Z=((P=G.julia)==null?void 0:P.zoom)??1.5,pe=(h.clientX-L.left)/L.width,ne=1-(h.clientY-L.top)/L.height,fe=L.width/L.height;c.mode="zoom",c.startZoom=Z,c.zoomAnchorU=pe,c.zoomAnchorV=ne;const le=((k=(_=G.julia)==null?void 0:_.centerLow)==null?void 0:k.x)??0,Ae=((D=(I=G.julia)==null?void 0:I.centerLow)==null?void 0:D.y)??0;{const Re=(pe*2-1)*fe*Z,he=(ne*2-1)*Z,ce=$(J.x,le,Re),A=$(J.y,Ae,he);c.zoomAnchorX=ce[0],c.zoomAnchorXLow=ce[1],c.zoomAnchorY=A[0],c.zoomAnchorYLow=A[1]}s.setPointerCapture(h.pointerId),o("camera");return}if(h.button===0){s.setPointerCapture(h.pointerId);const L=v.getState();if(Q.c){c.mode="pick-c",c.startCx=((O=(j=L.julia)==null?void 0:j.juliaC)==null?void 0:O.x)??0,c.startCy=((V=(f=L.julia)==null?void 0:f.juliaC)==null?void 0:V.y)??0,o("param");return}if(Q.b){c.mode="resize-brush",c.startBrushSize=((U=L.brush)==null?void 0:U.size)??.15,o("param");return}c.mode="splat",o("param"),Ri(re.ref.current.runtime),ie.ref.current.dragging=!0;const G=s.getBoundingClientRect();if(G.width>=1&&G.height>=1&&e.current){const J=(h.clientX-G.left)/G.width,Z=1-(h.clientY-G.top)/G.height;ie.ref.current.uv={u:J,v:Z},ie.ref.current.velUv=null,Ai(re.ref.current.runtime,{u:J,v:Z,dvx:0,dvy:0,params:Ie(),engine:e.current,wallClockMs:performance.now()})}return}},u=h=>{var R,g,x,S;const c=r.current;if(c.mode==="idle")return;const p=s.getBoundingClientRect();if(!(p.width<1||p.height<1)){if(c.mode==="pick-c"){const w=v.getState(),T=((R=w.julia)==null?void 0:R.zoom)??1.5,E=p.width/p.height,F=de(h.shiftKey,h.altKey),P=h.clientX-c.startX,_=h.clientY-c.startY,k=P/p.width*2*E*T*F,I=-(_/p.height)*2*T*F;w.setJulia({juliaC:{x:c.startCx+k,y:c.startCy+I}}),c.lastX=h.clientX,c.lastY=h.clientY;return}if(c.mode==="resize-brush"){const w=v.getState(),T=de(h.shiftKey,h.altKey),E=h.clientX-c.startX,F=Math.exp(E*.0033*T),P=Math.max(.003,Math.min(.4,c.startBrushSize*F));w.setBrush({size:P}),c.lastX=h.clientX,c.lastY=h.clientY;return}if(c.mode==="pan-pending")if(Math.hypot(h.clientX-c.startX,h.clientY-c.startY)>Er)c.mode="pan",c.rightDragged=!0;else return;if(c.mode==="pan"){const T=((g=v.getState().julia)==null?void 0:g.zoom)??1.5,E=p.width/p.height,F=de(h.shiftKey,h.altKey),P=h.clientX-c.startX,_=h.clientY-c.startY,k=-(P/p.width)*2*E*T*F,I=_/p.height*2*T*F,[D,j]=$(c.startCx,c.startCxLow,k),[O,f]=$(c.startCy,c.startCyLow,I);t.current={center:{x:D,y:O},centerLow:{x:j,y:f},zoom:T},(x=e.current)==null||x.setParams({center:[D,O],centerLow:[j,f]}),c.lastX=h.clientX,c.lastY=h.clientY;return}if(c.mode==="zoom"){const w=de(h.shiftKey,h.altKey),T=h.clientY-c.startY,E=Math.exp(T*Fr*w),F=Math.max(Qe(),Math.min($e,c.startZoom*E)),P=p.width/p.height,_=-(c.zoomAnchorU*2-1)*P*F,k=-(c.zoomAnchorV*2-1)*F,[I,D]=$(c.zoomAnchorX,c.zoomAnchorXLow,_),[j,O]=$(c.zoomAnchorY,c.zoomAnchorYLow,k);t.current={center:{x:I,y:j},centerLow:{x:D,y:O},zoom:F},(S=e.current)==null||S.setParams({center:[I,j],centerLow:[D,O],zoom:F}),c.lastX=h.clientX,c.lastY=h.clientY;return}if(c.mode==="splat"){const w=e.current;if(!w)return;const T=performance.now(),E=Math.max(.001,(T-c.lastT)/1e3),F=h.clientX-c.lastX,P=h.clientY-c.lastY,_=(h.clientX-p.left)/p.width,k=1-(h.clientY-p.top)/p.height,I=F/p.width/E,D=-(P/p.height)/E,j=Math.hypot(F/p.width,P/p.height);re.ref.current.runtime.distSinceSplat+=j,ie.ref.current.uv={u:_,v:k},ie.ref.current.velUv={vx:I,vy:D},Ci(re.ref.current.runtime,{u:_,v:k,dvx:I,dvy:D,params:Ie(),engine:w,wallClockMs:T}),c.lastX=h.clientX,c.lastY=h.clientY,c.lastT=T;return}}},b=h=>{const c=r.current;if(c.pointerId===h.pointerId){try{s.releasePointerCapture(h.pointerId)}catch{}c.pointerId=-1}if(t.current){const p=t.current;t.current=null,v.getState().setJulia({center:p.center,centerLow:p.centerLow,zoom:p.zoom})}c.mode="idle",ie.ref.current.dragging=!1,a()};let y=null;const M=h=>{var V;h.preventDefault();const c=s.getBoundingClientRect();if(c.width<1||c.height<1)return;const p=t.current??(()=>{var L,G,J;const U=v.getState();return{center:((L=U.julia)==null?void 0:L.center)??{x:0,y:0},centerLow:((G=U.julia)==null?void 0:G.centerLow)??{x:0,y:0},zoom:((J=U.julia)==null?void 0:J.zoom)??1.5}})(),R=p.center,g=p.centerLow,x=p.zoom,S=de(h.shiftKey,h.altKey),w=Math.pow(.9,-h.deltaY*Sr*S),T=(h.clientX-c.left)/c.width,E=1-(h.clientY-c.top)/c.height,F=c.width/c.height,P=Math.max(Qe(),Math.min($e,x*w)),_=x-P,k=(T*2-1)*F*_,I=(E*2-1)*_,[D,j]=$(R.x,g.x,k),[O,f]=$(R.y,g.y,I);t.current={center:{x:D,y:O},centerLow:{x:j,y:f},zoom:P},(V=e.current)==null||V.setParams({center:[D,O],centerLow:[j,f],zoom:P}),y!==null&&window.clearTimeout(y),y=window.setTimeout(()=>{if(y=null,!t.current)return;const U=t.current;t.current=null,v.getState().setJulia({center:U.center,centerLow:U.centerLow,zoom:U.zoom})},100)};return s.addEventListener("pointerdown",l),s.addEventListener("pointermove",u),s.addEventListener("pointerup",b),s.addEventListener("pointercancel",b),s.addEventListener("pointerleave",b),s.addEventListener("wheel",M,{passive:!1}),()=>{s.removeEventListener("pointerdown",l),s.removeEventListener("pointermove",u),s.removeEventListener("pointerup",b),s.removeEventListener("pointercancel",b),s.removeEventListener("pointerleave",b),s.removeEventListener("wheel",M),y!==null&&window.clearTimeout(y)}},[i,e,r,t,o,a])},zr=({canvasRef:i,engineRef:e})=>{const r=C.useRef(Cr()),t=C.useRef(null);return Ir(),kr(i,e,r),_r(i,e,r,t),null},Br=()=>{const i=H.getViewportOverlays().filter(e=>e.type==="dom");return d.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:i.map(e=>{const r=Me.get(e.componentId);return r?d.jsx(Or,{cfg:e,Component:r},e.id):null})})},Or=({cfg:i,Component:e})=>{const r=v(o=>o[i.id]);if(!r)return null;const t=v.getState();return d.jsx(e,{featureId:i.id,sliceState:r,actions:t})},Ur=()=>{const i=v(l=>{var u;return((u=l.julia)==null?void 0:u.zoom)??1}),e=v(l=>{var u,b;return((b=(u=l.julia)==null?void 0:u.center)==null?void 0:b.x)??0}),r=v(l=>{var u,b;return((b=(u=l.julia)==null?void 0:u.center)==null?void 0:b.y)??0}),t=Mr(),o=i>0?Math.log10(i):0,a=i>0?`1e${o.toFixed(2)} (${i.toExponential(2)})`:"invalid",s=t.laCount>0,n=t.laStagesPerLevel.length>0?t.laStagesPerLevel.join(","):"—";return d.jsxs("div",{style:{fontSize:"10.5px",lineHeight:"1.5",fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',color:"#9ca3af",padding:"6px 8px",background:"rgba(255,255,255,0.03)",borderRadius:"4px",margin:"4px 0"},children:[d.jsxs("div",{children:["zoom: ",d.jsx("span",{style:{color:"#e5e7eb"},children:a})]}),d.jsxs("div",{children:["centre: ",d.jsxs("span",{style:{color:"#e5e7eb"},children:["(",e.toExponential(3),", ",r.toExponential(3),")"]})]}),t.orbitLength>0&&d.jsxs("div",{children:["orbit: ",d.jsx("span",{style:{color:"#e5e7eb"},children:t.orbitLength})," iters @ ",t.precisionBits,"b (",t.orbitBuildMs.toFixed(0),"ms)"]}),s&&d.jsxs("div",{children:["LA: ",d.jsx("span",{style:{color:"#e5e7eb"},children:t.laStageCount})," stages, ",d.jsx("span",{style:{color:"#e5e7eb"},children:t.laCount})," nodes [",n,"] (",t.laBuildMs.toFixed(0),"ms)"]}),t.juliaMs>0&&d.jsxs("div",{children:["GPU: ",d.jsxs("span",{style:{color:"#e5e7eb"},children:[t.juliaMs.toFixed(2),"ms"]})," per Julia pass (~",Math.round(1e3/Math.max(.1,t.juliaMs))," fps)"]})]})},ye=i=>new Promise(e=>{let r=0;const t=()=>{r++,r>=i?e():requestAnimationFrame(t)};requestAnimationFrame(t)}),Gr=i=>{if(i.length===0)return 0;const e=[...i].sort((r,t)=>r-t);return e[Math.floor(e.length/2)]},ft=[{name:"standard / shallow",center:[-.81,-.054],zoom:1.29,iter:310,deep:!1,useLA:!1,useAT:!1},{name:"deep shallow / no LA / no AT",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!1,useAT:!1},{name:"deep shallow / LA",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!0,useAT:!1},{name:"deep shallow / LA + AT",center:[-.81,-.054],zoom:1.29,iter:1e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-5 / no LA / no AT",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!1,useAT:!1},{name:"deep 1e-5 / LA",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!0,useAT:!1},{name:"deep 1e-5 / LA + AT",center:[-.81,-.054],zoom:1e-5,iter:2e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-10 / no LA / no AT",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!1,useAT:!1},{name:"deep 1e-10 / LA",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!0,useAT:!1},{name:"deep 1e-10 / LA + AT",center:[-.81,-.054],zoom:1e-10,iter:5e3,deep:!0,useLA:!0,useAT:!0},{name:"deep 1e-10 / 20k iter / LA+AT",center:[-.81,-.054],zoom:1e-10,iter:2e4,deep:!0,useLA:!0,useAT:!0}],Nr=async(i,e,r,t=3e3)=>{if(!r){await ye(20);return}const o=performance.now();for(;performance.now()-o<t;){if(i.getJuliaMs()>0){await ye(15);return}await ye(5)}},Vr=async(i,e,r)=>{const t=i.getState();t.setJulia({center:{x:r.center[0],y:r.center[1]},zoom:r.zoom}),t.setDeepZoom({enabled:r.deep,useLA:r.useLA,useAT:r.useAT,deepMaxIter:r.iter}),await Nr(e,r.iter,r.deep)},Jr=async(i,e,r=ft,t)=>{const o=[],a=i,s=e.getState();s.accumulation,a.setForceFluidPaused(!0),a.setParams({tsaa:!1,tsaaPerFrameSamples:1}),s.setAccumulation&&s.setAccumulation(!1);try{for(let n=0;n<r.length;n++){const l=r[n];t==null||t(n,r.length,l),await Vr(e,i,l);const u=[];for(let M=0;M<30;M++){await ye(1);const h=i.getJuliaMs();h>0&&u.push(h)}const b=Gr(u),y=u.length>0?Math.min(...u):0;o.push({...l,juliaMs:b,juliaMsMin:y,samples:u,timerOk:u.length>0,orbitLength:0,laStageCount:0,laCount:0,atEngaged:!1})}}finally{a.setForceFluidPaused(!1),a.setParams({tsaa:!0,tsaaPerFrameSamples:1}),s.setAccumulation&&s.setAccumulation(!0)}return o},Hr=i=>{const e="| Case | Iter | Deep | LA | AT | Julia ms | min ms |",r="|------|------|------|----|----|---------|--------|",t=i.map(o=>{const a=o.timerOk?o.juliaMs.toFixed(2):"—",s=o.timerOk?o.juliaMsMin.toFixed(2):"—";return`| ${o.name} | ${o.iter} | ${o.deep?"✓":""} | ${o.useLA?"✓":""} | ${o.useAT?"✓":""} | ${a} | ${s} |`});return[e,r,...t].join(`
`)},Xr=i=>{const e=[],r=o=>`${o.zoom}|${o.iter}|${o.deep}`,t=new Map;for(const o of i){const a=r(o);t.has(a)||t.set(a,[]),t.get(a).push(o)}for(const[o,a]of t){const s=a.find(u=>!u.useLA&&!u.useAT),n=a.find(u=>u.useLA&&!u.useAT),l=a.find(u=>u.useLA&&u.useAT);if(!(!s||s.juliaMs===0)){if(n&&n.juliaMs>0){const u=s.juliaMs/n.juliaMs;e.push(`${o}: LA speedup = ${u.toFixed(2)}×`)}if(l&&l.juliaMs>0){const u=s.juliaMs/l.juliaMs;e.push(`${o}: LA+AT speedup = ${u.toFixed(2)}×`)}}}return e},Y={padding:"2px 6px",borderBottom:"1px solid rgba(255,255,255,0.08)",whiteSpace:"nowrap"},te={...Y,fontWeight:600,color:"#cbd5e1",borderBottom:"1px solid rgba(255,255,255,0.2)"},Zr=({engineRef:i})=>{const[e,r]=C.useState(!1),[t,o]=C.useState({i:0,total:0,name:""}),[a,s]=C.useState(null),n=async()=>{const l=i.current;if(!(!l||e)){r(!0),s(null);try{const u=await Jr(l,v,ft,(M,h,c)=>{o({i:M,total:h,name:c.name})});s(u);const b=Hr(u),y=Xr(u);console.log(`[deepZoom bench]
`+b),y.length>0&&console.log(`[deepZoom bench]
`+y.join(`
`))}finally{r(!1)}}};return d.jsxs("div",{style:{fontSize:"10.5px",lineHeight:"1.5",fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',color:"#9ca3af",padding:"6px 8px",background:"rgba(255,255,255,0.03)",borderRadius:"4px",margin:"4px 0",pointerEvents:"auto",maxWidth:480},children:[d.jsx("button",{onClick:()=>{n()},disabled:e||i.current===null,style:{fontFamily:"inherit",fontSize:"inherit",padding:"4px 10px",background:e?"#444":"#1f6feb",color:"white",border:"none",borderRadius:3,cursor:e?"wait":"pointer"},children:e?`Running ${t.i+1}/${t.total}: ${t.name}`:"Run perf benchmark"}),a&&d.jsxs("div",{style:{marginTop:8,overflow:"auto",maxHeight:320},children:[d.jsxs("table",{style:{borderCollapse:"collapse",fontSize:"10.5px"},children:[d.jsx("thead",{children:d.jsxs("tr",{children:[d.jsx("th",{style:te,children:"Case"}),d.jsx("th",{style:te,children:"Iter"}),d.jsx("th",{style:te,children:"D"}),d.jsx("th",{style:te,children:"LA"}),d.jsx("th",{style:te,children:"AT"}),d.jsx("th",{style:te,children:"ms (med)"}),d.jsx("th",{style:te,children:"min"})]})}),d.jsx("tbody",{children:a.map((l,u)=>d.jsxs("tr",{children:[d.jsx("td",{style:Y,children:l.name}),d.jsx("td",{style:Y,children:l.iter}),d.jsx("td",{style:Y,children:l.deep?"✓":""}),d.jsx("td",{style:Y,children:l.useLA?"✓":""}),d.jsx("td",{style:Y,children:l.useAT?"✓":""}),d.jsx("td",{style:{...Y,color:"#e5e7eb",textAlign:"right"},children:l.timerOk?l.juliaMs.toFixed(2):"—"}),d.jsx("td",{style:{...Y,textAlign:"right"},children:l.timerOk?l.juliaMsMin.toFixed(2):"—"})]},u))})]}),d.jsx("div",{style:{marginTop:4,color:"#94a3b8"},children:a.some(l=>!l.timerOk)?"(— = GPU timer unavailable on this device)":"Open devtools console for markdown + speedup ratios."})]})]})},Wr=`
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
`,Kr=`
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
`,qr=`
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
`,Ce=`
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
`,B=`#version 300 es
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
}`,$r=`#version 300 es
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
// Accumulator-need flags driven by colorMapping. When 0, the shader
// skips the per-iter trap/stripe block (atan + sin + trapDistance) or
// the per-iter dz/dc tracker — those stats are stored in outAux
// channels that the active palette doesn't read, so computing them is
// wasted work. Modes that need them: trap/stripe → modes 5-9, 13;
// derivative → modes 10, 11. FluidEngine sets these.
uniform int   uTrackAccum;    // 1 when trap/stripe accumulators feed the palette
uniform int   uTrackDeriv;    // 1 when dz/dc derivative feeds the palette

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

// ── Deep-zoom (perturbation) ─────────────────────────────────────────────────
// Phase 3: per-pixel iteration runs against a CPU-built reference orbit
// stored in uRefOrbit (RGBA32F, 2D). When uDeepZoomEnabled == 0 the
// deep path is skipped entirely (zero cost on the standard branch).
//
// Activation gate (any failed condition keeps the standard path):
//   uDeepZoomEnabled == 1 && uKind == 1 (Mandelbrot) && uPower == 2
//
// Reference orbit texture layout:
//   width  = uRefOrbitTexW (chosen by FluidEngine, typically 2048)
//   height = ceil(uRefOrbitLen / uRefOrbitTexW)
//   channels per texel = [Z.re, Z.im, |Z|², 0]
//   index conversion: ivec2(ref % uRefOrbitTexW, ref / uRefOrbitTexW)
uniform int   uDeepZoomEnabled;
uniform sampler2D uRefOrbit;
uniform int   uRefOrbitTexW;
uniform int   uRefOrbitLen;
// Engine center − orbit reference center. Tracks pan/zoom gestures
// that move uCenter without rebuilding the orbit (the store commits
// only at gesture end). HDR-packed (vec4: mant.re, exp.re, mant.im,
// exp.im) so sub-1e-38 offsets survive the JS→GLSL boundary at deep
// zoom. Within the orbit's validity radius this keeps the deep path
// aligned with the standard path; past it the linearised perturbation
// degrades — phase 5 adds analytic radius tracking.
uniform vec4  uDeepCenterOffset;
// Zoom packed as HDR (vec2: mantissa, exp). uScale (f32) underflows
// past zoom ~1e-38; this carries the exponent through to the shader
// for the deep path. Standard path keeps using uScale.
uniform vec2  uDeepScale;

// ── Linear Approximation (LA) table ──────────────────────────────────────────
// Per LA node: 3 RGBA32F texels, packed by laTextures.ts:
//   texel 0: [Ref.re, Ref.im, ZCoeff.re, ZCoeff.im]
//   texel 1: [CCoeff.re, CCoeff.im, LAThreshold, LAThresholdC]
//   texel 2: [StepLength, NextStageLAIndex, _, _]
// Stages: vec2(laIndex, macroItCount) per stage; phase 6 MVP walks
// stage 0 only — multi-stage descent lands later if perf demands it.
uniform sampler2D uLATable;
uniform int   uLATexW;          // width of LA table texture (texels)
uniform int   uLATotalCount;    // total LA node count
uniform int   uLAEnabled;       // 0 = bypass LA, 1 = walk stage 0
// Up to 64 stages; stage 0 is at index 0 (the leaf). x = laIndex,
// y = macroItCount, z/w reserved.
uniform vec4  uLAStages[64];
uniform int   uLAStageCount;

// ── AT (Approximation Terms) front-load ──────────────────────────────────────
// AT recasts the front of the perturbed iteration as a standard z² + c'
// loop in transformed coordinates. Single uniform-step inner loop with
// no texture reads — by far the cheapest way to advance many iters at
// once when the validity gate (|dc| ≤ uATThresholdC) passes.
//   c'      = dc · uATCCoeff + uATRefC
//   z_at(0) = 0
//   z_at(k) = z_at(k-1)² + c'
//   dz_pert = z_at · uATInvZCoeff   (transform back)
//   iter    = k · uATStepLength
uniform int   uATEnabled;
uniform int   uATStepLength;
uniform float uATThresholdC;
uniform float uATSqrEscapeRadius;
uniform vec2  uATRefC;
uniform vec2  uATCCoeff;
uniform vec2  uATInvZCoeff;

${Wr}
${Kr}

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

// ── HDR float helpers (mantissa + exponent) ──────────────────────────────────
// vec2(mantissa, exp): real value = m · 2^e, mantissa normalised to [1, 2)
// for non-zero values (m=0, e=0 = exact zero). Used by the deep-zoom path so
// dc / dz_pert can carry magnitude past f32's ~1e-38 underflow floor.
//
// Complex HDR (HDRC) is stored as vec4(re.m, re.e, im.m, im.e). Cheap
// to access via .xy / .zw swizzles.
//
// Add cost: ~4 ops vs 1 op for a plain add (one log2/floor/exp2 in
// hdrReduce). Mul: ~3 ops vs 1. Acceptable: deep mode is opt-in.

vec2 hdrFromFloat(float v) {
  if (v == 0.0) return vec2(0.0, 0.0);
  float e = floor(log2(abs(v)));
  return vec2(v * exp2(-e), e);
}

float hdrToFloat(vec2 h) {
  // Underflows to 0 outside f32 normal range (~2^-126). Caller must
  // be OK with that — typically guarded by checking magnitudes first.
  return h.x * exp2(h.y);
}

// Re-normalise so |m| in [1, 2). Called after every HDR mul/add. The
// h.x == 0 guard short-circuits the log2 to keep zero exact.
vec2 hdrReduce(vec2 h) {
  if (h.x == 0.0) return vec2(0.0, 0.0);
  float adj = floor(log2(abs(h.x)));
  return vec2(h.x * exp2(-adj), h.y + adj);
}

vec2 hdrAdd(vec2 a, vec2 b) {
  if (a.x == 0.0) return b;
  if (b.x == 0.0) return a;
  // Align mantissas to the larger exponent. If the smaller is past
  // ~24 bits below the larger it's lost in f32 anyway — bail early
  // (saves the multiply + the reduce that would yield the same answer).
  if (a.y >= b.y) {
    float shift = b.y - a.y;
    if (shift < -40.0) return a;
    return hdrReduce(vec2(a.x + b.x * exp2(shift), a.y));
  } else {
    float shift = a.y - b.y;
    if (shift < -40.0) return b;
    return hdrReduce(vec2(b.x + a.x * exp2(shift), b.y));
  }
}

vec2 hdrSub(vec2 a, vec2 b) { return hdrAdd(a, vec2(-b.x, b.y)); }

vec2 hdrMul(vec2 a, vec2 b) {
  return hdrReduce(vec2(a.x * b.x, a.y + b.y));
}

// ── Complex HDR ──────────────────────────────────────────────────────────────
vec4 hdrcAdd(vec4 a, vec4 b) {
  return vec4(hdrAdd(a.xy, b.xy), hdrAdd(a.zw, b.zw));
}

vec4 hdrcSub(vec4 a, vec4 b) {
  return vec4(hdrSub(a.xy, b.xy), hdrSub(a.zw, b.zw));
}

// (a+bi)·(c+di) = (ac − bd) + (ad + bc)i
vec4 hdrcMul(vec4 a, vec4 b) {
  vec2 ar = a.xy, ai = a.zw, br = b.xy, bi = b.zw;
  return vec4(
    hdrSub(hdrMul(ar, br), hdrMul(ai, bi)),
    hdrAdd(hdrMul(ar, bi), hdrMul(ai, br))
  );
}

// HDRC times a plain f32 vec2 (e.g. the reference-orbit sample, which
// lives in [-2, 2] and never needs HDR). Cheaper than promoting both.
vec4 hdrcMulVec2(vec4 a, vec2 b) {
  return hdrcMul(a, vec4(hdrFromFloat(b.x), hdrFromFloat(b.y)));
}

vec4 hdrcFromVec2(vec2 v) {
  return vec4(hdrFromFloat(v.x), hdrFromFloat(v.y));
}

vec2 hdrcToVec2(vec4 a) {
  return vec2(hdrToFloat(a.xy), hdrToFloat(a.zw));
}

// Read one texel from the LA table at flat index linearIdx. Width-
// indexed: x = idx % W, y = idx / W. Out-of-range clamps via texelFetch's
// undefined behaviour — caller guards against past-sentinel reads.
vec4 fetchLATexel(int linearIdx) {
  int x = linearIdx - (linearIdx / uLATexW) * uLATexW;
  int y = linearIdx / uLATexW;
  return texelFetch(uLATable, ivec2(x, y), 0);
}

// Decoded LA node. step and nextStage are stored as floats in the
// texture (RGBA32F) but represent integers — round at decode.
struct LANode {
  vec2 Ref;
  vec2 ZCoeff;
  vec2 CCoeff;
  float LAThreshold;
  float LAThresholdC;
  int   StepLength;
  int   NextStageLAIndex;
};

LANode fetchLA(int nodeIdx) {
  int base = nodeIdx * 3;
  vec4 t0 = fetchLATexel(base + 0);
  vec4 t1 = fetchLATexel(base + 1);
  vec4 t2 = fetchLATexel(base + 2);
  LANode la;
  la.Ref = t0.xy;
  la.ZCoeff = t0.zw;
  la.CCoeff = t1.xy;
  la.LAThreshold = t1.z;
  la.LAThresholdC = t1.w;
  la.StepLength = int(t2.x + 0.5);
  la.NextStageLAIndex = int(t2.y + 0.5);
  return la;
}

// Fetch reference orbit Z[idx] as vec2 (re, im). Bounds-clamps to the
// last valid sample so out-of-range reads (e.g. when ref+1 == orbit
// length) return a sane value instead of zero.
vec2 fetchRefZ(int idx) {
  int safe = max(0, min(idx, uRefOrbitLen - 1));
  int x = safe - (safe / uRefOrbitTexW) * uRefOrbitTexW;
  int y = safe / uRefOrbitTexW;
  return texelFetch(uRefOrbit, ivec2(x, y), 0).xy;
}

// One Julia evaluation at the given (jittered) UV. Out-params return
// the (outMain, outAux) data. Extracted so K-sampling can call it K
// times with different jitter offsets without inlining the iteration
// loop K times in source.
void evalJulia(vec2 uvJ, out vec4 outM, out vec4 outA) {
  vec2 uv = uvJ * 2.0 - 1.0;
  uv.x *= uAspect;
  vec2 p = uCenter + uv * uScale;

  // Deep-zoom path activates whenever the worker has uploaded a valid
  // reference orbit. Both Mandelbrot and Julia kinds work (the
  // perturbation init swaps below), and any integer power 2..8 works
  // (the PO step branches on uPower). LA / AT acceleration are still
  // gated to power 2 in the worker (their Step rules are d=2-specific)
  // — that gating happens at the buildLA / screenSqrRadius level, not
  // here.
  bool deep = (uDeepZoomEnabled != 0) && (uRefOrbitLen > 1);

  vec2 z, c;
  // Deep-path perturbation state, plain f32. The HDR ops are kept in
  // the shader for future extreme-depth use but the hot path is f32.
  // For Mandelbrot kind: dz_pert starts at 0, dc carries the pixel's
  // c-offset from the reference c. For Julia kind: dz_pert starts at
  // the pixel's z-offset from the reference z₀, dc is zero (pixel and
  // reference share the same c). The perturbation math is identical
  // across kinds — only the initial values swap.
  vec2 dz_pert = vec2(0.0);
  vec2 dc      = vec2(0.0);
  if (uDeepZoomEnabled != 0) {
    float scale_f32 = uDeepScale.x * exp2(uDeepScale.y);
    vec2 offset_f32 = vec2(
      uDeepCenterOffset.x * exp2(uDeepCenterOffset.y),
      uDeepCenterOffset.z * exp2(uDeepCenterOffset.w)
    );
    vec2 pixelOffset = uv * scale_f32 + offset_f32;
    if (uKind == 0) {
      // Julia: pixel z₀ shifted by pixelOffset; c is fixed.
      dz_pert = pixelOffset;
      dc = vec2(0.0);
    } else {
      // Mandelbrot: pixel c shifted by pixelOffset; z starts at 0.
      dz_pert = vec2(0.0);
      dc = pixelOffset;
    }
  }
  int  ref     = 0;
  if (uKind == 0) { z = p; c = uJuliaC; }
  else            { z = vec2(0.0); c = p; }

  float escaped = 0.0;
  float iters = float(uMaxIter);

  float minT      = 1e9;
  float trapIter  = 0.0;
  float stripeSum = 0.0;
  int   stripeCount = 0;
  vec2  dz = vec2(1.0, 0.0);  // dz/dc, the standard-path derivative tracker

  // iter tracks total iterations performed across the LA pre-pass and
  // the per-iter PO loop below. The for-loop counter n exists only as
  // a hard upper bound for GLSL; we break on iter >= uMaxIter.
  int iter = 0;

  // ── LA pre-pass (deep + LA enabled): walk stage-0 LAs to skip many
  // iters at once. Phase 6 MVP — multi-stage descent lands if perf
  // demands more headroom; for our typical 50k-iter targets, stage 0
  // alone covers ~99% of the orbit in a few hundred LA steps.
  // ── AT pre-pass (deep + AT enabled + per-pixel validity passes) ─────────
  // Plain f32 z² + c' loop. Skips uATStepLength actual iters per AT
  // step. Falls through naturally to LA + PO with iter and dz_pert
  // updated; ref will be set after LA walk like before.
  bool atActive = deep && uATEnabled != 0 && uMaxIter > uATStepLength;
  if (atActive && max(abs(dc.x), abs(dc.y)) <= uATThresholdC) {
    vec2 c_at = cmul(dc, uATCCoeff) + uATRefC;
    vec2 z_at = vec2(0.0);
    vec2 prev_z_at = vec2(0.0);
    int atMax = uMaxIter / uATStepLength;
    int atSteps = 0;
    int prev_atSteps = 0;
    for (int k = 0; k < 4096; ++k) {
      if (k >= atMax) break;
      float zMag2 = dot(z_at, z_at);
      if (zMag2 > uATSqrEscapeRadius) {
        // Roll back one AT step. PO needs up to stepLength iters of
        // room to find the precise escape iter — without this rollback
        // adjacent pixels that barely-escape vs barely-not get final
        // iters quantised to stepLength multiples, producing visible
        // cliff transitions in the smoothI palette.
        z_at = prev_z_at;
        atSteps = prev_atSteps;
        break;
      }
      prev_z_at = z_at;
      prev_atSteps = atSteps;
      z_at = cmul(z_at, z_at) + c_at;
      atSteps++;
    }
    if (atSteps > 0) {
      // Recover the perturbation: dz_pert = z_at · uATInvZCoeff.
      dz_pert = cmul(z_at, uATInvZCoeff);
      iter = atSteps * uATStepLength;
    }
  }

  bool laActive = deep && uLAEnabled != 0 && uLAStageCount > 0 && uLATotalCount > 1;
  if (laActive) {
    // Stage-0 first-LA threshold gate: stage 0 has the most permissive
    // dc threshold (covers the smallest orbit segments). If |dc|
    // exceeds even that, NO stage's LA can help — skip LA entirely.
    LANode finestFirstLA = fetchLA(0);
    if (max(abs(dc.x), abs(dc.y)) <= finestFirstLA.LAThresholdC) {
      // Multi-stage descent: walk from root toward stage 0. f32 ops
      // throughout (HDR was 30× slower per step and unnecessary at
      // current zoom depths).
      int j = 0;
      int currentStage = uLAStageCount - 1;
      bool earlyEscape = false;
      for (int stageStep = 0; stageStep < 64; ++stageStep) {
        if (currentStage < 0) break;
        if (iter >= uMaxIter) break;
        if (earlyEscape) break;

        int laBase = int(uLAStages[currentStage].x + 0.5);
        int macroItCount = int(uLAStages[currentStage].y + 0.5);
        bool failedInStage = false;

        for (int laStep = 0; laStep < 4096; ++laStep) {
          if (iter >= uMaxIter) break;
          if (j >= macroItCount) break;
          LANode la = fetchLA(laBase + j);
          if (la.StepLength == 0) break;
          if (iter + la.StepLength > uMaxIter) break;

          // Prepare: newdz = dz_pert * (2*Ref + dz_pert).
          vec2 inner = 2.0 * la.Ref + dz_pert;
          vec2 newdz = cmul(dz_pert, inner);
          if (max(abs(newdz.x), abs(newdz.y)) >= la.LAThreshold) {
            j = la.NextStageLAIndex;
            failedInStage = true;
            break;
          }

          // Evaluate: dz_pert' = newdz * ZCoeff + dc * CCoeff.
          dz_pert = cmul(newdz, la.ZCoeff) + cmul(dc, la.CCoeff);
          iter += la.StepLength;
          j++;

          LANode nextLA = fetchLA(laBase + j);
          z = nextLA.Ref + dz_pert;
          float zMag2 = dot(z, z);
          if (zMag2 > uEscapeR2) {
            iters = float(iter) + 1.0 - log2(0.5 * log2(zMag2));
            escaped = 1.0;
            earlyEscape = true;
            break;
          }
          // REBASE — when the pixel orbit comes back near zero (|z| < |dz|)
          // OR we walk off the end of this stage, replace dz with the
          // current pixel z and restart the stage cursor.
          //
          // CRITICAL: rebase semantics depend on Z[0] = 0 (Mandelbrot's
          // iteration convention). The rebase math says "from now on,
          // treat current pixel as the new perturbation against an
          // implied Z=0 reference". For Mandelbrot orbit[0]=0 always,
          // so accessing orbit[0] after rebase produces 0 and the
          // formula 2*Z[0]*dz + dz² + dc = dz² + dc matches reality.
          //
          // For Julia, orbit[0] = R₀ (the chosen reference z₀, not
          // zero). Rebasing then accessing orbit[0]=R₀ produces
          // 2*R₀*dz + dz² which does NOT match the true pixel
          // iteration pixel_z^2 minus R0^2. Result: distorted output.
          //
          // Skip rebase for Julia. Worse LA coverage (interior pixels
          // can't loop back through stages) but mathematically correct.
          // When the stage exhausts, just break — PO continues with
          // whatever iter we accumulated.
          if (uKind != 0) {
            // Mandelbrot: rebase per Z[0] = 0 convention.
            float dzMag2 = dot(dz_pert, dz_pert);
            if (zMag2 < dzMag2 || j >= macroItCount) {
              dz_pert = z;
              j = 0;
            }
          } else if (j >= macroItCount) {
            // Julia: stage exhausted. Just bail to PO; we don't have
            // valid rebase semantics here because Z[0] != 0. PO will
            // continue from the current iter / dz_pert.
            break;
          }
        }

        if (!failedInStage) break;
        currentStage--;
      }
    }
    // Hand off to PO. iter has accumulated correctly across any rebases
    // (rebase resets only j, never iter). The ref position is best-guess
    // here — after multiple rebases the "logical" ref-orbit position has
    // drifted from iter % len. PO's own rebase rule will recover
    // immediately on the first PO step if dz_pert and Zref are
    // misaligned.
    ref = uRefOrbitLen > 0 ? (iter - (iter / uRefOrbitLen) * uRefOrbitLen) : 0;
  }

  // ── PO loop (also handles standard f32 path when !deep). Runs from
  // wherever LA left off (iter is preserved) up to uMaxIter. Hard
  // upper bound 65536 satisfies GLSL's preference for static loop
  // bounds; the meaningful guard is iter >= uMaxIter.
  // Seed the cached Zref so each PO iter does just ONE texelFetch.
  // Standard-path branch never reads it; cheap unconditional init.
  vec2 po_Zref = deep ? fetchRefZ(ref) : vec2(0.0);
  for (int n = 0; n < 65536; ++n) {
    if (escaped > 0.5) break;
    if (iter >= uMaxIter) break;

    if (uTrackDeriv != 0) {
      dz = cmul(2.0 * z, dz) + vec2(1.0, 0.0);
    }

    if (deep && uKind == 0 && ref >= uRefOrbitLen - 1) {
      // Julia past orbit overflow: switch to direct iteration of pixel
      // z. The orbit was built BigInt-precise, so for the iters it
      // covers the perturbation path is correct. When ref outruns the
      // orbit length (R₀ outside the Julia set → orbit escapes early),
      // we can't continue perturbation reliably (Z[0] != 0 means rebase
      // doesn't work, and clamped orbit values produce wrong math).
      // Direct iteration on the pixel z with c = uJuliaC is mathematically
      // exact at f32 precision — fine for the moderate depths where
      // orbit overflow can hit. Pixel z was set in the previous
      // perturbation step as orbit + dz_pert, which IS the pixel's true
      // z value at that iter — perfect handoff.
      z = cpow(z, uPower) + uJuliaC;
    } else if (deep) {
      // Cached Zref. We seed it once when entering deep PO (just below
      // this loop's outer scope when iter is first set), and forward
      // ZrefNext → Zref each step so we only do ONE texelFetch per
      // PO iter instead of two. Re-fetched explicitly on rebase.
      vec2 dz_new;
      if (abs(uPower - 2.0) < 0.01) {
        // d=2 hot path: stable algebra dz*(2Z + dz) + dc avoids the
        // catastrophic cancellation that would happen if we computed
        // (Z+dz)^2 - Z^2 directly when dz is much smaller than Z.
        dz_new = cmul(2.0 * po_Zref, dz_pert) + cmul(dz_pert, dz_pert) + dc;
      } else {
        // d >= 3: factored form
        //   (Z+dz)^d - Z^d = dz * sum_{k=0..d-1} C(d, k+1) * Z^(d-1-k) * dz^k
        // Same algebra as power-2 stable form, generalised. Avoids the
        // subtract-two-big-numbers cancellation that the cpow form
        // would suffer at deep zoom. Cost: ~d complex muls for the
        // power table + d more for the sum. Cheap relative to PO loop.
        // Variable-power LA/AT acceleration is still gated off in the
        // worker for d != 2.
        vec2 zPows[8];
        vec2 dzPows[8];
        zPows[0] = vec2(1.0, 0.0);
        dzPows[0] = vec2(1.0, 0.0);
        int d = int(uPower + 0.5);
        for (int k = 1; k < 8; k++) {
          if (k >= d) break;
          zPows[k] = cmul(zPows[k-1], po_Zref);
          dzPows[k] = cmul(dzPows[k-1], dz_pert);
        }
        // Coefficients C(d, k+1) for k=0..d-1, computed inductively.
        // C(d,1) = d. C(d,k+2) = C(d,k+1) * (d-k-1) / (k+2).
        vec2 inner = vec2(0.0);
        float coeff = float(d);
        for (int k = 0; k < 8; k++) {
          if (k >= d) break;
          // term_k = Z^(d-1-k) * dz^k
          vec2 term = cmul(zPows[d-1-k], dzPows[k]);
          inner += coeff * term;
          coeff = coeff * float(d-k-1) / float(k+2);
        }
        dz_new = cmul(dz_pert, inner) + dc;
      }
      dz_pert = dz_new;
      ref++;
      vec2 ZrefNext = fetchRefZ(ref);
      z = ZrefNext + dz_pert;
      float zMag2 = dot(z, z);
      float dzPertMag2 = dot(dz_pert, dz_pert);
      if (uKind != 0) {
        // Mandelbrot: rebase whenever |z| drops below |dz| or the
        // orbit overflows. The rebase math relies on Z[0] = 0, which
        // holds for Mandelbrot's iteration convention.
        if (zMag2 < dzPertMag2 || ref >= uRefOrbitLen - 1) {
          dz_pert = z;
          ref = 0;
          po_Zref = fetchRefZ(0);
        } else {
          po_Zref = ZrefNext;
        }
      } else {
        // Julia: rebase semantics don't apply (orbit Z[0] != 0).
        // When the orbit overflows fetchRefZ clamps to the last
        // value. If the orbit escaped at the end, |orbit[end]| is
        // already past the escape radius, so on the very next iter
        // |z| = |orbit[end] + dz_pert| also exceeds escape and the
        // natural escape check fires correctly. If the orbit didn't
        // escape (interior of the Julia set), iteration stays
        // bounded and runs to uMaxIter as expected. Either way no
        // special handling needed.
        po_Zref = ZrefNext;
      }
    } else {
      z = cpow(z, uPower) + c;
    }

    if (uTrackAccum != 0 && iter < uColorIter) {
      float td = trapDistance(z);
      if (td < minT) { minT = td; trapIter = float(iter); }
      stripeSum += 0.5 + 0.5 * sin(uStripeFreq * atan(z.y, z.x));
      stripeCount++;
    }
    float r2 = dot(z, z);
    if (r2 > uEscapeR2) {
      iters = float(iter) + 1.0 - log2(0.5 * log2(r2));
      escaped = 1.0;
      break;
    }
    iter++;
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
}`,Yr=`#version 300 es
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
${Ce}

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
}`,Qr=`#version 300 es
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
}`,eo=`#version 300 es
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
${Ce}
${qr}

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
}`,to=`#version 300 es
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
}`,io=`#version 300 es
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
}`,ro=`#version 300 es
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
}`,oo=`#version 300 es
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
}`,ao=`#version 300 es
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
}`,so=`#version 300 es
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
}`,no=`#version 300 es
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
}`,lo=`#version 300 es
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
${Ce}

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
}`,co=`#version 300 es
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
${Ce}
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
}`,uo=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`,po=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
void main() { fragColor = texture(uSource, vUv); }`,fo=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outAux;
uniform sampler2D uSourceMain;
uniform sampler2D uSourceAux;
void main() {
  outMain = texture(uSourceMain, vUv);
  outAux  = texture(uSourceAux,  vUv);
}`,ho=`#version 300 es
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
}`,mo=`#version 300 es
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
}`,go=`#version 300 es
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
}`,xo=`#version 300 es
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
}`,bo=`#version 300 es
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
}`,vo=(i,e="/blueNoise.png",r)=>{const t=i.createTexture();if(!t)throw new Error("[createBlueNoiseWebGL2] failed to allocate texture");i.bindTexture(i.TEXTURE_2D,t),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,new Uint8Array([128,128,128,128])),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.REPEAT),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.REPEAT);let o=[64,64];const a=new Image;return a.crossOrigin="anonymous",a.onload=()=>{i.isContextLost()||!i.isTexture(t)||(i.bindTexture(i.TEXTURE_2D,t),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,i.RGBA,i.UNSIGNED_BYTE,a),o=[a.naturalWidth,a.naturalHeight])},a.onerror=s=>{console.warn("[createBlueNoiseWebGL2] failed to load",e,s)},a.src=e,{texture:t,getResolution:()=>o}},De=i=>{if(!Number.isFinite(i)||i===0)return[0,0];const e=Math.floor(Math.log2(Math.abs(i)));return[i/Math.pow(2,e),e]};function yo(i){switch(i){case"linear":return 0;case"perceptual":return 1;case"vivid":return 2}}function To(i){switch(i){case"none":return 0;case"reinhard":return 1;case"agx":return 2;case"filmic":return 3}}function wo(i){switch(i){case"add":return 0;case"screen":return 1;case"max":return 2;case"over":return 3}}function ve(i){switch(i){case"iterations":return 0;case"angle":return 1;case"magnitude":return 2;case"decomposition":return 3;case"bands":return 4;case"orbit-point":return 5;case"orbit-circle":return 6;case"orbit-cross":return 7;case"orbit-line":return 8;case"stripe":return 9;case"distance":return 10;case"derivative":return 11;case"potential":return 12;case"trap-iter":return 13}}function Mo(i){switch(i){case"orbit-point":case"orbit-circle":case"orbit-cross":case"orbit-line":case"stripe":case"trap-iter":return!0;default:return!1}}function Co(i){return i==="distance"||i==="derivative"}function Ao(i){switch(i){case"orbit-point":return 0;case"orbit-circle":return 1;case"orbit-cross":return 2;case"orbit-line":return 3;case"trap-iter":return 0;default:return 0}}const Ro={juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],centerLow:[0,0],zoom:1.2904749020480561,maxIter:310,escapeR:32,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:-1200,interiorDamp:.59,dt:.016,dissipation:.17,dyeDissipation:1.03,dyeInject:8,vorticity:22.1,pressureIters:50,show:"composite",juliaMix:.4,dyeMix:2,velocityViz:.02,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:1.03,dyeSaturationBoost:1,vorticityScale:1,toneMapping:"none",exposure:1,vibrance:1.645,fluidStyle:"plain",bloomAmount:0,bloomThreshold:1,aberration:.27,refraction:.037,refractSmooth:3,refractRoughness:0,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!1,collisionPreview:!1,collisionRepeat:1,collisionPhase:0,paused:!1,tsaa:!0,tsaaJitterAmount:1,tsaaSampleCap:64,tsaaPerFrameSamples:1,tsaaGridSize:16,tsaaJitterMode:"grid",deepZoomEnabled:!1};class Eo{constructor(e,r={}){m(this,"gl");m(this,"canvas");m(this,"quadVbo");m(this,"progJulia");m(this,"progMotion");m(this,"progAddForce");m(this,"progInjectDye");m(this,"progAdvect");m(this,"progDivergence");m(this,"progCurl");m(this,"progVorticity");m(this,"progPressure");m(this,"progGradSub");m(this,"progSplat");m(this,"progDisplay");m(this,"progClear");m(this,"progCopy");m(this,"progCopyMrt");m(this,"progReproject");m(this,"progBloomExtract");m(this,"progBloomDown");m(this,"progBloomUp");m(this,"progMask");m(this,"progTsaaBlend");m(this,"juliaTsaa");m(this,"juliaTsaaPrev");m(this,"tsaaSampleIndex",0);m(this,"tsaaParamHash","");m(this,"blueNoise",null);m(this,"refOrbitTex",null);m(this,"refOrbitTexW",2048);m(this,"refOrbitTexH",0);m(this,"refOrbitLen",0);m(this,"refOrbitCenter",[0,0]);m(this,"refOrbitCenterLow",[0,0]);m(this,"refOrbitVersion",0);m(this,"laTableTex",null);m(this,"laTableTexW",1024);m(this,"laTableTexH",0);m(this,"laTotalCount",0);m(this,"laStages",new Float32Array(0));m(this,"laStageCount",0);m(this,"laEnabled",!1);m(this,"forceFluidPaused",!1);m(this,"atPayload",null);m(this,"frameCount",0);m(this,"timerExt",null);m(this,"juliaTimerQueries",[null,null,null]);m(this,"juliaTimerInFlight",[!1,!1,!1]);m(this,"juliaTimerCursor",0);m(this,"juliaMsEwma",0);m(this,"juliaTimerOpen",!1);m(this,"bloomA");m(this,"bloomB");m(this,"bloomC");m(this,"bloomDirty",!0);m(this,"lastCenter",[0,0]);m(this,"lastZoom",1.5);m(this,"firstFrame",!0);m(this,"simW",0);m(this,"simH",0);m(this,"juliaCur");m(this,"juliaPrev");m(this,"forceTex");m(this,"velocity");m(this,"dye");m(this,"divergence");m(this,"pressure");m(this,"curl");m(this,"maskTex");m(this,"gradientTex",null);m(this,"collisionGradientTex",null);m(this,"params",{...Ro});m(this,"lastTimeMs",0);m(this,"framebufferFormat");m(this,"maskReadFBO",null);m(this,"maskCpuBuf",new Uint8Array(0));m(this,"MASK_CPU_W",128);m(this,"MASK_CPU_H",128);m(this,"onFrameEnd");this.canvas=e,this.onFrameEnd=r.onFrameEnd;const t=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!t)throw new Error("WebGL2 required — your browser does not support it.");this.gl=t;const o=t.getExtension("EXT_disjoint_timer_query_webgl2");if(o){this.timerExt=o;for(let n=0;n<this.juliaTimerQueries.length;n++)this.juliaTimerQueries[n]=t.createQuery()}const a=t.getExtension("EXT_color_buffer_float"),s=t.getExtension("EXT_color_buffer_half_float");if(!a&&!s)throw new Error("Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.");this.framebufferFormat=this.detectFormat(),this.quadVbo=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.quadVbo),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),this.compileAll(),this.allocateAt(64,64),this.blueNoise=vo(t)}detectFormat(){const e=this.gl,r=[{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,name:"RGBA16F half_float"},{internal:e.RGBA32F,format:e.RGBA,type:e.FLOAT,name:"RGBA32F float"},{internal:e.RGBA8,format:e.RGBA,type:e.UNSIGNED_BYTE,name:"RGBA8 fallback"}];for(const t of r){const o=e.createTexture();e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,t.internal,4,4,0,t.format,t.type,null);const a=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,a),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0);const s=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(a),e.deleteTexture(o),s===e.FRAMEBUFFER_COMPLETE)return console.info(`[FluidEngine] Using ${t.name} render targets.`),t}throw new Error("No renderable texture format supported (not even RGBA8).")}compileShader(e,r){const t=this.gl,o=t.createShader(e);if(t.shaderSource(o,r),t.compileShader(o),!t.getShaderParameter(o,t.COMPILE_STATUS)){const a=t.getShaderInfoLog(o)||"",s=r.split(`
`).map((n,l)=>`${String(l+1).padStart(4)}: ${n}`).join(`
`);throw console.error(`Shader compile error:
${a}
${s}`),new Error(`Shader compile error: ${a}`)}return o}linkProgram(e,r,t){const o=this.gl,a=this.compileShader(o.VERTEX_SHADER,e),s=this.compileShader(o.FRAGMENT_SHADER,r),n=o.createProgram();if(o.attachShader(n,a),o.attachShader(n,s),o.bindAttribLocation(n,0,"aPos"),o.linkProgram(n),!o.getProgramParameter(n,o.LINK_STATUS))throw new Error(`Program link error: ${o.getProgramInfoLog(n)}`);o.deleteShader(a),o.deleteShader(s);const l={};for(const u of t)l[u]=o.getUniformLocation(n,u);return{prog:n,uniforms:l}}compileAll(){this.progJulia=this.linkProgram(B,$r,["uTexel","uKind","uJuliaC","uCenter","uScale","uAspect","uMaxIter","uEscapeR2","uPower","uColorIter","uTrapMode","uTrapCenter","uTrapRadius","uTrapNormal","uTrapOffset","uStripeFreq","uJitterScale","uResolution","uBlueNoiseTexture","uBlueNoiseResolution","uFrameCount","uPerFrameSamples","uJitterMode","uGridSize","uTsaaSampleIndex","uDeepZoomEnabled","uRefOrbit","uRefOrbitTexW","uRefOrbitLen","uDeepCenterOffset","uDeepScale","uLATable","uLATexW","uLATotalCount","uLAEnabled","uLAStages[0]","uLAStageCount","uATEnabled","uATStepLength","uATThresholdC","uATSqrEscapeRadius","uATRefC","uATCCoeff","uATInvZCoeff","uTrackAccum","uTrackDeriv"]),this.progTsaaBlend=this.linkProgram(B,bo,["uCurrentMain","uCurrentAux","uHistoryMain","uHistoryAux","uSampleIndex"]),this.progMotion=this.linkProgram(B,Yr,["uTexel","uJulia","uJuliaPrev","uJuliaAux","uGradient","uMask","uMode","uGain","uDt","uInteriorDamp","uDyeGain","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uForceCap"]),this.progAddForce=this.linkProgram(B,Qr,["uTexel","uVelocity","uForce","uMask","uDt"]),this.progInjectDye=this.linkProgram(B,eo,["uTexel","uDye","uJulia","uJuliaAux","uGradient","uMask","uDyeGain","uDyeFadeHz","uDt","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uDyeBlend","uDyeDecayMode","uDyeChromaFadeHz","uDyeSatBoost"]),this.progAdvect=this.linkProgram(B,to,["uTexel","uVelocity","uSource","uMask","uDt","uDissipation","uEdgeMargin"]),this.progDivergence=this.linkProgram(B,io,["uTexel","uVelocity"]),this.progCurl=this.linkProgram(B,ro,["uTexel","uVelocity"]),this.progVorticity=this.linkProgram(B,oo,["uTexel","uVelocity","uCurl","uStrength","uScale","uDt"]),this.progPressure=this.linkProgram(B,ao,["uTexel","uPressure","uDivergence"]),this.progGradSub=this.linkProgram(B,so,["uTexel","uPressure","uVelocity","uMask"]),this.progSplat=this.linkProgram(B,no,["uTexel","uTarget","uPoint","uValue","uRadius","uDiscR","uHardness","uAspect","uOp"]),this.progDisplay=this.linkProgram(B,lo,["uTexel","uTexelDisplay","uTexelDye","uJulia","uJuliaAux","uDye","uVelocity","uGradient","uBloom","uMask","uShowMode","uJuliaMix","uDyeMix","uVelocityViz","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uToneMapping","uExposure","uVibrance","uBloomAmount","uAberration","uRefraction","uRefractSmooth","uRefractRoughness","uCaustics","uCollisionPreview"]),this.progClear=this.linkProgram(B,uo,["uValue"]),this.progCopy=this.linkProgram(B,po,["uSource"]),this.progCopyMrt=this.linkProgram(B,fo,["uSourceMain","uSourceAux"]),this.progReproject=this.linkProgram(B,xo,["uTexel","uSource","uNewCenter","uOldCenter","uNewZoom","uOldZoom","uAspect"]),this.progBloomExtract=this.linkProgram(B,ho,["uTexel","uSource","uThreshold","uSoftKnee"]),this.progBloomDown=this.linkProgram(B,mo,["uTexel","uSource"]),this.progBloomUp=this.linkProgram(B,go,["uTexel","uSource","uPrev","uIntensity"]),this.progMask=this.linkProgram(B,co,["uTexel","uJulia","uJuliaAux","uGradient","uCollisionGradient","uCollisionRepeat","uCollisionPhase","uColorMapping","uGradientRepeat","uGradientPhase"])}createFBO(e,r){const t=this.gl,o=t.createTexture();t.bindTexture(t.TEXTURE_2D,o),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,r,0,this.framebufferFormat.format,this.framebufferFormat.type,null);const a=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,a),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,o,0),t.viewport(0,0,e,r),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{tex:o,fbo:a,width:e,height:r,texel:[1/e,1/r]}}createMrtFbo(e,r){const t=this.gl,o=()=>{const l=t.createTexture();return t.bindTexture(t.TEXTURE_2D,l),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,r,0,this.framebufferFormat.format,this.framebufferFormat.type,null),l},a=o(),s=o(),n=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,n),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,a,0),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT1,t.TEXTURE_2D,s,0),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1]),t.viewport(0,0,e,r),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{texMain:a,texAux:s,fbo:n,width:e,height:r,texel:[1/e,1/r]}}deleteMrtFbo(e){if(!e)return;const r=this.gl;r.deleteTexture(e.texMain),r.deleteTexture(e.texAux),r.deleteFramebuffer(e.fbo)}createDoubleFBO(e,r){let t=this.createFBO(e,r),o=this.createFBO(e,r);return{width:e,height:r,texel:[1/e,1/r],get read(){return t},get write(){return o},swap(){const s=t;t=o,o=s}}}deleteFBO(e){if(!e)return;const r=this.gl;r.deleteTexture(e.tex),r.deleteFramebuffer(e.fbo)}deleteDoubleFBO(e){e&&(this.deleteFBO(e.read),this.deleteFBO(e.write))}allocateAt(e,r){this.simW=e,this.simH=r,this.juliaCur=this.createMrtFbo(e,r),this.juliaPrev=this.createMrtFbo(e,r),this.juliaTsaa=this.createMrtFbo(e,r),this.juliaTsaaPrev=this.createMrtFbo(e,r),this.tsaaSampleIndex=0,this.forceTex=this.createFBO(e,r),this.velocity=this.createDoubleFBO(e,r),this.dye=this.createDoubleFBO(e,r),this.divergence=this.createFBO(e,r),this.pressure=this.createDoubleFBO(e,r),this.curl=this.createFBO(e,r),this.maskTex=this.createFBO(e,r),this.firstFrame=!0}reallocateAt(e,r){var b,y;if(e===this.simW&&r===this.simH&&this.juliaCur)return;const t=(b=this.dye)==null?void 0:b.read,o=(y=this.velocity)==null?void 0:y.read,a=this.juliaTsaa,s=this.createDoubleFBO(e,r),n=this.createDoubleFBO(e,r),l=this.createMrtFbo(e,r),u=this.createMrtFbo(e,r);t&&this.blitInto(t,s.read),o&&this.blitInto(o,n.read),a&&this.blitMrtInto(a,l),this.deleteDoubleFBO(this.dye),this.deleteDoubleFBO(this.velocity),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.simW=e,this.simH=r,this.dye=s,this.velocity=n,this.juliaTsaa=l,this.juliaTsaaPrev=u,this.juliaCur=this.createMrtFbo(e,r),this.juliaPrev=this.createMrtFbo(e,r),this.forceTex=this.createFBO(e,r),this.divergence=this.createFBO(e,r),this.pressure=this.createDoubleFBO(e,r),this.curl=this.createFBO(e,r),this.maskTex=this.createFBO(e,r),this.firstFrame=!0}blitInto(e,r){const t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,r.fbo),t.viewport(0,0,r.width,r.height),this.useProgram(this.progCopy),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,e.tex),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.uniform1i(this.progCopy.uniforms.uSource,0),this.drawQuad()}blitMrtInto(e,r){const t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,r.fbo),t.viewport(0,0,r.width,r.height),this.useProgram(this.progCopyMrt),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,e.texMain),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.uniform1i(this.progCopyMrt.uniforms.uSourceMain,0),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,e.texAux),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.uniform1i(this.progCopyMrt.uniforms.uSourceAux,1),this.drawQuad()}bindFBO(e){const r=this.gl;r.bindFramebuffer(r.FRAMEBUFFER,e.fbo),r.viewport(0,0,e.width,e.height)}useProgram(e){const r=this.gl;r.useProgram(e.prog),r.bindBuffer(r.ARRAY_BUFFER,this.quadVbo),r.enableVertexAttribArray(0),r.vertexAttribPointer(0,2,r.FLOAT,!1,0,0)}drawQuad(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}setTexel(e,r,t){const o=this.gl,a=e.uniforms.uTexel;a&&o.uniform2f(a,1/r,1/t)}bindTex(e,r,t){const o=this.gl;o.activeTexture(o.TEXTURE0+e),o.bindTexture(o.TEXTURE_2D,r),t&&o.uniform1i(t,e)}setParams(e){this.params={...this.params,...e}}getAccumulationCount(){return this.tsaaSampleIndex}uploadLut(e,r){const t=this.gl,o=be*4;r.length!==o&&console.warn(`[FluidEngine] ${e} gradient buffer unexpected length ${r.length} (want ${o})`);let a=e==="main"?this.gradientTex:this.collisionGradientTex;a||(a=t.createTexture(),e==="main"?this.gradientTex=a:this.collisionGradientTex=a),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,a),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,be,1,0,t.RGBA,t.UNSIGNED_BYTE,r)}setGradientBuffer(e){this.uploadLut("main",e)}setCollisionGradientBuffer(e){this.uploadLut("collision",e)}ensureGradient(){if(this.gradientTex)return;const e=be,r=new Uint8Array(e*4);for(let t=0;t<e;++t)r[t*4+0]=t,r[t*4+1]=t,r[t*4+2]=t,r[t*4+3]=255;this.setGradientBuffer(r)}ensureCollisionGradient(){if(this.collisionGradientTex)return;const e=be,r=new Uint8Array(e*4);for(let t=0;t<e;++t)r[t*4+0]=0,r[t*4+1]=0,r[t*4+2]=0,r[t*4+3]=255;this.setCollisionGradientBuffer(r)}setRenderSize(e,r){e=Math.max(32,Math.round(e)),r=Math.max(32,Math.round(r)),!(e===this.simW&&r===this.simH&&this.canvas.width===e&&this.canvas.height===r)&&((this.canvas.width!==e||this.canvas.height!==r)&&(this.canvas.width=e,this.canvas.height=r,this.bloomDirty=!0),this.reallocateAt(e,r))}redraw(){this.displayToScreen();const e=this.gl;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,null)}ensureBloomFbos(){if(!this.bloomDirty&&this.bloomA)return;this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC);const e=this.canvas.width,r=this.canvas.height,t=Math.max(4,e>>1&-2),o=Math.max(4,r>>1&-2),a=Math.max(2,e>>2&-2),s=Math.max(2,r>>2&-2),n=Math.max(2,e>>3&-2),l=Math.max(2,r>>3&-2);this.bloomA=this.createFBO(t,o),this.bloomB=this.createFBO(a,s),this.bloomC=this.createFBO(n,l),this.bloomDirty=!1}markFirstFrame(){this.firstFrame=!0}resetFluid(){const e=this.gl;for(const r of[this.velocity,this.dye,this.pressure])for(const t of[r.read,r.write])this.bindFBO(t),this.useProgram(this.progClear),e.uniform4f(this.progClear.uniforms.uValue,0,0,0,1),this.drawQuad();e.bindFramebuffer(e.FRAMEBUFFER,null),this.markFirstFrame()}splat(e,r,t,o,a,s,n){const l=this.gl;this.bindFBO(e.write),this.useProgram(this.progSplat),this.bindTex(0,e.read.tex,this.progSplat.uniforms.uTarget),l.uniform2f(this.progSplat.uniforms.uPoint,r,t),l.uniform3f(this.progSplat.uniforms.uValue,o[0],o[1],o[2]),l.uniform1f(this.progSplat.uniforms.uRadius,Math.max(1e-6,a*.5*(a*.5))),l.uniform1f(this.progSplat.uniforms.uDiscR,Math.max(1e-6,a)),l.uniform1f(this.progSplat.uniforms.uHardness,s),l.uniform1f(this.progSplat.uniforms.uAspect,this.simW/this.simH),l.uniform1f(this.progSplat.uniforms.uOp,n==="sub"?1:0),this.drawQuad(),e.swap()}brush(e,r,t,o,a,s,n,l,u){e=Math.max(0,Math.min(1,e)),r=Math.max(0,Math.min(1,r));const b=[a[0]*l,a[1]*l,a[2]*l],y=[t,o,0];switch(u){case"paint":this.splat(this.velocity,e,r,y,s,n,"add"),this.splat(this.dye,e,r,b,s,n,"add");break;case"erase":this.splat(this.dye,e,r,[l,l,l],s,n,"sub");break;case"stamp":this.splat(this.dye,e,r,b,s,n,"add");break;case"smudge":this.splat(this.velocity,e,r,y,s,n,"add");break}this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}ensureMaskReadFBO(){if(this.maskReadFBO)return;const e=this.gl,r=e.createTexture();e.bindTexture(e.TEXTURE_2D,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,this.MASK_CPU_W,this.MASK_CPU_H,0,e.RGBA,e.UNSIGNED_BYTE,null);const t=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,t),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),this.maskReadFBO={tex:r,fbo:t,width:this.MASK_CPU_W,height:this.MASK_CPU_H,texel:[1/this.MASK_CPU_W,1/this.MASK_CPU_H]},this.maskCpuBuf=new Uint8Array(this.MASK_CPU_W*this.MASK_CPU_H*4)}readMaskToCPU(){if(!this.params.collisionEnabled)return;const e=this.gl;this.ensureMaskReadFBO(),e.bindFramebuffer(e.READ_FRAMEBUFFER,this.maskTex.fbo),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,this.maskReadFBO.fbo),e.blitFramebuffer(0,0,this.simW,this.simH,0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.COLOR_BUFFER_BIT,e.LINEAR),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.FRAMEBUFFER,this.maskReadFBO.fbo),e.readPixels(0,0,this.MASK_CPU_W,this.MASK_CPU_H,e.RGBA,e.UNSIGNED_BYTE,this.maskCpuBuf),e.bindFramebuffer(e.FRAMEBUFFER,null)}sampleMask(e,r){if(!this.params.collisionEnabled||this.maskCpuBuf.length===0)return 0;const t=this.MASK_CPU_W,o=this.MASK_CPU_H;if(e<0||e>1||r<0||r>1)return 0;const a=Math.min(t-1,Math.max(0,Math.floor(e*t))),s=Math.min(o-1,Math.max(0,Math.floor(r*o)));return this.maskCpuBuf[(s*t+a)*4]/255}renderJulia(){const e=this.gl,r=this.params.tsaaSampleCap,t=!this.params.paused&&!this.forceFluidPaused;if(this.params.tsaa&&r>0&&this.tsaaSampleIndex>=r&&!t)return;const o=this.juliaCur;if(this.juliaCur=this.juliaPrev,this.juliaPrev=o,this.timerExt&&!this.juliaTimerOpen){const S=this.juliaTimerQueries[this.juliaTimerCursor];S&&!this.juliaTimerInFlight[this.juliaTimerCursor]&&(e.beginQuery(this.timerExt.TIME_ELAPSED_EXT,S),this.juliaTimerOpen=!0,this.juliaTimerInFlight[this.juliaTimerCursor]=!0)}e.bindFramebuffer(e.FRAMEBUFFER,this.juliaCur.fbo),e.viewport(0,0,this.juliaCur.width,this.juliaCur.height),this.useProgram(this.progJulia),this.setTexel(this.progJulia,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uKind,this.params.kind==="julia"?0:1),e.uniform2f(this.progJulia.uniforms.uJuliaC,this.params.juliaC[0],this.params.juliaC[1]),e.uniform2f(this.progJulia.uniforms.uCenter,this.params.center[0],this.params.center[1]),e.uniform1f(this.progJulia.uniforms.uScale,this.params.zoom),e.uniform1f(this.progJulia.uniforms.uAspect,this.simW/this.simH);const a=Math.max(4,this.params.maxIter|0);e.uniform1i(this.progJulia.uniforms.uMaxIter,a),e.uniform1i(this.progJulia.uniforms.uColorIter,Math.max(1,Math.min(a,this.params.colorIter|0))),e.uniform1f(this.progJulia.uniforms.uEscapeR2,this.params.escapeR*this.params.escapeR),e.uniform1f(this.progJulia.uniforms.uPower,this.params.power),e.uniform1i(this.progJulia.uniforms.uTrapMode,Ao(this.params.colorMapping)),e.uniform1i(this.progJulia.uniforms.uTrackAccum,Mo(this.params.colorMapping)?1:0),e.uniform1i(this.progJulia.uniforms.uTrackDeriv,Co(this.params.colorMapping)?1:0),e.uniform2f(this.progJulia.uniforms.uTrapCenter,this.params.trapCenter[0],this.params.trapCenter[1]),e.uniform1f(this.progJulia.uniforms.uTrapRadius,this.params.trapRadius),e.uniform2f(this.progJulia.uniforms.uTrapNormal,this.params.trapNormal[0],this.params.trapNormal[1]),e.uniform1f(this.progJulia.uniforms.uTrapOffset,this.params.trapOffset),e.uniform1f(this.progJulia.uniforms.uStripeFreq,this.params.stripeFreq);const s=this.params.tsaaSampleCap,l=this.params.tsaa&&(s<=0||this.tsaaSampleIndex<s)?this.params.tsaaJitterAmount:0;if(e.uniform1f(this.progJulia.uniforms.uJitterScale,l),e.uniform2f(this.progJulia.uniforms.uResolution,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uFrameCount,this.frameCount),e.uniform1i(this.progJulia.uniforms.uPerFrameSamples,this.params.tsaaPerFrameSamples??1),e.uniform1i(this.progJulia.uniforms.uJitterMode,this.params.tsaaJitterMode==="grid"?1:0),e.uniform1i(this.progJulia.uniforms.uGridSize,this.params.tsaaGridSize??16),e.uniform1i(this.progJulia.uniforms.uTsaaSampleIndex,this.tsaaSampleIndex),this.blueNoise){this.bindTex(5,this.blueNoise.texture,this.progJulia.uniforms.uBlueNoiseTexture);const[S,w]=this.blueNoise.getResolution();e.uniform2f(this.progJulia.uniforms.uBlueNoiseResolution,S,w)}const u=this.params.deepZoomEnabled&&this.refOrbitTex!==null&&this.refOrbitLen>1;e.uniform1i(this.progJulia.uniforms.uDeepZoomEnabled,u?1:0),e.uniform1i(this.progJulia.uniforms.uRefOrbitTexW,this.refOrbitTexW),e.uniform1i(this.progJulia.uniforms.uRefOrbitLen,this.refOrbitLen);const b=Ye(this.params.center[0],this.params.centerLow[0],this.refOrbitCenter[0],this.refOrbitCenterLow[0]),y=Ye(this.params.center[1],this.params.centerLow[1],this.refOrbitCenter[1],this.refOrbitCenterLow[1]),M=b[0]+b[1],h=y[0]+y[1],c=De(M),p=De(h);e.uniform4f(this.progJulia.uniforms.uDeepCenterOffset,c[0],c[1],p[0],p[1]);const R=De(this.params.zoom);e.uniform2f(this.progJulia.uniforms.uDeepScale,R[0],R[1]),this.refOrbitTex?this.bindTex(6,this.refOrbitTex,this.progJulia.uniforms.uRefOrbit):this.blueNoise&&this.bindTex(6,this.blueNoise.texture,this.progJulia.uniforms.uRefOrbit);const g=u&&this.laEnabled&&this.laTableTex!==null&&this.laTotalCount>1;if(e.uniform1i(this.progJulia.uniforms.uLAEnabled,g?1:0),e.uniform1i(this.progJulia.uniforms.uLATexW,this.laTableTexW),e.uniform1i(this.progJulia.uniforms.uLATotalCount,this.laTotalCount),e.uniform1i(this.progJulia.uniforms.uLAStageCount,this.laStageCount),this.laStageCount>0){const S=Math.min(this.laStageCount,64),w=new Float32Array(S*4);for(let T=0;T<S;T++)w[T*4+0]=this.laStages[T*2+0],w[T*4+1]=this.laStages[T*2+1];e.uniform4fv(this.progJulia.uniforms["uLAStages[0]"],w)}this.laTableTex?this.bindTex(7,this.laTableTex,this.progJulia.uniforms.uLATable):this.blueNoise&&this.bindTex(7,this.blueNoise.texture,this.progJulia.uniforms.uLATable);const x=u&&this.atPayload!==null;e.uniform1i(this.progJulia.uniforms.uATEnabled,x?1:0),this.atPayload?(e.uniform1i(this.progJulia.uniforms.uATStepLength,this.atPayload.stepLength),e.uniform1f(this.progJulia.uniforms.uATThresholdC,this.atPayload.thresholdC),e.uniform1f(this.progJulia.uniforms.uATSqrEscapeRadius,this.atPayload.sqrEscapeRadius),e.uniform2f(this.progJulia.uniforms.uATRefC,this.atPayload.refC[0],this.atPayload.refC[1]),e.uniform2f(this.progJulia.uniforms.uATCCoeff,this.atPayload.ccoeff[0],this.atPayload.ccoeff[1]),e.uniform2f(this.progJulia.uniforms.uATInvZCoeff,this.atPayload.invZCoeff[0],this.atPayload.invZCoeff[1])):(e.uniform1i(this.progJulia.uniforms.uATStepLength,1),e.uniform1f(this.progJulia.uniforms.uATThresholdC,0),e.uniform1f(this.progJulia.uniforms.uATSqrEscapeRadius,4),e.uniform2f(this.progJulia.uniforms.uATRefC,0,0),e.uniform2f(this.progJulia.uniforms.uATCCoeff,1,0),e.uniform2f(this.progJulia.uniforms.uATInvZCoeff,1,0)),this.drawQuad(),this.timerExt&&this.juliaTimerOpen&&(e.endQuery(this.timerExt.TIME_ELAPSED_EXT),this.juliaTimerCursor=(this.juliaTimerCursor+1)%this.juliaTimerQueries.length,this.juliaTimerOpen=!1)}pollJuliaTimer(){if(!this.timerExt)return;const e=this.gl;if(e.getParameter(this.timerExt.GPU_DISJOINT_EXT)){for(let t=0;t<this.juliaTimerInFlight.length;t++)this.juliaTimerInFlight[t]=!1;return}for(let t=0;t<this.juliaTimerQueries.length;t++){if(!this.juliaTimerInFlight[t])continue;const o=this.juliaTimerQueries[t];if(!o||!e.getQueryParameter(o,e.QUERY_RESULT_AVAILABLE))continue;const n=e.getQueryParameter(o,e.QUERY_RESULT)/1e6;this.juliaMsEwma=this.juliaMsEwma===0?n:this.juliaMsEwma*.8+n*.2,this.juliaTimerInFlight[t]=!1}}getJuliaMs(){return this.juliaMsEwma}hasGpuTimer(){return this.timerExt!==null}setAT(e){this.atPayload=e,this.refOrbitVersion++}clearAT(){this.atPayload!==null&&(this.atPayload=null,this.refOrbitVersion++)}setLATable(e,r,t){const o=this.gl,a=r*3,s=this.laTableTexW,n=Math.max(1,Math.ceil(a/s)),l=s*n*4;let u;e.length>=l?u=e.subarray(0,l):(u=new Float32Array(l),u.set(e)),this.laTableTex||(this.laTableTex=o.createTexture(),o.bindTexture(o.TEXTURE_2D,this.laTableTex),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,o.NEAREST),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,o.NEAREST),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,o.CLAMP_TO_EDGE),this.laTableTexH=0),o.bindTexture(o.TEXTURE_2D,this.laTableTex),n!==this.laTableTexH?(o.texImage2D(o.TEXTURE_2D,0,o.RGBA32F,s,n,0,o.RGBA,o.FLOAT,u),this.laTableTexH=n):o.texSubImage2D(o.TEXTURE_2D,0,0,0,s,n,o.RGBA,o.FLOAT,u),this.laTotalCount=r,this.laStages=t,this.laStageCount=t.length/2,this.refOrbitVersion++}setLAEnabled(e){this.laEnabled=e}setForceFluidPaused(e){this.forceFluidPaused=e}clearLATable(){this.laTotalCount=0,this.laStages=new Float32Array(0),this.laStageCount=0,this.refOrbitVersion++}setReferenceOrbit(e,r,t,o=[0,0]){this.refOrbitCenter=[t[0],t[1]],this.refOrbitCenterLow=[o[0],o[1]];const a=this.gl,s=this.refOrbitTexW,n=Math.max(1,Math.ceil(r/s)),l=s*n*4;let u;e.length>=l?u=e.subarray(0,l):(u=new Float32Array(l),u.set(e)),this.refOrbitTex||(this.refOrbitTex=a.createTexture(),a.bindTexture(a.TEXTURE_2D,this.refOrbitTex),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),this.refOrbitTexH=0),a.bindTexture(a.TEXTURE_2D,this.refOrbitTex),n!==this.refOrbitTexH?(a.texImage2D(a.TEXTURE_2D,0,a.RGBA32F,s,n,0,a.RGBA,a.FLOAT,u),this.refOrbitTexH=n):a.texSubImage2D(a.TEXTURE_2D,0,0,0,s,n,a.RGBA,a.FLOAT,u),this.refOrbitLen=r,this.refOrbitVersion++}clearReferenceOrbit(){this.refOrbitLen=0,this.refOrbitVersion++}runTsaaBlend(){const e=this.params.tsaaSampleCap;if(e>0&&this.tsaaSampleIndex>=e)return;const r=this.gl;this.tsaaSampleIndex=e>0?Math.min(this.tsaaSampleIndex+1,e):this.tsaaSampleIndex+1,r.bindFramebuffer(r.FRAMEBUFFER,this.juliaTsaaPrev.fbo),r.viewport(0,0,this.juliaTsaaPrev.width,this.juliaTsaaPrev.height),this.useProgram(this.progTsaaBlend),this.bindTex(0,this.juliaCur.texMain,this.progTsaaBlend.uniforms.uCurrentMain),this.bindTex(1,this.juliaCur.texAux,this.progTsaaBlend.uniforms.uCurrentAux),this.bindTex(2,this.juliaTsaa.texMain,this.progTsaaBlend.uniforms.uHistoryMain),this.bindTex(3,this.juliaTsaa.texAux,this.progTsaaBlend.uniforms.uHistoryAux),r.uniform1i(this.progTsaaBlend.uniforms.uSampleIndex,this.tsaaSampleIndex),this.drawQuad();const t=this.juliaTsaa;this.juliaTsaa=this.juliaTsaaPrev,this.juliaTsaaPrev=t}juliaReadFbo(){return this.params.tsaa?this.juliaTsaa:this.juliaCur}updateTsaaHash(){const e=this.params,r=`${e.kind}|${e.juliaC[0]}|${e.juliaC[1]}|${e.center[0]}|${e.center[1]}|${e.zoom}|${e.power}|${e.maxIter}|${e.colorIter}|${e.escapeR}|${e.colorMapping}|${e.trapCenter[0]}|${e.trapCenter[1]}|${e.trapRadius}|${e.trapNormal[0]}|${e.trapNormal[1]}|${e.trapOffset}|${e.stripeFreq}|dz:${e.deepZoomEnabled?1:0}|dzV:${this.refOrbitVersion}`;r!==this.tsaaParamHash&&(this.tsaaParamHash=r,this.tsaaSampleIndex=0)}computeMask(){const e=this.gl;if(this.ensureGradient(),this.ensureCollisionGradient(),this.bindFBO(this.maskTex),!this.params.collisionEnabled){e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);return}this.useProgram(this.progMask),this.setTexel(this.progMask,this.simW,this.simH);const r=this.juliaReadFbo();this.bindTex(0,r.texMain,this.progMask.uniforms.uJulia),this.bindTex(1,r.texAux,this.progMask.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMask.uniforms.uGradient),this.bindTex(3,this.collisionGradientTex,this.progMask.uniforms.uCollisionGradient),e.uniform1i(this.progMask.uniforms.uColorMapping,ve(this.params.colorMapping)),e.uniform1f(this.progMask.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMask.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMask.uniforms.uCollisionRepeat,this.params.collisionRepeat),e.uniform1f(this.progMask.uniforms.uCollisionPhase,this.params.collisionPhase),this.drawQuad()}computeForce(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.forceTex),this.useProgram(this.progMotion),this.setTexel(this.progMotion,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMotion.uniforms.uJulia),this.bindTex(1,this.juliaPrev.texMain,this.progMotion.uniforms.uJuliaPrev),this.bindTex(4,this.juliaCur.texAux,this.progMotion.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMotion.uniforms.uGradient),this.bindTex(5,this.maskTex.tex,this.progMotion.uniforms.uMask),e.uniform1i(this.progMotion.uniforms.uMode,So(this.params.forceMode)),e.uniform1f(this.progMotion.uniforms.uGain,this.params.forceGain),e.uniform1f(this.progMotion.uniforms.uDt,this.params.dt),e.uniform1f(this.progMotion.uniforms.uInteriorDamp,this.params.interiorDamp),e.uniform1f(this.progMotion.uniforms.uDyeGain,this.params.dyeInject),e.uniform1i(this.progMotion.uniforms.uColorMapping,ve(this.params.colorMapping)),e.uniform1f(this.progMotion.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMotion.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMotion.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1f(this.progMotion.uniforms.uForceCap,this.params.forceCap),this.drawQuad()}addForceToVelocity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progAddForce),this.setTexel(this.progAddForce,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAddForce.uniforms.uVelocity),this.bindTex(1,this.forceTex.tex,this.progAddForce.uniforms.uForce),this.bindTex(2,this.maskTex.tex,this.progAddForce.uniforms.uMask),e.uniform1f(this.progAddForce.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}injectDye(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.dye.write),this.useProgram(this.progInjectDye),this.setTexel(this.progInjectDye,this.simW,this.simH);const r=this.juliaReadFbo();this.bindTex(0,this.dye.read.tex,this.progInjectDye.uniforms.uDye),this.bindTex(1,r.texMain,this.progInjectDye.uniforms.uJulia),this.bindTex(2,this.gradientTex,this.progInjectDye.uniforms.uGradient),this.bindTex(4,r.texAux,this.progInjectDye.uniforms.uJuliaAux),this.bindTex(5,this.maskTex.tex,this.progInjectDye.uniforms.uMask),e.uniform1f(this.progInjectDye.uniforms.uDyeGain,this.params.dyeInject),e.uniform1f(this.progInjectDye.uniforms.uDyeFadeHz,this.params.dyeDissipation),e.uniform1f(this.progInjectDye.uniforms.uDt,this.params.dt),e.uniform1i(this.progInjectDye.uniforms.uColorMapping,ve(this.params.colorMapping)),e.uniform1f(this.progInjectDye.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progInjectDye.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progInjectDye.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1i(this.progInjectDye.uniforms.uDyeBlend,wo(this.params.dyeBlend)),e.uniform1i(this.progInjectDye.uniforms.uDyeDecayMode,yo(this.params.dyeDecayMode)),e.uniform1f(this.progInjectDye.uniforms.uDyeChromaFadeHz,this.params.dyeChromaDecayHz),e.uniform1f(this.progInjectDye.uniforms.uDyeSatBoost,this.params.dyeSaturationBoost),this.drawQuad(),this.dye.swap()}computeCurl(){this.bindFBO(this.curl),this.useProgram(this.progCurl),this.setTexel(this.progCurl,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progCurl.uniforms.uVelocity),this.drawQuad()}applyVorticity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progVorticity),this.setTexel(this.progVorticity,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progVorticity.uniforms.uVelocity),this.bindTex(1,this.curl.tex,this.progVorticity.uniforms.uCurl),e.uniform1f(this.progVorticity.uniforms.uStrength,this.params.vorticity),e.uniform1f(this.progVorticity.uniforms.uScale,this.params.vorticityScale),e.uniform1f(this.progVorticity.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}computeDivergence(){this.bindFBO(this.divergence),this.useProgram(this.progDivergence),this.setTexel(this.progDivergence,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progDivergence.uniforms.uVelocity),this.drawQuad()}solvePressure(){const e=this.gl;this.bindFBO(this.pressure.read),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);for(let r=0;r<this.params.pressureIters;++r)this.bindFBO(this.pressure.write),this.useProgram(this.progPressure),this.setTexel(this.progPressure,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progPressure.uniforms.uPressure),this.bindTex(1,this.divergence.tex,this.progPressure.uniforms.uDivergence),this.drawQuad(),this.pressure.swap()}subtractPressureGradient(){this.bindFBO(this.velocity.write),this.useProgram(this.progGradSub),this.setTexel(this.progGradSub,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progGradSub.uniforms.uPressure),this.bindTex(1,this.velocity.read.tex,this.progGradSub.uniforms.uVelocity),this.bindTex(2,this.maskTex.tex,this.progGradSub.uniforms.uMask),this.drawQuad(),this.velocity.swap()}advect(e,r){const t=this.gl;this.bindFBO(e.write),this.useProgram(this.progAdvect),this.setTexel(this.progAdvect,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAdvect.uniforms.uVelocity),this.bindTex(1,e.read.tex,this.progAdvect.uniforms.uSource),this.bindTex(2,this.maskTex.tex,this.progAdvect.uniforms.uMask),t.uniform1f(this.progAdvect.uniforms.uDt,this.params.dt),t.uniform1f(this.progAdvect.uniforms.uDissipation,r),t.uniform1f(this.progAdvect.uniforms.uEdgeMargin,this.params.edgeMargin),this.drawQuad(),e.swap()}reprojectTexture(e,r,t){const o=this.gl;this.bindFBO(e.write),this.useProgram(this.progReproject),this.setTexel(this.progReproject,this.simW,this.simH),this.bindTex(0,e.read.tex,this.progReproject.uniforms.uSource),o.uniform2f(this.progReproject.uniforms.uNewCenter,this.params.center[0],this.params.center[1]),o.uniform2f(this.progReproject.uniforms.uOldCenter,r[0],r[1]),o.uniform1f(this.progReproject.uniforms.uNewZoom,this.params.zoom),o.uniform1f(this.progReproject.uniforms.uOldZoom,t),o.uniform1f(this.progReproject.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}maybeReprojectForCamera(){if(this.firstFrame){this.firstFrame=!1,this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom;return}const e=this.params.center[0]-this.lastCenter[0],r=this.params.center[1]-this.lastCenter[1],t=this.params.zoom-this.lastZoom;if(Math.abs(e)<1e-7&&Math.abs(r)<1e-7&&Math.abs(t)<1e-7)return;const o=[this.lastCenter[0],this.lastCenter[1]],a=this.lastZoom;this.reprojectTexture(this.dye,o,a),this.reprojectTexture(this.velocity,o,a),this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom}displayToScreen(){const e=this.gl;this.ensureGradient();const r=this.params.bloomAmount>.001;r&&(this.ensureBloomFbos(),this.bindFBO(this.bloomA),this.setDisplayUniforms(null,!0),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomExtract),e.uniform2f(this.progBloomExtract.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomA.tex,this.progBloomExtract.uniforms.uSource),e.uniform1f(this.progBloomExtract.uniforms.uThreshold,this.params.bloomThreshold),e.uniform1f(this.progBloomExtract.uniforms.uSoftKnee,Lr),this.drawQuad(),this.bindFBO(this.bloomC),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomA),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomUp),e.uniform2f(this.progBloomUp.uniforms.uTexel,this.bloomC.texel[0],this.bloomC.texel[1]),this.bindTex(0,this.bloomC.tex,this.progBloomUp.uniforms.uSource),this.bindTex(1,this.bloomA.tex,this.progBloomUp.uniforms.uPrev),e.uniform1f(this.progBloomUp.uniforms.uIntensity,1),this.drawQuad()),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.setDisplayUniforms(r?this.bloomB:null,!1),this.drawQuad()}setDisplayUniforms(e,r=!1){const t=this.gl;this.useProgram(this.progDisplay),t.uniform2f(this.progDisplay.uniforms.uTexelDisplay,1/this.canvas.width,1/this.canvas.height),t.uniform2f(this.progDisplay.uniforms.uTexelDye,1/this.simW,1/this.simH);const o=this.juliaReadFbo();this.bindTex(0,o.texMain,this.progDisplay.uniforms.uJulia),this.bindTex(4,o.texAux,this.progDisplay.uniforms.uJuliaAux),this.bindTex(1,this.dye.read.tex,this.progDisplay.uniforms.uDye),this.bindTex(2,this.velocity.read.tex,this.progDisplay.uniforms.uVelocity),this.bindTex(3,this.gradientTex,this.progDisplay.uniforms.uGradient),this.bindTex(5,(e==null?void 0:e.tex)??this.gradientTex,this.progDisplay.uniforms.uBloom),this.bindTex(6,this.maskTex.tex,this.progDisplay.uniforms.uMask),t.uniform1i(this.progDisplay.uniforms.uShowMode,Fo(this.params.show)),t.uniform1f(this.progDisplay.uniforms.uJuliaMix,this.params.juliaMix),t.uniform1f(this.progDisplay.uniforms.uDyeMix,this.params.dyeMix),t.uniform1f(this.progDisplay.uniforms.uVelocityViz,this.params.velocityViz),t.uniform1i(this.progDisplay.uniforms.uColorMapping,ve(this.params.colorMapping)),t.uniform1f(this.progDisplay.uniforms.uGradientRepeat,this.params.gradientRepeat),t.uniform1f(this.progDisplay.uniforms.uGradientPhase,this.params.gradientPhase),t.uniform3f(this.progDisplay.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),r?(t.uniform1i(this.progDisplay.uniforms.uToneMapping,0),t.uniform1f(this.progDisplay.uniforms.uExposure,1),t.uniform1f(this.progDisplay.uniforms.uVibrance,0),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,0),t.uniform1f(this.progDisplay.uniforms.uAberration,0),t.uniform1f(this.progDisplay.uniforms.uRefraction,0),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,1),t.uniform1f(this.progDisplay.uniforms.uRefractRoughness,0),t.uniform1f(this.progDisplay.uniforms.uCaustics,0),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,0)):(t.uniform1i(this.progDisplay.uniforms.uToneMapping,To(this.params.toneMapping)),t.uniform1f(this.progDisplay.uniforms.uExposure,this.params.exposure),t.uniform1f(this.progDisplay.uniforms.uVibrance,this.params.vibrance),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,e?this.params.bloomAmount:0),t.uniform1f(this.progDisplay.uniforms.uAberration,this.params.aberration),t.uniform1f(this.progDisplay.uniforms.uRefraction,this.params.refraction),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,this.params.refractSmooth),t.uniform1f(this.progDisplay.uniforms.uRefractRoughness,this.params.refractRoughness),t.uniform1f(this.progDisplay.uniforms.uCaustics,this.params.caustics),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,this.params.collisionPreview?1:0))}frame(e){const r=this.gl,t=this.lastTimeMs===0?.016:Math.min(.05,(e-this.lastTimeMs)/1e3);this.lastTimeMs=e,this.params.dt=t,this.updateTsaaHash(),this.frameCount++,this.params.tsaa&&this.params.tsaaSampleCap>0&&this.tsaaSampleIndex>=this.params.tsaaSampleCap||(this.renderJulia(),this.params.tsaa&&this.runTsaaBlend()),this.computeMask(),this.readMaskToCPU(),!this.params.paused&&!this.forceFluidPaused&&(this.maybeReprojectForCamera(),this.computeForce(),this.addForceToVelocity(),this.params.vorticity>0&&(this.computeCurl(),this.applyVorticity()),this.computeDivergence(),this.solvePressure(),this.subtractPressureGradient(),this.advect(this.velocity,this.params.dissipation),this.injectDye(),this.advect(this.dye,this.params.dyeDissipation)),this.displayToScreen(),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,null),this.pollJuliaTimer(),this.onFrameEnd&&this.onFrameEnd()}dispose(){const e=this.gl;this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteMrtFbo(this.juliaTsaa),this.deleteMrtFbo(this.juliaTsaaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.maskReadFBO&&(this.deleteFBO(this.maskReadFBO),this.maskReadFBO=null),this.gradientTex&&(e.deleteTexture(this.gradientTex),this.gradientTex=null),this.collisionGradientTex&&(e.deleteTexture(this.collisionGradientTex),this.collisionGradientTex=null),this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC),e.deleteBuffer(this.quadVbo);for(const r of[this.progJulia,this.progMotion,this.progAddForce,this.progInjectDye,this.progAdvect,this.progDivergence,this.progCurl,this.progVorticity,this.progPressure,this.progGradSub,this.progSplat,this.progDisplay,this.progClear,this.progReproject,this.progMask,this.progTsaaBlend,this.progBloomExtract,this.progBloomDown,this.progBloomUp])r!=null&&r.prog&&e.deleteProgram(r.prog);this.blueNoise&&(e.deleteTexture(this.blueNoise.texture),this.blueNoise=null)}canvasToFractal(e,r){const t=this.canvas.getBoundingClientRect(),o=(e-t.left)/t.width,a=1-(r-t.top)/t.height,s=this.canvas.width/this.canvas.height,n=(o*2-1)*s*this.params.zoom+this.params.center[0],l=(a*2-1)*this.params.zoom+this.params.center[1];return[n,l]}canvasToUv(e,r){const t=this.canvas.getBoundingClientRect();return[(e-t.left)/t.width,1-(r-t.top)/t.height]}}function So(i){switch(i){case"gradient":return 0;case"curl":return 1;case"iterate":return 2;case"c-track":return 3;case"hue":return 4}}function Fo(i){switch(i){case"composite":return 0;case"julia":return 1;case"dye":return 2;case"velocity":return 3}}const Do=i=>{me.register({id:"fluid-toy.pause",key:"Space",description:"Pause / resume the fluid simulation",category:"Playback",handler:()=>{var r;const e=v.getState();e.setFluidSim({paused:!((r=e.fluidSim)!=null&&r.paused)})}}),me.register({id:"fluid-toy.reset",key:"R",description:"Reset fluid fields (dye + velocity → zero)",category:"Playback",handler:()=>{var e;(e=i.current)==null||e.resetFluid()}}),me.register({id:"fluid-toy.orbit-toggle",key:"O",description:"Toggle Julia-c auto-orbit",category:"Simulation",handler:()=>{var r;const e=v.getState();e.setCoupling({orbitEnabled:!((r=e.coupling)!=null&&r.orbitEnabled)})}}),me.register({id:"fluid-toy.home",key:"Home",description:"Recenter view (center=[0,0], zoom=1.5)",category:"View",handler:()=>{v.getState().setJulia({center:{x:0,y:0},zoom:1.5})}})},jo=i=>{const e=C.useRef(null),r=C.useRef(null);return C.useEffect(()=>{const t=i.current;if(t){try{const o=new Eo(t,{onFrameEnd:()=>vt.frameTick()});e.current=o,Pe.ref.current=o;let a=-1,s=0,n=-1;const l=u=>{const b=a<0?0:Math.min(.1,(u-a)/1e3);if(a=u,e.current){const y=ie.ref.current;if(Mi(re.ref.current.runtime,{dtSec:b,wallClockMs:u,dragging:y.dragging,cursorUv:y.uv,cursorVelUv:y.velUv,params:Ie(),engine:e.current}),e.current.frame(u),u-s>100){const M=e.current.getAccumulationCount();M!==n&&(v.getState().reportAccumulation(M),n=M),s=u}}r.current=requestAnimationFrame(l)};r.current=requestAnimationFrame(l)}catch(o){console.error("[FluidToy] failed to start engine:",o)}return Do(e),()=>{var o;r.current!==null&&cancelAnimationFrame(r.current),(o=e.current)==null||o.dispose(),e.current=null,Pe.ref.current=null}}},[]),e},Lo=()=>{var j,O;const i=v(f=>f.panels),e=v(f=>f.contextMenu),r=v(f=>f.handleInteractionStart),t=v(f=>f.handleInteractionEnd),o=v(f=>f.openContextMenu),a=v(f=>f.closeContextMenu),s=v(f=>f.togglePanel),n=v(f=>f.openHelp),l=C.useRef(null),u=jo(l),b=Object.values(i).filter(f=>f.location==="float"&&f.isOpen),y=C.useMemo(()=>({handleInteractionStart:r,handleInteractionEnd:t,openContextMenu:o}),[r,t,o]),M=v(f=>f.canvasPixelSize),h=v(f=>f.resolutionMode),c=v(f=>f.fixedResolution),p=v(f=>f.renderScale),R=at();yt();const g=W("julia"),x=W("deepZoom"),S=W("coupling"),w=W("palette"),T=W("collision"),E=W("fluidSim"),F=W("postFx"),P=W("composite"),_=v(f=>f.accumulation),k=v(f=>f.isPaused),I=v(f=>f.sampleCap),D=Qt();return C.useEffect(()=>{const f=u.current;f&&li(f,g,D)},[g,D]),C.useEffect(()=>{const f=u.current;f&&ui(f,x,g)},[x,g]),C.useEffect(()=>{var he,ce;if(!x.enabled){wr();return}const f=u.current;if(!f)return;const V=yr();let U=!1;const L=performance.now(),G=[g.center.x,g.center.y],J=[((he=g.centerLow)==null?void 0:he.x)??0,((ce=g.centerLow)==null?void 0:ce.y)??0],Z=M[0]/Math.max(1,M[1]),pe=(Z*Z+1)*g.zoom*g.zoom,ne=Math.max(2,Math.round(g.power??2)),fe=ne===2,le=g.kind===0?"julia":"mandelbrot",Ae=D["julia.juliaC_x"]??g.juliaC.x,Re=D["julia.juliaC_y"]??g.juliaC.y;return V.computeReferenceOrbit({centerX:G[0],centerY:G[1],centerLowX:J[0],centerLowY:J[1],zoom:g.zoom,maxIter:x.maxRefIter,power:ne,kind:le,juliaCx:Ae,juliaCy:Re,buildLA:x.useLA&&fe&&le==="mandelbrot",screenSqrRadius:x.useAT&&fe&&le==="mandelbrot"?pe:0}).then(A=>{if(U)return;f.setReferenceOrbit(A.orbit,A.length,G,J),A.laTable&&A.laStages&&A.laCount>0?(f.setLATable(A.laTable,A.laCount,A.laStages),f.setLAEnabled(!0)):(f.clearLATable(),f.setLAEnabled(!1)),A.at?f.setAT({stepLength:A.at.stepLength,thresholdC:A.at.thresholdC,sqrEscapeRadius:A.at.sqrEscapeRadius,refC:[A.at.refCRe,A.at.refCIm],ccoeff:[A.at.ccoeffRe,A.at.ccoeffIm],invZCoeff:[A.at.invZCoeffRe,A.at.invZCoeffIm]}):f.clearAT(),f.redraw();const He=[];if(A.laStages)for(let ue=0;ue<A.laStages.length;ue+=2)He.push(A.laStages[ue+1]);if(pt({orbitLength:A.length,precisionBits:A.precisionBits,orbitBuildMs:A.buildMs,laStageCount:A.laStageCount,laCount:A.laCount,laBuildMs:A.laBuildMs,laStagesPerLevel:He,juliaMs:0}),x.showStats){const ue=performance.now()-L;console.log(`[deepZoom] orbit len=${A.length} prec=${A.precisionBits}b LA stages=${A.laStageCount} nodes=${A.laCount} (orbit=${A.buildMs.toFixed(1)}ms LA=${A.laBuildMs.toFixed(1)}ms total=${ue.toFixed(1)}ms)`)}}).catch(A=>{U||console.error("[deepZoom] build failed:",A.message)}),()=>{U=!0}},[x.enabled,x.useLA,x.useAT,x.maxRefIter,x.showStats,g.center.x,g.center.y,(j=g.centerLow)==null?void 0:j.x,(O=g.centerLow)==null?void 0:O.y,g.zoom,g.power,g.kind,g.juliaC.x,g.juliaC.y,M,u]),C.useEffect(()=>{if(!x.enabled)return;const f=()=>{const U=u.current;U&&Tr(U.getJuliaMs())},V=window.setInterval(f,200);return()=>window.clearInterval(V)},[x.enabled,u]),C.useEffect(()=>{const f=u.current;f&&Oi(f,w)},[w]),C.useEffect(()=>{const f=u.current;f&&Ni(f,T)},[T]),C.useEffect(()=>{const f=u.current;f&&Ji(f,E,S)},[E,S]),C.useEffect(()=>{const f=u.current;f&&Yi(f,F)},[F]),C.useEffect(()=>{const f=u.current;f&&ir(f,P)},[P]),C.useEffect(()=>{const f=u.current;f&&f.setParams({tsaa:_??!0,tsaaSampleCap:I,paused:k})},[_,k,I]),C.useEffect(()=>{const f=u.current;if(!f)return;const V=window.devicePixelRatio||1,[U,L]=h==="Fixed"?c:[M[0]/V,M[1]/V];if(U<1||L<1)return;const G=Math.max(1,Math.round(U*p*R)),J=Math.max(1,Math.round(L*p*R));f.setRenderSize(G,J),f.redraw()},[M,h,c,p,R]),d.jsx(Tt,{value:y,children:d.jsxs("div",{className:"fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col",children:[d.jsx(wt,{}),d.jsx(Xt,{}),d.jsx(Mt,{}),b.map(f=>d.jsx(Ct,{id:f.id,title:f.id,children:d.jsx(At,{activeTab:f.id,state:v.getState(),actions:v.getState(),onSwitchTab:V=>s(V,!0)})},f.id)),d.jsx(Rt,{}),d.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[d.jsx(Xe,{side:"left"}),d.jsxs(Nt,{className:"flex-1",children:[d.jsx("canvas",{ref:l,className:"absolute inset-0 w-full h-full block touch-none"}),d.jsx(zr,{canvasRef:l,engineRef:u}),d.jsx(Zt,{}),d.jsx(Br,{}),x.enabled&&d.jsxs("div",{style:{position:"absolute",left:8,bottom:8,pointerEvents:"none",zIndex:5,minWidth:220},children:[d.jsx(Ur,{}),d.jsx(Zr,{engineRef:u})]})]}),d.jsx(Xe,{side:"right"})]}),d.jsx(Et,{}),d.jsx(Wt,{}),e.visible&&d.jsx(St,{x:e.x,y:e.y,items:e.items,targetHelpIds:e.targetHelpIds,onClose:a,onOpenHelp:n})]})})},Po=[{id:"Fractal",dock:"right",order:0,active:!0,features:["julia"]},{id:"Deep Zoom",dock:"right",order:1,features:["deepZoom"]},{id:"Coupling",dock:"right",order:2,features:["coupling"]},{id:"Fluid",dock:"right",order:3,features:["fluidSim"]},{id:"Brush",dock:"right",order:4,features:["brush"]},{id:"Palette",dock:"right",order:5,features:["palette"]},{id:"Post-FX",dock:"right",order:6,features:["postFx"]},{id:"Collision",dock:"right",order:7,features:["collision"]},{id:"Composite",dock:"right",order:8,features:["composite"]},{id:"Presets",dock:"right",order:9,features:["presets"]},{id:"Views",dock:"left",order:20,component:"panel-views",label:"View Manager"}],Io=()=>Ft(Po),ko=()=>{const i=at();return d.jsxs("span",{className:"text-[10px] text-white/40 font-mono pointer-events-none",children:["q",(i*100).toFixed(0),"%"]})},N=({children:i})=>d.jsx("span",{className:"inline-block px-1 py-px text-[9px] font-mono border border-white/20 rounded bg-white/10 text-white/90 mx-0.5",children:i}),_o=()=>{const[i,e]=C.useState(!0);return i?d.jsxs("div",{className:"px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[360px] pointer-events-auto shadow-xl",children:[d.jsxs("div",{className:"flex items-center justify-between mb-1",children:[d.jsx("div",{className:"text-[10px] uppercase text-cyan-300 tracking-wide",children:"Hotkeys"}),d.jsx("button",{onClick:()=>e(!1),className:"text-gray-500 hover:text-gray-200 text-[12px] px-1 leading-none",title:"Hide (click ? to reopen)",children:"×"})]}),d.jsxs("ul",{className:"space-y-0.5 leading-snug",children:[d.jsxs("li",{children:[d.jsx(N,{children:"Drag"})," inject force + dye into the fluid"]}),d.jsxs("li",{children:[d.jsx(N,{children:"B"}),"+",d.jsx(N,{children:"Drag"})," resize the brush live (horizontal = scale)"]}),d.jsxs("li",{children:[d.jsx(N,{children:"C"}),"+",d.jsx(N,{children:"Drag"})," pick Julia c directly on the canvas"]}),d.jsxs("li",{children:[d.jsx(N,{children:"Right-click"}),"+",d.jsx(N,{children:"Drag"})," pan the fractal view"]}),d.jsxs("li",{children:[d.jsx(N,{children:"Right-click"})," (tap) canvas for quick actions menu"]}),d.jsxs("li",{children:[d.jsx(N,{children:"Shift"}),"/",d.jsx(N,{children:"Alt"})," precision modifiers (5× / 0.2×) for any drag"]}),d.jsxs("li",{children:[d.jsx(N,{children:"Wheel"})," zoom · ",d.jsx(N,{children:"Middle"}),"+",d.jsx(N,{children:"Drag"})," smooth zoom · ",d.jsx(N,{children:"Home"})," recenter"]}),d.jsxs("li",{children:[d.jsx(N,{children:"Space"})," pause sim · ",d.jsx(N,{children:"R"})," clear fluid · ",d.jsx(N,{children:"O"})," toggle c-orbit · ",d.jsx(N,{children:"H"})," hide hints"]})]})]}):d.jsx("button",{onClick:()=>e(!0),className:"px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70 pointer-events-auto",title:"Show hotkeys",children:"? hotkeys"})},et="fluid-toy.orbit.juliaC.x",tt="fluid-toy.orbit.juliaC.y";let it=null;const rt=()=>{const i=v.getState(),e=i.coupling,r=i.animations??[],t=r.filter(l=>l.id!==et&&l.id!==tt);if(!(e!=null&&e.orbitEnabled)){t.length!==r.length&&i.setAnimations(t);return}const o=e.orbitRadius??.1,s=1/Math.max(.001,e.orbitSpeed??.25),n=[...t,{id:et,target:"julia.juliaC_x",shape:"Sine",period:s,phase:0,amplitude:o,baseValue:0,smoothing:0,enabled:!0},{id:tt,target:"julia.juliaC_y",shape:"Sine",period:s,phase:.25,amplitude:o,baseValue:0,smoothing:0,enabled:!0}];i.setAnimations(n)},zo=()=>{it||(rt(),it=v.subscribe(i=>i.coupling,rt))},oe=(i,e,r)=>i+(e-i)*r,Bo=i=>i<.5?2*i*i:1-Math.pow(-2*i+2,2)/2,Je=()=>{const i=v.getState().julia;return{kind:i.kind,juliaC:{...i.juliaC},center:{...i.center},zoom:i.zoom,maxIter:i.maxIter,power:i.power}},Oo=500;let ae=null;const Uo=i=>{const e=v.getState().setJulia;if(!e)return;ae!==null&&(cancelAnimationFrame(ae),ae=null);const r=Je();e({kind:i.kind,maxIter:i.maxIter});const t=Math.log(Math.max(r.zoom,1e-12)),o=Math.log(Math.max(i.zoom,1e-12)),a=performance.now(),s=()=>{const n=(performance.now()-a)/Oo;if(n>=1){e({center:{x:i.center.x,y:i.center.y},juliaC:{x:i.juliaC.x,y:i.juliaC.y},zoom:i.zoom,power:i.power}),ae=null;return}const l=Bo(n);e({center:{x:oe(r.center.x,i.center.x,l),y:oe(r.center.y,i.center.y,l)},juliaC:{x:oe(r.juliaC.x,i.juliaC.x,l),y:oe(r.juliaC.y,i.juliaC.y,l)},zoom:Math.exp(oe(t,o,l)),power:oe(r.power,i.power,l)}),ae=requestAnimationFrame(s)};ae=requestAnimationFrame(s)},Go=i=>{Uo(i)},No=i=>{const e=Je();return e.kind!==i.kind||e.maxIter!==i.maxIter||e.power!==i.power||Math.abs(e.zoom-i.zoom)>1e-5||Math.abs(e.center.x-i.center.x)+Math.abs(e.center.y-i.center.y)>1e-4||Math.abs(e.juliaC.x-i.juliaC.x)+Math.abs(e.juliaC.y-i.juliaC.y)>1e-4},Vo=async()=>{try{const i=document.querySelector("canvas");if(!i)return;const e=128,r=document.createElement("canvas");r.width=e,r.height=e;const t=r.getContext("2d");if(!t)return;const o=Math.min(i.width,i.height),a=(i.width-o)/2,s=(i.height-o)/2;return t.drawImage(i,a,s,o,o,0,0,e,e),r.toDataURL("image/jpeg",.7)}catch{return}},Jo=()=>{const i=v.getState().setJulia;i&&i({center:{x:0,y:0},zoom:1.5})},Ho=()=>{ei({panelId:"Views",arrayKey:"savedViews",activeIdKey:"activeViewId",actions:{add:"addView",update:"updateView",delete:"deleteView",duplicate:"duplicateView",select:"selectView",reorder:"reorderViews",saveToSlot:"saveViewToSlot",reset:"resetView"},defaultLabelPrefix:"View",capture:Je,apply:Go,isModified:No,captureThumbnail:Vo,onReset:Jo,slotShortcuts:{count:9,category:"Views"},menu:{menuId:"camera",slot:"right",order:29,icon:Dt,title:"Camera",align:"end",width:"w-48",openItem:{label:"View Manager…",title:"Open the saved-views library"},resetItem:{label:"Reset View",title:"Reset to default fractal view"},slotLabelPrefix:"View"}})},Xo=({activeIdKey:i,featureIds:e,label:r="Active",groupFilter:t,excludeParams:o,whitelistParams:a,onDeselect:s,inactiveLabel:n=null})=>{const l=v(u=>u[i]);return!l&&n===null?null:d.jsxs("div",{className:"border-t border-white/10 bg-black/40 p-2 space-y-2",children:[d.jsxs("div",{className:"flex items-center justify-between",children:[d.jsx(jt,{children:l?r:n??""}),l&&s&&d.jsx("button",{type:"button",onClick:s,className:"text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors",children:"Deselect"})]}),l&&e.map(u=>d.jsx("div",{className:"bg-white/5 rounded p-1",children:d.jsx(Lt,{featureId:u,groupFilter:t,excludeParams:o,whitelistParams:a})},u))]})},Zo=()=>{const i=v(p=>p.savedViews??[]),e=v(p=>p.activeViewId),r=v(p=>p.addView),t=v(p=>p.updateView),o=v(p=>p.deleteView),a=v(p=>p.duplicateView),s=v(p=>p.selectView),n=v(p=>p.reorderViews),l=v(p=>p.resetView);v(p=>p.julia);const u=C.useCallback(async()=>{await(r==null?void 0:r())},[r]),b=C.useCallback((p,R)=>t==null?void 0:t(p,{label:R}),[t]),y=C.useCallback(p=>t==null?void 0:t(p),[t]),M=C.useCallback(()=>l==null?void 0:l(),[l]),h=C.useCallback(p=>{const R=v.getState()._viewIsModified;if(R)return R(p.state);const g=v.getState().julia,x=p.state;return g.kind!==x.kind||g.maxIter!==x.maxIter||g.power!==x.power||Math.abs(g.zoom-x.zoom)>1e-5||Math.abs(g.center.x-x.center.x)+Math.abs(g.center.y-x.center.y)>1e-4||Math.abs(g.juliaC.x-x.juliaC.x)+Math.abs(g.juliaC.y-x.juliaC.y)>1e-4},[]),c=C.useMemo(()=>{const p=v.getState().setJulia,R=S=>{const w=v.getState().julia.center??{x:0,y:0};p==null||p({center:{x:w.x,y:w.y},zoom:S})},g=je.indexOf("mandelbrot"),x=je.indexOf("julia");return[{id:"reset",label:"RESET",onSelect:()=>M(),title:"Reset view to defaults"},{id:"home",label:"HOME",onSelect:()=>p==null?void 0:p({center:{x:0,y:0}}),title:"Center to (0, 0); keep zoom"},{id:"1x",label:"1:1",onSelect:()=>R(1),title:"Zoom 1×"},{id:"wide",label:"WIDE",onSelect:()=>R(.5),title:"Zoom out"},{id:"mand",label:"MAND",onSelect:()=>p==null?void 0:p({kind:g>=0?g:1}),title:"Switch to Mandelbrot kind"},{id:"julia",label:"JULIA",onSelect:()=>p==null?void 0:p({kind:x>=0?x:0}),title:"Switch to Julia kind"}]},[M]);return r?d.jsx(ti,{className:"flex flex-col bg-[#080808] -m-3",snapshots:i,activeId:e,onSelect:s,onRename:b,onUpdate:y,onDuplicate:a,onDelete:o,onReorder:n,isModified:h,emptyState:"No saved views — pan, zoom, tweak, then click New View",slotHintPrefix:null,presets:c,presetGridCols:3,toolbarBefore:d.jsx("div",{className:"px-2 pb-2 bg-black/40 border-b border-white/10",children:d.jsxs("button",{type:"button",onClick:u,className:"w-full bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1",children:[d.jsx(Pt,{})," New View"]})}),footer:d.jsxs(d.Fragment,{children:[d.jsx(Xo,{activeIdKey:"activeViewId",featureIds:["julia"],label:"Active View",onDeselect:()=>s==null?void 0:s(null)}),d.jsx("div",{className:"border-t border-white/10 bg-black/40 p-2",children:d.jsx(ii,{})})]})}):d.jsx("div",{className:"p-4 text-[10px] text-gray-600 italic",children:"View library not initialized."})};It();v.getState().setSampleCap(64);kt({enabled:!0,targetFps:45,minQuality:.4,interactionDownsample:.5,activityGraceMs:100,engageOnAccumOnly:!0});_t();ri();zt({getCanvas:()=>document.querySelector("canvas")});oi(["julia.center_x","julia.center_y","julia.zoom"]);Kt();Bt();Ot();Vt({hideShortcuts:!0});Jt.register({featureId:"julia",captureState:()=>{const i=v.getState();return{center:{...i.julia.center},zoom:i.julia.zoom}},applyState:i=>{v.getState().setJulia({center:i.center,zoom:i.zoom})}});Ut();qt();$t.registerHudHint({id:"fluid-toy-controls",slot:"bottom-left",order:0,component:_o});Yt.register({id:"fluid-toy.quality",slot:"bottom-left",order:10,component:ko});zo();Ho();Me.register("panel-views",Zo);Io();const ht=document.getElementById("root");if(!ht)throw new Error("Could not find root element to mount to");const Wo=Ht.createRoot(ht);Wo.render(d.jsx(Gt.StrictMode,{children:d.jsx(Lo,{})}));
