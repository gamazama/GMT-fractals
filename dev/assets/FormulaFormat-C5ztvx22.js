var ta=Object.defineProperty;var oa=(e,o,t)=>o in e?ta(e,o,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[o]=t;var M=(e,o,t)=>oa(e,typeof o!="symbol"?o+"":o,t);import{j as d,r as L,R as te}from"./three-fiber-C5DkfiAm.js";import{d as ve,c as j,l as aa,Q as Oe,E as Ue,O as ra,P as ia,n as Be,m as le,p as na,q as sa,r as Nt,s as $t,k as gt}from"./three-DZB2NGqN.js";import{a as xo}from"./three-drei-hqOrdlmR.js";import{p as Bt}from"./pako-DwGzBETv.js";(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const n of i.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&a(n)}).observe(document,{childList:!0,subtree:!0});function t(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(r){if(r.ep)return;r.ep=!0;const i=t(r);fetch(r.href,i)}})();const la=e=>(o,t,a)=>{const r=a.subscribe;return a.subscribe=(n,l,s)=>{let c=n;if(l){const u=(s==null?void 0:s.equalityFn)||Object.is;let h=n(a.getState());c=f=>{const p=n(f);if(!u(h,p)){const m=h;l(h=p,m)}},s!=null&&s.fireImmediately&&l(h,h)}return r(c)},e(o,t,a)},So=la,oe={UNIFORM:"uniform",CONFIG:"config",RESET_ACCUM:"reset_accum",OFFSET_SHIFT:"offset_shift",OFFSET_SET:"offset_set",OFFSET_SILENT:"offset_silent",CAMERA_ABSORB:"camera_absorb",CAMERA_SNAP:"camera_snap",CAMERA_TELEPORT:"camera_teleport",CAMERA_TRANSITION:"camera_transition",SHADER_CODE:"shader_code",IS_COMPILING:"is_compiling",COMPILE_TIME:"compile_time",COMPILE_ESTIMATE:"compile_estimate",BUCKET_STATUS:"bucket_status",BUCKET_IMAGE:"bucket_image",TRACK_FOCUS:"track_focus",TEXTURE:"texture",ENGINE_QUEUE:"engine_queue",REGISTER_FORMULA:"register_formula",RESET_HINTS:"reset_hints",CAMERA_SLOT_SAVED:"camera_slot_saved"};class ca{constructor(){M(this,"listeners",{})}on(o,t){return this.listeners[o]||(this.listeners[o]=[]),this.listeners[o].push(t),()=>this.off(o,t)}off(o,t){this.listeners[o]&&(this.listeners[o]=this.listeners[o].filter(a=>a!==t))}emit(o,t){this.listeners[o]&&this.listeners[o].forEach(a=>a(t))}}const R=new ca,ue={Time:"uTime",FrameCount:"uFrameCount",Resolution:"uResolution",SceneOffsetHigh:"uSceneOffsetHigh",SceneOffsetLow:"uSceneOffsetLow",CameraPosition:"uCameraPosition",CamBasisX:"uCamBasisX",CamBasisY:"uCamBasisY",CamForward:"uCamForward",RegionMin:"uRegionMin",RegionMax:"uRegionMax",ImageTileOrigin:"uImageTileOrigin",ImageTileSize:"uImageTileSize",FullOutputResolution:"uFullOutputResolution",TilePixelOrigin:"uTilePixelOrigin",LightCount:"uLightCount",LightType:"uLightType",LightPos:"uLightPos",LightDir:"uLightDir",LightColor:"uLightColor",LightIntensity:"uLightIntensity",LightShadows:"uLightShadows",LightFalloff:"uLightFalloff",LightFalloffType:"uLightFalloffType",LightRadius:"uLightRadius",LightSoftness:"uLightSoftness",HistoryTexture:"uHistoryTexture",BlendFactor:"uBlendFactor",Jitter:"uJitter",BlueNoiseTexture:"uBlueNoiseTexture",BlueNoiseResolution:"uBlueNoiseResolution",ModularParams:"uModularParams",EnvRotationMatrix:"uEnvRotationMatrix",FogColorLinear:"uFogColorLinear",HistogramLayer:"uHistogramLayer",PreRotMatrix:"uPreRotMatrix",PostRotMatrix:"uPostRotMatrix",WorldRotMatrix:"uWorldRotMatrix",InternalScale:"uInternalScale",PixelSizeBase:"uPixelSizeBase",OutputPass:"uOutputPass",DepthMin:"uDepthMin",DepthMax:"uDepthMax"},Ht=e=>{if(typeof window>"u")return!1;const o=new URLSearchParams(window.location.search),t=o.get(e);return o.has(e)&&(t==null?void 0:t.toLowerCase())!=="false"&&t!=="0"},da={Formula:{id:"Formula",location:"right",order:0,isCore:!0,isOpen:!0},Graph:{id:"Graph",location:"right",order:1,isCore:!0,isOpen:!1},Scene:{id:"Scene",location:"right",order:2,isCore:!0,isOpen:!1},Shader:{id:"Shader",location:"right",order:3,isCore:!0,isOpen:!1},Gradient:{id:"Gradient",location:"right",order:4,isCore:!0,isOpen:!1},Quality:{id:"Quality",location:"right",order:5,isCore:!0,isOpen:!1},Light:{id:"Light",location:"right",order:6,isCore:!1,isOpen:!1},Audio:{id:"Audio",location:"right",order:7,isCore:!1,isOpen:!1},Drawing:{id:"Drawing",location:"right",order:8,isCore:!1,isOpen:!1}},ua=(e,o)=>({showLightGizmo:!0,isGizmoDragging:!1,interactionMode:"none",focusLock:!1,histogramData:null,histogramAutoUpdate:!0,histogramTrigger:0,histogramLayer:0,histogramActiveCount:0,histogramLoading:!1,sceneHistogramData:null,sceneHistogramTrigger:0,sceneHistogramActiveCount:0,draggedLightIndex:null,openLightPopupIndex:-1,shadowPanelOpen:!1,vpQualityOpen:!1,autoCompile:!1,isUserInteracting:!1,advancedMode:!1,showHints:!0,debugMobileLayout:!1,invertY:!1,resolutionMode:"Full",fixedResolution:[800,600],isBroadcastMode:Ht("clean")||Ht("broadcast"),lockSceneOnSwitch:!1,exportIncludeScene:!1,isTimelineHovered:!1,tabSwitchCount:0,helpWindow:{visible:!1,activeTopicId:null},contextMenu:{visible:!1,x:0,y:0,items:[],targetHelpIds:[]},compositionOverlay:"none",compositionOverlaySettings:{opacity:.5,lineThickness:1,showCenterMark:!1,showSafeAreas:!1,color:"#FFFFFF",gridDivisionsX:4,gridDivisionsY:4,spiralRotation:0,spiralPositionX:.5,spiralPositionY:.5,spiralScale:1,spiralRatio:1.618033988749895},panels:da,leftDockSize:320,rightDockSize:360,isLeftDockCollapsed:!0,isRightDockCollapsed:!1,draggingPanelId:null,dragSnapshot:null,activeLeftTab:null,activeRightTab:"Formula",workshopOpen:!1,workshopEditFormula:void 0,tutorialActive:!1,tutorialLessonId:null,tutorialStepIndex:0,tutorialCompleted:(()=>{try{const t=localStorage.getItem("gmt-tutorials");return t?JSON.parse(t).completed||[]:[]}catch{return[]}})(),setShowLightGizmo:t=>e({showLightGizmo:t}),setGizmoDragging:t=>e({isGizmoDragging:t}),setInteractionMode:t=>e({interactionMode:t}),setFocusLock:t=>e({focusLock:t}),setHistogramData:t=>e({histogramData:t,histogramLoading:!1}),setHistogramLoading:t=>e({histogramLoading:t}),setHistogramAutoUpdate:t=>e({histogramAutoUpdate:t}),refreshHistogram:()=>e(t=>({histogramTrigger:t.histogramTrigger+1})),registerHistogram:()=>e(t=>({histogramActiveCount:t.histogramActiveCount+1})),unregisterHistogram:()=>e(t=>({histogramActiveCount:Math.max(0,t.histogramActiveCount-1)})),setHistogramLayer:t=>{o().histogramLayer!==t&&(e({histogramLayer:t}),R.emit("uniform",{key:ue.HistogramLayer,value:t}),e(a=>({histogramTrigger:a.histogramTrigger+1})))},setSceneHistogramData:t=>e({sceneHistogramData:t}),refreshSceneHistogram:()=>e(t=>({sceneHistogramTrigger:t.sceneHistogramTrigger+1})),registerSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:t.sceneHistogramActiveCount+1})),unregisterSceneHistogram:()=>e(t=>({sceneHistogramActiveCount:Math.max(0,t.sceneHistogramActiveCount-1)})),setDraggedLight:t=>e({draggedLightIndex:t}),setOpenLightPopupIndex:t=>e({openLightPopupIndex:t}),setShadowPanelOpen:t=>e({shadowPanelOpen:t}),setVpQualityOpen:t=>e({vpQualityOpen:t}),setAutoCompile:t=>e({autoCompile:t}),setAdvancedMode:t=>e({advancedMode:t}),setShowHints:t=>e({showHints:t}),setDebugMobileLayout:t=>e({debugMobileLayout:t}),setInvertY:t=>e({invertY:t}),setResolutionMode:t=>{e({resolutionMode:t}),R.emit("reset_accum",void 0)},setFixedResolution:(t,a)=>{e({fixedResolution:[t,a]}),R.emit("reset_accum",void 0)},setLockSceneOnSwitch:t=>e({lockSceneOnSwitch:t}),setExportIncludeScene:t=>e({exportIncludeScene:t}),setIsTimelineHovered:t=>e({isTimelineHovered:t}),incrementTabSwitchCount:()=>e(t=>({tabSwitchCount:t.tabSwitchCount+1})),setIsBroadcastMode:t=>e({isBroadcastMode:t}),openHelp:t=>e(a=>({helpWindow:{visible:!0,activeTopicId:t||a.helpWindow.activeTopicId},contextMenu:{...a.contextMenu,visible:!1}})),closeHelp:()=>e({helpWindow:{visible:!1,activeTopicId:null}}),openContextMenu:(t,a,r,i)=>e({contextMenu:{visible:!0,x:t,y:a,items:r,targetHelpIds:i||[]}}),closeContextMenu:()=>e(t=>({contextMenu:{...t.contextMenu,visible:!1}})),openWorkshop:t=>e({workshopOpen:!0,workshopEditFormula:t}),closeWorkshop:()=>e({workshopOpen:!1,workshopEditFormula:void 0}),movePanel:(t,a,r)=>e(i=>{var m,b;const n={...i.panels};n[t]||(n[t]={id:t,location:a,order:0,isCore:!1,isOpen:!0});const l=!0;let s=r;s===void 0&&(s=Object.values(n).filter(y=>y.location===a).length),(a==="left"||a==="right")&&Object.values(n).forEach(g=>{g.location===a&&g.id!==t&&(g.isOpen=!1)});let c=n[t].floatPos;a==="float"&&!c&&(c={x:window.innerWidth/2-150,y:window.innerHeight/2-200}),n[t]={...n[t],location:a,order:s,isOpen:l,floatPos:c};const u=a==="left"?t:((m=Object.values(n).find(g=>g.location==="left"&&g.isOpen))==null?void 0:m.id)||null,h=a==="right"?t:((b=Object.values(n).find(g=>g.location==="right"&&g.isOpen))==null?void 0:b.id)||null,f=a==="left"?!1:i.isLeftDockCollapsed,p=a==="right"?!1:i.isRightDockCollapsed;return{panels:n,activeLeftTab:u,activeRightTab:h,isLeftDockCollapsed:f,isRightDockCollapsed:p}}),reorderPanel:(t,a)=>e(r=>{const i={...r.panels},n=i[t],l=i[a];if(!n||!l)return{};n.location!==l.location&&(n.location=l.location,n.isOpen=!1);const s=l.location,c=Object.values(i).filter(p=>p.location===s).sort((p,m)=>p.order-m.order),u=c.findIndex(p=>p.id===t),h=c.findIndex(p=>p.id===a);if(u===-1||h===-1)return{};const[f]=c.splice(u,1);return c.splice(h,0,f),c.forEach((p,m)=>{i[p.id]={...i[p.id],order:m}}),{panels:i}}),togglePanel:(t,a)=>e(r=>{var u,h;const i={...r.panels};if(!i[t])return{};const n=i[t],l=a!==void 0?a:!n.isOpen;if(n.location==="float")n.isOpen=l;else if(l){if(Object.values(i).forEach(f=>{f.location===n.location&&f.id!==t&&(f.isOpen=!1)}),n.isOpen=!0,n.location==="left")return{panels:i,activeLeftTab:t,isLeftDockCollapsed:!1};if(n.location==="right")return{panels:i,activeRightTab:t,isRightDockCollapsed:!1}}else n.isOpen=!1;const s=((u=Object.values(i).find(f=>f.location==="left"&&f.isOpen))==null?void 0:u.id)||null,c=((h=Object.values(i).find(f=>f.location==="right"&&f.isOpen))==null?void 0:h.id)||null;return{panels:i,activeLeftTab:s,activeRightTab:c}}),setDockSize:(t,a)=>e({[t==="left"?"leftDockSize":"rightDockSize"]:a}),setDockCollapsed:(t,a)=>e({[t==="left"?"isLeftDockCollapsed":"isRightDockCollapsed"]:a}),setFloatPosition:(t,a,r)=>e(i=>({panels:{...i.panels,[t]:{...i.panels[t],floatPos:{x:a,y:r}}}})),setFloatSize:(t,a,r)=>e(i=>({panels:{...i.panels,[t]:{...i.panels[t],floatSize:{width:a,height:r}}}})),startPanelDrag:t=>e(a=>({draggingPanelId:t,dragSnapshot:JSON.parse(JSON.stringify(a.panels))})),endPanelDrag:()=>e({draggingPanelId:null,dragSnapshot:null}),cancelPanelDrag:()=>e(t=>t.dragSnapshot?{panels:t.dragSnapshot,draggingPanelId:null,dragSnapshot:null}:{draggingPanelId:null}),setActiveTab:t=>o().togglePanel(t,!0),floatTab:t=>o().movePanel(t,"float"),dockTab:t=>o().movePanel(t,"right"),setCompositionOverlay:t=>e({compositionOverlay:t}),setCompositionOverlaySettings:t=>e(a=>({compositionOverlaySettings:{...a.compositionOverlaySettings,...t}})),startTutorial:t=>e({tutorialActive:!0,tutorialLessonId:t,tutorialStepIndex:0,showHints:!1}),advanceTutorialStep:()=>e(t=>({tutorialStepIndex:t.tutorialStepIndex+1})),skipTutorial:()=>e({tutorialActive:!1,tutorialLessonId:null,tutorialStepIndex:0,showHints:!0}),completeTutorial:()=>e(t=>{const a=t.tutorialLessonId!==null&&!t.tutorialCompleted.includes(t.tutorialLessonId)?[...t.tutorialCompleted,t.tutorialLessonId]:t.tutorialCompleted;try{localStorage.setItem("gmt-tutorials",JSON.stringify({completed:a}))}catch{}return{tutorialActive:!1,tutorialLessonId:null,tutorialStepIndex:0,tutorialCompleted:a,showHints:!0}})}),fa=()=>typeof window>"u"?!1:window.matchMedia&&window.matchMedia("(pointer: coarse)").matches||window.innerWidth<768,pa=(e,o)=>({dpr:fa()?1:Math.min(typeof window<"u"&&window.devicePixelRatio||1,2),aaLevel:1,msaaSamples:1,aaMode:"Always",accumulation:!0,previewMode:!1,renderMode:"Direct",isPaused:!1,sampleCap:256,isExporting:!1,adaptiveSuppressed:!1,renderRegion:null,previewRegion:null,isBucketRendering:!1,bucketSize:512,outputWidth:1920,outputHeight:1080,tileCols:1,tileRows:1,matchViewportAspect:!0,convergenceThreshold:.25,samplesPerBucket:64,canvasPixelSize:[1920,1080],setDpr:t=>{e({dpr:t}),R.emit("reset_accum",void 0)},setAALevel:t=>{e({aaLevel:t});const{aaMode:a}=o();(a==="Always"||a==="Auto")&&e({dpr:t}),R.emit("reset_accum",void 0)},setMSAASamples:t=>{e({msaaSamples:t});const{aaMode:a}=o();a==="Always"||a==="Auto"?R.emit("config",{msaaSamples:t}):R.emit("config",{msaaSamples:1}),R.emit("reset_accum",void 0)},setAAMode:t=>{e({aaMode:t});const{aaLevel:a,msaaSamples:r}=o();t==="Off"?(e({dpr:1}),R.emit("config",{msaaSamples:1})):(e({dpr:a}),R.emit("config",{msaaSamples:r})),R.emit("reset_accum",void 0)},setAccumulation:t=>{e({accumulation:t}),R.emit("reset_accum",void 0)},setPreviewMode:t=>{e({previewMode:t}),R.emit("config",{previewMode:t})},setRenderMode:t=>{e({renderMode:t});const a=t==="PathTracing"?1:0,r=o().setLighting;r&&r({renderMode:a})},setIsPaused:t=>e({isPaused:t}),setSampleCap:t=>e({sampleCap:t}),setRenderRegion:t=>{e({renderRegion:t});const a=t?new ve(t.minX,t.minY):new ve(0,0),r=t?new ve(t.maxX,t.maxY):new ve(1,1);R.emit("uniform",{key:ue.RegionMin,value:a}),R.emit("uniform",{key:ue.RegionMax,value:r}),R.emit("reset_accum",void 0)},setIsBucketRendering:t=>{e({isBucketRendering:t})},setBucketSize:t=>e({bucketSize:t}),setOutputWidth:t=>e({outputWidth:Math.max(64,Math.round(t))}),setOutputHeight:t=>e({outputHeight:Math.max(64,Math.round(t))}),setTileCols:t=>e({tileCols:Math.max(1,Math.min(32,Math.round(t)))}),setTileRows:t=>e({tileRows:Math.max(1,Math.min(32,Math.round(t)))}),setMatchViewportAspect:t=>e({matchViewportAspect:t}),setConvergenceThreshold:t=>e({convergenceThreshold:t}),setSamplesPerBucket:t=>e({samplesPerBucket:t}),setCanvasPixelSize:(t,a)=>e({canvasPixelSize:[t,a]}),setIsExporting:t=>e({isExporting:t}),setAdaptiveSuppressed:t=>e({adaptiveSuppressed:t}),setPreviewRegion:t=>e({previewRegion:t})}),wo=new Uint32Array(256);for(let e=0;e<256;e++){let o=e;for(let t=0;t<8;t++)o=o&1?3988292384^o>>>1:o>>>1;wo[e]=o}const ha=e=>{let o=-1;for(let t=0;t<e.length;t++)o=o>>>8^wo[(o^e[t])&255];return(o^-1)>>>0},ma=new TextEncoder,Vt=new TextDecoder,ga=e=>{const o=new Uint8Array(e.length);for(let t=0;t<e.length;t++)o[t]=e.charCodeAt(t);return o},nt=e=>{let o="";for(let t=0;t<e.length;t++)o+=String.fromCharCode(e[t]);return o},Gt=(e,o,t)=>{e[o]=t>>>24&255,e[o+1]=t>>>16&255,e[o+2]=t>>>8&255,e[o+3]=t&255},ya=async(e,o,t)=>{const a=await e.arrayBuffer(),r=new Uint8Array(a);if(r[0]!==137||r[1]!==80||r[2]!==78||r[3]!==71)throw new Error("Not a valid PNG");const i=ga(o),n=ma.encode(t),l=i.length+1+1+1+1+1+n.length,s=12+l,c=new Uint8Array(s);Gt(c,0,l),c[4]=105,c[5]=84,c[6]=88,c[7]=116;let u=8;c.set(i,u),u+=i.length,c[u++]=0,c[u++]=0,c[u++]=0,c[u++]=0,c[u++]=0,c.set(n,u);const h=ha(c.slice(4,s-4));Gt(c,s-4,h);let f=8;for(;f<r.length;){const m=r[f]<<24|r[f+1]<<16|r[f+2]<<8|r[f+3];if(nt(r.slice(f+4,f+8))==="IEND")break;f+=12+m}const p=new Uint8Array(r.length+s);return p.set(r.slice(0,f),0),p.set(c,f),p.set(r.slice(f),f+s),new Blob([p],{type:"image/png"})},pn=async(e,o)=>{const t=await e.arrayBuffer(),a=new Uint8Array(t);if(a[0]!==137||a[1]!==80)return null;let r=8;for(;r<a.length;){const i=a[r]<<24|a[r+1]<<16|a[r+2]<<8|a[r+3],n=nt(a.slice(r+4,r+8));if(n==="iTXt"){const l=a.slice(r+8,r+8+i);let s=-1;for(let c=0;c<l.length;c++)if(l[c]===0){s=c;break}if(s!==-1&&nt(l.slice(0,s))===o){let u=s+1+1+1;for(;u<l.length&&l[u]!==0;)u++;for(u++;u<l.length&&l[u]!==0;)u++;return u++,Vt.decode(l.slice(u))}}if(n==="tEXt"){const l=a.slice(r+8,r+8+i);let s=-1;for(let c=0;c<l.length;c++)if(l[c]===0){s=c;break}if(s!==-1&&nt(l.slice(0,s))===o)return Vt.decode(l.slice(s+1))}if(n==="IEND")break;r+=12+i}return null};class ba{constructor(){M(this,"activeCamera",null);M(this,"virtualSpace",null);M(this,"renderer",null);M(this,"pipeline",null);M(this,"_worker",null);M(this,"_shadow",{isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,convergenceValue:1,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}});M(this,"_localOffset",{x:0,y:0,z:0,xL:0,yL:0,zL:0});M(this,"_offsetGuarded",!1);M(this,"_offsetGuardTimer",null);M(this,"_onCompiling",null);M(this,"_onCompileTime",null);M(this,"_onShaderCode",null);M(this,"_onBootedCallback",null);M(this,"_pendingSnapshots",new Map);M(this,"_pendingPicks",new Map);M(this,"_pendingFocusPicks",new Map);M(this,"_pendingHistograms",new Map);M(this,"_pendingShaderSource",new Map);M(this,"_gpuInfo","");M(this,"_lastGeneratedFrag","");M(this,"_onWorkerFrame",null);M(this,"_pendingTimeouts",new Map);M(this,"_exportStartTimer",null);M(this,"_exportFinishTimer",null);M(this,"modulations",{});M(this,"_isBucketRendering",!1);M(this,"_isExporting",!1);M(this,"_exportReady",null);M(this,"_exportFrameDone",null);M(this,"_exportComplete",null);M(this,"_exportError",null);M(this,"_container",null);M(this,"_lastInitArgs",null);M(this,"_onCrash",null);M(this,"pendingTeleport",null);M(this,"_isGizmoInteracting",!1);M(this,"_bootSent",!1);M(this,"_pendingOffsetSync",null)}initWorkerMode(o,t,a,r,i,n,l){if(this._worker)return;this._container=o.parentElement,this._lastInitArgs={config:t,width:a,height:r,dpr:i,isMobile:n,initialCamera:l};const s=o.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-BSzzxJeG.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=u=>{this._handleWorkerMessage(u.data)},this._worker.onerror=u=>{console.error("[WorkerProxy] Worker error:",u),this._handleWorkerCrash("Worker error: "+(u.message||"unknown"))};const c={type:"INIT",canvas:s,width:a,height:r,dpr:i,isMobile:n,initialConfig:t,initialCamera:l};this._worker.postMessage(c,[s])}restart(o,t){if(!this._container||!this._lastInitArgs)return;this._clearAllTimers(),this._worker&&(this._worker.onmessage=null,this._worker.onerror=null,this._worker.terminate(),this._worker=null),this._shadow={isBooted:!1,isCompiling:!1,hasCompiledShader:!1,isPaused:!1,dirty:!1,lastCompileDuration:0,lastMeasuredDistance:1,accumulationCount:0,convergenceValue:1,frameCount:0,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}};const a=this._container.querySelector("canvas");a&&a.remove();const{width:r,height:i,dpr:n,isMobile:l}=this._lastInitArgs,s=document.createElement("canvas");s.width=r*n,s.height=i*n,s.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none",this._container.appendChild(s),this._lastInitArgs={...this._lastInitArgs,config:o,initialCamera:t};const c=s.transferControlToOffscreen();this._worker=new Worker(new URL(""+new URL("renderWorker-BSzzxJeG.js",import.meta.url).href,import.meta.url),{type:"module"}),this._worker.onmessage=h=>{this._handleWorkerMessage(h.data)},this._worker.onerror=h=>{console.error("[WorkerProxy] Worker error:",h),this._handleWorkerCrash("Worker error: "+(h.message||"unknown"))};const u={type:"INIT",canvas:c,width:r,height:i,dpr:n,isMobile:l,initialConfig:o,initialCamera:t};this._worker.postMessage(u,[c])}set onCompiling(o){this._onCompiling=o}set onCompileTime(o){this._onCompileTime=o}set onShaderCode(o){this._onShaderCode=o}registerFrameCounter(o){this._onWorkerFrame=o}_handleWorkerMessage(o){switch(o.type){case"READY":break;case"FRAME_READY":if(o.state)if(this._shadow=o.state,this._offsetGuarded){const t=o.state.sceneOffset,a=this._localOffset;Math.abs(t.x+t.xL-(a.x+a.xL))+Math.abs(t.y+t.yL-(a.y+a.yL))+Math.abs(t.z+t.zL-(a.z+a.zL))<.001&&(this._offsetGuarded=!1,this._offsetGuardTimer&&(clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=null))}else this._localOffset={...o.state.sceneOffset};this._onWorkerFrame&&this._onWorkerFrame();break;case"COMPILING":this._shadow.isCompiling=!!o.status,this._shadow.hasCompiledShader=!o.status||this._shadow.hasCompiledShader,this._onCompiling&&this._onCompiling(o.status),R.emit(oe.IS_COMPILING,o.status);break;case"COMPILE_TIME":o.duration&&(this._shadow.lastCompileDuration=o.duration),this._onCompileTime&&this._onCompileTime(o.duration),R.emit(oe.COMPILE_TIME,o.duration);break;case"SHADER_CODE":this._lastGeneratedFrag=o.code,this._onShaderCode&&this._onShaderCode(o.code),R.emit(oe.SHADER_CODE,o.code);break;case"SHADER_SOURCE_RESULT":this._resolveRequest(o.id,this._pendingShaderSource,o.code);break;case"BOOTED":this._shadow.isBooted=!0,o.gpuInfo&&(this._gpuInfo=o.gpuInfo),this._onBootedCallback&&this._onBootedCallback();break;case"GPU_INFO":this._gpuInfo=o.info;break;case"HISTOGRAM_RESULT":this._resolveRequest(o.id,this._pendingHistograms,o.data);break;case"SNAPSHOT_RESULT":this._resolveRequest(o.id,this._pendingSnapshots,o.blob);break;case"PICK_RESULT":this._resolveRequest(o.id,this._pendingPicks,o.position?new j(o.position[0],o.position[1],o.position[2]):null);break;case"FOCUS_RESULT":this._resolveRequest(o.id,this._pendingFocusPicks,o.distance);break;case"ERROR":console.error("[WorkerProxy] Worker error:",o.message);break;case"EXPORT_READY":this._exportStartTimer&&(clearTimeout(this._exportStartTimer),this._exportStartTimer=null),this._exportReady&&this._exportReady();break;case"EXPORT_FRAME_DONE":this._shadow.lastMeasuredDistance=o.measuredDistance,this._exportFrameDone&&this._exportFrameDone({frameIndex:o.frameIndex,progress:o.progress,measuredDistance:o.measuredDistance});break;case"EXPORT_COMPLETE":this._isExporting=!1,this._exportFinishTimer&&(clearTimeout(this._exportFinishTimer),this._exportFinishTimer=null),this._exportComplete&&this._exportComplete(o.blob??null);break;case"EXPORT_ERROR":this._isExporting=!1,this._exportStartTimer&&(clearTimeout(this._exportStartTimer),this._exportStartTimer=null),this._exportFinishTimer&&(clearTimeout(this._exportFinishTimer),this._exportFinishTimer=null),console.error("[WorkerProxy] Export error:",o.message),this._exportError&&this._exportError(o.message);break;case"BUCKET_STATUS":this._isBucketRendering=o.isRendering,R.emit(oe.BUCKET_STATUS,{isRendering:o.isRendering,progress:o.progress,totalBuckets:o.totalBuckets,currentBucket:o.currentBucket});break;case"BUCKET_IMAGE":this._handleBucketImage(o);break}}post(o,t){this._worker&&(t?this._worker.postMessage(o,t):this._worker.postMessage(o))}_pendingRequest(o,t,a,r){const i=crypto.randomUUID();return new Promise(n=>{o.set(i,n),this.post(t(i)),this._pendingTimeouts.set(i,setTimeout(()=>{this._pendingTimeouts.delete(i),o.has(i)&&(o.delete(i),n(a))},r))})}_resolveRequest(o,t,a){const r=t.get(o);r&&(r(a),t.delete(o));const i=this._pendingTimeouts.get(o);i&&(clearTimeout(i),this._pendingTimeouts.delete(o))}_clearAllTimers(){this._pendingTimeouts.forEach(o=>clearTimeout(o)),this._pendingTimeouts.clear(),this._offsetGuardTimer&&(clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=null),this._exportStartTimer&&(clearTimeout(this._exportStartTimer),this._exportStartTimer=null),this._exportFinishTimer&&(clearTimeout(this._exportFinishTimer),this._exportFinishTimer=null)}set onCrash(o){this._onCrash=o}set onBooted(o){this._onBootedCallback=o}_handleWorkerCrash(o){console.error(`[WorkerProxy] Worker crashed: ${o}. Terminating worker.`),this._worker&&(this._worker.terminate(),this._worker=null),this._clearAllTimers(),this._pendingSnapshots.forEach(t=>t(null)),this._pendingSnapshots.clear(),this._pendingPicks.forEach(t=>t(null)),this._pendingPicks.clear(),this._pendingFocusPicks.forEach(t=>t(-1)),this._pendingFocusPicks.clear(),this._pendingHistograms.forEach(t=>t(new Float32Array(0))),this._pendingHistograms.clear(),this._pendingShaderSource.forEach(t=>t(null)),this._pendingShaderSource.clear(),this._exportReady&&(this._exportReady=null),this._exportComplete&&(this._exportComplete=null),this._exportFrameDone&&(this._exportFrameDone=null),this._exportError&&(this._exportError=null),this._onCrash&&this._onCrash(o)}terminateWorker(){this._handleWorkerCrash("Manual termination")}get isBooted(){return this._shadow.isBooted}get isCompiling(){return this._shadow.isCompiling}get isExporting(){return this._isExporting}get isBucketRendering(){return this._isBucketRendering}get sceneOffset(){return this._localOffset}get lastGeneratedFrag(){return this._lastGeneratedFrag}get accumulationCount(){return this._shadow.accumulationCount}get convergenceValue(){return this._shadow.convergenceValue}get frameCount(){return this._shadow.frameCount}get lastCompileDuration(){return this._shadow.lastCompileDuration}get lastMeasuredDistance(){return this._shadow.lastMeasuredDistance}set lastMeasuredDistance(o){this._shadow.lastMeasuredDistance=o}get hasCompiledShader(){return this._shadow.hasCompiledShader}get dirty(){return this._shadow.dirty}set dirty(o){o&&this.post({type:"SET_DIRTY"})}get isPaused(){return this._shadow.isPaused}set isPaused(o){this.post({type:"PAUSE",paused:o})}get shouldSnapCamera(){return!1}set shouldSnapCamera(o){o&&this.post({type:"SNAP_CAMERA"})}get isGizmoInteracting(){return this._isGizmoInteracting}set isGizmoInteracting(o){this._isGizmoInteracting=o}get isCameraInteracting(){return!1}set isCameraInteracting(o){o&&this.post({type:"MARK_INTERACTION"})}get bootSent(){return this._bootSent}bootWithConfig(o,t){if(this._bootSent){console.log("[WorkerProxy] Boot already in progress — restarting worker"),this._bootSent=!1,this.restart(o,t),this.post({type:"BOOT",config:o,camera:t}),this._bootSent=!0;return}this.post({type:"BOOT",config:o,camera:t}),this._bootSent=!0}setUniform(o,t,a=!1){this.post({type:"UNIFORM",key:o,value:t,noReset:a})}setPreviewSampleCap(o){this.post({type:"SET_SAMPLE_CAP",n:o})}resetAccumulation(){this.post({type:"RESET_ACCUM"})}markInteraction(){this.post({type:"MARK_INTERACTION"})}updateTexture(o,t){if(t){const a=t.indexOf(";base64,"),r=a>=0?t.substring(a+8,a+12):"";t.startsWith("data:image/vnd.radiance")||t.startsWith("data:image/x-hdr")||r.startsWith("Iz8")||r.startsWith("Iz9")?fetch(t).then(n=>n.arrayBuffer()).then(n=>{this.post({type:"TEXTURE_HDR",textureType:o,buffer:n},[n])}).catch(n=>console.error("[WorkerProxy] HDR texture transfer failed:",n)):fetch(t).then(n=>n.blob()).then(n=>createImageBitmap(n,{premultiplyAlpha:"none",imageOrientation:"flipY"})).then(n=>{this.post({type:"TEXTURE",textureType:o,bitmap:n},[n])}).catch(n=>console.error("[WorkerProxy] Texture transfer failed:",n))}else this.post({type:"TEXTURE",textureType:o,bitmap:null})}queueOffsetSync(o){this._pendingOffsetSync={x:o.x,y:o.y,z:o.z,xL:o.xL,yL:o.yL,zL:o.zL},this.setShadowOffset(o)}setShadowOffset(o){this._localOffset={...o},this._offsetGuarded=!0,this._offsetGuardTimer&&clearTimeout(this._offsetGuardTimer),this._offsetGuardTimer=setTimeout(()=>{this._offsetGuarded=!1,this._offsetGuardTimer=null},2e3)}applyOffsetShift(o,t,a){}resolveLightPosition(o,t){return o}measureDistanceAtScreenPoint(o,t,a,r){return this._shadow.lastMeasuredDistance}pickWorldPosition(o,t,a,r){return a?this._pendingRequest(this._pendingPicks,i=>({type:"PICK_WORLD_POSITION",id:i,x:o,y:t,fast:r||void 0}),null,5e3):null}startFocusPick(o,t){return this._pendingRequest(this._pendingFocusPicks,a=>({type:"FOCUS_PICK_START",id:a,x:o,y:t}),-1,5e3)}sampleFocusPick(o,t){return this._pendingRequest(this._pendingFocusPicks,a=>({type:"FOCUS_PICK_SAMPLE",id:a,x:o,y:t}),-1,2e3)}endFocusPick(){this.post({type:"FOCUS_PICK_END"})}captureSnapshot(){return this._pendingRequest(this._pendingSnapshots,o=>({type:"CAPTURE_SNAPSHOT",id:o}),null,1e4)}get gpuInfo(){return this._gpuInfo||"Generic WebGL Device"}requestHistogramReadback(o){return this._pendingRequest(this._pendingHistograms,t=>({type:"HISTOGRAM_READBACK",id:t,source:o}),new Float32Array(0),5e3)}getCompiledFragmentShader(){return this._pendingRequest(this._pendingShaderSource,o=>({type:"GET_SHADER_SOURCE",id:o,variant:"compiled"}),null,5e3)}getTranslatedFragmentShader(){return this._pendingRequest(this._pendingShaderSource,o=>({type:"GET_SHADER_SOURCE",id:o,variant:"translated"}),null,5e3)}checkHalfFloatAlphaSupport(){return!0}sendRenderTick(o,t,a,r){if(this._pendingOffsetSync){const i=this._pendingOffsetSync;this._pendingOffsetSync=null,this.post({type:"RENDER_TICK",camera:o,offset:i,delta:a,timestamp:performance.now(),renderState:r,syncOffset:!0})}else this.post({type:"RENDER_TICK",camera:o,offset:t,delta:a,timestamp:performance.now(),renderState:r})}resizeWorker(o,t,a){this.post({type:"RESIZE",width:o,height:t,dpr:a})}sendConfig(o){this.post({type:"CONFIG",config:o})}registerFormula(o,t){this.post({type:"REGISTER_FORMULA",id:o,shader:t})}startExport(o,t,a){return this._isExporting=!0,new Promise((r,i)=>{this._exportReady=()=>{this._exportReady=null,r()},this._exportError=s=>{this._exportError=null,i(new Error(s))};let n=null;if(t){const s=t;n=new WritableStream({write(c){return s.write(c)},close(){return s.close()},abort(c){return s.abort(c)}})}const l=[];n&&l.push(n),this.post({type:"EXPORT_START",config:o,stream:n,dirHandle:a},l),this._exportStartTimer=setTimeout(()=>{this._exportStartTimer=null,this._exportReady&&(this._exportReady=null,i(new Error("Export start timed out")))},1e4)})}renderExportFrame(o,t,a,r,i,n){return new Promise(l=>{this._exportFrameDone=s=>{this._exportFrameDone=null,l(s)},this.post({type:"EXPORT_RENDER_FRAME",frameIndex:o,time:t,camera:a,offset:r,renderState:i,modulations:n})})}finishExport(){return new Promise((o,t)=>{this._exportComplete=a=>{this._exportComplete=null,o(a)},this._exportError=a=>{this._exportError=null,t(new Error(a))},this.post({type:"EXPORT_FINISH"}),this._exportFinishTimer=setTimeout(()=>{this._exportFinishTimer=null,this._exportComplete&&(this._exportComplete=null,t(new Error("Export finish timed out")))},6e4)})}cancelExport(){this.post({type:"EXPORT_CANCEL"}),this._isExporting=!1}startBucketRender(o,t,a){this._isBucketRendering=!0,this.post({type:"BUCKET_START",exportImage:o,config:t,exportData:a?{preset:JSON.stringify(a.preset),name:a.name,version:a.version}:void 0})}stopBucketRender(){this.post({type:"BUCKET_STOP"}),this._isBucketRendering=!1}setPreviewRegion(o,t,a,r){this.post({type:"PREVIEW_REGION_SET",region:o,outputWidth:t,outputHeight:a,sampleCap:r})}clearPreviewRegion(){this.post({type:"PREVIEW_REGION_CLEAR"})}async _handleBucketImage(o){const{pixels:t,width:a,height:r,presetJson:i,filename:n}=o,l=document.createElement("canvas");l.width=a,l.height=r;const s=l.getContext("2d");if(!s)return;const c=new ImageData(new Uint8ClampedArray(t.buffer),a,r);s.putImageData(c,0,0),l.toBlob(async u=>{if(u)try{const h=await ya(u,"FractalData",i),f=URL.createObjectURL(h),p=document.createElement("a");p.download=n,p.href=f,p.click(),URL.revokeObjectURL(f)}catch(h){console.error("Failed to inject metadata",h);const f=document.createElement("a");f.download=n,f.href=l.toDataURL("image/png"),f.click()}},"image/png")}}let yt=null;function je(){return yt||(yt=new ba),yt}class va{constructor(){M(this,"definitions",new Map)}register(o){this.definitions.set(o.id,o)}registerAlias(o,t){const a=this.definitions.get(t);a?this.definitions.set(o,a):console.warn(`FractalRegistry: Cannot register alias '${o}' for unknown target '${t}'`)}get(o){return this.definitions.get(o)}getAll(){return Array.from(new Set(this.definitions.values()))}getIds(){return Array.from(this.definitions.keys())}}const fe=new va;class B{constructor(o={x:0,y:0,z:0,xL:0,yL:0,zL:0}){M(this,"offset");M(this,"_rotMatrix",new aa);M(this,"_camRight",new j);M(this,"_camUp",new j);M(this,"_camForward",new j);M(this,"_visualVector",new j);M(this,"_quatInverse",new Oe);M(this,"_relativePos",new j);M(this,"smoothedPos",new j);M(this,"smoothedQuat",new Oe);M(this,"smoothedFov",60);M(this,"prevOffsetState");M(this,"isLocked",!1);M(this,"isFirstFrame",!0);this.offset={...o},this.prevOffsetState={...o}}get state(){return{...this.offset}}set state(o){this.offset={...o},B.normalize(this.offset)}static split(o){const t=Math.fround(o),a=o-t;return{high:t,low:a}}static normalize(o){if(Math.abs(o.xL)>.5){const a=Math.floor(o.xL+.5);o.x+=a,o.xL-=a}if(Math.abs(o.yL)>.5){const a=Math.floor(o.yL+.5);o.y+=a,o.yL-=a}if(Math.abs(o.zL)>.5){const a=Math.floor(o.zL+.5);o.z+=a,o.zL-=a}}setFromUnified(o,t,a){const r=B.split(o),i=B.split(t),n=B.split(a);this.offset.x=r.high,this.offset.xL=r.low,this.offset.y=i.high,this.offset.yL=i.low,this.offset.z=n.high,this.offset.zL=n.low,B.normalize(this.offset)}move(o,t,a){this.offset.xL+=o,this.offset.yL+=t,this.offset.zL+=a,B.normalize(this.offset)}absorbCamera(o){this.offset.xL+=o.x,this.offset.yL+=o.y,this.offset.zL+=o.z,B.normalize(this.offset)}resetSmoothing(){this.isFirstFrame=!0,this.prevOffsetState={...this.offset},this.isLocked=!1}updateSmoothing(o,t,a,r,i){if(!i&&!r&&!this.isFirstFrame){this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isLocked=!0;return}if(this.isFirstFrame||r){this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion),this.smoothedFov=t,this.prevOffsetState={...this.offset},this.isFirstFrame=!1,this.isLocked=!1;return}const n=this.offset,l=this.prevOffsetState;if(l.x!==n.x||l.y!==n.y||l.z!==n.z||l.xL!==n.xL||l.yL!==n.yL||l.zL!==n.zL){const c=l.x-n.x+(l.xL-n.xL),u=l.y-n.y+(l.yL-n.yL),h=l.z-n.z+(l.zL-n.zL);if(Math.abs(c)>10||Math.abs(u)>10||Math.abs(h)>10){this.resetSmoothing(),this.smoothedPos.copy(o.position),this.smoothedQuat.copy(o.quaternion);return}this.smoothedPos.x+=c,this.smoothedPos.y+=u,this.smoothedPos.z+=h,this.prevOffsetState={...n}}const s=this.smoothedPos.distanceToSquared(o.position);if(this.isLocked?s>1e-18&&(this.isLocked=!1):s<1e-21&&(this.isLocked=!0),this.isLocked)this.smoothedPos.copy(o.position);else{const c=1-Math.exp(-40*a);this.smoothedPos.lerp(o.position,c)}this.smoothedQuat.copy(o.quaternion),this.smoothedFov=t}getUnifiedCameraState(o,t){const a={...this.offset};return a.xL+=o.position.x,a.yL+=o.position.y,a.zL+=o.position.z,B.normalize(a),{position:{x:0,y:0,z:0},rotation:{x:o.quaternion.x,y:o.quaternion.y,z:o.quaternion.z,w:o.quaternion.w},sceneOffset:a,targetDistance:t>0?t:3.5}}applyCameraState(o,t){if(t.sceneOffset){const c={...t.sceneOffset};c.xL+=t.position.x,c.yL+=t.position.y,c.zL+=t.position.z,this.state=c}const a=t.rotation,r=a.x??a._x??0,i=a.y??a._y??0,n=a.z??a._z??0,l=a.w??a._w??1;o.position.set(0,0,0),o.quaternion.set(r,i,n,l).normalize();const s=new j(0,1,0).applyQuaternion(o.quaternion);o.up.copy(s),o.updateMatrixWorld(),this.resetSmoothing(),this.smoothedPos.set(0,0,0),this.smoothedQuat.copy(o.quaternion)}updateShaderUniforms(o,t,a){const r=this.offset.x+this.offset.xL+o.x,i=this.offset.y+this.offset.yL+o.y,n=this.offset.z+this.offset.zL+o.z,l=Math.fround(r),s=Math.fround(i),c=Math.fround(n);t.set(l,s,c),a.set(r-l,i-s,n-c)}getLightShaderVector(o,t,a,r){const i=this.offset;t?(this._relativePos.set(o.x,o.y,o.z).applyQuaternion(a.quaternion),r.copy(this._relativePos)):r.set(o.x-(i.x+i.xL)-a.position.x,o.y-(i.y+i.yL)-a.position.y,o.z-(i.z+i.zL)-a.position.z)}resolveRealWorldPosition(o,t,a){const r=this.offset;return t?(this._visualVector.set(o.x,o.y,o.z).applyQuaternion(a.quaternion),{x:a.position.x+this._visualVector.x+(r.x+r.xL),y:a.position.y+this._visualVector.y+(r.y+r.yL),z:a.position.z+this._visualVector.z+(r.z+r.zL)}):(this._visualVector.set(o.x-(r.x+r.xL)-a.position.x,o.y-(r.y+r.yL)-a.position.y,o.z-(r.z+r.zL)-a.position.z),this._quatInverse.copy(a.quaternion).invert(),this._visualVector.applyQuaternion(this._quatInverse),{x:this._visualVector.x,y:this._visualVector.y,z:this._visualVector.z})}resolveRealWorldRotation(o,t,a){const r=new j(0,0,-1).applyEuler(new Ue(o.x,o.y,o.z,"YXZ"));t?r.applyQuaternion(a.quaternion):r.applyQuaternion(a.quaternion.clone().invert());const i=new Oe().setFromUnitVectors(new j(0,0,-1),r),n=new Ue().setFromQuaternion(i,"YXZ");return{x:n.x,y:n.y,z:n.z}}}let dt=null,_o=null,Ee=null,we=null,Io=!1;function hn(e){dt=e}function mn(e){_o=e}function He(){return dt}function gn(){return _o}function yn(e){const o=ge.getState().optics,t=o?o.camType>.5&&o.camType<1.5:!1;if(Io=t,t){const a=o.orthoScale??2,i=e.aspect||1,n=a/2,l=n*i;we?(we.left=-l,we.right=l,we.top=n,we.bottom=-n):we=new ra(-l,l,n,-n,.001,1e4),we.position.copy(e.position),we.quaternion.copy(e.quaternion),we.updateProjectionMatrix(),we.updateMatrixWorld()}else{Ee||(Ee=new ia),Ee.position.copy(e.position),Ee.quaternion.copy(e.quaternion);const a=e;a.fov!==void 0&&(Ee.fov=a.fov,Ee.aspect=a.aspect,Ee.updateProjectionMatrix()),Ee.updateMatrixWorld()}}function bn(){return Io?we||dt:Ee||dt}let Co=!1;function vn(e){Co=e}function xn(){return Co}const Je=je(),Fe={getUnifiedPosition:(e,o)=>new j(o.x+o.xL+e.x,o.y+o.yL+e.y,o.z+o.zL+e.z),getUnifiedFromEngine:()=>{const e=He()||Je.activeCamera;return e?Fe.getUnifiedPosition(e.position,Je.sceneOffset):new j},getRotationFromEngine:()=>{const e=He()||Je.activeCamera;return e?e.quaternion.clone():new Oe},getDistanceFromEngine:()=>{const e=He()||Je.activeCamera;if(e){const o=e.position.length();if(o>.001)return o}return null},getRotationDegrees:e=>{const o=new Oe(e.x,e.y,e.z,e.w),t=new Ue().setFromQuaternion(o);return new j(Be.radToDeg(t.x),Be.radToDeg(t.y),Be.radToDeg(t.z))},teleportPosition:(e,o,t)=>{const a=B.split(e.x),r=B.split(e.y),i=B.split(e.z),n={position:{x:0,y:0,z:0},sceneOffset:{x:a.high,y:r.high,z:i.high,xL:a.low,yL:r.low,zL:i.low}};if(o)n.rotation=o;else{const l=He()||Je.activeCamera;if(l){const s=l.quaternion;n.rotation={x:s.x,y:s.y,z:s.z,w:s.w}}}t!==void 0&&(n.targetDistance=t),R.emit(oe.CAMERA_TELEPORT,n)},teleportRotation:e=>{if(isNaN(e.x)||isNaN(e.y)||isNaN(e.z))return;const o=new Ue(Be.degToRad(e.x),Be.degToRad(e.y),Be.degToRad(e.z)),t=new Oe().setFromEuler(o),a=Fe.getUnifiedFromEngine(),r=B.split(a.x),i=B.split(a.y),n=B.split(a.z);R.emit(oe.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:{x:t.x,y:t.y,z:t.z,w:t.w},sceneOffset:{x:r.high,y:i.high,z:n.high,xL:r.low,yL:i.low,zL:n.low}})}},xa="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";let _e=(e=21)=>{let o="",t=crypto.getRandomValues(new Uint8Array(e|=0));for(;e--;)o+=xa[t[e]&63];return o};const Y=je(),qt=e=>typeof e.setOptics=="function"?e.setOptics:null,Sa=(e,o)=>({cameraMode:"Orbit",sceneOffset:{x:0,y:0,z:1,xL:0,yL:0,zL:-.24751033974403658},cameraRot:{x:0,y:0,z:0,w:1},targetDistance:3.5,undoStack:[],redoStack:[],savedCameras:[],activeCameraId:null,setCameraMode:t=>e({cameraMode:t}),setSceneOffset:t=>{const a={x:t.x,y:t.y,z:t.z,xL:t.xL||0,yL:t.yL||0,zL:t.zL||0};Y.virtualSpace?(Y.virtualSpace.state=a,e({sceneOffset:Y.virtualSpace.state}),R.emit("offset_set",Y.virtualSpace.state)):(e({sceneOffset:a}),R.emit("offset_set",a))},updateCamera:(t,a)=>{e(r=>({savedCameras:r.savedCameras.map(i=>i.id===t?{...i,...a}:i)}))},deleteCamera:t=>{e(a=>({savedCameras:a.savedCameras.filter(r=>r.id!==t),activeCameraId:a.activeCameraId===t?null:a.activeCameraId}))},reorderCameras:(t,a)=>{e(r=>{const i=[...r.savedCameras],[n]=i.splice(t,1);return i.splice(a,0,n),{savedCameras:i}})},addCamera:t=>{const a=o(),r=Fe.getUnifiedFromEngine(),i=Fe.getRotationFromEngine(),n=Y.lastMeasuredDistance>0&&Y.lastMeasuredDistance<1e3?Y.lastMeasuredDistance:a.targetDistance,l=B.split(r.x),s=B.split(r.y),c=B.split(r.z),u={position:{x:0,y:0,z:0},rotation:{x:i.x,y:i.y,z:i.z,w:i.w},sceneOffset:{x:l.high,y:s.high,z:c.high,xL:l.low,yL:s.low,zL:c.low},targetDistance:n},h={...a.optics},f=t||`Camera ${a.savedCameras.length+1}`,p={id:_e(),label:f,position:u.position,rotation:u.rotation,sceneOffset:u.sceneOffset,targetDistance:u.targetDistance,optics:h};e(m=>({savedCameras:[...m.savedCameras,p],activeCameraId:p.id}))},saveToSlot:t=>{const a=o(),r=a.savedCameras[t],i=Fe.getUnifiedFromEngine(),n=Fe.getRotationFromEngine(),l=Y.lastMeasuredDistance>0&&Y.lastMeasuredDistance<1e3?Y.lastMeasuredDistance:a.targetDistance,s=B.split(i.x),c=B.split(i.y),u=B.split(i.z),h={position:{x:0,y:0,z:0},rotation:{x:n.x,y:n.y,z:n.z,w:n.w},sceneOffset:{x:s.high,y:c.high,z:u.high,xL:s.low,yL:c.low,zL:u.low},targetDistance:l},f={...a.optics};if(r)e(p=>({savedCameras:p.savedCameras.map((m,b)=>b===t?{...m,...h,optics:f}:m),activeCameraId:r.id})),R.emit(oe.CAMERA_SLOT_SAVED,{slot:t+1,label:r.label});else{const p=`Camera ${t+1}`,m={id:_e(),label:p,position:h.position,rotation:h.rotation,sceneOffset:h.sceneOffset,targetDistance:h.targetDistance,optics:f};e(b=>({savedCameras:[...b.savedCameras,m],activeCameraId:m.id})),R.emit(oe.CAMERA_SLOT_SAVED,{slot:t+1,label:p})}},selectCamera:t=>{if(t===null){e({activeCameraId:null});return}const a=o().savedCameras.find(r=>r.id===t);if(a){if(R.emit("camera_transition",a),e({activeCameraId:t,cameraRot:a.rotation,sceneOffset:a.sceneOffset,targetDistance:a.targetDistance||3.5}),a.optics){const r=qt(o());r&&r(a.optics)}Y.resetAccumulation()}},duplicateCamera:t=>{const a=o(),r=a.savedCameras.find(s=>s.id===t);if(!r)return;const i={...JSON.parse(JSON.stringify(r)),id:_e(),label:r.label+" (copy)"},n=a.savedCameras.indexOf(r),l=[...a.savedCameras];if(l.splice(n+1,0,i),e({savedCameras:l,activeCameraId:i.id}),R.emit("camera_teleport",i),e({cameraRot:i.rotation,sceneOffset:i.sceneOffset,targetDistance:i.targetDistance||3.5}),i.optics){const s=qt(o());s&&s(i.optics)}Y.resetAccumulation()},resetCamera:()=>{e({activeCameraId:null});const t=o().formula,a=fe.get(t),r=a==null?void 0:a.defaultPreset,i=(r==null?void 0:r.sceneOffset)||{x:0,y:0,z:0,xL:0,yL:0,zL:0},n=(r==null?void 0:r.cameraPos)||{x:0,y:0,z:3.5},l=(r==null?void 0:r.cameraRot)||{x:0,y:0,z:0,w:1},s=(r==null?void 0:r.targetDistance)||3.5,c=i.x+i.xL+n.x,u=i.y+i.yL+n.y,h=i.z+i.zL+n.z,f=B.split(c),p=B.split(u),m=B.split(h),b={x:f.high,y:p.high,z:m.high,xL:f.low,yL:p.low,zL:m.low};o().setSceneOffset(b),e({cameraRot:l,targetDistance:s});const g={position:{x:0,y:0,z:0},rotation:l,sceneOffset:b,targetDistance:s};R.emit("reset_accum",void 0),R.emit("camera_teleport",g)},undoCamera:()=>{const{undoStack:t,redoStack:a}=o();if(t.length===0)return;const r=t[t.length-1];let i;if(Y.activeCamera&&Y.virtualSpace)i=Y.virtualSpace.getUnifiedCameraState(Y.activeCamera,o().targetDistance),Y.virtualSpace.applyCameraState(Y.activeCamera,r);else{const n=o();i={position:{x:0,y:0,z:0},rotation:n.cameraRot,sceneOffset:n.sceneOffset,targetDistance:n.targetDistance}}r.sceneOffset&&e({sceneOffset:r.sceneOffset}),e({cameraRot:r.rotation,targetDistance:r.targetDistance||3.5,redoStack:[...a,i],undoStack:t.slice(0,-1)}),R.emit("reset_accum",void 0),R.emit("camera_teleport",r)},redoCamera:()=>{const{undoStack:t,redoStack:a}=o();if(a.length===0)return;const r=a[a.length-1];let i;if(Y.activeCamera&&Y.virtualSpace)i=Y.virtualSpace.getUnifiedCameraState(Y.activeCamera,o().targetDistance),Y.virtualSpace.applyCameraState(Y.activeCamera,r);else{const n=o();i={position:{x:0,y:0,z:0},rotation:n.cameraRot,sceneOffset:n.sceneOffset,targetDistance:n.targetDistance}}r.sceneOffset&&e({sceneOffset:r.sceneOffset}),e({cameraRot:r.rotation,targetDistance:r.targetDistance||3.5,undoStack:[...t,i],redoStack:a.slice(0,-1)}),R.emit("reset_accum",void 0),R.emit("camera_teleport",r)}});class wa{constructor(){M(this,"features",new Map);M(this,"sortedCache",null)}register(o){if(o.dependsOn)for(const t of o.dependsOn)this.features.has(t)||console.warn(`[FeatureRegistry] "${o.id}" depends on "${t}" which is not yet registered. Ensure registration order is correct.`);this.features.set(o.id,o),this.sortedCache=null}get(o){return this.features.get(o)}getAll(){return this.sortedCache?this.sortedCache:(this.sortedCache=this.topologicalSort(),this.sortedCache)}getTabs(){return Array.from(this.features.values()).filter(o=>o.tabConfig).map(o=>({id:o.id,...o.tabConfig})).sort((o,t)=>o.order-t.order)}getViewportOverlays(){return Array.from(this.features.values()).filter(o=>o.viewportConfig).map(o=>({id:o.id,...o.viewportConfig}))}getMenuFeatures(){return Array.from(this.features.values()).filter(o=>o.menuConfig).map(o=>({id:o.id,...o.menuConfig}))}getExtraMenuItems(){const o=[];return this.features.forEach(t=>{t.menuItems&&t.menuItems.forEach(a=>o.push({...a,featureId:t.id}))}),o}getEngineFeatures(){return Array.from(this.features.values()).filter(o=>!!o.engineConfig)}getDictionary(){const o={formula:"f",cameraPos:"cp",cameraRot:"cr",sceneOffset:"so",targetDistance:"td",animations:"an",sequence:"sq",features:{_alias:"p",children:{}}};return this.features.forEach(t=>{const a=t.shortId||t.id,r={};Object.entries(t.params).forEach(([i,n])=>{n.shortId&&(r[i]=n.shortId)}),o.features.children[t.id]={_alias:a,children:r}}),o}getUniformDefinitions(){const o=[];return this.features.forEach(t=>{Object.values(t.params).forEach(a=>{if(a.uniform){let r=a.type,i=a.default;r==="color"&&(r="vec3"),r==="boolean"&&(r="float",i=i?1:0),(r==="image"||r==="gradient")&&(r="sampler2D",i=null),o.push({name:a.uniform,type:r,default:i})}}),t.extraUniforms&&o.push(...t.extraUniforms)}),o}topologicalSort(){const o=Array.from(this.features.values()),t=new Map;o.forEach((l,s)=>t.set(l.id,s));const a=new Map,r=new Map;for(const l of o)a.set(l.id,0),r.has(l.id)||r.set(l.id,[]);for(const l of o)if(l.dependsOn)for(const s of l.dependsOn)this.features.has(s)&&(a.set(l.id,(a.get(l.id)||0)+1),r.get(s).push(l.id));const i=[];for(const l of o)a.get(l.id)===0&&i.push(l.id);const n=[];for(;i.length>0;){i.sort((s,c)=>(t.get(s)||0)-(t.get(c)||0));const l=i.shift();n.push(this.features.get(l));for(const s of r.get(l)||[]){const c=(a.get(s)||1)-1;a.set(s,c),c===0&&i.push(s)}}if(n.length!==o.length){const l=o.filter(s=>!n.includes(s)).map(s=>s.id);return console.error(`[FeatureRegistry] Dependency cycle detected involving: ${l.join(", ")}`),o}return n}}const N=new wa,Sn=(e,o)=>{const t={};e.forEach(n=>t[n.id]=[]),o.forEach(n=>{t[n.source]&&t[n.source].push(n.target)});const a=new Set,r=new Set,i=n=>{if(!a.has(n)){a.add(n),r.add(n);const l=t[n]||[];for(const s of l)if(!a.has(s)&&i(s)||r.has(s))return!0}return r.delete(n),!1};for(const n of e)if(i(n.id))return!0;return!1},Ut=(e,o)=>{const t={},a={};e.forEach(n=>{t[n.id]=[],a[n.id]=0}),o.forEach(n=>{t[n.source]&&(t[n.source].push(n.target),a[n.target]=(a[n.target]||0)+1)});const r=[];e.forEach(n=>{a[n.id]===0&&r.push(n.id)});const i=[];for(;r.length>0;){r.sort();const n=r.shift(),l=e.find(s=>s.id===n);if(l){const{position:s,...c}=l;i.push(c)}if(t[n])for(const s of t[n])a[s]--,a[s]===0&&r.push(s)}return i},Wt=e=>{const o=e.map((a,r)=>({...a,position:{x:250,y:150+r*200}})),t=[];if(o.length>0){t.push({id:`e-root-start-${o[0].id}`,source:"root-start",target:o[0].id});for(let a=0;a<o.length-1;a++)t.push({id:`e-${o[a].id}-${o[a+1].id}`,source:o[a].id,target:o[a+1].id});t.push({id:`e-${o[o.length-1].id}-root-end`,source:o[o.length-1].id,target:"root-end"})}return{nodes:o,edges:t}},Mo=(e,o)=>{var t,a;if(e.length!==o.length)return!1;for(let r=0;r<e.length;r++){const i=e[r],n=o[r];if(i.id!==n.id||i.type!==n.type||i.enabled!==n.enabled||JSON.stringify(i.bindings??{})!==JSON.stringify(n.bindings??{}))return!1;const l=((t=i.condition)==null?void 0:t.active)??!1,s=((a=n.condition)==null?void 0:a.active)??!1;if(l!==s)return!1}return!0},_a=(e,o)=>e.length!==o.length?!1:JSON.stringify(e)===JSON.stringify(o),Ia=je(),Ca=e=>{const o={formula:e.formula,pipeline:e.pipeline,graph:JSON.parse(JSON.stringify(e.graph)),renderRegion:e.renderRegion?{...e.renderRegion}:null};return N.getAll().forEach(a=>{const r=e[a.id];r&&(o[a.id]=JSON.parse(JSON.stringify(r)))}),o},Xt=(e,o)=>{const t={};return e.forEach(a=>{t[a]=o[a]}),t},Yt=(e,o,t)=>{const a=t(),r=e.pipeline?t().pipeline:void 0;o(e);let i=!1;Object.keys(e).forEach(n=>{const l=n,s=e[l];if(l==="formula"){R.emit("config",{formula:s});return}if(l==="pipeline"&&!i){const u=s,h=t();if(r&&!Mo(r,u)){const p=h.pipelineRevision+1;o({pipelineRevision:p}),R.emit("config",{pipeline:u,graph:h.graph,pipelineRevision:p})}else R.emit("config",{pipeline:u});i=!0;return}if(l==="graph")return;const c="set"+l.charAt(0).toUpperCase()+l.slice(1);typeof a[c]=="function"&&a[c](s)}),Ia.resetAccumulation()},Ma=1500;let Kt=0;const Ra=(e,o)=>({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null,handleInteractionStart:t=>{if(e({isUserInteracting:!0}),t&&typeof t=="object"&&t.position){const r=t,i=Date.now();i-Kt<Ma&&o().undoStack.length>0||(e(l=>{const s=[...l.undoStack,r];return{undoStack:s.length>50?s.slice(-50):s,redoStack:[]}}),Kt=i);return}const a=Ca(o());e({interactionSnapshot:a})},handleInteractionEnd:()=>{e({isUserInteracting:!1});const{interactionSnapshot:t,aaMode:a,aaLevel:r,msaaSamples:i,dpr:n}=o();let l=a==="Auto"||a==="Always"?r:1;if(Math.abs(n-l)>1e-4&&(e({dpr:l}),R.emit("config",{msaaSamples:a==="Auto"||a==="Always"?i:1}),R.emit("reset_accum",void 0)),!t)return;const s=o(),c={};let u=!1;Object.keys(t).forEach(h=>{const f=h,p=t[f],m=s[f];JSON.stringify(p)!==JSON.stringify(m)&&(c[f]=p,u=!0)}),e(u?h=>{const f=[...h.paramUndoStack,c];return{paramUndoStack:f.length>50?f.slice(-50):f,paramRedoStack:[],interactionSnapshot:null}}:{interactionSnapshot:null})},undoParam:()=>{const{paramUndoStack:t,paramRedoStack:a}=o();if(t.length===0)return;const r=t[t.length-1],i=t.slice(0,-1),n=Xt(Object.keys(r),o());Yt(r,e,o),e({paramUndoStack:i,paramRedoStack:[...a,n]})},redoParam:()=>{const{paramUndoStack:t,paramRedoStack:a}=o();if(a.length===0)return;const r=a[a.length-1],i=a.slice(0,-1),n=Xt(Object.keys(r),o());Yt(r,e,o),e({paramUndoStack:[...t,n],paramRedoStack:i})},resetParamHistory:()=>{e({paramUndoStack:[],paramRedoStack:[],interactionSnapshot:null})}}),Jt=[{id:"note-1",type:"Note",enabled:!0,params:{},text:`Infinite Repetition
The 'Mod' node tiles space. Here we repeat every 4.0 units on X and Y to create a forest of fractals.`},{id:"mod-1",type:"Mod",enabled:!0,params:{x:4,y:4,z:0}},{id:"note-2",type:"Note",enabled:!0,params:{},text:`Dynamic Rotation
This rotation is bound to 'ParamC' (Slider below). Try dragging it!`},{id:"rot-1",type:"Rotate",enabled:!0,params:{x:0,y:0,z:0},bindings:{z:"ParamC"}},{id:"bulb-1",type:"Mandelbulb",enabled:!0,params:{power:8}},{id:"add-c",type:"AddConstant",enabled:!0,params:{scale:1}}],Pa=(e,o)=>({pipeline:Jt,pipelineRevision:1,graph:Wt(Jt),setGraph:t=>{const a=Ut(t.nodes,t.edges),r=o(),i=!Mo(r.pipeline,a),n=i||!_a(r.pipeline,a);if(i&&r.autoCompile){const l=r.pipelineRevision+1;e({graph:t,pipeline:a,pipelineRevision:l}),R.emit(oe.CONFIG,{pipeline:a,graph:t,pipelineRevision:l})}else i?e({graph:t}):n?(e({graph:t,pipeline:a}),R.emit(oe.CONFIG,{pipeline:a})):e({graph:t})},setPipeline:t=>{const a=o().pipelineRevision+1,r=Wt(t);e({pipeline:t,graph:r,pipelineRevision:a}),R.emit(oe.CONFIG,{pipeline:t,graph:r,pipelineRevision:a})},refreshPipeline:()=>{const t=o(),a=Ut(t.graph.nodes,t.graph.edges),r=t.pipelineRevision+1;e({pipeline:a,pipelineRevision:r}),R.emit(oe.CONFIG,{pipeline:a,graph:t.graph,pipelineRevision:r})}}),Zt=`
    if (uGlowIntensity > 0.0001) {
        float dist = max(h.x, 0.0);
        // Aura mode: glow peaks AWAY from surface (tightness < 1)
        float k = max(uGlowSharpness, 0.01);
        float aura = dist * k * 2.718 * exp(-k * dist);
        // Standard mode: glow hugs the surface (tightness >= 1)
        float standard = exp(-uGlowSharpness * dist);
        // Blend between aura and standard in the 0.75-1.0 range
        float blend = smoothstep(0.75, 1.0, uGlowSharpness);
        float gFactor = mix(aura, standard, blend);
        gFactor *= uFudgeFactor * 0.4;
        
        #ifdef GLOW_FAST
            // Fast Mode: Accumulate scalar intensity only
            accAlpha += gFactor;
        #else
            // Quality Mode: Accumulate full vector color
            if (gFactor > 1.0e-6) {
                vec3 p_fractal_glow = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
                accColor += getGlowColor(p_fractal_glow, h) * gFactor;
            }
        #endif
    }

    // Volumetric Fog
    if (uFogDensity > 0.0001) {
        float stepVal = max(h.x, 0.0001);
        // Corrected density factor: Reduced from 0.05 to 0.0005 (100x reduction)
        accDensity += (1.0 / (stepVal * 5.0 + 0.1)) * uFogDensity * uFudgeFactor * 0.0005;
    }
`,La=`
    #ifdef GLOW_FAST
        if (accAlpha > 0.0001) {
            vec3 p_fractal_res = applyPrecisionOffset(p + uCameraPosition, uSceneOffsetLow, uSceneOffsetHigh);
            // Tint the accumulated intensity by the color at the hit point
            vec3 glowCol = getGlowColor(p_fractal_res, h);
            
            // Prevent blowout
            accColor += glowCol * min(accAlpha, 100.0);
        }
    #endif
`,Ta=`
    // --- FOG (Atmosphere Feature) ---
    float fogFactor = smoothstep(uFogNear, uFogFar, d) * uFogIntensity;
    vec3 fogColor = uFogColorLinear;

    // Volumetric fog absorption
    if (uFogDensity > 0.0001) {
        float volAlpha = clamp(volumetric * uFogIntensity, 0.0, 1.0);
        col = mix(col, fogColor, volAlpha);
    }

    // Distance fog
    if (uEnvBackgroundStrength > 0.001) {
        // Background visible: only fog geometry, preserve env map on miss
        if (d < MISS_DIST - 10.0) {
            col = mix(col, fogColor, fogFactor);
        }
    } else {
        col = mix(col, fogColor, fogFactor);
    }
`,Ea=`
    // --- GLOW (Atmosphere Feature) ---
    if (uGlowIntensity > 0.0001) {
        col += glow * uGlowIntensity;
    }
`,ka={id:"atmosphere",shortId:"at",name:"Atmosphere",category:"Rendering",engineConfig:{toggleParam:"glowEnabled",mode:"compile",label:"Volumetric Glow",groupFilter:"engine_settings"},params:{glowEnabled:{type:"boolean",default:!0,label:"Enable Glow",shortId:"ge",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"},glowQuality:{type:"float",default:0,label:"Glow Algo",shortId:"gq",group:"engine_settings",options:[{label:"Accurate (Vector)",value:0},{label:"Fast (Scalar)",value:1}],description:"Vector accumulates color per-step. Scalar accumulates intensity only (faster).",onUpdate:"compile",noReset:!0},fogIntensity:{type:"float",default:0,label:"Fog Intensity",shortId:"fi",uniform:"uFogIntensity",min:0,max:1,step:.01,group:"fog"},fogNear:{type:"float",default:0,label:"Fog Start",shortId:"fn",uniform:"uFogNear",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogFar:{type:"float",default:5,label:"Fog End",shortId:"ff",uniform:"uFogFar",min:0,max:10,step:.1,scale:"square",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogColor:{type:"color",default:new le(0,0,0),label:"Fog Color",shortId:"fc",uniform:"uFogColor",group:"fog",parentId:"fogIntensity",condition:{gt:0}},fogDensity:{type:"float",default:.01,label:"Fog Density",shortId:"fd",uniform:"uFogDensity",min:.001,max:5,step:.01,scale:"log",group:"fog",parentId:"fogIntensity",condition:{gt:0},description:"Basic volumetric fog absorption density. For god rays and scatter, enable Volumetric Scattering in Engine."},glowIntensity:{type:"float",default:0,label:"Glow Strength",shortId:"gi",uniform:"uGlowIntensity",min:0,max:5,step:.01,scale:"log",group:"glow",condition:{param:"glowEnabled",bool:!0}},glowSharpness:{type:"float",default:50,label:"Tightness",shortId:"gs",uniform:"uGlowSharpness",min:.1,max:1e3,step:.1,scale:"log",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}]},glowMode:{type:"boolean",default:!0,label:"Glow Source",shortId:"gm",uniform:"uGlowMode",group:"glow",parentId:"glowIntensity",condition:[{gt:0},{param:"glowEnabled",bool:!0}],options:[{label:"Surface",value:!1},{label:"Color",value:!0}]},glowColor:{type:"color",default:new le(1,1,1),label:"Glow Color",shortId:"gl",uniform:"uGlowColor",group:"glow",parentId:"glowMode",condition:[{bool:!0},{param:"glowEnabled",bool:!0}]}},inject:(e,o,t)=>{if(t!=="Main")return;e.addPostProcessLogic(Ta),e.addPostProcessLogic(Ea);const a=o.atmosphere;a&&a.glowEnabled&&(a.glowQuality>.5?(e.addDefine("GLOW_FAST","1"),e.addVolumeTracing(Zt,La)):e.addVolumeTracing(Zt,""))}},za=`
// ------------------------------------------------------------------
// DROSTE EFFECT (ESCHER MATH)
// Ported faithfully from Tom Beddard's Pixel Bender script
// ------------------------------------------------------------------

#define DROSTE_PI 3.141592653
#define DROSTE_TWOPI 6.283185307
#define DROSTE_EPS 1.0e-9

// Complex Math Helpers
// NOTE: Droste always compiles into the post-processing shader (not the formula shader),
// so cMult/cDiv/cExp/cLog won't collide with Frag builtins (cMul/cPow) which live in the formula shader.
vec2 cMult(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 cDiv(vec2 a, vec2 b) { float d = dot(b,b); return vec2(dot(a,b), a.y*b.x - a.x*b.y) / d; }
vec2 cExp(vec2 z) { return vec2(exp(z.x) * cos(z.y), exp(z.x) * sin(z.y)); }
vec2 cLog(vec2 z) { return vec2(log(length(z)), atan(z.y, z.x)); }

// Extended Math (Renamed to avoid GLSL built-in collisions)
float d_sinh(float x) { return (exp(x) - exp(-x)) * 0.5; }
float d_cosh(float x) { return (exp(x) + exp(-x)) * 0.5; }

vec2 cSin(vec2 z) { return vec2(sin(z.x) * d_cosh(z.y), cos(z.x) * d_sinh(z.y)); }
vec2 cCos(vec2 z) { return vec2(cos(z.x) * d_cosh(z.y), -sin(z.x) * d_sinh(z.y)); }

vec2 cTan(vec2 z) {
    float r = 2.0 * z.x;
    float i = 2.0 * z.y;
    float div = cos(r) + d_cosh(i);
    if (abs(div) < DROSTE_EPS) div = DROSTE_EPS;
    return vec2(sin(r)/div, d_sinh(i)/div);
}

// Complex Power: z^p
vec2 cPower(vec2 z, float p) {
    float r = length(z);
    if (r < DROSTE_EPS) return vec2(0.0);
    float a = atan(z.y, z.x);
    float newR = pow(r, p);
    float newA = a * p;
    return vec2(newR * cos(newA), newR * sin(newA));
}

// Returns vec3: .xy = UV, .z = Mask (1.0 = valid, 0.0 = invalid/transparent)
vec3 applyDroste(
    vec2 uv, 
    vec2 center, 
    float r1, float r2, 
    float period, float strands, 
    float zoom, float rot, 
    bool twist, float tilingMode,
    float rotateSpin,
    bool hyperDroste,
    float fractalPoints,
    bool autoPeriodicity,
    bool strandMirror,
    float rotatePolar
) {
    // 1. Shift & Normalize
    // We expect UV in 0..1 range. Center in -1..1 range (percentage)
    vec2 z = uv - 0.5 - (center * 0.01);
    
    // Adjust aspect ratio to square the calculation space
    float aspect = uResolution.x / uResolution.y;
    z.x *= aspect;
    
    // Scale radii to percentage (0.1 - 100 range from UI)
    float R1 = max(0.0001, r1 * 0.01);
    float R2 = max(R1 * 1.001, r2 * 0.01);
    
    float P2 = strands;
    float P1 = period;

    // --- AUTO PERIODICITY LOGIC ---
    // Matches Pixel Bender: p1 = p2/2.0 * (1.0 + sqrt(1.0 - pow(log(r2/r1)/PI, 2.0)))
    if (autoPeriodicity) {
        float logRatio = log(R2/R1);
        float ratioOverPi = logRatio / DROSTE_PI;
        float term = 1.0 - (ratioOverPi * ratioOverPi);
        
        if (term >= 0.0) {
            P1 = (P2 / 2.0) * (1.0 + sqrt(term));
        }
    }
    
    if (abs(P1) < 0.001) P1 = 0.001;
    
    // --- PRE-TRANSFORM DISTORTIONS ---
    
    // Hyper Droste (Complex Sine)
    if (hyperDroste) {
        z = cSin(z);
    }
    
    // Fractal Points (Complex Power + Tan)
    if (fractalPoints > 0.0) {
        z = cPower(z, fractalPoints);
        z = cTan(cMult(z, vec2(2.0, 0.0)));
    }
    
    // --- POLAR ROTATION ---
    // Ported from Pixel Bender: Stereo-graphic projection rotation
    if (abs(rotatePolar) > 0.001) {
        float theta = radians(rotatePolar);
        float cT = cos(theta);
        float sT = sin(theta);

        float zz = dot(z, z); // x^2 + y^2

        float div = (1.0 + zz + (1.0 - zz) * cT - 2.0 * z.x * sT) * 0.5;

        if (abs(div) < DROSTE_EPS) div = DROSTE_EPS;

        float numX = z.x * cT + (1.0 - zz) * sT * 0.5;
        
        // Complex division: (numX + i*y) / (div + 0i) = numX/div + i*y/div
        z.x = numX / div;
        z.y = z.y / div;
    }
    
    // Rotate Spin (Image Rotation independent of Spiral)
    // Matches Pixel Bender: z *= imageSpin
    if (abs(rotateSpin) > 0.001) {
        float rads = radians(rotateSpin);
        float s = sin(rads);
        float c = cos(rads);
        z = vec2(z.x*c - z.y*s, z.x*s + z.y*c);
    }

    // 2. Pre-Twist Transform
    if (twist) {
         // Apply Zoom & Rotation in log space effectively
         float angle = radians(rot);
         float scale = exp(zoom * 0.1); 
         // Manual rotation matrix
         float c = cos(angle); float s = sin(angle);
         z = vec2(z.x*c - z.y*s, z.x*s + z.y*c) / scale;
         
         // To Log-Polar
         z = cLog(cDiv(z, vec2(R1, 0.0)));
    } else {
        // Cartesian Log mapping for untwisted (Rectangular Projection)
        // Map Y to Angle [-PI, PI]
        z.y *= DROSTE_TWOPI; 
        
        // Map X to Log Radius
        float logWidth = log(R2/R1);
        z.x = z.x * logWidth; 
        
        // Align center
        z.x += logWidth * 0.5;

        // Linear Zoom/Rot application
        z.x -= zoom * 0.1;
        z.y += radians(rot);
    }
    
    // 3. Droste Conformal Map
    float logR = log(R2/R1);
    float angle = atan((P2/P1) * (logR / DROSTE_TWOPI));
    
    float f = cos(angle);
    vec2 beta = cMult(vec2(f, 0.0), cExp(vec2(0.0, angle)));
    
    // Transform Z
    z = cDiv(cMult(vec2(P1, 0.0), z), beta);
    
    // Inverse Log (Exp) to get back to Cartesian
    z = cMult(vec2(R1, 0.0), cExp(z));
    
    // 4. Infinite Tiling (The "Spiral into Infinity")
    float mode = floor(tilingMode + 0.1);
    
    bool doLoop = (mode < 1.5);
    bool doMirror = (abs(mode - 1.0) < 0.1);
    bool flipped = false;
    
    // Calculate Tile Rotation Angle
    float tileAngle = -DROSTE_TWOPI * P1;
    if (P2 > 0.0) tileAngle = -tileAngle;
    
    // Mirror Strand Logic: Divide rotation by number of strands
    // Matches Ref: if (strandMirror) angle /= p2;
    if (strandMirror && abs(P2) > 0.001) {
        tileAngle /= P2;
    }

    if (doLoop) {
        // Ratio determines the scaling and rotation per level
        vec2 ratio = cMult(vec2(R2/R1, 0.0), cExp(vec2(0.0, tileAngle)));
        vec2 ratioInv = cDiv(vec2(1.0, 0.0), ratio);

        float mag = length(z);
        
        // Iteratively scale until within bounds [R1, R2]
        // This simulates the "while" loop in the reference, but GLSL prefers fixed loops
        for(int i=0; i<12; i++) {
            if (mag >= R1 && mag <= R2) break;
            
            if (mag < R1) {
                z = cMult(z, ratio); // Grow
                mag = length(z);
                flipped = !flipped;
            } else if (mag > R2) {
                z = cMult(z, ratioInv); // Shrink
                mag = length(z);
                flipped = !flipped;
            }
        }
    }
    
    if (doMirror && flipped) {
        float r2 = dot(z, z);
        if(r2 > 1.0e-9) {
            z *= (R1 * R2) / r2;
        }
    }

    // 5. Map back to UV
    z.x /= aspect;
    z += 0.5 + (center * 0.01);
    
    float mask = 1.0;
    
    // 6. Apply Final Tiling Mode (Edge Handling)
    if (mode < 0.5) {
        // 0: Repeat
        z = fract(z);
    } else if (mode < 1.5) {
        // 1: Mirror (Standard edge mirroring)
        z.x = 1.0 - abs(mod(z.x, 2.0) - 1.0);
        z.y = 1.0 - abs(mod(z.y, 2.0) - 1.0);
    } else if (mode < 2.5) {
        // 2: Clamp
        z = clamp(z, 0.0, 1.0);
    } else {
        // 3: Transparent
        if (z.x < 0.0 || z.x > 1.0 || z.y < 0.0 || z.y > 1.0) {
            mask = 0.0;
        }
    }
    
    return vec3(z, mask);
}
`,Aa={id:"droste",shortId:"dr",name:"Droste Effect",category:"Effects",params:{active:{type:"boolean",default:!1,label:"Droste Effect",shortId:"ac",uniform:"uDrosteActive",group:"main",noReset:!0},tiling:{type:"float",default:1,label:"Tiling Mode",shortId:"tm",uniform:"uDrosteTiling",group:"geometry",noReset:!0,condition:{param:"active",bool:!0},options:[{label:"Repeat",value:0},{label:"Mirror",value:1},{label:"Clamp",value:2},{label:"Transparent",value:3}]},center:{type:"vec2",default:new ve(0,0),label:"Center Shift",shortId:"cs",uniform:"uDrosteCenter",min:-100,max:100,step:.1,group:"geometry",condition:{param:"active",bool:!0},noReset:!0},radiusInside:{type:"float",default:5,label:"Inner Rad",shortId:"r1",uniform:"uDrosteR1",min:.1,max:100,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},radiusOutside:{type:"float",default:100,label:"Outer Rad",shortId:"r2",uniform:"uDrosteR2",min:1,max:200,step:.1,group:"geometry",layout:"half",condition:{param:"active",bool:!0},noReset:!0},strands:{type:"float",default:2,label:"Strands",shortId:"p2",uniform:"uDrosteStrands",min:-12,max:12,step:1,group:"structure",condition:{param:"active",bool:!0},noReset:!0},strandMirror:{type:"boolean",default:!1,label:"Mirror Strand",shortId:"sm",uniform:"uDrosteMirror",group:"structure",parentId:"strands",condition:{param:"active",bool:!0},noReset:!0},autoPeriodicity:{type:"boolean",default:!1,label:"Auto Period",shortId:"ap",uniform:"uDrosteAuto",group:"structure",condition:{param:"active",bool:!0},noReset:!0},periodicity:{type:"float",default:2,label:"Periodicity",shortId:"p1",uniform:"uDrostePeriodicity",min:-10,max:10,step:.1,group:"structure",parentId:"autoPeriodicity",condition:[{param:"active",bool:!0},{param:"autoPeriodicity",bool:!1}],noReset:!0},zoom:{type:"float",default:0,label:"Zoom",shortId:"zm",uniform:"uDrosteZoom",min:-10,max:10,step:.1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotate:{type:"float",default:0,label:"Spiral Rotate",shortId:"ro",uniform:"uDrosteRotate",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotateSpin:{type:"float",default:0,label:"Image Spin",shortId:"sp",uniform:"uDrosteSpin",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},rotatePolar:{type:"float",default:0,label:"Polar Rotate",shortId:"pr",uniform:"uDrostePolar",min:-360,max:360,step:1,group:"transform",condition:{param:"active",bool:!0},noReset:!0},twist:{type:"boolean",default:!0,label:"Twist (Conformal)",shortId:"tw",uniform:"uDrosteTwist",group:"transform",condition:{param:"active",bool:!0},noReset:!0},hyperDroste:{type:"boolean",default:!1,label:"Hyper Droste",shortId:"hd",uniform:"uDrosteHyper",group:"transform",condition:{param:"active",bool:!0},noReset:!0},fractalPoints:{type:"float",default:1,label:"Fractal Points",shortId:"fp",uniform:"uDrosteFractal",min:0,max:10,step:1,group:"transform",parentId:"hyperDroste",condition:[{param:"active",bool:!0},{param:"hyperDroste",bool:!0}],noReset:!0}},postShader:{functions:za,mainUV:`
            if (uDrosteActive > 0.5) {
                vec3 res = applyDroste(
                    sampleUV, 
                    uDrosteCenter, 
                    uDrosteR1, 
                    uDrosteR2, 
                    uDrostePeriodicity, 
                    uDrosteStrands, 
                    uDrosteZoom, 
                    uDrosteRotate, 
                    uDrosteTwist > 0.5,
                    uDrosteTiling,
                    uDrosteSpin,
                    uDrosteHyper > 0.5,
                    (uDrosteHyper > 0.5 ? uDrosteFractal : 0.0),
                    uDrosteAuto > 0.5,
                    uDrosteMirror > 0.5,
                    uDrostePolar
                );
                sampleUV = res.xy;
                mask = res.z;
            }
        `}},Da={id:"postEffects",shortId:"pe",name:"Post Effects",category:"Post Process",params:{bloomIntensity:{type:"float",default:0,label:"Bloom",shortId:"bi",uniform:"uBloomIntensity",min:0,max:5,step:.01,group:"bloom",noReset:!0,format:e=>{const o=e;return o===0?"0.0 (off)":o.toFixed(3)}},bloomThreshold:{type:"float",default:.25,label:"Threshold",shortId:"bt",uniform:"uBloomThreshold",min:0,max:2,step:.01,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},bloomRadius:{type:"float",default:7,label:"Spread",shortId:"br",uniform:"uBloomRadius",min:.5,max:7,step:.1,group:"bloom",parentId:"bloomIntensity",condition:{gt:0},noReset:!0},caStrength:{type:"float",default:0,label:"Chromatic Aberration",shortId:"ca",uniform:"uCAStrength",min:0,max:10,step:.01,group:"lens",noReset:!0,format:e=>{const o=e;return o===0?"0.0 (off)":o.toFixed(3)}}},postShader:{uniforms:"uniform sampler2D uBloomTexture;",functions:`
            // Barrel distortion — models how real lenses bend light more at edges
            vec2 caBarrelDistort(vec2 coord, float amt) {
                vec2 cc = coord - 0.5;
                float dist = dot(cc, cc);
                return coord + cc * dist * amt;
            }

            // Attempt to approximate visible spectrum as RGB
            // Maps t in [0,1] across the hue spectrum (YACA by Fu-Bama)
            vec3 caSpectrum(float t) {
                vec3 w = abs(t * 4.0 - vec3(1.0, 2.0, 1.0));
                w = clamp(1.5 - w, 0.0, 1.0);
                w.xz += clamp(t * 4.0 - 3.5, 0.0, 1.0);
                w.z = 1.0 - w.z;
                return w;
            }
        `,main:`
            // --- Spectral Chromatic Aberration ---
            // Per-wavelength barrel distortion (12 spectral samples)
            if (uCAStrength > 0.0001) {
                const int CA_SAMPLES = 12;
                float caMaxDistort = uCAStrength * 0.15;

                vec3 caSum = vec3(0.0);
                vec3 caWSum = vec3(0.0);
                for (int i = 0; i < CA_SAMPLES; i++) {
                    float t = float(i) / float(CA_SAMPLES - 1);
                    vec3 w = caSpectrum(t);
                    caWSum += w;
                    caSum += w * texture(map, caBarrelDistort(sampleUV, caMaxDistort * (t - 0.5))).rgb;
                }
                col = caSum / caWSum;
            }

            // --- Multi-Pass Bloom (composited by BloomPass in worker) ---
            if (uBloomIntensity > 0.001) {
                col += texture(uBloomTexture, sampleUV).rgb * uBloomIntensity;
            }
        `}},Fa=`
// ------------------------------------------------------------------
// ENVIRONMENT MAP
// ------------------------------------------------------------------

vec3 GetEnvMap(vec3 dir, float roughness) {
    // 1. Apply Rotation (CPU Optimized: uEnvRotationMatrix, identity when rotation is 0)
    dir.xz = uEnvRotationMatrix * dir.xz;

    vec3 col; // Result variable

    if (uEnvSource > 0.5) {
        // Path 1: Gradient Texture
        float t = dir.y * 0.5 + 0.5;
        col = texture(uEnvGradient, vec2(t, 0.5)).rgb;
    }
    else if (uUseEnvMap > 0.5) {
        // Path 2: EnvMap Texture (Flattened else-if for compiler safety)
        // Equirectangular projection: longitude → [0,1], latitude → [0,1]
        vec2 uv = vec2(atan(dir.z, dir.x) * INV_TAU + 0.5, 1.0 - acos(dir.y) * INV_PI);
        float bias = roughness * 6.0;  // Mip bias: 6 levels ≈ typical env map mip chain depth
        col = texture(uEnvMapTexture, uv, bias).rgb;
        
        // Apply Color Profile (Linear/ACES)
        col = applyTextureProfile(col, uEnvMapColorSpace);
    } 
    else {
        // Path 3: Procedural Sky — simple gradient + sun glint + rim fill
        float y = dir.y * 0.5 + 0.5;  // Remap vertical direction [-1,1] → [0,1]
        vec3 skyBase = mix(vec3(0.02, 0.02, 0.05), vec3(0.15, 0.15, 0.25), y);  // Dark navy horizon → lighter zenith
        vec3 sky = mix(skyBase, vec3(0.1), roughness * 0.5);  // Desaturate with roughness (blurry reflections see averaged sky)

        // Sun: sharp specular highlight, blurs with roughness
        float specPower = mix(100.0, 0.5, roughness * roughness);  // Sharp (100) for mirrors, soft (0.5) for rough
        float rimPower = mix(10.0, 1.0, roughness);  // Rim falloff exponent

        vec3 sunDir = normalize(vec3(1.0, 4.0, 2.0));  // Fixed upper-right sun position
        float sunDot = max(0.0, dot(dir, sunDir));
        float light = pow(sunDot, specPower);

        // Counter-light rim fill — prevents pure black on shadow side
        vec3 rimDir = normalize(vec3(-1.0, 1.0, -1.0));
        float rimDot = max(0.0, dot(dir, rimDir));
        float rim = pow(rimDot, rimPower) * 0.5;

        float brightness = mix(1.0, 0.3, roughness);  // Rough surfaces see dimmer sky overall
        col = sky + vec3(1.0) * light * 0.8 * brightness + vec3(0.8, 0.9, 1.0) * rim * brightness;
    }

    return col;
}
`,Oa=`
    roughness = clamp(uRoughness, 0.02, 1.0);
    vec3 emitSource = albedo; 
    if (abs(uEmissionMode - 1.0) < 0.1) emitSource = col1;
    else if (abs(uEmissionMode - 2.0) < 0.1) emitSource = col2;
    else if (abs(uEmissionMode - 3.0) < 0.1) {
        float n01 = noiseVal * 0.5 + 0.5;
        emitSource = uLayer3Color * n01;
    }
    else if (abs(uEmissionMode - 4.0) < 0.1) emitSource = uEmissionColor; 
    emission = emitSource * uEmission;
`,ja=`
    // EnvStrength scaling for Direct Render Mode
    #ifdef RENDER_MODE_PATHTRACING
        #define uEnvStrength uEnvStrengthSlider
    #else
        #define uEnvStrength (uEnvStrengthSlider * 0.33)
    #endif
`,Na={id:"materials",shortId:"m",name:"Material",category:"Rendering",tabConfig:{label:"Shader",componentId:"panel-shading",order:40},params:{diffuse:{type:"float",default:1,label:"Diffuse (Color)",shortId:"di",uniform:"uDiffuse",min:0,max:2,step:.01,group:"surface"},reflection:{type:"float",default:0,label:"Metallic",shortId:"re",uniform:"uReflection",min:0,max:1,step:.01,group:"surface"},specular:{type:"float",default:.3,label:"Reflectivity",shortId:"sp",uniform:"uSpecular",min:0,max:2,step:.01,group:"surface"},roughness:{type:"float",default:.5,label:"Roughness",shortId:"ro",uniform:"uRoughness",min:.001,max:1,step:.001,group:"surface"},rim:{type:"float",default:0,label:"Rim Light",shortId:"ri",uniform:"uRim",min:0,max:10,step:.01,scale:"log",group:"surface"},rimExponent:{type:"float",default:4,label:"Rim Sharpness",shortId:"rx",uniform:"uRimExponent",min:1,max:16,step:.1,group:"surface",parentId:"rim",condition:{gt:0}},rimColor:{type:"color",default:new le(.5,.7,1),label:"Rim Color",shortId:"rc",uniform:"uRimColor",group:"surface",parentId:"rim",condition:{gt:0}},envStrength:{type:"float",default:0,label:"Environment Light",shortId:"es",uniform:"uEnvStrengthSlider",min:0,max:5,step:.01,group:"env"},envBackgroundStrength:{type:"float",default:0,label:"BG Visibility",shortId:"eb",uniform:"uEnvBackgroundStrength",min:0,max:2,step:.01,group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"}},envSource:{type:"float",default:1,label:"Source",shortId:"eo",uniform:"uEnvSource",group:"env",parentId:"envStrength",condition:{gt:0,param:"envStrength"},options:[{label:"Sky Image",value:0},{label:"Gradient",value:1}]},envMapData:{type:"image",default:null,label:"Upload Texture",shortId:"et",group:"env",parentId:"envSource",condition:{eq:0},uniform:"uEnvMapTexture",textureSettings:{mapping:sa,minFilter:na,generateMipmaps:!0},linkedParams:{colorSpace:"envMapColorSpace"}},envMapColorSpace:{type:"float",default:0,label:"Env Profile",shortId:"ec",uniform:"uEnvMapColorSpace",group:"env",hidden:!0},useEnvMap:{type:"boolean",default:!1,label:"Use Env Map",shortId:"eu",uniform:"uUseEnvMap",hidden:!0,group:"env"},envRotation:{type:"float",default:0,label:"Rotation",shortId:"er",uniform:"uEnvRotation",min:0,max:6.28,step:.01,group:"env",parentId:"envSource",condition:[{param:"envStrength",gt:0},{param:"envSource",eq:0}]},envGradientStops:{type:"gradient",default:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],label:"Sky Gradient",shortId:"eg",uniform:"uEnvGradient",group:"env",parentId:"envSource",condition:{eq:1}},emission:{type:"float",default:0,label:"Self-illumination",shortId:"em",uniform:"uEmission",min:0,max:5,step:.001,scale:"square",group:"emission"},emissionMode:{type:"float",default:0,label:"Emission Source",shortId:"ec",uniform:"uEmissionMode",min:0,max:4,step:1,group:"emission",parentId:"emission",condition:{gt:1e-4},options:[{label:"Full Surface",value:0},{label:"Layer 1",value:1},{label:"Layer 2",value:2},{label:"Layer 3",value:3},{label:"Solid Color",value:4}]},emissionColor:{type:"color",default:new le(1,1,1),label:"Solid Color",shortId:"el",uniform:"uEmissionColor",group:"emission",parentId:"emissionMode",condition:{eq:4}},ptEmissionMult:{type:"float",default:1,label:"Illumination Power",shortId:"ep",uniform:"uPTEmissionMult",min:0,max:10,step:.1,group:"emission",parentId:"emission",condition:[{gt:1e-4},{param:"$renderMode",eq:"PathTracing"}]}},inject:(e,o,t)=>{t!=="Mesh"&&(e.addHeader(ja),e.addMaterialLogic(Oa),e.addFunction(Fa))}},$a={id:"colorGrading",shortId:"cg",name:"Color Grading",category:"Post Process",customUI:[{componentId:"scene-histogram",group:"grading",parentId:"active",condition:{param:"active",bool:!0}}],params:{active:{type:"boolean",default:!1,label:"Color Correction",shortId:"ac",uniform:"uGradingActive",group:"grading",noReset:!0},toneMapping:{type:"float",default:0,label:"Tone Mapping",shortId:"tm",uniform:"uToneMapping",group:"grading",parentId:"active",noReset:!0,options:[{label:"ACES",value:0},{label:"AgX",value:1},{label:"Reinhard",value:2},{label:"Neutral",value:3},{label:"None",value:4}]},saturation:{type:"float",default:1,label:"Saturation",shortId:"sa",uniform:"uSaturation",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0},levelsMin:{type:"float",default:0,label:"Black Point",shortId:"ln",uniform:"uLevelsMin",min:0,max:1,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsMax:{type:"float",default:1,label:"White Point",shortId:"lx",uniform:"uLevelsMax",min:0,max:2,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0},levelsGamma:{type:"float",default:1,label:"Gamma",shortId:"lg",uniform:"uLevelsGamma",min:.1,max:3,step:.01,group:"grading",parentId:"active",condition:{bool:!0},noReset:!0,hidden:!0}},postShader:{functions:`
            vec3 applyColorGrading(vec3 col) {
                col = max(vec3(0.0), col - uLevelsMin);
                col /= max(0.0001, uLevelsMax - uLevelsMin);
                if (abs(uLevelsGamma - 1.0) > 0.001) {
                    col = pow(max(vec3(0.0), col), vec3(1.0 / uLevelsGamma));
                }
                float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
                col = mix(vec3(luma), col, uSaturation);
                return col;
            }
        `,main:`
            if (uGradingActive > 0.5) {
                col = applyColorGrading(col);
            }
        `}},Ba={id:"texturing",shortId:"tx",name:"Texture",category:"Coloring",params:{active:{type:"boolean",default:!1,label:"Use Texture",shortId:"ac",uniform:"uUseTexture",group:"main",hidden:!0},layer1Data:{type:"image",default:null,label:"Select Image",shortId:"id",group:"main",uniform:"uTexture",textureSettings:{wrapS:$t,wrapT:$t,minFilter:Nt,magFilter:Nt},linkedParams:{colorSpace:"colorSpace"}},colorSpace:{type:"float",default:0,label:"Color Profile",shortId:"cs",uniform:"uTextureColorSpace",group:"main",hidden:!0},mapU:{type:"float",default:6,label:"U",shortId:"mu",uniform:"uTextureModeU",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},mapV:{type:"float",default:1,label:"V",shortId:"mv",uniform:"uTextureModeV",group:"mapping",layout:"half",options:[{label:"Orbit Trap",value:0},{label:"Iterations",value:1},{label:"Radial",value:2},{label:"Z-Depth",value:3},{label:"Angle",value:4},{label:"Normal",value:5},{label:"Decomposition",value:6},{label:"Raw Iterations",value:7},{label:"Potential (Log-Log)",value:8},{label:"Green's Flow",value:9}]},textureScale:{type:"vec2",default:new ve(1,1),label:"Scale UV",shortId:"ts",uniform:"uTextureScale",min:.1,max:500,step:.1,scale:"log",group:"transform"},offset:{type:"vec2",default:new ve(0,0),label:"Texture Offset",shortId:"of",uniform:"uTextureOffset",min:-2,max:2,step:.01,group:"transform"}}},Ro=[{value:0,label:"Orbit Trap",description:"Colors based on how close the orbit came to the origin or geometric traps.",glsl:"v = logTrap(result.y);"},{value:1,label:"Iterations",description:"Smooth gradients based on how long it took to escape. The classic look.",glsl:`
            // Standard Iterations
            v = result.z;
            
            // HYBRID FIX: For SDF fractals (Menger, Amazing Box) that don't "escape",
            // the iteration count is constant (1.0). This looks flat.
            // If we hit max iterations (approx 1.0), mix in Orbit Trap (y) to provide texture.
            if (v > 0.99) {
                float trap = logTrap(result.y);
                // Modulate the 1.0 base with the trap value
                v = 0.95 + 0.05 * sin(trap * 10.0);
            }
        `},{value:2,label:"Radial",description:"Distance from the center of the world.",glsl:"v = length(p) * 0.2;"},{value:3,label:"Z-Depth",description:"Height map based on Z coordinate. Good for landscapes.",glsl:"v = p.z * 0.2;"},{value:4,label:"Angle",description:"Polar angle around the Z axis. Creates spirals.",glsl:"v = atan(p.y, p.x) * 0.15915 + 0.5;"},{value:5,label:"Normal",description:"Based on surface slope (Up/Down).",glsl:"v = dot(n, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;"},{value:6,label:"Decomposition",description:"Analytic angle decomposition. Creates grid/chip patterns.",glsl:`
            // Removed aggressive zero-clamping that broke some metric modes
            v = result.w;
        `},{value:7,label:"Raw Iterations",description:"Stepped bands showing exact iteration counts.",glsl:"v = floor(result.z * float(uIterations)) / float(uIterations);"},{value:8,label:"Potential (Log-Log)",description:"Electric potential. Creates smooth bands near the set boundary.",glsl:`
            // Uses result.y (Trap) as magnitude holder if available
            // Optimized for R > 1.0
            float r = max(result.y, 1.0001); 
            v = log2(log2(r));
        `},{value:9,label:"Flow (Angle + Iter)",description:"Combines Decomposition (Angle) and Iterations to create spirals and grids.",glsl:`
            // Result.w = Decomposition (Angle 0-1)
            // Result.z = Smoothed Iterations (Count 0-N)
            // Adding them creates a diagonal slope in the mapping space.
            // When wrapped by the gradient, this creates spirals.
            v = result.w + result.z;
        `},{value:10,label:"Orbit X (YZ plane)",description:"Per-component orbit trap: closest approach to the YZ plane (abs x).",glsl:"v = logTrap(g_orbitTrap.x);"},{value:11,label:"Orbit Y (XZ plane)",description:"Per-component orbit trap: closest approach to the XZ plane (abs y).",glsl:"v = logTrap(g_orbitTrap.y);"},{value:12,label:"Orbit Z (XY plane)",description:"Per-component orbit trap: closest approach to the XY plane (abs z).",glsl:"v = logTrap(g_orbitTrap.z);"},{value:13,label:"Orbit W (Origin)",description:"Per-component orbit trap: closest squared distance to the origin.",glsl:"v = logTrap(g_orbitTrap.w);"}],Ha=()=>{let e=`
    // Legacy scale factor (-0.2) kept for save file / preset compatibility.
    // Arbitrary but baked into existing uColorScale values.
    float logTrap(float t) { return log(max(1.0e-5, t)) * -0.2; }

    float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) {
        float v = 0.0;

        // Mode Selection (switch for jump-table codegen)
        switch(int(mode + 0.1)) {
    `;return Ro.forEach(o=>{e+=`
        case ${Math.round(o.value)}: { // ${o.label}
            ${o.glsl}
        } break;`}),e+=`
        default: // Fallback
            v = result.z;
            break;
        }

        // Safety Clamp
        if (v < -1.0e10 || v > 1.0e10) return 0.0;
        return v;
    }
    `,e},Qt=Ro.map(e=>({label:e.label,value:e.value})),Va={id:"coloring",shortId:"cl",name:"Coloring",category:"Visuals",tabConfig:{label:"Gradient",componentId:"panel-gradients",order:50},customUI:[{componentId:"coloring-histogram",group:"layer1_hist",props:{layer:1}},{componentId:"coloring-histogram",group:"layer2_hist",props:{layer:2}}],params:{gradient:{type:"gradient",default:[{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],label:"Gradient",shortId:"g1",uniform:"uGradientTexture",group:"layer1_grad"},mode:{type:"float",default:0,label:"Mapping",shortId:"m1",uniform:"uColorMode",group:"layer1_top",options:Qt},scale:{type:"float",default:1,label:"Scale",shortId:"s1",uniform:"uColorScale",group:"layer1_hist",hidden:!0},offset:{type:"float",default:0,label:"Offset",shortId:"o1",uniform:"uColorOffset",group:"layer1_hist",hidden:!0},repeats:{type:"float",default:1,label:"Repeats",shortId:"r1",min:.1,max:100,step:.1,group:"layer1_hist",hidden:!0},phase:{type:"float",default:0,label:"Phase",shortId:"p1",min:-1,max:1,step:.01,group:"layer1_hist",hidden:!0},bias:{type:"float",default:1,label:"Gamma",shortId:"b1",uniform:"uGradientBias",min:.1,max:10,step:.01,group:"layer1_hist",hidden:!0},colorIter:{type:"float",default:0,label:"Color Iterations",shortId:"ci",uniform:"uColorIter",min:0,max:24,step:1,group:"layer1_bottom",description:"Stop orbit trap capture at this iteration (0 = use all iterations)",condition:{or:[{param:"mode",eq:0},{param:"mode",eq:1},{param:"mode",eq:7},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode",eq:10},{param:"mode",eq:11},{param:"mode",eq:12},{param:"mode",eq:13},{param:"mode2",eq:0},{param:"mode2",eq:1},{param:"mode2",eq:7},{param:"mode2",eq:8},{param:"mode2",eq:9},{param:"mode2",eq:10},{param:"mode2",eq:11},{param:"mode2",eq:12},{param:"mode2",eq:13}]}},twist:{type:"float",default:0,label:"Twist",shortId:"w1",uniform:"uColorTwist",min:-5,max:5,step:.1,group:"layer1_bottom"},escape:{type:"float",default:4,label:"Escape Radius",shortId:"e1",uniform:"uEscapeThresh",min:1,max:1e3,step:.1,scale:"log",group:"layer1_bottom",condition:{or:[{param:"mode",eq:6},{param:"mode",eq:8},{param:"mode",eq:9},{param:"mode2",eq:6},{param:"mode2",eq:8},{param:"mode2",eq:9},{and:[{param:"$texturing.active",bool:!0},{or:[{param:"$texturing.mapU",eq:6},{param:"$texturing.mapU",eq:8},{param:"$texturing.mapU",eq:9},{param:"$texturing.mapV",eq:6},{param:"$texturing.mapV",eq:8},{param:"$texturing.mapV",eq:9}]}]}]}},gradient2:{type:"gradient",default:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],label:"Gradient 2",shortId:"g2",uniform:"uGradientTexture2",group:"layer2_grad"},mode2:{type:"float",default:4,label:"Mapping",shortId:"m2",uniform:"uColorMode2",group:"layer2_top",options:Qt},scale2:{type:"float",default:1,label:"Scale 2",shortId:"s2",uniform:"uColorScale2",group:"layer2_hist",hidden:!0},offset2:{type:"float",default:0,label:"Offset 2",shortId:"o2",uniform:"uColorOffset2",group:"layer2_hist",hidden:!0},repeats2:{type:"float",default:1,label:"Repeats",shortId:"r2",min:.1,max:100,step:.1,group:"layer2_hist",hidden:!0},phase2:{type:"float",default:0,label:"Phase",shortId:"p2",min:-1,max:1,step:.01,group:"layer2_hist",hidden:!0},bias2:{type:"float",default:1,label:"Gamma",shortId:"b2",uniform:"uGradientBias2",min:.1,max:10,step:.01,group:"layer2_hist",hidden:!0},twist2:{type:"float",default:0,label:"Twist",shortId:"w2",uniform:"uColorTwist2",min:-5,max:5,step:.1,group:"layer2_bottom"},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",uniform:"uBlendMode",group:"layer2_bottom",options:[{label:"Mix",value:0},{label:"Add",value:1},{label:"Multiply",value:2},{label:"Overlay",value:3},{label:"Screen",value:4},{label:"Bump (Normal)",value:6}]},blendOpacity:{type:"float",default:0,label:"Blend Amount",shortId:"bo",uniform:"uBlendOpacity",min:0,max:1,step:.01,group:"layer2_bottom"},layer3Color:{type:"color",default:new le(1,1,1),label:"Noise Color",shortId:"n3c",uniform:"uLayer3Color",group:"noise",layout:"embedded"},layer3Scale:{type:"float",default:2,label:"Noise Scale",shortId:"n3s",uniform:"uLayer3Scale",min:.1,max:2e3,step:.1,scale:"log",group:"noise"},layer3Strength:{type:"float",default:0,label:"Mix Strength",shortId:"n3a",uniform:"uLayer3Strength",min:0,max:1,step:.01,group:"noise"},layer3Bump:{type:"float",default:0,label:"Bump",shortId:"n3b",uniform:"uLayer3Bump",min:-1,max:1,step:.01,group:"noise"},layer3Turbulence:{type:"float",default:0,label:"Turbulence",shortId:"n3t",uniform:"uLayer3Turbulence",min:0,max:2,step:.01,group:"noise"},layer3Enabled:{type:"boolean",default:!0,label:"Load Noise (Layer 3)",shortId:"l3e",group:"engine_settings",ui:"checkbox",description:"Compiles simplex noise into the shader. Disable to reduce compile time when Layer 3 is not needed.",onUpdate:"compile",noReset:!0}},inject:(e,o,t)=>{const a=o.coloring;(a==null?void 0:a.layer3Enabled)!==!1&&e.addDefine("LAYER3_ENABLED","1"),e.addPreamble("vec4 g_orbitTrap = vec4(1e10);"),e.addPreamble("float escape = 0.0;"),t==="Main"||t==="Histogram"?e.addFunction(Ha()):e.addFunction(`
                float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale) { return 0.0; }
            `)}},Ga={id:"standard",label:"Standard (Tglad)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2}},qa={id:"mirror",label:"Mirror",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = foldLimit - abs(abs(z) - foldLimit);
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},Ua={id:"half",label:"Half-fold",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = abs(z + foldLimit);
}
`,defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:2}},Wa={id:"decoupled",label:"Decoupled",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Fold boundary at foldLimit, reflect to foldingValue (Mandelbulber box fold)
    vec3 fv = uHybridFoldingValue;
    if (z.x > foldLimit.x) z.x = fv.x - z.x;
    else if (z.x < -foldLimit.x) z.x = -fv.x - z.x;
    if (z.y > foldLimit.y) z.y = fv.y - z.y;
    else if (z.y < -foldLimit.y) z.y = -fv.y - z.y;
    if (z.z > foldLimit.z) z.z = fv.z - z.z;
    else if (z.z < -foldLimit.z) z.z = -fv.z - z.z;
}
`,extraParams:{hybridFoldingValue:{type:"vec3",default:new j(2,2,2),label:"Folding Value",shortId:"hfv",uniform:"uHybridFoldingValue",min:.1,max:5,step:.01,group:"hybrid"}},defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:2,hybridFoldingValue:{x:2,y:2,z:2}}},Xa={id:"kali",label:"Kali",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    z = uHybridKaliConstant - abs(z);
}
`,rotMode:"post",extraParams:{hybridKaliConstant:{type:"vec3",default:new j(1,1,1),label:"Kali Constant",shortId:"hkc",uniform:"uHybridKaliConstant",min:-3,max:3,step:.01,group:"hybrid"}},defaults:{hybridScale:1.5,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.6,hybridFixedR:1,hybridIter:3,hybridKaliConstant:{x:.5,y:.5,z:.5}}},Ya={id:"tetra",label:"Tetrahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.y + z.z < 0.0) z.yz = -z.zy;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.25,hybridFixedR:1,hybridIter:3}},Ka={id:"octa",label:"Octahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's octahedral fold — diagonal plane reflections + axis sorting
    if (z.x + z.y < 0.0) z.xy = -z.yx;
    if (z.x + z.z < 0.0) z.xz = -z.zx;
    if (z.x - z.y < 0.0) z.xy = z.yx;
    if (z.x - z.z < 0.0) z.xz = z.zx;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3}},Ja={id:"icosa",label:"Icosahedral (KIFS)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // Knighty's icosahedral fold — golden ratio plane normals
    const float PHI = 1.618033988749895;
    const vec3 n1 = normalize(vec3(-PHI, PHI - 1.0, 1.0));
    const vec3 n2 = normalize(vec3(1.0, -PHI, PHI + 1.0));
    const vec3 n3 = vec3(0.0, 0.0, -1.0);

    z = abs(z);
    float t;
    t = dot(z, n1); if (t > 0.0) z -= 2.0 * t * n1;
    t = dot(z, n2); if (t > 0.0) z -= 2.0 * t * n2;
    t = dot(z, n3); if (t > 0.0) z -= 2.0 * t * n3;
    t = dot(z, n2); if (t > 0.0) z -= 2.0 * t * n2;
}
`,defaults:{hybridScale:2,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.3,hybridFixedR:1,hybridIter:4}},Za={id:"menger",label:"Menger (Cubic)",glsl:`
void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {
    // 1. 48-fold octahedral symmetry: abs + branchless descending sort
    z = abs(z);
    vec3 s = z;
    z.x = max(max(s.x, s.y), s.z);
    z.z = min(min(s.x, s.y), s.z);
    z.y = s.x + s.y + s.z - z.x - z.z;

    // 2. Scale + Offset (IFS step): z = Scale*z - Offset*(Scale-1)
    float scale = uHybridScale;
    vec3 shift = uHybridMengerOffset * (scale - 1.0);
    z = z * scale - shift;

    // 3. Center-Z conditional fold (restores full cubic symmetry)
    if (uHybridMengerCenterZ > 0.5) {
        z.z += shift.z * step(z.z, -0.5 * shift.z);
    }

    // 4. Derivative (chain rule for uniform scale)
    dr *= abs(scale);
}
`,selfContained:!0,extraParams:{hybridMengerOffset:{type:"vec3",default:new j(1,1,1),label:"Offset",shortId:"hmo",uniform:"uHybridMengerOffset",min:0,max:2,step:.01,group:"hybrid",linkable:!0},hybridMengerCenterZ:{type:"boolean",default:!0,label:"Center Z",shortId:"hmz",uniform:"uHybridMengerCenterZ",group:"hybrid"}},defaults:{hybridScale:3,hybridFoldLimitVec:{x:1,y:1,z:1},hybridMinR:.5,hybridFixedR:1,hybridIter:3,hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0}},ut=[Ga,qa,Ua,Wa,Xa,Ya,Ka,Ja,Za],Qa=ut.map((e,o)=>({label:e.label,value:o}));function er(e){return ut[e]??ut[0]}const tr=`
// --- GMT Shared Transforms ---
// Rodrigues rotation state (pre-calculated once per frame in loopInit)
vec3 gmt_rotAxis = vec3(0.0, 1.0, 0.0);
float gmt_rotCos = 1.0;
float gmt_rotSin = 0.0;

void gmt_precalcRodrigues(vec3 params) {
    if (abs(params.z) > 0.001) {
        float azimuth = params.x;
        float pitch = params.y;
        float rotAngle = params.z * 0.5;
        float cosPitch = cos(pitch);
        gmt_rotAxis = vec3(
            cosPitch * sin(azimuth),
            sin(pitch),
            cosPitch * cos(azimuth)
        );
        gmt_rotSin = sin(rotAngle);
        gmt_rotCos = cos(rotAngle);
    }
}

void gmt_applyRodrigues(inout vec3 z) {
    if (abs(gmt_rotSin) > 0.0001) {
        z = z * gmt_rotCos + cross(gmt_rotAxis, z) * gmt_rotSin
            + gmt_rotAxis * dot(gmt_rotAxis, z) * (1.0 - gmt_rotCos);
    }
}

void gmt_applyTwist(inout vec3 z, float amount) {
    if (abs(amount) > 0.001) {
        float ang = z.z * amount;
        float s = sin(ang);
        float co = cos(ang);
        z.xy = mat2(co, -s, s, co) * z.xy;
    }
}
`,or=["xyz","xzy","yxz","yzx","zxy","zyx"];function ar(e){const o=or[e]??"xyz";return o==="xyz"?"vec3 c_perm = c.xyz;":`vec3 c_perm = c.${o};`}function rr(e,o,t=!1){return`
mat3 hybridRotMat;
bool hybridHasRot;

void initHybridTransform() {
    vec3 hr = uHybridRot;
    hybridHasRot = (abs(hr.x) + abs(hr.y) + abs(hr.z)) > 0.001;
    hybridRotMat = mat3(1.0);
    if (hybridHasRot) {
        float sx = sin(hr.x), cx = cos(hr.x);
        float sy = sin(hr.y), cy = cos(hr.y);
        float sz = sin(hr.z), cz = cos(hr.z);
        hybridRotMat = mat3(
            cy*cz, -cy*sz, sy,
            sx*sy*cz + cx*sz, -sx*sy*sz + cx*cz, -sx*cy,
            -cx*sy*cz + sx*sz, cx*sy*sz + sx*cz, cx*cy
        );
    }
}

void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 z3 = z.xyz;
    // Transform into fold space
    ${o==="wrap"?"if (hybridHasRot) z3 = hybridRotMat * z3;":""}
    z3 += uHybridShift;

    foldOperation(z3, dr, uHybridFoldLimitVec);

    // Transform back out of fold space
    z3 -= uHybridShift;
    ${o==="wrap"?"if (hybridHasRot) z3 = transpose(hybridRotMat) * z3;":""}

    ${t?"// selfContained fold — scaling + DR handled inside foldOperation":`
    sphereFold(z3, dr, uHybridMinR, uHybridFixedR);
    ${o==="post"?"if (hybridHasRot) { z3 = hybridRotMat * z3; }":""}

    // Dynamic scale variation (Mandelbulber ABoxVaryScale)
    float s = uHybridScale + uHybridScaleVary * (abs(uHybridScale) - 1.0);
    z3 *= s;`}

    // C-axis permutation
    ${e}
    if (uHybridAddC > 0.5) z3 += c_perm;

    z.xyz = z3;
    ${t?"":"dr = dr * abs(s) + 1.0;"}
    trap = min(trap, getLength(z3));
}
`}function ir(){const e={};return ut.forEach((o,t)=>{o.extraParams&&Object.entries(o.extraParams).forEach(([a,r])=>{e[a]={...r,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",eq:t}]}})}),e}const nr={id:"geometry",shortId:"g",name:"Geometry",category:"Formulas",customUI:[{componentId:"interaction-picker",group:"julia",parentId:"juliaMode",condition:{bool:!0},props:{targetMode:"picking_julia",label:"Pick Coordinate",activeLabel:"Cancel Picking",helpText:"Click any point on the fractal surface to set Julia coordinates.",variant:"primary"}},{componentId:"julia-randomize",group:"julia",parentId:"juliaMode",condition:{bool:!0}}],engineConfig:{toggleParam:"applyTransformLogic",mode:"compile",label:"Geometry Modifiers",groupFilter:"engine_settings"},params:{applyTransformLogic:{type:"boolean",default:!0,label:"Geometry Engine",shortId:"gt",group:"main",description:"Master switch for geometry modifiers (Julia, Rotation, Hybrid).",noReset:!0,hidden:!0},preRotMaster:{type:"boolean",default:!0,label:"Enable Rotation",shortId:"rm",group:"engine_settings",ui:"checkbox",description:"Compiles rotation matrix logic. Disable for speed.",onUpdate:"compile",noReset:!0,estCompileMs:600},hybridCompiled:{type:"boolean",default:!1,label:"Hybrid Box Fold",shortId:"hcm",group:"engine_settings",ui:"checkbox",description:"Compiles hybrid box fold system into shader. Toggle effect on/off instantly from Formula panel.",onUpdate:"compile",noReset:!0,estCompileMs:1200},hybridMode:{type:"boolean",default:!1,label:"Hybrid Active",shortId:"hm",uniform:"uHybrid",group:"hybrid",hidden:!0},hybridFoldType:{type:"float",default:0,label:"Fold Type",shortId:"hft",group:"engine_settings",options:Qa.map(e=>({...e,estCompileMs:400})),description:"Box fold algorithm. Each type produces fundamentally different geometry.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},hybridComplex:{type:"boolean",default:!1,label:"Interleaved Mode",shortId:"hx",group:"engine_settings",ui:"checkbox",description:"Interleaves fold with fractal formula (Box → Fractal → Box). Slow compile.",onUpdate:"compile",noReset:!0,estCompileMs:1500,condition:{param:"hybridCompiled",bool:!0}},hybridPermute:{type:"float",default:0,label:"Axis Permutation",shortId:"hpe",group:"engine_settings",options:[{label:"XYZ (Default)",value:0},{label:"XZY",value:1},{label:"YXZ",value:2},{label:"YZX",value:3},{label:"ZXY",value:4},{label:"ZYX",value:5}],description:"Permutes the constant (c) axis mapping. Changes fractal topology.",onUpdate:"compile",noReset:!0,condition:{param:"hybridCompiled",bool:!0}},burningEnabled:{type:"boolean",default:!1,label:"Burning Mode",shortId:"bm",group:"burning",description:'Applies absolute value to coordinates every iteration. Creates "Burning Ship" variations.',uniform:"uBurningEnabled"},hybridIter:{type:"float",default:2,label:"Iterations",shortId:"hi",uniform:"uHybridIter",min:0,max:10,step:1,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFoldLimit:{type:"float",default:1,label:"Fold Limit",shortId:"hl",uniform:"uHybridFoldLimit",min:.1,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],hidden:!0},hybridFoldLimitVec:{type:"vec3",default:new j(1,1,1),label:"Fold Limit",shortId:"hlv",uniform:"uHybridFoldLimitVec",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0},{param:"hybridFoldType",lt:4}],linkable:!0},hybridScale:{type:"float",default:2,label:"Scale",shortId:"hs",uniform:"uHybridScale",min:.5,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridScaleVary:{type:"float",default:0,label:"Scale Variation",shortId:"hsv",uniform:"uHybridScaleVary",min:-1,max:1,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}],description:"Dynamic scale feedback per iteration (ABoxVaryScale)."},hybridMinR:{type:"float",default:.5,label:"Min Radius",shortId:"hn",uniform:"uHybridMinR",min:0,max:1.5,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridFixedR:{type:"float",default:1,label:"Fixed Radius",shortId:"hf",uniform:"uHybridFixedR",min:.1,max:3,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridAddC:{type:"boolean",default:!1,label:"Add Constant",shortId:"hc",uniform:"uHybridAddC",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridShift:{type:"vec3",default:new j(0,0,0),label:"Shift",shortId:"hs2",uniform:"uHybridShift",min:-2,max:2,step:.01,group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},hybridRot:{type:"vec3",default:new j(0,0,0),label:"Rotation",shortId:"hr",uniform:"uHybridRot",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",mode:"rotation",group:"hybrid",condition:[{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},...ir(),hybridSwap:{type:"boolean",default:!1,label:"Swap Order",shortId:"hw",group:"engine_settings",ui:"checkbox",description:"Start with fractal formula instead of box fold.",onUpdate:"compile",noReset:!0,condition:[{param:"hybridCompiled",bool:!0},{param:"hybridComplex",bool:!0}]},hybridSkip:{type:"int",default:1,label:"Hybrid Interval",shortId:"hk",uniform:"uHybridSkip",min:1,max:8,step:1,group:"hybrid",condition:[{param:"hybridComplex",bool:!0},{param:"hybridCompiled",bool:!0},{param:"hybridMode",bool:!0}]},preRotEnabled:{type:"boolean",default:!1,label:"Local Rotation",shortId:"re",group:"transform",condition:{param:"preRotMaster",bool:!0}},preRotX:{type:"float",default:0,label:"Pre X",shortId:"rx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotY:{type:"float",default:0,label:"Pre Y",shortId:"ry",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRotZ:{type:"float",default:0,label:"Pre Z",shortId:"rz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},preRot:{type:"vec3",default:new j(0,0,0),label:"Pre Rotation",composeFrom:["preRotX","preRotY","preRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},postRotX:{type:"float",default:0,label:"Post X",shortId:"qx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotY:{type:"float",default:0,label:"Post Y",shortId:"qy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRotZ:{type:"float",default:0,label:"Post Z",shortId:"qz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},postRot:{type:"vec3",default:new j(0,0,0),label:"Post Rotation",composeFrom:["postRotX","postRotY","postRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},worldRotX:{type:"float",default:0,label:"World X",shortId:"wx",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotY:{type:"float",default:0,label:"World Y",shortId:"wy",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRotZ:{type:"float",default:0,label:"World Z",shortId:"wz",min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0},hidden:!0},worldRot:{type:"vec3",default:new j(0,0,0),label:"World Rotation",composeFrom:["worldRotX","worldRotY","worldRotZ"],min:-Math.PI,max:Math.PI,step:.01,scale:"pi",group:"transform",parentId:"preRotEnabled",condition:{bool:!0}},juliaMode:{type:"boolean",default:!1,label:"Julia Mode",shortId:"jm",uniform:"uJuliaMode",group:"julia",description:"Replaces the iterating variable with a fixed coordinate, producing connected Julia set slices."},juliaX:{type:"float",default:0,label:"Julia X",shortId:"jx",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaY:{type:"float",default:0,label:"Julia Y",shortId:"jy",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},juliaZ:{type:"float",default:0,label:"Julia Z",shortId:"jz",min:-2,max:2,step:.01,group:"julia_params",condition:{param:"juliaMode",bool:!0},hidden:!0},julia:{type:"vec3",default:new j(0,0,0),label:"Julia Coordinate",uniform:"uJulia",composeFrom:["juliaX","juliaY","juliaZ"],min:-2,max:2,step:.01,group:"julia",parentId:"juliaMode",condition:{bool:!0}}},inject:(e,o)=>{var u;const t=o.geometry;if((t?t.applyTransformLogic:!0)===!1){e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);return}const r=t?t.preRotMaster!==!1:!0;e.setRotation(r),e.addPreamble(tr);const i=(t==null?void 0:t.hybridCompiled)??!1;if(!i)e.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);else{const h=(t==null?void 0:t.hybridFoldType)??0,f=er(h);e.addFunction(f.glsl);const p=(t==null?void 0:t.hybridPermute)??0,m=ar(p);e.addFunction(rr(m,f.rotMode??"wrap",f.selfContained??!1))}let n="",l="";const s=o.formula,c=((u=fe.get(s))==null?void 0:u.shader.selfContainedSDE)??!1;if(c||(l+="z.xyz = mix(z.xyz, abs(z.xyz), step(0.5, uBurningEnabled));"),i&&!c)if(!(t&&t.hybridComplex))n+=`
                if (uHybrid > 0.5) {
                    initHybridTransform();
                    int hLim = int(uHybridIter);
                    for(int i=0; i<16; i++) {
                        if (i >= hLim) break;
                        formula_Hybrid(z, dr, trap, c);
                    }
                }
                `;else{const f=(t==null?void 0:t.hybridSwap)??!1;n+=`if (uHybrid > 0.5) { initHybridTransform(); }
`,l+=`
                if (uHybrid > 0.5) {
                    int skip = int(uHybridSkip);
                    if (skip < 1) skip = 1;

                    if (i >= ${f?"1":"0"}) {
                        int rel_i = i - ${f?"1":"0"};

                        if ((rel_i % skip) == 0 && (rel_i / skip) < int(uHybridIter)) {
                            formula_Hybrid(z, dr, trap, c);
                            skipMainFormula = true;
                        }
                    }
                }
                `}e.addHybridFold("",n,l)}},eo=["uParamA","uParamB","uParamC","uParamD","uParamE","uParamF"],to=["uVec2A","uVec2B","uVec2C"],oo=["uVec3A","uVec3B","uVec3C"],ao=["uVec4A","uVec4B","uVec4C"],Po=["uInterlaceParamA","uInterlaceParamB","uInterlaceParamC","uInterlaceParamD","uInterlaceParamE","uInterlaceParamF"],Lo=["uInterlaceVec2A","uInterlaceVec2B","uInterlaceVec2C"],To=["uInterlaceVec3A","uInterlaceVec3B","uInterlaceVec3C"],Eo=["uInterlaceVec4A","uInterlaceVec4B","uInterlaceVec4C"];function sr(){const e=[];for(let o=0;o<eo.length;o++)e.push([new RegExp(`\\b${eo[o]}\\b`,"g"),Po[o]]);for(let o=0;o<to.length;o++)e.push([new RegExp(`\\b${to[o]}\\b`,"g"),Lo[o]]);for(let o=0;o<oo.length;o++)e.push([new RegExp(`\\b${oo[o]}\\b`,"g"),To[o]]);for(let o=0;o<ao.length;o++)e.push([new RegExp(`\\b${ao[o]}\\b`,"g"),Eo[o]]);return e}const lr=sr();function Et(e){let o=e;for(const[t,a]of lr)o=o.replace(t,a);return o}function pt(e,o){const t=[...o].sort((r,i)=>i.length-r.length);let a=e;for(const r of t)a=a.replace(new RegExp(`\\b${r}\\b`,"g"),`interlace_${r}`);return a}function st(e){const o=[],t=/\b(?:void|vec[234]|float|int|mat[234]|bool)\s+(\w+)\s*\(/g,a=/^\s*(?:const\s+)?(?:vec[234]|float|int|mat[234]|bool)\s+([^;]+);/,r=/^\s*(\w+)/;let i=0;for(const n of e.split(`
`)){if(i===0){t.lastIndex=0;let l;for(;(l=t.exec(n))!==null;){const c=l[1];!c.startsWith("formula_")&&!o.includes(c)&&o.push(c)}const s=a.exec(n);if(s){const c=[];let u=0,h="";for(const f of s[1]){if(f==="(")u++;else if(f===")")u--;else if(f===","&&u===0){c.push(h),h="";continue}h+=f}h&&c.push(h);for(const f of c){const p=r.exec(f);p&&!o.includes(p[1])&&o.push(p[1])}}}for(const l of n)l==="{"?i++:l==="}"&&i--}return o}function cr(e,o,t){let a=e;a=a.replace(new RegExp(`\\b${o}_\\w+\\b`,"g"),i=>`interlace_${i}`);const r=st(e);for(const i of r)a=a.replace(new RegExp(`\\b${i}\\b`,"g"),`interlace_${i}`);return t&&t.length>0&&(a=pt(a,t)),a=Et(a),a}function dr(e,o,t,a){let r=e;if(r=r.replace(new RegExp(`\\bformula_${o}\\b`,"g"),"formula_Interlace"),r=Et(r),t&&t.length>0&&(r=pt(r,t)),a&&a.length>0)for(const i of a)r=r.replace(new RegExp(`\\b${i}\\b`,"g"),`interlace_${i}`);return r}function ur(e,o,t){let a=e.replace(new RegExp(`\\bformula_${o}\\b`,"g"),"formula_Interlace");return t&&t.length>0&&(a=pt(a,t)),a}function fr(e,o,t,a){let r=e;if(r=r.replace(new RegExp(`\\b${o}_\\w+\\b`,"g"),i=>`interlace_${i}`),r=Et(r),t&&t.length>0&&(r=pt(r,t)),a&&a.length>0)for(const i of a)r=r.replace(new RegExp(`\\b${i}\\b`,"g"),`interlace_${i}`);return r}function pr(e,o,t){let a="";o&&(a=`
    vec3 _il_savedAxis = gmt_rotAxis;
    float _il_savedCos = gmt_rotCos;
    float _il_savedSin = gmt_rotSin;
    ${o}
    vec3 _il_interlaceAxis = gmt_rotAxis;
    float _il_interlaceCos = gmt_rotCos;
    float _il_interlaceSin = gmt_rotSin;
    gmt_rotAxis = _il_savedAxis;
    gmt_rotCos = _il_savedCos;
    gmt_rotSin = _il_savedSin;`);const n=`
    if (uInterlaceEnabled > 0.5) {
        int ilSkip = int(uInterlaceInterval);
        int ilStart = int(uInterlaceStartIter);
        if (ilSkip < 1) ilSkip = 1;
        if (i >= ilStart && ((i - ilStart) % ilSkip) == 0) {
            ${t?`
            gmt_rotAxis = _il_interlaceAxis;
            gmt_rotCos = _il_interlaceCos;
            gmt_rotSin = _il_interlaceSin;`:""}
            ${e}
            ${t?`
            gmt_rotAxis = _il_savedAxis;
            gmt_rotCos = _il_savedCos;
            gmt_rotSin = _il_savedSin;`:""}
            skipMainFormula = true;
        }
    }`;return{preLoop:a,inLoop:n}}const rt={scalars:Po,vec2s:Lo,vec3s:To,vec4s:Eo};function hr(){return fe.getAll().filter(e=>e.id!=="Modular").map(e=>({label:e.name,value:e.id}))}const ko={interlaceParamA:"paramA",interlaceParamB:"paramB",interlaceParamC:"paramC",interlaceParamD:"paramD",interlaceParamE:"paramE",interlaceParamF:"paramF",interlaceVec3A:"vec3A",interlaceVec3B:"vec3B",interlaceVec3C:"vec3C",interlaceVec2A:"vec2A",interlaceVec2B:"vec2B",interlaceVec2C:"vec2C",interlaceVec4A:"vec4A",interlaceVec4B:"vec4B",interlaceVec4C:"vec4C"},mr=Object.fromEntries(Object.entries(ko).map(([e,o])=>[o,e]));function gr(e){const o=fe.get(e);if(!o)return{};const t={};for(const a of o.parameters){if(!a)continue;const r=mr[a.id];r!==void 0&&(t[r]=a.default)}return t}function zo(e,o){const t=e==null?void 0:e.interlaceFormula;if(!t)return;const a=fe.get(t);if(!a)return;const r=ko[o];return a.parameters.find(i=>i&&i.id===r)??void 0}function pe(e){return o=>{const t=zo(o,e);if(!t)return;const a={label:t.label};return t.min!==void 0&&(a.min=t.min),t.max!==void 0&&(a.max=t.max),t.step!==void 0&&(a.step=t.step),t.mode&&(a.mode=t.mode),t.scale&&(a.scale=t.scale),t.linkable!==void 0&&(a.linkable=t.linkable),t.options&&(a.options=t.options),a}}function he(e){return o=>!!zo(o,e)}const yr={id:"interlace",shortId:"il",name:"Formula Interlace",category:"Formulas",dependsOn:["coreMath","geometry"],engineConfig:{toggleParam:"interlaceCompiled",mode:"compile",label:"Formula Interlacing",description:"Alternate between two formulas per iteration (like Mandelbulber hybrid).",groupFilter:"engine_settings"},panelConfig:{compileParam:"interlaceCompiled",runtimeToggleParam:"interlaceEnabled",compileSettingsParams:["interlaceFormula"],runtimeGroup:"interlace_runtime",label:"Interlace",compileMessage:"Compiling interlaced formula..."},params:{interlaceCompiled:{type:"boolean",default:!1,label:"Formula Interlacing",shortId:"ilc",group:"engine_settings",ui:"checkbox",description:"Compiles a secondary formula into the shader for per-iteration alternation.",onUpdate:"compile",noReset:!0,estCompileMs:1500},interlaceFormula:{type:"float",default:"Mandelbulb",label:"Secondary Formula",shortId:"ilf",group:"engine_settings",get options(){return hr().map(e=>({label:e.label,value:e.value,estCompileMs:800}))},description:"Formula to alternate with the primary formula each iteration.",onUpdate:"compile",noReset:!0,condition:{param:"interlaceCompiled",bool:!0},onSet:e=>gr(e)},interlaceEnabled:{type:"boolean",default:!1,label:"Interlace Active",shortId:"ile",uniform:"uInterlaceEnabled",group:"interlace_runtime",hidden:!0},interlaceInterval:{type:"float",default:2,label:"Interval",shortId:"ili",uniform:"uInterlaceInterval",min:1,max:10,step:1,group:"interlace_runtime",description:"Run secondary formula every N iterations.",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}]},interlaceStartIter:{type:"float",default:0,label:"Start Iter",shortId:"ils",uniform:"uInterlaceStartIter",min:0,max:20,step:1,group:"interlace_runtime",description:"First iteration where secondary formula runs.",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}]},interlaceParamA:{type:"float",default:8,label:"Param A",shortId:"ila",uniform:"uInterlaceParamA",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceParamA"),dynamicVisible:he("interlaceParamA")},interlaceParamB:{type:"float",default:0,label:"Param B",shortId:"ilb",uniform:"uInterlaceParamB",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceParamB"),dynamicVisible:he("interlaceParamB")},interlaceParamC:{type:"float",default:0,label:"Param C",shortId:"ilc2",uniform:"uInterlaceParamC",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceParamC"),dynamicVisible:he("interlaceParamC")},interlaceParamD:{type:"float",default:0,label:"Param D",shortId:"ild",uniform:"uInterlaceParamD",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceParamD"),dynamicVisible:he("interlaceParamD")},interlaceParamE:{type:"float",default:0,label:"Param E",shortId:"ile2",uniform:"uInterlaceParamE",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceParamE"),dynamicVisible:he("interlaceParamE")},interlaceParamF:{type:"float",default:0,label:"Param F",shortId:"ilf2",uniform:"uInterlaceParamF",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceParamF"),dynamicVisible:he("interlaceParamF")},interlaceVec3A:{type:"vec3",default:new j(0,0,0),label:"Vec3 A",shortId:"ilv3a",uniform:"uInterlaceVec3A",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceVec3A"),dynamicVisible:he("interlaceVec3A")},interlaceVec3B:{type:"vec3",default:new j(0,0,0),label:"Vec3 B",shortId:"ilv3b",uniform:"uInterlaceVec3B",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceVec3B"),dynamicVisible:he("interlaceVec3B")},interlaceVec3C:{type:"vec3",default:new j(0,0,0),label:"Vec3 C",shortId:"ilv3c",uniform:"uInterlaceVec3C",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceVec3C"),dynamicVisible:he("interlaceVec3C")},interlaceVec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"ilv2a",uniform:"uInterlaceVec2A",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceVec2A"),dynamicVisible:he("interlaceVec2A")},interlaceVec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"ilv2b",uniform:"uInterlaceVec2B",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceVec2B"),dynamicVisible:he("interlaceVec2B")},interlaceVec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"ilv2c",uniform:"uInterlaceVec2C",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceVec2C"),dynamicVisible:he("interlaceVec2C")},interlaceVec4A:{type:"vec4",default:{x:0,y:0,z:0,w:0},label:"Vec4 A",shortId:"ilv4a",uniform:"uInterlaceVec4A",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceVec4A"),dynamicVisible:he("interlaceVec4A")},interlaceVec4B:{type:"vec4",default:{x:0,y:0,z:0,w:0},label:"Vec4 B",shortId:"ilv4b",uniform:"uInterlaceVec4B",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceVec4B"),dynamicVisible:he("interlaceVec4B")},interlaceVec4C:{type:"vec4",default:{x:0,y:0,z:0,w:0},label:"Vec4 C",shortId:"ilv4c",uniform:"uInterlaceVec4C",min:-10,max:10,step:.001,group:"interlace_runtime",condition:[{param:"interlaceCompiled",bool:!0},{param:"interlaceEnabled",bool:!0}],dynamicConfig:pe("interlaceVec4C"),dynamicVisible:he("interlaceVec4C")}},groups:{interlace_runtime:{label:"Interlace Controls"}},inject:(e,o,t)=>{var p;const a=o.interlace;if(!(a!=null&&a.interlaceCompiled))return;const r=a.interlaceFormula;if(!r||r==="Modular"||o.formula==="Modular"||(p=fe.get(o.formula))!=null&&p.shader.selfContainedSDE)return;const i=fe.get(r);if(!i||i.shader.selfContainedSDE)return;if(t==="Mesh"){for(const m of rt.scalars)e.addUniform(m,"float");for(const m of rt.vec2s)e.addUniform(m,"vec2");for(const m of rt.vec3s)e.addUniform(m,"vec3");for(const m of rt.vec4s)e.addUniform(m,"vec4");e.addUniform("uInterlaceEnabled","float"),e.addUniform("uInterlaceInterval","float"),e.addUniform("uInterlaceStartIter","float")}const n=[...st(i.shader.preamble??""),...st(i.shader.function??""),...st(i.shader.loopInit??"")].filter((m,b,g)=>g.indexOf(m)===b);if(i.shader.preamble){const m=cr(i.shader.preamble,i.id,i.shader.preambleVars);e.addPreamble(m)}const l=dr(i.shader.function,i.id,i.shader.preambleVars,n);e.addFunction(l);const s=ur(i.shader.loopBody,i.id,i.shader.preambleVars);let c="";i.shader.loopInit&&(c=fr(i.shader.loopInit,i.id,i.shader.preambleVars,n));const u=!!i.shader.usesSharedRotation,{preLoop:h,inLoop:f}=pr(s,c,u);e.addHybridFold("",h,f)}},wn=220,_n=24,In=32,Cn=24,Mn=24,Rn=50,Ge=64,K=8,tt=2e3,Pn=256,Ln=50,Tn={DEFAULT_BITRATE:40},En=[{label:"MP4 (H.264) - Universal",container:"mp4",codec:"avc",ext:"mp4",mime:"video/mp4",imageSequence:!1},{label:"MP4 (H.265/HEVC) - High Quality",container:"mp4",codec:"hevc",ext:"mp4",mime:"video/mp4",imageSequence:!1},{label:"MP4 (AV1) - Best Compression",container:"mp4",codec:"av1",ext:"mp4",mime:"video/mp4",imageSequence:!1},{label:"WebM (VP9) - Web Standard",container:"webm",codec:"vp9",ext:"webm",mime:"video/webm",imageSequence:!1},{label:"PNG Sequence (RGBA)",container:"png",codec:"png",ext:"png",mime:"image/png",imageSequence:!0},{label:"JPG Sequence (per pass)",container:"jpg",codec:"jpg",ext:"jpg",mime:"image/jpeg",imageSequence:!0}],br={id:"quality",shortId:"q",name:"Quality",category:"Rendering",tabConfig:{label:"Quality",componentId:"panel-quality",order:60},engineConfig:{toggleParam:"engineQuality",mode:"compile",label:"Loop Limits & Precision",groupFilter:"engine_settings"},params:{engineQuality:{type:"boolean",default:!0,label:"Quality Core",shortId:"qc",group:"main",noReset:!0,hidden:!0},compilerHardCap:{type:"int",default:tt,label:"Hard Loop Cap",shortId:"hc",min:64,max:tt,step:1,group:"engine_settings",ui:"numeric",description:"Safety limit for ray/DE loops (MAX_HARD_ITERATIONS define). Requires recompile but does not affect compile time — ANGLE/D3D does not unroll define-bounded loops.",onUpdate:"compile",noReset:!0,hidden:!0},precisionMode:{type:"float",default:0,label:"Ray Precision",shortId:"pm",group:"engine_settings",options:[{label:"High (Desktop)",value:0},{label:"Standard (Mobile)",value:1}],description:"Sets the minimum epsilon (ray hit distance). Standard prevents GPU hangs on mobile.",onUpdate:"compile",noReset:!0,hidden:!0},bufferPrecision:{type:"float",default:0,label:"Texture Buffer",shortId:"bp",group:"engine_settings",options:[{label:"Float32 (HDR)",value:0},{label:"HalfFloat16",value:1}],description:"Controls render target bit-depth. 16-bit is faster and required on some mobile GPUs.",onUpdate:"compile",noReset:!0,hidden:!0},maxSteps:{type:"int",default:300,label:"Max Ray Steps",shortId:"ms",uniform:"uMaxSteps",min:32,max:tt,step:1,group:"kernel",description:"Runtime limit. Rays stop after this many steps. Artistic tool for limiting depth. Maximum is limited by Hard Loop Cap.",dynamicMaxRef:"compilerHardCap"},distanceMetric:{type:"float",default:0,label:"Distance Metric",shortId:"dm",uniform:"uDistanceMetric",group:"kernel",options:[{label:"Euclidean (Sphere)",value:0},{label:"Chebyshev (Box)",value:1},{label:"Manhattan (Diamond)",value:2},{label:"Minkowski 4 (Rounded)",value:3}],description:'The shape of "distance". Changes the aesthetic of the fractal surface.'},estimator:{type:"float",default:0,label:"Estimator",shortId:"es",group:"kernel",options:[{label:"Analytic (Log)",value:0},{label:"Linear (Unit 1.0)",value:1},{label:"Linear (Offset 2.0)",value:4},{label:"Pseudo (Raw)",value:2},{label:"Dampened",value:3}],description:"Algorithm for calculating distance. Log=Smooth, Linear=Sharp/IFS, Pseudo=Artifact Fix.",onUpdate:"compile",noReset:!0,isAdvanced:!0},fudgeFactor:{type:"float",default:1,label:"Slice Optimization",shortId:"ff",uniform:"uFudgeFactor",min:.01,max:1,step:.01,group:"kernel",description:"Multiplies step size. Lower = Higher quality but slower. Set to < 0.2 for deep zooms.",format:e=>e.toFixed(2)},stepRelaxation:{type:"float",default:0,label:"Step Relaxation",shortId:"sr",uniform:"uStepRelaxation",min:0,max:1,step:.01,group:"kernel",description:"Dynamic Step Size. 0 = Fixed Fudge. 1 = Variable (Fudge near surface, 1.0 in void). Saves steps.",isAdvanced:!0},stepJitter:{type:"float",default:.15,label:"Step Jitter",shortId:"sj",uniform:"uStepJitter",min:0,max:1,step:.01,group:"kernel",description:"Stochastic step variation. Breaks banding artifacts. Higher = softer edges, artistic blur.",format:e=>e.toFixed(2)},refinementSteps:{type:"int",default:0,label:"Edge Polish",shortId:"rf",uniform:"uRefinementSteps",min:0,max:5,step:1,group:"kernel",description:"Extra micro-steps after hitting surface. Fixes slicing/banding artifacts.",isAdvanced:!0},detail:{type:"float",default:1,label:"Ray detail",shortId:"rd",uniform:"uDetail",min:.1,max:10,step:.1,group:"kernel"},pixelThreshold:{type:"float",default:.5,label:"Pixel threshold",shortId:"pt",uniform:"uPixelThreshold",min:.1,max:2,step:.1,group:"kernel"},overstepTolerance:{type:"float",default:0,label:"Overstep Fix",shortId:"ot",uniform:"uOverstepTolerance",min:0,max:1e3,step:.1,scale:"log",group:"kernel",description:"Recovers details missed by the raymarcher. 0=Off. Higher values fix more holes but may create noise."},dynamicScaling:{type:"boolean",default:!0,label:"Adaptive Resolution",shortId:"ds",group:"performance",noReset:!0},interactionDownsample:{type:"float",default:2,label:"Move Quality",shortId:"id",min:1,max:4,step:.5,group:"performance",condition:{and:[{param:"dynamicScaling",bool:!0},{param:"adaptiveTarget",eq:0}]},format:e=>`1/${e}x`,noReset:!0},adaptiveTarget:{type:"float",default:30,label:"Target FPS",shortId:"at",min:15,max:60,step:5,group:"performance",condition:{param:"dynamicScaling",bool:!0},noReset:!0},physicsProbeMode:{type:"float",default:0,label:"Distance Probe",shortId:"dp",group:"performance",isAdvanced:!0,options:[{label:"GPU Probe",value:0},{label:"Manual",value:2}],description:"GPU Probe: Reads distance from render target. Manual: Fixed value for orbit control.",noReset:!0},manualDistance:{type:"float",default:10,label:"Manual Distance",shortId:"md",min:.1,max:1e3,step:.1,group:"performance",isAdvanced:!0,parentId:"physicsProbeMode",condition:{param:"physicsProbeMode",eq:2},description:"Manual distance value. Used for orbit control calculations.",format:e=>e.toFixed(1),noReset:!0}},inject:(e,o)=>{const t=o.quality,a=(t==null?void 0:t.compilerHardCap)||tt;e.addDefine("MAX_HARD_ITERATIONS",Math.floor(a).toString())}};class vr{constructor(){M(this,"nodes",new Map)}register(o){this.nodes.set(o.id,o)}get(o){return this.nodes.get(o)}getAll(){return Array.from(this.nodes.values())}getGrouped(){const o={};return this.nodes.forEach(t=>{o[t.category]||(o[t.category]=[]),o[t.category].push(t.id)}),o}}const q=new vr;q.register({id:"Note",label:"Comment / Note",category:"Utils",description:"A text block for leaving comments. Ignored by renderer.",inputs:[],glsl:e=>""});q.register({id:"AddConstant",label:"Add C (Julia/Pixel)",category:"Utils",description:"Adds the Julia Constant (or Pixel Coordinate) to the position. Essential for Mandelbrot/Julia hybrids.",inputs:[{id:"scale",label:"Strength",min:0,max:2,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_p += c.xyz * ${e.getParam("scale")};`});q.register({id:"Scale",label:"Scale (Mult)",category:"Transforms",description:"Simple multiplication. Warning: For fractals, use IFS Scale to keep centered.",inputs:[{id:"scale",label:"Scale",min:.1,max:5,step:.01,default:2,hardMin:.001}],glsl:e=>`
${e.indent}${e.varName}_p *= ${e.getParam("scale")};
${e.indent}${e.varName}_dr *= abs(${e.getParam("scale")});
`});q.register({id:"IFSScale",label:"IFS Scale (Homothety)",category:"Transforms",description:"Scales space while shifting to maintain a center. Critical for Menger/Sierpinski.",inputs:[{id:"scale",label:"Scale",min:1,max:5,step:.01,default:2},{id:"offset",label:"Offset",min:0,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float scale = ${e.getParam("scale")};
${e.indent}    float off = ${e.getParam("offset")};
${e.indent}    ${e.varName}_p = ${e.varName}_p * scale - vec3(off * (scale - 1.0));
${e.indent}    ${e.varName}_dr *= abs(scale);
${e.indent}}
`});q.register({id:"Rotate",label:"Rotate",category:"Transforms",description:"Rotates space around X, Y, Z axes.",inputs:[{id:"x",label:"Rot X",min:-180,max:180,step:1,default:0},{id:"y",label:"Rot Y",min:-180,max:180,step:1,default:0},{id:"z",label:"Rot Z",min:-180,max:180,step:1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 rot = vec3(radians(${e.getParam("x")}), radians(${e.getParam("y")}), radians(${e.getParam("z")}));
${e.indent}    if(abs(rot.x)>0.001) { float s=sin(rot.x); float c=cos(rot.x); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.yz = m*${e.varName}_p.yz; }
${e.indent}    if(abs(rot.y)>0.001) { float s=sin(rot.y); float c=cos(rot.y); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xz = m*${e.varName}_p.xz; }
${e.indent}    if(abs(rot.z)>0.001) { float s=sin(rot.z); float c=cos(rot.z); mat2 m=mat2(c,-s,s,c); ${e.varName}_p.xy = m*${e.varName}_p.xy; }
${e.indent}}
`});q.register({id:"Translate",label:"Translate",category:"Transforms",description:"Linear shift of coordinates.",inputs:[{id:"x",label:"X",min:-5,max:5,step:.01,default:0},{id:"y",label:"Y",min:-5,max:5,step:.01,default:0},{id:"z",label:"Z",min:-5,max:5,step:.01,default:0}],glsl:e=>`
${e.indent}${e.varName}_p += vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
`});q.register({id:"Mod",label:"Modulo (Repeat)",category:"Transforms",description:"Tiles space infinitely in a grid.",inputs:[{id:"x",label:"X Period",min:0,max:10,step:.1,default:0},{id:"y",label:"Y Period",min:0,max:10,step:.1,default:0},{id:"z",label:"Z Period",min:0,max:10,step:.1,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 per = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    if(abs(per.x)>0.001) ${e.varName}_p.x = mod(${e.varName}_p.x + 0.5*per.x, per.x) - 0.5*per.x;
${e.indent}    if(abs(per.y)>0.001) ${e.varName}_p.y = mod(${e.varName}_p.y + 0.5*per.y, per.y) - 0.5*per.y;
${e.indent}    if(abs(per.z)>0.001) ${e.varName}_p.z = mod(${e.varName}_p.z + 0.5*per.z, per.z) - 0.5*per.z;
${e.indent}}
`});q.register({id:"AmazingFold",label:"Amazing Fold",category:"Folds",description:"The core folding logic of the Amazing Box (Box + Sphere fold). Does not scale or add C.",inputs:[{id:"limit",label:"Box Limit",min:.1,max:3,step:.01,default:1},{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`
${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});
${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});
`});q.register({id:"Abs",label:"Abs (Mirror)",category:"Folds",description:"Absolute value fold on all axes. Creates cubic symmetries.",inputs:[],glsl:e=>`${e.indent}${e.varName}_p = abs(${e.varName}_p);`});q.register({id:"BoxFold",label:"Box Fold",category:"Folds",description:"Clamps space inside a box limit. The core of the Mandelbox.",inputs:[{id:"limit",label:"Limit",min:.1,max:3,step:.01,default:1,hardMin:.001}],glsl:e=>`${e.indent}boxFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("limit")});`});q.register({id:"SphereFold",label:"Sphere Fold",category:"Folds",description:"Inverts space inside a sphere. Creates spherical voids.",inputs:[{id:"minR",label:"Min Radius",min:0,max:2,step:.01,default:.5},{id:"fixedR",label:"Fixed Radius",min:0,max:3,step:.01,default:1}],glsl:e=>`${e.indent}sphereFold(${e.varName}_p, ${e.varName}_dr, ${e.getParam("minR")}, ${e.getParam("fixedR")});`});q.register({id:"PlaneFold",label:"Plane Fold",category:"Folds",description:"Reflects space across a plane defined by a Normal and Distance.",inputs:[{id:"x",label:"Normal X",min:-1,max:1,step:.01,default:0},{id:"y",label:"Normal Y",min:-1,max:1,step:.01,default:1},{id:"z",label:"Normal Z",min:-1,max:1,step:.01,default:0},{id:"d",label:"Offset",min:-2,max:2,step:.01,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 n = normalize(vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")}));
${e.indent}    ${e.varName}_p -= 2.0 * min(0.0, dot(${e.varName}_p, n) - ${e.getParam("d")}) * n;
${e.indent}}
`});q.register({id:"MengerFold",label:"Menger Fold",category:"Folds",description:"Permutes coordinates (sorts xyz). Essential for Menger Sponges.",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.y) ${e.varName}_p.xy = ${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x < ${e.varName}_p.z) ${e.varName}_p.xz = ${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y < ${e.varName}_p.z) ${e.varName}_p.yz = ${e.varName}_p.zy;
`});q.register({id:"SierpinskiFold",label:"Sierpinski Fold",category:"Folds",description:"Diagonal folding for Tetrahedral fractals (MixPinski).",inputs:[],glsl:e=>`
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.y < 0.0) ${e.varName}_p.xy = -${e.varName}_p.yx;
${e.indent}if(${e.varName}_p.x + ${e.varName}_p.z < 0.0) ${e.varName}_p.xz = -${e.varName}_p.zx;
${e.indent}if(${e.varName}_p.y + ${e.varName}_p.z < 0.0) ${e.varName}_p.yz = -${e.varName}_p.zy;
`});q.register({id:"Mandelbulb",label:"Mandelbulb",category:"Fractals",description:"The standard Power function. Includes phase shifts.",inputs:[{id:"power",label:"Power",min:1,max:16,step:.1,default:8},{id:"phaseX",label:"Phi Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"phaseY",label:"Theta Phase",min:-3.14,max:3.14,step:.01,default:0},{id:"twist",label:"Z Twist",min:-2,max:2,step:.01,default:0}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 p = ${e.varName}_p;
${e.indent}    float r = length(p);
${e.indent}    float power = ${e.getParam("power")};
${e.indent}    ${e.varName}_dr = pow(max(r, 1e-5), power - 1.0) * power * ${e.varName}_dr + 1.0;
${e.indent}    float theta = acos(clamp(p.z / r, -1.0, 1.0));
${e.indent}    float phi = atan(p.y, p.x);
${e.indent}    theta = theta * power + ${e.getParam("phaseX")};
${e.indent}    phi = phi * power + ${e.getParam("phaseY")};
${e.indent}    float zr = pow(r, power);
${e.indent}    p = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
${e.indent}    float tw = ${e.getParam("twist")};
${e.indent}    if(abs(tw) > 0.001) { float ang = p.z * tw; float s = sin(ang); float c = cos(ang); p.xy = mat2(c,-s,s,c) * p.xy; }
${e.indent}    ${e.varName}_p = p;
${e.indent}}
`});q.register({id:"Sphere",label:"Sphere",category:"Primitives",description:"SDF Sphere.",inputs:[{id:"r",label:"Radius",min:.1,max:5,step:.01,default:1}],glsl:e=>`${e.indent}${e.varName}_d = length(${e.varName}_p) - ${e.getParam("r")};`});q.register({id:"Box",label:"Box",category:"Primitives",description:"SDF Box.",inputs:[{id:"x",label:"Size X",min:.1,max:5,step:.01,default:1},{id:"y",label:"Size Y",min:.1,max:5,step:.01,default:1},{id:"z",label:"Size Z",min:.1,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    vec3 b = vec3(${e.getParam("x")}, ${e.getParam("y")}, ${e.getParam("z")});
${e.indent}    vec3 d = abs(${e.varName}_p) - b;
${e.indent}    ${e.varName}_d = length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
${e.indent}}
`});q.register({id:"Twist",label:"Twist (Z)",category:"Distortion",description:"Twists space along the Z-axis.",inputs:[{id:"amount",label:"Amount",min:-5,max:5,step:.01,default:1}],glsl:e=>`
${e.indent}{
${e.indent}    float c_tw = cos(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    float s_tw = sin(${e.getParam("amount")} * ${e.varName}_p.z);
${e.indent}    mat2 m_tw = mat2(c_tw, -s_tw, s_tw, c_tw);
${e.indent}    ${e.varName}_p.xy = m_tw * ${e.varName}_p.xy;
${e.indent}}
`});q.register({id:"Bend",label:"Bend (Y)",category:"Distortion",description:"Bends space along the Y-axis.",inputs:[{id:"amount",label:"Amount",min:-2,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}{
${e.indent}    float c_bn = cos(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    float s_bn = sin(${e.getParam("amount")} * ${e.varName}_p.y);
${e.indent}    mat2 m_bn = mat2(c_bn, -s_bn, s_bn, c_bn);
${e.indent}    ${e.varName}_p.xz = m_bn * ${e.varName}_p.xz;
${e.indent}}
`});q.register({id:"SineWave",label:"Sine Wave",category:"Distortion",description:"Adds a sinusoidal ripple to the position.",inputs:[{id:"freq",label:"Frequency",min:.1,max:10,step:.1,default:2},{id:"amp",label:"Amplitude",min:0,max:1,step:.01,default:.1}],glsl:e=>`
${e.indent}${e.varName}_p += sin(${e.varName}_p.yzx * ${e.getParam("freq")}) * ${e.getParam("amp")};
`});q.register({id:"Union",label:"Union",category:"Combiners (CSG)",description:"Combines two shapes (min).",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d < ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});q.register({id:"Subtract",label:"Subtract",category:"Combiners (CSG)",description:"Carves B out of A.",inputs:[],glsl:e=>`
${e.indent}float negB = -${e.in2}_d;
${e.indent}bool winA = ${e.varName}_d > negB; 
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : negB;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});q.register({id:"Intersect",label:"Intersect",category:"Combiners (CSG)",description:"Area where A and B overlap.",inputs:[],glsl:e=>`
${e.indent}bool winA = ${e.varName}_d > ${e.in2}_d;
${e.indent}${e.varName}_d = winA ? ${e.varName}_d : ${e.in2}_d;
${e.indent}${e.varName}_p = winA ? ${e.varName}_p : ${e.in2}_p;
${e.indent}${e.varName}_dr = winA ? ${e.varName}_dr : ${e.in2}_dr;
`});q.register({id:"SmoothUnion",label:"Smooth Union",category:"Combiners (CSG)",description:"Merges shapes organically.",inputs:[{id:"k",label:"Smoothness",min:.01,max:2,step:.01,default:.5}],glsl:e=>`
${e.indent}float h = clamp(0.5 + 0.5 * (${e.in2}_d - ${e.varName}_d) / ${e.getParam("k")}, 0.0, 1.0);
${e.indent}${e.varName}_d = mix(${e.in2}_d, ${e.varName}_d, h) - ${e.getParam("k")} * h * (1.0 - h);
${e.indent}${e.varName}_p = mix(${e.in2}_p, ${e.varName}_p, h);
${e.indent}${e.varName}_dr = mix(${e.in2}_dr, ${e.varName}_dr, h);
`});q.register({id:"Mix",label:"Mix (Lerp)",category:"Combiners (CSG)",description:"Linear interpolation between shapes.",inputs:[{id:"factor",label:"Factor",min:0,max:1,step:.01,default:.5}],glsl:e=>`
${e.indent}${e.varName}_d = mix(${e.varName}_d, ${e.in2}_d, ${e.getParam("factor")});
${e.indent}${e.varName}_p = mix(${e.varName}_p, ${e.in2}_p, ${e.getParam("factor")});
${e.indent}${e.varName}_dr = mix(${e.varName}_dr, ${e.in2}_dr, ${e.getParam("factor")});
`});q.register({id:"Custom",label:"Custom (Legacy)",category:"Utils",description:"Legacy node.",inputs:[],glsl:e=>""});const xr=e=>{const o=new Map;return e.forEach(t=>{o.has(t.target)||o.set(t.target,[]),o.get(t.target).push(t)}),o},Sr=e=>{const o=new Set,t=["root-end"],a=new Set;for(;t.length>0;){const r=t.pop();a.has(r)||(a.add(r),r!=="root-end"&&r!=="root-start"&&o.add(r),(e.get(r)??[]).forEach(i=>t.push(i.source)))}return o},wr=(e,o)=>{const t=xr(o),a=Sr(t),r=e.filter(u=>a.has(u.id));if(!r||r.length===0)return`
        void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
            z.xyz += c.xyz;
            float r = length(z.xyz);
            trap = min(trap, r);
        }
        `;let i=`
    // --- Graph Init ---
    vec3 v_start_p = z.xyz;
    float v_start_d = 1000.0;
    float v_start_dr = dr; 
    
    vec3 v_curr_p = v_start_p;
    float v_curr_d = v_start_d;
    float v_curr_dr = v_start_dr;
    `;const n=new Map;n.set("root-start","v_start");let l=0;r.forEach((u,h)=>{const p=`v_${u.id.replace(/[^a-zA-Z0-9]/g,"")}`;n.set(u.id,p);const m=t.get(u.id)??[],b=m.find(w=>!w.targetHandle||w.targetHandle==="a"),g=m.find(w=>w.targetHandle==="b"),y=b&&n.get(b.source)||"v_start",v=g&&n.get(g.source)||"v_start";if(i+=`    // Node: ${u.type} (${u.id})
`,i+=`    vec3 ${p}_p = ${y}_p;
`,i+=`    float ${p}_d = ${y}_d;
`,i+=`    float ${p}_dr = ${y}_dr;
`,u.enabled){const w=q.get(u.type);if(w){const k=u.condition&&u.condition.active;let S="    ";if(k){const P=l<Ge?`uModularParams[${l++}]`:"2.0",T=l<Ge?`uModularParams[${l++}]`:"0.0";i+=`    { int ${p}_cmod = max(1, int(${P})); int ${p}_crem = int(${T});
`,i+=`    if ( (i - (i/${p}_cmod)*${p}_cmod) == ${p}_crem ) {
`,S="        "}const C=P=>u.bindings&&u.bindings[P]?`u${u.bindings[P]}`:l<Ge?`uModularParams[${l++}]`:"0.0";i+=w.glsl({varName:p,in1:y,in2:v,getParam:C,indent:S}),k&&(i+=`    }}
`)}}i+=`
`});const s=o.find(u=>u.target==="root-end");let c="v_start";return s&&s.source!=="root-start"&&(c=n.get(s.source)||"v_start"),i+=`
    z.xyz = ${c}_p;
    dr = ${c}_dr;
    
    float final_d = ${c}_d;
    if (final_d < 999.0 && final_d > -1.0) {
        distOverride = final_d;
    }
    
    trap = min(trap, length(z.xyz));
    `,`
void formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i) {
${i}
}
`},_r=e=>{let o="d = 0.5 * log(max(r, 1.0e-5)) * r / dr_safe;";return e<.5?o=`
        float logR2 = log2(m2);
        // 0.5 * ln(2) / 2 ≈ 0.17328679 — converts log2(r²) to 0.5*r*ln(r) for DE formula
        d = 0.17328679 * logR2 * r / dr_safe;
        `:e<1.5?o="d = (r - 1.0) / dr_safe;":e<2.5?o="d = r / dr_safe;":e<3.5?o=`
        float logR2 = log2(m2);
        // 0.5 * ln(2) ≈ 0.34657359 — converts log2(r²) to r*ln(r), then halved by dampening term
        d = 0.34657359 * logR2 * r / (dr_safe + 8.0);
        `:o="d = (r - 2.0) / dr_safe;",`
        vec2 getDist(float r, float dr, float iter, vec4 z) {
            float m2 = r * r;
            if (m2 < 1.0e-20) return vec2(0.0, iter);
            
            // Log Smoothing Calculation (Shared)
            // Guarded: Only calculate log smoothing if we have actually escaped (> 1.0)
            float smoothIter = iter;
            if (m2 > 1.0) {
                float threshLog = log2(max(uEscapeThresh, 1.1));
                smoothIter = iter + 1.0 - log2(log2(m2) / threshLog);
            }
            
            float d = 0.0;
            float dr_safe = max(abs(dr), 1.0e-20);
            
            ${o}
            
            return vec2(d, smoothIter);
        }`},Ir={id:"coreMath",shortId:"cm",name:"Formula Math",category:"Formulas",tabConfig:{label:"Formula",componentId:"panel-formula",order:10},extraUniforms:[{name:ue.ModularParams,type:"float",arraySize:Ge,default:new Float32Array(Ge),backingOnly:!0}],params:{iterations:{type:"float",default:16,label:"Iterations",shortId:"it",uniform:"uIterations",min:1,max:500,step:1,group:"main"},paramA:{type:"float",default:8,label:"Param A",shortId:"pa",uniform:"uParamA",min:-10,max:10,step:.001,group:"params"},paramB:{type:"float",default:0,label:"Param B",shortId:"pb",uniform:"uParamB",min:-10,max:10,step:.001,group:"params"},paramC:{type:"float",default:0,label:"Param C",shortId:"pc",uniform:"uParamC",min:-10,max:10,step:.001,group:"params"},paramD:{type:"float",default:0,label:"Param D",shortId:"pd",uniform:"uParamD",min:-10,max:10,step:.001,group:"params"},paramE:{type:"float",default:0,label:"Param E",shortId:"pe",uniform:"uParamE",min:-10,max:10,step:.001,group:"params"},paramF:{type:"float",default:0,label:"Param F",shortId:"pf",uniform:"uParamF",min:-10,max:10,step:.001,group:"params"},vec2A:{type:"vec2",default:{x:0,y:0},label:"Vec2 A",shortId:"v2a",uniform:"uVec2A",min:-10,max:10,step:.001,group:"params"},vec2B:{type:"vec2",default:{x:0,y:0},label:"Vec2 B",shortId:"v2b",uniform:"uVec2B",min:-10,max:10,step:.001,group:"params"},vec2C:{type:"vec2",default:{x:0,y:0},label:"Vec2 C",shortId:"v2c",uniform:"uVec2C",min:-10,max:10,step:.001,group:"params"},vec3A:{type:"vec3",default:new j(0,0,0),label:"Vec3 A",shortId:"v3a",uniform:"uVec3A",min:-10,max:10,step:.001,group:"params"},vec3B:{type:"vec3",default:new j(0,0,0),label:"Vec3 B",shortId:"v3b",uniform:"uVec3B",min:-10,max:10,step:.001,group:"params"},vec3C:{type:"vec3",default:new j(0,0,0),label:"Vec3 C",shortId:"v3c",uniform:"uVec3C",min:-10,max:10,step:.001,group:"params"},vec4A:{type:"vec4",default:new gt(0,0,0,0),label:"Vec4 A",shortId:"v4a",uniform:"uVec4A",min:-10,max:10,step:.001,group:"params"},vec4B:{type:"vec4",default:new gt(0,0,0,0),label:"Vec4 B",shortId:"v4b",uniform:"uVec4B",min:-10,max:10,step:.001,group:"params"},vec4C:{type:"vec4",default:new gt(0,0,0,0),label:"Vec4 C",shortId:"v4c",uniform:"uVec4C",min:-10,max:10,step:.001,group:"params"}},inject:(e,o)=>{var u;const t=o.formula,a=o.quality;t==="Modular"&&(e.addDefine("PIPELINE_REV",(o.pipelineRevision||0).toString()),e.addUniform(ue.ModularParams,"float",Ge));const r=fe.get(t);r!=null&&r.shader.selfContainedSDE&&e.addDefine("SKIP_PRE_BAILOUT","1");let i="",n="",l="";const s=(a==null?void 0:a.estimator)||0;let c=_r(s);if(t==="Modular"){const h=wr(o.pipeline||[],((u=o.graph)==null?void 0:u.edges)||[]);i+=h+`
`,n="formula_Modular(z, dr, trap, distOverride, c, i);",e.setDistOverride({init:"float distOverride = 1e10;",inLoopFull:"if (distOverride < 999.0) { escaped = true; break; }",inLoopGeom:"if (distOverride < 999.0) break;",postFull:"if (distOverride < 999.0) { finalD = distOverride; smoothIter = iter; }",postGeom:"if (distOverride < 999.0) finalD = distOverride;"})}else r&&(i+=r.shader.function+`
`,n=r.shader.loopBody,l=r.shader.loopInit||"",r.shader.preamble&&e.addPreamble(r.shader.preamble),r.shader.getDist&&(c=`vec2 getDist(float r, float dr, float iter, vec4 z) { ${r.shader.getDist} }`));e.addFunction(i),e.setFormula(n,l,c)}};let Cr=0;function qe(){return`l${++Cr}`}const Mr=(e,o)=>{if(!e)return`
        float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
        float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
        `;if(o===3)return`
// ------------------------------------------------------------------
// SHADOWS (Hard Only — Fastest)
// ------------------------------------------------------------------
float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    if (uShadowIntensity < 0.001) return 1.0;

    float t = 0.01;
    int limit = min(uShadowSteps, 128);

    for(int i = 0; i < 128; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);
        if(h < max(1.0e-5, t * 0.0005)) return 0.0;  // Distance-adaptive hit threshold (0.05% of ray distance)
        t += h;
        if(t > lightDist) return 1.0;
    }
    return 1.0;
}

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    return GetHardShadow(ro, rd, lightDist);
}
`;const t=256,a=o<1.5?`
        float t = 0.05;
        float fudge = 1.0;
    `:`
        float t = 0.0;
        float fudge = uFudgeFactor;
    `,r=o<1.5?`
            if(h < 0.005) return 0.0;
            res = min(res, k * h / t);
            t += max(h, 0.05);
    `:`
            float thresh = max(1.0e-6, t * 0.0001);
            if(h < thresh) return 0.0;
            res = min(res, k * h / max(t, 1.0e-5));
            t += h * fudge;
    `;return`
// ------------------------------------------------------------------
// SHADOWS (${o<1.5?"Lite Soft":"Robust Soft"})
// ------------------------------------------------------------------

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    if (uShadowIntensity < 0.001) return 1.0;

    float res = 1.0;

    ${a}

    // Jitter starting position to break banding
    t += noise * 0.01;

    int limit = uShadowSteps;

    for(int i = 0; i < ${t}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);
        ${r}
        if(t > lightDist) break;
    }
    return clamp(res, 0.0, 1.0);
}

float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    #if defined(DISABLE_SHADOWS) && DISABLE_SHADOWS == 1
        return 1.0;
    #endif

    float t = 0.0;
    float fudge = uFudgeFactor;
    int limit = uShadowSteps;

    for(int i = 0; i < ${t}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);

        float thresh = max(1.0e-6, t * 0.0002);

        if(h < thresh) return 0.0;

        t += h * fudge;

        if(t > lightDist) return 1.0;
    }

    return 1.0;
}
`},Ao=e=>`
vec3 calculatePBRContribution(vec3 p, vec3 n, vec3 v, vec3 albedo, float roughness, float metallic, float stochasticSeed, bool calcShadows) {
    vec3 Lo = vec3(0.0);

    float pixelSizeScale = uPixelSizeBase / uInternalScale;
    float biasAmount = uShadowBias + pixelSizeScale * 2.0;
    vec3 shadowRo = p + n * biasAmount;

    // COMPILER OPTIMIZATION: Prevent unrolling of light loop
    int lightCount = uLightCount;

    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= lightCount) break;

        float intensity = uLightIntensity[i];
        if (intensity < 0.01) continue;

        float type = uLightType[i];
        bool isDirectional = type > 0.5;

        vec3 lVec;
        float distToLight;

        if (isDirectional) {
             lVec = uLightDir[i]; // Already "toward light" from uniform manager
             distToLight = DIR_LIGHT_DIST;  // Directional: treat as infinitely far (> BOUNDING_RADIUS)
        } else {
             lVec = uLightPos[i] - p;
             distToLight = length(lVec);
             if (distToLight < 0.0001) continue;  // Skip degenerate (light inside surface)
        }

        vec3 l = isDirectional ? normalize(lVec) : lVec / distToLight;

        float NdotL = max(0.0, dot(n, l));
        if (NdotL <= 0.0) continue;

        float shadow = 1.0;
        if (calcShadows && uShadows > 0.5 && uLightShadows[i] > 0.5) {
            float s = 1.0;
${e?`
            bool useStochasticShadows = (uAreaLights > 0.5);
            if (useStochasticShadows) {
                 float samplingSeed = fract(stochasticSeed + float(i) * 1.618);

                 vec3 u, v;
                 buildTangentBasis(l, u, v);

                 float r_jitter = sqrt(samplingSeed);
                 float theta = samplingSeed * TAU * 1.618033;
                 float spread = 2.0 / max(uShadowSoftness, 0.1);

                 vec3 offset = (u * cos(theta) + v * sin(theta)) * r_jitter * spread;

                 vec3 jitteredLDir = normalize(l + offset);
                 float jitteredDist = distToLight;

                 if (!isDirectional) {
                      vec3 jitteredTarget = uLightPos[i] + offset * distToLight;
                      vec3 jVec = jitteredTarget - p;
                      jitteredDist = length(jVec);
                      jitteredLDir = jVec / jitteredDist;
                 }

                 s = GetHardShadow(shadowRo, jitteredLDir, jitteredDist);
            } else {
                 s = GetSoftShadow(shadowRo, l, uShadowSoftness, distToLight, stochasticSeed);
            }
`:`
                 s = GetSoftShadow(shadowRo, l, uShadowSoftness, distToLight, stochasticSeed);
`}
            shadow = mix(1.0, s, uShadowIntensity);
        }

        // Branchless attenuation: CPU packs coefficients into uLightFalloff (d² term) and uLightFalloffType (d term)
        // Quadratic: (k, 0) → 1/(1+k·d²)   Linear: (0, k) → 1/(1+k·d)   InvSq: (k_from_range, 0)
        float att = 1.0;
        if (!isDirectional && (uLightFalloff[i] + uLightFalloffType[i]) > 0.001) {
            float d2 = distToLight * distToLight;
            att = 1.0 / (1.0 + uLightFalloff[i] * d2 + uLightFalloffType[i] * distToLight);
        }

        vec3 radiance = uLightColor[i] * intensity * att * shadow;
`,Do=`
    }

    return Lo;
}
`,Rr=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Blinn-Phong)
// ------------------------------------------------------------------
${Ao(e)}
        // Blinn-Phong specular
        vec3 h = normalize(l + v);
        float NdotH = max(0.0, dot(n, h));
        float shininess = max(2.0, 2.0 / (roughness * roughness + 0.001) - 2.0);
        float spec = pow(NdotH, shininess) * (shininess + 2.0) / (8.0 * PI);
        vec3 specular = mix(vec3(1.0), albedo, metallic) * spec;

        float kD = (1.0 - metallic);
        Lo += (kD * albedo * uDiffuse / PI + specular * uSpecular) * radiance * NdotL;
${Do}
`,Pr=e=>`
// ------------------------------------------------------------------
// PBR HELPERS (Cook-Torrance GGX)
// ------------------------------------------------------------------
${Ao(e)}
        vec3 F0 = mix(vec3(0.04), albedo, metallic);
        float NdotV = max(0.001, dot(n, v));

        vec3 h = normalize(l + v);
        float HdotV = max(0.0, dot(h, v));
        float NdotH = max(0.0, dot(n, h));

        // Fresnel (Schlick)
        vec3 F = fresnelSchlick(HdotV, F0);

        // Distribution (GGX / Trowbridge-Reitz)
        float a = roughness * roughness;
        float a2 = a * a;
        float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
        float D = a2 / (PI * denom * denom + GGX_EPSILON);

        // Geometry (Smith-GGX)
        float kG = a * 0.5;
        float G1V = NdotV / (NdotV * (1.0 - kG) + kG);
        float G1L = NdotL / (NdotL * (1.0 - kG) + kG);
        float G = G1V * G1L;

        // Cook-Torrance specular BRDF
        vec3 specular = (D * F * G) / (4.0 * NdotV * NdotL + GGX_EPSILON);

        // Energy Conservation
        vec3 kS = F;
        vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);

        Lo += (kD * albedo * uDiffuse / PI + specular * uSpecular) * radiance * NdotL;
${Do}
`,Fo=`
void buildTangentBasis(vec3 n, out vec3 t, out vec3 b) {
    vec3 up = abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    t = normalize(cross(n, up));
    b = cross(n, t);
}
`,Lr=`
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
`,ro=Fo+Lr,Tr=`
#ifdef LIGHT_SPHERES
vec3 intersectLightSphere(vec3 ro, vec3 rd, float radiusJitter) {
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        if (uLightIntensity[i] < 0.01 || uLightType[i] > 0.5 || uLightRadius[i] < 0.001) continue;

        vec3 oc = ro - uLightPos[i];
        float distSq = dot(oc, oc);
        float r = uLightRadius[i] * (1.0 + radiusJitter);
        float soft = uLightSoftness[i];

        // Halo: soft > 1 extends test radius beyond sphere
        float testR = r * max(1.0, soft);

        // Inside sphere: tint view
        if (distSq < testR * testR) {
            float dist = sqrt(distSq);
            float fade = 1.0 - dist / testR;
            fade = fade * fade * (3.0 - 2.0 * fade);
            if (fade > 0.001) return vec3(fade, float(i), 1.0);
        }

        // Ray-sphere intersection — chord-based thickness for volumetric look
        float b = dot(rd, oc);
        if (-b < 0.001) continue;

        float c = distSq - testR * testR;
        float disc = b * b - c;
        if (disc > 0.0) {
            // thickness: 0 at edge, 1 at center — gives natural 3D sphere falloff
            float thickness = sqrt(disc) / testR;

            // soft 0: solid orb, sharp edge (low exponent flattens brightness)
            // soft 1: gentle gradient, center-to-edge
            // soft 2: concentrated core, extended glow
            float fade = pow(thickness, 0.15 + soft * 1.4);

            // Energy conservation: as halo expands beyond r, dim proportionally
            // so it reads as "softer" not "bigger". r/testR = 1 when soft<=1.
            fade *= min(1.0, r / testR);

            if (fade > 0.001) return vec3(fade, float(i), 0.0);
        }
    }
    return vec3(0.0, -1.0, 0.0);
}
#endif
`,Er=`
#ifdef LIGHT_SPHERES
{
    vec3 _lsHit = intersectLightSphere(ro, rd, 0.0);
    if (_lsHit.x > 0.0) {
        int _li = int(_lsHit.y);
        vec3 _lc = uLightColor[_li] * uLightIntensity[_li];
        env = mix(env, _lc, _lsHit.x);
    }
}
#endif
`,kr=()=>`
#ifdef LIGHT_SPHERES
void compositeLightSpheres(vec3 ro, vec3 rd, inout vec3 col, inout float d, bool hit, float seed) {
    // Stochastic radius jitter: +-2% per frame, accumulation averages into smooth AA edges.
    // Disabled during navigation (uBlendFactor >= 0.99) for a clean image.
    float radiusJitter = uBlendFactor >= 0.99 ? 0.0 : (fract(seed * 91.3) - 0.5) * 0.04;

    vec3 lsHit = intersectLightSphere(ro, rd, radiusJitter);
    if (lsHit.x > 0.001) {
        int li = int(lsHit.y);
        vec3 lc = uLightColor[li] * uLightIntensity[li];

        if (lsHit.z > 0.5) {
            // Inside sphere: tint the entire view like a glowing fog volume
            col = mix(col, lc, lsHit.x * 0.6);
        } else {
            // Outside: depth-test against fractal surface
            vec3 oc = ro - uLightPos[li];
            float b = dot(rd, oc);
            float r = uLightRadius[li] * (1.0 + radiusJitter);
            float disc = r * r - (dot(oc, oc) - b * b);
            float lightD = disc > 0.0 ? max(0.001, -b - sqrt(disc)) : max(0.001, -b);

            if (!hit || lightD < d) {
                col = mix(col, lc, lsHit.x);
                d = lightD;
            }
        }
    }
}
#endif
`,zr=(e,o,t=!0)=>`
// ------------------------------------------------------------------
// MONTE CARLO PBR PATH TRACER
// ------------------------------------------------------------------

float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 cosineSampleHemisphere(vec3 n, vec2 seedVec) {
    float r = fract(seedVec.x * phi);
    float angle = seedVec.y * TAU;
    vec2 p = vec2(sqrt(r) * cos(angle), sqrt(r) * sin(angle));
    vec3 t, b;
    buildTangentBasis(n, t, b);
    float rz = sqrt(max(0.0, 1.0 - dot(p, p)));
    return normalize(t * p.x + b * p.y + n * rz);
}

vec3 importanceSampleGGX(vec3 n, float roughness, vec2 seedVec) {
    vec2 xi = vec2(
        fract(seedVec.x * phi),
        fract(seedVec.y * phi + 0.5)
    );
    float a = roughness * roughness;
    float azimuth = TAU * xi.x;
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a*a - 1.0) * xi.y));
    float sinTheta = sqrt(max(0.0, 1.0 - cosTheta*cosTheta));
    vec3 h = vec3(cos(azimuth) * sinTheta, sin(azimuth) * sinTheta, cosTheta);
    vec3 t, b;
    buildTangentBasis(n, t, b);
    return normalize(t * h.x + b * h.y + n * h.z);
}

vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) {
    vec3 radiance = vec3(0.0);
    vec3 throughput = vec3(1.0);
    vec3 currentRo = ro;
    vec3 currentRd = rd;
    float d = d_init;
    vec4 result = result_init;
    bool hit = true;
    int maxBounces = uPTBounces;
    float pixelSizeScale = uPixelSizeBase / uInternalScale;

    for (int bounce = 0; bounce < 8; bounce++) {
        if (bounce >= ${e?"2":"maxBounces"}) break;

        // Coprime decorrelation: irrational constants shift the blue noise texture lookup by a different
        // amount each bounce, ensuring samples from different bounces land on uncorrelated texels.
        // 17.123 and 23.456 are mutually irrational (no integer ratio) — same principle as Halton sequences.
        // 7.31 / 11.17 used for secondary env noise lookup below (also mutually irrational).
        vec2 bounceOffset = vec2(float(bounce) * 17.123, float(bounce) * 23.456);
        vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset);

        if (!hit) {
            float skyIntensity = (bounce == 0) ? uEnvBackgroundStrength : uEnvStrength;
            vec3 env = sampleMiss(currentRo, currentRd, 0.0) * skyIntensity;
            if (bounce == 0 && uFogFar < 1000.0) {
                float fogFactor = smoothstep(uFogNear, uFogFar, uFogFar * 0.95);
                env = mix(env, uFogColorLinear, fogFactor * 0.5);
            }
            radiance += env * throughput;
            break;
        }

        vec3 p_ray = currentRo + currentRd * d;
        vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
        vec3 albedo, n, emission;
        float roughness;
        getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, bounce == 0);

        float ao = 1.0;
        if (uAOIntensity > 0.01 && bounce == 0) {
            ao = GetAO(p_ray, n, seed + float(bounce) * 13.37);
        }

        if (bounce == 0 && uRim > 0.01) {
            float NdotV_rim = max(0.0, dot(n, -currentRd));
            float rimFactor = pow(1.0 - NdotV_rim, uRimExponent) * uRim;
            emission += uRimColor * rimFactor;
        }

        roughness = max(roughness, 0.04);  // Minimum roughness — prevents NaN in GGX distribution denominator
        float emissionMult = (bounce == 0) ? 1.0 : uPTEmissionMult;
        radiance += (emission * ao * emissionMult) * throughput;

        // --- Shared state for NEE and bounce selection ---
        vec3 viewDir = -currentRd;
        float NdotV = max(0.001, dot(n, viewDir));
        vec3 F0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);  // 0.04 = standard dielectric F0 (4% reflectance at normal incidence)
        vec3 F_surface = fresnelSchlick(NdotV, F0);

        // Schlick-GGX geometry term parameters (shared by NEE and IS weight)
        float a_ggx = roughness * roughness;
        float kG = a_ggx * 0.5;

        // --- NEXT EVENT ESTIMATION ---
        // Active light list — hoisted so PT_VOLUMETRIC can reuse it
        int activeCount = 0;
        int activeIndices[3];
        if (uLightIntensity[0] > 0.01) activeIndices[activeCount++] = 0;
        if (uLightIntensity[1] > 0.01) activeIndices[activeCount++] = 1;
        if (uLightIntensity[2] > 0.01) activeIndices[activeCount++] = 2;

        // Bias epsilon — hoisted so PT_ENV_NEE can reuse it
        // Use camera-to-point distance for pixel footprint (not bounce travel distance).
        // Bounce rays that hit nearby geometry have small d, which would collapse the bias
        // and cause self-intersection on the next bounce. p_ray is in camera-local space,
        // so length(p_ray) gives the true camera distance for correct pixel footprint scaling.
        float cameraDist = length(p_ray);
        float distFromFractalOrigin = length(p_fractal);
        float floatLimitNEE = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);
        float orthoPixelFootprintNEE = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * cameraDist;
        float visualLimitNEE = orthoPixelFootprintNEE * (1.0 / uDetail);
        float biasEps = max(floatLimitNEE, visualLimitNEE);

        if (activeCount > 0) {
            float lightSeed = blueNoise.r;
            int pick = clamp(int(lightSeed * float(activeCount)), 0, activeCount - 1);

            // PT_NEE_ALL_LIGHTS: evaluate every active light per bounce.
            // Default: sample one random light with PDF compensation (unbiased, faster).
            int neeCount = 1;
            #ifdef PT_NEE_ALL_LIGHTS
                neeCount = activeCount;
            #endif

            for (int nee_i = 0; nee_i < 3; nee_i++) {
                if (nee_i >= neeCount) break;

                int lightIdx;
                #ifdef PT_NEE_ALL_LIGHTS
                    lightIdx = activeIndices[nee_i];
                #else
                    lightIdx = activeIndices[pick];
                #endif

                bool isDirectional = uLightType[lightIdx] > 0.5;
                vec3 shadowRo = p_ray + n * (biasEps * 2.0 + uShadowBias);

                vec3 lVec;
                float distToLight;
                if (isDirectional) {
                    lVec = uLightDir[lightIdx]; // Already "toward light" from uniform manager
                    distToLight = DIR_LIGHT_DIST;
                } else {
                    lVec = uLightPos[lightIdx] - p_ray;
                    distToLight = length(lVec);
                }

                vec3 lDir = isDirectional ? normalize(lVec) : lVec / max(1.0e-5, distToLight);

                float shadow = 1.0;
                if (uShadows > 0.5 && uLightShadows[lightIdx] > 0.5) {
                    ${!t||e?`
        shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
    `:`
        if (uAreaLights > 0.5) {
            vec2 jitter = blueNoise.gb;
            vec3 sT, sB;
            buildTangentBasis(lDir, sT, sB);

            float spread = 2.0 / max(uShadowSoftness, 0.1);
            float r = sqrt(jitter.x) * spread;
            float theta = jitter.y * TAU;

            vec3 offsetDir = sT * cos(theta) * r + sB * sin(theta) * r;
            vec3 shadowDir = normalize(lDir + offsetDir);
            float shadowDist = distToLight;

            if (!isDirectional) {
                 float radius = spread * distToLight;
                 vec3 jitterOffset = (sT * cos(theta) + sB * sin(theta)) * sqrt(jitter.x) * radius;
                 vec3 targetPos = uLightPos[lightIdx] + jitterOffset;
                 vec3 tVec = targetPos - p_ray;
                 shadowDist = length(tVec);
                 shadowDir = tVec / max(1.0e-5, shadowDist);
            }

            shadow = GetHardShadow(shadowRo, shadowDir, shadowDist);
        } else {
            shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
        }
    `}
                    shadow = mix(1.0, shadow, uShadowIntensity);
                }

                if (shadow > 0.01) {
                    vec3 h = normalize(lDir + viewDir);
                    float ndotl = max(0.0, dot(n, lDir));
                    float hdotv = max(0.0, dot(h, viewDir));
                    float ndoth = max(0.0, dot(n, h));

                    // Branchless attenuation (see pbr.ts LOOP_OPEN)
                    float att = 1.0;
                    if (!isDirectional && (uLightFalloff[lightIdx] + uLightFalloffType[lightIdx]) > 0.001) {
                        float d2_att = distToLight * distToLight;
                        att = 1.0 / (1.0 + uLightFalloff[lightIdx] * d2_att + uLightFalloffType[lightIdx] * distToLight);
                    }

                    vec3 F_nee = fresnelSchlick(hdotv, F0);

                    // GGX Cook-Torrance specular (Schlick-GGX geometry, matches pbr.ts)
                    float ndotl_s = max(0.001, ndotl);
                    float a2_nee = a_ggx * a_ggx;
                    float denom_nee = ndoth * ndoth * (a2_nee - 1.0) + 1.0;
                    float D_nee = a2_nee / (PI * denom_nee * denom_nee + GGX_EPSILON);
                    float G1V_nee = NdotV / (NdotV * (1.0 - kG) + kG);
                    float G1L_nee = ndotl_s / (ndotl_s * (1.0 - kG) + kG);
                    float G_nee = G1V_nee * G1L_nee;
                    vec3 spec = (D_nee * F_nee * G_nee) / max(0.001, 4.0 * NdotV * ndotl_s);

                    vec3 kS_nee = F_nee;
                    vec3 kD_nee = (vec3(1.0) - kS_nee) * (1.0 - uReflection);

                    // PDF: 1 when sampling all lights, activeCount when sampling 1 randomly
                    float pdf;
                    #ifdef PT_NEE_ALL_LIGHTS
                        pdf = 1.0;
                    #else
                        pdf = float(activeCount);
                    #endif

                    vec3 directContrib = (kD_nee * albedo * uDiffuse / PI + spec) * uLightColor[lightIdx] * uLightIntensity[lightIdx] * ndotl * shadow * att * ao * pdf;

                    // Firefly clamp: suppress outlier samples (runtime, raise uPTMaxLuminance to disable)
                    float dcLum = luminance(directContrib);
                    directContrib *= min(1.0, uPTMaxLuminance / max(dcLum, 0.001));

                    radiance += directContrib * throughput;
                }
            }
        } // End NEE

        // --- ENVIRONMENT NEE (compile switch) ---
        // Directly samples the env map as a diffuse light source each bounce.
        // Eliminates the need for a bounce to "accidentally" escape to sky.
        #ifdef PT_ENV_NEE
        if (uEnvStrength > 0.001) {
            vec4 envNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset + vec2(7.31, 11.17));
            vec3 envDir = cosineSampleHemisphere(n, envNoise.rg);
            float envNdotL = max(0.0, dot(n, envDir));
            if (envNdotL > 0.001) {
                vec3 envOrigin = p_ray + n * (biasEps * 2.0);
                float envD; vec4 envResult; vec3 envGlow = vec3(0.0); float envVol = 0.0; vec3 envScatter = vec3(0.0);
                bool envHit = traceSceneLean(envOrigin, envDir, envD, envResult, envGlow, seed + float(bounce) * 5.31, envVol, envScatter);
                if (!envHit) {
                    // Cosine-weighted PDF = NdotL/PI cancels with Lambertian BRDF = kD*albedo/PI
                    // → weight = kD * albedo (clean, no NdotL needed)
                    vec3 envF = fresnelSchlick(envNdotL, F0);
                    vec3 envKD = (vec3(1.0) - envF) * (1.0 - uReflection);
                    vec3 envColor = GetEnvMap(envDir, 0.0) * uEnvStrength;
                    radiance += envKD * albedo * uDiffuse * envColor * throughput;
                }
            }
        }
        #endif

        // --- BOUNCE DIRECTION SELECTION ---
        vec3 kS = F_surface;
        vec3 kD = (vec3(1.0) - kS) * (1.0 - uReflection);
        vec3 weightSpec = kS;
        vec3 weightDiff = kD * albedo * uDiffuse;
        float lumSpec = luminance(weightSpec);
        float lumDiff = luminance(weightDiff);
        float probSpec = lumSpec / max(0.0001, lumSpec + lumDiff);
        float smoothness = 1.0 - roughness;
        probSpec = mix(probSpec, 1.0, smoothness * 0.4);  // Bias smooth surfaces toward specular bounces
        probSpec = clamp(probSpec, 0.05, 0.95);  // Ensure both bounce types always have non-zero probability
        float randType = fract(blueNoise.a * 1.618);  // Golden ratio decorrelation for bounce type selection
        vec2 dirSeed = blueNoise.gb;

        if (randType < probSpec) {
            vec3 H = importanceSampleGGX(n, roughness, dirSeed);
            vec3 newDir = reflect(currentRd, H);
            // GGX IS weight: BRDF/PDF ≈ F * G * HdotV / (NdotV * NdotH)
            float HdotV_sp = max(0.001, dot(H, -currentRd));
            float NdotH_sp = max(0.001, dot(n, H));
            float NdotL_sp = max(0.001, dot(n, newDir));
            float NdotV_sp = max(0.001, NdotV);
            // Schlick-GGX geometry (matches NEE and pbr.ts)
            float G1L_sp = NdotL_sp / (NdotL_sp * (1.0 - kG) + kG);
            float G1V_sp = NdotV_sp / (NdotV_sp * (1.0 - kG) + kG);
            currentRd = newDir;
            throughput *= F_surface * G1L_sp * G1V_sp * HdotV_sp / (NdotV_sp * NdotH_sp) / probSpec;
            if (dot(currentRd, n) < 0.0) currentRd = cosineSampleHemisphere(n, dirSeed);
        } else {
            currentRd = cosineSampleHemisphere(n, dirSeed);
            throughput *= weightDiff / (1.0 - probSpec);
        }

        throughput *= uPTGIStrength;
        currentRo = p_ray + n * (biasEps * 2.0);
        float bounceVol = 0.0;
        vec3 bounceGlow = vec3(0.0);
        vec3 bounceScatter = vec3(0.0);
        hit = traceSceneLean(currentRo, currentRd, d, result, bounceGlow, seed + float(bounce), bounceVol, bounceScatter);

        // Absorption-only fog on bounce paths (Beer-Lambert with actual march distance).
        // Primary-ray scatter (god rays) is accumulated in traceScene on the camera ray.
        if (uFogDensity > 0.001) {
            float trans = exp(-uFogDensity * d);
            radiance += uFogColorLinear * (1.0 - trans) * throughput;
            throughput *= trans;
        }

        // Russian roulette termination (decorrelated from bounce type selection)
        // Start after bounce 2 to guarantee primary + 1st indirect are always evaluated
        if (bounce > 2) {
            float maxThroughput = max(throughput.r, max(throughput.g, throughput.b));
            if (maxThroughput < 0.05) {  // Below 5% contribution — candidate for termination
                // Use a separate noise sample for termination to avoid correlation with randType
                float rrRand = fract(blueNoise.r * 1.618 + 0.7);  // 1.618 = golden ratio decorrelation
                float survivalProb = maxThroughput * 10.0;  // Scale: 5% throughput → 50% survival
                if (rrRand > survivalProb) break;
                throughput /= survivalProb;  // Energy-conserving boost for surviving paths
            }
        }
        throughput = min(throughput, vec3(4.0));  // Firefly suppression clamp
    }
    return radiance;
}
`;function io(e){let o=!1;const t=e.map(a=>a.id?a:(o=!0,{...a,id:qe()}));return o?t:e}const kn=(e,o)=>!e||!e.lights||o>=e.lights.length?{id:"",type:"Point",position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:0,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,range:0,intensityUnit:"raw"}:e.lights[o],Ar=[{id:qe(),type:"Point",position:{x:-2,y:1,z:2},rotation:{x:0,y:0,z:0},color:"#fff4e6",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:5500},{id:qe(),type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:3500},{id:qe(),type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#E0EEFF",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0,radius:0,softness:0,useTemperature:!0,temperature:7500}],Dr={id:"lighting",shortId:"l",name:"Lighting",category:"Rendering",tabConfig:{label:"Light",componentId:"panel-light",order:30,condition:{param:"$advancedMode",bool:!0}},viewportConfig:{componentId:"overlay-lighting",renderOrder:50,type:"dom"},engineConfig:{toggleParam:"advancedLighting",mode:"compile",label:"Lighting Engine",groupFilter:"engine_settings"},extraUniforms:[{name:ue.LightCount,type:"int",default:0},{name:ue.LightType,type:"float",arraySize:K,default:new Float32Array(K).fill(0)},{name:ue.LightPos,type:"vec3",arraySize:K,default:new Array(K).fill(new j)},{name:ue.LightDir,type:"vec3",arraySize:K,default:new Array(K).fill(new j(0,-1,0))},{name:ue.LightColor,type:"vec3",arraySize:K,default:new Array(K).fill(new le(1,1,1))},{name:ue.LightIntensity,type:"float",arraySize:K,default:new Float32Array(K).fill(0)},{name:ue.LightShadows,type:"float",arraySize:K,default:new Float32Array(K).fill(0)},{name:ue.LightFalloff,type:"float",arraySize:K,default:new Float32Array(K).fill(0)},{name:ue.LightFalloffType,type:"float",arraySize:K,default:new Float32Array(K).fill(0)},{name:ue.LightRadius,type:"float",arraySize:K,default:new Float32Array(K).fill(0)},{name:ue.LightSoftness,type:"float",arraySize:K,default:new Float32Array(K).fill(0)}],params:{advancedLighting:{type:"boolean",default:!0,label:"Light Engine",shortId:"le",group:"main",noReset:!0,hidden:!0,onUpdate:"compile",description:"Master switch for lighting logic. Disabling provides stubs only."},ptEnabled:{type:"boolean",default:!0,label:"Path Tracing Core",shortId:"pe",group:"engine_settings",ui:"checkbox",description:"Compiles the Path Tracing module. Disable to reduce shader size.",onUpdate:"compile",noReset:!0,estCompileMs:1500},renderMode:{type:"float",default:0,label:"Active Mode",shortId:"rm",group:"engine_settings",parentId:"ptEnabled",options:[{label:"Direct (Fast)",value:0},{label:"Path Tracing (GI)",value:1}],description:"Switches between fast direct lighting and physically based Global Illumination.",onUpdate:"compile",noReset:!0},ptBounces:{type:"int",default:3,label:"Max Bounces",shortId:"pb",uniform:"uPTBounces",min:1,max:8,step:1,group:"engine_settings",parentId:"ptEnabled",ui:"numeric",description:"Recursion depth. Higher = Brighter interiors, Slower render."},ptGIStrength:{type:"float",default:1,label:"GI Strength",shortId:"pg",uniform:"uPTGIStrength",min:0,max:5,step:.01,group:"engine_settings",parentId:"ptEnabled",description:"Artistic boost for bounced light intensity."},specularModel:{type:"float",default:0,label:"Specular Model",shortId:"sm",group:"engine_settings",options:[{label:"Blinn-Phong (Fast)",value:0,estCompileMs:0},{label:"Cook-Torrance (Quality)",value:1,estCompileMs:400}],description:"BRDF model for direct lighting. Cook-Torrance is physically accurate but increases shader compile time.",onUpdate:"compile",noReset:!0},shadowsCompile:{type:"boolean",default:!0,label:"Shadow Engine",shortId:"sc",group:"engine_settings",ui:"checkbox",noReset:!0,onUpdate:"compile",description:"Compiles the shadow raymarching loop. Disable to save ~5s compile time.",estCompileMs:1500},shadowAlgorithm:{type:"float",default:0,label:"Shadow Quality",shortId:"sa",group:"engine_settings",parentId:"shadowsCompile",options:[{label:"Hard Only (Fastest)",value:2,estCompileMs:500},{label:"Lite Soft (Fast)",value:1,estCompileMs:1500},{label:"Robust Soft (Quality)",value:0,estCompileMs:3e3}],description:"Shadow algorithm. Hard = binary occlusion, Lite = fast penumbra, Robust = accurate penumbra.",onUpdate:"compile",noReset:!0},ptStochasticShadows:{type:"boolean",default:!0,label:"Area Lights",shortId:"ps",group:"engine_settings",parentId:"shadowsCompile",ui:"checkbox",onUpdate:"compile",noReset:!0,estCompileMs:800,description:"Compiles stochastic area light shadow code. Creates realistic penumbras via accumulation."},ptNEEAllLights:{type:"boolean",default:!1,label:"Sample All Lights",shortId:"pal",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Evaluates every active light per bounce instead of one random light. Reduces shadow noise at the cost of N× more shadow rays."},ptEnvNEE:{type:"boolean",default:!1,label:"Environment NEE",shortId:"pen",group:"engine_settings",parentId:"ptEnabled",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Directly samples the environment as a light source each bounce. Large noise reduction for sky-lit scenes at the cost of one extra trace per bounce."},ptMaxLuminance:{type:"float",default:10,label:"Firefly Clamp",shortId:"pfl",uniform:"uPTMaxLuminance",min:.5,max:200,step:.5,scale:"log",group:"engine_settings",parentId:"ptEnabled",description:"Clamps per-sample luminance to suppress bright firefly spikes. Lower = cleaner but slightly biased. Raise to effectively disable."},shadows:{type:"boolean",default:!0,label:"Enable",shortId:"sh",group:"main",uniform:"uShadows",ui:"checkbox",condition:{param:"shadowsCompile",bool:!0}},areaLights:{type:"boolean",default:!1,label:"Area Lights",shortId:"al",uniform:"uAreaLights",group:"shadows",hidden:!0,condition:{param:"ptStochasticShadows",bool:!0},description:"Stochastic area light shadows. Disable for sharp analytical shadows."},shadowIntensity:{type:"float",default:1,label:"Opacity",shortId:"si",uniform:"uShadowIntensity",min:0,max:1,step:.01,group:"shadows",condition:{bool:!0}},shadowSoftness:{type:"float",default:16,label:"Hardness",shortId:"ss",uniform:"uShadowSoftness",min:2,max:2e3,step:1,group:"shadows",scale:"log",condition:{bool:!0}},shadowSteps:{type:"int",default:128,label:"Steps",shortId:"st",min:16,max:512,step:16,group:"shadows",condition:{bool:!0},uniform:"uShadowSteps",ui:"numeric",description:"Quality vs Performance."},shadowBias:{type:"float",default:.002,label:"Bias",shortId:"sb",uniform:"uShadowBias",min:0,max:1,step:1e-6,group:"shadows",scale:"log",condition:{bool:!0},description:"Too low: acne. Too high: detached."},lights:{type:"complex",default:Ar,label:"Light List",shortId:"ll",group:"data",hidden:!0,noReset:!0}},inject:(e,o,t)=>{if(t!=="Main"){e.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) { return vec3(0.0); }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) { return vec3(0.0); }
             `);return}e.addDefine("MAX_LIGHTS",K.toString());const a=o.lighting;if(a&&!a.advancedLighting){e.addDefine("MAX_LIGHTS","0"),e.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) {
                 vec3 p = ro + rd * d;
                 vec3 p_fractal = p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
                 float eps = max(d * 0.001, 1e-6);
                 vec2 e = vec2(eps, 0.0);
                 vec3 n = normalize(vec3(
                     DE_Dist(p + e.xyy),
                     DE_Dist(p + e.yxy),
                     DE_Dist(p + e.yyx)
                 ));

                 // Layer 1 gradient color (same as full shader)
                 float val1 = getMappingValue(uColorMode, p_fractal, result, n, uColorScale);
                 float t1Raw = val1 * uColorScale + uColorOffset;
                 float t1 = pow(abs(fract(mod(t1Raw, 1.0))), uGradientBias);
                 vec3 albedo = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;

                 // Simple N·L + ambient
                 float NdotL = max(dot(n, normalize(vec3(-0.5, 1.0, 0.8))), 0.0);
                 float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * 0.08;
                 float light = 0.03 + NdotL * 0.3 + rim;
                 return albedo * light;
             }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) {
                 return calculateShading(ro, rd, d_init, result_init, seed);
             }
             `);return}const r=(a==null?void 0:a.shadowsCompile)!==!1,i=(a==null?void 0:a.shadowAlgorithm)??0,n=i===2?3:i===1?1:2;e.addPostDEFunction(Mr(r,n)),!r&&!(a!=null&&a.shadows)?e.addDefine("DISABLE_SHADOWS","1"):e.addDefine("SHADOW_QUALITY","2"),(a==null?void 0:a.ptEnabled)!==!1&&(e.addDefine("PT_ENABLED","1"),a!=null&&a.ptNEEAllLights&&e.addDefine("PT_NEE_ALL_LIGHTS","1"),a!=null&&a.ptEnvNEE&&e.addDefine("PT_ENV_NEE","1"));const l=(a==null?void 0:a.ptStochasticShadows)===!0&&r,s=o.renderMode==="PathTracing"||(a==null?void 0:a.renderMode)===1,c=o.quality,u=(c==null?void 0:c.precisionMode)===1;if(s)e.addIntegrator(ro),e.setRenderMode("PathTracing"),e.addDefine("RENDER_MODE_PATHTRACING","1"),e.addIntegrator(zr(u,K,l));else{const h=(a==null?void 0:a.specularModel)===1;e.addIntegrator(h?ro:Fo),e.setRenderMode("Direct"),e.addIntegrator(h?Pr(l):Rr(l)),e.requestShading()}},actions:{updateLight:(e,o)=>{const{index:t,params:a}=o;if(!e.lights||t>=e.lights.length)return{};const r=[...e.lights];return r[t]={...r[t],...a},{lights:r}},addLight:e=>{if(e.lights.length>=K)return{};const o={id:qe(),type:"Point",position:{x:0,y:0,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,radius:0,range:0,intensityUnit:"raw"};return{lights:[...e.lights,o]}},removeLight:(e,o)=>{if(o<0||o>=e.lights.length)return{};const t=[...e.lights];return t.splice(o,1),{lights:t}},duplicateLight:(e,o)=>{if(o<0||o>=e.lights.length||e.lights.length>=K)return{};const t={...e.lights[o],id:qe()},a=[...e.lights];return a.splice(o+1,0,t),{lights:a}}}},Fr={id:"lightSpheres",shortId:"ls",name:"Light Spheres",category:"Rendering",dependsOn:["lighting"],engineConfig:{toggleParam:"lightSpheres",mode:"compile",label:"Light Spheres",groupFilter:"engine_settings"},params:{lightSpheres:{type:"boolean",default:!0,label:"Light Spheres",shortId:"lsp",group:"engine_settings",ui:"checkbox",onUpdate:"compile",noReset:!0,description:"Compiles visible emitter sphere rendering for point lights with radius > 0.",estCompileMs:150}},inject:(e,o,t)=>{if(t!=="Main")return;const a=o.lightSpheres;!a||a.lightSpheres===!1||(e.addDefine("LIGHT_SPHERES","1"),e.addPostDEFunction(Tr),e.addIntegrator(kr()),e.addMissLogic(Er),e.addCompositeLogic("compositeLightSpheres(ro, rd, col, d, hit, stochasticSeed);"))}},Or={id:"optics",shortId:"o",name:"Camera Optics",category:"Scene",tabConfig:{label:"Scene",componentId:"panel-scene",order:20},customUI:[{componentId:"optics-controls",group:"projection",parentId:"camType",condition:{eq:0}},{componentId:"optics-dof-controls",group:"dof",parentId:"dofStrength",condition:{gt:0}}],params:{camType:{type:"float",default:0,label:"Projection",shortId:"ct",uniform:"uCamType",group:"projection",options:[{label:"Perspective",value:0},{label:"Orthographic",value:1},{label:"360° Skybox",value:2}]},camFov:{type:"float",default:60,label:"Field of View",shortId:"fv",min:10,max:150,step:1,group:"projection",hidden:!0,condition:{param:"camType",eq:0}},orthoScale:{type:"float",default:2,label:"Ortho Scale",shortId:"os",min:.1,max:10,step:.1,scale:"log",group:"projection",parentId:"camType",condition:{param:"camType",eq:1}},dofStrength:{type:"float",default:0,label:"Camera Blur",shortId:"ds",uniform:"uDOFStrength",min:0,max:1,step:1e-4,scale:"log",group:"dof",format:e=>e===0?"0.0 (off)":Math.abs(e)<.001?e.toFixed(5):Math.abs(e)<10?e.toFixed(4):e.toFixed(2)},dofFocus:{type:"float",default:10,label:"Focus Distance",shortId:"df",uniform:"uDOFFocus",min:1e-6,max:1e4,step:1e-6,scale:"log",group:"dof",parentId:"dofStrength",condition:{gt:0}}}},jr={id:"navigation",shortId:"n",name:"Navigation",category:"Scene",customUI:[{componentId:"navigation-controls",group:"controls"}],params:{flySpeed:{type:"float",default:.5,label:"Fly Speed %",shortId:"fs",min:.001,max:1,step:.001,group:"movement",format:e=>`${(e*100).toFixed(1)}%`},autoSlow:{type:"boolean",default:!0,label:"Auto-slow on collision",shortId:"as",group:"movement"}}},Nr={id:"audio",shortId:"au",name:"Audio",category:"Audio",tabConfig:{label:"Audio",componentId:"panel-audio",order:70,condition:{param:"isEnabled",bool:!0}},menuConfig:{label:"Audio Modulation",toggleParam:"isEnabled"},params:{isEnabled:{type:"boolean",default:!1,label:"Enable Audio Engine",shortId:"en",group:"system",noReset:!0},smoothing:{type:"float",default:.8,label:"FFT Smoothing",shortId:"sm",group:"system",noReset:!0,min:0,max:.99,step:.01},threshold:{type:"float",default:.1,label:"Gate Threshold",shortId:"gt",group:"hidden",hidden:!0,noReset:!0},agcEnabled:{type:"boolean",default:!1,label:"AGC",shortId:"ag",group:"hidden",hidden:!0,noReset:!0},attack:{type:"float",default:.1,label:"Global Attack",shortId:"ga",group:"hidden",hidden:!0,noReset:!0},decay:{type:"float",default:.3,label:"Global Decay",shortId:"gd",group:"hidden",hidden:!0,noReset:!0},highPass:{type:"float",default:20,label:"High Pass",shortId:"hp",group:"hidden",hidden:!0,noReset:!0},lowPass:{type:"float",default:2e4,label:"Low Pass",shortId:"lp",group:"hidden",hidden:!0,noReset:!0},gain:{type:"float",default:.8,label:"Volume",shortId:"vl",group:"system",noReset:!0,min:0,max:2,step:.01}}},$r={id:"drawing",shortId:"dr",name:"Drawing Tools",category:"Tools",tabConfig:{label:"Drawing",componentId:"panel-drawing",order:80,condition:{param:"enabled",bool:!0}},viewportConfig:{componentId:"overlay-drawing",type:"dom"},menuConfig:{label:"Drawing Tools",toggleParam:"enabled"},interactionConfig:{blockCamera:!0,activeParam:"active"},params:{enabled:{type:"boolean",default:!1,label:"Show Tab",shortId:"en",group:"system",hidden:!0,noReset:!0},active:{type:"boolean",default:!1,label:"Enable Tool",shortId:"ac",group:"main",noReset:!0,hidden:!0},activeTool:{type:"float",default:0,label:"Tool Type",shortId:"tt",group:"main",noReset:!0,hidden:!0},originMode:{type:"float",default:1,label:"Origin Plane",shortId:"om",group:"settings",noReset:!0,options:[{label:"Global Zero",value:0},{label:"Surface (Probe)",value:1}],description:"Where the drawing plane starts."},color:{type:"color",default:new le("#00ffff"),label:"Line Color",shortId:"cl",group:"settings",noReset:!0},lineWidth:{type:"float",default:1,label:"Line Width",shortId:"lw",min:1,max:10,step:1,group:"settings",noReset:!0,hidden:!0},showLabels:{type:"boolean",default:!0,label:"Show Measurements",shortId:"sl",group:"settings",noReset:!0},showAxes:{type:"boolean",default:!1,label:"Show Axis Ruler",shortId:"ax",group:"settings",noReset:!0,description:"Displays a reference grid at the drawing origin."},shapes:{type:"complex",default:[],label:"Shapes",shortId:"sh",group:"data",hidden:!0,noReset:!0},refreshTrigger:{type:"float",default:0,label:"Refresh Trigger",group:"system",hidden:!0,noReset:!0}},state:{activeTool:"rect"},actions:{addDrawnShape:(e,o)=>({shapes:[...e.shapes||[],o]}),removeDrawnShape:(e,o)=>({shapes:(e.shapes||[]).filter(t=>t.id!==o)}),updateDrawnShape:(e,o)=>({shapes:(e.shapes||[]).map(t=>t.id===o.id?{...t,...o.updates}:t)}),clearDrawnShapes:e=>({shapes:[]})}},no=["#ef4444","#f97316","#f59e0b","#84cc16","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#d946ef","#f43f5e"],Br={id:"modulation",shortId:"mod",name:"Modulation",category:"System",state:{rules:[],selectedRuleId:null},actions:{addModulation:(e,o)=>{const t=no[e.rules.length%no.length],a={id:_e(),target:o.target,source:o.source||"audio",enabled:!0,color:t,freqStart:0,freqEnd:.2,thresholdMin:.1,thresholdMax:1,attack:.1,decay:.3,smoothing:0,gain:1,offset:0};return{rules:[...e.rules,a],selectedRuleId:a.id}},removeModulation:(e,o)=>({rules:e.rules.filter(t=>t.id!==o),selectedRuleId:e.selectedRuleId===o?null:e.selectedRuleId}),updateModulation:(e,o)=>({rules:e.rules.map(t=>t.id===o.id?{...t,...o.update}:t)}),selectModulation:(e,o)=>({selectedRuleId:o})},params:{rules:{type:"complex",default:[],label:"Rules",shortId:"rl",group:"data",hidden:!0,noReset:!0},selectedRuleId:{type:"complex",default:null,label:"Selection",shortId:"sr",group:"data",hidden:!0,noReset:!0}}},Hr={id:"webcam",shortId:"wc",name:"Webcam Overlay",category:"Tools",viewportConfig:{componentId:"overlay-webcam",type:"dom"},menuConfig:{label:"Webcam Overlay",toggleParam:"isEnabled",advancedOnly:!0},params:{isEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"en",group:"system",noReset:!0},opacity:{type:"float",default:1,label:"Opacity",shortId:"op",min:0,max:3,step:.05,group:"visual",noReset:!0},posX:{type:"float",default:20,label:"Position X",shortId:"px",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},posY:{type:"float",default:80,label:"Position Y",shortId:"py",min:0,max:2e3,step:1,group:"transform",noReset:!0,hidden:!0},width:{type:"float",default:320,label:"Width",shortId:"w",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},height:{type:"float",default:240,label:"Height",shortId:"h",min:50,max:1200,step:1,group:"transform",noReset:!0,hidden:!0},cropL:{type:"float",default:0,label:"Crop Left",shortId:"cl",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropR:{type:"float",default:0,label:"Crop Right",shortId:"cr",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropT:{type:"float",default:0,label:"Crop Top",shortId:"ct",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},cropB:{type:"float",default:0,label:"Crop Bottom",shortId:"cb",min:0,max:.45,step:.01,group:"crop",noReset:!0,hidden:!0},blendMode:{type:"float",default:0,label:"Blend Mode",shortId:"bm",group:"visual",noReset:!0,options:[{label:"Normal",value:0},{label:"Screen",value:1},{label:"Overlay",value:2},{label:"Lighten",value:3},{label:"Difference",value:4}]},crtMode:{type:"boolean",default:!1,label:"CRT Scanlines",shortId:"sc",group:"visual",noReset:!0},tilt:{type:"float",default:0,label:"3D Tilt",shortId:"tl",min:-45,max:45,step:1,group:"transform",noReset:!0},fontSize:{type:"float",default:12,label:"Overlay Font Size",shortId:"fs",min:8,max:32,step:1,group:"visual",noReset:!0}}},Vr={id:"debugTools",shortId:"dt",name:"Debug Tools",category:"System",viewportConfig:{componentId:"overlay-debug-tools",type:"dom",renderOrder:100},menuItems:[{label:"GLSL Debugger",toggleParam:"shaderDebuggerOpen",icon:"Code",advancedOnly:!0},{label:"State Debugger",toggleParam:"stateDebuggerOpen",icon:"Info",advancedOnly:!0}],params:{shaderDebuggerOpen:{type:"boolean",default:!1,label:"GLSL Debugger",shortId:"sd",group:"tools",noReset:!0},stateDebuggerOpen:{type:"boolean",default:!1,label:"State Debugger",shortId:"st",group:"tools",noReset:!0}}},Gr={fastest:{lighting:{shadows:!1,shadowsCompile:!1,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!1,aoStochasticCp:!1},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:0,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1,compilerHardCap:128},atmosphere:{glowEnabled:!1}},lite:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,shadowSteps:32,ptStochasticShadows:!1,areaLights:!0,shadowSoftness:16,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:2,aoStochasticCp:!1,aoMode:!1,aoMaxSamples:16},geometry:{hybridComplex:!1,preRotMaster:!1,preRotEnabled:!1},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:1,bufferPrecision:1},atmosphere:{glowQuality:1}},balanced:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:16,ptStochasticShadows:!0,areaLights:!0,shadowSteps:64,ptEnabled:!1,specularModel:0},ao:{aoEnabled:!0,aoSamples:5,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:32},geometry:{hybridComplex:!1,preRotMaster:!0,preRotEnabled:!0},reflections:{enabled:!0,reflectionMode:1,bounceShadows:!1},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}},ultra:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,shadowSoftness:64,ptStochasticShadows:!0,areaLights:!0,shadowSteps:256,ptEnabled:!0,specularModel:1},ao:{aoEnabled:!0,aoSamples:8,aoStochasticCp:!0,aoMode:!0,aoMaxSamples:64},reflections:{enabled:!0,reflectionMode:3,bounceShadows:!0,steps:64,bounces:2},geometry:{hybridComplex:!0,preRotMaster:!0,preRotEnabled:!0},quality:{precisionMode:0,bufferPrecision:0},atmosphere:{glowQuality:0}}},qr={id:"engineSettings",shortId:"eng",name:"Engine Config",category:"System",tabConfig:{label:"Engine",componentId:"panel-engine",order:5,condition:{param:"showEngineTab",bool:!0}},params:{showEngineTab:{type:"boolean",default:!1,label:"Show Engine Tab",shortId:"se",group:"system",noReset:!0,hidden:!0}},actions:{applyPreset:(e,o)=>{const{mode:t,actions:a}=o,r=Gr[t];return r?(Object.entries(r).forEach(([i,n])=>{const l=`set${i.charAt(0).toUpperCase()+i.slice(1)}`,s=a[l];typeof s=="function"&&s(n)}),{}):{}}}},Ur=(e,o,t=32)=>{if(!e)return`
        float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }
        `;let a="";return o&&(a=`
        vec3 getCosHemisphereDir(vec3 n, vec2 seedVec) {
            // Use provided vector (Blue Noise Green/Alpha) instead of calculating hash
            vec2 r = seedVec;
            
            float sign = n.z >= 0.0 ? 1.0 : -1.0;
            float a = -1.0 / (sign + n.z);
            float b = n.x * n.y * a;
            vec3 tangent = vec3(1.0 + sign * n.x * n.x * a, sign * b, -sign * n.x);
            vec3 bitangent = vec3(b, sign + n.y * n.y * a, -n.y);
            
            float ra = sqrt(r.y);
            float rx = ra * cos(6.2831 * r.x);
            float ry = ra * sin(6.2831 * r.x);
            float rz = sqrt(1.0 - r.y);
            return normalize(rx * tangent + ry * bitangent + rz * n);
        }`),`
// ------------------------------------------------------------------
// AMBIENT OCCLUSION (Modular Feature)
// ------------------------------------------------------------------

${a}

float GetAO(vec3 p_ray, vec3 n, float seed) {
    if (uAOIntensity < 0.001) return 1.0;

    float occ = 0.0;
    float weight = 1.0;
    float spread = max(uAOSpread, 0.001);
    
    bool isMoving = uBlendFactor >= 0.99;
    bool isStochastic = uAOMode > 0.5;
    
    // Sample Blue Noise Texture
    vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy);
    
    // Green channel for standard jitter
    float jitter = blueNoise.g;
    
    #if defined(RENDER_MODE_PATHTRACING)
        jitter = fract(seed * 13.5 + blueNoise.g);
    #endif

    vec3 dir = n;
    bool useRandomDir = isStochastic;
    
    #if !defined(RENDER_MODE_PATHTRACING)
        if (isMoving) useRandomDir = false;
    #endif

    #if ${o?1:0}
        if (useRandomDir) {
            // Use Green and Alpha channels for 2D direction sampling
            dir = getCosHemisphereDir(n, blueNoise.ga);
        } else if (isStochastic) {
            // Stochastic enabled but camera moving (non-PT): use blue noise for stable bias
            dir = normalize(mix(n, getCosHemisphereDir(n, blueNoise.ga), 0.5));
        }
    #endif
    
    vec3 p_bias = p_ray;
    float totalWeight = 0.0;
    int limit = uAOSamples;
    float jitterBias = isMoving ? 0.0 : jitter * 0.1 * spread;

    // Use dynamic limit injected from DDFS
    for(int i = 0; i < ${t}; i++) {
        if (i >= limit) break;

        float h = (0.1 + 0.125 * float(i)) * spread + jitterBias;
        
        vec3 aopos = p_bias + dir * h;
        
        // OPTIMIZATION: Use DE_Dist for geometry-only check
        float d = DE_Dist(aopos);
        
        if (d < h) {
            float diff = h - d;
            occ += diff * weight;
        }
        
        totalWeight += h * weight;
        weight *= 0.8; 
    }
    
    occ /= (totalWeight + 0.0001);
    
    return clamp(1.0 - (occ * uAOIntensity * 2.5), 0.0, 1.0);
}
`},Wr={id:"ao",shortId:"ao",name:"Ambient Occlusion",category:"Lighting",engineConfig:{toggleParam:"aoEnabled",mode:"compile",label:"Ambient Occlusion",groupFilter:"engine_settings"},params:{aoIntensity:{type:"float",default:.2,label:"Ambient Occlusion",shortId:"ai",uniform:"uAOIntensity",min:0,max:1.5,step:.001,group:"shading",condition:{param:"aoEnabled",bool:!0}},aoSpread:{type:"float",default:.5,label:"Spread",shortId:"as",uniform:"uAOSpread",min:3e-4,max:1.5,step:.01,group:"shading",scale:"log",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoSamples:{type:"int",default:5,label:"Samples",shortId:"ap",min:2,max:32,step:1,group:"shading",uniform:"uAOSamples",ui:"numeric",parentId:"aoIntensity",description:"Iterations per pixel. Runtime controlled.",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}]},aoMode:{type:"boolean",default:!0,label:"Stochastic Mode",shortId:"am",uniform:"uAOMode",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0},{param:"aoStochasticCp",bool:!0}],description:"Switches between Fixed and Stochastic sampling at runtime."},aoColor:{type:"color",default:new le(0,0,0),label:"AO Tint",shortId:"ac",uniform:"uAOColor",group:"shading",parentId:"aoIntensity",condition:[{param:"aoEnabled",bool:!0},{param:"aoIntensity",gt:0}],description:"Black = classic darkening. Custom color = tinted occlusion in shadowed areas."},aoMaxSamples:{type:"int",default:32,label:"Max Samples (Hard Cap)",shortId:"amx",min:16,max:256,step:16,group:"engine_settings",ui:"numeric",description:"Compile-time limit. Increasing this allows higher runtime samples but compiles slower.",onUpdate:"compile",noReset:!0,condition:[{param:"aoEnabled",bool:!0}]},aoStochasticCp:{type:"boolean",default:!0,label:"Load Stochastic Sampling",shortId:"sc",group:"engine_settings",ui:"checkbox",description:"Compiles High-Quality noise logic into the shader.",onUpdate:"compile",noReset:!0},aoEnabled:{type:"boolean",default:!0,label:"Enable AO",shortId:"ae",group:"main",hidden:!0,noReset:!0,onUpdate:"compile",estCompileMs:200}},inject:(e,o,t)=>{if(t!=="Main"){e.addPostDEFunction("float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }");return}const a=o.ao,r=(a==null?void 0:a.aoEnabled)!==!1,i=(a==null?void 0:a.aoStochasticCp)!==!1,n=(a==null?void 0:a.aoMaxSamples)||32;e.addPostDEFunction(Ur(r,i,n))}},Xr=()=>`
// ------------------------------------------------------------------
// REFLECTIONS (Forge Kernel)
// ------------------------------------------------------------------

#define REFL_HIT_THRESHOLD 0.002

// Lightweight Raymarcher for Reflection Bounce
vec4 traceReflectionRay(vec3 ro, vec3 rd) {
    float t = 0.0; // Caller biases ro along normal — no skip needed here

    // Dynamic loop
    int limit = uReflSteps;

    for(int i=0; i<256; i++) {
        if (i >= limit) break;

        // OPTIMIZATION: Use Geometry-only estimator for marching
        // This skips Orbit Traps, Decomposition, and Color Smoothing logic
        float d = DE_Dist(ro + rd * t);

        if(d < REFL_HIT_THRESHOLD * t) {
            // HIT: Retreat by half the last step to refine surface position.
            // Reduces orbit-trap noise at glancing angles where the hit threshold is loose.
            float refinedT = t - d * 0.5;
            vec4 fullRes = DE(ro + rd * refinedT);
            return vec4(refinedT, fullRes.yzw);
        }
        t += d;
        if(t > MAX_DIST) break;
    }
    return vec4(-1.0); // MISS
}
    `,so=0,bt=1,Ae=3,Yr=`
    // --- REFLECTIONS: ENVIRONMENT MAP ---
    vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
    reflectionLighting = envColor * F * uSpecular;
`,Kr=`
    // --- REFLECTIONS: RAYMARCHED ---
    {
        // Adaptive bias: scales with pixel size at camera distance to avoid self-intersection.
        // Use camera distance (length(p_ray)) not ray travel distance (d) — for reflected
        // hits near the surface, d can be tiny, collapsing the bias and causing self-intersection.
        float pixelSizeScale = uPixelSizeBase / uInternalScale;
        float cameraDist_refl = length(p_ray);
        float reflPixelFootprint = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * cameraDist_refl;
        float reflBias = max(reflPixelFootprint * 2.0, length(p_fractal) * PRECISION_RATIO_HIGH * 2.0);
        vec3 currRo = p_ray + n * reflBias;
        vec3 currRd = reflDir;

        // Jitter first bounce based on roughness using Blue Noise
        bool isMoving = uBlendFactor >= 0.99;
        if (roughness > 0.05 && !isMoving) {
             vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy);
             vec3 randomVec = vec3(blueNoise.b, blueNoise.a, blueNoise.r) * 2.0 - 1.0;

             if (dot(randomVec, randomVec) > 0.001) {
                 vec3 jittered = normalize(currRd + normalize(randomVec) * (roughness * 0.8));
                 if (dot(jittered, n) > 0.05) currRd = jittered;
             }
        }

        vec3 currentThroughput = F * uSpecular;

        if (roughness <= uReflRoughnessCutoff && dot(currentThroughput, currentThroughput) >= 0.01) {

            vec4 refHit = traceReflectionRay(currRo, currRd);

            if (refHit.x > 0.0) {
                float hitD = refHit.x;
                vec3 p_next = currRo + currRd * hitD;
                vec3 p_next_fractal = p_next + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

                vec3 r_albedo, r_n, r_emission;
                float r_rough;

                // Use camera-to-reflected-point distance for normal epsilon, not reflection ray travel distance.
                // p_next is in camera-local space, so length(p_next) = camera distance.
                float reflCameraDist = length(p_next);
                getSurfaceMaterial(p_next, p_next_fractal, vec4(0.0, refHit.yzw), reflCameraDist, r_albedo, r_n, r_emission, r_rough, false);

                if (dot(r_n, -currRd) < 0.0) r_n = -r_n;

                vec3 hitColor = r_emission;
                #ifdef REFL_BOUNCE_SHADOWS
                    // Always compute shadows when enabled — avoids brightness pop
                    // between navigation (no shadows) and accumulation (shadows).
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, true);
                #else
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, false);
                #endif

                reflectionLighting += hitColor * currentThroughput;

            } else {
                reflectionLighting += sampleMissEnv(currRo, currRd, roughness, currentThroughput);
            }
        } else {
            reflectionLighting += applyEnvFog(GetEnvMap(currRd, roughness) * uEnvStrength) * currentThroughput;
        }

        vec3 simpleEnv = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
        simpleEnv *= currentThroughput;

        reflectionLighting = mix(simpleEnv, reflectionLighting, uReflStrength);
    }
`,Jr={id:"reflections",shortId:"rf",name:"Reflections",category:"Rendering",engineConfig:{toggleParam:"enabled",mode:"compile",label:"Reflection Tracing",groupFilter:"engine_settings"},params:{reflectionMode:{type:"float",default:bt,label:"Reflection Method",shortId:"rm",group:"engine_settings",options:[{label:"Off",value:so,estCompileMs:0},{label:"Environment Map",value:bt,estCompileMs:0},{label:"Raymarched (Quality)",value:Ae,estCompileMs:7500}],description:"Reflection technique. Higher quality = longer compile time. Raymarched adds ~9s.",onUpdate:"compile",noReset:!0},bounceShadows:{type:"boolean",default:!1,label:"Bounce Shadows",shortId:"bs",group:"engine_settings",ui:"checkbox",condition:{param:"reflectionMode",eq:Ae},description:"Compute shadows on reflected surfaces. Adds ~3-4s compile time.",onUpdate:"compile",noReset:!0,estCompileMs:4500},mixStrength:{type:"float",default:1,label:"Raymarch Mix",shortId:"mx",uniform:"uReflStrength",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:Ae},description:"Blends between Raymarched Reflections (1.0) and Environment Map (0.0)."},roughnessThreshold:{type:"float",default:.62,label:"Roughness Cutoff",shortId:"rc",uniform:"uReflRoughnessCutoff",min:0,max:1,step:.01,group:"engine_settings",condition:{param:"reflectionMode",eq:Ae},description:"Surfaces rougher than this will skip raymarching to save performance."},bounces:{type:"int",default:1,label:"Max Bounces",shortId:"rb",min:1,max:3,step:1,group:"engine_settings",uniform:"uReflBounces",ui:"numeric",description:"Maximum recursion depth. Clamped to 3. Default 1 for performance.",noReset:!0,onUpdate:"compile",condition:{param:"reflectionMode",eq:Ae}},steps:{type:"int",default:64,label:"Trace Steps",shortId:"rs",min:16,max:128,step:8,group:"engine_settings",uniform:"uReflSteps",ui:"numeric",description:"Precision of the reflection ray.",noReset:!0,condition:{param:"reflectionMode",eq:Ae}},enabled:{type:"boolean",default:!0,label:"Enable Reflections",shortId:"re",group:"main",hidden:!0,noReset:!0,onUpdate:"compile"}},inject:(e,o,t)=>{if(t!=="Main")return;const a=o.reflections;if(!a||a.enabled===!1)return;const r=a.reflectionMode??bt;if(r!==so){if(r!==Ae){e.addShadingLogic(Yr);return}if(r===Ae){e.addPostDEFunction(Xr());const i=Math.max(1,Math.min(3,a.bounces??1));e.addDefine("MAX_REFL_BOUNCES",i.toString()),a.bounceShadows&&e.addDefine("REFL_BOUNCE_SHADOWS","1"),e.addShadingLogic(Kr)}}}},Zr=`
// --- WATER PLANE LOGIC ---

// Helper: Multi-octave wave function
float getWaterHeight(vec3 p, float t, float freq, float strength) {
    if (strength <= 0.001) return 0.0;
    
    float h = 0.0;
    vec3 q = p * freq;
    
    // Layer 1: Rolling Swell (Sine based for mass)
    float wave1 = sin(q.x * 1.0 + t) * cos(q.z * 0.8 + t * 0.8);
    h += wave1 * 0.5;
    
    // Layer 2: Organic Surface (Simplex Noise)
    // Moving opposing direction for turbulence
    vec3 nP = q * 2.5 + vec3(t * 0.5, 0.0, -t * 0.5);
    float noise = snoise(nP);
    h += noise * 0.3;
    
    // Layer 3: Fine Choppiness
    vec3 nP2 = q * 6.0 + vec3(-t, 0.0, t * 0.2);
    h += snoise(nP2) * 0.1;

    return h * strength;
}

// Returns distance to water. 
// Uses Lipschitz bound (0.6) to prevent overstepping on steep waves, 
// ensuring shadows and AO resolve correctly.
float mapWater(vec3 p) {
    if (uWaterActive < 0.5) return 1e10;
    
    float level = uWaterHeight;
    float disp = 0.0;
    
    // Only calculate noise close to the plane to save performance
    // Bounding box check: if |y - level| > max_wave_height, return simple plane
    float distPlane = p.y - level;
    
    if (uWaterWaveStrength > 0.001) {
        // Optimization: If far away, treat as flat plane
        if (abs(distPlane) < uWaterWaveStrength * 2.0) {
            float t = uTime * uWaterWaveSpeed;
            disp = getWaterHeight(p, t, uWaterWaveFreq, uWaterWaveStrength);
        }
    }
    
    // SDF = Vertical distance - Displacement
    // Multiply by 0.6 to stabilize raymarching against the steep gradients of the waves
    return (distPlane - disp) * 0.6;
}

// Override material if water is hit
void applyWaterMaterial(inout vec3 albedo, inout float roughness, inout vec3 normal, vec3 p) {
    if (uWaterActive > 0.5) {
        
        // 1. Recalculate Normal via Finite Difference
        // This ensures the reflection/specular matches the wave geometry perfectly
        if (uWaterWaveStrength > 0.001) {
             float t = uTime * uWaterWaveSpeed;
             float eps = 0.05; // Sampling delta
             
             // Sample height at 3 points
             float h0 = getWaterHeight(p, t, uWaterWaveFreq, uWaterWaveStrength);
             float hx = getWaterHeight(p + vec3(eps, 0.0, 0.0), t, uWaterWaveFreq, uWaterWaveStrength);
             float hz = getWaterHeight(p + vec3(0.0, 0.0, eps), t, uWaterWaveFreq, uWaterWaveStrength);
             
             // Construct tangent vectors
             vec3 v1 = vec3(eps, hx - h0, 0.0);
             vec3 v2 = vec3(0.0, hz - h0, eps);
             
             // N = v2 x v1 (Cross product for Up-facing normal)
             normal = normalize(cross(v2, v1));
        } else {
             normal = vec3(0.0, 1.0, 0.0);
        }
        
        // 2. Physics Material
        albedo = uWaterColor;
        roughness = uWaterRoughness;
        
        // 3. Fake Depth Absorption (Fresnel darken)
        // Darken albedo when looking straight down (deep water)
        // Lighten at grazing angles
        float viewAngle = max(0.0, dot(normal, normalize(uCameraPosition - p)));
        albedo *= mix(0.4, 1.0, 1.0 - viewAngle);
    }
}
`,Qr=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
        decomp = MATERIAL_WATER;
        smoothIter = 0.0;
        outTrap = 0.0;
    }
`,ei=`
    // --- Water Plane (feature-injected) ---
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
    }
`,ti=`
    // --- Water Plane Material (feature-injected) ---
    if (result.w >= 5.0) {
        applyWaterMaterial(albedo, roughness, n, p_fractal);
        emission = vec3(0.0);
    }
`,oi={id:"waterPlane",shortId:"wp",name:"Water Plane",category:"Scene",engineConfig:{toggleParam:"waterEnabled",mode:"compile",label:"Water Plane",groupFilter:"engine_settings"},params:{waterEnabled:{type:"boolean",default:!1,label:"Enable Water",shortId:"we",group:"engine_settings",onUpdate:"compile",noReset:!0,hidden:!0},active:{type:"boolean",default:!0,label:"Visible",shortId:"on",uniform:"uWaterActive",group:"main",condition:{param:"waterEnabled",bool:!0},noReset:!0},height:{type:"float",default:-2,label:"Height (Y)",shortId:"ht",uniform:"uWaterHeight",min:-10,max:10,step:.01,group:"geometry",condition:{param:"active",bool:!0}},color:{type:"color",default:new le("#001133"),label:"Water Color",shortId:"cl",uniform:"uWaterColor",group:"material",condition:{param:"active",bool:!0}},roughness:{type:"float",default:.02,label:"Roughness",shortId:"ro",uniform:"uWaterRoughness",min:0,max:1,step:.01,group:"material",condition:{param:"active",bool:!0}},waveStrength:{type:"float",default:.1,label:"Wave Height",shortId:"ws",uniform:"uWaterWaveStrength",min:0,max:1.5,step:.001,group:"waves",condition:{param:"active",bool:!0}},waveSpeed:{type:"float",default:1,label:"Wave Speed",shortId:"wv",uniform:"uWaterWaveSpeed",min:0,max:5,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]},waveFrequency:{type:"float",default:1.5,label:"Wave Freq",shortId:"wf",uniform:"uWaterWaveFreq",min:.1,max:10,step:.1,group:"waves",condition:[{param:"active",bool:!0},{param:"waveStrength",gt:0}]}},inject:(e,o,t)=>{const a=o.waterPlane;a&&a.waterEnabled&&t==="Main"&&(e.addDefine("MATERIAL_WATER","10.0"),e.addFunction(Zr),e.addPostMapCode(Qr),e.addPostDistCode(ei),e.addMaterialLogic(ti))}},ai={id:"cameraManager",name:"Camera Manager",category:"Scene",tabConfig:{label:"Camera Manager",componentId:"panel-cameramanager",order:999,condition:{bool:!0}},params:{}},ri=`
#ifdef PT_VOLUMETRIC
{
    bool _hasDensity = uVolDensity > 0.001;
    bool _hasEmissive = uVolEmissive > 0.001;
    if (uVolEnabled > 0.5 && (_hasDensity || _hasEmissive)) {
        // Spatial stochastic gate: P=0.125
        // uVolStepJitter blends between fixed seed (persistent slicing) and temporal seed (smooth accumulation)
        float _volSeed = mix(0.5, stochasticSeed, uVolStepJitter);
        if (fract(_volSeed * 7.43 + d * 1.0) < 0.125) {
            float _sigma = uVolDensity;

            // Height fog: modulate density by Y distance from origin
            if (uVolHeightFalloff > 0.001) {
                float _yWorld = (p + uCameraPosition + uSceneOffsetHigh + uSceneOffsetLow).y;
                _sigma *= exp(-uVolHeightFalloff * abs(_yWorld - uVolHeightOrigin));
            }

            float _sigmaEff = max(_sigma, 0.001);
            // Beer-Lambert transmittance from camera to this scatter point
            float _trans = exp(-_sigmaEff * d);
            if (_trans > 0.001) {
                float _seg = 8.0;

                // --- DENSITY SCATTER (shadow rays — expensive) ---
                if (_hasDensity && _sigma > 0.001) {
                    float _jScale = min(h.x * 0.2, 0.35);
                    vec3 _jDir = normalize(vec3(
                        fract(stochasticSeed * 127.1 + d * 31.7) * 2.0 - 1.0,
                        fract(stochasticSeed *  37.3 + d * 47.1) * 2.0 - 1.0,
                        fract(stochasticSeed *  73.7 + d * 13.3) * 2.0 - 1.0
                    ));
                    int _volLightMax = int(uVolMaxLights);
                    for (int _li = 0; _li < MAX_LIGHTS; _li++) {
                        if (_li >= uLightCount || _li >= _volLightMax) break;
                        if (uLightIntensity[_li] < 0.01) continue;
                        bool _dir = uLightType[_li] > 0.5;
                        vec3  _lv  = _dir ? uLightDir[_li] : (uLightPos[_li] - p);
                        float _ld  = _dir ? 10000.0 : length(_lv);
                        if (!_dir && _ld < 0.001) continue;
                        vec3 _l = _dir ? normalize(_lv) : (_lv / _ld);
                        float _att = 1.0;
                        if (!_dir && uLightFalloff[_li] > 0.001) {
                            _att = uLightFalloffType[_li] < 0.5
                                ? 1.0 / (1.0 + uLightFalloff[_li] * _ld * _ld)
                                : 1.0 / (1.0 + uLightFalloff[_li] * _ld);
                        }
                        if (uLightIntensity[_li] * _att * _sigma * _trans * _seg < 1e-5) continue;
                        vec3 _l_shadow = normalize(_l + _jDir * _jScale);
                        float _sh = GetHardShadow(p + _l_shadow * max(h.x * 2.0, 0.01), _l_shadow, _ld);
                        if (_sh < 0.01) continue;
                        // Henyey-Greenstein phase
                        float _cosT  = dot(rd, -_l);
                        float _g     = uVolAnisotropy;
                        float _hgD   = max(0.0001, 1.0 + _g*_g - 2.0*_g*_cosT);
                        float _phase = (1.0 - _g*_g) / (4.0 * PI * pow(_hgD, 1.5));
                        accScatter += uLightColor[_li] * uLightIntensity[_li] * _att * _sigma * _phase * _sh * _trans * _seg * uVolScatterTint;
                    }
                }

                // --- SURFACE COLOR SCATTER (orbit trap lookup — cheap, independent) ---
                if (_hasEmissive) {
                    vec3 _pfrac = p + uCameraPosition + uSceneOffsetHigh + uSceneOffsetLow;
                    float _mapVal = getMappingValue(uColorMode, _pfrac, h, vec3(0.0, 1.0, 0.0), uColorScale);
                    float _distFrac = length(_pfrac);
                    float _t1Raw = _mapVal * uColorScale + uColorOffset + _distFrac * uColorTwist;
                    float _t1 = pow(abs(fract(mod(_t1Raw, 1.0))), uGradientBias);
                    vec3 _emitCol = textureLod0(uGradientTexture, vec2(_t1, 0.5)).rgb;
                    float _emitAtten = 1.0;
                    if (uVolEmissiveFalloff > 0.001) {
                        _emitAtten = exp(-uVolEmissiveFalloff * h.x);
                    }
                    accScatter += _emitCol * uVolEmissive * _sigmaEff * _trans * _seg * _emitAtten * uVolScatterTint;
                }
            }
        }
    }
}
#endif
`,ii=`
    // --- VOLUMETRIC SCATTER (God Rays) ---
    col += fogScatter;
`,ni={id:"volumetric",shortId:"vol",name:"Volumetric Scatter",category:"Rendering",engineConfig:{toggleParam:"ptVolumetric",mode:"compile",label:"Volumetric Scattering",description:"Henyey-Greenstein single scatter. Enables god rays, colored haze, and directional fog.",groupFilter:"engine_settings"},panelConfig:{compileParam:"ptVolumetric",runtimeToggleParam:"volEnabled",label:"Volumetric Scatter",compileMessage:"Compiling Volumetric Shader...",helpId:"render.volumetric"},groups:{density:{label:"Density & Shadow Rays",collapsible:!0},emissive:{label:"Color Scatter",collapsible:!0},height:{label:"Height Fog",collapsible:!0}},params:{ptVolumetric:{type:"boolean",default:!1,label:"Volume Scatter",shortId:"pvs",group:"engine_settings",noReset:!0,onUpdate:"compile",estCompileMs:5500},volEnabled:{type:"boolean",default:!1,label:"Enabled",shortId:"ven",uniform:"uVolEnabled",hidden:!0},volDensity:{type:"float",default:.01,label:"Density",shortId:"vd",uniform:"uVolDensity",min:.001,max:5,step:.01,scale:"log",group:"density",condition:{param:"ptVolumetric",bool:!0}},volAnisotropy:{type:"float",default:.3,label:"Anisotropy (g)",shortId:"va",uniform:"uVolAnisotropy",min:-.99,max:.99,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"0=isotropic, +0.9=forward (god rays), -0.9=back scatter."},volMaxLights:{type:"float",default:1,label:"Light Sources",shortId:"vml",uniform:"uVolMaxLights",min:1,max:3,step:1,group:"density",parentId:"volDensity",condition:{gt:0},isAdvanced:!0,description:"Max lights for shadow rays. More = more expensive."},volScatterTint:{type:"color",default:new le(1,1,1),label:"Scatter Tint",shortId:"vst",uniform:"uVolScatterTint",group:"density",parentId:"volDensity",condition:{gt:0}},volEmissive:{type:"float",default:0,label:"Color Scatter",shortId:"ves",uniform:"uVolEmissive",min:0,max:100,step:.1,scale:"log",group:"emissive",condition:{param:"ptVolumetric",bool:!0},description:"Orbit trap color field scattered through the volume. No shadow rays needed."},volStepJitter:{type:"float",default:1,label:"Step Jitter",shortId:"vsj",uniform:"uVolStepJitter",min:0,max:1,step:.01,group:"density",parentId:"volDensity",condition:{gt:0},description:"1 = smooth (temporal accumulation removes noise). 0 = fixed slicing pattern (artistic, broken fog look)."},volEmissiveFalloff:{type:"float",default:0,label:"Surface Falloff",shortId:"vef",uniform:"uVolEmissiveFalloff",min:0,max:5,step:.01,scale:"log",group:"emissive",parentId:"volEmissive",condition:{gt:0},description:"Concentrate color near fractal surface."},volHeightFalloff:{type:"float",default:0,label:"Height Falloff",shortId:"vhf",uniform:"uVolHeightFalloff",min:0,max:5,step:.01,scale:"log",group:"height",condition:{param:"ptVolumetric",bool:!0},description:"Density varies with Y. Creates ground fog, rising mist."},volHeightOrigin:{type:"float",default:0,label:"Height Origin",shortId:"vho",uniform:"uVolHeightOrigin",min:-5,max:5,step:.01,group:"height",parentId:"volHeightFalloff",condition:{gt:0}}},inject:(e,o,t)=>{if(t!=="Main")return;const a=o.volumetric;a!=null&&a.ptVolumetric&&(e.addDefine("PT_VOLUMETRIC","1"),e.addVolumeTracing(ri,""),e.addPostProcessLogic(ii))}},si=()=>{N.register(Ir),N.register(nr),N.register(yr),N.register(Dr),N.register(Fr),N.register(Wr),N.register(Jr),N.register(ka),N.register(ni),N.register(Na),N.register(oi),N.register(Va),N.register(Ba),N.register(br),N.register(Aa),N.register(Da),N.register($a),N.register(Or),N.register(jr),N.register(ai),N.register(Nr),N.register($r),N.register(Br),N.register(Hr),N.register(Vr),N.register(qr)},Ve=e=>{const o=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return o?{r:parseInt(o[1],16),g:parseInt(o[2],16),b:parseInt(o[3],16)}:null},Oo=(e,o,t)=>(typeof e=="object"&&(o=e.g,t=e.b,e=e.r),"#"+((1<<24)+(Math.round(e)<<16)+(Math.round(o)<<8)+Math.round(t)).toString(16).slice(1).toUpperCase()),ft=({r:e,g:o,b:t})=>{e/=255,o/=255,t/=255;const a=Math.max(e,o,t),r=Math.min(e,o,t);let i=0,n=0,l=a;const s=a-r;if(n=a===0?0:s/a,a!==r){switch(a){case e:i=(o-t)/s+(o<t?6:0);break;case o:i=(t-e)/s+2;break;case t:i=(e-o)/s+4;break}i/=6}return{h:i*360,s:n*100,v:l*100}},jo=(e,o,t)=>{e/=360,o/=100,t/=100;let a=0,r=0,i=0;const n=Math.floor(e*6),l=e*6-n,s=t*(1-o),c=t*(1-l*o),u=t*(1-(1-l)*o);switch(n%6){case 0:a=t,r=u,i=s;break;case 1:a=c,r=t,i=s;break;case 2:a=s,r=t,i=u;break;case 3:a=s,r=c,i=t;break;case 4:a=u,r=s,i=t;break;case 5:a=t,r=s,i=c;break}return{r:a*255,g:r*255,b:i*255}},li=(e,o,t)=>({r:e.r+(o.r-e.r)*t,g:e.g+(o.g-e.g)*t,b:e.b+(o.b-e.b)*t}),ci=(e,o,t)=>{const a=ft(e),r=ft(o);let i=r.h-a.h;i>180&&(i-=360),i<-180&&(i+=360);const n=((a.h+i*t)%360+360)%360,l=a.s+(r.s-a.s)*t,s=a.v+(r.v-a.v)*t;return jo(n,l,s)},di=(e,o,t)=>{const a=ft(e),r=ft(o);let i=r.h-a.h;i>=0&&i<=180&&(i-=360),i<0&&i>=-180&&(i+=360);const n=((a.h+i*t)%360+360)%360,l=a.s+(r.s-a.s)*t,s=a.v+(r.v-a.v)*t;return jo(n,l,s)},lt=e=>{const o=e/255;return o<=.04045?o/12.92:Math.pow((o+.055)/1.055,2.4)},vt=e=>{const o=Math.max(0,Math.min(1,e));return(o<=.0031308?o*12.92:1.055*Math.pow(o,1/2.4)-.055)*255},lo=e=>{const o=lt(e.r),t=lt(e.g),a=lt(e.b),r=Math.cbrt(.4122214708*o+.5363325363*t+.0514459929*a),i=Math.cbrt(.2119034982*o+.6806995451*t+.1073969566*a),n=Math.cbrt(.0883024619*o+.2817188376*t+.6299787005*a);return{L:.2104542553*r+.793617785*i-.0040720468*n,a:1.9779984951*r-2.428592205*i+.4505937099*n,b:.0259040371*r+.7827717662*i-.808675766*n}},co=e=>{const o=e.L+.3963377774*e.a+.2158037573*e.b,t=e.L-.1055613458*e.a-.0638541728*e.b,a=e.L-.0894841775*e.a-1.291485548*e.b,r=o*o*o,i=t*t*t,n=a*a*a;return{r:vt(4.0767416621*r-3.3077115913*i+.2309699292*n),g:vt(-1.2684380046*r+2.6097574011*i-.3413193965*n),b:vt(-.0041960863*r-.7034186147*i+1.707614701*n)}},ui=(e,o,t)=>{const a=lo(e),r=lo(o),i=Math.sqrt(a.a*a.a+a.b*a.b),n=Math.sqrt(r.a*r.a+r.b*r.b);if(i<.005||n<.005)return co({L:a.L+(r.L-a.L)*t,a:a.a+(r.a-a.a)*t,b:a.b+(r.b-a.b)*t});const l=Math.atan2(a.b,a.a);let c=Math.atan2(r.b,r.a)-l;c>Math.PI&&(c-=2*Math.PI),c<-Math.PI&&(c+=2*Math.PI);const u=l+c*t,h=i+(n-i)*t,f=a.L+(r.L-a.L)*t;return co({L:f,a:h*Math.cos(u),b:h*Math.sin(u)})},No=(e,o,t,a)=>{switch(a){case"hsv":return ci(e,o,t);case"hsv-far":return di(e,o,t);case"oklab":return ui(e,o,t);default:return li(e,o,t)}},$o=(e,o)=>{if(Math.abs(o-.5)<.001)return e;const t=Math.max(.001,Math.min(.999,o)),a=Math.log(.5)/Math.log(t);return Math.pow(e,a)},zn=(e,o=1)=>{let t,a="rgb";if(!e)return"linear-gradient(90deg, #000 0%, #fff 100%)";if(Array.isArray(e))t=e;else if(e&&Array.isArray(e.stops))t=e.stops,a=e.blendSpace||"oklab";else return"linear-gradient(90deg, #000 0%, #fff 100%)";if(!t||t.length===0)return"linear-gradient(90deg, #000 0%, #fff 100%)";const r=[...t].sort((l,s)=>l.position-s.position),i=a!=="rgb",n=[];for(let l=0;l<r.length;l++){const s=r[l];let c=Math.pow(s.position,1/o);if(c=Math.max(0,Math.min(1,c))*100,n.push(`${s.color} ${c.toFixed(2)}%`),l<r.length-1){const u=r[l+1],h=s.bias??.5,f=s.interpolation||"linear";if(f==="step"){let p=Math.pow(u.position,1/o);p=Math.max(0,Math.min(1,p))*100,n.push(`${s.color} ${p.toFixed(2)}%`),n.push(`${u.color} ${p.toFixed(2)}%`)}else if(i){const p=Ve(s.color)||{r:0,g:0,b:0},m=Ve(u.color)||{r:0,g:0,b:0},b=12;for(let g=1;g<b;g++){let y=g/b;Math.abs(h-.5)>.001&&(y=$o(y,h)),(f==="smooth"||f==="cubic")&&(y=y*y*(3-2*y));const v=No(p,m,y,a),w=s.position+(u.position-s.position)*(g/b);let k=Math.pow(w,1/o)*100;k=Math.max(0,Math.min(100,k)),n.push(`${Oo(v)} ${k.toFixed(2)}%`)}}else if(Math.abs(h-.5)>.001){const p=s.position+(u.position-s.position)*h;let m=Math.pow(p,1/o)*100;m=Math.max(0,Math.min(100,m)),n.push(`${m.toFixed(2)}%`)}}}return`linear-gradient(90deg, ${n.join(", ")})`},xt=e=>lt(e)*255,St=e=>{const o=e/255;if(o>=.99)return 255;const t=(Math.sqrt(-10127*o*o+13702*o+9)+59*o-3)/(502-486*o);return Math.max(0,t)*255},uo=e=>{const t=new Uint8Array(1024);let a,r="srgb",i="oklab";if(Array.isArray(e))a=e;else if(e&&Array.isArray(e.stops))a=e.stops,r=e.colorSpace||"srgb",i=e.blendSpace||"oklab";else return t;if(a.length===0){for(let s=0;s<256;s++){const c=Math.floor(s/255*255);t[s*4]=c,t[s*4+1]=c,t[s*4+2]=c,t[s*4+3]=255}return t}const n=[...a].sort((s,c)=>s.position-c.position),l=s=>{let c={r:0,g:0,b:0};if(s<=n[0].position)c=Ve(n[0].color)||{r:0,g:0,b:0};else if(s>=n[n.length-1].position)c=Ve(n[n.length-1].color)||{r:0,g:0,b:0};else for(let u=0;u<n.length-1;u++)if(s>=n[u].position&&s<=n[u+1].position){const h=n[u],f=n[u+1];let p=(s-h.position)/(f.position-h.position);const m=h.bias??.5;Math.abs(m-.5)>.001&&(p=$o(p,m));const b=h.interpolation||"linear";b==="step"?p=0:(b==="smooth"||b==="cubic")&&(p=p*p*(3-2*p));const g=Ve(h.color)||{r:0,g:0,b:0},y=Ve(f.color)||{r:0,g:0,b:0};c=No(g,y,p,i);break}return r==="linear"?{r:xt(c.r),g:xt(c.g),b:xt(c.b)}:r==="aces_inverse"?{r:St(c.r),g:St(c.g),b:St(c.b)}:c};for(let s=0;s<256;s++){const c=s/255,u=l(c);t[s*4]=u.r,t[s*4+1]=u.g,t[s*4+2]=u.b,t[s*4+3]=255}return t},fi=e=>{const o=Math.max(1e3,Math.min(4e4,e))/100;let t,a,r;return o<=66?t=255:(t=o-60,t=329.698727446*Math.pow(t,-.1332047592),t=Math.max(0,Math.min(255,t))),o<=66?(a=o,a=99.4708025861*Math.log(a)-161.1195681661,a=Math.max(0,Math.min(255,a))):(a=o-60,a=288.1221695283*Math.pow(a,-.0755148492),a=Math.max(0,Math.min(255,a))),o>=66?r=255:o<=19?r=0:(r=o-10,r=138.5177312231*Math.log(r)-305.0447927307,r=Math.max(0,Math.min(255,r))),{r:Math.round(t),g:Math.round(a),b:Math.round(r)}},An=e=>{const{r:o,g:t,b:a}=fi(e);return Oo(o,t,a)},pi=(e,o)=>{const t={};return si(),N.getAll().forEach(r=>{const i={},n={};r.state&&Object.assign(i,r.state),Object.entries(r.params).forEach(([s,c])=>{c.composeFrom?c.composeFrom.forEach(u=>{n[u]=s}):i[s]===void 0&&(i[s]=c.default)}),t[r.id]=i;const l=`set${r.id.charAt(0).toUpperCase()+r.id.slice(1)}`;t[l]=s=>{let c=!1;const u={};e(h=>{const f=h[r.id],p={...s};Object.keys(s).forEach(g=>{const y=r.params[g];if(y){const v=s[g];if(v==null)return;y.type==="vec2"&&!(v instanceof ve)&&(p[g]=new ve(v.x,v.y)),y.type==="vec3"&&!(v instanceof j)&&(p[g]=new j(v.x,v.y,v.z)),y.type==="color"&&!(v instanceof le)&&(typeof v=="string"?p[g]=new le(v):typeof v=="number"?p[g]=new le(v):typeof v=="object"&&"r"in v&&(p[g]=new le(v.r,v.g,v.b)))}}),Object.keys(p).forEach(g=>{const y=r.params[g];if(y!=null&&y.onSet){const v=y.onSet(p[g],f);v&&Object.entries(v).forEach(([w,k])=>{s[w]===void 0&&(p[w]=k)})}});const m={...f,...p},b=new Set;return Object.keys(p).forEach(g=>{const y=r.params[g];if(n[g]&&b.add(n[g]),y&&(y.noReset||(c=!0),y.type!=="image"&&(u[r.id]||(u[r.id]={}),u[r.id][g]=m[g]),y.uniform)){const v=m[g];if(y.type==="image"){const w=y.uniform.toLowerCase().includes("env")?"env":"color";v&&typeof v=="string"?(R.emit("texture",{textureType:w,dataUrl:v}),g==="envMapData"&&m.useEnvMap===!1&&(m.useEnvMap=!0,R.emit("uniform",{key:"uUseEnvMap",value:1,noReset:!1})),g==="layer1Data"&&m.active===!1&&(m.active=!0,R.emit("uniform",{key:"uUseTexture",value:1,noReset:!1}))):(R.emit("texture",{textureType:w,dataUrl:null}),g==="envMapData"&&m.useEnvMap===!0&&(m.useEnvMap=!1,R.emit("uniform",{key:"uUseEnvMap",value:0,noReset:!1})),g==="layer1Data"&&m.active===!0&&(m.active=!1,R.emit("uniform",{key:"uUseTexture",value:0,noReset:!1})))}else if(y.type==="gradient"){const w=uo(v);R.emit("uniform",{key:y.uniform,value:{isGradientBuffer:!0,buffer:w},noReset:!!y.noReset})}else{let w=v;y.type==="boolean"&&(w=v?1:0),y.type==="color"&&!(w instanceof le)&&(w=new le(w)),R.emit("uniform",{key:y.uniform,value:w,noReset:!!y.noReset})}}}),b.forEach(g=>{const y=r.params[g];if(y&&y.composeFrom&&y.uniform){const v=y.composeFrom.map(w=>m[w]);if(y.type==="gradient"){const w=m[g];if(w){const k=uo(w);R.emit("uniform",{key:y.uniform,value:{isGradientBuffer:!0,buffer:k},noReset:!!y.noReset}),y.noReset||(c=!0)}}else if(y.type==="vec2"){const w=new ve(v[0],v[1]);R.emit("uniform",{key:y.uniform,value:w,noReset:!!y.noReset}),y.noReset||(c=!0)}else if(y.type==="vec3"){const w=new j(v[0],v[1],v[2]);R.emit("uniform",{key:y.uniform,value:w,noReset:!!y.noReset}),y.noReset||(c=!0)}}}),{[r.id]:m}}),Object.keys(u).length>0&&R.emit("config",u),c&&R.emit("reset_accum",void 0)},r.actions&&Object.entries(r.actions).forEach(([s,c])=>{t[s]=u=>{const f=o()[r.id],p=c(f,u);p&&Object.keys(p).length>0&&(e({[r.id]:{...f,...p}}),R.emit("reset_accum",void 0))}})}),t},hi={id:"shadows",label:"Shadows",renderContext:"direct",controlledParams:["lighting.shadowsCompile","lighting.shadowAlgorithm","lighting.ptStochasticShadows"],tiers:[{label:"Off",overrides:{lighting:{shadows:!1,shadowsCompile:!1,ptStochasticShadows:!1}},estCompileMs:0},{label:"Hard",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:2,ptStochasticShadows:!1}},estCompileMs:500},{label:"Soft",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1}},estCompileMs:3e3},{label:"Full",overrides:{lighting:{shadows:!0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0}},estCompileMs:3800}]},mi={id:"reflections",label:"Reflections (Direct)",renderContext:"direct",controlledParams:["reflections.reflectionMode","reflections.bounceShadows","reflections.bounces"],tiers:[{label:"Off",overrides:{reflections:{reflectionMode:0,bounceShadows:!1}},estCompileMs:0},{label:"Env Map",overrides:{reflections:{reflectionMode:1,bounceShadows:!1}},estCompileMs:0},{label:"Raymarched",overrides:{reflections:{reflectionMode:3,bounceShadows:!1,bounces:1}},estCompileMs:7500},{label:"Full",overrides:{reflections:{reflectionMode:3,bounceShadows:!0,bounces:2}},estCompileMs:12e3}]},gi={id:"lighting_quality",label:"Lighting",isAdvanced:!0,controlledParams:["lighting.specularModel","lighting.ptEnabled","lighting.ptNEEAllLights","lighting.ptEnvNEE"],tiers:[{label:"Preview",overrides:{lighting:{advancedLighting:!1,ptEnabled:!1}},estCompileMs:-2500},{label:"Path Traced",overrides:{lighting:{specularModel:1,ptEnabled:!0,advancedLighting:!0,ptNEEAllLights:!1,ptEnvNEE:!1}},estCompileMs:1900},{label:"PT + NEE",overrides:{lighting:{specularModel:1,ptEnabled:!0,advancedLighting:!0,ptNEEAllLights:!0,ptEnvNEE:!0}},estCompileMs:2500}]},yi={id:"atmosphere_quality",label:"Atmosphere",controlledParams:["atmosphere.glowEnabled","atmosphere.glowQuality","volumetric.ptVolumetric"],tiers:[{label:"Off",overrides:{atmosphere:{glowEnabled:!1},volumetric:{ptVolumetric:!1}},estCompileMs:0},{label:"Fast Glow",overrides:{atmosphere:{glowEnabled:!0,glowQuality:1},volumetric:{ptVolumetric:!1}},estCompileMs:200},{label:"Color Glow",overrides:{atmosphere:{glowEnabled:!0,glowQuality:0},volumetric:{ptVolumetric:!1}},estCompileMs:400},{label:"Volumetric",overrides:{atmosphere:{glowEnabled:!0,glowQuality:0},volumetric:{ptVolumetric:!0}},estCompileMs:5900}]},kt=[hi,mi,gi,yi],ot=[{id:"preview",label:"Preview",description:"Instant preview shader — navigate without waiting for compile.",subsystems:{shadows:0,reflections:0,lighting_quality:0,atmosphere_quality:0}},{id:"fastest",label:"Fastest",description:"Path traced lighting with fast glow.",subsystems:{shadows:0,reflections:0,lighting_quality:1,atmosphere_quality:1}},{id:"lite",label:"Lite",description:"Hard shadows, env map reflections, color glow.",subsystems:{shadows:1,reflections:1,lighting_quality:1,atmosphere_quality:2}},{id:"balanced",label:"Balanced",description:"Soft shadows, env map reflections, color glow.",subsystems:{shadows:2,reflections:1,lighting_quality:1,atmosphere_quality:2}},{id:"full",label:"Full",description:"Full shadows, raymarched reflections, volumetric.",subsystems:{shadows:3,reflections:3,lighting_quality:1,atmosphere_quality:3}},{id:"ultra",label:"Ultra",description:"Full + PT NEE. Experimental.",isAdvanced:!0,subsystems:{shadows:3,reflections:3,lighting_quality:2,atmosphere_quality:3}}],bi={activePreset:"balanced",subsystems:{...ot[3].subsystems},isCustomized:!1};function vi(e){return ot.find(o=>o.id===e)}function xi(e){for(const o of ot)if(Object.keys(o.subsystems).every(a=>o.subsystems[a]===e[a]))return o.id;return null}function Dn(e){if(!e.activePreset)return"Custom";const o=vi(e.activePreset);if(!o)return"Custom";if(!e.isCustomized)return o.label;const t=[];for(const a of kt){const r=o.subsystems[a.id],i=e.subsystems[a.id];if(r!==i){const n=a.tiers[i];t.push(`${a.label}=${(n==null?void 0:n.label)??"?"}`)}}return`${o.label} (${t.join(", ")})`}const Si=4200;function Fn(e){let o=Si;for(const t of kt){const a=e[t.id]??0,r=t.tiers[a];r&&(o+=r.estCompileMs)}return o}let Rt=null;function wi(e){Rt=e}function fo(e,o){const t=o(),a={};for(const r of kt){const i=e[r.id]??0,n=r.tiers[i];if(n)for(const[l,s]of Object.entries(n.overrides))a[l]||(a[l]={}),Object.assign(a[l],s)}for(const[r,i]of Object.entries(a)){const n=`set${r.charAt(0).toUpperCase()+r.slice(1)}`,l=t[n];typeof l=="function"&&l(i)}}function _i(e){if(!Rt)return;const o=Rt(e());R.emit(oe.CONFIG,o)}const Ii=(e,o)=>({scalability:{...bi},hardwareProfile:null,applyScalabilityPreset:t=>{const a=ot.find(r=>r.id===t);a&&(e({scalability:{activePreset:t,subsystems:{...a.subsystems},isCustomized:!1}}),fo(a.subsystems,o))},setSubsystemTier:(t,a)=>{const r=o().scalability,i={...r.subsystems,[t]:a};let n=!1;if(r.activePreset){const s=ot.find(c=>c.id===r.activePreset);s&&(n=Object.keys(i).some(c=>i[c]!==s.subsystems[c]))}else n=!0;const l=xi(i);e({scalability:{activePreset:l??r.activePreset,subsystems:i,isCustomized:l?!1:n}}),fo(i,o)},setHardwareProfile:t=>{e({hardwareProfile:t});const r=o().setQuality;typeof r=="function"&&r({compilerHardCap:t.caps.compilerHardCap,precisionMode:t.caps.precisionMode,bufferPrecision:t.caps.bufferPrecision}),_i(o)}});class Pt{constructor(o,t=null){M(this,"defaultState");M(this,"dictionary");M(this,"reverseDictCache",new Map);this.defaultState=o,this.dictionary=t}encode(o,t){try{const a=this.getDiff(o,this.defaultState);if(!a||Object.keys(a).length===0)return"";let r=this.quantize(a);if(!r||Object.keys(r).length===0)return"";this.dictionary&&(r=this.applyDictionary(r,this.dictionary,!0));const i=JSON.stringify(r),n=Bt.deflate(i),l=Array.from(n).map(c=>String.fromCharCode(c)).join("");return btoa(l).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}catch(a){return console.error("UrlStateEncoder: Error encoding",a),""}}decode(o){try{if(!o)return null;let t=o.replace(/-/g,"+").replace(/_/g,"/");for(;t.length%4;)t+="=";const a=atob(t),r=new Uint8Array(a.length);for(let l=0;l<a.length;l++)r[l]=a.charCodeAt(l);const i=Bt.inflate(r,{to:"string"});let n=JSON.parse(i);return this.dictionary&&(n=this.applyDictionary(n,this.dictionary,!1)),this.deepMerge({...this.defaultState},n)}catch(t){return console.error("UrlStateEncoder: Error decoding",t),null}}getReverseDict(o){if(this.reverseDictCache.has(o))return this.reverseDictCache.get(o);const t={};return Object.keys(o).forEach(a=>{const r=o[a];typeof r=="string"?t[r]=a:t[r._alias]=a}),this.reverseDictCache.set(o,t),t}applyDictionary(o,t,a){if(!o||typeof o!="object"||Array.isArray(o))return o;const r={};if(a)Object.keys(o).forEach(i=>{let n=i,l=null;const s=t[i];s&&(typeof s=="string"?n=s:(n=s._alias,l=s.children));const c=o[i];l&&c&&typeof c=="object"&&!Array.isArray(c)?r[n]=this.applyDictionary(c,l,!0):r[n]=c});else{const i=this.getReverseDict(t);Object.keys(o).forEach(n=>{const l=i[n]||n,s=o[n],c=t[l],u=c&&typeof c=="object"?c.children:null;u&&s&&typeof s=="object"&&!Array.isArray(s)?r[l]=this.applyDictionary(s,u,!1):r[l]=s})}return r}isEqual(o,t){if(o===t)return!0;if(o==null||t==null)return o===t;if(typeof o=="number"&&typeof t=="number")return Math.abs(o-t)<1e-4;if(Array.isArray(o)&&Array.isArray(t))return o.length!==t.length?!1:o.every((a,r)=>this.isEqual(a,t[r]));if(typeof o=="object"&&typeof t=="object"){const a=o,r=t,i=Object.keys(a).filter(l=>!l.startsWith("is")),n=Object.keys(r).filter(l=>!l.startsWith("is"));return i.length!==n.length?!1:i.every(l=>this.isEqual(a[l],r[l]))}return!1}quantize(o){if(typeof o=="string")return o.startsWith("data:image")?void 0:o;if(typeof o=="number")return o===0||Math.abs(o)<1e-9?0:parseFloat(o.toFixed(5));if(Array.isArray(o))return o.map(t=>this.quantize(t));if(o!==null&&typeof o=="object"){const t={};let a=!1;const r=Object.keys(o).filter(i=>!i.startsWith("is"));for(const i of r){const n=this.quantize(o[i]);n!==void 0&&(t[i]=n,a=!0)}return a?t:void 0}return o}getDiff(o,t){if(this.isEqual(o,t))return;if(typeof o!="object"||o===null||typeof t!="object"||t===null||Array.isArray(o))return o;const a={};let r=!1;const i=o,n=t;return Object.keys(i).forEach(l=>{if(l.startsWith("is")||l==="histogramData"||l==="interactionSnapshot"||l==="liveModulations"||l.endsWith("Stack"))return;const s=this.getDiff(i[l],n[l]);s!==void 0&&(a[l]=s,r=!0)}),r?a:void 0}deepMerge(o,t){if(typeof t!="object"||t===null)return t;const a={...o};return Object.keys(t).forEach(r=>{typeof t[r]=="object"&&t[r]!==null&&!Array.isArray(t[r])?a[r]=this.deepMerge(o[r]||{},t[r]):a[r]=t[r]}),a}}const Ci=(e,o)=>({isPlaying:!1,isRecording:!1,isScrubbing:!1,recordCamera:!0,isCameraInteracting:!1,currentFrame:0,fps:30,durationFrames:300,loopMode:"Loop",isArmingModulation:!1,isRecordingModulation:!1,recordingSnapshot:null,play:()=>{const t=o();if(t.currentFrame>=t.durationFrames-.1&&e({currentFrame:0}),t.isArmingModulation){t.snapshot();const a=JSON.parse(JSON.stringify(t.sequence));e({isRecordingModulation:!0,isArmingModulation:!1,recordingSnapshot:a,isPlaying:!0,currentFrame:0})}else e({isPlaying:!0})},pause:()=>e({isPlaying:!1,isRecordingModulation:!1,recordingSnapshot:null}),stop:()=>e({isPlaying:!1,currentFrame:0,isRecordingModulation:!1,recordingSnapshot:null}),toggleRecording:()=>e(t=>({isRecording:!t.isRecording})),toggleRecordCamera:()=>e(t=>({recordCamera:!t.recordCamera})),toggleArmModulation:()=>e(t=>({isArmingModulation:!t.isArmingModulation,isRecording:!1})),stopModulationRecording:()=>e({isRecordingModulation:!1,isPlaying:!1,recordingSnapshot:null}),setLoopMode:t=>e({loopMode:t}),setIsScrubbing:t=>e({isScrubbing:t}),setIsCameraInteracting:t=>e({isCameraInteracting:t}),seek:t=>e({currentFrame:Math.max(0,Math.min(o().durationFrames,t))}),setDuration:t=>{e({durationFrames:t})},setFps:t=>{e({fps:t})}}),Mi=(e,o)=>({selectedTrackIds:[],selectedKeyframeIds:[],softSelectionRadius:0,softSelectionEnabled:!1,softSelectionType:"S-Curve",bounceTension:.5,bounceFriction:.6,selectTrack:(t,a)=>e(r=>({selectedTrackIds:a?r.selectedTrackIds.includes(t)?r.selectedTrackIds.filter(i=>i!==t):[...r.selectedTrackIds,t]:[t]})),selectTracks:(t,a)=>e(r=>{const i=new Set(r.selectedTrackIds);return a?t.forEach(n=>i.add(n)):t.forEach(n=>i.delete(n)),{selectedTrackIds:Array.from(i)}}),selectKeyframe:(t,a,r)=>e(i=>{const n=`${t}::${a}`;return{selectedKeyframeIds:r?i.selectedKeyframeIds.includes(n)?i.selectedKeyframeIds.filter(l=>l!==n):[...i.selectedKeyframeIds,n]:[n]}}),selectKeyframes:(t,a)=>e(r=>({selectedKeyframeIds:a?Array.from(new Set([...r.selectedKeyframeIds,...t])):t})),deselectAll:()=>e({selectedTrackIds:[],selectedKeyframeIds:[]}),deselectAllKeys:()=>e({selectedKeyframeIds:[]}),setSoftSelection:(t,a)=>e({softSelectionRadius:t,softSelectionEnabled:a}),setSoftSelectionType:t=>e({softSelectionType:t}),setBouncePhysics:(t,a)=>e({bounceTension:t,bounceFriction:a})});function Bo(e,o,t,a,r){const i=1-e,n=e*e,l=i*i,s=l*i,c=n*e;return s*o+3*l*e*t+3*i*n*a+c*r}function po(e,o){let t=o[0],a=o[o.length-1];for(let u=0;u<o.length-1;u++)if(e>=o[u].frame&&e<o[u+1].frame){t=o[u],a=o[u+1];break}if(e>=a.frame)return a.value;if(e<=t.frame)return t.value;const r=a.frame-t.frame,i=(e-t.frame)/r;if(t.interpolation==="Step")return t.value;if(t.interpolation==="Linear")return t.value+(a.value-t.value)*i;const n=t.value,l=t.value+(t.rightTangent?t.rightTangent.y:0),s=a.value+(a.leftTangent?a.leftTangent.y:0),c=a.value;return Bo(i,n,l,s,c)}function Ri(e,o=1){const t=[],a=e[0].frame,r=e[e.length-1].frame,i=Math.max(o,(r-a)/50);for(let n=a;n<=r;n+=i)t.push({t:n,val:po(n,e)});return t.length>0&&t[t.length-1].t<r&&t.push({t:r,val:po(r,e)}),t}function Pi(e,o,t){let a=0,r=0,i=0,n=0,l=0,s=0,c=0;for(let g=0;g<e.length;g++){const y=e[g].t,v=1-y,w=e[g].val;s+=w,c+=w*w;const k=3*v*v*y,S=3*v*y*y,C=v*v*v*o+y*y*y*t,P=w-C;a+=k*k,r+=k*S,i+=S*S,n+=P*k,l+=P*S}const u=e.length,h=s/u;if(c/u-h*h<1e-9)return null;const p=a*i-r*r;if(Math.abs(p)<1e-9)return null;const m=(i*n-r*l)/p,b=(a*l-r*n)/p;return{h1:m,h2:b}}function Li(e,o){const t=e.length;if(t<2){const p=e[0].val;return{leftY:p,rightY:p}}const a=e[0].val,r=e[t-1].val,i=r-a,n=a+i*.333,l=a+i*.666,s=Pi(e,a,r);let c=n,u=l;s&&(c=s.h1,u=s.h2);const h=n+(c-n)*o,f=l+(u-l)*o;return{leftY:h,rightY:f}}function Lt(e,o,t,a){if(e.length<2)return;const r=e[0],i=e[e.length-1],n=i.t-r.t,l=e.map(f=>({t:(f.t-r.t)/n,val:f.val})),{leftY:s,rightY:c}=Li(l,a);let u=0,h=-1;if(n<1)u=0;else for(let f=1;f<l.length-1;f++){const p=l[f].t,m=Bo(p,r.val,s,c,i.val),b=Math.abs(m-l[f].val);b>u&&(u=b,h=f)}if(u<=t||e.length<=2){const f=o[o.length-1];f&&(f.rightTangent={x:n*.333,y:s-r.val});const p={id:_e(),frame:i.t,value:i.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-n*.333,y:c-i.val},rightTangent:{x:1,y:0}};o.push(p)}else{const f=e.slice(0,h+1),p=e.slice(h);Lt(f,o,t,a),Lt(p,o,t,a)}}const Ti=(e,o,t=1)=>{if(e.length<2)return e;t=Math.max(0,Math.min(1,t));const a=[...e].sort((l,s)=>l.frame-s.frame),r=Ri(a,1),i=[],n=r[0];return i.push({id:_e(),frame:n.t,value:n.val,interpolation:"Bezier",brokenTangents:!1,autoTangent:!1,leftTangent:{x:-1,y:0},rightTangent:{x:1,y:0}}),Lt(r,i,o,t),i.length>0&&(i[0].leftTangent={x:-1,y:0},i[i.length-1].rightTangent={x:1,y:0}),i},Ei=4;function Ho(e,o,t,a,r){const i=1-e,n=e*e,l=i*i,s=l*i,c=n*e;return s*o+3*l*e*t+3*i*n*a+c*r}function ki(e,o,t,a,r){const i=1-e;return 3*i*i*(t-o)+6*i*e*(a-t)+3*e*e*(r-a)}function zi(e,o,t,a,r){const i=r-o;if(i<=1e-9)return 0;let n=(e-o)/i;for(let l=0;l<Ei;++l){const s=Ho(n,o,t,a,r),c=ki(n,o,t,a,r);if(Math.abs(c)<1e-9)break;const u=s-e;n-=u/c}return Math.max(0,Math.min(1,n))}function Ai(e,o,t,a,r,i,n,l,s){const c=o,u=t,h=o+a,f=t+r,p=i+l,m=n+s,b=i,g=n,y=zi(e,c,h,p,b);return Ho(y,u,f,m,g)}const be=.333,ke={interpolate:(e,o,t,a=!1)=>{if(o.interpolation==="Step")return o.value;let r=o.value,i=t.value;if(a){const s=Math.PI*2,c=i-r;c>Math.PI?i-=s:c<-Math.PI&&(i+=s)}if(o.interpolation==="Bezier"){const s=o.rightTangent?o.rightTangent.x:(t.frame-o.frame)*be,c=o.rightTangent?o.rightTangent.y:0,u=t.leftTangent?t.leftTangent.x:-(t.frame-o.frame)*be,h=t.leftTangent?t.leftTangent.y:0;return Ai(e,o.frame,r,s,c,t.frame,i,u,h)}const n=t.frame-o.frame;if(n<1e-9)return r;const l=(e-o.frame)/n;return r+(i-r)*l},scaleHandles:(e,o,t,a,r)=>{const i={};if(e.interpolation!=="Bezier")return i;if(o&&e.leftTangent){const n=a-o.frame,l=r-o.frame;if(Math.abs(n)>1e-5&&Math.abs(l)>1e-5){const s=l/n;i.leftTangent={x:e.leftTangent.x*s,y:e.leftTangent.y*s}}}if(t&&e.rightTangent){const n=t.frame-a,l=t.frame-r;if(Math.abs(n)>1e-5&&Math.abs(l)>1e-5){const s=l/n;i.rightTangent={x:e.rightTangent.x*s,y:e.rightTangent.y*s}}}return i},calculateTangents:(e,o,t,a)=>{if(a==="Ease"){const g=o?(e.frame-o.frame)*be:10,y=t?(t.frame-e.frame)*be:10;return{l:{x:-g,y:0},r:{x:y,y:0}}}if(!o&&!t)return{l:{x:-10,y:0},r:{x:10,y:0}};if(!o){const g=(t.value-e.value)/(t.frame-e.frame),y=(t.frame-e.frame)*be;return{l:{x:-10,y:0},r:{x:y,y:y*g}}}if(!t){const g=(e.value-o.value)/(e.frame-o.frame),y=(e.frame-o.frame)*be;return{l:{x:-y,y:-y*g},r:{x:10,y:0}}}const r=e.frame-o.frame,i=e.value-o.value,n=r===0?0:i/r,l=t.frame-e.frame,s=t.value-e.value,c=l===0?0:s/l;if(n*c<=0){const g=r*be,y=l*be;return{l:{x:-g,y:0},r:{x:y,y:0}}}const u=t.frame-o.frame,h=t.value-o.value;let f=u===0?0:h/u;const p=3*Math.min(Math.abs(n),Math.abs(c));Math.abs(f)>p&&(f=Math.sign(f)*p);const m=r*be,b=l*be;return{l:{x:-m,y:-m*f},r:{x:b,y:b*f}}},constrainHandles:(e,o,t)=>{var r,i;const a={};if(e.leftTangent&&o){const n=e.frame-o.frame;if(n>.001){const l=n*be;if(Math.abs(e.leftTangent.x)>l){const s=l/Math.abs(e.leftTangent.x);a.leftTangent={x:e.leftTangent.x*s,y:e.leftTangent.y*s}}e.leftTangent.x>0&&(a.leftTangent={x:0,y:((r=a.leftTangent)==null?void 0:r.y)??e.leftTangent.y})}}if(e.rightTangent&&t){const n=t.frame-e.frame;if(n>.001){const l=n*be;if(Math.abs(e.rightTangent.x)>l){const s=l/Math.abs(e.rightTangent.x);a.rightTangent={x:e.rightTangent.x*s,y:e.rightTangent.y*s}}e.rightTangent.x<0&&(a.rightTangent={x:0,y:((i=a.rightTangent)==null?void 0:i.y)??e.rightTangent.y})}}return a},calculateSoftFalloff:(e,o,t)=>{if(e>=o)return 0;const a=e/o;switch(t){case"Linear":return 1-a;case"Dome":return Math.sqrt(1-a*a);case"Pinpoint":return Math.pow(1-a,4);case"S-Curve":return .5*(1+Math.cos(a*Math.PI));default:return 1-a}}},wt={updateNeighbors:(e,o)=>{const t=e[o],a=o===e.length-1,r=o-1;if(r>=0){const n={...e[r]};if(e[r]=n,n.interpolation==="Bezier"){const l=t.frame-n.frame;if(n.autoTangent){const s=e[r-1],{l:c,r:u}=ke.calculateTangents(n,s,t,"Auto");n.leftTangent=c,n.rightTangent=u}else{const s=ke.constrainHandles(n,e[r-1],t);Object.assign(n,s)}if(a&&l>1e-4){const s=l*.3,c=n.rightTangent||{x:10,y:0};if(c.x<s){const u=s/Math.max(1e-4,Math.abs(c.x));n.rightTangent={x:s,y:c.y*u}}}}}const i=o+1;if(i<e.length){const n={...e[i]};if(e[i]=n,n.interpolation==="Bezier")if(n.autoTangent){const l=e[i+1],{l:s,r:c}=ke.calculateTangents(n,t,l,"Auto");n.leftTangent=s,n.rightTangent=c}else{const l=ke.constrainHandles(n,t,e[i+1]);Object.assign(n,l)}}},inferInterpolation:(e,o)=>{const t=e.filter(a=>a.frame<o).sort((a,r)=>r.frame-a.frame);return t.length===0||t[0].interpolation==="Linear"?"Linear":t[0].interpolation==="Step"?"Step":"Bezier"}},Di=je(),Fi={durationFrames:300,fps:30,tracks:{}},Oi=(e,o)=>({sequence:Fi,clipboard:null,undoStack:[],redoStack:[],snapshot:()=>{const t=o().sequence,a=JSON.parse(JSON.stringify(t));e(r=>{const i=[...r.undoStack,{type:"SEQUENCE",data:a}];return{undoStack:i.length>50?i.slice(1):i,redoStack:[]}})},undo:()=>{const{undoStack:t,redoStack:a,sequence:r}=o();if(t.length===0)return!1;const i=t[t.length-1],n=t.slice(0,-1),s={type:"SEQUENCE",data:JSON.parse(JSON.stringify(r))};return e({sequence:i.data,undoStack:n,redoStack:[...a,s]}),!0},redo:()=>{const{undoStack:t,redoStack:a,sequence:r}=o();if(a.length===0)return!1;const i=a[a.length-1],n=a.slice(0,-1),s={type:"SEQUENCE",data:JSON.parse(JSON.stringify(r))};return e({sequence:i.data,undoStack:[...t,s],redoStack:n}),!0},setSequence:t=>{o().snapshot(),e({sequence:t})},addTrack:(t,a)=>{o().snapshot(),e(r=>r.sequence.tracks[t]?r:{sequence:{...r.sequence,tracks:{...r.sequence.tracks,[t]:{id:t,type:"float",label:a,keyframes:[]}}}})},removeTrack:t=>{o().snapshot(),e(a=>{const r={...a.sequence.tracks};return delete r[t],{sequence:{...a.sequence,tracks:r},selectedTrackIds:a.selectedTrackIds.filter(i=>i!==t)}})},setTrackBehavior:(t,a)=>{o().snapshot(),e(r=>{const i=r.sequence.tracks[t];return i?{sequence:{...r.sequence,tracks:{...r.sequence.tracks,[t]:{...i,postBehavior:a}}}}:r})},addKeyframe:(t,a,r,i)=>{e(n=>{const l=n.sequence.tracks[t];if(!l)return n;let s=i||"Bezier";i||(s=wt.inferInterpolation(l.keyframes,a));const c=s==="Bezier",u={id:_e(),frame:a,value:r,interpolation:s,autoTangent:c,brokenTangents:!1},f=[...l.keyframes.filter(m=>Math.abs(m.frame-a)>.001),u].sort((m,b)=>m.frame-b.frame),p=f.findIndex(m=>m.id===u.id);if(s==="Bezier"){const m=p>0?f[p-1]:void 0,b=p<f.length-1?f[p+1]:void 0,{l:g,r:y}=ke.calculateTangents(u,m,b,"Auto");u.leftTangent=g,u.rightTangent=y}return wt.updateNeighbors(f,p),{sequence:{...n.sequence,tracks:{...n.sequence.tracks,[t]:{...l,keyframes:f}}}}})},batchAddKeyframes:(t,a,r)=>{e(i=>{const n={...i.sequence.tracks};let l=!1;return a.forEach(({trackId:s,value:c})=>{n[s]||(n[s]={id:s,type:"float",label:s,keyframes:[]},l=!0);const u=n[s],h=[...u.keyframes],f=h.length>0?h[h.length-1]:null,p={id:_e(),frame:t,value:c,interpolation:r||"Linear",autoTangent:r==="Bezier",brokenTangents:!1};if(f)if(t>f.frame)h.push(p);else if(Math.abs(t-f.frame)<.001)p.id=f.id,h[h.length-1]=p;else{const m=h.filter(b=>Math.abs(b.frame-t)>.001);m.push(p),m.sort((b,g)=>b.frame-g.frame),u.keyframes=m,l=!0;return}else h.push(p);u.keyframes=h,l=!0}),l?{sequence:{...i.sequence,tracks:n}}:i})},removeKeyframe:(t,a)=>{o().snapshot(),e(r=>{const i=r.sequence.tracks[t];return i?{sequence:{...r.sequence,tracks:{...r.sequence.tracks,[t]:{...i,keyframes:i.keyframes.filter(n=>n.id!==a)}}}}:r})},updateKeyframe:(t,a,r)=>{e(i=>{const n=i.sequence.tracks[t];if(!n)return i;const l=n.keyframes.map(s=>s.id===a?{...s,...r}:s).sort((s,c)=>s.frame-c.frame);return{sequence:{...i.sequence,tracks:{...i.sequence.tracks,[t]:{...n,keyframes:l}}}}})},updateKeyframes:t=>{e(a=>{const r={...a.sequence.tracks};return t.forEach(({trackId:i,keyId:n,patch:l})=>{const s=r[i];if(s){const c=s.keyframes.findIndex(u=>u.id===n);if(c!==-1){const u=s.keyframes[c];l.interpolation==="Bezier"&&u.interpolation!=="Bezier"&&(l.autoTangent=!0),s.keyframes[c]={...u,...l}}}}),Object.keys(r).forEach(i=>{r[i].keyframes.sort((n,l)=>n.frame-l.frame)}),{sequence:{...a.sequence,tracks:r}}})},deleteSelectedKeyframes:()=>{o().snapshot(),e(t=>{const a={...t.sequence.tracks},r=new Set(t.selectedKeyframeIds);return Object.keys(a).forEach(i=>{a[i]={...a[i],keyframes:a[i].keyframes.filter(n=>!r.has(`${i}::${n.id}`))}}),{sequence:{...t.sequence,tracks:a},selectedKeyframeIds:[]}})},deleteAllKeys:()=>{o().snapshot(),e(t=>{const a={...t.sequence.tracks};return Object.keys(a).forEach(r=>{a[r]={...a[r],keyframes:[]}}),{sequence:{...t.sequence,tracks:a},selectedKeyframeIds:[]}})},deleteAllTracks:()=>{o().snapshot(),e({sequence:{...o().sequence,tracks:{}},selectedTrackIds:[],selectedKeyframeIds:[]})},setTangents:t=>{o().snapshot(),e(a=>{const r={...a.sequence.tracks};return a.selectedKeyframeIds.forEach(i=>{const[n,l]=i.split("::"),s=r[n];if(s){const c=s.keyframes.findIndex(h=>h.id===l);if(c===-1)return;const u=s.keyframes[c];if(t==="Split")s.keyframes[c]={...u,brokenTangents:!0,autoTangent:!1};else if(t==="Unified"){let h=u.rightTangent,f=u.leftTangent;if(h&&f){const p=Math.sqrt(h.x*h.x+h.y*h.y),m=Math.sqrt(f.x*f.x+f.y*f.y);h={x:-f.x*(p/Math.max(.001,m)),y:-f.y*(p/Math.max(.001,m))}}s.keyframes[c]={...u,rightTangent:h,brokenTangents:!1,autoTangent:!1}}else if(t==="Auto"||t==="Ease"){const h=s.keyframes[c-1],f=s.keyframes[c+1],{l:p,r:m}=ke.calculateTangents(u,h,f,t);s.keyframes[c]={...u,autoTangent:t==="Auto",brokenTangents:!1,leftTangent:p,rightTangent:m}}}}),{sequence:{...a.sequence,tracks:r}}})},setGlobalInterpolation:(t,a)=>{o().snapshot(),e(r=>{const i={...r.sequence.tracks};return Object.keys(i).forEach(n=>{const l=i[n];l.keyframes.length!==0&&l.keyframes.forEach((s,c)=>{if(s.interpolation=t,t==="Bezier"&&a){const u=l.keyframes[c-1],h=l.keyframes[c+1],{l:f,r:p}=ke.calculateTangents(s,u,h,a);s.leftTangent=f,s.rightTangent=p,s.autoTangent=a==="Auto",s.brokenTangents=!1}})}),{sequence:{...r.sequence,tracks:i}}})},copySelectedKeyframes:()=>{const{sequence:t,selectedKeyframeIds:a}=o();if(a.length===0)return;let r=1/0;a.forEach(n=>{var u,h;const[l,s]=n.split("::"),c=(h=(u=t.tracks[l])==null?void 0:u.keyframes.find(f=>f.id===s))==null?void 0:h.frame;c!==void 0&&c<r&&(r=c)});const i=[];a.forEach(n=>{var u;const[l,s]=n.split("::"),c=(u=t.tracks[l])==null?void 0:u.keyframes.find(h=>h.id===s);c&&i.push({relativeFrame:c.frame-r,value:c.value,interpolation:c.interpolation,leftTangent:c.leftTangent,rightTangent:c.rightTangent,originalTrackId:l})}),i.length>0&&e({clipboard:i})},pasteKeyframes:t=>{const{clipboard:a,currentFrame:r}=o();a&&(o().snapshot(),e(i=>{const n={...i.sequence.tracks},l=t!==void 0?t:r;return a.forEach(s=>{const c=n[s.originalTrackId];if(c){const u=l+s.relativeFrame,h={id:_e(),frame:u,value:s.value,interpolation:s.interpolation,leftTangent:s.leftTangent,rightTangent:s.rightTangent,autoTangent:!1,brokenTangents:!1};c.keyframes=[...c.keyframes.filter(f=>Math.abs(f.frame-u)>.001),h].sort((f,p)=>f.frame-p.frame)}}),{sequence:{...i.sequence,tracks:n}}}))},duplicateSelection:()=>{o().copySelectedKeyframes(),o().pasteKeyframes(o().currentFrame)},loopSelection:t=>{const a=o();if(a.selectedKeyframeIds.length<1)return;a.snapshot();let r=1/0,i=-1/0;if(a.selectedKeyframeIds.forEach(l=>{const[s,c]=l.split("::"),u=a.sequence.tracks[s],h=u==null?void 0:u.keyframes.find(f=>f.id===c);h&&(h.frame<r&&(r=h.frame),h.frame>i&&(i=h.frame))}),r===1/0||i===-1/0)return;const n=Math.max(1,i-r);e(l=>{const s={...l.sequence.tracks};for(let c=1;c<=t;c++){const u=n*c;l.selectedKeyframeIds.forEach(h=>{const[f,p]=h.split("::"),m=s[f];if(!m)return;const b=m.keyframes.find(g=>g.id===p);if(b){const g=b.frame+u,y={...b,id:_e(),frame:g};m.keyframes=[...m.keyframes.filter(v=>Math.abs(v.frame-g)>.001),y]}})}return Object.values(s).forEach(c=>c.keyframes.sort((u,h)=>u.frame-h.frame)),{sequence:{...l.sequence,tracks:s}}})},captureCameraFrame:(t,a=!1,r)=>{const i=He()||Di.activeCamera;if(!i)return;a||o().snapshot();const n=Fe.getUnifiedFromEngine(),l=i.quaternion,s=new Ue().setFromQuaternion(l),c=[{id:"camera.unified.x",val:n.x,label:"Position X"},{id:"camera.unified.y",val:n.y,label:"Position Y"},{id:"camera.unified.z",val:n.z,label:"Position Z"},{id:"camera.rotation.x",val:s.x,label:"Rotation X"},{id:"camera.rotation.y",val:s.y,label:"Rotation Y"},{id:"camera.rotation.z",val:s.z,label:"Rotation Z"}];e(u=>{const h={...u.sequence.tracks},f=h["camera.unified.x"],p=!f||f.keyframes.length===0,m=r||(p?"Linear":"Bezier");return c.forEach(b=>{let g=h[b.id];g||(g={id:b.id,type:"float",label:b.label,keyframes:[],hidden:!1},h[b.id]=g);const y={id:_e(),frame:t,value:b.val,interpolation:m,autoTangent:m==="Bezier",brokenTangents:!1},w=[...g.keyframes.filter(S=>Math.abs(S.frame-t)>.001),y].sort((S,C)=>S.frame-C.frame),k=w.findIndex(S=>S.id===y.id);if(m==="Bezier"){const S=k>0?w[k-1]:void 0,C=k<w.length-1?w[k+1]:void 0,{l:P,r:T}=ke.calculateTangents(y,S,C,"Auto");y.leftTangent=P,y.rightTangent=T}wt.updateNeighbors(w,k),g.keyframes=w}),{sequence:{...u.sequence,tracks:h}}})},simplifySelectedKeys:(t=.01)=>{o().snapshot(),e(a=>{const r=a,i={...r.sequence.tracks},n=new Set(r.selectedKeyframeIds),l={};r.selectedKeyframeIds.forEach(c=>{const[u,h]=c.split("::");l[u]||(l[u]=[]);const f=r.sequence.tracks[u],p=f==null?void 0:f.keyframes.find(m=>m.id===h);p&&l[u].push(p)});const s=[];return Object.entries(l).forEach(([c,u])=>{const h=i[c];if(!h)return;const f={...h};if(i[c]=f,u.length<3)return;const p=u.sort((b,g)=>b.frame-g.frame);f.keyframes=f.keyframes.filter(b=>!n.has(`${c}::${b.id}`));const m=Ti(p,t);f.keyframes=[...f.keyframes,...m].sort((b,g)=>b.frame-g.frame),m.forEach(b=>s.push(`${c}::${b.id}`))}),{sequence:{...r.sequence,tracks:i},selectedKeyframeIds:s}})}}),Tt=xo()(So((e,o,t)=>({...Ci(e,o),...Mi(e),...Oi(e,o)})));typeof window<"u"&&(window.useAnimationStore=Tt);const Ze=je(),ct=e=>{const o={};return e&&Object.keys(e).forEach(t=>{if(t.startsWith("is"))return;const a=e[t];if(a&&typeof a=="object"&&"isColor"in a)o[t]="#"+a.getHexString();else if(a&&typeof a=="object"&&("isVector2"in a||"isVector3"in a)){const r={...a};delete r.isVector2,delete r.isVector3,o[t]=r}else o[t]=a}),o},Vo=e=>{const o=fe.get(e),t=o&&o.defaultPreset?o.defaultPreset:{},a={version:5,name:e,formula:e,features:{}};return N.getAll().forEach(r=>{const i={};Object.entries(r.params).forEach(([n,l])=>{l.composeFrom||(i[n]=l.default)}),a.features[r.id]=ct(i)}),t.features&&Object.entries(t.features).forEach(([r,i])=>{a.features[r]?a.features[r]={...a.features[r],...ct(i)}:a.features[r]=ct(i)}),t.lights&&(a.features.lighting||(a.features.lighting={}),a.features.lighting.lights=t.lights),t.renderMode&&(a.features.lighting||(a.features.lighting={}),a.features.lighting.renderMode=t.renderMode==="PathTracing"?1:0),a.cameraMode=t.cameraMode||"Orbit",a.quality={aaMode:"Always",aaLevel:1,msaa:1,accumulation:!0,...t.quality||{}},a.lights=[],a.animations=t.animations||[],a.navigation={flySpeed:.5,autoSlow:!0,...t.navigation||{}},a.sceneOffset=t.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},a.cameraPos=t.cameraPos||{x:0,y:0,z:3.5},a.cameraRot=t.cameraRot||{x:0,y:0,z:0,w:1},a.targetDistance=t.targetDistance||3.5,a.duration=t.duration||300,a.sequence=t.sequence||{durationFrames:300,fps:30,tracks:{}},a},ji=(e,o,t)=>{const a=t(),r=e.features||{};if(e.renderMode&&(r.lighting||(r.lighting={}),r.lighting.renderMode===void 0&&(r.lighting.renderMode=e.renderMode==="PathTracing"?1:0)),r.atmosphere&&!r.ao){const v={};r.atmosphere.aoIntensity!==void 0&&(v.aoIntensity=r.atmosphere.aoIntensity),r.atmosphere.aoSpread!==void 0&&(v.aoSpread=r.atmosphere.aoSpread),r.atmosphere.aoMode!==void 0&&(v.aoMode=r.atmosphere.aoMode),r.atmosphere.aoEnabled!==void 0&&(v.aoEnabled=r.atmosphere.aoEnabled),Object.keys(v).length>0&&(r.ao=v)}const i=new Set(["compilerHardCap","precisionMode","bufferPrecision"]);if(N.getAll().forEach(v=>{const w=`set${v.id.charAt(0).toUpperCase()+v.id.slice(1)}`,k=a[w];if(typeof k=="function"){const S=r[v.id],C={},P=v.id==="quality"?t().quality:null;if(v.state&&Object.assign(C,v.state),Object.entries(v.params).forEach(([T,O])=>{if(v.id==="quality"&&i.has(T)&&P){C[T]=P[T];return}if(S&&S[T]!==void 0){let x=S[T];O.type==="vec2"&&x&&!(x instanceof ve)?x=new ve(x.x,x.y):O.type==="vec3"&&x&&!(x instanceof j)?x=new j(x.x,x.y,x.z):O.type==="color"&&x&&!(x instanceof le)&&(x=new le(x)),C[T]=x}else if(C[T]===void 0){let x=O.default;x&&typeof x=="object"&&(typeof x.clone=="function"?x=x.clone():Array.isArray(x)?x=[...x]:x={...x}),C[T]=x}}),v.id==="lighting"&&S){if(S.lights)C.lights=io(S.lights.map(T=>({...T,type:T.type||"Point",rotation:T.rotation||{x:0,y:0,z:0}})));else if(S.light0_posX!==void 0){const T=[];for(let O=0;O<3;O++)if(S[`light${O}_posX`]!==void 0){let x=S[`light${O}_color`]||"#ffffff";x.getHexString&&(x="#"+x.getHexString()),T.push({type:"Point",position:{x:S[`light${O}_posX`],y:S[`light${O}_posY`],z:S[`light${O}_posZ`]},rotation:{x:0,y:0,z:0},color:x,intensity:S[`light${O}_intensity`]??1,falloff:S[`light${O}_falloff`]??0,falloffType:S[`light${O}_type`]?"Linear":"Quadratic",fixed:S[`light${O}_fixed`]??!1,visible:S[`light${O}_visible`]??O===0,castShadow:S[`light${O}_castShadow`]??!0})}T.length>0&&(C.lights=T)}}v.id==="materials"&&S&&S.envMapVisible!==void 0&&S.envBackgroundStrength===void 0&&(C.envBackgroundStrength=S.envMapVisible?1:0),k(C)}}),e.lights&&e.lights.length>0){const v=a.setLighting;if(typeof v=="function"){const w=io(e.lights.map(k=>({...k,type:k.type||"Point",rotation:k.rotation||{x:0,y:0,z:0}})));v({lights:w})}}e.sequence&&Tt.getState().setSequence(e.sequence),a.setAnimations(e.animations||[]),e.savedCameras&&Array.isArray(e.savedCameras)&&e.savedCameras.length>0&&o({savedCameras:e.savedCameras,activeCameraId:e.savedCameras[0].id||null});const n=e.cameraPos||{x:0,y:0,z:3.5},l=e.sceneOffset||{x:0,y:0,z:0,xL:0,yL:0,zL:0},s=e.targetDistance||3.5,c=e.cameraRot||{x:0,y:0,z:0,w:1},u=l.x+l.xL+n.x,h=l.y+l.yL+n.y,f=l.z+l.zL+n.z,p=B.split(u),m=B.split(h),b=B.split(f),g={x:p.high,y:m.high,z:b.high,xL:p.low,yL:m.low,zL:b.low};o({cameraRot:c,targetDistance:s,sceneOffset:g,cameraMode:e.cameraMode||t().cameraMode}),Ze.activeCamera&&Ze.virtualSpace&&Ze.virtualSpace.applyCameraState(Ze.activeCamera,{position:{x:0,y:0,z:0},rotation:c,sceneOffset:g,targetDistance:s});const y={position:{x:0,y:0,z:0},rotation:c,sceneOffset:g,targetDistance:s};Ze.pendingTeleport=y,R.emit("camera_teleport",y),e.duration&&Tt.getState().setDuration(e.duration),e.formula==="Modular"&&a.refreshPipeline(),a.refreshHistogram(),R.emit("reset_accum",void 0)},Ni={formula:"Mandelbulb",cameraPos:{x:0,y:0,z:0},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:3.5,cameraMode:"Orbit"},$i=(e,o,t={includeAnimations:!0})=>{try{e.quality&&(delete e.quality.aaLevel,delete e.quality.aaMode,delete e.quality.msaa),e.features&&e.features.quality&&delete e.features.quality.resolutionMode,t.includeAnimations===!1&&(delete e.sequence,delete e.animations);const a=Vo(e.formula);a.formula="";const r=N.getDictionary();return new Pt(a,r).encode(e,o)}catch(a){return console.error("Sharing: Failed to generate share string",a),""}},On=e=>{if(!e)return null;try{const o=N.getDictionary(),a=new Pt(Ni,o).decode(e);if(a&&a.formula){const r=Vo(a.formula);return new Pt(r,o).decode(e)}}catch(o){console.error("Sharing: Failed to load share string",o)}return null},_t=je();class Bi{constructor(){M(this,"pendingCam");M(this,"binders",new Map);M(this,"overriddenTracks",new Set);M(this,"lastCameraIndex",-1);M(this,"animStore",null);M(this,"fractalStore",null);this.pendingCam={rot:new Ue,unified:new j,rotDirty:!1,unifiedDirty:!1}}connect(o,t){this.animStore=o,this.fractalStore=t}setOverriddenTracks(o){this.overriddenTracks=o}getBinder(o){if(this.binders.has(o))return this.binders.get(o);let t=()=>{};if(o==="camera.active_index")t=a=>{const r=Math.round(a);if(r!==this.lastCameraIndex){const i=this.fractalStore.getState(),n=i.savedCameras;n&&n[r]&&(i.selectCamera(n[r].id),this.lastCameraIndex=r)}};else if(o.startsWith("camera.")){const a=o.split("."),r=a[1],i=a[2];r==="unified"?t=n=>{this.pendingCam.unified[i]=n,this.pendingCam.unifiedDirty=!0}:r==="rotation"&&(t=n=>{this.pendingCam.rot[i]=n,this.pendingCam.rotDirty=!0})}else if(o.startsWith("lights.")){const a=o.split("."),r=parseInt(a[1]),i=a[2];let n="";i==="position"?n=`pos${a[3].toUpperCase()}`:i==="color"?n="color":n=i;const l=`lighting.light${r}_${n}`;return this.getBinder(l)}else if(o.startsWith("lighting.light")){const a=o.match(/lighting\.light(\d+)_(\w+)/);if(a){const r=parseInt(a[1]),i=a[2],n=this.fractalStore.getState();if(i==="intensity")t=l=>n.updateLight({index:r,params:{intensity:l}});else if(i==="falloff")t=l=>n.updateLight({index:r,params:{falloff:l}});else if(i.startsWith("pos")){const l=i.replace("pos","").toLowerCase();t=s=>{var h;const u=(h=this.fractalStore.getState().lighting)==null?void 0:h.lights[r];if(u){const f={...u.position,[l]:s};n.updateLight({index:r,params:{position:f}})}}}else if(i.startsWith("rot")){const l=i.replace("rot","").toLowerCase();t=s=>{var h;const u=(h=this.fractalStore.getState().lighting)==null?void 0:h.lights[r];if(u){const f={...u.rotation,[l]:s};n.updateLight({index:r,params:{rotation:f}})}}}}}else if(o.includes(".")){const a=o.split("."),r=a[0],i=a[1];if(N.get(r)){const l=this.fractalStore.getState(),s=`set${r.charAt(0).toUpperCase()+r.slice(1)}`,c=l[s];if(c&&typeof c=="function"){const u=i.match(/^(vec[23][ABC])_(x|y|z)$/);if(u){const h=u[1],f=u[2];t=p=>{var g;const b=(g=this.fractalStore.getState()[r])==null?void 0:g[h];if(b){const y=b.clone();y[f]=p,c({[h]:y})}}}else t=h=>c({[i]:h})}else console.warn(`AnimationEngine: Setter ${s} not found for feature ${r}`)}}else{const a=this.fractalStore.getState(),r="set"+o.charAt(0).toUpperCase()+o.slice(1);typeof a[r]=="function"&&(t=i=>a[r](i))}return this.binders.set(o,t),t}tick(o){if(!this.animStore)return;const t=this.animStore.getState();if(!t.isPlaying)return;const a=t.fps,r=t.currentFrame,i=t.durationFrames,n=t.loopMode,l=o*a;let s=r+l;if(s>=i)if(n==="Once"||t.isRecordingModulation){s=i,this.scrub(i),this.animStore.setState({isPlaying:!1,currentFrame:i}),t.isRecordingModulation&&t.stopModulationRecording();return}else s=0;this.animStore.setState({currentFrame:s}),this.scrub(s)}scrub(o){if(!this.animStore)return;const{sequence:t,isPlaying:a,isRecording:r,recordCamera:i}=this.animStore.getState(),n=Object.values(t.tracks);this.syncBuffersFromEngine();const l=a&&r&&i;for(let s=0;s<n.length;s++){const c=n[s];if(this.overriddenTracks.has(c.id)||c.keyframes.length===0||c.type!=="float"||c.id.includes("camera.position")||c.id.includes("camera.offset")||l&&c.id.startsWith("camera."))continue;const u=this.interpolate(c,o);this.getBinder(c.id)(u)}this.commitState()}syncBuffersFromEngine(){const o=He()||_t.activeCamera;if(o){this.pendingCam.rot.setFromQuaternion(o.quaternion);const t=_t.sceneOffset;this.pendingCam.unified.set(t.x+t.xL+o.position.x,t.y+t.yL+o.position.y,t.z+t.zL+o.position.z),this.pendingCam.rotDirty=!1,this.pendingCam.unifiedDirty=!1}}interpolate(o,t){const a=o.keyframes;if(a.length===0)return 0;const r=a[0],i=a[a.length-1],n=o.id.startsWith("camera.rotation")||o.id.includes("rot")||o.id.includes("phase")||o.id.includes("twist");if(t>i.frame){const l=o.postBehavior||"Hold";if(l==="Hold")return i.value;if(l==="Continue"){let p=0;if(a.length>1){const m=a[a.length-2];i.interpolation==="Linear"?p=(i.value-m.value)/(i.frame-m.frame):i.interpolation==="Bezier"&&(i.leftTangent&&Math.abs(i.leftTangent.x)>.001?p=i.leftTangent.y/i.leftTangent.x:p=(i.value-m.value)/(i.frame-m.frame))}return i.value+p*(t-i.frame)}const s=i.frame-r.frame;if(s<=.001)return i.value;const c=t-r.frame,u=Math.floor(c/s),h=r.frame+c%s,f=this.evaluateCurveInternal(a,h,n);if(l==="Loop")return f;if(l==="PingPong"){if(u%2===1){const m=i.frame-c%s;return this.evaluateCurveInternal(a,m,n)}return f}if(l==="OffsetLoop"){const p=i.value-r.value;return f+p*u}}return t<r.frame?r.value:this.evaluateCurveInternal(a,t,n)}evaluateCurveInternal(o,t,a){for(let r=0;r<o.length-1;r++){const i=o[r],n=o[r+1];if(t>=i.frame&&t<=n.frame)return ke.interpolate(t,i,n,a)}return o[o.length-1].value}commitState(){if(this.pendingCam.unifiedDirty||this.pendingCam.rotDirty){_t.shouldSnapCamera=!0;const o=new Oe().setFromEuler(this.pendingCam.rot),t={x:o.x,y:o.y,z:o.z,w:o.w},a=B.split(this.pendingCam.unified.x),r=B.split(this.pendingCam.unified.y),i=B.split(this.pendingCam.unified.z);R.emit(oe.CAMERA_TELEPORT,{position:{x:0,y:0,z:0},rotation:t,sceneOffset:{x:a.high,y:r.high,z:i.high,xL:a.low,yL:r.low,zL:i.low}}),this.fractalStore.setState({cameraRot:t})}}}const Hi=new Bi;class Vi{constructor(){M(this,"_pendingWork",null);M(this,"_newCyclePending",!1)}queue(o,t){this._pendingWork=t,this._newCyclePending=!0,R.emit(oe.IS_COMPILING,o)}consumeNewCycle(){return this._newCyclePending?(this._newCyclePending=!1,!0):!1}flush(){if(this._pendingWork){const o=this._pendingWork;this._pendingWork=null,o()}}}const ho=new Vi,ie=je(),ge=xo()(So((e,o,t)=>({...ua(e,o),...pa(e,o),...Sa(e,o),...Ra(e,o),...Pa(e,o),...pi(e,o),...Ii(e,o),formula:"Mandelbulb",projectSettings:{name:"Mandelbulb",version:0},lastSavedHash:null,animations:[],liveModulations:{},setFormula:(a,r={})=>{const i=o(),n=i.formula;if(n===a&&a!=="Modular")return;r.skipDefaultPreset||(o().resetParamHistory(),e({undoStack:[],redoStack:[]}));const l=i.projectSettings.name;let s=l;(l===n||l==="Untitled"||l==="Custom Preset")&&(s=a),e({formula:a,projectSettings:{...i.projectSettings,name:s}}),ho.queue("Loading Preview...",()=>{if(R.emit(oe.CONFIG,{formula:a,pipeline:i.pipeline,graph:i.graph}),a!=="Modular"&&!r.skipDefaultPreset){const c=fe.get(a),u=c&&c.defaultPreset?JSON.parse(JSON.stringify(c.defaultPreset)):{formula:a};u.features||(u.features={});const h=o();if(N.getEngineFeatures().forEach(p=>{const m=h[p.id];if(!m)return;const b=u.features[p.id]||{},g={},y=p.engineConfig.toggleParam;m[y]!==void 0&&b[y]===void 0&&(g[y]=m[y]),Object.entries(p.params).forEach(([v,w])=>{w.onUpdate==="compile"&&m[v]!==void 0&&b[v]===void 0&&(g[v]=m[v])}),u.features[p.id]||(u.features[p.id]={}),Object.assign(u.features[p.id],g)}),o().lockSceneOnSwitch){const p=o().getPreset(),m={...p.features||{}},b=u.features||{};b.coreMath&&(m.coreMath=b.coreMath),b.geometry&&(m.geometry=b.geometry);const g={...p,formula:a,features:m};o().loadPreset(g)}else o().loadPreset(u)}o().handleInteractionEnd(),ie.post({type:"CONFIG_DONE"})})},setProjectSettings:a=>e(r=>{const i={...r.projectSettings,...a};return a.name&&a.name!==r.projectSettings.name?(i.version=0,{projectSettings:i,lastSavedHash:null}):{projectSettings:i}}),prepareExport:()=>{const a=o(),r=a.getPreset({includeScene:!0}),{version:i,name:n,...l}=r,s=JSON.stringify(l);if(a.lastSavedHash===null||a.projectSettings.version===0){const c=Math.max(1,a.projectSettings.version+1);return e({projectSettings:{...a.projectSettings,version:c},lastSavedHash:s}),c}if(a.lastSavedHash!==s){const c=a.projectSettings.version+1;return e({projectSettings:{...a.projectSettings,version:c},lastSavedHash:s}),c}return a.projectSettings.version},setAnimations:a=>{const r=o().animations,i=a.map(n=>{const l=r.find(s=>s.id===n.id);if(!l)return n;if(n.period!==l.period&&n.period>0){const s=performance.now()/1e3,c=(s/l.period+l.phase-s/n.period)%1;return{...n,phase:(c+1)%1}}return n});e({animations:i})},setLiveModulations:a=>e({liveModulations:a}),loadPreset:a=>{a._formulaDef&&!fe.get(a.formula)&&fe.register(a._formulaDef),o().resetParamHistory();const r=fe.get(a.formula),i=r?r.id:a.formula;e({formula:i}),R.emit(oe.CONFIG,{formula:i});let n=a.name;(!n||n==="Untitled"||n==="Custom Preset")&&(n=i),e({projectSettings:{name:n,version:0},lastSavedHash:null}),ji(a,e,o),setTimeout(()=>{const l=o().getPreset({includeScene:!0}),{version:s,name:c,...u}=l;e({lastSavedHash:JSON.stringify(u)})},50)},loadScene:({def:a,preset:r})=>{if(a&&(fe.get(a.id)||fe.register(a),R.emit(oe.REGISTER_FORMULA,{id:a.id,shader:a.shader})),!ie.isBooted&&!ie.bootSent){o().loadPreset(r);return}ho.queue("Loading Preview...",()=>{o().loadPreset(r);const i=Go(o());R.emit(oe.CONFIG,i);const n=o().sceneOffset;if(n){const l={x:n.x,y:n.y,z:n.z,xL:n.xL??0,yL:n.yL??0,zL:n.zL??0};ie.setShadowOffset(l),ie.post({type:"OFFSET_SET",offset:l})}ie.post({type:"CONFIG_DONE"})})},getPreset:a=>{var l,s;const r=o(),i={version:r.projectSettings.version,name:r.projectSettings.name,formula:r.formula,features:{}};if((a==null?void 0:a.includeScene)!==!1){if(i.cameraPos={x:0,y:0,z:0},ie.activeCamera&&ie.virtualSpace){const c=ie.virtualSpace.getUnifiedCameraState(ie.activeCamera,r.targetDistance);i.cameraRot=c.rotation,i.sceneOffset=c.sceneOffset,i.targetDistance=c.targetDistance}else i.cameraRot=r.cameraRot,i.sceneOffset=r.sceneOffset,i.targetDistance=r.targetDistance;i.cameraMode=r.cameraMode,i.lights=[],i.renderMode=r.renderMode,i.quality={aaMode:r.aaMode,aaLevel:r.aaLevel,msaa:r.msaaSamples,accumulation:r.accumulation}}N.getAll().forEach(c=>{const u=r[c.id];u&&(i.features||(i.features={}),i.features[c.id]=ct(u))}),i.animations=r.animations,r.savedCameras.length>0&&(i.savedCameras=r.savedCameras.map(c=>({id:c.id,label:c.label,position:c.position,rotation:c.rotation,sceneOffset:c.sceneOffset,targetDistance:c.targetDistance,optics:c.optics}))),r.formula==="Modular"&&(i.graph=r.graph,i.pipeline=r.pipeline);try{const c=(s=(l=window.useAnimationStore)==null?void 0:l.getState)==null?void 0:s.call(l);c&&(i.sequence=c.sequence,i.duration=c.durationFrames)}catch(c){console.warn("Failed to save animation sequence:",c)}return i},getShareString:a=>{const r=o().getPreset({includeScene:!0}),i=o().advancedMode;return $i(r,i,a)}}))),jn=e=>e.isUserInteracting||e.interactionMode!=="none",Nn=e=>{const o=e.dpr||1;return e.resolutionMode==="Fixed"?[Math.max(1,Math.floor(e.fixedResolution[0]*o)),Math.max(1,Math.floor(e.fixedResolution[1]*o))]:e.canvasPixelSize},$n=e=>{var t;if(e.isGizmoDragging||e.interactionMode!=="none"||e.isExporting||e.isBucketRendering||e.tutorialActive&&e.tutorialLessonId===1)return!0;const o=N.getAll();for(const a of o)if((t=a.interactionConfig)!=null&&t.blockCamera&&a.interactionConfig.activeParam){const r=e[a.id];if(r&&r[a.interactionConfig.activeParam])return!0}return!1},Go=e=>{var a;const o={formula:e.formula,pipeline:e.pipeline,pipelineRevision:e.pipelineRevision,graph:e.graph,msaaSamples:e.msaaSamples,previewMode:e.previewMode,renderMode:e.renderMode,compilerHardCap:e.compilerHardCap,shadows:!0,quality:{...e.quality}};if(N.getAll().forEach(r=>{const i=e[r.id];i&&(o[r.id]={...i})}),e.hardwareProfile){const r=e.hardwareProfile,i=o.quality;i&&(i.precisionMode=Math.max(i.precisionMode??0,r.caps.precisionMode),i.bufferPrecision=Math.max(i.bufferPrecision??0,r.caps.bufferPrecision),i.compilerHardCap=Math.min(i.compilerHardCap??tt,r.caps.compilerHardCap)),o.compilerHardCap=((a=o.quality)==null?void 0:a.compilerHardCap)??o.compilerHardCap}return o};wi(Go);const Bn=()=>{const e=ge.getState();Hi.connect(window.useAnimationStore,ge),ie.isPaused=e.isPaused,ie.setPreviewSampleCap(e.sampleCap),ie.onBooted=()=>{const t=ge.getState(),a=t.sceneOffset;if(a){const r={x:a.x,y:a.y,z:a.z,xL:a.xL??0,yL:a.yL??0,zL:a.zL??0};ie.setShadowOffset(r),ie.post({type:"OFFSET_SET",offset:r})}ie.setPreviewSampleCap(t.sampleCap)},ge.subscribe(t=>t.isPaused,t=>{ie.isPaused=t}),ge.subscribe(t=>t.sampleCap,t=>{ie.setPreviewSampleCap(t)}),ge.subscribe(t=>{var a;return(a=t.lighting)==null?void 0:a.renderMode},t=>{if(t===void 0)return;const a=t===1?"PathTracing":"Direct";ge.getState().renderMode!==a&&ge.setState({renderMode:a})});let o;ge.subscribe(t=>{var a;return(a=t.optics)==null?void 0:a.camType},t=>{var i;if(t===void 0)return;const a=o!==void 0&&o<.5,r=t>.5&&t<1.5;if(a&&r){const n=ge.getState();if(!n.activeCameraId){const l=((i=n.optics)==null?void 0:i.camFov)||60;let s=ie.lastMeasuredDistance;(!s||s>=1e3||s<=0)&&(s=n.targetDistance||3.5);const c=s*Math.tan(l*Math.PI/360),u=n.setOptics;typeof u=="function"&&u({orthoScale:c})}}o=t}),R.on(oe.BUCKET_STATUS,({isRendering:t})=>{const a=ge.getState();a.setIsBucketRendering(t),a.setIsExporting(t)})};typeof window<"u"&&(window.__store=ge);const Gi=()=>d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:d.jsx("polyline",{points:"6 9 12 15 18 9"})}),Hn=()=>d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:d.jsx("polyline",{points:"18 15 12 9 6 15"})}),Vn=()=>d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:d.jsx("polyline",{points:"15 18 9 12 15 6"})}),Gn=()=>d.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:d.jsx("polyline",{points:"9 18 15 12 9 6"})}),qn=()=>d.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:d.jsx("polyline",{points:"9 18 15 12 9 6"})}),Un=()=>d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:d.jsx("path",{d:"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"})}),Wn=()=>d.jsx("svg",{width:"100%",height:"100%",viewBox:"0 0 10 10",children:d.jsx("path",{d:"M 6 10 L 10 6 L 10 10 Z",fill:"currentColor",opacity:"0.5"})}),Xn=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("line",{x1:"4",y1:"9",x2:"20",y2:"9"}),d.jsx("line",{x1:"4",y1:"15",x2:"20",y2:"15"})]}),Yn=()=>d.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:d.jsx("path",{d:"M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})}),Kn=()=>d.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),d.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]}),Jn=()=>d.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("line",{x1:"3",y1:"12",x2:"21",y2:"12"}),d.jsx("line",{x1:"3",y1:"6",x2:"21",y2:"6"}),d.jsx("line",{x1:"3",y1:"18",x2:"21",y2:"18"})]}),Zn=()=>d.jsx("svg",{width:"16",height:"16",viewBox:"0 0 512 512",fill:"currentColor",children:d.jsx("path",{d:"M0,0v512h512V106.9l-6.5-7.3L412.4,6.5L405.1,0H0z M46.5,46.5h69.8v139.6h279.3V56.7l69.8,69.8v338.9h-46.5V256H93.1v209.5H46.5V46.5z M162.9,46.5H256V93h46.5V46.5H349v93.1H162.9V46.5z M139.6,302.5h232.7v162.9H139.6V302.5z"})}),Qn=()=>d.jsx("svg",{width:"16",height:"16",viewBox:"190 230 680 620",fill:"currentColor",children:d.jsx("path",{d:"M257.3312 451.84V332.8c0-42.3936 34.2016-76.8 76.4416-76.8h107.8272c29.5936 0 56.5248 17.152 69.12 44.032l14.8992 31.6416a25.4976 25.4976 0 0 0 23.04 14.6944h192.8192c42.1888 0 76.4416 34.3552 76.4416 76.8v28.672a76.8 76.8 0 0 1 50.9952 88.064l-43.3152 217.6A76.544 76.544 0 0 1 750.6432 819.2H324.5568a76.544 76.544 0 0 1-74.9568-61.7472l-43.3152-217.6a76.8512 76.8512 0 0 1 51.0464-88.0128z m509.5936-3.84v-24.832c0-14.1312-11.4176-25.6-25.4464-25.6h-192.8192a76.4416 76.4416 0 0 1-69.12-44.032l-14.848-31.6928A25.4976 25.4976 0 0 0 441.6 307.2H333.7216a25.5488 25.5488 0 0 0-25.4976 25.6v115.2h458.6496z m-485.6832 51.2a25.6 25.6 0 0 0-24.9856 30.6176l43.3152 217.6c2.4064 11.9808 12.8512 20.5824 24.9856 20.5824h426.0864a25.4976 25.4976 0 0 0 24.9856-20.5824l43.3152-217.6a25.7024 25.7024 0 0 0-24.9856-30.6176H281.2416z"})}),es=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("circle",{cx:"12",cy:"12",r:"10"}),d.jsx("line",{x1:"12",cy:"16",x2:"12",y2:"12"}),d.jsx("line",{x1:"12",cy:"8",x2:"12.01",y2:"8"})]}),ts=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("circle",{cx:"12",cy:"12",r:"10"}),d.jsx("path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}),d.jsx("line",{x1:"12",y1:"17",x2:"12.01",y2:"17"})]}),os=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[d.jsx("path",{d:"M3 10h10a5 5 0 0 1 5 5v2"}),d.jsx("path",{d:"M7 6l-4 4 4 4"})]}),as=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[d.jsx("path",{d:"M21 10h-10a5 5 0 0 0 -5 5v2"}),d.jsx("path",{d:"M17 6l4 4 -4 4"})]}),rs=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[d.jsx("path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}),d.jsx("path",{d:"M3 3v5h5"})]}),is=()=>d.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:d.jsx("polyline",{points:"20 6 9 17 4 12"})}),ns=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),d.jsx("polyline",{points:"17 8 12 3 7 8"}),d.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]}),ss=()=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),d.jsx("polyline",{points:"7 10 12 15 17 10"}),d.jsx("line",{x1:"12",y1:"15",x2:"12",y2:"3"})]}),ls=()=>d.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"4",children:[d.jsx("line",{x1:"12",y1:"5",x2:"12",y2:"19"}),d.jsx("line",{x1:"5",y1:"12",x2:"19",y2:"12"})]}),cs=()=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("rect",{x:"9",y:"9",width:"13",height:"13",rx:"2",ry:"2"}),d.jsx("path",{d:"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"})]}),ds=()=>d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:d.jsx("path",{d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),us=()=>d.jsxs("svg",{width:"64",height:"64",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("rect",{x:"5",y:"2",width:"14",height:"20",rx:"2",ry:"2"}),d.jsx("path",{d:"M12 18h.01"})]}),fs=({className:e})=>d.jsxs("svg",{className:e,xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[d.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),d.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),ps=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("polyline",{points:"16 18 22 12 16 6"}),d.jsx("polyline",{points:"8 6 2 12 8 18"})]}),hs=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("circle",{cx:"12",cy:"12",r:"10"}),d.jsx("path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}),d.jsx("line",{x1:"9",y1:"9",x2:"9.01",y2:"9"}),d.jsx("line",{x1:"15",y1:"9",x2:"15.01",y2:"9"})]}),ms=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}),d.jsx("polyline",{points:"3.27 6.96 12 12.01 20.73 6.96"}),d.jsx("line",{x1:"12",y1:"22.08",x2:"12",y2:"12"})]}),gs=()=>d.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",strokeDasharray:"4 4"}),d.jsx("path",{d:"M9 12l2 2 4-4"})]}),ys=()=>d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:d.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"})}),bs=()=>d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:d.jsx("circle",{cx:"12",cy:"12",r:"10"})}),vs=()=>d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 512 512",fill:"currentColor",children:d.jsx("path",{d:"M167.4,59.1l-6.2,8l-23.4,31.4h-19.7V78.8H39.4v19.7H0v354.5h512V98.5H374.2l-23.4-31.4l-6.2-8H167.4z M187.1,98.5h137.8l23.4,31.4l6.2,8h118.2v78.8H358.2c-20.5-35.2-58.7-59.1-102.2-59.1s-81.6,23.9-102.2,59.1H39.4v-78.8h118.2l6.2-8L187.1,98.5z M393.8,157.5v39.4h39.4v-39.4H393.8z M256,196.9c43.8,0,78.8,35,78.8,78.8s-35,78.8-78.8,78.8s-78.8-35-78.8-78.8S212.2,196.9,256,196.9z M39.4,256h100.3c-1.1,6.3-1.8,13.1-1.8,19.7c0,65,53.2,118.2,118.2,118.2s118.2-53.2,118.2-118.2c0-6.6-0.8-13.4-1.8-19.7h100.3v157.5H39.4V256z"})}),xs=()=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M12 3v18"}),d.jsx("path",{d:"M3 12h18"}),d.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),Ss=()=>d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:d.jsx("path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"})}),ws=()=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("polygon",{points:"12 2 2 7 12 12 22 7 12 2"}),d.jsx("polyline",{points:"2 17 12 22 22 17"}),d.jsx("polyline",{points:"2 12 12 17 22 12"})]}),_s=()=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M12 2l-5 9h10l-5 9"}),d.jsx("path",{d:"M12 2v20"})]}),Is=()=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M6 2v14a2 2 0 0 0 2 2h14"}),d.jsx("path",{d:"M18 22V8a2 2 0 0 0-2-2H2"})]}),Cs=()=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),d.jsx("line",{x1:"9",y1:"9",x2:"15",y2:"15"}),d.jsx("line",{x1:"15",y1:"9",x2:"9",y2:"15"})]}),Ms=()=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("rect",{x:"3",y:"3",width:"7",height:"7"}),d.jsx("rect",{x:"14",y:"3",width:"7",height:"7"}),d.jsx("rect",{x:"14",y:"14",width:"7",height:"7"}),d.jsx("path",{d:"M3 14h7v7H3z",fill:"currentColor",stroke:"none"})]}),Rs=()=>d.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"currentColor",children:d.jsx("path",{d:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"})}),Ps=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("rect",{x:"3",y:"3",width:"7",height:"7"}),d.jsx("rect",{x:"14",y:"3",width:"7",height:"7"}),d.jsx("rect",{x:"14",y:"14",width:"7",height:"7"}),d.jsx("path",{d:"M10 7h4"}),d.jsx("path",{d:"M17 10v4"})]}),Ls=()=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M12 22V8"}),d.jsx("path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}),d.jsx("circle",{cx:"12",cy:"5",r:"3"})]}),Ts=()=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M12 18V8"}),d.jsx("path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}),d.jsx("circle",{cx:"12",cy:"5",r:"3"}),d.jsx("line",{x1:"3",y1:"21",x2:"21",y2:"3",stroke:"currentColor",opacity:"0.9"})]}),Es=({status:e})=>{let o="currentColor";e==="keyed"||e==="partial"?o="#f59e0b":(e==="dirty"||e==="keyed-dirty")&&(o="#ef4444");const t=e==="keyed"||e==="keyed-dirty"?o:"none";return d.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:o,strokeWidth:"2.5",children:d.jsx("path",{d:"M12 2L2 12l10 10 10-10L12 2z",fill:t})})},ks=({active:e})=>d.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"#666",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),d.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]}),zs=()=>d.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[d.jsx("path",{d:"M10 13l-4 4"}),d.jsx("path",{d:"M14 11l4 -4"})]}),As=({active:e})=>d.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:e?"#f59e0b":"#666",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("polyline",{points:"16 18 22 12 16 6"}),d.jsx("polyline",{points:"8 6 2 12 8 18"})]}),Ds=({open:e})=>d.jsx("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:`transition-transform ${e?"rotate-90":""}`,children:d.jsx("path",{d:"M9 18l6-6-6-6"})}),Fs=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("rect",{x:"2",y:"2",width:"20",height:"20",rx:"5",ry:"5"}),d.jsx("path",{d:"M16 8h.01"}),d.jsx("path",{d:"M8 8h.01"}),d.jsx("path",{d:"M8 16h.01"}),d.jsx("path",{d:"M16 16h.01"}),d.jsx("path",{d:"M12 12h.01"})]}),Os=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("polyline",{points:"16 3 21 3 21 8"}),d.jsx("line",{x1:"4",y1:"20",x2:"21",y2:"3"}),d.jsx("polyline",{points:"21 16 21 21 16 21"}),d.jsx("line",{x1:"15",y1:"15",x2:"21",y2:"21"}),d.jsx("line",{x1:"4",y1:"4",x2:"9",y2:"9"})]}),js=()=>d.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:d.jsx("path",{d:"M8 5v14l11-7z"})}),Ns=()=>d.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:d.jsx("path",{d:"M6 19h4V5H6v14zm8-14v14h4V5h-4z"})}),$s=()=>d.jsx("svg",{width:"12",height:"12",fill:"currentColor",viewBox:"0 0 24 24",children:d.jsx("path",{d:"M6 6h12v12H6z"})}),Bs=({active:e})=>d.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:e?"currentColor":"none",stroke:"currentColor",strokeWidth:"2",children:d.jsx("circle",{cx:"12",cy:"12",r:"10",stroke:e?"none":"currentColor",fill:e?"#ef4444":"none"})}),Hs=({active:e})=>d.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",children:d.jsx("path",{d:"M3 18C3 18 6 5 12 12C18 19 21 5 21 5"})}),Vs=({active:e})=>d.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",children:[d.jsx("rect",{x:"3",y:"8",width:"6",height:"8"}),d.jsx("rect",{x:"15",y:"8",width:"6",height:"8"})]}),Gs=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}),d.jsx("path",{d:"M4 22v-7"}),d.jsx("path",{d:"M8 4v10"}),d.jsx("path",{d:"M12 5v10"}),d.jsx("path",{d:"M16 4v10"}),d.jsx("path",{d:"M4 8h16"}),d.jsx("path",{d:"M4 12h16"})]}),qs=({active:e})=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("rect",{x:"3",y:"3",width:"18",height:"18",rx:"2",ry:"2"}),d.jsx("line",{x1:"3",y1:"9",x2:"21",y2:"9"}),d.jsx("line",{x1:"3",y1:"15",x2:"21",y2:"15"}),d.jsx("line",{x1:"9",y1:"3",x2:"9",y2:"21"}),d.jsx("line",{x1:"15",y1:"3",x2:"15",y2:"21"})]}),Us=({mode:e})=>d.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e==="Loop"||e==="PingPong"?d.jsx("path",{d:"M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3"}):d.jsx("path",{d:"M5 12h14 M12 5l7 7-7 7"})}),Ws=({active:e,arming:o})=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M3 12h18",strokeOpacity:e||o?.3:.2}),d.jsx("path",{d:"M3 12 Q 6 2, 9 12 T 15 12 T 21 12",stroke:e?"#ef4444":o?"#fca5a5":"currentColor"}),o&&!e&&d.jsx("circle",{cx:"12",cy:"12",r:"3",fill:"#fca5a5",stroke:"none"})]}),Xs=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("polyline",{points:"4 14 10 14 10 20"}),d.jsx("polyline",{points:"20 10 14 10 14 4"}),d.jsx("line",{x1:"14",y1:"10",x2:"21",y2:"3"}),d.jsx("line",{x1:"3",y1:"21",x2:"10",y2:"14"})]}),Ys=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"}),d.jsx("circle",{cx:"12",cy:"12",r:"3",fill:"currentColor",stroke:"none"})]}),Ks=({active:e})=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("line",{x1:"4",y1:"20",x2:"20",y2:"20"}),d.jsx("line",{x1:"4",y1:"4",x2:"20",y2:"4"}),d.jsx("polyline",{points:"4 14 8 10 12 14 16 10 20 14"})]}),Js=()=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),d.jsx("path",{d:"M4 12h16"}),d.jsx("path",{d:"M12 4v16"}),d.jsx("path",{d:"M16 16l-4 4-4-4"})]}),Zs=({active:e})=>d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M19 13l-7-7-7 7"}),d.jsx("path",{d:"M5 19l7-7 7 7"}),d.jsx("path",{d:"M12 5l2-2 2 2-2 2-2-2z",fill:e?"#22d3ee":"none",stroke:"none"}),d.jsx("path",{d:"M12 5l-2-2-2 2 2 2 2-2z",fill:e?"#22d3ee":"none",stroke:"none"})]}),Qs=({active:e})=>d.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:e?"#22d3ee":"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:d.jsx("path",{d:"M2 12s3-7 7-7 7 7 7 7 3-7 7-7"})}),el=({active:e})=>d.jsxs("svg",{width:"10",height:"10",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",className:e?"text-gray-200":"text-gray-600",children:[d.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),d.jsx("circle",{cx:"12",cy:"12",r:"3"})]}),qi=e=>{const{value:o,onChange:t,onDragStart:a,onDragEnd:r,step:i=.01,sensitivity:n=1,hardMin:l,hardMax:s,mapping:c,disabled:u,dragThreshold:h=2}=e,[f,p]=L.useState(!1),m=L.useRef(null),b=L.useRef(0),g=L.useRef(0),y=L.useRef(!1),v=L.useRef(!1),w=L.useRef(!1),k=L.useRef(null),S=L.useCallback((x,z)=>{let J=i*.5*n;return x&&(J*=10),z&&(J*=.1),J},[i,n]),C=L.useCallback(x=>{if(u||x.button!==0)return;x.preventDefault(),x.stopPropagation(),x.currentTarget.setPointerCapture(x.pointerId),k.current=x.pointerId,b.current=x.clientX;const z=c?c.toDisplay(o):o;g.current=isNaN(z)?0:z,y.current=!1,v.current=x.shiftKey,w.current=x.altKey,p(!0),a==null||a()},[o,c,u,a]),P=L.useCallback(x=>{if(u||!f||!x.currentTarget.hasPointerCapture(x.pointerId))return;const z=x.clientX-b.current;if(Math.abs(z)>h&&(y.current=!0),!y.current)return;x.preventDefault(),x.stopPropagation();const J=v.current!==x.shiftKey,ce=w.current!==x.altKey;if(J||ce){const F=S(v.current,w.current),$=g.current+z*F;g.current=$,b.current=x.clientX,v.current=x.shiftKey,w.current=x.altKey}const ae=S(x.shiftKey,x.altKey);let Z=g.current+z*ae;l!==void 0&&(Z=Math.max(l,Z)),s!==void 0&&(Z=Math.min(s,Z));const _=c?c.fromDisplay(Z):Z;isNaN(_)||(m.current=_,t(_))},[f,u,i,l,s,c,t,S,h]),T=L.useCallback(x=>{u||(x.currentTarget.releasePointerCapture(x.pointerId),k.current=null,p(!1),m.current=null,r==null||r())},[u,r]),O=L.useCallback(()=>{const x=!y.current;return y.current=!1,x},[]);return{isDragging:f,immediateValueRef:m,handlePointerDown:C,handlePointerMove:P,handlePointerUp:T,handleClick:O}},Ui=e=>{const{value:o,mapping:t,onChange:a,onDragStart:r,onDragEnd:i,disabled:n,mapTextInput:l=!1}=e,[s,c]=L.useState(!1),[u,h]=L.useState(""),f=L.useRef(null),p=L.useRef(""),m=L.useCallback(()=>{if(n)return;c(!0);const S=l&&t?t.toDisplay(o):o,C=typeof S=="number"?parseFloat(S.toFixed(6)):S??0,P=String(C);h(P),p.current=P,setTimeout(()=>{f.current&&(f.current.focus(),f.current.select())},10)},[o,t,n,l]),b=L.useCallback(()=>{const S=p.current;let C;if(t!=null&&t.parseInput&&l?C=t.parseInput(S):(C=parseFloat(S),isNaN(C)&&(C=null)),C!==null){const P=l&&t?t.fromDisplay(C):C;r==null||r(),a(P),i==null||i()}c(!1)},[t,a,r,i,l]),g=L.useCallback(()=>{c(!1)},[]),y=L.useCallback(S=>{h(S),p.current=S},[]),v=L.useCallback(S=>{S.key==="Enter"?(S.preventDefault(),b()):S.key==="Escape"&&(S.preventDefault(),g()),S.key!=="Tab"&&S.stopPropagation()},[b,g]),w=L.useCallback(()=>{s||m()},[s,m]),k=L.useCallback(()=>{s&&b()},[s,b]);return{isEditing:s,inputValue:u,inputRef:f,startEditing:m,commitEdit:b,cancelEdit:g,handleInputChange:y,handleKeyDown:v,handleFocus:w,handleBlur:k}},qo=e=>e===0||Math.abs(e)<1e-9?"0":parseFloat(e.toFixed(8)).toString(),mo={toDisplay:e=>e/Math.PI,fromDisplay:e=>e*Math.PI,format:e=>{const o=e/Math.PI,t=Math.abs(o),a=o<0?"-":"";if(t<.001)return"0";if(Math.abs(t-1)<.001)return`${a}π`;if(Math.abs(t-.5)<.001)return`${a}π/2`;if(Math.abs(t-.25)<.001)return`${a}π/4`;if(Math.abs(t-.75)<.001)return`${a}3π/4`;if(Math.abs(t-2)<.001)return`${a}2π`;const r=Math.round(t*3);if(Math.abs(t-r/3)<.001&&r!==0){if(r===1)return`${a}π/3`;if(r===2)return`${a}2π/3`;if(r===3)return`${a}π`;if(r===4)return`${a}4π/3`;if(r===5)return`${a}5π/3`}return`${a}${t.toFixed(2)}π`},parseInput:e=>{const o=e.trim().toLowerCase().replace(/\s/g,"");if(o==="π"||o==="pi")return Math.PI;if(o==="-π"||o==="-pi")return-Math.PI;if(o.includes("π")||o.includes("pi")){const a=o.replace(/[πpi]/g,"");if(a.includes("/")){const[n,l]=a.split("/").map(c=>parseFloat(c)||1);return(o.startsWith("-")?-1:1)*(Math.abs(n)/l)*Math.PI}const r=a?parseFloat(a):1;return isNaN(r)?null:(o.startsWith("-")?-1:1)*Math.abs(r)*Math.PI}const t=parseFloat(o);return isNaN(t)?null:t}},Qe={toDisplay:e=>e*(180/Math.PI),fromDisplay:e=>e*(Math.PI/180),format:e=>`${(e*(180/Math.PI)).toFixed(1)}°`,parseInput:e=>{const o=e.trim().replace(/°/g,""),t=parseFloat(o);return isNaN(t)?null:t}},Uo=(e,o,t,a)=>{const r=a?a.toDisplay(e):e,i=a?a.toDisplay(o):o,n=a?a.toDisplay(t):t;return Math.max(0,Math.min(100,(r-i)/(n-i)*100))},It=({value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r=.01,sensitivity:i=1,min:n,max:l,hardMin:s,hardMax:c,mapping:u,format:h,mapTextInput:f,disabled:p=!1,highlight:m=!1,liveValue:b,defaultValue:g,onImmediateChange:y})=>{const v=te.useRef(null),w=te.useCallback(H=>h?h(H):u!=null&&u.format?u.format(H):qo(H),[h,u]),{isDragging:k,immediateValueRef:S,handlePointerDown:C,handlePointerMove:P,handlePointerUp:T,handleClick:O}=qi({value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r,sensitivity:i,hardMin:s,hardMax:c,mapping:u,disabled:p}),x=te.useCallback(H=>{P(H);const Q=S.current;Q!==null&&(v.current&&(v.current.textContent=w(Q)),y==null||y(Q))},[P,S,w,y]),{isEditing:z,inputValue:J,inputRef:ce,startEditing:ae,handleInputChange:Z,handleKeyDown:_,handleBlur:F}=Ui({value:e,mapping:u,onChange:o,onDragStart:t,onDragEnd:a,disabled:p,mapTextInput:f}),$=te.useMemo(()=>w(e),[e,w]),de=te.useCallback(()=>{!p&&!z&&ae()},[p,z,ae]),re=te.useCallback(H=>{if(p)return;O()&&ae()},[p,O,ae]),U=`
        w-full h-full flex items-center justify-center
        text-xs font-mono select-none transition-colors touch-none outline-none
        ${p?"cursor-not-allowed opacity-50 text-gray-600":"cursor-ew-resize focus:ring-1 focus:ring-cyan-500/50"}
        ${k?"bg-cyan-500/20 text-cyan-300":(k||m||b!==void 0&&!p)&&!p?"text-cyan-400":p?"":"text-gray-300 hover:text-white"}
    `;return z?d.jsx("input",{ref:ce,type:"text",value:J,onChange:H=>Z(H.target.value),onBlur:F,onKeyDown:_,className:"w-full h-full bg-gray-900 text-white text-xs border-none outline-none font-mono text-center px-1",onClick:H=>H.stopPropagation(),autoFocus:!0}):d.jsx("div",{ref:v,"data-role":"value",tabIndex:p?-1:0,onPointerDown:C,onPointerMove:x,onPointerUp:T,onClick:re,onFocus:de,className:U,title:p?"Disabled":"Click to edit, Drag to adjust (Shift=Fast, Alt=Slow)",children:$})},Wi=({value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r=.01,min:i,max:n,hardMin:l,hardMax:s,mapping:c,format:u,overrideText:h,mapTextInput:f,label:p,labelSuffix:m,headerRight:b,showTrack:g=!0,trackPosition:y="below",trackHeight:v=20,variant:w="full",className:k="",defaultValue:S,onReset:C,liveValue:P,showLiveIndicator:T=!0,onContextMenu:O,dataHelpId:x,disabled:z=!1,highlight:J=!1})=>{const ce=te.useRef(null),ae=te.useRef(null),Z=te.useRef(null),_=te.useRef({active:!1,startX:0,startValue:0,lastShift:!1,lastAlt:!1}),F=i!==void 0&&n!==void 0&&i!==n,$=te.useMemo(()=>{if(!F)return 0;const E=c?c.toDisplay(e):e,A=c?c.toDisplay(i):i,me=c?c.toDisplay(n):n;return Math.max(0,Math.min(100,(E-A)/(me-A)*100))},[e,i,n,c,F]),de=te.useMemo(()=>{if(!F||P===void 0)return 0;const E=c?c.toDisplay(P):P,A=c?c.toDisplay(i):i,me=c?c.toDisplay(n):n;return Math.max(0,Math.min(100,(E-A)/(me-A)*100))},[P,i,n,c,F]),re=te.useMemo(()=>{if(!F||S===void 0)return null;const E=c?c.toDisplay(S):S,A=c?c.toDisplay(i):i,me=c?c.toDisplay(n):n;return(E-A)/(me-A)*100},[S,i,n,c,F]),V=te.useCallback(E=>F?Uo(E,i,n,c):0,[F,i,n,c]),U=te.useCallback(E=>{var se;const A=V(E),me=`${A}%`;ce.current&&(ce.current.style.width=me),ae.current&&(ae.current.style.width=me);const Ie=(se=Z.current)==null?void 0:se.querySelector('[data-role="thumb"]');Ie&&(Ie.style.left=`calc(${A}% - 8px)`)},[V]),H=te.useCallback(E=>r?Math.round(E/r)*r:E,[r]),Q=te.useCallback(E=>{if(z||!F||E.button!==0)return;E.preventDefault(),E.stopPropagation(),E.currentTarget.setPointerCapture(E.pointerId);const A=E.currentTarget.getBoundingClientRect(),me=Math.max(0,Math.min(1,(E.clientX-A.left)/A.width)),Ie=c?c.toDisplay(i):i,se=c?c.toDisplay(n):n,Le=H(Ie+me*(se-Ie));let Se=c?c.fromDisplay(Le):Le;l!==void 0&&(Se=Math.max(l,Se)),s!==void 0&&(Se=Math.min(s,Se)),o(Se),U(Se);const Ce=_.current;Ce.active=!0,Ce.startX=E.clientX,Ce.startValue=Le,Ce.lastShift=E.shiftKey,Ce.lastAlt=E.altKey,t==null||t()},[z,F,i,n,c,l,s,o,t,U,H]),X=te.useCallback(E=>{const A=_.current;if(!A.active||z||!F)return;E.preventDefault();const Ie=E.currentTarget.getBoundingClientRect().width,se=c?c.toDisplay(i):i,Le=c?c.toDisplay(n):n,Ce=(Le-se)/Ie;if(A.lastShift!==E.shiftKey||A.lastAlt!==E.altKey){const mt=Ce*(A.lastShift?10:1)*(A.lastAlt?.1:1),at=E.clientX-A.startX;A.startValue=A.startValue+at*mt,A.startX=E.clientX,A.lastShift=E.shiftKey,A.lastAlt=E.altKey}let Ke=Ce;E.shiftKey&&(Ke*=10),E.altKey&&(Ke*=.1);const ht=E.clientX-A.startX;let $e=H(A.startValue+ht*Ke);$e=Math.max(se,Math.min(Le,$e));let Te=c?c.fromDisplay($e):$e;l!==void 0&&(Te=Math.max(l,Te)),s!==void 0&&(Te=Math.min(s,Te)),isNaN(Te)||(o(Te),U(Te))},[z,F,i,n,c,l,s,o,U,H]),ne=te.useCallback(E=>{const A=_.current;A.active&&(A.active=!1,E.currentTarget.releasePointerCapture(E.pointerId),a==null||a())},[a]),De=te.useCallback(()=>{S!==void 0&&!z&&(t==null||t(),o(S),a==null||a(),C==null||C())},[S,z,o,t,a,C]),Pe=J||P!==void 0,Ne=w==="compact";return w==="minimal"?d.jsx("div",{className:k,children:d.jsx(It,{value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r,hardMin:l,hardMax:s,mapping:c,format:h?()=>h:u,mapTextInput:f,defaultValue:S,disabled:z,highlight:Pe,onImmediateChange:U})}):Ne?d.jsxs("div",{className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${z?"opacity-70 pointer-events-none":""} ${k}`,onContextMenu:O,"data-help-id":x,children:[d.jsx("div",{className:"absolute inset-0 bg-white/[0.12]",style:z?{}:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"}}),g&&F&&d.jsx("div",{ref:ce,"data-role":"fill",className:`absolute top-0 bottom-0 left-0 pointer-events-none ${z?"bg-gray-500/20":Pe?"bg-cyan-500/30":"bg-cyan-500/20"}`,style:{width:`${$}%`}}),T&&P!==void 0&&!z&&F&&d.jsx("div",{className:"absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0",style:{left:`calc(${de}% - 0.75px)`}}),d.jsx("div",{className:"absolute inset-0",children:d.jsx(It,{value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r,hardMin:l,hardMax:s,mapping:c,format:h?()=>h:u,mapTextInput:f,defaultValue:S,disabled:z,highlight:Pe,onImmediateChange:U})}),Pe&&!z&&d.jsx("div",{className:"absolute inset-0 bg-cyan-500/10 pointer-events-none"})]}):d.jsxs("div",{className:`mb-px animate-slider-entry ${z?"opacity-70 pointer-events-none":""} ${k}`,"data-help-id":x,onContextMenu:O,children:[p&&d.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[d.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[b,d.jsxs("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${z?"text-gray-600":"text-gray-400"}`,children:[p,m,P!==void 0&&!z&&d.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_4px_#a855f7]"})]})]}),d.jsx("div",{className:"w-1/2 relative bg-white/[0.02] border-l border-white/10 group/num-area touch-none",style:z?{}:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)"},children:d.jsx(It,{value:e,onChange:o,onDragStart:t,onDragEnd:a,step:r,hardMin:l,hardMax:s,mapping:c,format:h?()=>h:u,mapTextInput:f,defaultValue:S,disabled:z,highlight:Pe,onImmediateChange:U})})]}),g&&F&&d.jsxs("div",{ref:Z,className:`relative flex items-center touch-none overflow-hidden ${z?"cursor-not-allowed":"cursor-ew-resize"}`,style:{touchAction:"none",height:v},onPointerDown:Q,onPointerMove:X,onPointerUp:ne,children:[d.jsxs("div",{className:"absolute inset-0 bg-white/10",children:[d.jsx("div",{ref:ae,className:`absolute top-0 bottom-0 left-0 ${z?"bg-gray-400/20":"bg-cyan-500/30"}`,style:{width:`${$}%`}}),T&&P!==void 0&&!z&&d.jsx("div",{className:"absolute top-0 bottom-0 w-1.5 bg-purple-500 blur-[1px] transition-all duration-75 ease-out z-0",style:{left:`calc(${de}% - 0.75px)`}})]}),d.jsx("div",{"data-role":"thumb",className:"absolute top-0 bottom-0 w-4 z-10 pointer-events-none border-l border-r transition-colors",style:{left:`calc(${$}% - 8px)`,borderColor:z?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.25)"}}),re!==null&&d.jsxs(d.Fragment,{children:[d.jsx("div",{className:"absolute w-0.5 h-full bg-white/40 pointer-events-none z-0 transform -translate-x-1/2",style:{left:`${re}%`}}),d.jsx("button",{onPointerDown:E=>{E.preventDefault(),E.stopPropagation()},onClick:E=>{E.preventDefault(),E.stopPropagation(),De()},className:"absolute top-0 bottom-0 right-0 w-2 bg-gray-500/20 hover:bg-gray-400/50 cursor-pointer z-20 transition-colors border-l border-black/10",title:`Reset to ${S}`,"aria-label":"Reset to default",tabIndex:-1})]})]})]})},Xi=[{label:"X",color:"bg-red-500",text:"text-red-400",border:"group-focus-within:border-red-500/50",hoverBg:"hover:bg-red-500/20",accent:"#ef4444"},{label:"Y",color:"bg-green-500",text:"text-green-400",border:"group-focus-within:border-green-500/50",hoverBg:"hover:bg-green-500/20",accent:"#22c55e"},{label:"Z",color:"bg-blue-500",text:"text-blue-400",border:"group-focus-within:border-blue-500/50",hoverBg:"hover:bg-blue-500/20",accent:"#3b82f6"},{label:"W",color:"bg-purple-500",text:"text-purple-400",border:"group-focus-within:border-purple-500/50",hoverBg:"hover:bg-purple-500/20",accent:"#a855f7"}],go=e=>e.includes("red")?{on:"bg-red-500/30 text-red-300 border-red-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("green")?{on:"bg-green-500/30 text-green-300 border-green-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("amber")||e.includes("yellow")?{on:"bg-amber-500/30 text-amber-300 border-amber-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:e.includes("purple")?{on:"bg-purple-500/30 text-purple-300 border-purple-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}:{on:"bg-cyan-500/30 text-cyan-300 border-cyan-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"};function tl({label:e,value:o,onChange:t,options:a,color:r="bg-cyan-600",onLfoToggle:i,isLfoActive:n,icon:l,disabled:s=!1,variant:c="default",labelSuffix:u,onContextMenu:h,...f}){const p=g=>{s||t(g)},m=()=>{s||t(!o)},b=go(r);if(c==="dense"&&!a&&typeof o=="boolean"){const g=go(r);return d.jsxs("div",{className:`flex items-center justify-between px-3 py-1 border-b border-white/5 hover:bg-white/5 transition-colors ${s?"opacity-50 pointer-events-none":"cursor-pointer"}`,"data-help-id":f["data-help-id"],onContextMenu:h,onClick:m,children:[d.jsxs("div",{className:"flex items-center gap-2",children:[l,d.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight truncate select-none",children:e})]}),d.jsx("div",{className:`px-2 py-0.5 text-[8px] font-bold rounded-sm transition-all border ${o?g.on:g.off} ${s?"":"hover:brightness-125"}`,children:o?"ON":"OFF"})]})}return a?d.jsxs("div",{className:`mb-px animate-slider-entry ${s?"opacity-50 pointer-events-none":""}`,"data-help-id":f["data-help-id"],onContextMenu:h,children:[e&&d.jsxs("div",{className:"flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2 gap-2",children:[l,d.jsx("span",{className:"text-[10px] text-gray-400 font-medium tracking-tight truncate select-none pointer-events-none",children:e})]}),d.jsx("div",{className:`flex h-9 md:h-[26px] overflow-hidden ${e?"rounded-b-sm":"rounded-sm"}`,children:a.map(g=>d.jsx("button",{onClick:()=>p(g.value),disabled:s,className:`
                                flex-1 min-w-0 flex items-center justify-center text-[9px] font-bold border-r border-white/5 last:border-r-0 transition-all truncate
                                ${o===g.value?"bg-cyan-500/30 text-cyan-300 border-cyan-500/40":"bg-white/[0.04] text-gray-600 hover:brightness-125"}
                            `,title:g.tooltip||g.label,children:g.label},String(g.value)))})]}):d.jsx("div",{className:`mb-px animate-slider-entry ${s?"opacity-50 pointer-events-none":""}`,"data-help-id":f["data-help-id"],onContextMenu:h,children:d.jsxs("div",{className:`group/toggle flex items-stretch h-9 md:h-[26px] overflow-hidden rounded-sm transition-colors ${e?"bg-white/[0.12]":""} ${s?"":"cursor-pointer hover:bg-white/[0.18]"}`,onClick:m,children:[e&&d.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0 select-none",children:[l,d.jsx("span",{className:"text-[10px] text-gray-400 group-hover/toggle:text-gray-300 font-medium tracking-tight truncate transition-colors",children:e}),u]}),d.jsxs("div",{className:`flex ${e?"border-l border-white/5":"flex-1"}`,children:[d.jsx("div",{className:`
                            flex items-center justify-center gap-1 px-3 text-[10px] font-bold transition-all border-0 ${o?b.on:b.off} ${s?"opacity-40":"hover:brightness-125"}
                            ${e?"":"flex-1"}
                        `,children:d.jsx("span",{className:`text-[8px] ${o?"opacity-90":"opacity-50"}`,children:o?"ON":"OFF"})}),i&&d.jsx("button",{onClick:g=>{g.stopPropagation(),s||i()},disabled:s,className:`
                                flex items-center justify-center px-2 text-[10px] font-bold transition-all border-l border-white/5 ${n?"bg-purple-500/30 text-purple-300":"bg-white/[0.04] text-gray-600 hover:brightness-125"}
                            `,title:"LFO",children:d.jsx("span",{className:`text-[8px] ${n?"opacity-90":"opacity-50"}`,children:"LFO"})})]})]})})}function ol({label:e,value:o,options:t,onChange:a,fullWidth:r,className:i="",selectClassName:n="",labelSuffix:l,onContextMenu:s,disabled:c=!1,...u}){const h=f=>{var b;const p=f.target.value,m=typeof((b=t[0])==null?void 0:b.value)=="number";a(m?Number(p):p)};return d.jsxs("div",{className:`flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 ${r?"w-full":""} ${c?"opacity-50 pointer-events-none":""} ${i}`,"data-help-id":u["data-help-id"],onContextMenu:s,children:[e&&d.jsx("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:d.jsxs("label",{className:"text-[10px] font-medium tracking-tight select-none truncate pointer-events-none text-gray-400",children:[e,l]})}),d.jsxs("div",{className:`${e?"w-1/2":"w-full"} relative border-l border-white/10 bg-white/[0.02] border-t border-t-white/5`,children:[d.jsx("select",{value:o,onChange:h,disabled:c,className:`w-full h-full bg-transparent text-[10px] font-medium text-gray-200 px-2 pr-6 outline-none cursor-pointer appearance-none text-center ${n}`,children:t.map(f=>d.jsx("option",{value:String(f.value),className:"bg-[#111] text-gray-300",children:f.label},String(f.value)))}),d.jsx("div",{className:"absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500",children:d.jsx("div",{className:"w-2.5 h-2.5",children:d.jsx(Gi,{})})})]})]})}const We={text:"text-cyan-400",textSubtle:"text-cyan-600",bgSolid:"bg-cyan-900",bgMed:"bg-cyan-700",bgBright:"bg-cyan-600/40",hoverBg:"hover:bg-cyan-500/50"},al={bgMed:"bg-purple-700"},yo={text:"text-amber-400",bg:"bg-amber-900/20",border:"border-amber-500/20",btnBg:"bg-amber-600",btnHover:"hover:bg-amber-500",btnText:"text-black"},Xe={dock:"bg-[#080808]",tabBar:"bg-black/40",nested:"bg-black/20",divider:"bg-neutral-800",panelHeader:"bg-gray-800/80",input:"bg-gray-900",tint:"bg-white/5",hoverSubtle:"hover:bg-white/5",hoverMed:"hover:bg-white/10"},Re={primary:"text-white",label:"text-gray-400",dimLabel:"text-gray-500",faint:"text-gray-600",ghost:"text-gray-700"},Wo={subtle:"border-white/5",standard:"border-white/10"},rl=`${Xe.dock} ${We.text} border-x border-t ${Wo.standard} z-10 -mb-px pb-2`,il=`${Re.dimLabel} ${Xe.hoverSubtle} hover:text-gray-300 border border-transparent`,nl=`${We.bgSolid} ${We.text}`,sl=`${Re.faint} ${Xe.hoverMed}`,ll=`${We.textSubtle}`,cl=`${Re.ghost}`,dl=`${Xe.nested} p-2 rounded border ${Wo.subtle}`,ul=`${yo.bg} border ${yo.border}`,fl=`${We.bgMed} ${Re.primary}`,pl=`${Re.dimLabel} hover:text-gray-300`,hl=`${Re.ghost} cursor-not-allowed opacity-50 bg-transparent`,ml=`${We.bgBright} text-cyan-300 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]`,gl=`bg-transparent ${Re.dimLabel} hover:text-gray-300 ${Xe.hoverSubtle}`,Yi={primary:`text-[10px] font-bold ${Re.label}`,secondary:`text-[9px] font-bold ${Re.dimLabel}`,tiny:`text-[8px] ${Re.faint}`},Ki=({children:e,variant:o="primary",className:t="",color:a})=>{const r=Yi[o],i=a||"";return d.jsx("span",{className:`${r} ${i} select-none ${t}`,children:e})},yl=()=>d.jsxs(d.Fragment,{children:[d.jsx("div",{className:`h-1.5 ${Xe.divider} rounded-b-lg`}),d.jsx("div",{className:"h-2",style:{background:"linear-gradient(to bottom, transparent, rgba(255,255,255,0.08))"}})]}),Me=({axisIndex:e,value:o,min:t,max:a,step:r,onUpdate:i,onDragStart:n,onDragEnd:l,disabled:s,highlight:c,mapping:u,mapTextInput:h,liveValue:f,defaultValue:p,hardMin:m,hardMax:b,customLabel:g})=>{const y=Xi[e],v=g||y.label;return d.jsxs("div",{"data-axis-index":e,className:`relative flex-1 h-9 md:h-[26px] overflow-hidden group transition-all duration-150 ${s?"opacity-50 pointer-events-none":""}`,children:[d.jsx("div",{className:`
                    absolute top-0 bottom-0 left-0 w-5 flex items-center justify-center
                    border-r border-white/10 bg-white/[0.05] select-none z-20
                    cursor-pointer hover:bg-white/[0.15] active:bg-white/20 transition-colors
                `,onDoubleClick:w=>{w.preventDefault(),w.stopPropagation(),p!==void 0&&(n==null||n(),i(p),l==null||l())},title:p!==void 0?`Double-click to reset to ${p}`:"No default value",children:d.jsx("span",{className:`text-[10px] font-bold ${y.text} pointer-events-none`,children:v})}),d.jsx("div",{className:"absolute inset-0 left-5",children:d.jsx(Wi,{value:o,onChange:i,onDragStart:n,onDragEnd:l,step:r,min:t,max:a,hardMin:m,hardMax:b,mapping:u,mapTextInput:h,disabled:s,highlight:c,liveValue:f,defaultValue:p,variant:"compact",showTrack:!0})})]})},bo=[{label:"X",color:"bg-red-500",text:"text-red-400",border:"group-focus-within:border-red-500/50",hoverBg:"hover:bg-red-500/20",accent:"#ef4444"},{label:"Y",color:"bg-green-500",text:"text-green-400",border:"group-focus-within:border-green-500/50",hoverBg:"hover:bg-green-500/20",accent:"#22c55e"},{label:"Z",color:"bg-blue-500",text:"text-blue-400",border:"group-focus-within:border-blue-500/50",hoverBg:"hover:bg-blue-500/20",accent:"#3b82f6"},{label:"W",color:"bg-purple-500",text:"text-purple-400",border:"group-focus-within:border-purple-500/50",hoverBg:"hover:bg-purple-500/20",accent:"#a855f7"}],it=({primaryAxis:e,secondaryAxis:o,primaryIndex:t,secondaryIndex:a,primaryValue:r,secondaryValue:i,min:n,max:l,step:s,onUpdate:c,onDragStart:u,onDragEnd:h,disabled:f,onHover:p})=>{const[m,b]=L.useState(!1),g=L.useRef(!1),y=L.useRef(!1),v=L.useRef({x:0,y:0}),w=L.useRef({primary:0,secondary:0}),k=L.useRef(!1),S=L.useRef(!1),C=L.useRef(!1),P=bo[t],T=bo[a],O=()=>{b(!0),p(!0)},x=()=>{g.current||(b(!1),p(!1))},z=_=>{f||_.button!==0&&_.button!==1||(_.preventDefault(),_.stopPropagation(),_.currentTarget.setPointerCapture(_.pointerId),v.current={x:_.clientX,y:_.clientY},w.current={primary:r,secondary:i},k.current=!1,S.current=_.shiftKey,C.current=_.altKey,g.current=!0,y.current=_.button===1,u())},J=_=>{if(f||!g.current||!_.currentTarget.hasPointerCapture(_.pointerId))return;const F=_.clientX-v.current.x,$=_.clientY-v.current.y;if((Math.abs(F)>1||Math.abs($)>1)&&(k.current=!0),!k.current&&Math.abs(F)<1&&Math.abs($)<1)return;_.preventDefault(),_.stopPropagation();const de=S.current!==_.shiftKey,re=C.current!==_.altKey;if(de||re){let V=s*.5;S.current&&(V*=10),C.current&&(V*=.1),w.current.primary=w.current.primary+F*V,w.current.secondary=w.current.secondary-$*V,v.current={x:_.clientX,y:_.clientY},S.current=_.shiftKey,C.current=_.altKey}if(y.current){let V=.01;_.shiftKey&&(V*=3),_.altKey&&(V*=.3);const U=1+$*V;let H=w.current.primary*U,Q=w.current.secondary*U;!isNaN(H)&&!isNaN(Q)&&c(H,Q)}else{let V=s*.5;_.shiftKey&&(V*=10),_.altKey&&(V*=.1);let U=w.current.primary+F*V,H=w.current.secondary-$*V;!isNaN(U)&&!isNaN(H)&&c(U,H)}},ce=_=>{f||(_.currentTarget.releasePointerCapture(_.pointerId),g.current=!1,y.current=!1,h(),k.current=!1,_.currentTarget.matches(":hover")||(b(!1),p(!1)))},ae=_=>{f||(_.preventDefault(),_.stopPropagation(),u(),c(0,0),h())},Z=m||g.current;return d.jsxs("div",{className:`
                w-6 h-9 md:h-[26px] flex-shrink-0 cursor-move overflow-hidden
                transition-all duration-150 ease-out relative
                ${Z?"bg-white/10 border border-white/30":"bg-white/[0.08] border border-white/5"}
                ${f?"opacity-30 pointer-events-none":""}
            `,onPointerDown:z,onPointerMove:J,onPointerUp:ce,onMouseEnter:O,onMouseLeave:x,onDoubleClick:ae,title:`Drag: Horizontal=${e.toUpperCase()}, Vertical=${o.toUpperCase()} | Middle-click: Scale both proportionally | Double-click: Reset (Shift=Fast, Alt=Slow)`,children:[Z&&d.jsx("div",{className:"absolute inset-0 opacity-30",style:{backgroundImage:"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)"}}),d.jsxs("div",{className:"relative w-full h-full",children:[d.jsx("div",{className:`
                        absolute bottom-0 left-0 h-[2px] ${P.color}
                        transition-all duration-150
                        ${Z?"opacity-60 w-full":"opacity-0 w-0"}
                    `}),d.jsx("div",{className:`
                        absolute bottom-0 left-0 w-[2px] ${T.color}
                        transition-all duration-150
                        ${Z?"opacity-60 h-full":"opacity-0 h-0"}
                    `}),d.jsxs("div",{className:`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        transition-opacity duration-150 pointer-events-none
                        ${Z?"opacity-100":"opacity-0"}
                    `,children:[d.jsx("div",{className:`absolute w-2 h-[1px] ${P.color} -translate-x-1/2`}),d.jsx("div",{className:`absolute h-2 w-[1px] ${T.color} -translate-y-1/2`})]}),d.jsx("div",{className:`
                        absolute inset-0 pointer-events-none
                        transition-opacity duration-150
                        ${y.current?"opacity-100":"opacity-0"}
                    `,children:d.jsxs("div",{className:"absolute inset-0 flex items-center justify-center",children:[d.jsx("div",{className:"w-full h-[1px] bg-cyan-400/50 rotate-45"}),d.jsx("div",{className:"absolute w-full h-[1px] bg-cyan-400/50 -rotate-45"})]})})]})]})},vo=({azimuth:e,pitch:o,onChange:t,onDragStart:a,onDragEnd:r,disabled:i=!1,size:n=80})=>{const l=L.useRef(null),s=L.useRef(!1),[c,u]=L.useState(!1),[h,f]=L.useState(!1),[p,m]=L.useState(!1),b=L.useRef({x:0,y:0}),g=L.useRef({azimuth:e,pitch:o}),y=L.useRef({azimuth:e,pitch:o}),v=L.useRef(null);L.useEffect(()=>{g.current={azimuth:e,pitch:o}},[e,o]);const S=h?.05:.5,C=n/2,P=n*.38,T=L.useCallback((_,F,$)=>{const de=_/(Math.PI/2)*$,re=-(F/(Math.PI/2))*$;return{x:de,y:re}},[]),O=L.useMemo(()=>T(e,o,P),[e,o,P,T]),x=L.useMemo(()=>{const _=Math.cos(o),F=Math.sin(o),$=Math.cos(e),re=Math.sin(e)*_,V=F,U=-$*_,H=re,Q=-V,X=Math.sqrt(H*H+Q*Q),ne=U>0,De=X>.001?Math.min(X,1)*P:0,Pe=U<=0?1+(1-Math.min(X,1))*.5:1-U*.95,Ne=X>.001?H/X*De:0,xe=X>.001?Q/X*De:0;return{x:Ne,y:xe,isBack:ne,length:De,headScale:Pe,dirX:re,dirY:V,dirZ:U}},[e,o,P]),z=L.useCallback((_,F,$)=>{const de=_/$*(Math.PI/2),re=-(F/$)*(Math.PI/2);return{azimuth:de,pitch:re}},[]),J=L.useCallback((_,F)=>{let $=_,de=F;p&&v.current&&(v.current==="x"?de=0:$=0);const re=$*S,V=de*S,U=T(g.current.azimuth,g.current.pitch,P),H=U.x+re,Q=U.y+V,{azimuth:X,pitch:ne}=z(H,Q,P);p&&v.current?v.current==="x"?(g.current={azimuth:X,pitch:y.current.pitch},t(X,y.current.pitch)):(g.current={azimuth:y.current.azimuth,pitch:ne},t(y.current.azimuth,ne)):(g.current={azimuth:X,pitch:ne},t(X,ne))},[T,z,t,P,S,p]),ce=_=>{i||_.button===0&&(_.preventDefault(),_.stopPropagation(),_.currentTarget.setPointerCapture(_.pointerId),s.current=!0,u(!0),b.current={x:_.clientX,y:_.clientY},g.current={azimuth:e,pitch:o},y.current={azimuth:e,pitch:o},v.current=null,a==null||a(),f(_.altKey),m(_.shiftKey))},ae=_=>{if(i||!s.current)return;const F=_.clientX-b.current.x,$=_.clientY-b.current.y;b.current={x:_.clientX,y:_.clientY},f(_.altKey),m(_.shiftKey),p&&!v.current&&(Math.abs(F)>2||Math.abs($)>2)&&(v.current=Math.abs(F)>Math.abs($)?"x":"y"),J(F,$)},Z=_=>{s.current&&(s.current=!1,u(!1),f(!1),m(!1),v.current=null,r==null||r())};return d.jsxs("div",{ref:l,className:`
                relative rounded-full border border-white/10 bg-black/40
                cursor-crosshair touch-none overflow-hidden
                transition-all duration-200
                ${i?"opacity-50 pointer-events-none":""}
                ${c?"scale-105 border-cyan-500/50":"hover:border-white/20"}
            `,style:{width:n,height:n,touchAction:"none",boxShadow:c?"0 0 20px rgba(34, 211, 238, 0.3)":"none"},onPointerDown:ce,onPointerMove:ae,onPointerUp:Z,onPointerLeave:Z,onDoubleClick:_=>{i||(_.preventDefault(),_.stopPropagation(),a==null||a(),t(0,0),r==null||r())},onContextMenu:_=>{},title:"Drag to rotate direction, Double-click to reset",children:[d.jsx("div",{className:"absolute rounded-full border border-white/10 pointer-events-none",style:{width:P*2,height:P*2,left:C-P,top:C-P}}),d.jsx("div",{className:"absolute w-full h-px bg-white/10 pointer-events-none",style:{top:C}}),d.jsx("div",{className:"absolute h-full w-px bg-white/10 pointer-events-none",style:{left:C}}),d.jsx("div",{className:"absolute w-1.5 h-1.5 bg-white/40 rounded-full pointer-events-none",style:{left:C-3,top:C-3}}),d.jsx("div",{className:"absolute pointer-events-none rounded-full transition-transform duration-75",style:{left:C+O.x,top:C+O.y,width:8,height:8,marginLeft:-4,marginTop:-4,background:x.isBack?"#ef4444":"#22d3ee",boxShadow:`0 0 8px ${x.isBack?"#ef4444":"#22d3ee"}`,transform:c?"scale(1.2)":"scale(1)"}}),x.isBack&&d.jsx("div",{className:"absolute inset-0 rounded-full border-2 border-red-500/30 pointer-events-none animate-pulse"}),d.jsxs(d.Fragment,{children:[d.jsxs("svg",{className:"absolute inset-0 pointer-events-none",style:{width:n,height:n},children:[Math.abs(e)>.01&&d.jsxs(d.Fragment,{children:[d.jsx("ellipse",{cx:C,cy:C,rx:P*Math.abs(Math.sin(e)),ry:P,fill:"none",stroke:x.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:x.isBack?.175:.35,clipPath:x.x>0?"url(#longitudeRight)":"url(#longitudeLeft)"}),d.jsx("ellipse",{cx:C,cy:C,rx:P*Math.abs(Math.sin(e)),ry:P,fill:"none",stroke:x.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:x.isBack?.35:.175,clipPath:x.x>0?"url(#longitudeLeft)":"url(#longitudeRight)"})]}),Math.abs(o)>.01&&d.jsxs(d.Fragment,{children:[d.jsx("ellipse",{cx:C,cy:C,rx:P,ry:P*Math.abs(Math.sin(o)),fill:"none",stroke:x.isBack?"#ef4444":"#22d3ee",strokeWidth:"1.5",opacity:x.isBack?.15:.3,clipPath:x.y<0?"url(#latitudeTop)":"url(#latitudeBottom)"}),d.jsx("ellipse",{cx:C,cy:C,rx:P,ry:P*Math.abs(Math.sin(o)),fill:"none",stroke:x.isBack?"#22d3ee":"#ef4444",strokeWidth:"1.5",opacity:x.isBack?.3:.15,clipPath:x.y<0?"url(#latitudeBottom)":"url(#latitudeTop)"})]}),d.jsxs("defs",{children:[d.jsx("clipPath",{id:"longitudeRight",children:d.jsx("rect",{x:C,y:"0",width:C,height:n})}),d.jsx("clipPath",{id:"longitudeLeft",children:d.jsx("rect",{x:"0",y:"0",width:C,height:n})}),d.jsx("clipPath",{id:"latitudeTop",children:d.jsx("rect",{x:"0",y:"0",width:n,height:C})}),d.jsx("clipPath",{id:"latitudeBottom",children:d.jsx("rect",{x:"0",y:C,width:n,height:C})})]}),d.jsx("line",{x1:C,y1:C,x2:C+x.x,y2:C+x.y,stroke:x.isBack?"#ef4444":"#22d3ee",strokeWidth:"2",strokeDasharray:"4 2",opacity:.3+x.length/P*.5}),d.jsx("polygon",{points:"0,-8 -6,4 6,4",fill:x.isBack?"#ef4444":"#22d3ee",opacity:Math.max(.1,.6+(x.headScale-1)*.4),transform:`translate(${C+x.x}, ${C+x.y}) rotate(${Math.atan2(x.y,x.x)*180/Math.PI+90}) scale(${Math.max(.9,.9+x.headScale*.1)}, ${Math.max(.05,x.headScale)})`})]}),c&&d.jsx("div",{className:"absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap",children:d.jsxs("span",{className:"text-[9px] text-cyan-400 font-mono bg-black/60 px-1 rounded",children:[(e*180/Math.PI).toFixed(0),"° / ",(o*180/Math.PI).toFixed(0),"°"]})})]})]})},Ct=Math.PI/180,Ji=180/Math.PI,Zi=["x","y","z","w"],Mt={x:0,y:1,z:2,w:3},Qi=e=>{const o=e.length();if(o<1e-9)return{azimuth:0,pitch:0};const t=Math.max(-1,Math.min(1,e.y/o));return{azimuth:Math.atan2(e.x/o,e.z/o),pitch:Math.asin(t)}},en=(e,o)=>{const t=Math.cos(o);return new j(t*Math.sin(e),Math.sin(o),t*Math.cos(e))},bl=({label:e,value:o,onChange:t,min:a=-1e4,max:r=1e4,step:i=.01,disabled:n=!1,convertRadToDeg:l=!1,mode:s="normal",modeToggleable:c=!1,showLiveIndicator:u=!1,liveValue:h,defaultValue:f,hardMin:p,hardMax:m,axisMin:b,axisMax:g,axisStep:y,onDragStart:v,onDragEnd:w,headerRight:k,showDualAxisPads:S=!0,linkable:C=!1,scale:P})=>{const[T,O]=L.useState(o.clone()),[x,z]=L.useState(null),[J,ce]=L.useState(s),[ae,Z]=L.useState("degrees"),[_,F]=L.useState("degrees"),[$,de]=L.useState(C),re=L.useRef(!1),V=L.useRef(null),U=L.useRef(null);L.useEffect(()=>{ce(s)},[s]);const H=ge(I=>I.openContextMenu),Q="w"in o,X="z"in o,ne=J==="rotation",De=J==="toggle",Pe=J==="mixed",Ne=J==="direction"&&X,xe=Ne?Qi(T):{azimuth:0,pitch:0},Ye=(I,D)=>{const G=Math.max(-Math.PI/2,Math.min(Math.PI/2,D)),W=en(I,G);se(0,I),se(1,G),O(W),t(W)};L.useEffect(()=>{if(re.current)return;const I=1e-4,D=Math.abs(o.x-T.x),G=Math.abs(o.y-T.y),W=X?Math.abs(o.z-T.z):0,ye=Q?Math.abs(o.w-T.w):0;(D>I||G>I||W>I||ye>I)&&O(o.clone())},[o,X,Q]);const E=()=>{re.current=!0,V.current=T.clone(),v&&v()},A=()=>{V.current=null,re.current=!1,w&&w()},me=I=>{if(ne)return ae==="degrees"?Qe:mo;if(P==="pi")return _==="pi"?mo:Qe;if(l)return Qe},Ie=I=>{if(ne){const ee=ae==="degrees"?60*Math.PI/180:.05;return{min:-2*Math.PI,max:2*Math.PI,step:ee,hardMin:void 0,hardMax:void 0}}const D=b||{x:a,y:a,z:a},G=g||{x:r,y:r,z:r},W=y||{x:i,y:i,z:i},ye=P==="pi"&&_==="degrees"?Ji:1;return{min:D[I],max:G[I],step:(W[I]??i)*ye,hardMin:p,hardMax:m}},se=(I,D)=>{const G=U.current;if(!G)return;const W=G.querySelector(`[data-axis-index="${I}"]`);if(!W)return;const ye=Zi[I],ee=me(),At=W.querySelector('[data-role="value"]');At&&(At.textContent=ee!=null&&ee.format?ee.format(D):qo(D));const Dt=W.querySelector('[data-role="fill"]');if(Dt){const Ft=Ie(ye),Ot=Ft.min??a,jt=Ft.max??r;if(Ot!==jt){const ea=Uo(D,Ot,jt,ee);Dt.style.width=`${ea}%`}}},Le=(I,D)=>{const G=V.current||T,W=G.clone();if($&&!ne){const ye=G[I],ee=D-ye;W.x=G.x+ee,W.y=G.y+ee,X&&(W.z=G.z+ee),Q&&(W.w=G.w+ee),se(0,W.x),se(1,W.y),X&&se(2,W.z),Q&&se(3,W.w)}else W[I]=D;O(W),t(W)},Se=(I,D,G,W)=>{const ee=(V.current||T).clone();ee[I]=G,ee[D]=W,se(Mt[I],G),se(Mt[D],W),O(ee),t(ee)},Ce=x==="xy",Ke=x==="xy"||x==="zy",ht=x==="zy"||x==="wz",$e=x==="wz",Te=I=>{if(h)return h[I]},mt=I=>{if(f)return f[I]},at=T,Yo={x:Ce,y:Ke,z:ht,w:$e},ze=I=>({axisIndex:Mt[I],value:T[I],...Ie(I),onUpdate:D=>Le(I,D),onDragStart:E,onDragEnd:A,disabled:n,highlight:Yo[I],mapping:me(),mapTextInput:ne||P==="pi",liveValue:u?Te(I):void 0,defaultValue:mt(I)}),Ko=[{on:"bg-red-500/30 text-red-300 border-red-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-green-500/30 text-green-300 border-green-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-blue-500/30 text-blue-300 border-blue-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"},{on:"bg-purple-500/30 text-purple-300 border-purple-500/40",off:"bg-white/[0.04] text-gray-600 border-white/5"}],zt=(I,D,G)=>{const ye=T[I]>.5,ee=Ko[D];return d.jsxs("button",{className:`flex items-center justify-center gap-1 text-[10px] font-bold transition-all border ${ye?ee.on:ee.off} ${n?"opacity-40 pointer-events-none":"cursor-pointer hover:brightness-125"} ${G||"flex-1"}`,onClick:()=>Le(I,ye?0:1),disabled:n,children:[G?null:d.jsx("span",{children:I}),d.jsx("span",{className:`text-[8px] ${ye?"opacity-80":"opacity-70"}`,children:ye?"ON":"OFF"})]},I)},Jo=()=>c?d.jsx("button",{onClick:()=>ce(I=>I==="rotation"?"normal":"rotation"),className:`text-[10px] p-1 rounded transition-colors mr-2 ${J==="rotation"?"text-cyan-400 bg-cyan-500/20":"text-gray-500 hover:text-gray-300"}`,title:J==="rotation"?"Rotation mode (π units)":"Normal mode",children:"⟳"}):null,Zo=()=>!C||ne?null:d.jsx("button",{onClick:()=>de(I=>!I),className:`p-1 rounded transition-colors mr-2 ${$?"text-cyan-400 bg-cyan-500/20":"text-gray-600 hover:text-gray-400"}`,title:$?"Axes linked (uniform)":"Link axes",children:d.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[d.jsx("path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}),d.jsx("path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"})]})}),Qo=I=>{const D=[];ne&&D.push({label:"Rotation Units",action:()=>{},isHeader:!0},{label:"Degrees (°)",checked:ae==="degrees",action:()=>Z("degrees")},{label:"Radians (π)",checked:ae==="radians",action:()=>Z("radians")}),!ne&&P==="pi"&&D.push({label:"Display Units",action:()=>{},isHeader:!0},{label:"Radians (π)",checked:_==="pi",action:()=>F("pi")},{label:"Degrees (°)",checked:_==="degrees",action:()=>F("degrees")}),X&&(s==="rotation"||s==="axes")&&D.push({label:"Display Mode",action:()=>{},isHeader:!0},{label:"Azimuth / Pitch (A/P)",checked:J==="rotation",action:()=>ce("rotation")},{label:"Per-Axis (X/Y/Z)",checked:J==="axes"||J==="normal",action:()=>ce("normal")}),D.length!==0&&(I.preventDefault(),I.stopPropagation(),H(I.clientX,I.clientY,D,["ui.vector"]))};return d.jsxs("div",{className:"mb-px animate-slider-entry",children:[e&&d.jsxs("div",{className:"flex items-stretch bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5",children:[d.jsxs("div",{className:"flex-1 flex items-center gap-2 px-2 min-w-0",children:[c&&Jo(),k,d.jsx("label",{className:`text-[10px] font-medium tracking-tight select-none flex items-center gap-2 truncate pointer-events-none ${n?"text-gray-600":"text-gray-400"}`,children:e})]}),C&&!ne&&d.jsx("div",{className:"flex items-center px-1 border-l border-white/5",children:Zo()})]}),d.jsx("div",{className:"relative h-9 md:h-[26px] flex items-center touch-none overflow-hidden rounded-b-sm",style:{touchAction:"none"},onContextMenu:Qo,"data-help-id":"ui.vector",children:d.jsx("div",{ref:U,className:"flex gap-px w-full h-full",children:De?d.jsx(d.Fragment,{children:["x","y","z","w"].slice(0,Q?4:X?3:2).map((I,D)=>zt(I,D))}):Pe?d.jsxs(d.Fragment,{children:[zt("x",0,"w-14 flex-shrink-0"),d.jsx(Me,{...ze("y"),disabled:n||T.x<.5})]}):Ne?d.jsxs(d.Fragment,{children:[d.jsx("div",{className:"flex items-center justify-center px-1 flex-shrink-0",children:d.jsx(vo,{azimuth:xe.azimuth,pitch:xe.pitch,onChange:(I,D)=>{Ye(I,D)},onDragStart:E,onDragEnd:A,disabled:n,size:56})}),d.jsx(Me,{axisIndex:0,value:xe.azimuth,min:-Math.PI,max:Math.PI,step:Ct,onUpdate:I=>Ye(I,xe.pitch),onDragStart:E,onDragEnd:A,disabled:n,mapping:Qe,mapTextInput:!0,customLabel:"Az"}),d.jsx(it,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:xe.azimuth,secondaryValue:xe.pitch,min:-Math.PI,max:Math.PI,step:Ct,onUpdate:(I,D)=>Ye(I,D),onDragStart:E,onDragEnd:A,disabled:n,onHover:I=>z(I?"xy":null)}),d.jsx(Me,{axisIndex:1,value:xe.pitch,min:-Math.PI/2,max:Math.PI/2,step:Ct,onUpdate:I=>Ye(xe.azimuth,I),onDragStart:E,onDragEnd:A,disabled:n,mapping:Qe,mapTextInput:!0,customLabel:"Pt"})]}):ne?d.jsxs(d.Fragment,{children:[X&&d.jsx(Me,{...ze("z"),customLabel:"∠"}),d.jsx("div",{className:"flex items-center justify-center px-1",children:d.jsx(vo,{azimuth:T.x,pitch:T.y,onChange:(I,D)=>{const G=T.clone();G.x=I,G.y=D,se(0,I),se(1,D),O(G),t(G)},onDragStart:E,onDragEnd:A,disabled:n,size:56})}),d.jsx("div",{className:"contents",children:d.jsx(Me,{...ze("x"),customLabel:"A"})}),d.jsx(Me,{...ze("y"),customLabel:"P"})]}):d.jsxs(d.Fragment,{children:[d.jsx("div",{className:"contents",children:d.jsx(Me,{...ze("x")})}),S&&d.jsx(it,{primaryAxis:"x",secondaryAxis:"y",primaryIndex:0,secondaryIndex:1,primaryValue:T.x,secondaryValue:T.y,min:a,max:r,step:i,onUpdate:(I,D)=>Se("x","y",I,D),onDragStart:E,onDragEnd:A,disabled:n,onHover:I=>z(I?"xy":null)}),d.jsx(Me,{...ze("y")}),X&&S&&d.jsx(it,{primaryAxis:"z",secondaryAxis:"y",primaryIndex:2,secondaryIndex:1,primaryValue:at.z,secondaryValue:at.y,min:a,max:r,step:i,onUpdate:(I,D)=>Se("z","y",I,D),onDragStart:E,onDragEnd:A,disabled:n,onHover:I=>z(I?"zy":null)}),X&&d.jsx(Me,{...ze("z")}),Q&&S&&d.jsx(it,{primaryAxis:"x",secondaryAxis:"z",primaryIndex:3,secondaryIndex:2,primaryValue:T.w,secondaryValue:T.z,min:a,max:r,step:i,onUpdate:(I,D)=>Se("w","z",I,D),onDragStart:E,onDragEnd:A,disabled:n,onHover:I=>z(I?"wz":null)}),Q&&d.jsx(Me,{...ze("w")})]})})})]})},tn={default:"",panel:"px-2 py-0.5 text-[9px] font-bold text-gray-500 hover:text-gray-300 bg-neutral-800 rounded-sm"},on=({open:e})=>d.jsx("svg",{className:`w-2 h-2 transition-transform ${e?"rotate-90":""}`,viewBox:"0 0 6 10",fill:"currentColor",children:d.jsx("path",{d:"M0 0l6 5-6 5z"})}),vl=({label:e,children:o,defaultOpen:t=!0,count:a,labelVariant:r="secondary",labelColor:i,rightContent:n,className:l="",headerClassName:s="",variant:c="default",open:u,onToggle:h})=>{const f=s||tn[c],[p,m]=L.useState(t),b=u!==void 0,g=b?u:p,y=()=>{h&&h(),b||m(v=>!v)};return d.jsxs("div",{className:l,children:[d.jsxs("div",{className:`flex items-center gap-1.5 w-full px-2 py-1 text-left select-none hover:bg-white/5 transition-colors rounded-sm ${f}`,children:[d.jsxs("button",{onClick:y,className:"flex items-center gap-1.5 flex-1 min-w-0",children:[d.jsx(on,{open:g}),d.jsx(Ki,{variant:r,color:i,children:e}),a!==void 0&&d.jsx("span",{className:"text-[8px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded ml-1",children:a})]}),n&&d.jsx("div",{className:"ml-auto flex items-center gap-1",children:n})]}),g&&o]})},an=`
  /*
   * --- GMT SHADER API REFERENCE ---
   *
   * Scalar Parameters (float uniforms — mapped to UI sliders):
   *   uParamA, uParamB, uParamC, uParamD, uParamE, uParamF
   *
   * Vector Parameters (mapped to multi-axis UI controls):
   *   vec2 uVec2A, uVec2B, uVec2C
   *   vec3 uVec3A, uVec3B, uVec3C
   *   vec4 uVec4A, uVec4B, uVec4C
   *
   * System Uniforms:
   *   int   uIterations      — Iteration count (user-adjustable)
   *   float uTime            — Elapsed time in seconds
   *   vec3  uJulia           — Julia seed coordinates (if Julia mode active)
   *   float uJuliaMode       — 1.0 if Julia mode active, 0.0 otherwise
   *   float uDistanceMetric  — 0=Euclidean, 1=Chebyshev, 2=Manhattan, 3=Quartic
   *
   * Built-in Helper Functions:
   *   void  sphereFold(inout vec3 z, inout float dz, float minR, float fixedR)
   *   void  boxFold(inout vec3 z, inout float dz, float foldLimit)
   *   float snoise(vec3 v)                — Simplex Noise (-1.0 to 1.0)
   *   float getLength(vec3 p)             — Distance metric (respects uDistanceMetric)
   *
   * Rotation Helpers (branchless, CPU-precomputed matrices):
   *   void applyPreRotation(inout vec3 p)   — Applied inside loop, before formula
   *   void applyPostRotation(inout vec3 p)  — Applied inside loop, after formula
   *   void applyWorldRotation(inout vec3 p) — Applied before iteration loop
   *
   * Formula Function Signature:
   *   void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)
   *     z    : Current coordinate (.xyz = position, .w = auxiliary)
   *     dr   : Running derivative (float) — used for distance estimation
   *     trap : Orbit trap accumulator (float) — used for coloring
   *     c    : Constant for the fractal (Julia seed or initial position)
   *
   * To modify this formula, edit the GLSL blocks below directly.
   * The Metadata JSON block configures parameter names, ranges, and defaults.
   */
`,Xo=e=>JSON.stringify(e,null,2).replace(/\{\n\s+"label":[\s\S]+?\}/g,o=>o.includes('"id": "param')?o.replace(/\n\s+/g," "):o).replace(/"(cameraPos|cameraRot|sceneOffset|julia|position)": \{\n\s+"[xyz]":[\s\S]+?\}/g,o=>o.replace(/\n\s+/g," ")).replace(/"params": \{\n\s+"A":[\s\S]+?\}/g,o=>o.replace(/\n\s+/g," ")),et=e=>{const o=e.split(`
`);for(;o.length>0&&o[0].trim()==="";)o.shift();for(;o.length>0&&o[o.length-1].trim()==="";)o.pop();if(o.length===0)return"";if(o.length===1)return o[0].trim();let t=1/0;for(const a of o){if(a.trim().length===0)continue;const r=a.match(/^(\s*)/);r&&(t=Math.min(t,r[1].length))}return t===0||t===1/0?o.join(`
`):o.map(a=>a.slice(t)).join(`
`)},rn=(e,o)=>{var l;const{shader:t,...a}=e,r={};(l=t.preambleVars)!=null&&l.length&&(r.preambleVars=t.preambleVars),t.usesSharedRotation&&(r.usesSharedRotation=!0);const i={...a,...Object.keys(r).length>0?{shaderMeta:r}:{},defaultPreset:o};let n=`<!--
  GMF: GPU Mandelbulb Format v1.0
  A portable container for Fractal math definitions + default presets.
  You can edit the GLSL blocks below directly.
-->
${an}
`;return n+=`<Metadata>
${Xo(i)}
</Metadata>

`,t.preamble&&(n+=`<!-- Global scope code: variables and helper functions (before formula) -->
`,n+=`<Shader_Preamble>
${et(t.preamble)}
</Shader_Preamble>

`),t.loopInit&&(n+=`<!-- Code executed once before the loop (Setup) -->
`,n+=`<Shader_Init>
${et(t.loopInit)}
</Shader_Init>

`),n+=`<!-- Main Distance Estimator Function -->
`,n+=`<Shader_Function>
${et(t.function)}
</Shader_Function>

`,n+=`<!-- The Iteration Loop Body -->
`,n+=`<Shader_Loop>
${et(t.loopBody)}
</Shader_Loop>

`,t.getDist&&(n+=`<!-- Optional: Custom Distance/Iteration Smoothing -->
`,n+=`<Shader_Dist>
${et(t.getDist)}
</Shader_Dist>

`),n},nn=e=>{const o=u=>{const h=new RegExp(`<${u}>([\\s\\S]*?)<\\/${u}>`),f=e.match(h);return f?f[1].trim():null},t=o("Metadata");if(!t){try{const u=JSON.parse(e);if(u.id&&u.shader)return u}catch{}throw new Error("Invalid GMF: Missing Metadata tag")}const a=JSON.parse(t),r=o("Shader_Preamble"),i=o("Shader_Function"),n=o("Shader_Loop"),l=o("Shader_Init"),s=o("Shader_Dist");if(!i||!n)throw new Error("Invalid GMF: Missing essential shader blocks (<Shader_Function> or <Shader_Loop>)");const c={function:i,loopBody:n,preamble:r||void 0,loopInit:l||void 0,getDist:s||void 0};return a.shaderMeta&&(a.shaderMeta.preambleVars&&(c.preambleVars=a.shaderMeta.preambleVars),a.shaderMeta.usesSharedRotation&&(c.usesSharedRotation=!0),delete a.shaderMeta),{...a,shader:c}},sn=e=>{const o=e.trimStart();return o.startsWith("<!--")||o.startsWith("<Metadata>")},xl=e=>{const o=fe.get(e.formula);if(!o)return JSON.stringify(e,null,2);let t=rn(o,o.defaultPreset);return t+=`<!-- Full scene state (camera, lights, features, quality, animations) -->
`,t+=`<Scene>
${Xo(e)}
</Scene>
`,t},Sl=e=>{if(sn(e)){const t=nn(e),a=e.match(/<Scene>([\s\S]*?)<\/Scene>/);if(a){const i=JSON.parse(a[1].trim());return{def:t,preset:i}}const r=t.defaultPreset||{formula:t.id};return r.formula||(r.formula=t.id),{def:t,preset:r}}return{preset:JSON.parse(e)}};export{os as $,ke as A,jo as B,Fe as C,ss as D,Ls as E,R as F,tl as G,An as H,bl as I,vl as J,Es as K,ds as L,Jn as M,yl as N,bn as O,js as P,gn as Q,Ms as R,Wi as S,Gi as T,Ts as U,Hn as V,Ss as W,xs as X,K as Y,ls as Z,vs as _,Tt as a,q as a$,as as a0,rs as a1,Gn as a2,ws as a3,xl as a4,ya as a5,Pn as a6,tt as a7,fe as a8,ks as a9,qn as aA,Bn as aB,On as aC,Vn as aD,nl as aE,sl as aF,Xe as aG,Wo as aH,rl as aI,il as aJ,ll as aK,cl as aL,Xn as aM,We as aN,Wn as aO,us as aP,Rs as aQ,ys as aR,bs as aS,zn as aT,yo as aU,Re as aV,cs as aW,Fs as aX,Os as aY,rn as aZ,ul as a_,Zn as aa,Qn as ab,ps as ac,Un as ad,pn as ae,Sl as af,es as ag,hs as ah,ns as ai,Ps as aj,ms as ak,Hi as al,Kn as am,$n as an,Ln as ao,B as ap,ho as aq,fs as ar,io as as,Yn as at,hn as au,mn as av,yn as aw,Go as ax,vn as ay,ts as az,kn as b,dl as b0,fl as b1,pl as b2,hl as b3,al as b4,ml as b5,gl as b6,mo as b7,Xi as b8,tr as b9,Us as bA,Vs as bB,Hs as bC,Gs as bD,zs as bE,_n as bF,wn as bG,Cn as bH,In as bI,As as bJ,Sn as bK,Jt as bL,No as bM,rt as ba,cr as bb,dr as bc,fr as bd,ur as be,pr as bf,si as bg,ue as bh,Ti as bi,Mn as bj,Rn as bk,Ds as bl,gs as bm,el as bn,Xs as bo,Ys as bp,Ks as bq,Js as br,Zs as bs,qs as bt,Qs as bu,Tn as bv,En as bw,$s as bx,Bs as by,Ws as bz,He as c,oe as d,qo as e,N as f,je as g,ol as h,Nn as i,is as j,Ki as k,Fn as l,Dn as m,_e as n,ot as o,kt as p,xn as q,Ns as r,jn as s,_s as t,ge as u,Cs as v,Is as w,Ve as x,ft as y,Oo as z};
