const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./HelpBrowser-B3XOo00M.js","./three-fiber-GKfjny8F.js","./three-DQWx7qFd.js","./PwaUpdate-CdP9UB3R.js","./three-drei-D6d-dyvY.js","./CollapsibleSection-vbdwAc1S.js","./pako-DwGzBETv.js"])))=>i.map(i=>d[i]);
import{u as w,f as W,g as te,a as z,b as fe,A as he,C as ge,c as Y,L as xe,d as ve,s as G,S as ye,e as X,V as be}from"./CollapsibleSection-vbdwAc1S.js";import{r as i,j as t,C as Se,R as $}from"./three-fiber-GKfjny8F.js";import{_ as we,r as Re,c as Me}from"./three-drei-D6d-dyvY.js";import{u as Ce,M as De}from"./useAppStartup-VEBPkw28.js";import{A as je,H as Ee,a as Fe,h as ke,M as Oe,b as Ie,c as Te,i as Pe,d as He,e as Ae,f as Ne,s as Le}from"./index-3DDzVG6D.js";import{c as ne,u as oe,C as _e,F as ze,a as U,p as Be,S as We,E as $e,D as Ue,b as Ve,P as Ye,T as Ge,d as q,G as Xe,e as qe,f as Ze,s as _,g as Qe,r as Ke,i as Je,h as et,j as tt,k as nt,l as ot,m as st}from"./PwaUpdate-CdP9UB3R.js";import{C as at}from"./CompilingIndicator-BHpZ9qM9.js";import{R as rt,u as it}from"./typedSlices-DrUmHqIN.js";import"./three-DQWx7qFd.js";import"./pako-DwGzBETv.js";import"./ModulationEngine-BEIbm57c.js";import"./AudioAnalysisEngine-DyaB3DyZ.js";import"./renderPopupRegistry-DFd-6fyz.js";const lt=e=>e,ct=e=>`set${e.charAt(0).toUpperCase()}${e.slice(1)}`,B=(e,n)=>{const r=w.getState()[ct(e.id)];typeof r=="function"&&r(n)},L=lt({id:"demo",name:"Demo",category:"Engine",tabConfig:{label:"Demo"},viewportConfig:{componentId:"overlay-demo",type:"dom"},params:{color:{type:"color",default:"#22d3ee",label:"Color",group:"Base"},position:{type:"vec2",default:{x:0,y:0},label:"Position",min:-1,max:1,step:.01,group:"Base"},size:{type:"float",default:120,label:"Size",min:20,max:400,step:1,group:"Base"},opacity:{type:"float",default:.9,label:"Opacity",min:0,max:1,step:.01,group:"Base"},count:{type:"int",default:8,label:"Duplicates",min:1,max:48,step:1,group:"Iteration"},iterOffset:{type:"vec2",default:{x:.04,y:.04},label:"Offset / step",min:-.5,max:.5,step:.005,group:"Iteration"},iterRotation:{type:"float",default:8,label:"Rotation / step (°)",min:-90,max:90,step:.5,group:"Iteration"},iterScale:{type:"float",default:.94,label:"Scale / step",min:.5,max:1.2,step:.005,group:"Iteration"},iterHueShift:{type:"float",default:18,label:"Hue shift / step (°)",min:-180,max:180,step:1,group:"Iteration"}}});W.register(L);const dt=({isReady:e,onFinished:n,bootEngine:s,isStartupReady:r})=>{const[a,o]=i.useState(1),[l,c]=i.useState(!0),d=i.useRef(!1);return i.useEffect(()=>{r&&!d.current&&(d.current=!0,s())},[r,s]),i.useEffect(()=>{if(!e)return;const m=setTimeout(()=>o(0),100),p=setTimeout(()=>{c(!1),n()},600);return()=>{clearTimeout(m),clearTimeout(p)}},[e,n]),l?t.jsx("div",{className:"fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-500",style:{opacity:a},children:t.jsx("div",{className:"text-white text-sm font-mono tracking-widest opacity-60",children:r?"Booting…":"Loading…"})}):null},mt=te(),Z=({onUpdate:e,onLoadingChange:n,autoUpdate:s,trigger:r,source:a})=>{const o=i.useRef(r);return i.useEffect(()=>{let l=0,c=0;const d=()=>{const m=r!==o.current;m&&(o.current=r),c++,(s&&c%60===0||m)&&(n==null||n(!0),mt.requestHistogramReadback(a).then(y=>{y.length>0&&e(y),n==null||n(!1)})),l=requestAnimationFrame(d)};return d(),()=>cancelAnimationFrame(l)},[s,r,a,e,n]),null},ut=te(),pt=/Firefox/i.test(navigator.userAgent);performance.now();const ft=()=>{const e=i.useRef(0);i.useRef(performance.now()),i.useRef(0);const{resolutionMode:n,setResolutionMode:s,setFixedResolution:r,fixedResolution:a,isExporting:o,isBroadcastMode:l,openContextMenu:c,aaLevel:d,setAALevel:m,renderMode:p,dpr:y}=w(),M=w.getState().quality,C=w(S=>S.isPaused),b=z(S=>S.isScrubbing),[F,f]=i.useState(!1),[x,v]=i.useState(60);i.useEffect(()=>(performance.now(),ut.frameCount,()=>{}),[C,b,o,l,p]);const R=S=>{const P=ne(S.currentTarget);P.length>0&&(S.preventDefault(),S.stopPropagation(),c(S.clientX,S.clientY,[],P))};if(l||!F)return null;const[j,I]=fe(w.getState()),h=j>480,O=()=>{const S=Math.max(320,Math.round(j*.66/8)*8),P=Math.max(240,Math.round(I*.66/8)*8);s("Fixed"),r(S,P),N()},g=d>1,k=()=>{m(1),N()},u=M,D=!((u==null?void 0:u.precisionMode)===1),T=()=>{const S=w.getState().setQuality,P=w.getState().setLighting;S&&S({precisionMode:1,bufferPrecision:1}),P&&P({shadows:!1}),N()},ue=!(u==null?void 0:u.dynamicScaling),pe=()=>{const S=w.getState().setQuality;S&&S({dynamicScaling:!0,adaptiveTarget:30}),N()},N=()=>{f(!1),e.current=-10};return t.jsx("div",{className:"absolute top-2 right-4 z-[50] pointer-events-auto animate-fade-in-left origin-top-right max-w-[200px]","data-help-id":"ui.performance",onContextMenu:R,children:t.jsxs("div",{className:"flex flex-col gap-1 bg-red-950/90 border border-red-500/30 rounded-lg shadow-xl backdrop-blur-md p-2",children:[t.jsxs("div",{className:"flex items-center justify-between mb-1",children:[t.jsxs("div",{className:"flex items-center gap-2 text-red-200 text-[10px] font-bold",children:[t.jsx(he,{}),t.jsxs("span",{children:["Low FPS (",x.toFixed(1),")"]})]}),t.jsx("button",{onClick:()=>{f(!1),e.current=-40},className:"text-red-400 hover:text-white transition-colors p-0.5",title:"Dismiss",children:t.jsx(ge,{})})]}),pt&&t.jsx("p",{className:"text-red-300/70 text-[8px] leading-tight mb-0.5",children:"Firefox has a known rendering overhead with OffscreenCanvas that reduces frame rate."}),t.jsxs("div",{className:"flex flex-col gap-1",children:[ue&&t.jsxs("button",{onClick:pe,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(Y,{})," Adaptive Resolution"]}),t.jsx("span",{className:"text-cyan-400 font-bold",children:"Fix"})]}),g&&t.jsxs("button",{onClick:k,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(xe,{})," Reset Scale (1x)"]}),t.jsx("span",{className:"text-cyan-400 font-bold",children:"Fix"})]}),D&&t.jsxs("button",{onClick:T,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(ve,{})," Enable Lite Mode"]}),t.jsx("span",{className:"text-cyan-400 font-bold",children:"Fix"})]}),h&&t.jsxs("button",{onClick:O,className:"flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5",children:[t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(Y,{})," Reduce Resolution"]}),t.jsx("span",{className:"text-cyan-400 font-bold",children:"-33%"})]})]})]})})},Q=12,ht=40,gt=()=>{const e=W.getViewportOverlays().filter(r=>r.type==="dom"),n=w(),s=w();return t.jsx("div",{className:"absolute inset-0 pointer-events-none z-[20]",children:e.map(r=>{const a=U.get(r.componentId),o=r.id,l=n[o];return a&&l?t.jsx(a,{featureId:o,sliceState:l,actions:s},r.id):null})})},xt=()=>{const e=W.getViewportOverlays().filter(r=>!r.type||r.type==="scene"),n=w(),s=w();return t.jsx(t.Fragment,{children:e.map(r=>{const a=U.get(r.componentId),o=r.id,l=n[o];return a&&l?t.jsx(a,{featureId:o,sliceState:l,actions:s},r.id):null})})},vt=({onSceneReady:e})=>{const n=w(),s=i.useRef(null),r=i.useRef(null),a=i.useRef(!1);oe();const[o,l]=i.useState({w:0,h:0});i.useLayoutEffect(()=>{if(!r.current)return;const h=(k,u)=>{const E=window.devicePixelRatio||1,D=w.getState();D.isBucketRendering||D.setCanvasPixelSize(Math.floor(k*E),Math.floor(u*E))},O=new ResizeObserver(k=>{for(const u of k){const E=Math.max(1,u.contentRect.width),D=Math.max(1,u.contentRect.height);l({w:E,h:D}),h(E,D)}});O.observe(r.current);const g=r.current.getBoundingClientRect();return g.width>0&&g.height>0&&(l({w:g.width,h:g.height}),h(g.width,g.height)),a.current||(a.current=!0,e()),()=>O.disconnect()},[]);const c=n.resolutionMode==="Fixed",[d,m]=n.fixedResolution,p=n.isBroadcastMode,y=40,M=Math.max(1,o.w-y),C=Math.max(1,o.h-y);let b=1;c&&(b=Math.min(1,M/d,C/m));const F=c?{width:d,height:m,transform:`scale(${b})`,transformOrigin:"center center",boxShadow:"0 0 50px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",flexShrink:0}:{width:"100%",height:"100%"},f=c?d*b:o.w,x=c?m*b:o.h,v=(o.h-x)/2,R=(o.w-f)/2,j=Math.max(Q,v-ht),I=Math.max(Q,R);return t.jsxs("div",{ref:r,className:"relative flex-1 flex items-center justify-center overflow-hidden bg-[#050505] touch-none",style:{backgroundImage:c?"radial-gradient(circle at center, #111 0%, #050505 100%)":"none"},onContextMenu:h=>{h.preventDefault(),h.stopPropagation()},onMouseEnter:()=>G(!0),onMouseLeave:()=>G(!1),children:[c&&t.jsx("div",{className:"absolute inset-0 opacity-20 pointer-events-none",style:{backgroundImage:"linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",backgroundSize:"40px 40px"}}),!p&&t.jsx(at,{}),!p&&t.jsx(ft,{}),!p&&t.jsx(je,{}),t.jsxs("div",{ref:s,style:F,className:"relative bg-[#111] group z-0",children:[t.jsx(Se,{gl:{alpha:!0,depth:!1,antialias:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1},camera:{position:[0,0,0],fov:60},style:{position:"absolute",inset:0,pointerEvents:"auto"},dpr:n.dpr,onPointerDown:h=>h.target.setPointerCapture(h.pointerId),children:t.jsx(xt,{})}),t.jsx(gt,{}),!p&&t.jsx(_e,{width:c?d:o.w,height:c?m:o.h}),!p&&n.histogramActiveCount>0&&t.jsx(Z,{onUpdate:h=>n.setHistogramData(h),onLoadingChange:h=>n.setHistogramLoading(h),autoUpdate:n.histogramAutoUpdate,trigger:n.histogramTrigger,source:"geometry"}),!p&&n.sceneHistogramActiveCount>0&&t.jsx(Z,{onUpdate:h=>n.setSceneHistogramData(h),autoUpdate:!0,trigger:n.sceneHistogramTrigger,source:"color"})]}),c&&!p&&t.jsx(ze,{width:d,height:m,top:j,left:I,maxAvailableWidth:o.w,maxAvailableHeight:o.h,onSetResolution:n.setFixedResolution,onSetMode:n.setResolutionMode})]})},yt=()=>{const e=w(n=>n.openContextMenu);i.useEffect(()=>{const n=s=>{if(s.defaultPrevented)return;const r=ne(s.target);r.length>0&&(s.preventDefault(),e(s.clientX,s.clientY,[],r))};return window.addEventListener("contextmenu",n),()=>window.removeEventListener("contextmenu",n)},[e])},bt=$.lazy(()=>we(()=>import("./HelpBrowser-B3XOo00M.js"),__vite__mapDeps([0,1,2,3,4,5,6]),import.meta.url)),St=()=>{const e=w(),[n,s]=i.useState(!1),[r,a]=i.useState(!0),o=i.useRef(null),l=i.useRef(null),c=i.useRef(null),d=i.useRef(null),m=i.useRef(null),p=i.useRef(null),y=i.useMemo(()=>({container:l,speed:c,dist:d,reset:m,reticle:p}),[]),{startupMode:M,bootEngine:C,isStartupReady:b}=Ce(),{isMobile:F,isPortrait:f}=oe();yt(),i.useEffect(()=>{Be()},[]);const x=F,v=e.isBroadcastMode,R=e.interactionMode!=="none",j=()=>{a(!1)},I=x&&!v?"min-h-[120vh] bg-black":"fixed inset-0 w-full h-full bg-black select-none overflow-hidden flex flex-col",h=Object.values(e.panels).filter(g=>g.location==="float"&&g.isOpen),O=i.useMemo(()=>({handleInteractionStart:e.handleInteractionStart,handleInteractionEnd:e.handleInteractionEnd,openContextMenu:e.openContextMenu}),[e.handleInteractionStart,e.handleInteractionEnd,e.openContextMenu]);return t.jsx(We,{value:O,children:t.jsxs("div",{className:I,children:[t.jsx($e,{}),t.jsx(rt,{}),t.jsx(Ue,{}),h.map(g=>t.jsx(Ve,{id:g.id,title:g.id,children:t.jsx(Ye,{activeTab:g.id,state:e,actions:e,onSwitchTab:k=>e.togglePanel(k,!0)})},g.id)),t.jsxs("div",{ref:o,className:`relative bg-black select-none ${R?"cursor-crosshair":""} flex flex-col ${x&&!v?"h-[100vh] sticky top-0 overflow-hidden shadow-2xl":"w-full h-full"}`,onContextMenu:g=>g.preventDefault(),children:[t.jsx(dt,{isReady:n,onFinished:j,startupMode:M,bootEngine:C,isStartupReady:b}),x&&f&&!r&&!v&&t.jsxs("div",{className:"fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 text-center text-white",children:[t.jsx("div",{className:"text-cyan-400 mb-6 animate-bounce",children:t.jsx(ye,{})}),t.jsx("h2",{className:"text-2xl font-bold tracking-tight mb-2",children:"Landscape Recommended"}),t.jsx("p",{className:"text-gray-500 text-sm font-mono",children:"Rotate device to access controls."})]}),t.jsx(Ge,{}),t.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[!v&&!x&&t.jsx(q,{side:"left"}),t.jsx(vt,{hudRefs:y,onSceneReady:()=>s(!0),activeHint:null,onDismissHint:()=>{}}),t.jsx(Ee,{}),!v&&t.jsx(q,{side:"right"})]}),t.jsx(Fe,{}),!v&&t.jsx(De,{}),e.contextMenu.visible&&!v&&t.jsx(Xe,{x:e.contextMenu.x,y:e.contextMenu.y,items:e.contextMenu.items,targetHelpIds:e.contextMenu.targetHelpIds,onClose:e.closeContextMenu,onOpenHelp:e.openHelp}),e.helpWindow.visible&&t.jsx(i.Suspense,{fallback:null,children:t.jsx(bt,{activeTopicId:e.helpWindow.activeTopicId,onClose:e.closeHelp,onNavigate:e.openHelp})}),t.jsx(qe,{hidden:v})]})]})})};let se=null;const K=e=>{se=e},ae=()=>se,re=`// Side-effect import — registers DemoFeature with the engine BEFORE
// anything touches the store (createFeatureSlice freezes the registry
// on first store access).
import './demo/registerFeatures';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerUI } from './engine/features/ui';
import { wireDemoPanel } from './demo/setup';
import { getDemoCanvas } from './demo/demoCanvasRef';
import { demoRenderRunner } from './demo/demoRenderRunner';

import { installTopBar } from './engine/plugins/TopBar';
import { installSceneIO } from './engine/plugins/SceneIO';
import { installShortcuts } from './engine/plugins/Shortcuts';
import { installUndo } from './engine/plugins/Undo';
import { installMenu } from './engine/plugins/Menu';
import { installHelp } from './engine/plugins/Help';
import { installHud } from './engine/plugins/Hud';
import { installModulation } from './engine/animation/modulationTick';
import { installModulationUI, setLfoListConfig } from './engine/components/modulation';
import { installRenderDialog } from './engine/plugins/RenderDialog';
import { installPwaUpdate } from './engine/plugins/PwaUpdate';

// Boots the engine's UI registry (AutoFeaturePanel + built-in widgets).
registerUI();

// Plugin installs. Order matters in two places:
//   - installMenu() before installHelp(); Help registers a dropdown
//     into the menu host.
//   - installTopBar() before plugins that put items in the topbar.
//
// Lines between SHOWCASE markers are sliced verbatim into the
// on-screen explainer panel via Vite \`?raw\` — keep them readable.
// __SHOWCASE_START__
installTopBar();
installSceneIO({ getCanvas: () => getDemoCanvas() });
installShortcuts();
installUndo();
installMenu();
installHelp();
installHud();
installModulation();
installModulationUI();
installRenderDialog({ runner: demoRenderRunner, showSamplesPerFrame: false, disableDiskMode: true });
// __SHOWCASE_END__

// PWA update pill — same Update banner the sibling apps mount so users
// don't get stranded on stale bundles. Not inside the SHOWCASE block
// because it's deployment plumbing, not a feature being showcased.
installPwaUpdate();

// A fresh LFO defaults to demo.position_x — gives the user a visible
// wiggle the moment they hit "Add LFO".
setLfoListConfig({ defaultTarget: 'demo.position_x' });

// Demo-flavoured wiring: panel manifest, custom shortcuts, hint pill.
wireDemoPanel();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
`,wt=`import { defineFeature, type FeatureState } from '../engine/features/setFeature';

// One declarative object → Zustand slice + auto-generated panel +
// save/load round-trip + undo/redo + animatable params. No bespoke
// wiring per feature.
//
// \`defineFeature\` preserves the params literal types so setFeature /
// getFeature can infer \`DemoState\` automatically — no manual interface.

export const DemoFeature = defineFeature({
    id: 'demo',
    name: 'Demo',
    category: 'Engine',
    tabConfig: { label: 'Demo' },
    // viewportConfig mounts a feature-scoped overlay inside the
    // viewport. componentId resolves through componentRegistry (see
    // setup.ts).
    viewportConfig: { componentId: 'overlay-demo', type: 'dom' },
    params: {
        color:        { type: 'color', default: '#22d3ee', label: 'Color', group: 'Base' },
        position:     { type: 'vec2',  default: { x: 0, y: 0 },     label: 'Position', min: -1, max: 1, step: 0.01, group: 'Base' },
        size:         { type: 'float', default: 120,                label: 'Size',     min: 20, max: 400, step: 1, group: 'Base' },
        opacity:      { type: 'float', default: 0.9,                label: 'Opacity',  min: 0,  max: 1,   step: 0.01, group: 'Base' },
        count:        { type: 'int',   default: 8,                  label: 'Duplicates',          min: 1,    max: 48,  step: 1,    group: 'Iteration' },
        iterOffset:   { type: 'vec2',  default: { x: 0.04, y: 0.04 }, label: 'Offset / step',     min: -0.5, max: 0.5, step: 0.005, group: 'Iteration' },
        iterRotation: { type: 'float', default: 8,                  label: 'Rotation / step (°)', min: -90,  max: 90,  step: 0.5,  group: 'Iteration' },
        iterScale:    { type: 'float', default: 0.94,               label: 'Scale / step',        min: 0.5,  max: 1.2, step: 0.005, group: 'Iteration' },
        iterHueShift: { type: 'float', default: 18,                 label: 'Hue shift / step (°)', min: -180, max: 180, step: 1, group: 'Iteration' },
    },
});

// Keep the named DemoState export — DemoOverlay imports it. It used to
// be a hand-written interface; now it's inferred from the feature so
// the param types stay in sync automatically.
export type DemoState = FeatureState<typeof DemoFeature>;
`,Rt=`import { featureRegistry } from '../engine/FeatureSystem';
import { DemoFeature } from './DemoFeature';

// Side-effect import. Must run BEFORE anything touches the engine
// store (createFeatureSlice freezes the registry on first store
// access). Canonical pattern: \`import './demo/registerFeatures'\` at
// the top of \`index.tsx\`, before any module that pulls in the store.
//
// Don't import DemoOverlay here — it reads useEngineStore via
// useLiveModulations, which would freeze the registry mid-import.
// Component registration is deferred to setup.ts.
featureRegistry.register(DemoFeature);
`,Mt=`import { useEngineStore } from '../store/engineStore';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { applyPanelManifest } from '../engine/PanelManifest';
import { shortcuts } from '../engine/plugins/Shortcuts';
import { help } from '../engine/plugins/Help';
import { setFeature } from '../engine/features/setFeature';
import { DemoFeature } from './DemoFeature';
import { DemoOverlay } from './DemoOverlay';

// Panel manifest + custom shortcuts + hint pill. Runs after the store
// exists (registerFeatures runs before, where the freeze happens).

const randomHex = (): string => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
const rand = (min: number, max: number, step = 0.001): number => {
    const v = min + Math.random() * (max - min);
    return Math.round(v / step) * step;
};

const randomLayout = () => {
    setFeature(DemoFeature, {
        count:        Math.round(rand(5, 18, 1)),
        iterOffset:   { x: rand(-0.08, 0.08, 0.005), y: rand(-0.08, 0.08, 0.005) },
        iterRotation: rand(-20, 20, 0.5),
        iterScale:    rand(0.85, 1.05, 0.005),
        iterHueShift: rand(-30, 30, 1),
    });
};

export const wireDemoPanel = () => {
    componentRegistry.register('overlay-demo', DemoOverlay);

    applyPanelManifest([
        { id: 'Demo',      dock: 'right', order: 0, features: ['demo'] },
        { id: 'Animation', dock: 'right', order: 1, items: [{ type: 'widget', id: 'lfo-list' }] },
    ]);
    const store = useEngineStore.getState();
    store.movePanel('Demo', 'right', 0);
    store.movePanel('Animation', 'right', 1);
    store.togglePanel('Demo', true);

    // R = randomize colour, L = randomize layout, S = scramble both.
    // Routed through setDemo so each press is one undo entry.
    shortcuts.register({
        id: 'demo.randomize', key: 'R', description: 'Randomize the demo square color', category: 'Demo',
        handler: () => setFeature(DemoFeature, { color: randomHex() }),
    });
    shortcuts.register({
        id: 'demo.randomizeLayout', key: 'L', description: 'Randomize the duplicate-stack layout', category: 'Demo',
        handler: randomLayout,
    });
    shortcuts.register({
        id: 'demo.scramble', key: 'S', description: 'Scramble color + layout', category: 'Demo',
        handler: () => {
            setFeature(DemoFeature, { color: randomHex() });
            randomLayout();
        },
    });

    help.registerHudHint({
        id: 'demo.hints', slot: 'bottom-left', order: 0, badge: '[Demo]',
        keys: [
            { key: 'R',      label: 'Randomize color' },
            { key: 'L',      label: 'Randomize layout' },
            { key: 'S',      label: 'Scramble both' },
            { key: 'Ctrl+Z', label: 'Undo' },
            { key: 'Ctrl+Y', label: 'Redo' },
        ],
    });
};
`,Ct=`// Module-level handle so that SceneIO (installed at boot) can find
// the demo's canvas, which doesn't exist until <DemoOverlay /> mounts.
// \`installSceneIO({ getCanvas: () => getDemoCanvas() })\` re-evaluates
// on every snapshot, so it correctly returns null pre-mount and the
// live canvas afterwards.

let _canvas: HTMLCanvasElement | null = null;

export const setDemoCanvas = (canvas: HTMLCanvasElement | null): void => {
    _canvas = canvas;
};

export const getDemoCanvas = (): HTMLCanvasElement | null => _canvas;
`,Dt=`import React, { useEffect, useRef } from 'react';
import { useLiveModulations } from '../engine/typedSlices';
import type { FeatureComponentProps } from '../components/registry/ComponentRegistry';
import type { DemoState } from './DemoFeature';
import { setDemoCanvas } from './demoCanvasRef';
import { DemoExplainer } from './DemoExplainer';

// Canvas-2d painter. Reads each numeric param via
// \`liveMod[target] ?? sliceState[param]\` so every slider reacts to
// LFOs / audio rules / future modulation drivers without this file
// knowing they exist. Vec components follow the \`feature.param_axis\`
// convention AnimationEngine writes.

const toCssColor = (c: any): string => {
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object' && 'getHexString' in c) return \`#\${c.getHexString()}\`;
    if (c && typeof c === 'object' && 'r' in c) {
        const to255 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
        return \`rgb(\${to255(c.r)}, \${to255(c.g)}, \${to255(c.b)})\`;
    }
    return '#888888';
};

export const DemoOverlay: React.FC<FeatureComponentProps> = ({ sliceState }) => {
    const demo = sliceState as DemoState | undefined;
    const liveMod = useLiveModulations();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Publish + retract the canvas to the module ref so SceneIO finds
    // it for snapshots.
    useEffect(() => {
        setDemoCanvas(canvasRef.current);
        return () => setDemoCanvas(null);
    }, []);

    // Keep the drawing buffer in sync with displayed size × DPR.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const sync = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (w === 0 || h === 0) return;
            const tw = Math.max(1, Math.floor(w * dpr));
            const th = Math.max(1, Math.floor(h * dpr));
            if (canvas.width !== tw)  canvas.width  = tw;
            if (canvas.height !== th) canvas.height = th;
        };
        sync();
        const ro = new ResizeObserver(sync);
        ro.observe(canvas);
        return () => ro.disconnect();
    }, []);

    // Repaint on every render — modulation tick + slice changes both
    // cause a re-render, so this fires whenever the visual should
    // change.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !demo) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const liveOrBase = (target: string, base: number): number => {
            const v = liveMod[target];
            return typeof v === 'number' ? v : base;
        };

        const size       = liveOrBase('demo.size',         demo.size);
        const opacity    = liveOrBase('demo.opacity',      demo.opacity);
        const posX       = liveOrBase('demo.position_x',   demo.position.x);
        const posY       = liveOrBase('demo.position_y',   demo.position.y);
        const count      = Math.max(1, Math.min(48, Math.round(liveOrBase('demo.count', demo.count))));
        const offX       = liveOrBase('demo.iterOffset_x', demo.iterOffset.x);
        const offY       = liveOrBase('demo.iterOffset_y', demo.iterOffset.y);
        const rotStepDeg = liveOrBase('demo.iterRotation', demo.iterRotation);
        const scaleStep  = liveOrBase('demo.iterScale',    demo.iterScale);
        const hueStep    = liveOrBase('demo.iterHueShift', demo.iterHueShift);

        const dpr      = window.devicePixelRatio || 1;
        const widthCss = canvas.width  / dpr;
        const heightCss = canvas.height / dpr;
        const cx       = widthCss  * (0.5 + posX * 0.4);
        const cy       = heightCss * (0.5 - posY * 0.4);
        const dx       = offX * 200;
        const dy       = -offY * 200;
        const rotStep  = (rotStepDeg * Math.PI) / 180;
        const baseColor = toCssColor(demo.color);

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Opaque background — keeps \`globalAlpha < 1\` blends consistent
        // between the on-screen view and the saved PNG / video. Without
        // it the alpha-preserved file flattens against white in viewers
        // and looks ultra-saturated.
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, widthCss, heightCss);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';

        // Back-to-front so the base square sits on top of its trail.
        for (let i = count - 1; i >= 0; i--) {
            const scale = Math.pow(scaleStep, i);
            const fade  = count > 1 ? 1 - i / (count + 2) : 1;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, opacity * fade));
            ctx.filter = hueStep ? \`hue-rotate(\${hueStep * i}deg)\` : 'none';
            ctx.translate(cx + dx * i, cy + dy * i);
            ctx.rotate(rotStep * i);
            ctx.scale(scale, scale);
            ctx.fillStyle = baseColor;
            const half = size * 0.5;
            const radius = Math.min(8, half);
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(-half, -half, size, size, radius);
            } else {
                ctx.rect(-half, -half, size, size);
            }
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    });

    if (!demo) return null;
    return (
        <>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            {/* Pure DOM, NOT painted into the canvas — so PNG / video
             *  exports stay caption-free. */}
            <DemoExplainer />
        </>
    );
};
`,jt=`// Demo's per-frame export pipeline. Plugged into the engine's render
// dialog plugin; the dialog owns UI + flags + status, the runner owns
// the actual encode.

import { useAnimationStore } from '../store/animationStore';
import { animationEngine } from '../engine/AnimationEngine';
import { applyModulationsAt } from '../engine/features/modulation/applyAt';
import { MainThreadEncoder } from '../engine/export/videoEncoder';
import { VIDEO_FORMATS } from '../data/constants';
import { downloadBlob } from '../utils/SceneFormat';
import { calcEtaRange } from '../components/timeline/exportHelpers';
import type { RenderDialogRunner } from '../engine/plugins/RenderDialog';
import { getDemoCanvas } from './demoCanvasRef';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
// One yield (microtask + macrotask) is enough for slice changes from
// animationEngine.scrub() to flush through the demo's repaint useEffect
// before we sample the canvas. Apps with TSAA / accumulation need their
// own convergence loop in their runner.
const yieldToReact = () => sleep(0);

export const demoRenderRunner: RenderDialogRunner = async ({ cfg, flags, status, isDiskMode }) => {
    const canvas = getDemoCanvas();
    if (!canvas) {
        alert('Demo canvas not mounted yet — close this dialog and re-open after the canvas paints.');
        status.setIsRendering(false);
        return;
    }

    // Even-pixel align — H.264 / HEVC chroma subsampling rejects odd
    // dimensions. WebM doesn't care but the rule is uniform.
    const safeWidth  = Math.max(2, Math.floor(cfg.width  / 2) * 2);
    const safeHeight = Math.max(2, Math.floor(cfg.height / 2) * 2);

    // Snapshot state we'll restore on finish / cancel.
    const prevCanvasW    = canvas.width;
    const prevCanvasH    = canvas.height;
    const animStore      = useAnimationStore.getState();
    const prevWasPlaying = animStore.isPlaying;
    const prevFrame      = animStore.currentFrame;

    // Resize the drawing buffer to the export dimensions. The overlay's
    // ResizeObserver only watches CSS size, so the override sticks.
    canvas.width  = safeWidth;
    canvas.height = safeHeight;

    const encoder = new MainThreadEncoder();
    const totalFrames = Math.max(1, Math.floor((cfg.endFrame - cfg.startFrame) / Math.max(1, cfg.frameStep)) + 1);
    status.setIsRendering(true);
    status.setProgress(0);
    status.setStatusText('Starting encoder…');

    try {
        await encoder.start(
            { width: safeWidth, height: safeHeight, fps: cfg.fps, bitrate: cfg.bitrate, formatIndex: cfg.formatIndex },
            null,
        );
        status.setStatusText('Rendering to RAM…');

        const dt = 1 / cfg.fps;
        let lastFrameStart = Date.now();

        for (let i = 0; i < totalFrames; i++) {
            if (flags.cancelledRef.current)   break;
            if (flags.finishEarlyRef.current) break;

            // Pause loop — honour Interrupt until user resumes / discards / finishes.
            while (flags.stoppingRef.current && !flags.cancelledRef.current && !flags.finishEarlyRef.current) {
                await sleep(100);
            }
            if (flags.cancelledRef.current)   break;
            if (flags.finishEarlyRef.current) break;

            const timelineFrame = cfg.startFrame + i * Math.max(1, cfg.frameStep);
            const time          = timelineFrame * dt;

            // Scrub timeline + apply oscillator + rule modulations for
            // this frame's deterministic time.
            animationEngine.scrub(timelineFrame);
            applyModulationsAt(time, dt);

            // Yield so React commits the slice writes through the
            // overlay's repaint useEffect before we sample the canvas.
            await yieldToReact();
            encoder.encodeCanvas(canvas, i);

            const now = Date.now();
            status.setLastFrameTime((now - lastFrameStart) / 1000);
            lastFrameStart = now;

            const elapsed = (now - flags.startTimeRef.current) / 1000;
            status.setElapsedTime(elapsed);
            status.setEtaRange(calcEtaRange(elapsed, i + 1, totalFrames));
            status.setProgress((i + 1) / totalFrames);
            status.setStatusText(\`Frame \${i + 1} / \${totalFrames}\`);
        }

        if (flags.cancelledRef.current) {
            encoder.cancel();
            status.setStatusText('Cancelled.');
        } else {
            status.setStatusText('Finalising file…');
            const buffer = await encoder.finish();
            if (buffer) {
                const formatDef = VIDEO_FORMATS[cfg.formatIndex];
                const blob = new Blob([buffer], { type: formatDef.mime });
                const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                downloadBlob(blob, \`demo-\${stamp}.\${formatDef.ext}\`);
                status.setStatusText(flags.finishEarlyRef.current ? 'Finished early.' : 'Saved.');
            }
        }
    } catch (e) {
        encoder.cancel();
        status.setStatusText(\`Error: \${e instanceof Error ? e.message : String(e)}\`);
    } finally {
        canvas.width  = prevCanvasW;
        canvas.height = prevCanvasH;
        animationEngine.scrub(prevFrame);
        if (prevWasPlaying) useAnimationStore.getState().play();
        status.setIsRendering(false);
        status.setIsStopping(false);
    }
    // isDiskMode could route through showSaveFilePicker for streaming
    // disk writes — the demo doesn't need it (output is small).
    void isDiskMode;
};
`,Et="// __SHOWCASE_START__",Ft="// __SHOWCASE_END__",kt=e=>{const n=e.indexOf(Et),s=e.indexOf(Ft);return n===-1||s===-1||s<n?"// (showcase markers missing)":e.slice(e.indexOf(`
`,n)+1,s).replace(/\s+$/g,"")},A=[{path:"index.tsx",code:re},{path:"demo/DemoFeature.ts",code:wt},{path:"demo/registerFeatures.ts",code:Rt},{path:"demo/setup.ts",code:Mt},{path:"demo/demoCanvasRef.ts",code:Ct},{path:"demo/DemoOverlay.tsx",code:Dt},{path:"demo/demoRenderRunner.ts",code:jt}],ie=e=>e.split(`
`).length,le=A.reduce((e,n)=>e+ie(n.code),0),Ot=kt(re),ce=$.memo(()=>{const[e,n]=i.useState(!1);return t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"absolute top-4 left-4 max-w-[420px] pointer-events-none select-none",children:[t.jsx("div",{className:"text-cyan-500/80 text-[10px] font-mono tracking-wider mb-2",children:"// GMT engine — generic plugin host"}),t.jsxs("p",{className:"text-xs leading-relaxed text-gray-400 mb-3",children:["Everything in this app — the right-dock Demo panel, sliders, undo, save / load, PNG snapshot (Alt+S), video export, keyboard shortcuts, modulation timeline — boots up from the lines below. The ",t.jsx("code",{className:"text-gray-300",children:"DemoFeature"})," itself is a single declarative object whose params become a Zustand slice, an auto-generated panel, and a save/load round-trip — for free."]}),t.jsx("pre",{className:"text-[10px] font-mono leading-relaxed text-gray-500 bg-black/30 border border-white/5 rounded px-3 py-2.5 whitespace-pre overflow-x-auto pointer-events-auto select-text",children:Ot}),t.jsx("div",{className:"mt-3 flex items-center gap-3 pointer-events-auto",children:t.jsxs("button",{type:"button",onClick:()=>n(!0),className:"text-[10px] font-mono text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 rounded px-2.5 py-1 transition-colors",children:["Show full source (",A.length," files, ",le," lines)"]})})]}),e&&t.jsx(It,{onClose:()=>n(!1)})]})});ce.displayName="DemoExplainer";const It=({onClose:e})=>{const[n,s]=i.useState(0),r=A[n];return i.useEffect(()=>{const a=o=>{o.key==="Escape"&&e()};return window.addEventListener("keydown",a),()=>window.removeEventListener("keydown",a)},[e]),Re.createPortal(t.jsx("div",{className:"fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-6",onClick:e,children:t.jsxs("div",{className:"bg-neutral-950 border border-white/10 rounded-lg shadow-2xl w-[min(960px,100%)] h-[min(800px,100%)] flex flex-col",onClick:a=>a.stopPropagation(),children:[t.jsxs("div",{className:"flex items-center justify-between px-4 py-3 border-b border-white/10",children:[t.jsxs("div",{children:[t.jsx("div",{className:"text-cyan-400 text-sm font-semibold",children:"Demo source"}),t.jsxs("div",{className:"text-gray-500 text-[10px] font-mono",children:[A.length," files · ",le," lines · live from this build"]})]}),t.jsx("button",{type:"button",onClick:e,className:"text-gray-400 hover:text-white text-lg leading-none px-2","aria-label":"Close source viewer",children:"✕"})]}),t.jsx("div",{className:"flex flex-wrap gap-1 px-3 py-2 border-b border-white/10 bg-black/30",children:A.map((a,o)=>t.jsxs("button",{type:"button",onClick:()=>s(o),className:"text-[11px] font-mono px-2.5 py-1 rounded transition-colors "+(o===n?"bg-cyan-500/15 text-cyan-300 border border-cyan-500/40":"text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"),children:[a.path,t.jsxs("span",{className:"text-gray-600 ml-1.5",children:[ie(a.code),"L"]})]},a.path))}),t.jsx("div",{className:"flex-1 overflow-auto bg-black/40 p-4",children:t.jsx("pre",{className:"text-[11px] font-mono leading-relaxed text-gray-300 whitespace-pre select-text",children:r.code.replace(/\s+$/,"")})})]})}),document.body)},Tt=e=>{if(typeof e=="string")return e;if(e&&typeof e=="object"&&"getHexString"in e)return`#${e.getHexString()}`;if(e&&typeof e=="object"&&"r"in e){const n=s=>Math.max(0,Math.min(255,Math.round(s*255)));return`rgb(${n(e.r)}, ${n(e.g)}, ${n(e.b)})`}return"#888888"},Pt=({sliceState:e})=>{const n=e,s=it(),r=i.useRef(null);return i.useEffect(()=>(K(r.current),()=>K(null)),[]),i.useEffect(()=>{const a=r.current;if(!a)return;const o=()=>{const c=window.devicePixelRatio||1,d=a.clientWidth,m=a.clientHeight;if(d===0||m===0)return;const p=Math.max(1,Math.floor(d*c)),y=Math.max(1,Math.floor(m*c));a.width!==p&&(a.width=p),a.height!==y&&(a.height=y)};o();const l=new ResizeObserver(o);return l.observe(a),()=>l.disconnect()},[]),i.useEffect(()=>{const a=r.current;if(!a||!n)return;const o=a.getContext("2d");if(!o)return;const l=(u,E)=>{const D=s[u];return typeof D=="number"?D:E},c=l("demo.size",n.size),d=l("demo.opacity",n.opacity),m=l("demo.position_x",n.position.x),p=l("demo.position_y",n.position.y),y=Math.max(1,Math.min(48,Math.round(l("demo.count",n.count)))),M=l("demo.iterOffset_x",n.iterOffset.x),C=l("demo.iterOffset_y",n.iterOffset.y),b=l("demo.iterRotation",n.iterRotation),F=l("demo.iterScale",n.iterScale),f=l("demo.iterHueShift",n.iterHueShift),x=window.devicePixelRatio||1,v=a.width/x,R=a.height/x,j=v*(.5+m*.4),I=R*(.5-p*.4),h=M*200,O=-C*200,g=b*Math.PI/180,k=Tt(n.color);o.save(),o.setTransform(x,0,0,x,0,0),o.fillStyle="#111111",o.fillRect(0,0,v,R),o.lineWidth=1,o.strokeStyle="rgba(255, 255, 255, 0.1)";for(let u=y-1;u>=0;u--){const E=Math.pow(F,u),D=y>1?1-u/(y+2):1;o.save(),o.globalAlpha=Math.max(0,Math.min(1,d*D)),o.filter=f?`hue-rotate(${f*u}deg)`:"none",o.translate(j+h*u,I+O*u),o.rotate(g*u),o.scale(E,E),o.fillStyle=k;const T=c*.5,V=Math.min(8,T);o.beginPath(),typeof o.roundRect=="function"?o.roundRect(-T,-T,c,c,V):o.rect(-T,-T,c,c),o.fill(),o.stroke(),o.restore()}o.restore()}),n?t.jsxs(t.Fragment,{children:[t.jsx("canvas",{ref:r,className:"absolute inset-0 w-full h-full pointer-events-none"}),t.jsx(ce,{})]}):null},J=()=>"#"+Math.floor(Math.random()*16777215).toString(16).padStart(6,"0"),H=(e,n,s=.001)=>{const r=e+Math.random()*(n-e);return Math.round(r/s)*s},ee=()=>{B(L,{count:Math.round(H(5,18,1)),iterOffset:{x:H(-.08,.08,.005),y:H(-.08,.08,.005)},iterRotation:H(-20,20,.5),iterScale:H(.85,1.05,.005),iterHueShift:H(-30,30,1)})},Ht=()=>{U.register("overlay-demo",Pt),Ze([{id:"Demo",dock:"right",order:0,features:["demo"]},{id:"Animation",dock:"right",order:1,items:[{type:"widget",id:"lfo-list"}]}]);const e=w.getState();e.movePanel("Demo","right",0),e.movePanel("Animation","right",1),e.togglePanel("Demo",!0),_.register({id:"demo.randomize",key:"R",description:"Randomize the demo square color",category:"Demo",handler:()=>B(L,{color:J()})}),_.register({id:"demo.randomizeLayout",key:"L",description:"Randomize the duplicate-stack layout",category:"Demo",handler:ee}),_.register({id:"demo.scramble",key:"S",description:"Scramble color + layout",category:"Demo",handler:()=>{B(L,{color:J()}),ee()}}),ke.registerHudHint({id:"demo.hints",slot:"bottom-left",order:0,badge:"[Demo]",keys:[{key:"R",label:"Randomize color"},{key:"L",label:"Randomize layout"},{key:"S",label:"Scramble both"},{key:"Ctrl+Z",label:"Undo"},{key:"Ctrl+Y",label:"Redo"}]})},de=e=>new Promise(n=>setTimeout(n,e)),At=()=>de(0),Nt=async({cfg:e,flags:n,status:s,isDiskMode:r})=>{const a=ae();if(!a){alert("Demo canvas not mounted yet — close this dialog and re-open after the canvas paints."),s.setIsRendering(!1);return}const o=Math.max(2,Math.floor(e.width/2)*2),l=Math.max(2,Math.floor(e.height/2)*2),c=a.width,d=a.height,m=z.getState(),p=m.isPlaying,y=m.currentFrame;a.width=o,a.height=l;const M=new Oe,C=Math.max(1,Math.floor((e.endFrame-e.startFrame)/Math.max(1,e.frameStep))+1);s.setIsRendering(!0),s.setProgress(0),s.setStatusText("Starting encoder…");try{await M.start({width:o,height:l,fps:e.fps,bitrate:e.bitrate,formatIndex:e.formatIndex},null),s.setStatusText("Rendering to RAM…");const b=1/e.fps;let F=Date.now();for(let f=0;f<C&&!(n.cancelledRef.current||n.finishEarlyRef.current);f++){for(;n.stoppingRef.current&&!n.cancelledRef.current&&!n.finishEarlyRef.current;)await de(100);if(n.cancelledRef.current||n.finishEarlyRef.current)break;const x=e.startFrame+f*Math.max(1,e.frameStep),v=x*b;X.scrub(x),Ie(v,b),await At(),M.encodeCanvas(a,f);const R=Date.now();s.setLastFrameTime((R-F)/1e3),F=R;const j=(R-n.startTimeRef.current)/1e3;s.setElapsedTime(j),s.setEtaRange(Te(j,f+1,C)),s.setProgress((f+1)/C),s.setStatusText(`Frame ${f+1} / ${C}`)}if(n.cancelledRef.current)M.cancel(),s.setStatusText("Cancelled.");else{s.setStatusText("Finalising file…");const f=await M.finish();if(f){const x=be[e.formatIndex],v=new Blob([f],{type:x.mime}),R=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);Qe(v,`demo-${R}.${x.ext}`),s.setStatusText(n.finishEarlyRef.current?"Finished early.":"Saved.")}}}catch(b){M.cancel(),s.setStatusText(`Error: ${b instanceof Error?b.message:String(b)}`)}finally{a.width=c,a.height=d,X.scrub(y),p&&z.getState().play(),s.setIsRendering(!1),s.setIsStopping(!1)}};Ke();Je();et({getCanvas:()=>ae()});tt();nt();ot();Pe();He();Ae();Ne({runner:Nt,showSamplesPerFrame:!1,disableDiskMode:!0});st();Le({defaultTarget:"demo.position_x"});Ht();const me=document.getElementById("root");if(!me)throw new Error("Could not find root element to mount to");Me.createRoot(me).render(t.jsx($.StrictMode,{children:t.jsx(St,{})}));
