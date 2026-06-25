const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./HelpBrowser-CFu3FHLf.js","./three-fiber-GKfjny8F.js","./three-DQWx7qFd.js","./Undo-BkVnS3BI.js","./CollapsibleSection-Ct4WF3DD.js","./three-drei-D2x72drd.js","./pako-DwGzBETv.js","./CollapsibleSection-DrbQpp3u.css"])))=>i.map(i=>d[i]);
import{u as C,f as _,g as re,s as B,c as z,z as ie,S as le,a as ce,L as de,b as A,d as W,e as $,V as me,h as ue,i as pe}from"./CollapsibleSection-Ct4WF3DD.js";import{r as l,j as n,C as fe,R as L}from"./three-fiber-GKfjny8F.js";import{_ as he,c as ge}from"./three-drei-D2x72drd.js";import{P as xe,u as ve,M as ye}from"./MobileControls-6buWpzHD.js";import{A as be,H as Se,a as we,h as Re,i as Me,b as De,c as Ce,s as Ee}from"./modulationTick-tPPgKwcc.js";import{u as Z,p as Fe,E as Oe,D as ke,a as Te,P as je,T as Ie,b as U,G as He,c as Pe,d as Ae,r as Ne,i as _e,e as ze,f as Le,g as Be,h as We}from"./Undo-BkVnS3BI.js";import{C as $e,F as Ue}from"./CompositionOverlay-D7kNe2FZ.js";import{C as Ve}from"./CompilingIndicator-BSHSldoh.js";import{u as Ge}from"./useGlobalContextMenu-D_D4J2Vl.js";import{R as Ye}from"./RenderLoop-Cic_F7n_.js";import{u as qe}from"./typedSlices-LT7AzGc2.js";import{M as Xe,a as Ze,c as Ke,i as Je}from"./applyAt-CnEL1kx8.js";import"./pako-DwGzBETv.js";import"./three-DQWx7qFd.js";import"./AudioAnalysisEngine-DyaB3DyZ.js";import"./ModulationEngine-fGx0zqS8.js";import"./renderPopupRegistry-49PcnqqE.js";import"./createSingleSlot-BAHyf9Ga.js";const Qe=e=>e,et=e=>`set${e.charAt(0).toUpperCase()}${e.slice(1)}`,N=(e,t)=>{const r=C.getState()[et(e.id)];typeof r=="function"&&r(t)},P=Qe({id:"demo",name:"Demo",category:"Engine",tabConfig:{label:"Demo"},viewportConfig:{componentId:"overlay-demo",type:"dom"},params:{color:{type:"color",default:"#22d3ee",label:"Color",group:"Base"},position:{type:"vec2",default:{x:0,y:0},label:"Position",min:-1,max:1,step:.01,group:"Base"},size:{type:"float",default:120,label:"Size",min:20,max:400,step:1,group:"Base"},opacity:{type:"float",default:.9,label:"Opacity",min:0,max:1,step:.01,group:"Base"},count:{type:"int",default:8,label:"Duplicates",min:1,max:48,step:1,group:"Iteration"},iterOffset:{type:"vec2",default:{x:.04,y:.04},label:"Offset / step",min:-.5,max:.5,step:.005,group:"Iteration"},iterRotation:{type:"float",default:8,label:"Rotation / step (°)",min:-90,max:90,step:.5,group:"Iteration"},iterScale:{type:"float",default:.94,label:"Scale / step",min:.5,max:1.2,step:.005,group:"Iteration"},iterHueShift:{type:"float",default:18,label:"Hue shift / step (°)",min:-180,max:180,step:1,group:"Iteration"}}});_.register(P);const tt=({isReady:e,onFinished:t,bootEngine:a,isStartupReady:r})=>{const[s,o]=l.useState(1),[i,c]=l.useState(!0),d=l.useRef(!1);return l.useEffect(()=>{r&&!d.current&&(d.current=!0,a())},[r,a]),l.useEffect(()=>{if(!e)return;const m=setTimeout(()=>o(0),100),u=setTimeout(()=>{c(!1),t()},600);return()=>{clearTimeout(m),clearTimeout(u)}},[e,t]),i?n.jsx("div",{className:"fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-500",style:{opacity:s},children:n.jsx("div",{className:"text-fg text-sm font-mono tracking-widest opacity-60",children:r?"Booting…":"Loading…"})}):null},nt=re(),V=({onUpdate:e,onLoadingChange:t,autoUpdate:a,trigger:r,source:s})=>{const o=l.useRef(r);return l.useEffect(()=>{let i=0,c=0;const d=()=>{const m=r!==o.current;m&&(o.current=r),c++,(a&&c%60===0||m)&&(t==null||t(!0),nt.requestHistogramReadback(s).then(v=>{v.length>0&&e(v),t==null||t(!1)})),i=requestAnimationFrame(d)};return d(),()=>cancelAnimationFrame(i)},[a,r,s,e,t]),null},G=12,ot=40,st=()=>{const e=_.getViewportOverlays().filter(r=>r.type==="dom"),t=C(),a=C();return n.jsx("div",{className:"absolute inset-0 pointer-events-none",style:{zIndex:ie("shellViewportOverlay")},children:e.map(r=>{const s=z.get(r.componentId),o=r.id,i=t[o];return s&&i?n.jsx(s,{featureId:o,sliceState:i,actions:a},r.id):null})})},at=()=>{const e=_.getViewportOverlays().filter(r=>!r.type||r.type==="scene"),t=C(),a=C();return n.jsx(n.Fragment,{children:e.map(r=>{const s=z.get(r.componentId),o=r.id,i=t[o];return s&&i?n.jsx(s,{featureId:o,sliceState:i,actions:a},r.id):null})})},rt=({onSceneReady:e})=>{const t=C(),a=l.useRef(null),r=l.useRef(null),s=l.useRef(!1);Z();const[o,i]=l.useState({w:0,h:0});l.useLayoutEffect(()=>{if(!r.current)return;const p=(O,b)=>{const M=window.devicePixelRatio||1,D=C.getState();D.isBucketRendering||D.setCanvasPixelSize(Math.floor(O*M),Math.floor(b*M))},k=new ResizeObserver(O=>{for(const b of O){const M=Math.max(1,b.contentRect.width),D=Math.max(1,b.contentRect.height);i({w:M,h:D}),p(M,D)}});k.observe(r.current);const f=r.current.getBoundingClientRect();return f.width>0&&f.height>0&&(i({w:f.width,h:f.height}),p(f.width,f.height)),s.current||(s.current=!0,e()),()=>k.disconnect()},[]);const c=t.resolutionMode==="Fixed",[d,m]=t.fixedResolution,u=t.isBroadcastMode,v=40,w=Math.max(1,o.w-v),R=Math.max(1,o.h-v);let y=1;c&&(y=Math.min(1,w/d,R/m));const E=c?{width:d,height:m,transform:`scale(${y})`,transformOrigin:"center center",boxShadow:"0 0 50px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",flexShrink:0}:{width:"100%",height:"100%"},h=c?d*y:o.w,g=c?m*y:o.h,x=(o.h-g)/2,S=(o.w-h)/2,F=Math.max(G,x-ot),j=Math.max(G,S);return n.jsxs("div",{ref:r,className:"relative flex-1 flex items-center justify-center overflow-hidden bg-surface-viewport touch-none",style:{backgroundImage:c?"radial-gradient(circle at center, #111 0%, #050505 100%)":"none"},onContextMenu:p=>{p.preventDefault(),p.stopPropagation()},onMouseEnter:()=>B(!0),onMouseLeave:()=>B(!1),children:[c&&n.jsx("div",{className:"absolute inset-0 opacity-20 pointer-events-none",style:{backgroundImage:"linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",backgroundSize:"40px 40px"}}),!u&&n.jsx(Ve,{}),!u&&n.jsx(xe,{}),!u&&n.jsx(be,{}),n.jsxs("div",{ref:a,style:E,className:"relative bg-surface group z-0",children:[n.jsx(fe,{gl:{alpha:!0,depth:!1,antialias:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1},camera:{position:[0,0,0],fov:60},style:{position:"absolute",inset:0,pointerEvents:"auto"},dpr:t.dpr,onPointerDown:p=>p.target.setPointerCapture(p.pointerId),children:n.jsx(at,{})}),n.jsx(st,{}),!u&&n.jsx($e,{width:c?d:o.w,height:c?m:o.h}),!u&&t.histogramActiveCount>0&&n.jsx(V,{onUpdate:p=>t.setHistogramData(p),onLoadingChange:p=>t.setHistogramLoading(p),autoUpdate:t.histogramAutoUpdate,trigger:t.histogramTrigger,source:"geometry"}),!u&&t.sceneHistogramActiveCount>0&&n.jsx(V,{onUpdate:p=>t.setSceneHistogramData(p),autoUpdate:!0,trigger:t.sceneHistogramTrigger,source:"color"})]}),c&&!u&&n.jsx(Ue,{width:d,height:m,top:F,left:j,maxAvailableWidth:o.w,maxAvailableHeight:o.h,onSetResolution:t.setFixedResolution,onSetMode:t.setResolutionMode})]})},it=L.lazy(()=>he(()=>import("./HelpBrowser-CFu3FHLf.js"),__vite__mapDeps([0,1,2,3,4,5,6,7]),import.meta.url)),lt=()=>{const e=C(),[t,a]=l.useState(!1),[r,s]=l.useState(!0),o=l.useRef(null),i=l.useRef(null),c=l.useRef(null),d=l.useRef(null),m=l.useRef(null),u=l.useRef(null),v=l.useMemo(()=>({container:i,speed:c,dist:d,reset:m,reticle:u}),[]),{startupMode:w,bootEngine:R,isStartupReady:y}=ve(),{isMobile:E,isPortrait:h}=Z();Ge(),l.useEffect(()=>{Fe()},[]);const g=E,x=e.isBroadcastMode,S=e.interactionMode!=="none",F=()=>{s(!1)},j=g&&!x?"min-h-[120vh] bg-black":"fixed inset-0 w-full h-full bg-black select-none overflow-hidden flex flex-col",p=Object.values(e.panels).filter(f=>f.location==="float"&&f.isOpen),k=l.useMemo(()=>({handleInteractionStart:e.handleInteractionStart,handleInteractionEnd:e.handleInteractionEnd,openContextMenu:e.openContextMenu}),[e.handleInteractionStart,e.handleInteractionEnd,e.openContextMenu]);return n.jsx(le,{value:k,children:n.jsxs("div",{className:j,children:[n.jsx(Oe,{}),n.jsx(Ye,{}),n.jsx(ke,{}),p.map(f=>n.jsx(Te,{id:f.id,title:f.id,children:n.jsx(je,{activeTab:f.id,state:e,actions:e,onSwitchTab:O=>e.togglePanel(O,!0)})},f.id)),n.jsxs("div",{ref:o,className:`relative bg-black select-none ${S?"cursor-crosshair":""} flex flex-col ${g&&!x?"h-[100vh] sticky top-0 overflow-hidden shadow-2xl":"w-full h-full"}`,onContextMenu:f=>f.preventDefault(),children:[n.jsx(tt,{isReady:t,onFinished:F,startupMode:w,bootEngine:R,isStartupReady:y}),g&&h&&!r&&!x&&n.jsxs("div",{className:"fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 text-center text-white",children:[n.jsx("div",{className:"text-cyan-400 mb-6 animate-bounce",children:n.jsx(ce,{})}),n.jsx("h2",{className:"text-2xl font-bold tracking-tight mb-2",children:"Landscape Recommended"}),n.jsx("p",{className:"text-gray-500 text-sm font-mono",children:"Rotate device to access controls."})]}),n.jsx(Ie,{}),n.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[!x&&!g&&n.jsx(U,{side:"left"}),n.jsx(rt,{hudRefs:v,onSceneReady:()=>a(!0),activeHint:null,onDismissHint:()=>{}}),n.jsx(Se,{}),!x&&n.jsx(U,{side:"right"})]}),n.jsx(we,{}),!x&&n.jsx(ye,{}),e.contextMenu.visible&&!x&&n.jsx(He,{x:e.contextMenu.x,y:e.contextMenu.y,items:e.contextMenu.items,targetHelpIds:e.contextMenu.targetHelpIds,onClose:e.closeContextMenu,onOpenHelp:e.openHelp}),e.helpWindow.visible&&n.jsx(l.Suspense,{fallback:null,children:n.jsx(it,{activeTopicId:e.helpWindow.activeTopicId,onClose:e.closeHelp,onNavigate:e.openHelp})}),n.jsx(Pe,{hidden:x})]})]})})};let K=null;const Y=e=>{K=e},J=()=>K,Q=`// ─────────────────────────────────────────────────────────────────────────────
// This is the engine's SIMPLEST shell — UI chrome (TopBar + Dock + AutoFeaturePanel
// + timeline) with no raymarcher boot. STARTING A NEW STANDALONE SHELL APP whose
// centre is its own surface (a tool/editor/catalog, not a single fractal canvas)?
// Copy this file's boot, not fluid-toy/fractal-toy. Full step-by-step recipe +
// gotchas (boot freeze-order, EngineBridge+RenderLoopDriver for timeline playback,
// tabs-drive-the-centre, hints/keyframes/input reuse) is in:
//     demo/README.md  →  "Starting a NEW standalone shell app"
// Worked example built from that recipe: gradient-explorer/.
// ─────────────────────────────────────────────────────────────────────────────

// Side-effect import — registers DemoFeature with the engine BEFORE
// anything touches the store (createFeatureSlice freezes the registry
// on first store access).
import './demo/registerFeatures';

// Global Tailwind styles (build-time; replaces the cdn.tailwindcss.com Play CDN).
import './index.css';

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
`,ct=`import { defineFeature, type FeatureState } from '../engine/features/setFeature';

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
`,dt=`import { featureRegistry } from '../engine/FeatureSystem';
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
`,mt=`import { useEngineStore } from '../store/engineStore';
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
`,ut=`// Module-level handle so that SceneIO (installed at boot) can find
// the demo's canvas, which doesn't exist until <DemoOverlay /> mounts.
// \`installSceneIO({ getCanvas: () => getDemoCanvas() })\` re-evaluates
// on every snapshot, so it correctly returns null pre-mount and the
// live canvas afterwards.

let _canvas: HTMLCanvasElement | null = null;

export const setDemoCanvas = (canvas: HTMLCanvasElement | null): void => {
    _canvas = canvas;
};

export const getDemoCanvas = (): HTMLCanvasElement | null => _canvas;
`,pt=`import React, { useEffect, useRef } from 'react';
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
`,ft=`// Demo's per-frame export pipeline. Plugged into the engine's render
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
`,ht="// __SHOWCASE_START__",gt="// __SHOWCASE_END__",xt=e=>{const t=e.indexOf(ht),a=e.indexOf(gt);return t===-1||a===-1||a<t?"// (showcase markers missing)":e.slice(e.indexOf(`
`,t)+1,a).replace(/\s+$/g,"")},H=[{path:"index.tsx",code:Q},{path:"demo/DemoFeature.ts",code:ct},{path:"demo/registerFeatures.ts",code:dt},{path:"demo/setup.ts",code:mt},{path:"demo/demoCanvasRef.ts",code:ut},{path:"demo/DemoOverlay.tsx",code:pt},{path:"demo/demoRenderRunner.ts",code:ft}],ee=e=>e.split(`
`).length,te=H.reduce((e,t)=>e+ee(t.code),0),vt=xt(Q),ne=L.memo(()=>{const[e,t]=l.useState(!1);return n.jsxs(n.Fragment,{children:[n.jsxs("div",{className:"absolute top-4 left-4 max-w-[420px] pointer-events-none select-none",children:[n.jsx("div",{className:"text-accent-500/80 text-[10px] font-mono tracking-wider mb-2",children:"// GMT engine — generic plugin host"}),n.jsxs("p",{className:"text-xs leading-relaxed text-fg-muted mb-3",children:["Everything in this app — the right-dock Demo panel, sliders, undo, save / load, PNG snapshot (Alt+S), video export, keyboard shortcuts, modulation timeline — boots up from the lines below. The ",n.jsx("code",{className:"text-fg-tertiary",children:"DemoFeature"})," itself is a single declarative object whose params become a Zustand slice, an auto-generated panel, and a save/load round-trip — for free."]}),n.jsx("pre",{className:"text-[10px] font-mono leading-relaxed text-fg-dim bg-surface-section border border-line/5 rounded px-3 py-2.5 whitespace-pre overflow-x-auto pointer-events-auto select-text",children:vt}),n.jsx("div",{className:"mt-3 flex items-center gap-3 pointer-events-auto",children:n.jsxs("button",{type:"button",onClick:()=>t(!0),className:"text-[10px] font-mono text-accent-400 hover:text-accent-300 border border-accent-500/30 hover:border-accent-400/60 rounded px-2.5 py-1 transition-colors",children:["Show full source (",H.length," files, ",te," lines)"]})})]}),e&&n.jsx(yt,{onClose:()=>t(!1)})]})});ne.displayName="DemoExplainer";const yt=({onClose:e})=>{const[t,a]=l.useState(0),r=H[t];return l.useEffect(()=>{const s=o=>{o.key==="Escape"&&e()};return window.addEventListener("keydown",s),()=>window.removeEventListener("keydown",s)},[e]),n.jsx(de,{tier:"overlay",className:"inset-0 flex items-center justify-center bg-black/70 p-6",onClick:e,children:n.jsxs("div",{className:"bg-surface-dock border border-line/10 rounded-lg shadow-2xl w-[min(960px,100%)] h-[min(800px,100%)] flex flex-col",onClick:s=>s.stopPropagation(),children:[n.jsxs("div",{className:"flex items-center justify-between px-4 py-3 border-b border-line/10",children:[n.jsxs("div",{children:[n.jsx("div",{className:"text-accent-400 text-sm font-semibold",children:"Demo source"}),n.jsxs("div",{className:"text-fg-dim text-[10px] font-mono",children:[H.length," files · ",te," lines · live from this build"]})]}),n.jsx("button",{type:"button",onClick:e,className:"text-fg-muted hover:text-fg text-lg leading-none px-2","aria-label":"Close source viewer",children:"✕"})]}),n.jsx("div",{className:"flex flex-wrap gap-1 px-3 py-2 border-b border-line/10 bg-surface-tabbar",children:H.map((s,o)=>n.jsxs("button",{type:"button",onClick:()=>a(o),className:"text-[11px] font-mono px-2.5 py-1 rounded transition-colors "+(o===t?"bg-accent-500/15 text-accent-300 border border-accent-500/40":"text-fg-muted hover:text-fg hover:bg-line/5 border border-transparent"),children:[s.path,n.jsxs("span",{className:"text-fg-faint ml-1.5",children:[ee(s.code),"L"]})]},s.path))}),n.jsx("div",{className:"flex-1 overflow-auto bg-surface-section p-4",children:n.jsx("pre",{className:"text-[11px] font-mono leading-relaxed text-fg-tertiary whitespace-pre select-text",children:r.code.replace(/\s+$/,"")})})]})})},bt=e=>{if(typeof e=="string")return e;if(e&&typeof e=="object"&&"getHexString"in e)return`#${e.getHexString()}`;if(e&&typeof e=="object"&&"r"in e){const t=a=>Math.max(0,Math.min(255,Math.round(a*255)));return`rgb(${t(e.r)}, ${t(e.g)}, ${t(e.b)})`}return"#888888"},St=({sliceState:e})=>{const t=e,a=qe(),r=l.useRef(null);return l.useEffect(()=>(Y(r.current),()=>Y(null)),[]),l.useEffect(()=>{const s=r.current;if(!s)return;const o=()=>{const c=window.devicePixelRatio||1,d=s.clientWidth,m=s.clientHeight;if(d===0||m===0)return;const u=Math.max(1,Math.floor(d*c)),v=Math.max(1,Math.floor(m*c));s.width!==u&&(s.width=u),s.height!==v&&(s.height=v)};o();const i=new ResizeObserver(o);return i.observe(s),()=>i.disconnect()},[]),l.useEffect(()=>{const s=r.current;if(!s||!t)return;const o=s.getContext("2d");if(!o)return;const i=(b,M)=>{const D=a[b];return typeof D=="number"?D:M},c=i("demo.size",t.size),d=i("demo.opacity",t.opacity),m=i("demo.position_x",t.position.x),u=i("demo.position_y",t.position.y),v=Math.max(1,Math.min(48,Math.round(i("demo.count",t.count)))),w=i("demo.iterOffset_x",t.iterOffset.x),R=i("demo.iterOffset_y",t.iterOffset.y),y=i("demo.iterRotation",t.iterRotation),E=i("demo.iterScale",t.iterScale),h=i("demo.iterHueShift",t.iterHueShift),g=window.devicePixelRatio||1,x=s.width/g,S=s.height/g,F=x*(.5+m*.4),j=S*(.5-u*.4),p=w*200,k=-R*200,f=y*Math.PI/180,O=bt(t.color);o.save(),o.setTransform(g,0,0,g,0,0),o.fillStyle="#111111",o.fillRect(0,0,x,S),o.lineWidth=1,o.strokeStyle="rgba(255, 255, 255, 0.1)";for(let b=v-1;b>=0;b--){const M=Math.pow(E,b),D=v>1?1-b/(v+2):1;o.save(),o.globalAlpha=Math.max(0,Math.min(1,d*D)),o.filter=h?`hue-rotate(${h*b}deg)`:"none",o.translate(F+p*b,j+k*b),o.rotate(f*b),o.scale(M,M),o.fillStyle=O;const I=c*.5,ae=Math.min(8,I);o.beginPath(),typeof o.roundRect=="function"?o.roundRect(-I,-I,c,c,ae):o.rect(-I,-I,c,c),o.fill(),o.stroke(),o.restore()}o.restore()}),t?n.jsxs(n.Fragment,{children:[n.jsx("canvas",{ref:r,className:"absolute inset-0 w-full h-full pointer-events-none"}),n.jsx(ne,{})]}):null},q=()=>"#"+Math.floor(Math.random()*16777215).toString(16).padStart(6,"0"),T=(e,t,a=.001)=>{const r=e+Math.random()*(t-e);return Math.round(r/a)*a},X=()=>{N(P,{count:Math.round(T(5,18,1)),iterOffset:{x:T(-.08,.08,.005),y:T(-.08,.08,.005)},iterRotation:T(-20,20,.5),iterScale:T(.85,1.05,.005),iterHueShift:T(-30,30,1)})},wt=()=>{z.register("overlay-demo",St),Ae([{id:"Demo",dock:"right",order:0,features:["demo"]},{id:"Animation",dock:"right",order:1,items:[{type:"widget",id:"lfo-list"}]}]);const e=C.getState();e.movePanel("Demo","right",0),e.movePanel("Animation","right",1),e.togglePanel("Demo",!0),A.register({id:"demo.randomize",key:"R",description:"Randomize the demo square color",category:"Demo",handler:()=>N(P,{color:q()})}),A.register({id:"demo.randomizeLayout",key:"L",description:"Randomize the duplicate-stack layout",category:"Demo",handler:X}),A.register({id:"demo.scramble",key:"S",description:"Scramble color + layout",category:"Demo",handler:()=>{N(P,{color:q()}),X()}}),Re.registerHudHint({id:"demo.hints",slot:"bottom-left",order:0,badge:"[Demo]",keys:[{key:"R",label:"Randomize color"},{key:"L",label:"Randomize layout"},{key:"S",label:"Scramble both"},{key:"Ctrl+Z",label:"Undo"},{key:"Ctrl+Y",label:"Redo"}]})},oe=e=>new Promise(t=>setTimeout(t,e)),Rt=()=>oe(0),Mt=async({cfg:e,flags:t,status:a,isDiskMode:r})=>{const s=J();if(!s){alert("Demo canvas not mounted yet — close this dialog and re-open after the canvas paints."),a.setIsRendering(!1);return}const o=Math.max(2,Math.floor(e.width/2)*2),i=Math.max(2,Math.floor(e.height/2)*2),c=s.width,d=s.height,m=W.getState(),u=m.isPlaying,v=m.currentFrame;s.width=o,s.height=i;const w=new Xe,R=Math.max(1,Math.floor((e.endFrame-e.startFrame)/Math.max(1,e.frameStep))+1);a.setIsRendering(!0),a.setProgress(0),a.setStatusText("Starting encoder…");try{await w.start({width:o,height:i,fps:e.fps,bitrate:e.bitrate,formatIndex:e.formatIndex},null),a.setStatusText("Rendering to RAM…");const y=1/e.fps;let E=Date.now();for(let h=0;h<R&&!(t.cancelledRef.current||t.finishEarlyRef.current);h++){for(;t.stoppingRef.current&&!t.cancelledRef.current&&!t.finishEarlyRef.current;)await oe(100);if(t.cancelledRef.current||t.finishEarlyRef.current)break;const g=e.startFrame+h*Math.max(1,e.frameStep),x=g*y;$.scrub(g),Ze(x,y),await Rt(),w.encodeCanvas(s,h);const S=Date.now();a.setLastFrameTime((S-E)/1e3),E=S;const F=(S-t.startTimeRef.current)/1e3;a.setElapsedTime(F),a.setEtaRange(Ke(F,h+1,R)),a.setProgress((h+1)/R),a.setStatusText(`Frame ${h+1} / ${R}`)}if(t.cancelledRef.current)w.cancel(),a.setStatusText("Cancelled.");else{a.setStatusText("Finalising file…");const h=await w.finish();if(h){const g=me[e.formatIndex],x=new Blob([h],{type:g.mime}),S=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);ue(x,`demo-${S}.${g.ext}`),a.setStatusText(t.finishEarlyRef.current?"Finished early.":"Saved.")}}}catch(y){w.cancel(),a.setStatusText(`Error: ${y instanceof Error?y.message:String(y)}`)}finally{s.width=c,s.height=d,$.scrub(v),u&&W.getState().play(),a.setIsRendering(!1),a.setIsStopping(!1)}};Ne();_e();ze({getCanvas:()=>J()});pe();Le();Be();Me();De();Ce();Je({runner:Mt,showSamplesPerFrame:!1,disableDiskMode:!0});We();Ee({defaultTarget:"demo.position_x"});wt();const se=document.getElementById("root");if(!se)throw new Error("Could not find root element to mount to");ge.createRoot(se).render(n.jsx(L.StrictMode,{children:n.jsx(lt,{})}));
