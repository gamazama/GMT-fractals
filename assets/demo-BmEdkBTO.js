const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./HelpBrowser-DlePh891.js","./CollapsibleSection-4tnOC6Ox.js","./react-KfUPlHYY.js","./pako-DwGzBETv.js","./three-dPzokJkq.js","./CollapsibleSection-Tdz09p4e.css","./DraggableWindow-DT1mnSKV.js","./Undo-DM_mkAti.js","./AutoFeaturePanel-b9lJ00QX.js"])))=>i.map(i=>d[i]);
import{u as H,f as se,j as n,g as re,a as q,s as _,l as ie,_ as le,S as ce,p as de,b as me,T as ue,L as pe,c as fe,d as he,e as A,h as L,i as B,V as ge,k as xe,m as ve,n as ye,o as be,q as Se}from"./CollapsibleSection-4tnOC6Ox.js";import{r,R as X}from"./react-KfUPlHYY.js";import{P as we,C as Re,u as Me,M as De}from"./MobileControls-BPURP598.js";import{A as Ce,M as Ee,c as Fe,i as Oe,a as ke}from"./index-CaKBVg3_.js";import{F as z,C as Te,a as Pe,E as He,D as je,P as Ie,b as W,T as Ae,i as Ne,c as _e}from"./PwaUpdate-B0mXeQ96.js";import{C as Le}from"./CompilingIndicator-Dj4Pgj4h.js";import{u as Be,r as ze}from"./roundRectPath-CLdVwG06.js";import{p as We,G as $e,r as Ue,i as Ve}from"./Undo-DM_mkAti.js";import{R as Ge}from"./RenderLoop-C02sqAEc.js";import{H as Ye,a as qe,h as Xe,i as Ze,b as Ke}from"./Help-Ctuf23OH.js";import{D as Je}from"./DraggableWindow-DT1mnSKV.js";import{u as Qe,a as et,i as tt,s as nt}from"./applyAt-CMFYnUoF.js";import"./pako-DwGzBETv.js";import"./three-dPzokJkq.js";import"./AutoFeaturePanel-b9lJ00QX.js";import"./Segmented-Dvq39vZD.js";import"./accordionReveal-DBuFOf5J.js";const ot=e=>e,at=e=>`set${e.charAt(0).toUpperCase()}${e.slice(1)}`,N=(e,t)=>{const i=H.getState()[at(e.id)];typeof i=="function"&&i(t)},j=ot({id:"demo",name:"Demo",category:"Engine",tabConfig:{label:"Demo"},viewportConfig:{componentId:"overlay-demo",type:"dom"},params:{color:{type:"color",default:"#22d3ee",label:"Color",group:"Base"},position:{type:"vec2",default:{x:0,y:0},label:"Position",min:-1,max:1,step:.01,group:"Base"},size:{type:"float",default:120,label:"Size",min:20,max:400,step:1,group:"Base"},opacity:{type:"float",default:.9,label:"Opacity",min:0,max:1,step:.01,group:"Base"},count:{type:"int",default:8,label:"Duplicates",min:1,max:48,step:1,group:"Iteration"},iterOffset:{type:"vec2",default:{x:.04,y:.04},label:"Offset / step",min:-.5,max:.5,step:.005,group:"Iteration"},iterRotation:{type:"float",default:8,label:"Rotation / step (°)",min:-90,max:90,step:.5,group:"Iteration"},iterScale:{type:"float",default:.94,label:"Scale / step",min:.5,max:1.2,step:.005,group:"Iteration"},iterHueShift:{type:"float",default:18,label:"Hue shift / step (°)",min:-180,max:180,step:1,group:"Iteration"}}});se.register(j);const st=({isReady:e,onFinished:t,bootEngine:s,isStartupReady:i})=>{const[a,o]=r.useState(1),[l,c]=r.useState(!0),d=r.useRef(!1);return r.useEffect(()=>{i&&!d.current&&(d.current=!0,s())},[i,s]),r.useEffect(()=>{if(!e)return;const m=setTimeout(()=>o(0),100),u=setTimeout(()=>{c(!1),t()},600);return()=>{clearTimeout(m),clearTimeout(u)}},[e,t]),l?n.jsx("div",{className:"fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-500",style:{opacity:a},children:n.jsx("div",{className:"text-fg text-sm font-mono tracking-widest opacity-60",children:i?"Booting…":"Loading…"})}):null},rt=re(),$=({onUpdate:e,onLoadingChange:t,autoUpdate:s,trigger:i,source:a})=>{const o=r.useRef(i);return r.useEffect(()=>{let l=0,c=0;const d=()=>{const m=i!==o.current;m&&(o.current=i),c++,(s&&c%60===0||m)&&(t==null||t(!0),rt.requestHistogramReadback(a).then(v=>{v.length>0&&e(v),t==null||t(!1)})),l=requestAnimationFrame(d)};return d(),()=>cancelAnimationFrame(l)},[s,i,a,e,t]),null},U=12,it=40,lt=({onSceneReady:e})=>{const t=H(),s=r.useRef(null),i=r.useRef(null),a=r.useRef(!1);q();const[o,l]=r.useState({w:0,h:0});r.useLayoutEffect(()=>{if(!i.current)return;const p=(F,b)=>{const M=window.devicePixelRatio||1,D=H.getState();D.isBucketRendering||D.setCanvasPixelSize(Math.floor(F*M),Math.floor(b*M))},O=new ResizeObserver(F=>{for(const b of F){const M=Math.max(1,b.contentRect.width),D=Math.max(1,b.contentRect.height);l({w:M,h:D}),p(M,D)}});O.observe(i.current);const f=i.current.getBoundingClientRect();return f.width>0&&f.height>0&&(l({w:f.width,h:f.height}),p(f.width,f.height)),a.current||(a.current=!0,e()),()=>O.disconnect()},[]);const c=t.resolutionMode==="Fixed",[d,m]=t.fixedResolution,u=t.isBroadcastMode,v=40,w=Math.max(1,o.w-v),R=Math.max(1,o.h-v);let y=1;c&&(y=Math.min(1,w/d,R/m));const C=c?{width:d,height:m,transform:`scale(${y})`,transformOrigin:"center center",boxShadow:"0 0 50px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",flexShrink:0}:{width:"100%",height:"100%"},h=c?d*y:o.w,g=c?m*y:o.h,x=(o.h-g)/2,S=(o.w-h)/2,E=Math.max(U,x-it),T=Math.max(U,S);return n.jsxs("div",{ref:i,className:"relative flex-1 flex items-center justify-center overflow-hidden bg-surface-viewport touch-none",style:{backgroundImage:c?"radial-gradient(circle at center, #111 0%, #050505 100%)":"none"},onContextMenu:p=>{p.preventDefault(),p.stopPropagation()},onMouseEnter:()=>_(!0),onMouseLeave:()=>_(!1),children:[c&&n.jsx("div",{className:"absolute inset-0 opacity-20 pointer-events-none",style:{backgroundImage:"linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",backgroundSize:"40px 40px"}}),!u&&n.jsx(Le,{}),!u&&n.jsx(we,{}),!u&&n.jsx(Ce,{}),n.jsxs("div",{ref:s,style:C,className:"relative bg-surface group z-0",children:[n.jsx(Re,{gl:{alpha:!0,depth:!1,antialias:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1},camera:{position:[0,0,0],fov:60},style:{position:"absolute",inset:0,pointerEvents:"auto"},dpr:t.dpr,onPointerDown:p=>p.target.setPointerCapture(p.pointerId),children:n.jsx(z,{type:"scene"})}),n.jsx(z,{}),!u&&n.jsx(Te,{width:c?d:o.w,height:c?m:o.h}),!u&&t.histogramActiveCount>0&&n.jsx($,{onUpdate:p=>t.setHistogramData(p),onLoadingChange:p=>t.setHistogramLoading(p),autoUpdate:t.histogramAutoUpdate,trigger:t.histogramTrigger,source:"geometry"}),!u&&t.sceneHistogramActiveCount>0&&n.jsx($,{onUpdate:p=>t.setSceneHistogramData(p),autoUpdate:!0,trigger:t.sceneHistogramTrigger,source:"color"})]}),c&&!u&&n.jsx(Pe,{width:d,height:m,top:E,left:T,maxAvailableWidth:o.w,maxAvailableHeight:o.h,onSetResolution:t.setFixedResolution,onSetMode:t.setResolutionMode})]})},ct=ie(()=>le(()=>import("./HelpBrowser-DlePh891.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8]),import.meta.url),"Help"),dt=()=>{const e=H(),[t,s]=r.useState(!1),[i,a]=r.useState(!0),o=r.useRef(null),l=r.useRef(null),c=r.useRef(null),d=r.useRef(null),m=r.useRef(null),u=r.useRef(null),v=r.useMemo(()=>({container:l,speed:c,dist:d,reset:m,reticle:u}),[]),{startupMode:w,bootEngine:R,isStartupReady:y}=Me(),{isMobile:C,isPortrait:h}=q();Be(),r.useEffect(()=>{We()},[]);const g=C,x=e.isBroadcastMode,S=e.interactionMode!=="none",E=()=>{a(!1)},T=g&&!x?"min-h-[120vh] bg-black":"fixed inset-0 w-full h-full bg-black select-none overflow-hidden flex flex-col",p=Object.values(e.panels).filter(f=>f.location==="float"&&f.isOpen),O=r.useMemo(()=>({handleInteractionStart:e.handleInteractionStart,handleInteractionEnd:e.handleInteractionEnd,openContextMenu:e.openContextMenu}),[e.handleInteractionStart,e.handleInteractionEnd,e.openContextMenu]);return n.jsx(ce,{value:O,children:n.jsxs("div",{className:T,children:[n.jsx(He,{}),n.jsx(Ge,{}),n.jsx(je,{}),p.map(f=>n.jsx(Je,{id:f.id,title:de(f.id),children:n.jsx(Ie,{activeTab:f.id,state:e,actions:e,onSwitchTab:F=>e.togglePanel(F,!0)})},f.id)),n.jsxs("div",{ref:o,className:`relative bg-black select-none ${S?"cursor-crosshair":""} flex flex-col ${g&&!x?"h-[100vh] sticky top-0 overflow-hidden shadow-2xl":"w-full h-full"}`,onContextMenu:f=>f.preventDefault(),children:[n.jsx(st,{isReady:t,onFinished:E,startupMode:w,bootEngine:R,isStartupReady:y}),g&&h&&!i&&!x&&n.jsxs("div",{className:"fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 text-center text-white",children:[n.jsx("div",{className:"text-cyan-400 mb-6 animate-bounce",children:n.jsx(me,{})}),n.jsx("h2",{className:"text-2xl font-bold tracking-tight mb-2",children:"Landscape Recommended"}),n.jsx("p",{className:"text-gray-500 text-sm font-mono",children:"Rotate device to access controls."})]}),n.jsx(ue,{}),n.jsxs("div",{className:"flex-1 flex overflow-hidden relative",children:[!x&&!g&&n.jsx(W,{side:"left"}),n.jsx(lt,{hudRefs:v,onSceneReady:()=>s(!0),activeHint:null,onDismissHint:()=>{}}),n.jsx(Ye,{}),!x&&n.jsx(W,{side:"right"})]}),n.jsx(qe,{}),!x&&n.jsx(De,{}),e.contextMenu.visible&&!x&&n.jsx($e,{x:e.contextMenu.x,y:e.contextMenu.y,items:e.contextMenu.items,targetHelpIds:e.contextMenu.targetHelpIds,onClose:e.closeContextMenu,onOpenHelp:e.openHelp}),e.helpWindow.visible&&n.jsx(r.Suspense,{fallback:null,children:n.jsx(ct,{activeTopicId:e.helpWindow.activeTopicId,onClose:e.closeHelp,onNavigate:e.openHelp})}),n.jsx(Ae,{hidden:x})]})]})})};let Z=null;const V=e=>{Z=e},K=()=>Z,J=`// ─────────────────────────────────────────────────────────────────────────────
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
`,mt=`import { defineFeature, type FeatureState } from '../engine/features/setFeature';

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
`,ut=`import { featureRegistry } from '../engine/FeatureSystem';
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
`,pt=`import { useEngineStore } from '../store/engineStore';
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
`,ft=`// Module-level handle so that SceneIO (installed at boot) can find
// the demo's canvas, which doesn't exist until <DemoOverlay /> mounts.
// \`installSceneIO({ getCanvas: () => getDemoCanvas() })\` re-evaluates
// on every snapshot, so it correctly returns null pre-mount and the
// live canvas afterwards.

let _canvas: HTMLCanvasElement | null = null;

export const setDemoCanvas = (canvas: HTMLCanvasElement | null): void => {
    _canvas = canvas;
};

export const getDemoCanvas = (): HTMLCanvasElement | null => _canvas;
`,ht=`import React, { useEffect, useRef } from 'react';
import { roundRectPath } from '../utils/roundRectPath';
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
            roundRectPath(ctx, -half, -half, size, size, radius);
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
`,gt=`// Demo's per-frame export pipeline. Plugged into the engine's render
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
`,xt="// __SHOWCASE_START__",vt="// __SHOWCASE_END__",yt=e=>{const t=e.indexOf(xt),s=e.indexOf(vt);return t===-1||s===-1||s<t?"// (showcase markers missing)":e.slice(e.indexOf(`
`,t)+1,s).replace(/\s+$/g,"")},P=[{path:"index.tsx",code:J},{path:"demo/DemoFeature.ts",code:mt},{path:"demo/registerFeatures.ts",code:ut},{path:"demo/setup.ts",code:pt},{path:"demo/demoCanvasRef.ts",code:ft},{path:"demo/DemoOverlay.tsx",code:ht},{path:"demo/demoRenderRunner.ts",code:gt}],Q=e=>e.split(`
`).length,ee=P.reduce((e,t)=>e+Q(t.code),0),bt=yt(J),te=X.memo(()=>{const[e,t]=r.useState(!1);return n.jsxs(n.Fragment,{children:[n.jsxs("div",{className:"absolute top-4 left-4 max-w-[420px] pointer-events-none select-none",children:[n.jsx("div",{className:"text-accent-500/80 text-[10px] font-mono tracking-wider mb-2",children:"// GMT engine — generic plugin host"}),n.jsxs("p",{className:"text-xs leading-relaxed text-fg-muted mb-3",children:["Everything in this app — the right-dock Demo panel, sliders, undo, save / load, PNG snapshot (Alt+S), video export, keyboard shortcuts, modulation timeline — boots up from the lines below. The ",n.jsx("code",{className:"text-fg-tertiary",children:"DemoFeature"})," itself is a single declarative object whose params become a Zustand slice, an auto-generated panel, and a save/load round-trip — for free."]}),n.jsx("pre",{className:"text-[10px] font-mono leading-relaxed text-fg-dim bg-surface-section border border-line/5 rounded px-3 py-2.5 whitespace-pre overflow-x-auto pointer-events-auto select-text",children:bt}),n.jsx("div",{className:"mt-3 flex items-center gap-3 pointer-events-auto",children:n.jsxs("button",{type:"button",onClick:()=>t(!0),className:"text-[10px] font-mono text-accent-400 hover:text-accent-300 border border-accent-500/30 hover:border-accent-400/60 rounded px-2.5 py-1 transition-colors",children:["Show full source (",P.length," files, ",ee," lines)"]})})]}),e&&n.jsx(St,{onClose:()=>t(!1)})]})});te.displayName="DemoExplainer";const St=({onClose:e})=>{const[t,s]=r.useState(0),i=P[t];return r.useEffect(()=>{const a=o=>{o.key==="Escape"&&e()};return window.addEventListener("keydown",a),()=>window.removeEventListener("keydown",a)},[e]),n.jsx(pe,{tier:"overlay",className:"inset-0 flex items-center justify-center bg-black/70 p-6",onClick:e,children:n.jsxs("div",{className:"bg-surface-dock border border-line/10 rounded-lg shadow-2xl w-[min(960px,100%)] h-[min(800px,100%)] flex flex-col",onClick:a=>a.stopPropagation(),children:[n.jsxs("div",{className:"flex items-center justify-between px-4 py-3 border-b border-line/10",children:[n.jsxs("div",{children:[n.jsx("div",{className:"text-accent-400 text-sm font-semibold",children:"Demo source"}),n.jsxs("div",{className:"text-fg-dim text-[10px] font-mono",children:[P.length," files · ",ee," lines · live from this build"]})]}),n.jsx("button",{type:"button",onClick:e,className:"text-fg-muted hover:text-fg text-lg leading-none px-2","aria-label":"Close source viewer",children:"✕"})]}),n.jsx("div",{className:"flex flex-wrap gap-1 px-3 py-2 border-b border-line/10 bg-surface-tabbar",children:P.map((a,o)=>n.jsxs("button",{type:"button",onClick:()=>s(o),className:"text-[11px] font-mono px-2.5 py-1 rounded transition-colors "+(o===t?"bg-accent-500/15 text-accent-300 border border-accent-500/40":"text-fg-muted hover:text-fg hover:bg-line/5 border border-transparent"),children:[a.path,n.jsxs("span",{className:"text-fg-faint ml-1.5",children:[Q(a.code),"L"]})]},a.path))}),n.jsx("div",{className:"flex-1 overflow-auto bg-surface-section p-4",children:n.jsx("pre",{className:"text-[11px] font-mono leading-relaxed text-fg-tertiary whitespace-pre select-text",children:i.code.replace(/\s+$/,"")})})]})})},wt=e=>{if(typeof e=="string")return e;if(e&&typeof e=="object"&&"getHexString"in e)return`#${e.getHexString()}`;if(e&&typeof e=="object"&&"r"in e){const t=s=>Math.max(0,Math.min(255,Math.round(s*255)));return`rgb(${t(e.r)}, ${t(e.g)}, ${t(e.b)})`}return"#888888"},Rt=({sliceState:e})=>{const t=e,s=Qe(),i=r.useRef(null);return r.useEffect(()=>(V(i.current),()=>V(null)),[]),r.useEffect(()=>{const a=i.current;if(!a)return;const o=()=>{const c=window.devicePixelRatio||1,d=a.clientWidth,m=a.clientHeight;if(d===0||m===0)return;const u=Math.max(1,Math.floor(d*c)),v=Math.max(1,Math.floor(m*c));a.width!==u&&(a.width=u),a.height!==v&&(a.height=v)};o();const l=new ResizeObserver(o);return l.observe(a),()=>l.disconnect()},[]),r.useEffect(()=>{const a=i.current;if(!a||!t)return;const o=a.getContext("2d");if(!o)return;const l=(b,M)=>{const D=s[b];return typeof D=="number"?D:M},c=l("demo.size",t.size),d=l("demo.opacity",t.opacity),m=l("demo.position_x",t.position.x),u=l("demo.position_y",t.position.y),v=Math.max(1,Math.min(48,Math.round(l("demo.count",t.count)))),w=l("demo.iterOffset_x",t.iterOffset.x),R=l("demo.iterOffset_y",t.iterOffset.y),y=l("demo.iterRotation",t.iterRotation),C=l("demo.iterScale",t.iterScale),h=l("demo.iterHueShift",t.iterHueShift),g=window.devicePixelRatio||1,x=a.width/g,S=a.height/g,E=x*(.5+m*.4),T=S*(.5-u*.4),p=w*200,O=-R*200,f=y*Math.PI/180,F=wt(t.color);o.save(),o.setTransform(g,0,0,g,0,0),o.fillStyle="#111111",o.fillRect(0,0,x,S),o.lineWidth=1,o.strokeStyle="rgba(255, 255, 255, 0.1)";for(let b=v-1;b>=0;b--){const M=Math.pow(C,b),D=v>1?1-b/(v+2):1;o.save(),o.globalAlpha=Math.max(0,Math.min(1,d*D)),o.filter=h?`hue-rotate(${h*b}deg)`:"none",o.translate(E+p*b,T+O*b),o.rotate(f*b),o.scale(M,M),o.fillStyle=F;const I=c*.5,ae=Math.min(8,I);o.beginPath(),ze(o,-I,-I,c,c,ae),o.fill(),o.stroke(),o.restore()}o.restore()}),t?n.jsxs(n.Fragment,{children:[n.jsx("canvas",{ref:i,className:"absolute inset-0 w-full h-full pointer-events-none"}),n.jsx(te,{})]}):null},G=()=>"#"+Math.floor(Math.random()*16777215).toString(16).padStart(6,"0"),k=(e,t,s=.001)=>{const i=e+Math.random()*(t-e);return Math.round(i/s)*s},Y=()=>{N(j,{count:Math.round(k(5,18,1)),iterOffset:{x:k(-.08,.08,.005),y:k(-.08,.08,.005)},iterRotation:k(-20,20,.5),iterScale:k(.85,1.05,.005),iterHueShift:k(-30,30,1)})},Mt=()=>{fe.register("overlay-demo",Rt),he([{id:"Demo",dock:"right",order:0,features:["demo"]},{id:"Animation",dock:"right",order:1,items:[{type:"widget",id:"lfo-list"}]}]);const e=H.getState();e.movePanel("Demo","right",0),e.movePanel("Animation","right",1),e.togglePanel("Demo",!0),A.register({id:"demo.randomize",key:"R",description:"Randomize the demo square color",category:"Demo",handler:()=>N(j,{color:G()})}),A.register({id:"demo.randomizeLayout",key:"L",description:"Randomize the duplicate-stack layout",category:"Demo",handler:Y}),A.register({id:"demo.scramble",key:"S",description:"Scramble color + layout",category:"Demo",handler:()=>{N(j,{color:G()}),Y()}}),Xe.registerHudHint({id:"demo.hints",slot:"bottom-left",order:0,badge:"[Demo]",keys:[{key:"R",label:"Randomize color"},{key:"L",label:"Randomize layout"},{key:"S",label:"Scramble both"},{key:"Ctrl+Z",label:"Undo"},{key:"Ctrl+Y",label:"Redo"}]})},ne=e=>new Promise(t=>setTimeout(t,e)),Dt=()=>ne(0),Ct=async({cfg:e,flags:t,status:s,isDiskMode:i})=>{const a=K();if(!a){alert("Demo canvas not mounted yet — close this dialog and re-open after the canvas paints."),s.setIsRendering(!1);return}const o=Math.max(2,Math.floor(e.width/2)*2),l=Math.max(2,Math.floor(e.height/2)*2),c=a.width,d=a.height,m=L.getState(),u=m.isPlaying,v=m.currentFrame;a.width=o,a.height=l;const w=new Ee,R=Math.max(1,Math.floor((e.endFrame-e.startFrame)/Math.max(1,e.frameStep))+1);s.setIsRendering(!0),s.setProgress(0),s.setStatusText("Starting encoder…");try{await w.start({width:o,height:l,fps:e.fps,bitrate:e.bitrate,formatIndex:e.formatIndex},null),s.setStatusText("Rendering to RAM…");const y=1/e.fps;let C=Date.now();for(let h=0;h<R&&!(t.cancelledRef.current||t.finishEarlyRef.current);h++){for(;t.stoppingRef.current&&!t.cancelledRef.current&&!t.finishEarlyRef.current;)await ne(100);if(t.cancelledRef.current||t.finishEarlyRef.current)break;const g=e.startFrame+h*Math.max(1,e.frameStep),x=g*y;B.scrub(g),et(x,y),await Dt(),w.encodeCanvas(a,h);const S=Date.now();s.setLastFrameTime((S-C)/1e3),C=S;const E=(S-t.startTimeRef.current)/1e3;s.setElapsedTime(E),s.setEtaRange(Fe(E,h+1,R)),s.setProgress((h+1)/R),s.setStatusText(`Frame ${h+1} / ${R}`)}if(t.cancelledRef.current)w.cancel(),s.setStatusText("Cancelled.");else{s.setStatusText("Finalising file…");const h=await w.finish();if(h){const g=ge[e.formatIndex],x=new Blob([h],{type:g.mime}),S=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);xe(x,`demo-${S}.${g.ext}`),s.setStatusText(t.finishEarlyRef.current?"Finished early.":"Saved.")}}}catch(y){w.cancel(),s.setStatusText(`Error: ${y instanceof Error?y.message:String(y)}`)}finally{a.width=c,a.height=d,B.scrub(v),u&&L.getState().play(),s.setIsRendering(!1),s.setIsStopping(!1)}};Ue();ve();Ne({getCanvas:()=>K()});ye();Ve();be();Ze();Ke();Oe();tt();ke({runner:Ct,showSamplesPerFrame:!1,disableDiskMode:!0});_e();nt({defaultTarget:"demo.position_x"});Mt();const oe=document.getElementById("root");if(!oe)throw new Error("Could not find root element to mount to");Se.createRoot(oe).render(n.jsx(X.StrictMode,{children:n.jsx(dt,{})}));
